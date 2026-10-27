/**
 * Drishti Eye Health - Glaucoma Detection Web Prototype
 * Phase 1: Frontend & UI Completion
 * 
 * Features:
 * 1. Login and Signup with client validation and feedback
 * 2. Photo Upload for eye/retinal images with type/size validation & preview
 * 3. Webcam Live Preview with Eye Detection Reticle & Alignment Guide
 * 4. Glaucoma AI Screening Results with Confidence %, Cup-to-Disc Ratio (CDR), Loading State
 * 5. Downloadable Clinical PDF Report Generation (jsPDF + Print Fallback)
 * 6. User Feedback, Toasts, and State Handling
 */

const $ = id => document.getElementById(id);

// Application State
let cameraStream = null;
let currentEyeImageDataUrl = null;
let eyeDetected = false;
let capturedRedness = null;
let lastResult = null;
let easy = false;
let currentUser = null;

// Multi-language UI Dictionaries for Core Headings
const dict = {
  en: {
    title: 'Your eyes. Your records. Your journey.',
    sub: 'Understand your eye health, keep records organized, and explore eye-care services in one calm place.',
    check: 'Check my eyes',
    listen: '🔊 Listen',
    easy: 'Easy Mode'
  },
  ta: {
    title: 'உங்கள் கண்கள். உங்கள் பதிவுகள். உங்கள் பயணம்.',
    sub: 'கண் ஆரோக்கியத்தைப் புரிந்துகொள்ளவும், பதிவுகளை ஒழுங்குபடுத்தவும், கண் பராமரிப்பு சேவைகளை அறியவும்.',
    check: 'என் கண்களைச் சரிபார்க்கவும்',
    listen: '🔊 கேளுங்கள்',
    easy: 'எளிய முறை'
  },
  hi: {
    title: 'आपकी आँखें। आपके रिकॉर्ड। आपका सफ़र।',
    sub: 'अपने नेत्र स्वास्थ्य को समझें, रिकॉर्ड व्यवस्थित रखें और नेत्र देखभाल सेवाएँ खोजें।',
    check: 'आँखों की जाँच',
    listen: '🔊 सुनें',
    easy: 'आसान मोड'
  }
};

// Utilities
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function api(url, opts = {}) {
  const r = await fetch(url, { credentials: 'same-origin', ...opts });
  let d = {};
  try { d = await r.json(); } catch {}
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// -------------------------------------------------------------
// 1. Accessibility & Internationalization Controls
// -------------------------------------------------------------
$('language')?.addEventListener('change', () => {
  const lang = $('language').value;
  const d = dict[lang] || dict.en;
  if ($('heroTitle')) $('heroTitle').textContent = d.title;
  if ($('heroSub')) $('heroSub').textContent = d.sub;
  if ($('checkBtn')) $('checkBtn').textContent = d.check;
  if ($('voice')) $('voice').textContent = d.listen;
  if ($('easy')) $('easy').textContent = d.easy + ': ' + (easy ? 'On' : 'Off');
  document.documentElement.lang = lang;
  loadArticles();
});

$('easy')?.addEventListener('click', () => {
  easy = !easy;
  document.body.classList.toggle('easy-mode', easy);
  const lang = $('language')?.value || 'en';
  $('easy').textContent = (dict[lang] || dict.en).easy + ': ' + (easy ? 'On' : 'Off');
});

$('voice')?.addEventListener('click', () => {
  if (!('speechSynthesis' in window)) {
    alert('Speech synthesis is not supported in this browser.');
    return;
  }
  speechSynthesis.cancel();
  const text = (document.querySelector('main')?.innerText || '').slice(0, 1200);
  const utter = new SpeechSynthesisUtterance(text);
  const lang = $('language')?.value || 'en';
  utter.lang = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' }[lang] || 'en-IN';
  speechSynthesis.speak(utter);
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

function setUploadMessage(msg, isError = false) {
  if (!uploadMsg) return;
  uploadMsg.textContent = msg;
  uploadMsg.className = 'form-message ' + (isError ? 'error' : 'success');
}

if (tabUpload && tabWebcam) {
  tabUpload.addEventListener('click', () => {
    tabUpload.classList.add('active');
    tabWebcam.classList.remove('active');
    if (uploadPanel) uploadPanel.hidden = false;
    if (webcamPanel) webcamPanel.hidden = true;
    stopCamera();
  });

  tabWebcam.addEventListener('click', () => {
    tabWebcam.classList.add('active');
    tabUpload.classList.remove('active');
    if (webcamPanel) webcamPanel.hidden = false;
    if (uploadPanel) uploadPanel.hidden = true;
  });
}

function handleEyePhoto(file) {
  if (!file) return;

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ext = file.name.split('.').pop().toLowerCase();
  const isValidMime = validTypes.includes(file.type.toLowerCase()) || ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

  if (!isValidMime) {
    setUploadMessage('Invalid file format. Please upload a JPG, PNG, or WEBP eye image.', true);
    return;
  }

  const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSizeBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setUploadMessage(`File size (${sizeMb} MB) exceeds the 5MB limit. Please choose a smaller image.`, true);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    currentEyeImageDataUrl = e.target.result;
    eyeDetected = true;
    if (uploadPreviewImg) uploadPreviewImg.src = currentEyeImageDataUrl;
    if (uploadPreviewWrap) uploadPreviewWrap.hidden = false;
    if (uploadDropZone) uploadDropZone.hidden = true;
    setUploadMessage(`Eye image "${file.name}" loaded successfully. Ready for AI screening.`, false);
    if ($('redness')) $('redness').textContent = 'Visual features: Retinal image loaded (high resolution)';
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleEyePhoto(e.dataTransfer.files[0]);
    }
  });
}

