"""Download the reference fundus dataset used for glaucoma matching.

Dataset: Hugging Face Nj-1111/Glaucoma_Dataset (CC-BY-4.0 per its dataset card)
  train: fundus photos collected from 19 public datasets (EyePACS-AIROGS, ODIR, G1020, ORIGA,
         REFUGE, PAPILA, DRISHTI-GS, ...); validation/test: EyePACS-AIROGS images
  rg  = referable glaucoma, nrg = no referable glaucoma (graded retinal fundus photos)

Usage:  .venv\\Scripts\\python ml\\download_dataset.py [--per-class N]
Images are saved to ml/dataset/<split>/<rg|nrg>/.
"""
import argparse
import os
import random
from concurrent.futures import ThreadPoolExecutor

from huggingface_hub import HfApi, hf_hub_download

REPO = 'Nj-1111/Glaucoma_Dataset'
SPLITS = {'train': 'train set', 'validation': 'validation set', 'test': 'test set'}
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'dataset')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--per-class', type=int, default=1500, help='max train images per class (validation/test are downloaded in full)')
    args = ap.parse_args()

    files = HfApi().list_repo_files(REPO, repo_type='dataset')
    rng = random.Random(42)
    jobs = []
    for split, folder in SPLITS.items():
        for label in ('rg', 'nrg'):
            names = sorted(f for f in files if f.startswith(f'{folder}/{label}/'))
            if split == 'train' and len(names) > args.per_class:
                names = sorted(rng.sample(names, args.per_class))
            print(f'{split}/{label}: {len(names)} images')
            jobs += [(f, os.path.join(OUT, split, label, os.path.basename(f))) for f in names]

    def fetch(job):
        remote, local = job
        if os.path.exists(local):
            return
        os.makedirs(os.path.dirname(local), exist_ok=True)
        path = hf_hub_download(REPO, remote, repo_type='dataset')
        with open(path, 'rb') as src, open(local, 'wb') as dst:
            dst.write(src.read())

    with ThreadPoolExecutor(8) as pool:
        for i, _ in enumerate(pool.map(fetch, jobs), 1):
            if i % 250 == 0 or i == len(jobs):
                print(f'  downloaded {i}/{len(jobs)}')


if __name__ == '__main__':
    main()
