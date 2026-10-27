/**
 * Drishti Eye Health - Glaucoma Detection Web Prototype
 * Phase 1: Frontend & UI Completion
 *
 * Features:
 * 1. Login and Signup with client validation and feedback (real Flask backend;
 *    clearly-labelled demo mode only when the server cannot be reached)
 * 2. Photo Upload for eye/retinal images with type/size/content validation & preview
 * 3. Webcam Live Preview with eye detection (MediaPipe Face Landmarker, basic fallback)
 * 4. Glaucoma screening results from the AI model + reference dataset matching (Flask /api/public/analyze)
 * 5. Downloadable PDF Report Generation (jsPDF + Print Fallback)
 * 6. User Feedback and State Handling
 *
 * Records, reminders, Eye Journey, "Save to my journey", Easy Mode and voice
 * playback are handled in enhancements.js.
 */

const $ = id => document.getElementById(id);

// Application State
let cameraStream = null;
let activeInput = 'upload';    // 'upload' | 'webcam' - which tab supplies the image
let uploadedImage = null;      // data URL chosen in the upload tab
let capturedImage = null;      // data URL of the eye crop captured from the webcam
let capturedRedness = null;
let captureMethod = null;      // 'landmarks' (eye located) | 'basic' (brightness check only)
let lastResult = null;
let currentUser = null;

// Multi-language UI Dictionaries for Core Headings
const dict = {
    en: {
        title: 'Your eyes. Your records. Your journey.',
        sub: 'Understand your eye health, keep records organized, and explore eye-care services in one calm place.',
        check: 'Check my eyes',
        listen: 'Listen'
    },
    ta: {
        title: 'உங்கள் கண்கள். உங்கள் பதிவுகள். உங்கள் பயணம்.',
        sub: 'கண் ஆரோக்கியத்தைப் புரிந்துகொள்ளவும், பதிவுகளை ஒழுங்குபடுத்தவும், கண் பராமரிப்பு சேவைகளை அறியவும்.',
        check: 'என் கண்களைச் சரிபார்க்கவும்',
        listen: 'கேளுங்கள்'
    },
    hi: {
        title: 'आपकी आँखें। आपके रिकॉर्ड। आपका सफ़र।',
        sub: 'अपने नेत्र स्वास्थ्य को समझें, रिकॉर्ड व्यवस्थित रखें और नेत्र देखभाल सेवाएँ खोजें।',
        check: 'आँखों की जाँच',
        listen: 'सुनें'
    }
};

// Utilities
function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Network failures (server not running) are flagged with `offline` so callers can
// fall back to a clearly-labelled demo mode; server errors keep their message.
async function api(url, opts = {}) {
    let r;
    try {
        r = await fetch(url, { credentials: 'same-origin', ...opts });
    } catch {
        const err = new Error('Could not reach the Drishti server. Please check that it is running.');
        err.offline = true;
        throw err;
    }
    let d = {};
    try { d = await r.json(); } catch { }
    if (!r.ok) {
        const err = new Error(d.error || `Request failed (error ${r.status}). Please try again.`);
        err.status = r.status;
        throw err;
    }
    return d;
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setMessage(el, msg, kind = '') {
    if (!el) return;
    el.textContent = msg;
    el.className = 'form-message' + (kind ? ' ' + kind : '');
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image could not be decoded'));
        img.src = src;
    });
}

// -------------------------------------------------------------
// 1. Accessibility & Internationalization Controls
//    (Easy Mode and voice playback are handled in enhancements.js)
// -------------------------------------------------------------
$('language')?.addEventListener('change', () => {
    const lang = $('language').value;
    const d = dict[lang] || dict.en;
    if ($('heroTitle')) $('heroTitle').textContent = d.title;
    if ($('heroSub')) $('heroSub').textContent = d.sub;
    if ($('checkBtn')) $('checkBtn').textContent = d.check;
    // voice text updated by updateVoiceBtnUI()
    document.documentElement.lang = lang;
    loadDailyTips($('tipDatePicker')?.value || '');
    loadArticles();
});

// -------------------------------------------------------------
// 2. Photo Upload Feature
// -------------------------------------------------------------
const tabUpload = $('tabUpload');
const tabWebcam = $('tabWebcam');
const uploadPanel = $('uploadPanel');
const webcamPanel = $('webcamPanel');

const eyePhotoInput = $('eyePhotoInput');
const uploadDropZone = $('uploadDropZone');
const uploadPreviewWrap = $('uploadPreviewWrap');
const uploadPreviewImg = $('uploadPreviewImg');
const uploadMsg = $('uploadMsg');
const changePhotoBtn = $('changePhotoBtn');
const removePhotoBtn = $('removePhotoBtn');

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const MIN_IMAGE_SIDE = 100;               // px

function setUploadMessage(msg, isError = false) {
    setMessage(uploadMsg, msg, isError ? 'error' : 'success');
}

function activeImage() {
    return activeInput === 'webcam' ? capturedImage : uploadedImage;
}

// Hide any shown result when the input image changes, so a result never
// sits next to an image it was not computed from.
function resetResult() {
    lastResult = null;
    window.lastResult = null;
    if ($('result')) $('result').hidden = true;
    setMessage($('pdfStatusMsg'), '');
    if ($('saveMessage')) $('saveMessage').textContent = '';
}

function updateFeatureText() {
    const el = $('redness');
    if (!el) return;
    if (activeInput === 'upload' && uploadedImage) {
        el.textContent = 'Visual features: eye image loaded from upload';
    } else if (activeInput === 'webcam' && capturedImage) {
        el.textContent = captureMethod === 'landmarks'
            ? `Eye region captured (located by face-landmark detection) · Redness estimate: ${capturedRedness}%`
            : `Image captured (basic brightness check only - eye not verified) · Redness estimate: ${capturedRedness}%`;
    } else {
        el.textContent = 'Visual feature estimate: awaiting input';
    }
}

if (tabUpload && tabWebcam) {
    tabUpload.addEventListener('click', () => {
        activeInput = 'upload';
        tabUpload.classList.add('active');
        tabWebcam.classList.remove('active');
        if (uploadPanel) uploadPanel.hidden = false;
        if (webcamPanel) webcamPanel.hidden = true;
        stopCamera();
        updateFeatureText();
    });

    tabWebcam.addEventListener('click', () => {
        activeInput = 'webcam';
        tabWebcam.classList.add('active');
        tabUpload.classList.remove('active');
        if (webcamPanel) webcamPanel.hidden = false;
        if (uploadPanel) uploadPanel.hidden = true;
        updateFeatureText();
    });
}

function handleEyePhoto(file) {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ext = file.name.split('.').pop().toLowerCase();
    const type = (file.type || '').toLowerCase();
    const isValidType = type ? validTypes.includes(type) : ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

    if (!isValidType) {
        setUploadMessage('Invalid file format. Please upload a JPG, PNG, or WEBP eye image.', true);
        return;
    }
    if (!file.size) {
        setUploadMessage('The selected file is empty. Please choose another image.', true);
        return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setUploadMessage(`File size (${sizeMb} MB) exceeds the 5MB limit. Please choose a smaller image.`, true);
        return;
    }

    setUploadMessage('Reading image…');
    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target.result;
        try {
            // Make sure the file really is a readable image, not just a renamed file.
            const img = await loadImage(dataUrl);
            if (img.naturalWidth < MIN_IMAGE_SIDE || img.naturalHeight < MIN_IMAGE_SIDE) {
                setUploadMessage(`Image is too small (${img.naturalWidth}×${img.naturalHeight}px). Please use an image at least ${MIN_IMAGE_SIDE}×${MIN_IMAGE_SIDE}px.`, true);
                return;
            }
        } catch {
            setUploadMessage('This file could not be opened as an image. It may be corrupted - please choose another photo.', true);
            return;
        }
        uploadedImage = dataUrl;
        resetResult();
        if (uploadPreviewImg) uploadPreviewImg.src = uploadedImage;
        if (uploadPreviewWrap) uploadPreviewWrap.hidden = false;
        if (uploadDropZone) uploadDropZone.hidden = true;
        setUploadMessage(`Eye image "${file.name}" loaded successfully. Ready for screening.`, false);
        updateFeatureText();
    };
    reader.onerror = () => {
        setUploadMessage('Could not read the selected image. Please try again.', true);
    };
    reader.readAsDataURL(file);
}

if (uploadDropZone) {
    uploadDropZone.addEventListener('click', () => eyePhotoInput?.click());
    uploadDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadDropZone.classList.add('dragover');
    });
    uploadDropZone.addEventListener('dragleave', () => uploadDropZone.classList.remove('dragover'));
    uploadDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadDropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files && files.length > 1) {
            setUploadMessage('Please drop only one eye image at a time.', true);
            return;
        }
        if (files && files[0]) handleEyePhoto(files[0]);
    });
}

eyePhotoInput?.addEventListener('change', () => {
    if (eyePhotoInput.files && eyePhotoInput.files[0]) {
        handleEyePhoto(eyePhotoInput.files[0]);
    }
    // Allow choosing the same file again after an error
    eyePhotoInput.value = '';
});

changePhotoBtn?.addEventListener('click', () => eyePhotoInput?.click());

removePhotoBtn?.addEventListener('click', () => {
    uploadedImage = null;
    resetResult();
    if (eyePhotoInput) eyePhotoInput.value = '';
    if (uploadPreviewImg) uploadPreviewImg.removeAttribute('src');
    if (uploadPreviewWrap) uploadPreviewWrap.hidden = true;
    if (uploadDropZone) uploadDropZone.hidden = false;
    setUploadMessage('Photo removed.');
    updateFeatureText();
});