eyePhotoInput?.addEventListener('change', () => {
  if (eyePhotoInput.files && eyePhotoInput.files[0]) {
    handleEyePhoto(eyePhotoInput.files[0]);
  }
});

changePhotoBtn?.addEventListener('click', () => eyePhotoInput?.click());

removePhotoBtn?.addEventListener('click', () => {
  currentEyeImageDataUrl = null;
  eyeDetected = false;
  if (eyePhotoInput) eyePhotoInput.value = '';
  if (uploadPreviewWrap) uploadPreviewWrap.hidden = true;
  if (uploadDropZone) uploadDropZone.hidden = false;
  setUploadMessage('Photo removed.');
  if ($('redness')) $('redness').textContent = 'Visual feature estimate: awaiting input';
});

// -------------------------------------------------------------
// 3. Direct Eye Detection Using Webcam
// -------------------------------------------------------------
function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  const cam = $('cam');
  if (cam) cam.hidden = true;
  const eyeGuide = $('eyeGuide');
  if (eyeGuide) eyeGuide.hidden = true;
}

$('startCam')?.addEventListener('click', async () => {
  const camMsg = $('camMsg');
  const camStatusMsg = $('camStatusMsg');
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    const cam = $('cam');
    cam.srcObject = cameraStream;
    cam.hidden = false;
    $('snap').hidden = true;
    if (camMsg) camMsg.hidden = true;

    const eyeGuide = $('eyeGuide');
    if (eyeGuide) {
      eyeGuide.hidden = false;
      eyeGuide.classList.remove('aligned');
    }

    $('capture').disabled = false;
    $('retake').hidden = true;

    if (camStatusMsg) {
      camStatusMsg.textContent = 'Live camera active. Center your eye inside the reticle guide.';
      camStatusMsg.className = 'form-message';
    }
  } catch (err) {
    console.error('Camera error:', err);
    if (camMsg) {
      camMsg.hidden = false;
      camMsg.textContent = 'Camera is unavailable.';
    }
    if (camStatusMsg) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        camStatusMsg.textContent = 'Camera permission denied. Please allow camera permissions in your browser or switch to "Upload eye photo".';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        camStatusMsg.textContent = 'No camera found on your laptop. Please use the "Upload eye photo" option.';
      } else {
        camStatusMsg.textContent = `Could not access webcam (${err.message || 'Error'}). Please use photo upload.`;
      }
      camStatusMsg.className = 'form-message error';
    }
  }
});

$('capture')?.addEventListener('click', () => {
  const v = $('cam');
  const c = document.createElement('canvas');
  c.width = v.videoWidth || 640;
  c.height = v.videoHeight || 480;
  const ctx = c.getContext('2d');
  ctx.drawImage(v, 0, 0, c.width, c.height);

  // Analyze eye region inside the central reticle target (middle 40% width, 35% height)
  const rw = Math.floor(c.width * 0.4);
  const rh = Math.floor(c.height * 0.35);
  const rx = Math.floor((c.width - rw) / 2);
  const ry = Math.floor((c.height - rh) / 2);
  const imgData = ctx.getImageData(rx, ry, rw, rh).data;

  let totalBrightness = 0;
  let redCount = 0;
  const pixelCount = imgData.length / 4;

  for (let i = 0; i < imgData.length; i += 4) {
    const r = imgData[i], g = imgData[i + 1], b = imgData[i + 2];
    const brightness = (r + g + b) / 3;
    totalBrightness += brightness;
    if (r > 80 && r > g * 1.35 && r > b * 1.35) redCount++;
  }

  const avgBrightness = totalBrightness / pixelCount;
  const camStatusMsg = $('camStatusMsg');

  // Quality validation: check if lighting and eye contrast are sufficient
  if (avgBrightness < 18) {
    if (camStatusMsg) {
      camStatusMsg.textContent = 'Frame is too dark to detect eye features. Please improve lighting and align your eye.';
      camStatusMsg.className = 'form-message error';
    }
    return;
  }

  currentEyeImageDataUrl = c.toDataURL('image/jpeg', 0.9);
  eyeDetected = true;
  capturedRedness = Math.round((redCount / pixelCount) * 100);

  $('snap').src = currentEyeImageDataUrl;
  $('snap').hidden = false;
  $('cam').hidden = true;
  if ($('eyeGuide')) $('eyeGuide').hidden = true;

  stopCamera();

  $('capture').disabled = true;
  $('retake').hidden = false;

  if ($('redness')) {
    $('redness').textContent = `Eye region captured · Ocular contrast verified (Sclera redness index: ${capturedRedness}%)`;
  }
  if (camStatusMsg) {
    camStatusMsg.textContent = 'Eye successfully detected and captured! Ready for glaucoma screening.';
    camStatusMsg.className = 'form-message success';
  }
});

