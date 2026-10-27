# Drishti — eye-health web prototype

Drishti is a local Flask + SQLite prototype with a public eye-health site, a separate admin console, optional user accounts, account-scoped records, a screening demo, and English/Tamil/Hindi interface translations.

## Run on Windows

1. Extract the ZIP.
2. Open the inner `drishti-project` folder in VS Code.
3. Open **Terminal → New Terminal** and run these commands one at a time:

   ```powershell
   py -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   py app.py
   ```

4. Open the public website at `http://127.0.0.1:8000/`.

5. The separate admin console is at `http://127.0.0.1:8000/admin`. There is no Admin link on the public site.

## AI glaucoma screening

The **Run Glaucoma AI Screening** button sends the eye image to the Flask server, where a pretrained
glaucoma model (`pamixsun/swinv2_tiny_for_glaucoma_classification`) compares it with a labelled
reference set of 3,000 retinal fundus photos from 19 public datasets (EyePACS-AIROGS, ODIR, G1020, ORIGA,
REFUGE, PAPILA, ...; Hugging Face `Nj-1111/Glaucoma_Dataset`).

**Tested accuracy: 81.8% on 770 held-out images** (glaucoma found 90.9%, normal confirmed 72.7%).
Details in `ml\model_data\metrics.json`.

Install the AI libraries once (inside the activated `.venv`), then start the app as usual:

```powershell
pip install -r requirements-ml.txt --extra-index-url https://download.pytorch.org/whl/cpu
py app.py
```

The finished reference index and thumbnails ship in `ml\model_data`, so the model is ready about
15-30 seconds after start (the first start also downloads the two models, ~150 MB, from Hugging Face).

- Only **retinal fundus photos** (back of the eye) can be assessed. Photos of the front of the eye,
  diagrams, screenshots and webcam captures are rejected with an explanation: glaucoma damages the optic
  nerve, which is not visible from the front of the eye.
- Command-line check, same result as the website: `py ml\predict.py path\to\image.jpg`
- Test images (never used as references): `ml\dataset\test\rg` (glaucoma) and `ml\dataset\test\nrg` (normal).
- To rebuild the index from scratch (downloads ~1.2 GB, ~40 min on CPU): `py ml\setup_model.py`.
  If `ml\model_data\reference_index.npz` is missing, `py app.py` starts this automatically and shows the
  progress on the screening page.

## Demo admin login

- Email: `admin@drishti.local`
- Password: `ChangeMe123!`

Change the admin password immediately in **Admin → Security**. For a new database, you can set `DRISHTI_ADMIN_EMAIL` and `DRISHTI_ADMIN_PASSWORD` before the first run.

## User accounts

Anyone can try the screening without signing in. A visitor can create an account with a name, email address, and password to save personal screening results, record notes/attachments, reminders, and their Eye Journey. Each user's records are filtered by their signed-in email. Attachments are served only to the signed-in account that owns the record.

## Languages and voice

The public interface has built-in English, Tamil, and Hindi translations for the main navigation, homepage tour, screening, records, reminders, account screens, and help content. Articles can use their admin-maintained language fields. Voice playback requests a matching browser speech voice (`en-IN`, `ta-IN`, or `hi-IN`) when available; actual voice availability depends on the operating system/browser language packs.

Admin translation rows can override interface strings when the `English` value matches the visible English text, or when the translation key matches a leaf element ID. Review translations before publishing.

## Important limitations before real deployment

- This is a local prototype, not production-ready medical software. The AI screening uses a pretrained research model that is not clinically validated; it can be wrong. The questionnaire and pressure slider are shown as reported risk factors only (the slider is not a clinical tonometer). Results are not diagnoses.
- Do not store real patient data in this prototype. Before production, add a strong random `DRISHTI_SECRET_KEY`, HTTPS, secure cookie settings, CSRF protection, login rate limiting, email verification, password reset, backups, retention/deletion controls, security review, and a proper production server.
- Uploaded files are stored on the local disk under `uploads/`. Production needs private object storage, malware scanning, size/type validation, encryption and retention policies.
- Voice output depends on speech voices installed on the user's device. If Tamil or Hindi voices are not installed, the browser may use a fallback voice or may not speak that language correctly.
- Directory entries should be verified before publication. No doctor, hospital, or medical information should be assumed to be real unless checked independently.

## Main files

- `app.py`: Flask API, SQLite schema, user/admin authentication, CRUD routes, audit logs and the `/api/public/analyze` AI endpoint.
- `glaucoma_model.py`: loads the AI models and reference index; fundus check, prediction, dataset matching and cup-to-disc ratio.
- `ml/`: dataset download, index build (accuracy measurement) and a command-line prediction script.
- `templates/index.html`: public user site.
- `templates/admin.html`: separate admin console.
- `static/app.js`: screening demo, navigation, product tour and public content.
- `static/enhancements.js`: language translations, optional user accounts, private records and voice-language selection.
- `static/admin.js`: admin login and content management.
- `static/style.css`: responsive visual design.