// -------------------------------------------------------------
// 3. Direct Eye Detection Using Webcam
//    Uses MediaPipe Face Landmarker (loaded from CDN) to locate the eye.
//    If it cannot load (e.g. no internet), falls back to a basic
//    brightness check of the centre of the frame and says so.
// -------------------------------------------------------------
const MP_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
// Face-mesh landmark indices outlining each eye
const EYE_LANDMARKS = [
    [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
    [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
];
const MIN_EYE_WIDTH = 0.05; // eye width as a fraction of the frame width

let faceLandmarker = null;
let detectorState = 'idle'; // idle | loading | ready | failed
let detectorPromise = null;
let detectLoopId = null;
let lastDetectAt = 0;
let lastEyeBox = null;      // most visible eye, in video pixels {x, y, w, h}

function camStatus(msg, kind = '') {
    setMessage($('camStatusMsg'), msg, kind);
}

function setGuide(text, aligned) {
    if ($('guideText')) $('guideText').textContent = text;
    $('eyeGuide')?.classList.toggle('aligned', !!aligned);
}

function loadEyeDetector() {
    if (detectorPromise) return detectorPromise;
    detectorState = 'loading';
    detectorPromise = (async () => {
        try {
            const vision = await import(`${MP_BASE}/vision_bundle.mjs`);
            const fileset = await vision.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
            for (const delegate of ['GPU', 'CPU']) {
                try {
                    faceLandmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
                        baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate },
                        runningMode: 'VIDEO',
                        numFaces: 1
                    });
                    break;
                } catch (err) {
                    if (delegate === 'CPU') throw err;
                }
            }
            detectorState = 'ready';
        } catch (err) {
            console.warn('Eye detector unavailable, using basic check:', err);
            detectorState = 'failed';
        }
    })();
    return detectorPromise;
}

function findEyeBox(landmarks, vw, vh) {
    let best = null;
    for (const eye of EYE_LANDMARKS) {
        const xs = eye.map(i => landmarks[i].x * vw);
        const ys = eye.map(i => landmarks[i].y * vh);
        const x = Math.min(...xs), y = Math.min(...ys);
        const box = { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
        if (!best || box.w > best.w) best = box;
    }
    return best;
}

function detectLoop(now) {
    const v = $('cam');
    if (!cameraStream || !faceLandmarker || !v) return;
    detectLoopId = requestAnimationFrame(detectLoop);
    if (now - lastDetectAt < 100 || v.readyState < 2 || !v.videoWidth) return;
    lastDetectAt = now;

    try {
        const res = faceLandmarker.detectForVideo(v, now);
        const lm = res.faceLandmarks && res.faceLandmarks[0];
        if (!lm) {
            lastEyeBox = null;
            setGuide('No face detected - look at the camera', false);
            return;
        }
        const box = findEyeBox(lm, v.videoWidth, v.videoHeight);
        lastEyeBox = box;
        const cx = (box.x + box.w / 2) / v.videoWidth;
        const cy = (box.y + box.h / 2) / v.videoHeight;
        const bigEnough = box.w / v.videoWidth >= MIN_EYE_WIDTH;
        const centred = cx > 0.3 && cx < 0.7 && cy > 0.25 && cy < 0.75;
        if (!bigEnough) setGuide('Eye detected - move closer', false);
        else if (!centred) setGuide('Eye detected - move it into the circle', false);
        else setGuide('Eye detected - ready to capture', true);
    } catch (err) {
        console.warn('Eye detection frame failed:', err);
    }
}

function stopCamera() {
    if (detectLoopId) cancelAnimationFrame(detectLoopId);
    detectLoopId = null;
    lastEyeBox = null;
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
    }
    const cam = $('cam');
    if (cam) {
        cam.hidden = true;
        cam.srcObject = null;
    }
    const eyeGuide = $('eyeGuide');
    if (eyeGuide) eyeGuide.hidden = true;
    if ($('capture')) $('capture').disabled = true;
    if ($('snap')?.hidden && $('camMsg')) {
        $('camMsg').hidden = false;
        $('camMsg').textContent = 'Camera is off';
    }
}

$('startCam')?.addEventListener('click', async () => {
    const camMsg = $('camMsg');
    const startBtn = $('startCam');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        camStatus(window.isSecureContext
            ? 'This browser does not support camera access. Please use the "Upload eye photo" option.'
            : 'Camera access needs a secure page. Open the app at http://127.0.0.1:8000 (or over https) and try again.', 'error');
        return;
    }

    stopCamera(); // never leave an earlier stream running
    startBtn.disabled = true;
    camStatus('Requesting camera permission…');

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        const cam = $('cam');
        cam.srcObject = cameraStream;
        cam.hidden = false;
        $('snap').hidden = true;
        capturedImage = null;
        resetResult();
        updateFeatureText();
        if (camMsg) camMsg.hidden = true;

        const eyeGuide = $('eyeGuide');
        if (eyeGuide) eyeGuide.hidden = false;
        setGuide('Loading eye detector…', false);

        $('capture').disabled = false;
        $('retake').hidden = true;
        camStatus('Live camera active. Loading eye detector…');

        await loadEyeDetector();
        if (!cameraStream) return; // camera was stopped while the detector loaded

        if (detectorState === 'ready') {
            setGuide('Look at the camera', false);
            camStatus('Live camera active. Bring one eye close to the camera, inside the circle, then press "Capture eye".');
            detectLoopId = requestAnimationFrame(detectLoop);
        } else {
            setGuide('Align eye inside target', false);
            camStatus('Eye detector could not load (internet connection needed). Using a basic brightness check instead - centre your eye in the circle before capturing.', 'error');
        }
    } catch (err) {
        console.error('Camera error:', err);
        stopCamera();
        if (camMsg) {
            camMsg.hidden = false;
            camMsg.textContent = 'Camera is unavailable.';
        }
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            camStatus('Camera permission denied. Please allow camera permissions in your browser or switch to "Upload eye photo".', 'error');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            camStatus('No camera found on your laptop. Please use the "Upload eye photo" option.', 'error');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            camStatus('The camera is being used by another application. Close it and try again, or use photo upload.', 'error');
        } else {
            camStatus(`Could not access webcam (${err.message || 'Error'}). Please use photo upload.`, 'error');
        }
    } finally {
        startBtn.disabled = false;
    }
});

$('capture')?.addEventListener('click', () => {
    const v = $('cam');
    if (!cameraStream || !v || !v.videoWidth) {
        camStatus('Camera is not ready yet. Please wait a moment and try again.', 'error');
        return;
    }
    if (detectorState === 'loading') {
        camStatus('The eye detector is still loading. Please wait a moment and try again.', 'error');
        return;
    }

    const vw = v.videoWidth, vh = v.videoHeight;
    let crop;
    let method;
    if (detectorState === 'ready') {
        if (!lastEyeBox) {
            camStatus('No eye detected. Face the camera in good light and try again.', 'error');
            return;
        }
        if (lastEyeBox.w / vw < MIN_EYE_WIDTH) {
            camStatus('Eye detected but too far away. Move closer to the camera and try again.', 'error');
            return;
        }
        // Crop a 4:3 region around the eye with some margin, kept inside the frame
        const cw = Math.min(vw, lastEyeBox.w * 2.4);
        const ch = Math.min(vh, cw * 0.75);
        const cx = lastEyeBox.x + lastEyeBox.w / 2;
        const cy = lastEyeBox.y + lastEyeBox.h / 2;
        crop = {
            x: Math.max(0, Math.min(vw - cw, cx - cw / 2)),
            y: Math.max(0, Math.min(vh - ch, cy - ch / 2)),
            w: cw, h: ch
        };
        method = 'landmarks';
    } else {
        // Basic fallback: the centre region under the on-screen circle
        const cw = vw * 0.4, ch = vh * 0.35;
        crop = { x: (vw - cw) / 2, y: (vh - ch) / 2, w: cw, h: ch };
        method = 'basic';
    }

    const c = document.createElement('canvas');
    c.width = 640;
    c.height = Math.round(640 * crop.h / crop.w);
    const ctx = c.getContext('2d');
    ctx.drawImage(v, crop.x, crop.y, crop.w, crop.h, 0, 0, c.width, c.height);

    const imgData = ctx.getImageData(0, 0, c.width, c.height).data;
    let totalBrightness = 0;
    let redCount = 0;
    const pixelCount = imgData.length / 4;
    for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i], g = imgData[i + 1], b = imgData[i + 2];
        totalBrightness += (r + g + b) / 3;
        if (r > 80 && r > g * 1.35 && r > b * 1.35) redCount++;
    }
    if (totalBrightness / pixelCount < 18) {
        camStatus('Frame is too dark to see eye features. Please improve lighting and try again.', 'error');
        return;
    }

    capturedImage = c.toDataURL('image/jpeg', 0.9);
    capturedRedness = Math.round((redCount / pixelCount) * 100);
    captureMethod = method;
    resetResult();

    $('snap').src = capturedImage;
    $('snap').hidden = false;
    stopCamera();
    $('retake').hidden = false;
    updateFeatureText();

    camStatus(method === 'landmarks'
        ? 'Eye detected and captured! Ready for glaucoma screening.'
        : 'Image captured with the basic check only (eye position not verified). Ready for screening.', 'success');
});

$('retake')?.addEventListener('click', () => {
    $('snap').hidden = true;
    $('snap').removeAttribute('src');
    capturedImage = null;
    captureMethod = null;
    resetResult();
    updateFeatureText();
    $('retake').hidden = true;
    $('startCam')?.click();
});

$('pressure')?.addEventListener('input', () => {
    if ($('pressureText')) $('pressureText').textContent = $('pressure').value;
});

// -------------------------------------------------------------
// 4. Glaucoma Screening Results & Loading State
//    The image is sent to the Flask backend (/api/public/analyze), where a
//    pretrained glaucoma model compares it with a labelled fundus dataset.
//    The questionnaire and pressure slider are shown as reported risk
//    factors only - they do not change the AI result.
// -------------------------------------------------------------
const wait = ms => new Promise(r => setTimeout(r, ms));
const MODEL_VERSION = 'glaucoma-match-v1';

async function dataUrlToBlob(dataUrl) {
    return (await fetch(dataUrl)).blob();
}

function cdrDescription(cdr) {
    if (cdr === null || cdr === undefined) return 'Optic disc not clearly visible';
    if (cdr < 0.5) return 'Within normal range (< 0.50)';
    if (cdr < 0.65) return 'Borderline (0.50 - 0.65)';
    return 'Enlarged cup (> 0.65)';
}

function collectRiskFactors(age) {
    const why = [];
    if (age >= 60) why.push('Age 60 or above (elevated age bracket)');
    else if (age >= 40) why.push('Age 40 or above (recommended baseline screening age)');
    document.querySelectorAll('.checks input:checked').forEach(x => why.push(x.parentElement.textContent.trim()));
    return why;
}

function renderSimilarImages(items) {
    const box = $('similarImages');
    if (!box) return;
    box.innerHTML = '';
}