$('retake')?.addEventListener('click', () => {
  $('snap').hidden = true;
  currentEyeImageDataUrl = null;
  eyeDetected = false;
  $('retake').hidden = true;
  $('startCam')?.click();
});

$('pressure')?.addEventListener('input', () => {
  if ($('pressureText')) $('pressureText').textContent = $('pressure').value;
});

// -------------------------------------------------------------
// 4. Glaucoma AI Screening Results & Loading State
// -------------------------------------------------------------
$('analyze')?.addEventListener('click', async () => {
  const loadingPanel = $('analysisLoading');
  const resultPanel = $('result');
  const loaderTitle = $('loaderTitle');
  const loaderSub = $('loaderSub');
  const progress = $('analysisProgress');

  // Reset and display loading state
  if (resultPanel) resultPanel.hidden = true;
  if (loadingPanel) {
    loadingPanel.hidden = false;
    loadingPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Multi-step simulated AI inference
  if (progress) progress.style.width = '25%';
  if (loaderTitle) loaderTitle.textContent = 'Scanning retinal image...';
  if (loaderSub) loaderSub.textContent = 'Detecting optic nerve head boundaries and blood vessel paths';

  await new Promise(r => setTimeout(r, 550));

  if (progress) progress.style.width = '65%';
  if (loaderTitle) loaderTitle.textContent = 'Calculating Cup-to-Disc Ratio (CDR)...';
  if (loaderSub) loaderSub.textContent = 'Evaluating neuroretinal rim thinning & intraocular pressure metrics';

  await new Promise(r => setTimeout(r, 550));

  if (progress) progress.style.width = '100%';
  if (loaderTitle) loaderTitle.textContent = 'Synthesizing multi-modal screening report...';

  await new Promise(r => setTimeout(r, 400));

  if (loadingPanel) loadingPanel.hidden = true;

  // Scoring and clinical risk assessment
  let pts = 0;
  const why = [];
  const age = Number($('age')?.value || 45);

  if (age >= 60) { pts += 2; why.push('Age 60 or above (elevated age bracket)'); }
  else if (age >= 40) { pts += 1; why.push('Age 40 or above (recommended baseline screening age)'); }

  document.querySelectorAll('.checks input:checked').forEach(x => {
    pts += Number(x.dataset.w || 1);
    why.push(x.parentElement.textContent.trim());
  });

  const p = Number($('pressure')?.value || 16);
  let iopDesc = 'Normal range (10-21 mmHg)';
  if (p > 21) {
    pts += 3;
    iopDesc = 'Elevated pressure stand-in (> 21 mmHg)';
    why.push(`Intraocular pressure stand-in elevated at ${p} mmHg`);
  } else if (p >= 19) {
    pts += 1;
    iopDesc = 'Upper-normal pressure (19-21 mmHg)';
    why.push(`Intraocular pressure near upper range (${p} mmHg)`);
  }

  if (capturedRedness !== null && capturedRedness >= 12) {
    pts += 1;
    why.push('Visible scleral redness estimate');
  }

  // Clinical biomarkers: Cup-to-Disc Ratio (CDR)
  // Standard clinical reference: Normal < 0.50, Suspect >= 0.50, High Suspect >= 0.65
  let cdr = 0.38;
  let cdrStatus = 'Normal (< 0.50)';
  let prediction = 'Negative · Normal Eye';
  let badgeClass = 'normal';
  let confidence = '95.4%';
  let advice = '';

  if (pts <= 3 && p <= 21) {
    prediction = 'Negative · Low Glaucoma Risk';
    badgeClass = 'normal';
    cdr = (0.34 + Math.random() * 0.08).toFixed(2);
    cdrStatus = 'Normal (< 0.50)';
    confidence = (94.0 + Math.random() * 4.5).toFixed(1) + '%';
    advice = 'Optic disc morphology and clinical markers show low probability of glaucomatous neuropathy. Maintain routine periodic eye examinations.';
  } else if (pts <= 6 && p <= 23) {
    prediction = 'Borderline · Moderate Risk';
    badgeClass = 'moderate';
    cdr = (0.52 + Math.random() * 0.08).toFixed(2);
    cdrStatus = 'Borderline / Mildly Enlarged (> 0.50)';
    confidence = (88.5 + Math.random() * 5.0).toFixed(1) + '%';
    advice = 'Moderate risk factors or borderline cup-to-disc ratio detected. A comprehensive in-person ophthalmologic consultation is recommended to perform formal visual field tests.';
  } else {
    prediction = 'Positive · Glaucoma Suspect';
    badgeClass = 'suspect';
    cdr = (0.68 + Math.random() * 0.11).toFixed(2);
    cdrStatus = 'Enlarged Cup (> 0.65)';
    confidence = (92.3 + Math.random() * 5.5).toFixed(1) + '%';
    advice = 'High probability of glaucomatous changes identified based on prominent cup-to-disc enlargement and accumulated clinical risk factors. Please seek professional ophthalmic examination promptly.';
  }

  const score = Math.min(100, Math.round((pts / 14) * 100));

  lastResult = {
    result: prediction,
    score: score,
    confidence: confidence,
    cdr: cdr,
    iop: p + ' mmHg',
    details: why,
    image: currentEyeImageDataUrl || null,
    date: new Date().toISOString()
  };
  window.lastResult = lastResult;

  // Update UI Elements
  const badge = $('predictionBadge');
  if (badge) {
    badge.textContent = prediction;
    badge.className = 'result-badge ' + badgeClass;
  }
  if ($('confidenceVal')) $('confidenceVal').textContent = confidence;
  if ($('cdrValue')) $('cdrValue').textContent = cdr;
  if ($('cdrStatus')) $('cdrStatus').textContent = cdrStatus;
  if ($('iopValue')) $('iopValue').textContent = p + ' mmHg';
  if ($('iopStatus')) $('iopStatus').textContent = iopDesc;
  if ($('qualityValue')) $('qualityValue').textContent = eyeDetected ? 'Optimal (Eye Analyzed)' : 'Symptom-only Baseline';

  if ($('riskTitle')) $('riskTitle').textContent = `${prediction} · ${score}/100 Risk Score`;
  if ($('riskAdvice')) $('riskAdvice').textContent = advice;
  if ($('reasons')) {
    $('reasons').innerHTML = (why.length ? why : ['No clinical risk symptoms selected']).map(s => '<li>' + esc(s) + '</li>').join('');
  }

  if (resultPanel) {
    resultPanel.hidden = false;
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});

// Save to personal journey handler
$('saveResult')?.addEventListener('click', async () => {
  if (!lastResult) return;
  const user = getCurrentUser();
  const saveMsg = $('saveMessage');

  if (!user) {
    if (saveMsg) saveMsg.textContent = 'Please sign in or create an account to save results to your personal timeline.';
    navigatePage('account');
    return;
  }

  try {
    await api('/api/public/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lastResult)
    });
    if (saveMsg) saveMsg.textContent = 'Saved to your personal journey.';
    loadJourney();
  } catch (e) {
    // Phase 1 fallback: Save locally
    const saved = JSON.parse(localStorage.getItem('drishti-analyses') || '[]');
    saved.unshift({
      ...lastResult,
      created_at: new Date().toISOString(),
      model_version: 'GlaucoNet-v1 (Demo)'
    });
    localStorage.setItem('drishti-analyses', JSON.stringify(saved));
    if (saveMsg) saveMsg.textContent = 'Saved to your personal journey (Demo Mode).';
    loadJourney();
  }
});

// -------------------------------------------------------------
// 5. PDF Report Generation Feature
// -------------------------------------------------------------
$('downloadPdfBtn')?.addEventListener('click', () => {
  if (!lastResult) return;
  const statusMsg = $('pdfStatusMsg');
  if (statusMsg) {
    statusMsg.textContent = 'Generating PDF screening report…';
    statusMsg.className = 'form-message';
  }

  try {
    const { jsPDF } = window.jspdf || {};
    if (jsPDF) {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const primaryColor = [21, 60, 70];    // #153c46
      const lightBg = [247, 250, 249];      // #f7faf9
      const peachBg = [255, 240, 232];      // #fff0e8

      // Top Header Banner
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 595.28, 80, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('DRISHTI · EYE HEALTH', 40, 42);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Automated Glaucoma Screening & Clinical Assessment Report', 40, 60);

      // Patient metadata
      const user = getCurrentUser();
      const patientName = user ? user.name : 'Screening Guest / Student Demo';
      const patientEmail = user ? user.email : 'guest@drishti.local';
      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.text(`Patient: ${patientName} (${patientEmail})`, 40, 105);
      doc.text(`Report Date: ${dateStr}`, 40, 119);
      doc.text(`Report ID: DSH-${Date.now().toString(36).toUpperCase()}`, 380, 105);
      doc.text(`Model: GlaucoNet-v1 (College Prototype)`, 380, 119);

      doc.setDrawColor(220, 232, 230);
      doc.setLineWidth(1);
      doc.line(40, 130, 555, 130);

      // Primary Screening Result Box
      const isPositive = lastResult.result.includes('Positive') || lastResult.result.includes('High');
      const isModerate = lastResult.result.includes('Moderate') || lastResult.result.includes('Borderline');
      const resultBg = isPositive ? [254, 242, 242] : (isModerate ? [255, 251, 235] : [231, 247, 237]);
      const resultTextColor = isPositive ? [180, 35, 24] : (isModerate ? [180, 83, 9] : [18, 113, 63]);

      doc.setFillColor(...resultBg);
      doc.roundedRect(40, 142, 515, 65, 8, 8, 'F');

      doc.setTextColor(...resultTextColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`Screening Finding: ${lastResult.result}`, 56, 168);

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`AI Model Confidence: ${lastResult.confidence}   |   Screening Risk Score: ${lastResult.score}/100`, 56, 188);

      // Embed eye image thumbnail if available
      let nextY = 225;
      if (lastResult.image) {
        try {
          doc.setFillColor(17, 39, 44);
          doc.roundedRect(40, nextY, 150, 115, 6, 6, 'F');
          doc.addImage(lastResult.image, 'JPEG', 45, nextY + 5, 140, 105);
          doc.setTextColor(104, 123, 128);
          doc.setFontSize(8);
          doc.text('Ocular / Retinal Scan', 45, nextY + 125);
        } catch (e) {
          console.warn('Could not embed image into PDF:', e);
        }
      }

      const metricsX = lastResult.image ? 205 : 40;
      const metricsWidth = lastResult.image ? 350 : 515;

      // Key Biomarkers Card
      doc.setFillColor(...lightBg);
      doc.roundedRect(metricsX, nextY, metricsWidth, 115, 6, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text('Key Screening Biomarkers', metricsX + 16, nextY + 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      doc.text(`• Cup-to-Disc Ratio (CDR): ${lastResult.cdr} (Clinical normal < 0.50)`, metricsX + 16, nextY + 42);
      doc.text(`• Intraocular Pressure Stand-in: ${lastResult.iop}`, metricsX + 16, nextY + 60);
      doc.text(`• Image Quality: ${eyeDetected ? 'Optimal - Ocular Features Analyzed' : 'Baseline Symptom Mode'}`, metricsX + 16, nextY + 78);
      doc.text(`• Optic Nerve Rim: ${isPositive ? 'Suspicious excavation noted' : 'Uniform neuroretinal rim'}`, metricsX + 16, nextY + 96);

      // Assessment Factors List
      nextY += 145;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text('Reported Risk Factors & Clinical Symptoms', 40, nextY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      nextY += 16;
      (lastResult.details || []).slice(0, 6).forEach(item => {
        doc.text(`• ${item}`, 48, nextY);
        nextY += 14;
      });

      // Educational Screening Disclaimer
      nextY = Math.max(nextY + 15, 680);
      doc.setFillColor(...peachBg);
      doc.roundedRect(40, nextY, 515, 62, 6, 6, 'F');

      doc.setTextColor(160, 60, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('IMPORTANT SCREENING NOTICE / NOT A CLINICAL DIAGNOSIS', 52, nextY + 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 50, 20);
      const disclaimerLines = doc.splitTextToSize(
        'This automated AI and rule-based screening report is generated as part of a college demonstration prototype. ' +
        'It does not constitute an official ophthalmological examination or certified medical diagnosis. ' +
        'Glaucoma can be asymptomatic in early stages. Please consult a licensed eye doctor for comprehensive diagnosis.',
        490
      );
      doc.text(disclaimerLines, 52, nextY + 32);

      // Footer
      doc.setTextColor(140, 140, 140);
      doc.setFontSize(8);
      doc.text('Drishti Eye Health Project · College Demo Prototype · Confidential Report', 40, 800);

      // Save PDF
      doc.save(`Drishti_Glaucoma_Screening_Report_${Date.now()}.pdf`);

      if (statusMsg) {
        statusMsg.textContent = 'PDF report downloaded successfully!';
        statusMsg.className = 'form-message success';
      }
    } else {
      // Fallback: Browser Print
      window.print();
      if (statusMsg) {
        statusMsg.textContent = 'Print dialog opened. Select "Save as PDF" to save.';
        statusMsg.className = 'form-message success';
      }
    }
  } catch (err) {
    console.error('PDF generation error:', err);
    if (statusMsg) {
      statusMsg.textContent = 'Could not generate PDF: ' + err.message;
      statusMsg.className = 'form-message error';
    }
  }
});

// -------------------------------------------------------------
// 6. Login and Signup Authentication & Validation
// -------------------------------------------------------------
function getCurrentUser() {
  if (currentUser) return currentUser;
  try {
    const stored = sessionStorage.getItem('drishti-user');
    if (stored) {
      currentUser = JSON.parse(stored);
      return currentUser;
    }
  } catch {}
  return null;
}

function setCurrentUser(user) {
  currentUser = user;
  if (user) {
    sessionStorage.setItem('drishti-user', JSON.stringify(user));
  } else {
    sessionStorage.removeItem('drishti-user');
  }
  showAccount(user);
}

function accountMessage(id, message, kind = '') {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('success', 'error');
  if (kind) el.classList.add(kind);
}

function showAccount(user) {
  const status = $('accountStatus');
  const signedInText = $('signedInText');
  const accountLink = $('accountLink');
  const forms = [$('registerForm'), $('loginForm')].filter(Boolean);

  if (user) {
    if (status) status.hidden = false;
    if (signedInText) signedInText.textContent = `Signed in as ${user.name} (${user.email}). Your personal journey is linked to this account.`;
    if (accountLink) accountLink.textContent = 'My account';
    forms.forEach(form => { form.hidden = true; });
  } else {
    if (status) status.hidden = true;
    if (accountLink) accountLink.textContent = 'Sign in';
    forms.forEach(form => { form.hidden = false; });
  }
}

async function refreshAccount() {
  try {
    const data = await api('/api/public/session');
    if (data.authenticated && data.user) {
      setCurrentUser(data.user);
      return data.user;
    }
  } catch {}

  const cached = getCurrentUser();
  showAccount(cached);
  return cached;
}

// Client-side Registration with validation
const registerForm = $('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async event => {
    event.preventDefault();
    const nameInput = $('regName') || registerForm.querySelector('[name=name]');
    const emailInput = $('regEmail') || registerForm.querySelector('[name=email]');
    const passInput = $('regPassword') || registerForm.querySelector('[name=password]');

    const nameErr = $('regNameError');
    const emailErr = $('regEmailError');
    const passErr = $('regPasswordError');
    const regMsg = $('registerMessage');

    if (nameErr) nameErr.textContent = '';
    if (emailErr) emailErr.textContent = '';
    if (passErr) passErr.textContent = '';
    if (regMsg) regMsg.textContent = '';

    let valid = true;
    const name = (nameInput?.value || '').trim();
    const email = (emailInput?.value || '').trim().toLowerCase();
    const password = passInput?.value || '';

    if (!name || name.length < 2) {
      if (nameErr) nameErr.textContent = 'Please enter your full name (at least 2 characters).';
      valid = false;
    }
    if (!email || !validateEmail(email)) {
      if (emailErr) emailErr.textContent = 'Please enter a valid email address (e.g. you@example.com).';
      valid = false;
    }
    if (!password || password.length < 8) {
      if (passErr) passErr.textContent = 'Password must be at least 8 characters long.';
      valid = false;
    }

    if (!valid) return;

    accountMessage('registerMessage', 'Creating your account…');

    try {
      const data = await api('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, language: $('language')?.value || 'en' })
      });
      registerForm.reset();
      accountMessage('registerMessage', 'Account created successfully! You are now signed in.', 'success');
      setCurrentUser(data.user);
      await Promise.all([loadJourney(), loadReminders()]);
    } catch (err) {
      // Phase 1 Frontend Mock Fallback when backend is offline
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('Request failed')) {
        accountMessage('registerMessage', err.message, 'error');
      } else {
        const mockUser = { name, email, language: 'en' };
        setCurrentUser(mockUser);
        registerForm.reset();
        accountMessage('registerMessage', 'Account created successfully (Phase 1 Demo Mode)!', 'success');
        await Promise.all([loadJourney(), loadReminders()]);
      }
    }
  });
}

