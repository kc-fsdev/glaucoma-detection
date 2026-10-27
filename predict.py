"""Command-line glaucoma check - gives exactly the same result as the web app.

Usage (from the project folder):
    .venv\\Scripts\\python ml\\predict.py path\\to\\image.jpg [more images...]

Only retinal fundus photos (back of the eye) can be assessed. Other images, e.g. a
close-up of the front of the eye, are rejected just like in the web app.
"""
import os
import sys
import warnings

warnings.filterwarnings('ignore')
os.environ.setdefault('HF_HUB_DISABLE_SYMLINKS_WARNING', '1')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from PIL import Image  # noqa: E402

import glaucoma_model  # noqa: E402


def main(paths):
    if not paths:
        print(__doc__)
        return
    print('Loading the AI model...')
    try:
        analyzer = glaucoma_model.GlaucomaAnalyzer()
    except glaucoma_model.ModelUnavailable as e:
        sys.exit(f'AI model not available: {e}')

    for path in paths:
        print(f'\n{path}')
        try:
            img = Image.open(path)
            img.load()
        except Exception as e:
            print(f'  ERROR: cannot open image ({e})')
            continue
        try:
            r = analyzer.analyze(img)
        except glaucoma_model.NotFundusImage as e:
            print(f'  REJECTED: {e}')
            continue
        m = r['dataset_match']
        print(f"  Result:               {r['prediction'].upper()}")
        print(f"  Glaucoma probability: {r['glaucoma_probability']}%  (confidence {r['confidence']}%)")
        print(f"  Cup-to-disc ratio:    {r['cup_to_disc_ratio'] if r['cup_to_disc_ratio'] is not None else 'optic disc not found'}")
        print(f"  Dataset match:        {m['glaucoma_percent']}% glaucoma among the {m['top_k']} closest of {m['compared_with']} images")
        print(f"  Closest dataset image: {r['best_similarity']}% similar")
        acc = r['model'].get('test_accuracy')
        if acc:
            print(f"  Model tested accuracy: {acc}% on {r['model'].get('test_images')} held-out images")


if __name__ == '__main__':
    main(sys.argv[1:])