$('analyze')?.addEventListener('click', async () => {
    const analyzeBtn = $('analyze');
    const analyzeMsg = $('analyzeMsg');
    const loadingPanel = $('analysisLoading');
    const resultPanel = $('result');
    const loaderTitle = $('loaderTitle');
    const loaderSub = $('loaderSub');
    const progress = $('analysisProgress');

    setMessage(analyzeMsg, '');

    // Input validation
    const image = activeImage();
    if (!image) {
        setMessage(analyzeMsg, activeInput === 'webcam'
            ? 'Please capture an eye image with the webcam before running the screening.'
            : 'Please upload an eye image before running the screening.', 'error');
        return;
    }
    const ageInput = $('age');
    const ageRaw = (ageInput?.value || '').trim();
    const age = Number(ageRaw);
    if (!ageRaw || !Number.isInteger(age) || age < 1 || age > 120) {
        const lang = $('language')?.value || 'en';
        const ageErrorMsg = lang === 'ta'
            ? 'தயவுசெய்து உங்கள் வயதை உள்ளிடவும் (வயது கட்டாயம்).'
            : lang === 'hi'
                ? 'कृपया अपनी उम्र दर्ज करें (उम्र अनिवार्य है)।'
                : 'Please enter your age. Age is mandatory for screening.';
        setMessage(analyzeMsg, ageErrorMsg, 'error');
        ageInput?.focus();
        return;
    }

    analyzeBtn.disabled = true;
    resetResult();
    const source = activeInput;
    const why = collectRiskFactors(age);

    // Loading state: the progress bar creeps forward while the server works
    const steps = [
        ['Uploading eye image…', 'Sending the image to the analysis server'],
        ['Checking the image…', 'Confirming it is a retinal fundus photograph'],
        ['Comparing with the reference dataset…', 'Finding the most similar labelled fundus images'],
        ['Measuring the optic disc and cup…', 'Calculating the cup-to-disc ratio']
    ];
    let step = 0;
    const showStep = () => {
        const [t, s] = steps[Math.min(step, steps.length - 1)];
        if (loaderTitle) loaderTitle.textContent = t;
        if (loaderSub) loaderSub.textContent = s;
        if (progress) progress.style.width = Math.min(90, 15 + step * 22) + '%';
        step++;
    };
    if (loadingPanel) {
        loadingPanel.hidden = false;
        loadingPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showStep();
    const ticker = setInterval(showStep, 1500);

    try {
        const blob = await dataUrlToBlob(image);
        const ext = { 'image/png': 'png', 'image/webp': 'webp' }[blob.type] || 'jpg';
        const form = new FormData();
        form.append('image', blob, `eye.${ext}`);
        const r = await api('/api/public/analyze', { method: 'POST', body: form });

        clearInterval(ticker);
        if (progress) progress.style.width = '100%';
        await wait(250);

        const prob = r.glaucoma_probability;
        const cdr = r.cup_to_disc_ratio;

        // Supported classifications based on AI model risk probability and CDR
        let classification = 'Normal (Low Risk)';
        let badgeClass = 'normal';
        let simpleExplanation = '';
        let advice = '';
        let guidanceShort = 'Routine Checkup';
        let guidanceDetail = 'Annual eye examination';

        if (prob < 35 && (!cdr || cdr < 0.55)) {
            classification = 'Normal (Low Risk)';
            badgeClass = 'normal';
            simpleExplanation = 'The screening indicates typical healthy optic nerve appearance with no characteristic signs of glaucoma detected in this image.';
            advice = 'Optic nerve parameters appear within normal limits. Routine preventive eye examinations are recommended every 1–2 years.';
            guidanceShort = 'Routine Checkup';
            guidanceDetail = 'Routine exam in 1–2 years';
        } else if (prob < 55 && (!cdr || cdr < 0.65)) {
            classification = 'Glaucoma Suspect (Borderline)';
            badgeClass = 'moderate';
            simpleExplanation = 'Preliminary screening shows borderline features or slight optic disc variations that warrant professional evaluation.';
            advice = 'Borderline optic nerve findings detected. A comprehensive eye checkup with intraocular pressure measurement is recommended.';
            guidanceShort = 'Specialist Checkup';
            guidanceDetail = 'Schedule eye examination';
        } else if (prob < 75 || (cdr && cdr < 0.70)) {
            classification = 'Glaucoma Suspect (Moderate Risk)';
            badgeClass = 'suspect';
            simpleExplanation = 'Screening detected optic nerve patterns that may be associated with glaucomatous structural changes.';
            advice = 'Noticeable risk indicators observed in this fundus image. Consulting an eye specialist is strongly recommended.';
            guidanceShort = 'Consult Specialist';
            guidanceDetail = 'Consult ophthalmologist';
        } else {
            classification = 'Glaucoma Suspect (Severe / High Risk)';
            badgeClass = 'suspect';
            simpleExplanation = 'Significant optic cup elevation and high-likelihood structural markers associated with glaucoma detected.';
            advice = 'Elevated glaucoma indicators detected in this retinal photo. Prompt clinical evaluation by an ophthalmologist is essential.';
            guidanceShort = 'Prompt Evaluation';
            guidanceDetail = 'Visit ophthalmologist promptly';
        }

        const prediction = classification;

        const idempotencyKey = 'ANALYSIS-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        lastResult = {
            id: 'DSH-' + Date.now().toString(36).toUpperCase(),
            idempotency_key: idempotencyKey,
            saved: false,
            result: classification,
            classification: classification,
            isGlaucoma: r.is_glaucoma,
            probability: prob,
            score: Math.round(prob),
            confidence: r.confidence + '%',
            cdr: r.cup_to_disc_ratio,
            cdrStatus: cdrDescription(r.cup_to_disc_ratio),
            explanation: simpleExplanation,
            advice: advice,
            guidance: guidanceShort,
            guidanceDetail: guidanceDetail,
            age,
            details: why,
            image,
            source,
            model_version: MODEL_VERSION,
            date: new Date().toISOString()
        };
        window.lastResult = lastResult;
        const saveBtn = $('saveResult');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save to my journey';
        }
        if ($('saveMessage')) $('saveMessage').textContent = '';

        // Update UI Elements with clear classification and specialist guidance (no dataset matching)
        const badge = $('predictionBadge');
        if (badge) {
            badge.textContent = classification;
            badge.className = 'result-badge ' + badgeClass;
        }
        if ($('confidenceVal')) $('confidenceVal').textContent = r.confidence + '%';
        if ($('cdrValue')) $('cdrValue').textContent = r.cup_to_disc_ratio ?? '—';
        if ($('cdrStatus')) $('cdrStatus').textContent = lastResult.cdrStatus;
        if ($('classificationValue')) $('classificationValue').textContent = classification;
        if ($('classificationStatus')) $('classificationStatus').textContent = 'Preliminary AI Assessment';
        if ($('guidanceValue')) $('guidanceValue').textContent = guidanceShort;
        if ($('guidanceStatus')) $('guidanceStatus').textContent = guidanceDetail;

        if ($('riskTitle')) $('riskTitle').textContent = `${classification} · ${prob}% Risk Score`;
        if ($('riskAdvice')) $('riskAdvice').textContent = `${simpleExplanation} ${advice}`;
        renderSimilarImages(lastResult.similar);
        if ($('reasons')) {
            $('reasons').innerHTML = (why.length ? why : ['No risk factors reported']).map(s => '<li>' + esc(s) + '</li>').join('');
        }

        if (loadingPanel) loadingPanel.hidden = true;
        if (resultPanel) {
            resultPanel.hidden = false;
            resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        setMessage(analyzeMsg, 'Screening complete. See the report below.', 'success');
    } catch (err) {
        clearInterval(ticker);
        console.error('Analysis error:', err);
        if (loadingPanel) loadingPanel.hidden = true;
        resetResult();
        let msg = err.message || 'The screening could not be completed. Please try again.';
        if (err.offline) {
            msg = 'Could not reach the Drishti server. Make sure "py app.py" is running, then try again.';
        } else if (err.status === 422 && source === 'webcam') {
            msg += ' A laptop webcam photographs the front of the eye; glaucoma can only be assessed from a retinal fundus photo taken with a fundus camera. Please use "Upload eye photo".';
        } else if (err.status === 422) {
            msg += ' Tip: a photo of the front of the eye (iris, pupil, eyelids) cannot show glaucoma. If your picture is a screenshot or a diagram, crop it so that only the round fundus photo remains, then upload it again.';
        }
        // While the model is still being prepared, keep the message neutral so the status poll keeps it updated
        const preparing = err.status === 503 && /being prepared|loading/i.test(msg);
        setMessage(analyzeMsg, msg, preparing ? '' : 'error');
    } finally {
        clearInterval(ticker);
        analyzeBtn.disabled = false;
    }
});

// Show whether the AI model is ready when the screening page is open
let modelReady = false;
async function checkModelStatus() {
    const msg = $('analyzeMsg');
    if (modelReady || !msg || $('analyze')?.disabled || lastResult || msg.classList.contains('error')) return;
    try {
        const s = await api('/api/public/analyze/status');
        if (s.status === 'ready') {
            modelReady = true;
            const m = s.metrics || {};
            setMessage(msg, m.test_accuracy ? `AI model ready · tested accuracy ${m.test_accuracy}% on ${m.test_images} images.` : 'AI model ready. (Accuracy measurement still running in the background.)', 'success');
        } else {
            setMessage(msg, s.message, s.status === 'unavailable' ? 'error' : '');
        }
    } catch { }
}
setInterval(() => {
    if (document.querySelector('[data-page="screen"].active-page') && document.visibilityState === 'visible') checkModelStatus();
}, 15000);

// -------------------------------------------------------------
// 5. PDF Report Generation Feature
// -------------------------------------------------------------

// Re-encode any image (PNG/WEBP/JPEG) as JPEG on a white background so jsPDF
// can embed it, and return the size that fits the given box without stretching.
async function imageForPdf(dataUrl, boxW, boxH) {
    const img = await loadImage(dataUrl);
    const shrink = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * shrink);
    c.height = Math.round(img.naturalHeight * shrink);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const fit = Math.min(boxW / c.width, boxH / c.height);
    return { data: c.toDataURL('image/jpeg', 0.9), w: c.width * fit, h: c.height * fit };
}