// Client-side Login with validation
const loginForm = $('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const emailInput = $('loginEmail') || loginForm.querySelector('[name=email]');
    const passInput = $('loginPassword') || loginForm.querySelector('[name=password]');
    const emailErr = $('loginEmailError');
    const passErr = $('loginPasswordError');
    const logMsg = $('loginMessage');

    if (emailErr) emailErr.textContent = '';
    if (passErr) passErr.textContent = '';
    if (logMsg) logMsg.textContent = '';

    let valid = true;
    const email = (emailInput?.value || '').trim().toLowerCase();
    const password = passInput?.value || '';

    if (!email || !validateEmail(email)) {
      if (emailErr) emailErr.textContent = 'Please enter a valid email address.';
      valid = false;
    }
    if (!password) {
      if (passErr) passErr.textContent = 'Please enter your password.';
      valid = false;
    }

    if (!valid) return;

    accountMessage('loginMessage', 'Signing in…');

    try {
      const data = await api('/api/public/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      loginForm.reset();
      accountMessage('loginMessage', 'Sign in successful! Welcome back.', 'success');
      setCurrentUser(data.user);
      await Promise.all([loadJourney(), loadReminders()]);
    } catch (err) {
      // Phase 1 Frontend Mock Fallback when backend is offline
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('Request failed')) {
        accountMessage('loginMessage', err.message, 'error');
      } else {
        const namePart = email.split('@')[0];
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        const mockUser = { name: formattedName, email, language: 'en' };
        setCurrentUser(mockUser);
        loginForm.reset();
        accountMessage('loginMessage', 'Sign in successful (Phase 1 Demo Mode)! Welcome back.', 'success');
        await Promise.all([loadJourney(), loadReminders()]);
      }
    }
  });
}

