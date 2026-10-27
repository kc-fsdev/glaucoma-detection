"""Build the reference index used by the web app's glaucoma matching.

Steps
  1. Extract a feature vector for every image in ml/dataset (train / validation / test)
     with the pretrained glaucoma model (cached in ml/model_data/features_cache.npz).
  2. Compare methods on the VALIDATION images only:
       - pretrained classifier as-is
       - nearest-neighbour matching against the reference (train) images
       - logistic regression fitted on the reference images
  3. Measure the chosen method ONCE on the held-out TEST images (never used for fitting
     or choosing) and save the accuracy to ml/model_data/metrics.json.
  4. Save ml/model_data/reference_index.npz for the web app.

Usage:  .venv\\Scripts\\python ml\\build_index.py [--negatives DIR_OF_NON_FUNDUS_PHOTOS]
"""
import argparse
import glob
import json
import os
import sys
import time
import warnings

warnings.filterwarnings('ignore')
os.environ.setdefault('HF_HUB_DISABLE_SYMLINKS_WARNING', '1')

import numpy as np
import torch
from PIL import Image
from sklearn.linear_model import LogisticRegression
from transformers import AutoImageProcessor, AutoModelForImageClassification
from transformers.utils import logging

logging.set_verbosity_error()

HERE = os.path.dirname(os.path.abspath(__file__))
DATASET = os.path.join(HERE, 'dataset')
OUT = os.path.join(HERE, 'model_data')
CACHE = os.path.join(OUT, 'features_cache.npz')
THUMBS = os.path.join(OUT, 'thumbs')
FEATURE_MODEL = 'pamixsun/swinv2_tiny_for_glaucoma_classification'
DATASET_DESC = 'Public glaucoma fundus collection (19 sources incl. EyePACS-AIROGS, ODIR, G1020, ORIGA, REFUGE, PAPILA) - Hugging Face Nj-1111/Glaucoma_Dataset'


def list_split(split):
    items = []
    for label, y in (('nrg', 0), ('rg', 1)):
        items += [(p, y) for p in sorted(glob.glob(os.path.join(DATASET, split, label, '*')))]
    return items


class Embedder:
    def __init__(self):
        torch.set_num_threads(max(1, (os.cpu_count() or 2) - 1))
        self.proc = AutoImageProcessor.from_pretrained(FEATURE_MODEL)
        self.model = AutoModelForImageClassification.from_pretrained(FEATURE_MODEL).eval()

    def __call__(self, images):
        """Return (L2-normalised features, glaucoma probability of the pretrained classifier)."""
        with torch.no_grad():
            pooled = self.model.swinv2(**self.proc(images=images, return_tensors='pt')).pooler_output
            prob = self.model.classifier(pooled).softmax(-1)[:, 1]
        feats = pooled.numpy()
        return feats / np.linalg.norm(feats, axis=1, keepdims=True), prob.numpy()


def embed_all(embedder, items, name, bs=32):
    feats, probs, t0 = [], [], time.time()
    for i in range(0, len(items), bs):
        imgs = [Image.open(p).convert('RGB') for p, _ in items[i:i + bs]]
        f, p = embedder(imgs)
        feats.append(f)
        probs.append(p)
        done = min(i + bs, len(items))
        if done % 320 == 0 or done == len(items):
            rate = done / (time.time() - t0)
            print(f'  {name}: {done}/{len(items)} images ({rate:.1f}/s, ~{(len(items) - done) / rate:.0f}s left)', flush=True)
    return np.concatenate(feats), np.concatenate(probs)


def knn_scores(ref, ref_y, q, k):
    sims = q @ ref.T
    top = np.argsort(-sims, axis=1)[:, :k]
    w = np.maximum(np.take_along_axis(sims, top, 1), 0) ** 4
    return (w * ref_y[top]).sum(1) / w.sum(1)


def accuracy(scores, y):
    return float(((scores >= 0.5).astype(int) == y).mean())


def make_thumbnails(items, size=160):
    """Small JPEG copies of the reference images, so the app can show matches
    without the 1.2 GB dataset (ml/model_data/thumbs, ~25 MB)."""
    os.makedirs(THUMBS, exist_ok=True)
    for p, _ in items:
        out = os.path.join(THUMBS, os.path.splitext(os.path.basename(p))[0] + '.jpg')
        if not os.path.exists(out):
            im = Image.open(p).convert('RGB')
            im.thumbnail((size, size))
            im.save(out, 'JPEG', quality=82)