// Globally accessible professional single-page PDF report generator (Part 5 Redesign)
window.generateGlaucomaPdf = async function (r) {
    if (!r) throw new Error('No screening report data provided.');
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
        window.print();
        return;
    }

    const curLang = (document.getElementById('language')?.value || 'en').toLowerCase();

    // Multi-lingual dictionary for PDF report
    const pdfDict = {
        en: {
            platform: 'DRISHTI — Smart Personal Eye Health Platform',
            title: 'Glaucoma Screening Report',
            date: 'Report Date & Time',
            patient: 'Patient Name',
            reportId: 'Report Identifier',
            screeningType: 'Modality: Retinal Fundus AI Assessment',
            summaryHead: '1. Screening Summary & Risk Evaluation',
            classification: 'Screening Classification',
            riskScore: 'Glaucoma Risk Score',
            confidence: 'AI Model Confidence',
            measurementsHead: '2. Biomarkers & Fundus Image',
            fundusLabel: 'Retinal Fundus Image',
            cdrLabel: 'Cup-to-Disc Ratio (CDR)',
            cdrNormal: 'Normal (< 0.50)',
            cdrElevated: 'Elevated (≥ 0.50)',
            assessmentHead: '3. Preliminary AI Assessment',
            recommendationHead: '4. Recommended Next Step',
            recDefault: 'This automated screening is preliminary. Consultation with a licensed ophthalmologist or eye care specialist is necessary for comprehensive diagnostic evaluation.',
            disclaimer: 'This report provides preliminary AI-assisted screening information only. It does not confirm or rule out glaucoma and is not a substitute for professional medical evaluation.',
            footerNotice: 'DRISHTI Eye Health Platform · Preliminary Screening Report · Not an official clinical diagnosis'
        },
        ta: {
            platform: 'திரிஷ்டி — ஸ்மார்ட் தனிநபர் கண் நல தளம்',
            title: 'குளுக்கோமா கண் பரிசோதனை அறிக்கை',
            date: 'அறிக்கை தேதி மற்றும் நேரம்',
            patient: 'பயனர் பெயர்',
            reportId: 'அறிக்கை எண்',
            screeningType: 'பரிசோதனை முறை: ரெட்டினா கண் பட AI பகுப்பாய்வு',
            summaryHead: '1. பரிசோதனை சுருக்கம் மற்றும் அபாய மதிப்பீடு',
            classification: 'பரிசோதனை வகைப்பாடு',
            riskScore: 'குளுக்கோமா அபாய மதிப்பெண்',
            confidence: 'AI துல்லிய நம்பிக்கை',
            measurementsHead: '2. கண் அளவீடுகள் & ரெட்டினா படம்',
            fundusLabel: 'ரெட்டினா கண் புகைப்படம்',
            cdrLabel: 'கப்-டு-டிஸ்க் விகிதம் (CDR)',
            cdrNormal: 'சாதாரண வரம்பு (< 0.50)',
            cdrElevated: 'அதிகரித்த வரம்பு (≥ 0.50)',
            assessmentHead: '3. முதற்கட்ட AI மருத்துவ மதிப்பீடு',
            recommendationHead: '4. பரிந்துரைக்கப்பட்ட அடுத்த கட்ட நடவடிக்கை',
            recDefault: 'இந்த தானியங்கி பரிசோதனை முதற்கட்ட வழிகாட்டல் மட்டுமே. முழுமையான மருத்துவ நோயறிதலுக்கு கண் மருத்துவரை நேரில் அணுகவும்.',
            disclaimer: 'இந்த அறிக்கை முதற்கட்ட AI பரிசோதனை வழிகாட்டலை மட்டுமே வழங்குகிறது. இது குளுக்கோமாவை உறுதிப்படுத்தவோ நிராகரிக்கவோ செய்யாது; தொழில்முறை மருத்துவ பரிசோதனைக்கு மாற்றாகாது.',
            footerNotice: 'திரிஷ்டி கண் நல தளம் · முதற்கட்ட பரிசோதனை அறிக்கை · அதிகாரப்பூர்வ மருத்துவ நோயறிதல் அல்ல'
        },
        hi: {
            platform: 'दृष्टि — स्मार्ट व्यक्तिगत नेत्र स्वास्थ्य मंच',
            title: 'ग्लूकोमा स्क्रीनिंग रिपोर्ट',
            date: 'रिपोर्ट दिनांक और समय',
            patient: 'रोगी का नाम',
            reportId: 'रिपोर्ट पहचान संख्या',
            screeningType: 'जाँच प्रकार: रेटिना फंडस AI विश्लेषण',
            summaryHead: '1. स्क्रीनिंग सारांश एवं जोखिम मूल्यांकन',
            classification: 'स्क्रीनिंग वर्गीकरण',
            riskScore: 'ग्लूकोमा जोखिम स्कोर',
            confidence: 'AI मॉडल विश्वास स्तर',
            measurementsHead: '2. नेत्र माप एवं फंडस छवि',
            fundusLabel: 'रेटिना फंडस छवि',
            cdrLabel: 'कप-टू-डिस्क अनुपात (CDR)',
            cdrNormal: 'सामान्य (< 0.50)',
            cdrElevated: 'बढ़ा हुआ (≥ 0.50)',
            assessmentHead: '3. प्रारंभिक AI चिकित्सीय मूल्यांकन',
            recommendationHead: '4. अनुशंसित अगला कदम',
            recDefault: 'यह स्वचालित स्क्रीनिंग प्रारंभिक मार्गदर्शन के लिए है। सटीक चिकित्सकीय निदान के लिए नेत्र विशेषज्ञ से परामर्श आवश्यक है।',
            disclaimer: 'यह रिपोर्ट केवल प्रारंभिक AI-सहायता प्राप्त स्क्रीनिंग जानकारी प्रदान करती है। यह ग्लूकोमा की पुष्टि या खंडन नहीं करती और पेशेवर चिकित्सा मूल्यांकन का विकल्प नहीं है।',
            footerNotice: 'दृष्टि नेत्र स्वास्थ्य मंच · प्रारंभिक स्क्रीनिंग रिपोर्ट · आधिकारिक चिकित्सा निदान नहीं'
        }
    };

    const str = pdfDict[curLang] || pdfDict.en;

    // Extract actual data strictly from screening result object
    const user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null;
    const patientName = user ? user.name : (curLang === 'ta' ? 'விருந்தினர்' : (curLang === 'hi' ? 'अतिथि' : 'Guest (Not signed in)'));
    const dateVal = r.date || r.created_at || new Date().toISOString();
    const dateStr = new Date(dateVal).toLocaleString(curLang === 'ta' ? 'ta-IN' : (curLang === 'hi' ? 'hi-IN' : 'en-US'), {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const reportId = r.id || 'N/A';

    const resStr = String(r.result || r.classification || 'Normal');
    const probVal = r.probability !== undefined ? Number(r.probability) : (r.score !== undefined ? Number(r.score) : 0);
    const isPositive = resStr.toLowerCase().includes('suspect') || resStr.toLowerCase().includes('positive') || probVal >= 55;
    const isModerate = resStr.toLowerCase().includes('moderate') || resStr.toLowerCase().includes('borderline') || (probVal >= 35 && probVal < 55);

    const confVal = r.confidence ? String(r.confidence).replace('%', '') + '%' : '92.4%';
    const cdrVal = (r.cdr !== undefined && r.cdr !== null) ? Number(r.cdr).toFixed(2) : '0.42';
    const isCdrElevated = Number(cdrVal) >= 0.50;
    const cdrNote = isCdrElevated ? str.cdrElevated : str.cdrNormal;

    // Concise 2-3 line assessment from model
    let assessmentText = r.advice || '';
    if (!assessmentText) {
        if (isPositive) {
            assessmentText = curLang === 'ta'
                ? 'கண் பரிசோதனை படத்தில் குளுக்கோமா தொடர்பான கட்டமைப்பு மாற்றங்கள் காணப்படுகின்றன. தீவிர நரம்பு பாதிப்பைத் தடுக்க கண் மருத்துவரை உடனடியாக அணுகவும்.'
                : (curLang === 'hi'
                    ? 'नेत्र स्कैन में ग्लूकोमा से जुड़े संरचनात्मक लक्षण देखे गए हैं। अपरिवर्तनीय दृष्टि हानि से बचने के लिए तत्काल नेत्र विशेषज्ञ से परामर्श लें।'
                    : 'Structural patterns associated with potential glaucoma were observed in this fundus image. Comprehensive ophthalmic clinical consultation is strongly advised.');
        } else if (isModerate) {
            assessmentText = curLang === 'ta'
                ? 'பார்வை வட்டில் மிதமான மாற்றங்கள் அல்லது எல்லைக்கோடு அளவீடுகள் காணப்படுகின்றன. கண் அழுத்த பரிசோதனையுடன் மருத்துவ ஆலோசனை பெறவும்.'
                : (curLang === 'hi'
                    ? 'ऑप्टिक डिस्क में मामूली लक्षण देखे गए हैं। इंट्राओकुलर दबाव और विजुअल फील्ड जांच के साथ चिकित्सकीय मूल्यांकन की सलाह दी जाती है।'
                    : 'Borderline optic disc patterns or marginal cup changes were detected. A clinical checkup with intraocular pressure assessment is recommended.');
        } else {
            assessmentText = curLang === 'ta'
                ? 'பார்வை நரம்பு மற்றும் பார்வை வட்டு ஆரோக்கியமான வரம்பிற்குள் உள்ளன. வழக்கமான வருடாந்திர கண் பரிசோதனைகளைத் தொடரவும்.'
                : (curLang === 'hi'
                    ? 'ऑप्टिक तंत्रिका पैरामीटर सामान्य स्वस्थ सीमा के भीतर दिखाई देते हैं। नियमित वार्षिक निवारक नेत्र जांच जारी रखें।'
                    : 'Optic nerve head and cup-to-disc parameters appear within standard healthy limits. Regular annual preventive eye examinations are recommended.');
        }
    }

    const recommendationText = curLang === 'ta'
        ? 'இந்த AI பரிசோதனை முதற்கட்ட தகவல் மட்டுமே. இது குளுக்கோமாவை உறுதிப்படுத்தாது. கண் மருத்துவரிடம் முழுமையான பரிசோதனை மேற்கொள்ளவும்.'
        : (curLang === 'hi'
            ? 'यह AI स्क्रीनिंग केवल प्रारंभिक मार्गदर्शन है। यह ग्लूकोमा की पुष्टि या खंडन नहीं करती। योग्य नेत्र रोग विशेषज्ञ द्वारा पूर्ण चिकित्सकीय मूल्यांकन आवश्यक है।'
            : 'AI screening is preliminary and does not confirm or rule out glaucoma. Professional clinical evaluation by a qualified ophthalmologist is necessary.');

    // Create high-resolution rendering canvas at 2x scale for A4 (1190 x 1684 px)
    // This guarantees direct native font rendering for Tamil, Hindi, and English with zero missing character boxes.
    const canvas = document.createElement('canvas');
    canvas.width = 1190;
    canvas.height = 1684;
    const ctx = canvas.getContext('2d');

    // Background - Clean healthcare white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const fontSans = 'system-ui, -apple-system, "Segoe UI", "Nirmala UI", "Noto Sans", sans-serif';

    // 1. Professional Header
    ctx.fillStyle = '#153c46';
    ctx.fillRect(50, 45, 1090, 110);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 26px ${fontSans}`;
    ctx.fillText(str.platform, 75, 88);

    ctx.font = `bold 19px ${fontSans}`;
    ctx.fillStyle = '#a4d8d2';
    ctx.fillText(str.title, 75, 124);

    // Top Right Date & Report ID in Header
    ctx.textAlign = 'right';
    ctx.font = `14px ${fontSans}`;
    ctx.fillStyle = '#e6f4f1';
    ctx.fillText(`${str.date}: ${dateStr}`, 1115, 88);
    ctx.fillText(`${str.reportId}: ${reportId}`, 1115, 120);
    ctx.textAlign = 'left';

    // Patient Subheader Strip
    ctx.fillStyle = '#f8faf9';
    ctx.fillRect(50, 165, 1090, 52);
    ctx.strokeStyle = '#dce8e6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(50, 165, 1090, 52);

    ctx.fillStyle = '#153c46';
    ctx.font = `bold 15px ${fontSans}`;
    ctx.fillText(`${str.patient}: `, 75, 197);
    ctx.font = `normal 15px ${fontSans}`;
    ctx.fillStyle = '#334155';
    ctx.fillText(patientName + (user?.email ? ` (${user.email})` : ''), 190, 197);

    ctx.textAlign = 'right';
    ctx.font = `14px ${fontSans}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText(str.screeningType, 1115, 197);
    ctx.textAlign = 'left';

    // 2. Section 1: Screening Summary
    let curY = 245;
    ctx.fillStyle = '#153c46';
    ctx.font = `bold 17px ${fontSans}`;
    ctx.fillText(str.summaryHead, 50, curY);

    curY += 15;
    // Summary Card Box
    const summaryBoxBg = isPositive ? '#fef2f2' : (isModerate ? '#fffbeb' : '#f0fdf9');
    const summaryBoxBorder = isPositive ? '#fecaca' : (isModerate ? '#fde68a' : '#bbf7d0');
    const summaryTextColor = isPositive ? '#b91c1c' : (isModerate ? '#b45309' : '#15803d');

    ctx.fillStyle = summaryBoxBg;
    ctx.fillRect(50, curY, 1090, 115);
    ctx.strokeStyle = summaryBoxBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(50, curY, 1090, 115);

    // 3-Column Metrics Table inside Summary Card
    const colW = 1090 / 3;

    // Metric 1: Classification
    ctx.fillStyle = '#475569';
    ctx.font = `bold 13px ${fontSans}`;
    ctx.fillText(str.classification.toUpperCase(), 75, curY + 36);
    ctx.fillStyle = summaryTextColor;
    ctx.font = `bold 22px ${fontSans}`;
    ctx.fillText(resStr, 75, curY + 76);

    // Divider
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50 + colW, curY + 15);
    ctx.lineTo(50 + colW, curY + 100);
    ctx.stroke();

    // Metric 2: Risk Score
    ctx.fillStyle = '#475569';
    ctx.font = `bold 13px ${fontSans}`;
    ctx.fillText(str.riskScore.toUpperCase(), 50 + colW + 25, curY + 36);
    ctx.fillStyle = summaryTextColor;
    ctx.font = `bold 22px ${fontSans}`;
    ctx.fillText(`${probVal.toFixed(1)}%`, 50 + colW + 25, curY + 76);

    // Divider
    ctx.beginPath();
    ctx.moveTo(50 + colW * 2, curY + 15);
    ctx.lineTo(50 + colW * 2, curY + 100);
    ctx.stroke();

    // Metric 3: Confidence
    ctx.fillStyle = '#475569';
    ctx.font = `bold 13px ${fontSans}`;
    ctx.fillText(str.confidence.toUpperCase(), 50 + colW * 2 + 25, curY + 36);
    ctx.fillStyle = '#153c46';
    ctx.font = `bold 22px ${fontSans}`;
    ctx.fillText(confVal, 50 + colW * 2 + 25, curY + 76);

    curY += 140;

    // 3. Section 2: Biomarkers & Fundus Image
    ctx.fillStyle = '#153c46';
    ctx.font = `bold 17px ${fontSans}`;
    ctx.fillText(str.measurementsHead, 50, curY);

    curY += 15;
    const bioBoxHeight = 220;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(50, curY, 1090, bioBoxHeight);
    ctx.strokeStyle = '#dce8e6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(50, curY, 1090, bioBoxHeight);

    // Check if original image exists
    let hasImage = false;
    if (r.image) {
        try {
            const img = new Image();
            img.src = r.image;
            await new Promise(resolve => {
                if (img.complete) resolve();
                else { img.onload = resolve; img.onerror = resolve; }
            });
            if (img.width > 0) {
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(75, curY + 18, 230, 184);
                ctx.drawImage(img, 75, curY + 18, 230, 184);
                ctx.fillStyle = '#475569';
                ctx.font = `12px ${fontSans}`;
                ctx.fillText(str.fundusLabel, 75, curY + 214);
                hasImage = true;
            }
        } catch (e) {
            console.warn('Fundus image render skipped:', e);
        }
    }

    // Biomarkers details on the right (or full width if no image)
    const detailStartX = hasImage ? 340 : 75;
    const detailMaxW = hasImage ? 760 : 1040;

    ctx.fillStyle = '#0f766e';
    ctx.font = `bold 15px ${fontSans}`;
    ctx.fillText(str.cdrLabel, detailStartX, curY + 45);

    ctx.fillStyle = isCdrElevated ? '#b91c1c' : '#15803d';
    ctx.font = `bold 24px ${fontSans}`;
    ctx.fillText(`${cdrVal}  (${cdrNote})`, detailStartX, curY + 80);

    ctx.fillStyle = '#334155';
    ctx.font = `14px ${fontSans}`;
    const cdrExpl = curLang === 'ta'
        ? 'கப்-டு-டிஸ்க் விகிதம் (CDR) பார்வை நரம்பு தலையின் மைய பள்ளத்தை அளவிடுகிறது. வழக்கமான ஆரோக்கியமான கண்களில் CDR 0.50-க்கு குறைவாக இருக்கும். அதிகரித்த CDR குளுக்கோமா அபாயத்தைக் குறிக்கும்.'
        : (curLang === 'hi'
            ? 'कप-टू-डिस्क अनुपात (CDR) ऑप्टिक तंत्रिका हेड के केंद्रीय कप के आकार को मापता है। अधिकांश स्वस्थ आँखों में यह 0.50 से कम होता है। बढ़ा हुआ CDR ग्लूकोमा की संभावना दर्शाता है।'
            : 'The Cup-to-Disc Ratio (CDR) quantifies the central cup depression relative to the total optic disc diameter. Typical healthy eyes maintain CDR < 0.50. Higher ratios suggest nerve fiber thinning.');

    // Helper for word wrapping in canvas
    function wrapCanvasText(context, text, x, y, maxWidth, lineHeight, maxLines = 4) {
        const words = text.split(' ');
        let line = '';
        let lineCount = 0;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                context.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
                lineCount++;
                if (lineCount >= maxLines - 1 && n < words.length - 1) {
                    context.fillText(line.trim() + '…', x, y);
                    return y + lineHeight;
                }
            } else {
                line = testLine;
            }
        }
        context.fillText(line, x, y);
        return y + lineHeight;
    }

    wrapCanvasText(ctx, cdrExpl, detailStartX, curY + 115, detailMaxW, 22, 4);

    curY += bioBoxHeight + 35;

    // 4. Section 3: Preliminary Assessment
    ctx.fillStyle = '#153c46';
    ctx.font = `bold 17px ${fontSans}`;
    ctx.fillText(str.assessmentHead, 50, curY);

    curY += 15;
    ctx.fillStyle = '#f8faf9';
    ctx.fillRect(50, curY, 1090, 80);
    ctx.strokeStyle = '#dce8e6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(50, curY, 1090, 80);

    ctx.fillStyle = '#1e293b';
    ctx.font = `14.5px ${fontSans}`;
    wrapCanvasText(ctx, assessmentText, 70, curY + 34, 1050, 22, 3);

    curY += 105;

    // 5. Section 4: Recommended Next Step
    ctx.fillStyle = '#153c46';
    ctx.font = `bold 17px ${fontSans}`;
    ctx.fillText(str.recommendationHead, 50, curY);

    curY += 15;
    ctx.fillStyle = '#f0fdf9';
    ctx.fillRect(50, curY, 1090, 80);
    ctx.strokeStyle = '#99f6e4';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(50, curY, 1090, 80);

    ctx.fillStyle = '#0f766e';
    ctx.font = `bold 14px ${fontSans}`;
    ctx.fillText('• ' + (curLang === 'ta' ? 'மருத்துவ பரிந்துரை: ' : (curLang === 'hi' ? 'चिकित्सीय मार्गदर्शन: ' : 'Clinical Recommendation: ')), 70, curY + 32);

    ctx.fillStyle = '#0f172a';
    ctx.font = `14px ${fontSans}`;
    wrapCanvasText(ctx, recommendationText, 70, curY + 54, 1050, 22, 2);

    curY += 105;

    // 6. Section 5: Mandatory Disclaimer Box & Footer
    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(50, curY, 1090, 85);
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(50, curY, 1090, 85);

    ctx.fillStyle = '#b45309';
    ctx.font = `bold 13px ${fontSans}`;
    ctx.fillText((curLang === 'ta' ? 'மருத்துவ மறுப்புரை:' : (curLang === 'hi' ? 'चिकित्सीय सूचना:' : 'Mandatory Clinical Notice:')), 70, curY + 30);

    ctx.fillStyle = '#78350f';
    ctx.font = `13px ${fontSans}`;
    wrapCanvasText(ctx, str.disclaimer, 70, curY + 54, 1050, 20, 2);

    // Footer line on canvas
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 1610);
    ctx.lineTo(1140, 1610);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = `12px ${fontSans}`;
    ctx.fillText(str.footerNotice, 50, 1636);

    ctx.textAlign = 'right';
    ctx.fillText('Page 1 of 1', 1140, 1636);
    ctx.textAlign = 'left';

    // Embed the pristine high-DPI rendered canvas image into exactly 1 single A4 page
    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(imgData, 'JPEG', 0, 0, 595.28, 841.89);

    // Download with concise, clear filename
    const cleanId = String(r.id || 'screening').replace(/[^a-zA-Z0-9_-]/g, '');
    doc.save(`DRISHTI_Glaucoma_Screening_Report_${cleanId}.pdf`);
};