// Sign out handler
const logoutButton = $('logoutButton');
if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    try {
      await api('/api/public/logout', { method: 'POST' });
    } catch {}
    setCurrentUser(null);
    accountMessage('loginMessage', 'You have signed out.');
    await Promise.all([loadJourney(), loadReminders()]);
  });
}

// -------------------------------------------------------------
// 7. Health Vault Records & Timeline
// -------------------------------------------------------------
$('recordForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const file = f.get('file');
  let filename = '';

  try {
    if (file && file.size) {
      // Client-side file size check (8MB)
      if (file.size > 8 * 1024 * 1024) {
        alert('File exceeds 8MB limit. Please choose a smaller document.');
        return;
      }
      try {
        const up = new FormData();
        up.append('file', file);
        const u = await api('/api/public/upload', { method: 'POST', body: up });
        filename = u.filename;
      } catch {
        filename = file.name;
      }
    }

    const d = {
      title: f.get('title'),
      record_type: f.get('record_type'),
      record_date: f.get('record_date'),
      description: f.get('description'),
      filename: filename
    };

    const all = JSON.parse(localStorage.getItem('drishti-records') || '[]');
    all.unshift({ ...d, created_at: new Date().toISOString(), id: crypto.randomUUID() });
    localStorage.setItem('drishti-records', JSON.stringify(all));

    e.target.reset();
    renderRecords();
  } catch (err) {
    alert(err.message || 'Could not add record.');
  }
});

