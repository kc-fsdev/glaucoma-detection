"""Glaucoma screening by matching an eye image against a labelled fundus dataset.

How it works
  1. The image is turned into a feature vector by a pretrained glaucoma model
     (pamixsun/swinv2_tiny_for_glaucoma_classification, trained on REFUGE fundus photos).
  2. It is compared with every reference image in ml/model_data/reference_index.npz
     (3,000 public fundus photos from 19 datasets, labelled glaucoma / no glaucoma).
  3. If it is not similar enough to ANY reference fundus photo, it is rejected as
     "not a retinal fundus image" (e.g. a webcam photo of the front of the eye).
  4. The glaucoma probability comes from a classifier fitted on the reference set; the
     most similar reference images are returned so the user can see the matches.
  5. The optic disc / cup are segmented to measure the vertical cup-to-disc ratio.

Build the index first:  .venv\\Scripts\\python ml\\build_index.py
"""
import json
import os
import threading

import numpy as np

BASE = os.path.dirname(os.path.abspath(__file__))
MODEL_DATA = os.path.join(BASE, 'ml', 'model_data')
INDEX_PATH = os.path.join(MODEL_DATA, 'reference_index.npz')
METRICS_PATH = os.path.join(MODEL_DATA, 'metrics.json')
REFERENCE_DIR = os.path.join(BASE, 'ml', 'dataset', 'train')
SEG_MODEL = 'pamixsun/segformer_for_optic_disc_cup_segmentation'


class NotFundusImage(ValueError):
    """The image does not look like a retinal fundus photograph."""


class ModelUnavailable(RuntimeError):
    """The AI libraries or the reference index are not installed/built."""


def _vertical_extent(mask):
    rows = np.where(mask.any(axis=1))[0]
    return int(rows.max() - rows.min() + 1) if rows.size else 0


class GlaucomaAnalyzer:
    def __init__(self):
        try:
            import torch
            from transformers import (AutoImageProcessor, AutoModelForImageClassification,
                                      SegformerForSemanticSegmentation)
            from transformers.utils import logging as hf_logging
            hf_logging.set_verbosity_error()
        except ImportError as e:
            raise ModelUnavailable('AI libraries are not installed. Run: pip install -r requirements-ml.txt') from e
        if not os.path.exists(INDEX_PATH):
            raise ModelUnavailable('Reference index not built. Run: python ml/build_index.py')

        self.torch = torch
        torch.set_num_threads(max(1, (os.cpu_count() or 2) - 1))
        self._index_mtime = None
        self._load_index()

        self.proc = AutoImageProcessor.from_pretrained(self.feature_model)
        self.model = AutoModelForImageClassification.from_pretrained(self.feature_model).eval()
        self.seg_proc = AutoImageProcessor.from_pretrained(SEG_MODEL)
        self.seg_model = SegformerForSemanticSegmentation.from_pretrained(SEG_MODEL).eval()

    def _load_index(self):
        """(Re)load the reference index and metrics written by ml/build_index.py."""
        mtime = os.path.getmtime(INDEX_PATH)
        idx = np.load(INDEX_PATH, allow_pickle=False)
        self.ref = idx['features']                 # L2-normalised reference vectors
        self.ref_labels = idx['labels']            # 1 = glaucoma, 0 = no glaucoma
        self.ref_names = idx['names']
        self.coef = idx['coef']
        self.intercept = float(idx['intercept'])
        self.min_similarity = float(idx['min_similarity'])
        self.k = int(idx['k'])
        self.method = str(idx['method'])          # 'lr' (fitted classifier) or 'knn' (nearest matches)
        self.feature_model = str(idx['feature_model'])
        self.metrics = {}
        if os.path.exists(METRICS_PATH):
            with open(METRICS_PATH, encoding='utf-8') as f:
                self.metrics = json.load(f)
        self._index_mtime = mtime

    def refresh(self):
        """Pick up a newer index (e.g. after the accuracy measurement finishes) without a restart."""
        try:
            if os.path.getmtime(INDEX_PATH) != self._index_mtime:
                self._load_index()
        except (OSError, ValueError, KeyError):
            pass  # keep the current index if the new one is unreadable

    def embed(self, images):
        """Return L2-normalised feature vectors for a list of PIL images (same as ml/build_index.py)."""
        with self.torch.no_grad():
            pooled = self.model.swinv2(**self.proc(images=images, return_tensors='pt')).pooler_output
        feats = pooled.numpy()
        return feats / np.linalg.norm(feats, axis=1, keepdims=True)

    def cup_to_disc(self, image):
        img = image.copy()
        img.thumbnail((768, 768))
        with self.torch.no_grad():
            logits = self.seg_model(**self.seg_proc(img, return_tensors='pt')).logits
        logits = self.torch.nn.functional.interpolate(logits, size=img.size[::-1], mode='bilinear', align_corners=False)
        seg = logits.argmax(1)[0].numpy()
        disc_h = _vertical_extent(seg >= 1)
        cup_h = _vertical_extent(seg == 2)
        return round(cup_h / disc_h, 2) if disc_h else None

    def analyze(self, image):
        self.refresh()
        image = image.convert('RGB')
        q = self.embed([image])[0]
        sims = self.ref @ q
        best = float(sims.max())
        if best < self.min_similarity:
            raise NotFundusImage(
                'This does not look like a retinal fundus (back-of-the-eye) photograph, so glaucoma cannot be '
                f'assessed. Its closest match in the dataset is only {best * 100:.0f}% similar. Please upload a fundus image.')

        top = np.argsort(-sims)[:self.k]
        weights = np.maximum(sims[top], 0) ** 4
        match_glaucoma = float((weights * self.ref_labels[top]).sum() / weights.sum())
        if self.method == 'lr':
            prob = float(1 / (1 + np.exp(-(q @ self.coef + self.intercept))))
        else:
            prob = match_glaucoma
        is_glaucoma = prob >= 0.5

        return {
            'prediction': 'Glaucoma suspected' if is_glaucoma else 'No glaucoma detected',
            'is_glaucoma': bool(is_glaucoma),
            'glaucoma_probability': round(prob * 100, 1),
            'confidence': round((prob if is_glaucoma else 1 - prob) * 100, 1),
            'dataset_match': {
                'glaucoma_percent': round(match_glaucoma * 100, 1),
                'normal_percent': round((1 - match_glaucoma) * 100, 1),
                'compared_with': int(len(self.ref)),
                'top_k': self.k,
            },
            'similar_images': [
                {'name': str(self.ref_names[i]),
                 'label': 'Glaucoma' if self.ref_labels[i] else 'No glaucoma',
                 'similarity': round(float(sims[i]) * 100, 1)}
                for i in top[:4]
            ],
            'cup_to_disc_ratio': self.cup_to_disc(image),
            'best_similarity': round(best * 100, 1),
            'model': {
                'feature_model': self.feature_model,
                'reference_dataset': self.metrics.get('dataset', 'Public glaucoma fundus collection'),
                'method': 'Classifier fitted on the reference dataset' if self.method == 'lr' else 'Nearest-match voting',
                'test_accuracy': self.metrics.get('test_accuracy'),
                'test_sensitivity': self.metrics.get('test_sensitivity'),
                'test_specificity': self.metrics.get('test_specificity'),
                'test_images': self.metrics.get('test_images'),
            },
        }


