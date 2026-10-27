"""One-step AI setup: download the reference dataset (if needed) and build the index.

app.py starts this automatically in the background when the index is missing, and loads
the model as soon as it finishes. It can also be run by hand:
    .venv\\Scripts\\python ml\\setup_model.py
Progress is written to ml/model_data/setup.log (shown on the screening page).
"""
import glob
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_DATA = os.path.join(HERE, 'model_data')
LOCK = os.path.join(MODEL_DATA, 'build.lock')


def dataset_ready():
    return all(glob.glob(os.path.join(HERE, 'dataset', split, label, '*'))
               for split in ('train', 'validation', 'test') for label in ('rg', 'nrg'))


def run(script, *args):
    print(f'== Running {script} ==', flush=True)
    code = subprocess.call([sys.executable, '-u', os.path.join(HERE, script), *args])
    if code != 0:
        raise SystemExit(f'{script} failed with exit code {code}')


def main():
    os.makedirs(MODEL_DATA, exist_ok=True)
    with open(LOCK, 'w') as f:
        f.write(str(os.getpid()))
    try:
        if dataset_ready():
            print('Reference dataset already downloaded.', flush=True)
        else:
            print('Step 1/2: downloading the reference dataset (~1.2 GB)...', flush=True)
            run('download_dataset.py')
        print('Step 2/2: building the reference index (first time ~40 min on CPU)...', flush=True)
        run('build_index.py')
        print('AI setup complete.', flush=True)
    finally:
        if os.path.exists(LOCK):
            os.remove(LOCK)


if __name__ == '__main__':
    main()