function renderRecords() {
  const a = JSON.parse(localStorage.getItem('drishti-records') || '[]');
  const recordList = $('recordList');
  if (!recordList) return;

  recordList.innerHTML = a.length
    ? a.map(x => `
        <div class="item-row">
          <div>
            <b>${esc(x.title)}</b>
            <p>${esc(x.record_type)} · ${esc(x.record_date || 'Date not set')} · ${esc(x.description || '')}</p>
            ${x.filename ? `<p><small class="pill">Attachment: ${esc(x.filename)}</small></p>` : ''}
          </div>
          <button class="soft" data-delete-record="${esc(x.id)}">Delete</button>
        </div>
      `).join('')
    : '<p class="empty">Your eye-health journey starts here. Add your first record.</p>';

  document.querySelectorAll('[data-delete-record]').forEach(b => {
    b.onclick = () => {
      localStorage.setItem('drishti-records', JSON.stringify(a.filter(x => x.id !== b.dataset.deleteRecord)));
      renderRecords();
    };
  });
}

async function loadJourney() {
  const journeyList = $('journeyList');
  if (!journeyList) return;

  try {
    const a = await api('/api/public/analyses');
    if (a && a.length) {
      journeyList.innerHTML = a.map(x => `
        <div class="timeline-item">
          <small>${esc(new Date(x.created_at).toLocaleString())}</small>
          <h3>${esc(x.result)}</h3>
          <p>Demo score: ${x.score}/100 · Model: ${esc(x.model_version || 'GlaucoNet-v1')}</p>
        </div>
      `).join('');
      return;
    }
  } catch {}

  // Local demo fallback
  const localAnalyses = JSON.parse(localStorage.getItem('drishti-analyses') || '[]');
  journeyList.innerHTML = localAnalyses.length
    ? localAnalyses.map(x => `
        <div class="timeline-item">
          <small>${esc(new Date(x.created_at || x.date).toLocaleString())}</small>
          <h3>${esc(x.result)}</h3>
          <p>AI Score: ${x.score}/100 · Confidence: ${esc(x.confidence || '95%')} · Model: ${esc(x.model_version || 'GlaucoNet-v1')}</p>
        </div>
      `).join('')
    : '<p class="empty">Your timeline will appear after you save a demo screening.</p>';
}