# ---------- Loading and automatic first-time setup ----------
SETUP_SCRIPT = os.path.join(BASE, 'ml', 'setup_model.py')
LOCK_PATH = os.path.join(MODEL_DATA, 'build.lock')
LOG_PATH = os.path.join(MODEL_DATA, 'setup.log')

_analyzer = None
_last_error = None
_lock = threading.Lock()


def index_ready():
    return os.path.exists(INDEX_PATH)


def get_analyzer():
    """Load the models once (~10-20 s). A failure is not cached, so the next call
    retries - e.g. right after the reference index has finished building."""
    global _analyzer, _last_error
    with _lock:
        if _analyzer is None:
            try:
                _analyzer = GlaucomaAnalyzer()
                _last_error = None
            except ModelUnavailable as e:
                _last_error = e
                raise
            except Exception as e:  # keep the website running even if the AI part fails
                _last_error = e
                raise ModelUnavailable(str(e)) from e
        return _analyzer


def last_error():
    return _last_error


def _pid_alive(pid):
    if os.name == 'nt':
        import ctypes
        handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if not handle:
            return False
        code = ctypes.c_ulong()
        ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
        ctypes.windll.kernel32.CloseHandle(handle)
        return code.value == 259  # STILL_ACTIVE
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def preparation_running():
    """True while ml/setup_model.py (or a build started by hand with a lock) is running."""
    try:
        with open(LOCK_PATH) as f:
            return _pid_alive(int(f.read().strip()))
    except (OSError, ValueError):
        return False


def preparation_progress():
    """Last progress line of the setup log, for the screening page."""
    try:
        with open(LOG_PATH, encoding='utf-8', errors='replace') as f:
            lines = [l.strip() for l in f.read().replace('\r', '\n').splitlines() if l.strip()]
        useful = [l for l in lines if not l.lower().startswith(('warn', 'loading weights'))]
        return useful[-1] if useful else ''
    except OSError:
        return ''


def start_preparation():
    """Start the first-time AI setup in the background if the index is missing.
    Returns True if a setup is (now) running."""
    if index_ready():
        return False
    if preparation_running():
        return True
    import subprocess
    import sys
    os.makedirs(MODEL_DATA, exist_ok=True)
    log = open(LOG_PATH, 'w', encoding='utf-8')
    flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
    subprocess.Popen([sys.executable, '-u', SETUP_SCRIPT], cwd=BASE, stdout=log, stderr=subprocess.STDOUT,
                     creationflags=flags, env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
    return True


THUMBS_DIR = os.path.join(MODEL_DATA, 'thumbs')


def reference_image_path(name):
    """Path of a reference image (small thumbnail first, full dataset image as fallback), or None."""
    thumb = os.path.join(THUMBS_DIR, os.path.splitext(os.path.basename(name))[0] + '.jpg')
    if os.path.isfile(thumb):
        return thumb
    for label in ('rg', 'nrg'):
        p = os.path.join(REFERENCE_DIR, label, os.path.basename(name))
        if os.path.isfile(p):
            return p
    return None