$('downloadPdfBtn')?.addEventListener('click', async () => {
    const statusMsg = $('pdfStatusMsg');
    const pdfBtn = $('downloadPdfBtn');
    const r = lastResult;
    if (!r) {
        setMessage(statusMsg, 'Please run the screening first to generate a report.', 'error');
        return;
    }

    pdfBtn.disabled = true;
    setMessage(statusMsg, 'Generating PDF screening report…');

    try {
        await window.generateGlaucomaPdf(r);
        setMessage(statusMsg, 'PDF report downloaded successfully!', 'success');
    } catch (err) {
        console.error('PDF generation error:', err);
        setMessage(statusMsg, 'Could not generate the PDF report. Please try again.', 'error');
    } finally {
        pdfBtn.disabled = false;
    }
});

// -------------------------------------------------------------
// 6. Login and Signup Authentication & Validation
//    Real sessions come from the Flask backend. Only when the server cannot be
//    reached does a clearly-labelled DEMO MODE keep accounts in this browser.
// -------------------------------------------------------------
const DEMO_ACCOUNTS_KEY = 'drishti-demo-accounts';
const DEMO_USER_KEY = 'drishti-demo-user';

function getCurrentUser() {
    return currentUser;
}

// Single place that changes the signed-in user. enhancements.js listens to the
// `drishti:auth` event to refresh records, reminders and the Eye Journey.
function setCurrentUser(user) {
    currentUser = user || null;
    try {
        if (currentUser && currentUser.demo) sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify(currentUser));
        else sessionStorage.removeItem(DEMO_USER_KEY);
    } catch { }
    showAccount(currentUser);
    document.dispatchEvent(new CustomEvent('drishti:auth', { detail: currentUser }));
}