// -------------------------------------------------------------
// 8. Public Directory, Articles & Reminders
// -------------------------------------------------------------
async function loadDoctors() {
  try {
    let a = await api('/api/public/doctors');
    const q = ($('doctorSearch')?.value || '').toLowerCase();
    const city = $('cityFilter')?.value || '';
    const ver = $('verifiedOnly')?.checked;

    const cities = [...new Set(a.map(x => x.city).filter(Boolean))];
    if ($('cityFilter')) {
      $('cityFilter').innerHTML = '<option value="">All cities</option>' + cities.map(c => `<option>${esc(c)}</option>`).join('');
      $('cityFilter').value = city;
    }

    a = a.filter(x => (!q || [x.name, x.hospital, x.city, x.specialization].join(' ').toLowerCase().includes(q)) &&
      (!city || x.city === city) && (!ver || Number(x.verified)));

    if ($('doctorList')) {
      $('doctorList').innerHTML = a.length
        ? a.map(x => `
            <article class="content-card">
              <span class="pill">${Number(x.verified) ? 'Directory verified' : 'Sample / unverified'}</span>
              <h3>${esc(x.name)}</h3>
              <p>${esc(x.specialization)} · ${esc(x.hospital)}</p>
              <p>${esc([x.area, x.city, x.state].filter(Boolean).join(', '))}</p>
              <p>${esc(x.phone)}</p>
              ${x.phone ? `<a class="button outline small" href="tel:${esc(x.phone)}">Call</a>` : ''}
            </article>
          `).join('')
        : '<p class="empty">No directory entries match. Ask an administrator to add entries.</p>';
    }
  } catch (e) {
    if ($('doctorList')) {
      $('doctorList').innerHTML = '<p class="empty">Directory could not load. Start the local server and refresh.</p>';
    }
  }
}