def save_index(ftr, ytr, names, lr, method, k, min_similarity):
    path = os.path.join(OUT, 'reference_index.npz')
    tmp = path + '.tmp.npz'
    np.savez(tmp, features=ftr.astype(np.float32), labels=ytr.astype(np.int8), names=np.array(names),
             coef=lr.coef_[0].astype(np.float32), intercept=np.float32(lr.intercept_[0]),
             method=np.array(method), k=np.int32(k), min_similarity=np.float32(min_similarity),
             feature_model=np.array(FEATURE_MODEL))
    os.replace(tmp, path)  # atomic, so the running app never reads a half-written file


def save_metrics(metrics):
    tmp = os.path.join(OUT, 'metrics.json.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(metrics, f, indent=2)
    os.replace(tmp, os.path.join(OUT, 'metrics.json'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--negatives', help='folder of NON-fundus photos to check the rejection threshold')
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    splits = {s: list_split(s) for s in ('train', 'validation', 'test')}
    for s, items in splits.items():
        print(f'{s}: {len(items)} images ({sum(y for _, y in items)} glaucoma)')
    if not splits['train']:
        sys.exit('No dataset found. Run ml/download_dataset.py first.')

    names = {s: [os.path.basename(p) for p, _ in items] for s, items in splits.items()}
    cache = dict(np.load(CACHE, allow_pickle=False)) if os.path.exists(CACHE) else {}
    embedder = Embedder()

    def features(s):
        items = splits[s]
        if f'{s}_names' in cache and list(cache[f'{s}_names']) == names[s]:
            print(f'  {s}: loaded from cache', flush=True)
            return cache[f'{s}_feats'], cache[f'{s}_probs'], np.array([y for _, y in items])
        f, p = embed_all(embedder, items, s)
        cache.update({f'{s}_names': np.array(names[s]), f'{s}_feats': f, f'{s}_probs': p})
        np.savez(CACHE, **cache)
        return f, p, np.array([y for _, y in items])

    # ---------- Phase 1: reference images only -> the app can start using the index ----------
    print('\nPhase 1/2: reference images (the app becomes ready after this)', flush=True)
    ftr, ptr, ytr = features('train')
    make_thumbnails(splits['train'])
    sims = ftr @ ftr.T
    np.fill_diagonal(sims, -1)
    nearest_other = sims.max(1)  # how similar each reference fundus photo is to its closest neighbour
    quick_threshold = float(np.percentile(nearest_other, 0.5)) - 0.02
    quick_lr = LogisticRegression(C=1, max_iter=5000).fit(ftr, ytr)
    save_index(ftr, ytr, names['train'], quick_lr, 'lr', 15, quick_threshold)
    save_metrics({'dataset': DATASET_DESC, 'reference_images': int(len(ytr)),
                  'status': 'evaluating', 'test_accuracy': None, 'test_images': None})
    print('Index saved - the web app can now analyse images. Measuring accuracy next...', flush=True)

    if not splits['validation'] or not splits['test']:
        print('No validation/test images - skipping the accuracy measurement.')
        return

    # ---------- Phase 2: choose the best method on validation, measure once on test ----------
    print('\nPhase 2/2: measuring accuracy on held-out images', flush=True)
    fva, pva, yva = features('validation')
    fte, pte, yte = features('test')

    print('\nValidation accuracy of each method:')
    results = {'pretrained classifier as-is': accuracy(pva, yva)}
    for k in (5, 15, 31, 51):
        results[f'dataset matching (k={k})'] = accuracy(knn_scores(ftr, ytr, fva, k), yva)
    lrs = {}
    for C in (0.3, 1, 3, 10, 30):
        lrs[C] = LogisticRegression(C=C, max_iter=5000).fit(ftr, ytr)
        results[f'classifier fitted on dataset (C={C})'] = accuracy(lrs[C].predict_proba(fva)[:, 1], yva)
    for name, acc in results.items():
        print(f'  {acc * 100:5.1f}%  {name}')

    best_lr_c = max(lrs, key=lambda c: results[f'classifier fitted on dataset (C={c})'])
    best_k = max((5, 15, 31, 51), key=lambda k: results[f'dataset matching (k={k})'])
    lr = lrs[best_lr_c]
    lr_val = results[f'classifier fitted on dataset (C={best_lr_c})']
    knn_val = results[f'dataset matching (k={best_k})']
    method = 'lr' if lr_val >= knn_val else 'knn'
    print(f'\nChosen: {"classifier fitted on dataset (C=%s)" % best_lr_c if method == "lr" else "dataset matching (k=%d)" % best_k}')

    # Final, one-time measurement on the held-out test set
    test_scores = lr.predict_proba(fte)[:, 1] if method == 'lr' else knn_scores(ftr, ytr, fte, best_k)
    pred = (test_scores >= 0.5).astype(int)
    tp = int(((pred == 1) & (yte == 1)).sum()); tn = int(((pred == 0) & (yte == 0)).sum())
    fp = int(((pred == 1) & (yte == 0)).sum()); fn = int(((pred == 0) & (yte == 1)).sum())
    test_acc = (tp + tn) / len(yte)
    sensitivity = tp / max(1, tp + fn)
    specificity = tn / max(1, tn + fp)
    print(f'\nTEST accuracy: {test_acc * 100:.1f}% on {len(yte)} held-out images '
          f'({int(yte.sum())} glaucoma / {int(len(yte) - yte.sum())} normal)')
    print(f'  Sensitivity (glaucoma found):   {sensitivity * 100:.1f}%  ({tp}/{tp + fn})')
    print(f'  Specificity (normal confirmed): {specificity * 100:.1f}%  ({tn}/{tn + fp})')
    print(f'  Pretrained classifier as-is on the same test images: {accuracy(pte, yte) * 100:.1f}%')

    # Rejection threshold: an image must resemble at least one reference fundus photo
    val_best = (fva @ ftr.T).max(1)
    min_similarity = float(np.percentile(val_best, 0.5)) - 0.02
    print(f'\nNon-fundus rejection threshold: best similarity < {min_similarity * 100:.1f}% '
          f'(validation fundus images: min {val_best.min() * 100:.1f}%, median {np.median(val_best) * 100:.1f}%)')
    test_best = (fte @ ftr.T).max(1)
    print(f'  Test fundus images wrongly rejected: {(test_best < min_similarity).sum()}/{len(test_best)}')
    if args.negatives:
        negs = sorted(glob.glob(os.path.join(args.negatives, '*.jp*g')) + glob.glob(os.path.join(args.negatives, '*.png')))
        if negs:
            nf, _ = embedder([Image.open(p).convert('RGB') for p in negs])
            nb = (nf @ ftr.T).max(1)
            print(f'  Non-fundus photos rejected: {(nb < min_similarity).sum()}/{len(nb)} '
                  f'(their best similarity: {", ".join(f"{v * 100:.0f}%" for v in sorted(nb))})')

    save_index(ftr, ytr, names['train'], lr, method, best_k, min_similarity)
    save_metrics({
        'dataset': DATASET_DESC,
        'reference_images': int(len(ytr)),
        'status': 'complete',
        'method': method,
        'validation_results': {k: round(v * 100, 1) for k, v in results.items()},
        'test_images': int(len(yte)),
        'test_accuracy': round(test_acc * 100, 1),
        'test_sensitivity': round(sensitivity * 100, 1),
        'test_specificity': round(specificity * 100, 1),
        'test_confusion': {'true_positive': tp, 'true_negative': tn, 'false_positive': fp, 'false_negative': fn},
        'pretrained_classifier_test_accuracy': round(accuracy(pte, yte) * 100, 1),
        'min_similarity': round(min_similarity, 4),
    })
    print(f'\nSaved final index and metrics.json in {OUT}')


if __name__ == '__main__':
    # Hold the setup lock so the web app does not start a second build meanwhile
    lock = os.path.join(OUT, 'build.lock')
    os.makedirs(OUT, exist_ok=True)
    with open(lock, 'w') as f:
        f.write(str(os.getpid()))
    try:
        main()
    finally:
        try:
            with open(lock) as f:
                mine = f.read().strip() == str(os.getpid())
            if mine:
                os.remove(lock)
        except OSError:
            pass