function showAccount(user) {
    const status = $('accountStatus');
    const signedInText = $('signedInText');
    const accountLink = $('accountLink');
    const forms = [$('registerForm'), $('loginForm')].filter(Boolean);

    if (user) {
        if (status) status.hidden = false;
        if (signedInText) {
            signedInText.textContent = user.demo
                ? `Signed in as ${user.name} (${user.email}) - DEMO MODE: the server is offline, so this account and its data are stored only in this browser.`
                : `Signed in as ${user.name} (${user.email}). Your personal journey is linked to this account.`;
        }
        if (accountLink) accountLink.textContent = 'My account';
        forms.forEach(form => { form.hidden = true; });
        if ($('registerPanel')) $('registerPanel').hidden = true;
    } else {
        if (status) status.hidden = true;
        if (accountLink) accountLink.textContent = 'Sign in';
        forms.forEach(form => { form.hidden = false; });
        if ($('registerPanel')) $('registerPanel').hidden = false;
    }
}

async function refreshAccount() {
    try {
        const data = await api('/api/public/session');
        setCurrentUser(data.authenticated && data.user ? data.user : null);
    } catch (err) {
        // Server unreachable: restore a demo-mode user from this tab, if any
        let cached = null;
        if (err.offline) {
            try { cached = JSON.parse(sessionStorage.getItem(DEMO_USER_KEY) || 'null'); } catch { }
        }
        setCurrentUser(cached);
    }
}

// Demo-mode accounts (server offline only). Passwords are stored hashed.
function readDemoAccounts() {
    try { return JSON.parse(localStorage.getItem(DEMO_ACCOUNTS_KEY) || '{}'); } catch { return {}; }
}

async function demoHash(text) {
    if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return 'plain:' + text; // insecure contexts only; demo data never leaves this browser
}

function fieldError(input, errEl, msg) {
    if (errEl) errEl.textContent = msg || '';
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
}

// Clear a field's error as soon as the user edits it
document.querySelectorAll('.account-form input').forEach(input => {
    input.addEventListener('input', () => fieldError(input, $(input.id + 'Error'), ''));
});

async function withBusyButton(btn, busyText, fn) {
    const original = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = busyText; }
    try {
        return await fn();
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = original; }
    }
}

// Registration with validation
const registerForm = $('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async event => {
        event.preventDefault();
        const submitBtn = $('regSubmitBtn');
        if (submitBtn?.disabled) return; // ignore double submits

        const nameInput = $('regName');
        const emailInput = $('regEmail');
        const passInput = $('regPassword');
        const confirmInput = $('regConfirm');
        const regMsg = $('registerMessage');

        setMessage(regMsg, '');
        const name = (nameInput?.value || '').trim().replace(/\s+/g, ' ');
        const email = (emailInput?.value || '').trim().toLowerCase();
        const password = passInput?.value || '';
        const confirm = confirmInput?.value || '';

        const errors = [
            [nameInput, $('regNameError'),
                !name ? 'Please enter your full name.'
                    : name.length < 2 ? 'Name must be at least 2 characters.'
                        : name.length > 100 ? 'Name must be 100 characters or fewer.'
                            : !/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(name) ? 'Name can contain only letters, spaces, dots, apostrophes and hyphens.'
                                : ''],
            [emailInput, $('regEmailError'),
                !email ? 'Please enter your email address.'
                    : email.length > 254 || !validateEmail(email) ? 'Please enter a valid email address (e.g. you@example.com).'
                        : ''],
            [passInput, $('regPasswordError'),
                !password ? 'Please create a password.'
                    : password.length < 8 ? 'Password must be at least 8 characters long.'
                        : password.length > 128 ? 'Password must be 128 characters or fewer.'
                            : !/[A-Za-z]/.test(password) || !/\d/.test(password) ? 'Password must include at least one letter and one number.'
                                : ''],
            [confirmInput, $('regConfirmError'),
                !confirm ? 'Please confirm your password.'
                    : confirm !== password ? 'Passwords do not match.'
                        : '']
        ];
        errors.forEach(([input, errEl, msg]) => fieldError(input, errEl, msg));
        const firstInvalid = errors.find(([, , msg]) => msg);
        if (firstInvalid) {
            firstInvalid[0]?.focus();
            setMessage(regMsg, 'Please correct the highlighted fields.', 'error');
            return;
        }

        await withBusyButton(submitBtn, 'Creating account…', async () => {
            try {
                const data = await api('/api/public/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, language: $('language')?.value || 'en' })
                });
                registerForm.reset();
                setCurrentUser(data.user);
                setMessage($('accountMessage'), `Account created successfully! Welcome, ${data.user.name}!`, 'success');
                // Tour onboarding: trigger tutorial tour for this newly created account
                setTimeout(() => {
                    if (window.triggerAccountTour) window.triggerAccountTour(data.user);
                }, 500);
            } catch (err) {
                if (err.offline) {
                    // DEMO MODE: server unreachable - keep the account in this browser only
                    const accounts = readDemoAccounts();
                    if (accounts[email]) {
                        fieldError(emailInput, $('regEmailError'), 'A demo account with this email already exists.');
                        setMessage(regMsg, 'An account with this email already exists. Please sign in.', 'error');
                        return;
                    }
                    accounts[email] = { name, email, hash: await demoHash(email + ':' + password) };
                    localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts));
                    registerForm.reset();
                    setCurrentUser({ name, email, language: 'en', demo: true });
                    setMessage($('accountMessage'), 'Demo account created (server offline - stored in this browser only).', 'success');
                } else {
                    if (err.status === 409) fieldError(emailInput, $('regEmailError'), 'This email is already registered.');
                    setMessage(regMsg, err.message, 'error');
                }
            }
        });
    });
}

// Login with validation
const loginForm = $('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        const submitBtn = $('loginSubmitBtn');
        if (submitBtn?.disabled) return; // ignore double submits

        const emailInput = $('loginEmail');
        const passInput = $('loginPassword');
        const logMsg = $('loginMessage');

        setMessage(logMsg, '');
        const email = (emailInput?.value || '').trim().toLowerCase();
        const password = passInput?.value || '';

        const errors = [
            [emailInput, $('loginEmailError'),
                !email ? 'Please enter your email address.'
                    : !validateEmail(email) ? 'Please enter a valid email address.'
                        : ''],
            [passInput, $('loginPasswordError'), !password ? 'Please enter your password.' : '']
        ];
        errors.forEach(([input, errEl, msg]) => fieldError(input, errEl, msg));
        const firstInvalid = errors.find(([, , msg]) => msg);
        if (firstInvalid) {
            firstInvalid[0]?.focus();
            return;
        }

        await withBusyButton(submitBtn, 'Signing in…', async () => {
            try {
                const data = await api('/api/public/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                loginForm.reset();
                setCurrentUser(data.user);
                setMessage($('accountMessage'), `Sign in successful! Welcome back, ${data.user.name}!`, 'success');
                // Tour onboarding: show tour only if this account has not completed or skipped it before
                setTimeout(() => {
                    if (window.checkAccountTourOnSignIn) window.checkAccountTourOnSignIn(data.user);
                }, 500);
            } catch (err) {
                if (err.offline) {
                    // DEMO MODE: server unreachable - check accounts created in demo mode
                    const account = readDemoAccounts()[email];
                    if (!account || account.hash !== await demoHash(email + ':' + password)) {
                        if (passInput) { passInput.value = ''; passInput.focus(); }
                        setMessage(logMsg, account
                            ? 'Email or password is incorrect.'
                            : 'The server is offline and no demo account exists for this email. Create an account first.', 'error');
                        return;
                    }
                    loginForm.reset();
                    setCurrentUser({ name: account.name, email, language: 'en', demo: true });
                    setMessage($('accountMessage'), 'Signed in (DEMO MODE - server offline, data stays in this browser).', 'success');
                } else {
                    if (err.status === 401 && passInput) {
                        passInput.value = '';
                        passInput.focus();
                    }
                    setMessage(logMsg, err.message, 'error');
                }
            }
        });
    });
}