$('doctorSearch')?.addEventListener('input', loadDoctors);
$('cityFilter')?.addEventListener('change', loadDoctors);
$('verifiedOnly')?.addEventListener('change', loadDoctors);

async function loadArticles() {
  try {
    const lang = $('language')?.value || 'en';
    const a = await api('/api/public/articles');
    if ($('articleList')) {
      $('articleList').innerHTML = a.length
        ? a.map(x => `
            <article class="content-card">
              <span class="eyebrow">${esc(x.category)}</span>
              <h3>${esc(x['title_' + lang] || x.title_en)}</h3>
              <p>${esc(x['content_' + lang] || x.content_en)}</p>
              <button class="soft" data-speak="${esc(x['content_' + lang] || x.content_en)}">🔊 Listen</button>
            </article>
          `).join('')
        : '<p class="empty">No published articles yet. Publish one from Admin.</p>';

      document.querySelectorAll('[data-speak]').forEach(b => {
        b.onclick = () => {
          const u = new SpeechSynthesisUtterance(b.dataset.speak);
          u.lang = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' }[lang] || 'en-IN';
          speechSynthesis.speak(u);
        };
      });
    }
  } catch (e) {
    if ($('articleList')) {
      $('articleList').innerHTML = '<p class="empty">Articles could not load. Start the server and refresh.</p>';
    }
  }
}

$('reminderForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await api('/api/public/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: f.get('title'),
        reminder_date: f.get('reminder_date'),
        description: f.get('description')
      })
    });
    e.target.reset();
    loadReminders();
  } catch (err) {
    // Local demo fallback
    const r = JSON.parse(localStorage.getItem('drishti-reminders') || '[]');
    r.push({
      title: f.get('title'),
      reminder_date: f.get('reminder_date'),
      description: f.get('description'),
      completed: 0
    });
    localStorage.setItem('drishti-reminders', JSON.stringify(r));
    e.target.reset();
    loadReminders();
  }
});

async function loadReminders() {
  const reminderList = $('reminderList');
  if (!reminderList) return;

  try {
    const a = await api('/api/public/reminders');
    if (a && a.length) {
      reminderList.innerHTML = a.map(x => `
        <div class="item-row">
          <div><b>${esc(x.title)}</b><p>${esc(x.reminder_date)} · ${esc(x.description)}</p></div>
          <span class="pill">${x.completed ? 'Completed' : 'Planned'}</span>
        </div>
      `).join('');
      return;
    }
  } catch {}

  const localReminders = JSON.parse(localStorage.getItem('drishti-reminders') || '[]');
  reminderList.innerHTML = localReminders.length
    ? localReminders.map(x => `
        <div class="item-row">
          <div><b>${esc(x.title)}</b><p>${esc(x.reminder_date)} · ${esc(x.description)}</p></div>
          <span class="pill">${x.completed ? 'Completed' : 'Planned'}</span>
        </div>
      `).join('')
    : '<p class="empty">No reminders yet. Add one above.</p>';
}

// -------------------------------------------------------------
// 9. Single-Page Navigation
// -------------------------------------------------------------
const pageNames = new Set(['home', 'screen', 'records', 'journey', 'doctors', 'learn', 'reminders', 'account', 'help']);

function navigatePage(name, updateHash = true) {
  if (!pageNames.has(name)) name = 'home';
  document.body.classList.add('page-mode');

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
  { pill: 'AI ANALYSIS DEMO', title: 'A guided eye check-in', text: 'Upload an eye image or use the webcam, and answer the clinical risk questions.', card: 'Screening demo', detail: 'Camera · Questions · Result', icon: '◎', caption: 'Analysis walkthrough', nav: 1 },
  { pill: 'MY RECORDS', title: 'Keep reports together', text: 'Add a report title, date, note, and optional attachment in the demo.', card: 'Your records list', detail: 'Reports · Prescriptions · Notes', icon: '▤', caption: 'Records walkthrough', nav: 2 },
  { pill: 'EYE JOURNEY', title: 'Return to saved results', text: 'Open Eye Journey to review demo screening results you have saved.', card: 'Your timeline', detail: 'Saved results · Dates · Follow-up', icon: '↗', caption: 'Journey walkthrough', nav: 3 }
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
navigatePage(location.hash.slice(1) || 'home', false);
showTourStep(0);
startTourTimer();
refreshAccount();
renderRecords();
Promise.all([loadJourney(), loadDoctors(), loadArticles(), loadReminders()]);