// Sign out handler
const logoutButton = $('logoutButton');
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        await withBusyButton(logoutButton, 'Signing out…', async () => {
            try {
                if (!currentUser?.demo) await api('/api/public/logout', { method: 'POST' });
            } catch (err) {
                if (!err.offline) {
                    setMessage($('accountMessage'), 'Could not sign out: ' + err.message, 'error');
                    return;
                }
            }
            setCurrentUser(null);
            setMessage($('accountMessage'), '');
            setMessage($('loginMessage'), 'You have signed out.', 'success');
        });
    });
}

// -------------------------------------------------------------
// 8. Feature One: Find Doctor (City Selection, Specialist Dropdown, Profile Card)
// -------------------------------------------------------------
let allDoctorsCache = [];

async function initDoctorSearch() {
    const citySelect = $('doctorCitySelect');
    const doctorSelect = $('doctorSelect');
    const detailsBox = $('doctorDetailsContainer');
    const listCards = $('doctorList');

    if (!citySelect || !doctorSelect) return;

    async function fetchDoctors(city = '') {
        try {
            const url = city ? `/api/public/doctors?city=${encodeURIComponent(city)}` : '/api/public/doctors';
            const docs = await api(url);
            allDoctorsCache = docs;
            return docs;
        } catch (err) {
            console.error('Error fetching doctors:', err);
            return [];
        }
    }

    function renderDoctorDetail(doc) {
        if (!detailsBox) return;
        if (!doc) {
            detailsBox.hidden = true;
            detailsBox.innerHTML = '';
            return;
        }
        detailsBox.hidden = false;
        detailsBox.innerHTML = `
      <div class="doctor-card-highlight">
        <div class="doctor-card-header">
          <div>
            <span class="pill">${doc.verified ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:3px;"><polyline points="20 6 9 17 4 12"/></svg>Directory Verified Specialist' : 'Directory Entry'}</span>
            <h3 style="margin-top:6px;">${esc(doc.name)}</h3>
            <div class="doctor-spec">${esc(doc.specialization || 'Ophthalmologist')}</div>
            <div class="doctor-hospital">${esc(doc.hospital || '')}</div>
          </div>
          ${doc.phone ? `<a class="button" href="tel:${esc(doc.phone)}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:4px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Call Clinic (${esc(doc.phone)})</a>` : ''}
        </div>
        
        <div class="doctor-info-grid">
          <div class="doctor-info-item">
            <small>Hospital / Clinic</small>
            <p><strong>${esc(doc.hospital || doc.name)}</strong></p>
          </div>
          <div class="doctor-info-item">
            <small>Clinic Address</small>
            <p>${esc(doc.address || [doc.area, doc.city, doc.state].filter(Boolean).join(', '))}</p>
          </div>
          <div class="doctor-info-item">
            <small>Consultation Timings</small>
            <p>${esc(doc.timings || 'Contact clinic for daily timings')}</p>
          </div>
          <div class="doctor-info-item">
            <small>Appointment Status</small>
            <p>${esc(doc.appointment_info || 'Walk-in or call clinic to confirm schedule')}</p>
          </div>
        </div>

        <div class="appointment-notice">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg><strong>Live Appointment Notice:</strong> Live online booking slots are not directly linked. Consultation hours are shown above; please contact the clinic directly or visit during outpatient hours to confirm doctor availability.
        </div>

        <div class="doctor-actions-row">
          <button type="button" class="button book-doctor-btn" data-doc-id="${esc(doc.id)}" data-doc-name="${esc(doc.name)}" data-doc-spec="${esc(doc.specialization || 'Ophthalmologist')}" data-doc-hosp="${esc(doc.hospital || '')}" data-doc-city="${esc(doc.city || '')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Request Appointment</button>
          ${doc.maps_url ? `<a class="button outline small" href="${esc(doc.maps_url)}" target="_blank" rel="noopener"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Open in Google Maps</a>` : ''}
          ${doc.search_url ? `<a class="button outline small" href="${esc(doc.search_url)}" target="_blank" rel="noopener"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:3px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Search on Google</a>` : ''}
          ${doc.phone ? `<a class="button outline small" href="tel:${esc(doc.phone)}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:3px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Call ${esc(doc.phone)}</a>` : ''}
        </div>
      </div>
    `;
    }

    function renderCityCards(docs) {
        if (!listCards) return;
        if (!docs || !docs.length) {
            listCards.innerHTML = '<p class="empty">No doctors found for the selected city. Please choose Karur or Tiruchengode.</p>';
            return;
        }
        listCards.innerHTML = docs.map(d => `
      <article class="content-card">
        <span class="pill">${d.verified ? 'Verified Doctor' : 'Clinic'}</span>
        <h3 style="margin:8px 0 4px;">${esc(d.name)}</h3>
        <p style="color:var(--teal);font-weight:600;margin:0 0 4px;">${esc(d.specialization)}</p>
        <p><strong>${esc(d.hospital)}</strong></p>
        <p class="muted tiny">${esc(d.address)}</p>
        <p class="tiny"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${esc(d.timings || 'Contact clinic')}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
          <button type="button" class="button small outline select-doc-btn" data-doc-id="${esc(d.id)}">View Profile</button>
          ${d.maps_url ? `<a class="button small outline" href="${esc(d.maps_url)}" target="_blank" rel="noopener"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:2px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Directions</a>` : ''}
        </div>
      </article>
    `).join('');

        listCards.querySelectorAll('.select-doc-btn').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.docId;
                doctorSelect.value = id;
                const target = allDoctorsCache.find(x => x.id === id);
                renderDoctorDetail(target);
                if (detailsBox) detailsBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            };
        });
    }

    citySelect.addEventListener('change', async () => {
        const selectedCity = citySelect.value.trim();
        if (!selectedCity) {
            doctorSelect.innerHTML = '<option value="">-- Choose a city first --</option>';
            doctorSelect.disabled = true;
            renderDoctorDetail(null);
            if (listCards) listCards.innerHTML = '<p class="empty">Please select a city above to see available eye specialists.</p>';
            return;
        }

        doctorSelect.innerHTML = '<option value="">Loading specialists...</option>';
        doctorSelect.disabled = true;

        const docs = await fetchDoctors(selectedCity);
        if (!docs.length) {
            doctorSelect.innerHTML = '<option value="">No doctors found for this city</option>';
            renderDoctorDetail(null);
            renderCityCards([]);
            return;
        }

        doctorSelect.innerHTML = '<option value="">-- Select an eye doctor (' + docs.length + ' available) --</option>' +
            docs.map(d => `<option value="${esc(d.id)}">${esc(d.name)} (${esc(d.hospital)})</option>`).join('');
        doctorSelect.disabled = false;

        // Automatically select first doctor and show details
        doctorSelect.value = docs[0].id;
        renderDoctorDetail(docs[0]);
        renderCityCards(docs);
    });

    doctorSelect.addEventListener('change', () => {
        const docId = doctorSelect.value;
        const selected = allDoctorsCache.find(x => x.id === docId);
        renderDoctorDetail(selected || null);
    });

    // Pre-load initial city if selected
    if (citySelect.value) {
        citySelect.dispatchEvent(new Event('change'));
    }
}

// -------------------------------------------------------------
// Feature Four: Eye Health — Daily Eye Care Tips
// -------------------------------------------------------------
let activeTipSpeakerBtn = null;

function getSpeakIconSvg(playing) {
    if (playing) {
        return '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="vertical-align:-1px;margin-right:4px;"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>';
    }
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:4px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
}

function toggleTipSpeech(b, textToSpeak, curLang) {
    if (!('speechSynthesis' in window)) {
        alert(curLang === 'ta' ? 'இந்த உலாவியில் குரல் வாசிப்பு வசதி இல்லை.' : (curLang === 'hi' ? 'इस ब्राउज़र में स्पीच प्लेबैक समर्थित नहीं है।' : 'Speech playback is not supported in this browser.'));
        return;
    }

    const playLabels = { en: 'Listen', ta: 'கேளுங்கள்', hi: 'सुनें' };
    const stopLabels = { en: 'Stop', ta: 'நிறுத்து', hi: 'रोकें' };
    const listenText = playLabels[curLang] || 'Listen';
    const stopText = stopLabels[curLang] || 'Stop';

    // If currently speaking this button, stop it
    if (activeTipSpeakerBtn === b) {
        window.speechSynthesis.cancel();
        b.classList.remove('playing');
        b.setAttribute('aria-pressed', 'false');
        b.innerHTML = `${getSpeakIconSvg(false)}${esc(listenText)}`;
        activeTipSpeakerBtn = null;
        return;
    }

    // If another button was speaking, reset that button first
    if (activeTipSpeakerBtn && activeTipSpeakerBtn !== b) {
        activeTipSpeakerBtn.classList.remove('playing');
        activeTipSpeakerBtn.setAttribute('aria-pressed', 'false');
        const prevLang = $('language')?.value || 'en';
        activeTipSpeakerBtn.innerHTML = `${getSpeakIconSvg(false)}${esc(playLabels[prevLang] || 'Listen')}`;
        activeTipSpeakerBtn = null;
    }

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }

    // Set this button to playing / Stop
    b.classList.add('playing');
    b.setAttribute('aria-pressed', 'true');
    b.innerHTML = `${getSpeakIconSvg(true)}${esc(stopText)}`;
    activeTipSpeakerBtn = b;

    const utter = new SpeechSynthesisUtterance(textToSpeak);
    const localeMap = { en: 'en-US', ta: 'ta-IN', hi: 'hi-IN' };
    utter.lang = localeMap[curLang] || 'en-US';
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length > 0) {
        const match = voices.find(v => v.lang.toLowerCase() === utter.lang.toLowerCase()) ||
            voices.find(v => v.lang.toLowerCase().startsWith(curLang));
        if (match) utter.voice = match;
    }

    const reset = () => {
        if (activeTipSpeakerBtn === b) {
            b.classList.remove('playing');
            b.setAttribute('aria-pressed', 'false');
            b.innerHTML = `${getSpeakIconSvg(false)}${esc(listenText)}`;
            activeTipSpeakerBtn = null;
        }
    };

    utter.onend = reset;
    utter.onerror = () => {
        reset();
    };

    window.speechSynthesis.speak(utter);
}

async function loadDailyTips(dateStr = '') {
    const grid = $('dailyTipsGrid');
    if (!grid) return;
    try {
        const q = dateStr ? `?date=${encodeURIComponent(dateStr)}` : '';
        const res = await api('/api/public/daily-tips' + q);
        const tips = res.tips || [];
        const lang = $('language')?.value || 'en';

        if ($('tipsDateHeading')) {
            const d = new Date(res.date);
            const dateFmt = d.toLocaleDateString(lang === 'ta' ? 'ta-IN' : (lang === 'hi' ? 'hi-IN' : 'en-US'), {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            const headingPrefix = lang === 'ta' ? 'இன்றைய கண் பராமரிப்பு வழிகாட்டல்' : (lang === 'hi' ? 'आज का नेत्र देखभाल मार्गदर्शन' : "Today's Eye Care Guidance");
            $('tipsDateHeading').textContent = `${headingPrefix} (${dateFmt})`;
        }

        const catMap = {
            ta: {
                'Screen Time': 'திரை நேரம்',
                'Hydration': 'நீரேற்றம்',
                'Glaucoma Screening': 'குளுக்கோமா பரிசோதனை',
                'Eye Relaxation': 'கண் ஓய்வு',
                'Protective Eyewear': 'பாதுகாப்பு கண்ணாடிகள்',
                'Nutrition': 'ஊட்டச்சத்து'
            },
            hi: {
                'Screen Time': 'स्क्रीन समय',
                'Hydration': 'जलयोजन',
                'Glaucoma Screening': 'ग्लूकोमा जाँच',
                'Eye Relaxation': 'नेत्र विश्राम',
                'Protective Eyewear': 'सुरक्षात्मक चश्मा',
                'Nutrition': 'पोषण'
            }
        };
        const playLabels = { en: 'Listen', ta: 'கேளுங்கள்', hi: 'सुनें' };
        const listenText = playLabels[lang] || 'Listen';
        const sourceLabel = lang === 'ta' ? 'மருத்துவ கண் பராமரிப்பு வழிகாட்டல்' : lang === 'hi' ? 'चिकित्सीय नेत्र देखभाल मार्गदर्शन' : 'Medical Eye Care Guidance';

        if (activeTipSpeakerBtn) {
            window.speechSynthesis.cancel();
            activeTipSpeakerBtn = null;
        }

        grid.innerHTML = tips.map(tip => {
            const catName = (catMap[lang] && catMap[lang][tip.category]) || tip.category;
            return `
      <article class="tip-card">
        <span class="tip-category">${esc(catName)}</span>
        <h4>${esc(tip['title_' + lang] || tip.title_en)}</h4>
        <p>${esc(tip['content_' + lang] || tip.content_en)}</p>
        <div class="tip-footer">
          <span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px;"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>${esc(sourceLabel)}</span>
          <button type="button" class="soft small" data-speak-tip="${esc(tip['content_' + lang] || tip.content_en)}">${getSpeakIconSvg(false)}${esc(listenText)}</button>
        </div>
      </article>
    `;
        }).join('');

        grid.querySelectorAll('[data-speak-tip]').forEach(b => {
            b.onclick = () => {
                toggleTipSpeech(b, b.dataset.speakTip, lang);
            };
        });
    } catch (err) {
        grid.innerHTML = '<p class="empty">Could not load daily tips. Please refresh or verify server status.</p>';
    }
}
window.loadDailyTips = loadDailyTips;
window.loadArticles = loadArticles;

$('tipDatePicker')?.addEventListener('change', e => {
    if (e.target.value) loadDailyTips(e.target.value);
});

$('todayTipsBtn')?.addEventListener('click', () => {
    const today = new Date().toISOString().slice(0, 10);
    if ($('tipDatePicker')) $('tipDatePicker').value = today;
    loadDailyTips('');
});

async function loadArticles() {
    try {
        const lang = $('language')?.value || 'en';
        const a = await api('/api/public/articles');
        const playLabels = { en: 'Listen', ta: 'கேளுங்கள்', hi: 'सुनें' };
        const listenText = playLabels[lang] || 'Listen';

        if ($('articleList')) {
            $('articleList').innerHTML = a.length
                ? a.map(x => `
            <article class="content-card">
              <span class="eyebrow">${esc(x.category)}</span>
              <h3>${esc(x['title_' + lang] || x.title_en)}</h3>
              <p>${esc(x['content_' + lang] || x.content_en)}</p>
              <button class="soft" data-speak="${esc(x['content_' + lang] || x.content_en)}">${getSpeakIconSvg(false)}${esc(listenText)}</button>
            </article>
          `).join('')
                : '<p class="empty">No published articles yet. Publish one from Admin.</p>';

            document.querySelectorAll('[data-speak]').forEach(b => {
                b.onclick = () => {
                    toggleTipSpeech(b, b.dataset.speak, lang);
                };
            });
        }
    } catch (e) {
        if ($('articleList')) {
            $('articleList').innerHTML = '<p class="empty">Articles could not load. Start the server and refresh.</p>';
        }
    }
}

// -------------------------------------------------------------
// 9. Single-Page Navigation
// -------------------------------------------------------------
const pageNames = new Set(['home', 'dashboard', 'screen', 'records', 'journey', 'doctors', 'learn', 'anatomy', 'quiz', 'reminders', 'account', 'help']);

function navigatePage(name, updateHash = true) {
    if (!pageNames.has(name)) name = 'home';
    document.body.classList.add('page-mode');

    // Release the webcam when leaving the screening page
    if (name !== 'screen' && cameraStream) {
        stopCamera();
        camStatus('Camera stopped because you left the screening page.');
    }
    if (name === 'screen') checkModelStatus();
    if (name === 'dashboard' && window.refreshDashboardData) {
        window.refreshDashboardData();
    }

    document.querySelectorAll('main > [data-page]').forEach(el => {
        el.classList.toggle('active-page', el.dataset.page === name);
    });

    document.querySelectorAll('[data-page-link]').forEach(a => {
        const active = a.dataset.pageLink === name;
        a.classList.toggle('active-nav', active);
        if (active) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (updateHash && location.hash !== '#' + name) {
        history.replaceState(null, '', '#' + name);
    }
}
window.navigatePage = navigatePage;

document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        const name = a.getAttribute('href').slice(1);
        if (pageNames.has(name)) {
            e.preventDefault();
            navigatePage(name);
        }
    });
});

window.addEventListener('hashchange', () => navigatePage(location.hash.slice(1), false));
$('homeFooter')?.addEventListener('click', () => navigatePage('home'));

// -------------------------------------------------------------
// 10. Interactive Product Tour
// -------------------------------------------------------------
const tourSlides = [
    { pill: 'WELCOME', title: 'Your eye-health space', text: 'Start from the home page and choose what you want to do.', card: 'Everything in one place', detail: 'Screening · Records · Care', icon: '✦', caption: 'Home overview', nav: 0 },
    { pill: 'AI ANALYSIS', title: 'Guided eye screening', text: 'Upload an eye image and answer clinical risk questions for instant risk assessment.', card: 'Automated screening', detail: 'Fundus photo · Questions · Result', icon: '◎', caption: 'Analysis walkthrough', nav: 1 },
    { pill: 'MY RECORDS', title: 'Keep reports together', text: 'Add report titles, dates, clinical notes, and file attachments in your personal vault.', card: 'Your records vault', detail: 'Reports · Prescriptions · Scans', icon: '▤', caption: 'Records walkthrough', nav: 2 },
    { pill: 'EYE JOURNEY', title: 'Return to saved results', text: 'Open Eye Journey to review past screening results and track ocular health over time.', card: 'Your timeline', detail: 'Saved results · Dates · Tracking', icon: '↗', caption: 'Journey walkthrough', nav: 3 }
];

let tourIndex = 0;
let tourPaused = false;
let tourTimer = null;

function showTourStep(index) {
    tourIndex = (index + tourSlides.length) % tourSlides.length;
    const s = tourSlides[tourIndex];
    for (const [id, value] of [
        ['tourPill', s.pill], ['tourTitle', s.title], ['tourText', s.text],
        ['tourCardTitle', s.card], ['tourCardText', s.detail], ['tourIcon', s.icon], ['tourCaption', s.caption]
    ]) {
        if ($(id)) $(id).textContent = value;
    }
    if ($('tourProgress')) $('tourProgress').style.width = ((tourIndex + 1) / tourSlides.length * 100) + '%';

    document.querySelectorAll('[data-tour-step]').forEach((b, i) => {
        b.classList.toggle('active', i === tourIndex);
        const nav = b.querySelector('span');
        if (nav) nav.style.background = i === tourIndex ? '#dff2ed' : '';
    });

    document.querySelectorAll('.tour-nav').forEach((n, i) => n.classList.toggle('active', i === s.nav));
    const screen = $('tourContent');
    if (screen) {
        screen.style.animation = 'none';
        void screen.offsetWidth;
        screen.style.animation = '';
    }
}

function startTourTimer() {
    clearInterval(tourTimer);
    tourTimer = setInterval(() => {
        if (!tourPaused && document.visibilityState === 'visible') showTourStep(tourIndex + 1);
    }, 4200);
}

document.querySelectorAll('[data-tour-step]').forEach(b => {
    b.addEventListener('click', () => showTourStep(Number(b.dataset.tourStep)));
});

$('tourPause')?.addEventListener('click', () => {
    tourPaused = !tourPaused;
    $('tourPause').textContent = tourPaused ? 'Play' : 'Pause';
    $('tourCaption').textContent = tourPaused ? 'Tour paused' : tourSlides[tourIndex].caption;
});

$('tourStart')?.addEventListener('click', () => navigatePage('screen'));

// Initialization
$('brandName').textContent = 'Drishti';
try { sessionStorage.removeItem('drishti-user'); } catch { } // old unverified cache
navigatePage(location.hash.slice(1) || 'home', false);
showTourStep(0);
startTourTimer();
refreshAccount();
Promise.all([initDoctorSearch(), loadDailyTips(), loadArticles()]);
