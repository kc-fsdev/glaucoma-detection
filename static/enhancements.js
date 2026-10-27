/* DRISHTI — Smart Personal Eye Health Platform
   Enhancements: Multi-Lingual Localization (EN, TA, HI), Strict 3-State Toggle Manager,
   All 7 Features (Dashboard, Voice Assistant, Reminders, Anatomy, Appointments, Quiz, Accessibility),
   and Preservation of Records, Journey, Screening, and Auth. */

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const lang = () => $('language')?.value || localStorage.getItem('drishti-language') || 'en';
  const t = (en, ta, hi) => lang() === 'ta' ? ta : (lang() === 'hi' ? hi : en);
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // --------------------------------------------------------------------------
  // PART 3: Multi-lingual Localization Dictionary (EN, TA, HI)
  // --------------------------------------------------------------------------
  const translations = {
    ta: {
      'Dashboard': 'டாஷ்போர்டு',
      'AI Analysis': 'AI பகுப்பாய்வு',
      'My Records': 'எனது பதிவுகள்',
      'Eye Journey': 'கண் பயணம்',
      'Find Doctor': 'மருத்துவரைத் தேடு',
      'Eye Health': 'கண் ஆரோக்கியம்',
      'Eye Anatomy': 'கண் உடற்கூறியல்',
      'Eye Quiz': 'கண் வினாடி வினா',
      'Accessibility': 'அணுகல்தன்மை',
      'Sign in': 'உள்நுழை',
      'My account': 'எனது கணக்கு',
      'Sign out': 'வெளியேறு',
      'Listen': 'கேளுங்கள்',
      'Stop': 'நிறுத்து',
      'Back to Home': 'முகப்புக்குத் திரும்பு',
      'Back to Home ↑': 'முகப்புக்குத் திரும்பு ↑',

      // Dashboard
      'My Eye Health Dashboard': 'எனது கண் ஆரோக்கிய டாஷ்போர்டு',
      'A unified view of your latest glaucoma screening, medical records, appointment requests, and ocular reminders.': 'உங்கள் பரிசோதனை பயணம், மருத்துவப் பதிவுகள், சந்திப்பு கோரிக்கைகள் மற்றும் நினைவூட்டல்களின் ஒருங்கிணைந்த பார்வை.',
      'Welcome to your Eye Health Space': 'உங்கள் கண் ஆரோக்கிய இடத்திற்கு வரவேற்கிறோம்',
      'New AI Screening': 'புதிய AI பரிசோதனை',
      'Refresh Data': 'தரவைப் புதுப்பி',
      'Latest AI Result': 'சமீபத்திய AI முடிவு',
      'Glaucoma Risk Score': 'குளுக்கோமா அபாய மதிப்பெண்',
      'Health Records Vault': 'மருத்துவப் பதிவகம்',
      'Care Reminders': 'பராமரிப்பு நினைவூட்டல்கள்',
      'Latest Glaucoma Screening': 'சமீபத்திய குளுக்கோமா பரிசோதனை',
      'Screening Timeline': 'பரிசோதனை காலவரிசை',
      'Upcoming Appointments': 'வரவிருக்கும் மருத்துவ சந்திப்புகள்',
      'Eye Care Reminders': 'கண் பராமரிப்பு நினைவூட்டல்கள்',
      'Quick Modules': 'விரைவு தொகுதிகள்',
      'Start AI Screening': 'AI பரிசோதனையைத் தொடங்கு',
      'Open Journey →': 'கண் பயணம் →',
      'Book Specialist →': 'மருத்துவரை முன்பதிவு செய் →',
      'Manage All →': 'அனைத்தையும் நிர்வகி →',
      'Download PDF': 'PDF பதிவிறக்கு',

      // Voice Assistant
      'Voice Assistant': 'குரல் உதவியாளர்',
      'Drishti Eye Assistant': 'திரிஷ்டி கண் உதவியாளர்',
      'Voice & Navigation Support': 'குரல் மற்றும் வழிகாட்டல் ஆதரவு',
      'Listening... Speak now': 'கேட்கிறது... இப்போது பேசுங்கள்',
      'Assistant speaking...': 'உதவியாளர் பேசுகிறார்...',
      'Speak into microphone': 'மைக்ரோஃபோனில் பேசவும்',
      'Send message': 'செய்தியை அனுப்பு',
      'What is glaucoma?': 'குளுக்கோமா என்றால் என்ன?',
      'What is CDR?': 'CDR என்றால் என்ன?',
      'Go to screening': 'பரிசோதனைக்குச் செல்',
      'Open dashboard': 'டாஷ்போர்டைத் திற',

      // Reminders
      'Smart Eye Care Reminders': 'ஸ்மார்ட் கண் பராமரிப்பு நினைவூட்டல்கள்',
      'Reminder Title *': 'நினைவூட்டல் தலைப்பு *',
      'Category': 'வகை',
      'Date': 'தேதி',
      'Time Slot': 'நேரம்',
      'Notes / Details': 'குறிப்புகள் / விவரங்கள்',
      'Add Reminder': 'நினைவூட்டலைச் சேர்',
      'Eye appointment': 'கண் மருத்துவ சந்திப்பு',
      'Routine checkup': 'வழக்கமான பரிசோதனை',
      'Prescribed medication reminder': 'பரிந்துரைக்கப்பட்ட மருந்து நினைவூட்டல்',
      'General eye-care activity': 'பொதுக் கண் பராமரிப்பு நடவடிக்கை',
      'All': 'அனைத்தும்',
      'Pending': 'நிலுவையில்',
      'Completed': 'முடிந்தது',
      'Edit Reminder': 'நினைவூட்டலைத் திருத்து',
      'Update Reminder': 'நினைவூட்டலைப் புதுப்பி',
      'Cancel': 'ரத்து செய்',

      // Anatomy
      'Interactive Eye Anatomy': 'ஊடாடும் கண் உடற்கூறியல்',
      'Explore key structures of the human eye. Click on any component to discover its function and understand how the optic nerve relates to glaucoma screening.': 'கண் அமைப்புகள், அவற்றின் செயல்பாடுகள் மற்றும் குளுக்கோமா பரிசோதனையில் அவற்றின் முக்கியத்துவத்தை அறியுங்கள்.',
      'Optic Nerve': 'பார்வை நரம்பு',
      'Optic Disc': 'பார்வை வட்டு',
      'Optic Cup': 'பார்வை கிண்ணம்',
      'Retina': 'விழித்திரை',
      'Cornea': 'விழிவெண்படலம்',
      'Lens': 'கண் லென்ஸ்',
      'Biological Function': 'இயற்பியல் செயல்பாடு',
      'Clinical Connection to Glaucoma Screening': 'குளுக்கோமா பரிசோதனை மருத்துவ தொடர்பு',

      // Appointments
      'Find Doctor & Book Consultation': 'மருத்துவரைத் தேடி சந்திப்பை முன்பதிவு செய்க',
      'Request Appointment': 'சந்திப்பை கோருக',
      'Request Doctor Appointment': 'மருத்துவ சந்திப்பு கோரிக்கை',
      'Consultation Date *': 'சந்திப்பு தேதி *',
      'Preferred Time Slot *': 'விருப்பமான நேரம் *',
      'Patient Full Name *': 'நோயாளி முழுப் பெயர் *',
      'Contact Phone *': 'தொடர்பு தொலைபேசி எண் *',
      'Reason for Consultation': 'சந்திப்பின் நோக்கம்',
      'Submit Appointment Request': 'சந்திப்பு கோரிக்கையைச் சமர்ப்பிக்கவும்',
      'My Appointment Requests': 'எனது மருத்துவ சந்திப்பு கோரிக்கைகள்',
      'Refresh Appointments': 'சந்திப்புகளைப் புதுப்பி',
      'Cancel Request': 'கோரிக்கையை ரத்து செய்',
      'Status: Requested': 'நிலை: கோரப்பட்டது',
      'Status: Confirmed': 'நிலை: உறுதிசெய்யப்பட்டது',
      'Status: Cancelled': 'நிலை: ரத்துசெய்யப்பட்டது',

      // Quiz
      'Eye Health & Glaucoma Quiz': 'கண் ஆரோக்கியம் மற்றும் குளுக்கோமா வினாடி வினா',
      'Score:': 'மதிப்பெண்:',
      'Next Question →': 'அடுத்த கேள்வி →',
      'Restart Quiz': 'மீண்டும் தொடங்குக',
      'Great Job!': 'சிறப்பான செயல்பாடு!',
      'Play Again': 'மீண்டும் விளையாடுக',
      'Try AI Screening': 'AI பரிசோதனையைத் தொடங்கு',

      // Accessibility
      'Accessibility Settings': 'அணுகல்தன்மை அமைப்புகள்',
      'High-Contrast Mode': 'உயர் மாறுபட்ட வண்ணம்',
      'Large Text Mode': 'பெரிய எழுத்து முறை',
      'Done': 'முடிந்தது',

      // Common & Screening
      'Screening History': 'பரிசோதனை வரலாறு',
      'Screening Result': 'பரிசோதனை முடிவு',
      'Glaucoma Classification': 'குளுக்கோமா வகைப்பாடு',
      'Risk Score / Probability': 'அபாய மதிப்பெண் / நிகழ்தகவு',
      'Cup-to-Disc Ratio (CDR)': 'கப்-டு-டிஸ்க் விகிதம் (CDR)',
      'Screening Assessment': 'பரிசோதனை மதிப்பீடு',
      'Download PDF Report': 'PDF அறிக்கையைப் பதிவிறக்குக',
      'Save to my journey': 'என் பயணத்தில் சேமி',
      'Saved in Journey': 'பயணத்தில் சேமிக்கப்பட்டது',
      'Lower risk': 'குறைந்த அபாயம்',
      'Moderate risk': 'மிதமான அபாயம்',
      'Higher risk': 'அதிக அபாயம்',
      'Glaucoma Suspect': 'குளுக்கோமா சந்தேகம்',
      'Normal': 'இயல்பானது',
      'Severe': 'தீவிரமானது',
      'Moderate': 'மிதமானது'
    },
    hi: {
      'Dashboard': 'डैशबोर्ड',
      'AI Analysis': 'AI विश्लेषण',
      'My Records': 'मेरे रिकॉर्ड',
      'Eye Journey': 'नेत्र यात्रा',
      'Find Doctor': 'डॉक्टर खोजें',
      'Eye Health': 'नेत्र स्वास्थ्य',
      'Eye Anatomy': 'नेत्र शरीर रचना',
      'Eye Quiz': 'नेत्र प्रश्नोत्तरी',
      'Accessibility': 'सुगमता',
      'Sign in': 'साइन इन',
      'My account': 'मेरा खाता',
      'Sign out': 'साइन आउट',
      'Listen': 'सुनें',
      'Stop': 'रोकें',
      'Back to Home': 'होम पर वापस जाएँ',
      'Back to Home ↑': 'होम पर वापस जाएँ ↑',

      // Dashboard
      'My Eye Health Dashboard': 'मेरा नेत्र स्वास्थ्य डैशबोर्ड',
      'A unified view of your latest glaucoma screening, medical records, appointment requests, and ocular reminders.': 'आपकी ग्लूकोमा स्क्रीनिंग, मेडिकल रिकॉर्ड, अपॉइंटमेंट अनुरोध और रिमाइंडर का समग्र दृश्य।',
      'Welcome to your Eye Health Space': 'आपके नेत्र स्वास्थ्य स्थान में आपका स्वागत है',
      'New AI Screening': 'नई AI स्क्रीनिंग',
      'Refresh Data': 'डेटा रीफ़्रेश करें',
      'Latest AI Result': 'नवीनतम AI परिणाम',
      'Glaucoma Risk Score': 'ग्लूकोमा जोखिम स्कोर',
      'Health Records Vault': 'मेडिकल रिकॉर्ड वॉल्ट',
      'Care Reminders': 'देखभाल रिमाइंडर',
      'Latest Glaucoma Screening': 'नवीनतम ग्लूकोमा स्क्रीनिंग',
      'Screening Timeline': 'स्क्रीनिंग समयरेखा',
      'Upcoming Appointments': 'आगामी अपॉइंटमेंट',
      'Eye Care Reminders': 'नेत्र देखभाल रिमाइंडर',
      'Quick Modules': 'त्वरित मॉड्यूल',
      'Start AI Screening': 'AI स्क्रीनिंग शुरू करें',
      'Open Journey →': 'नेत्र यात्रा →',
      'Book Specialist →': 'विशेषज्ञ बुक करें →',
      'Manage All →': 'सभी प्रबंधित करें →',
      'Download PDF': 'PDF डाउनलोड करें',

      // Voice Assistant
      'Voice Assistant': 'वॉइस असिस्टेंट',
      'Drishti Eye Assistant': 'दृष्टि नेत्र सहायक',
      'Voice & Navigation Support': 'वॉइस और नेविगेशन सहायता',
      'Listening... Speak now': 'सुन रहा हूँ... अब बोलें',
      'Assistant speaking...': 'सहायक बोल रहा है...',
      'Speak into microphone': 'माइक में बोलें',
      'Send message': 'संदेश भेजें',
      'What is glaucoma?': 'ग्लूकोमा क्या है?',
      'What is CDR?': 'CDR क्या है?',
      'Go to screening': 'स्क्रीनिंग पर जाएँ',
      'Open dashboard': 'डैशबोर्ड खोलें',

      // Reminders
      'Smart Eye Care Reminders': 'स्मार्ट नेत्र देखभाल रिमाइंडर',
      'Reminder Title *': 'रिमाइंडर शीर्षक *',
      'Category': 'श्रेणी',
      'Date': 'तारीख',
      'Time Slot': 'समय स्लॉट',
      'Notes / Details': 'नोट्स / विवरण',
      'Add Reminder': 'रिमाइंडर जोड़ें',
      'Eye appointment': 'नेत्र रोग विशेषज्ञ अपॉइंटमेंट',
      'Routine checkup': 'नियमित जाँच',
      'Prescribed medication reminder': 'दवा रिमाइंडर',
      'General eye-care activity': 'सामान्य नेत्र देखभाल',
      'All': 'सभी',
      'Pending': 'लंबित',
      'Completed': 'पूर्ण',
      'Edit Reminder': 'रिमाइंडर संपादित करें',
      'Update Reminder': 'रिमाइंडर अपडेट करें',
      'Cancel': 'रद्द करें',

      // Anatomy
      'Interactive Eye Anatomy': 'इंटरैक्टिव नेत्र शरीर रचना',
      'Explore key structures of the human eye. Click on any component to discover its function and understand how the optic nerve relates to glaucoma screening.': 'नेत्र संरचनाओं, उनके कार्यों और ग्लूकोमा स्क्रीनिंग में उनकी प्रासंगिकता को समझें।',
      'Optic Nerve': 'ऑप्टिक तंत्रिका',
      'Optic Disc': 'ऑप्टिक डिस्क',
      'Optic Cup': 'ऑप्टिक कप',
      'Retina': 'रेटिना',
      'Cornea': 'कॉर्निया',
      'Lens': 'नेत्र लेंस',
      'Biological Function': 'शारीरिक कार्य',
      'Clinical Connection to Glaucoma Screening': 'ग्लूकोमा स्क्रीनिंग नैदानिक संबंध',

      // Appointments
      'Find Doctor & Book Consultation': 'डॉक्टर खोजें एवं परामर्श बुक करें',
      'Request Appointment': 'अपॉइंटमेंट अनुरोध करें',
      'Request Doctor Appointment': 'डॉक्टर अपॉइंटमेंट अनुरोध',
      'Consultation Date *': 'परामर्श तारीख *',
      'Preferred Time Slot *': 'पसंदीदा समय स्लॉट *',
      'Patient Full Name *': 'मरीज का पूरा नाम *',
      'Contact Phone *': 'संपर्क फ़ोन नंबर *',
      'Reason for Consultation': 'परामर्श का कारण',
      'Submit Appointment Request': 'अपॉइंटमेंट अनुरोध सबमिट करें',
      'My Appointment Requests': 'मेरे अपॉइंटमेंट अनुरोध',
      'Refresh Appointments': 'अपॉइंटमेंट रीफ़्रेश करें',
      'Cancel Request': 'अनुरोध रद्द करें',
      'Status: Requested': 'स्थिति: अनुरोधित',
      'Status: Confirmed': 'स्थिति: पुष्ट',
      'Status: Cancelled': 'स्थिति: रद्द',

      // Quiz
      'Eye Health & Glaucoma Quiz': 'नेत्र स्वास्थ्य एवं ग्लूकोमा प्रश्नोत्तरी',
      'Score:': 'स्कोर:',
      'Next Question →': 'अगला प्रश्न →',
      'Restart Quiz': 'प्रश्नोत्तरी पुनः प्रारंभ करें',
      'Great Job!': 'शानदार कार्य!',
      'Play Again': 'पुनः खेलें',
      'Try AI Screening': 'AI स्क्रीनिंग शुरू करें',

      // Accessibility
      'Accessibility Settings': 'सुगमता सेटिंग्स',
      'High-Contrast Mode': 'उच्च कंट्रास्ट मोड',
      'Large Text Mode': 'बड़ा टेक्स्ट मोड',
      'Done': 'पूर्ण',

      // Common & Screening
      'Screening History': 'स्क्रीनिंग इतिहास',
      'Screening Result': 'स्क्रीनिंग परिणाम',
      'Glaucoma Classification': 'ग्लूकोमा वर्गीकरण',
      'Risk Score / Probability': 'जोखिम स्कोर / संभावना',
      'Cup-to-Disc Ratio (CDR)': 'कप-टू-डिस्क अनुपात (CDR)',
      'Screening Assessment': 'स्क्रीनिंग मूल्यांकन',
      'Download PDF Report': 'PDF रिपोर्ट डाउनलोड करें',
      'Save to my journey': 'मेरी यात्रा में सहेजें',
      'Saved in Journey': 'यात्रा में सहेजा गया',
      'Lower risk': 'कम जोखिम',
      'Moderate risk': 'मध्यम जोखिम',
      'Higher risk': 'अधिक जोखिम',
      'Glaucoma Suspect': 'ग्लूकोमा संदिग्ध',
      'Normal': 'सामान्य',
      'Severe': 'गंभीर',
      'Moderate': 'मध्यम'
    }
  };

  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();

  function translate(value, language = lang()) {
    if (!value) return value;
    const trimmed = value.trim();
    if (!trimmed) return value;

    if (language === 'en') {
      for (const [english, tamil] of Object.entries(translations.ta)) {
        if (tamil === trimmed) return value.replace(trimmed, english);
      }
      for (const [english, hindi] of Object.entries(translations.hi)) {
        if (hindi === trimmed) return value.replace(trimmed, english);
      }
      return value;
    }

    const table = translations[language] || {};
    if (table[trimmed]) return value.replace(trimmed, table[trimmed]);

    for (const [english, tamil] of Object.entries(translations.ta)) {
      if (tamil === trimmed) return value.replace(trimmed, table[english] || english);
    }
    for (const [english, hindi] of Object.entries(translations.hi)) {
      if (hindi === trimmed) return value.replace(trimmed, table[english] || english);
    }

    return value;
  }

  function applyTranslations() {
    const language = lang();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(parent.tagName)) continue;
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const original = originalText.get(node);
      const next = translate(original, language);
      if (node.nodeValue !== next) node.nodeValue = next;
    }

    const placeholderMap = {
      ta: {
        'Search doctor, hospital or city': 'மருத்துவர், மருத்துவமனை அல்லது நகரத்தைத் தேடுங்கள்',
        'e.g. Eye examination report': 'எ.கா. கண் பரிசோதனை அறிக்கை',
        'Optional note': 'விருப்பக் குறிப்பு',
        'Optional details': 'விருப்ப விவரங்கள்',
        'Your name': 'உங்கள் பெயர்',
        'you@example.com': 'you@example.com',
        'At least 8 characters': 'குறைந்தது 8 எழுத்துகள்',
        'Ask a question or request navigation...': 'கேள்வி கேளுங்கள் அல்லது வழிகாட்டலைக் கோருங்கள்...'
      },
      hi: {
        'Search doctor, hospital or city': 'डॉक्टर, अस्पताल या शहर खोजें',
        'e.g. Eye examination report': 'उदा. आँख की जाँच रिपोर्ट',
        'Optional note': 'वैकल्पिक नोट',
        'Optional details': 'वैकल्पिक विवरण',
        'Your name': 'आपका नाम',
        'you@example.com': 'you@example.com',
        'At least 8 characters': 'कम से कम 8 अक्षर',
        'Ask a question or request navigation...': 'प्रश्न पूछें या नेविगेशन का अनुरोध करें...'
      }
    };

    document.querySelectorAll('[placeholder]').forEach(el => {
      if (!originalAttrs.has(el)) originalAttrs.set(el, { placeholder: el.getAttribute('placeholder') });
      const orig = originalAttrs.get(el).placeholder;
      if (language === 'en') {
        el.setAttribute('placeholder', orig);
      } else {
        el.setAttribute('placeholder', placeholderMap[language]?.[orig] || orig);
      }
    });

    document.documentElement.lang = language;
  }

  function setLanguage(newLang) {
    if ($('language')) $('language').value = newLang;
    localStorage.setItem('drishti-language', newLang);
    applyTranslations();
    updateVoiceBtnUI();
    renderAnatomyDetails(activeAnatomyPart);
    if (typeof quizCurrentIndex !== 'undefined') renderQuizQuestion();
  }

  // --------------------------------------------------------------------------
  // PART 4: Accessibility Manager (High Contrast & Large Text)
  // --------------------------------------------------------------------------
  let contrastState = localStorage.getItem('drishti-pref-contrast') === '1';
  let largeTextState = localStorage.getItem('drishti-pref-largetext') === '1';

  function applyAccessibilityPreferences() {
    document.body.classList.toggle('high-contrast', contrastState);
    document.body.classList.toggle('large-text', largeTextState);

    updateToggleIndicator($('toggleHighContrast'), $('txtHighContrast'), contrastState);
    updateToggleIndicator($('toggleLargeText'), $('txtLargeText'), largeTextState);
  }

  function updateToggleIndicator(btn, labelEl, isActive) {
    if (!btn) return;
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    btn.classList.toggle('active', isActive);
    if (labelEl) labelEl.textContent = isActive ? t('On', 'இயக்கு', 'चालू') : t('Off', 'அணை', 'बंद');
  }

  if ($('toggleHighContrast')) {
    $('toggleHighContrast').onclick = () => {
      contrastState = !contrastState;
      localStorage.setItem('drishti-pref-contrast', contrastState ? '1' : '0');
      applyAccessibilityPreferences();
    };
  }

  if ($('toggleLargeText')) {
    $('toggleLargeText').onclick = () => {
      largeTextState = !largeTextState;
      localStorage.setItem('drishti-pref-largetext', largeTextState ? '1' : '0');
      applyAccessibilityPreferences();
    };
  }

  if ($('accessBtn')) $('accessBtn').onclick = () => { if ($('accessibilityModal')) $('accessibilityModal').hidden = false; };
  if ($('closeAccessModalBtn')) $('closeAccessModalBtn').onclick = () => { if ($('accessibilityModal')) $('accessibilityModal').hidden = true; };
  if ($('doneAccessBtn')) $('doneAccessBtn').onclick = () => { if ($('accessibilityModal')) $('accessibilityModal').hidden = true; };

  // --------------------------------------------------------------------------
  // Voice Listen/Stop Toggle (Navbar Audio Narrator)
  // --------------------------------------------------------------------------
  let isVoicePlaying = false;
  window._activeVoiceUtterance = null;

  function updateVoiceBtnUI() {
    const btn = $('voice');
    if (!btn) return;
    const l = lang();
    const playLabels = { en: 'Listen', ta: 'கேளுங்கள்', hi: 'सुनें' };
    const stopLabels = { en: 'Stop', ta: 'நிறுத்து', hi: 'रोकें' };

    btn.setAttribute('aria-pressed', isVoicePlaying ? 'true' : 'false');
    if (isVoicePlaying) {
      btn.classList.add('playing');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="vertical-align:middle;margin-right:4px;"><rect x="4" y="4" width="16" height="16" rx="2"/></svg> <span>${stopLabels[l] || 'Stop'}</span>`;
    } else {
      btn.classList.remove('playing');
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:4px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg> <span>${playLabels[l] || 'Listen'}</span>`;
    }
  }

  function getCleanPageText() {
    const activeSection = document.querySelector('main > [data-page].active-page') ||
      document.querySelector('section.active-page') ||
      document.querySelector('main');
    if (!activeSection) return 'Welcome to Drishti. Your smart personal eye health platform.';

    const clone = activeSection.cloneNode(true);
    clone.querySelectorAll('script, style, svg, noscript, [hidden], button, input, select, textarea').forEach(el => el.remove());
    let txt = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
    if (!txt || txt.length < 15) {
      txt = 'Welcome to Drishti. You are viewing the ' + (activeSection.id || 'overview') + ' section of your personal eye health platform.';
    }
    return txt.slice(0, 1600);
  }

  function toggleVoicePlayback() {
    if (!('speechSynthesis' in window)) {
      alert(t('Speech playback is not supported in this browser.', 'இந்த உலாவியில் குரல் வாசிப்பு வசதி இல்லை.', 'इस ब्राउज़र में स्पीच प्लेबैक समर्थित नहीं है।'));
      return;
    }

    if (isVoicePlaying || window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      isVoicePlaying = false;
      window._activeVoiceUtterance = null;
      updateVoiceBtnUI();
      return;
    }

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const textToRead = getCleanPageText();
    const utter = new SpeechSynthesisUtterance(textToRead);
    window._activeVoiceUtterance = utter; // Retain reference to prevent garbage collection cancellation

    const currentL = lang();
    const localeMap = { en: 'en-US', ta: 'ta-IN', hi: 'hi-IN' };
    const targetLocale = localeMap[currentL] || 'en-US';
    utter.lang = targetLocale;
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length > 0) {
      const match = voices.find(v => v.lang.toLowerCase() === targetLocale.toLowerCase()) ||
        voices.find(v => v.lang.toLowerCase().startsWith(currentL));
      if (match) utter.voice = match;
    }

    utter.onstart = () => {
      isVoicePlaying = true;
      updateVoiceBtnUI();
    };
    utter.onend = () => {
      isVoicePlaying = false;
      window._activeVoiceUtterance = null;
      updateVoiceBtnUI();
    };
    utter.onerror = (e) => {
      console.warn('Speech playback notification:', e);
      isVoicePlaying = false;
      window._activeVoiceUtterance = null;
      updateVoiceBtnUI();
    };

    window.speechSynthesis.speak(utter);
    isVoicePlaying = true;
    updateVoiceBtnUI();
  }

  if ($('voice')) {
    $('voice').onclick = toggleVoicePlayback;
  }

  // --------------------------------------------------------------------------
  // USER STATE & AUTH
  // --------------------------------------------------------------------------
  let currentUser = null;
  const demoKey = kind => `drishti-demo-${kind}-${currentUser ? currentUser.email : 'guest'}`;
  function demoRead(kind) { try { return JSON.parse(localStorage.getItem(demoKey(kind)) || '[]'); } catch { return []; } }
  function demoWrite(kind, rows) { localStorage.setItem(demoKey(kind), JSON.stringify(rows)); }
  const isDemo = () => !!(currentUser && currentUser.demo);

  function updateAccountUI() {
    const link = $('accountLink');
    if (link) {
      link.textContent = currentUser ? t('My account', 'எனது கணக்கு', 'मेरा खाता') : t('Sign in', 'உள்நுழை', 'साइन इन');
    }
  }

  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // FEATURE 1: My Eye Health Dashboard (Strict Data Accuracy & User Isolation)
  // --------------------------------------------------------------------------
  async function loadDashboard() {
    const welcomeUser = $('dashWelcomeUser');
    const welcomeStatus = $('dashWelcomeStatus');
    const m1Val = $('dashMetric1Value');
    const m1Sub = $('dashMetric1Sub');
    const m2Val = $('dashMetric2Value');
    const m2Sub = $('dashMetric2Sub');
    const m3Val = $('dashMetric3Value');
    const m4Val = $('dashMetric4Value');
    const latestBox = $('dashLatestContent');
    const latestDatePill = $('dashLatestDatePill');
    const historyList = $('dashHistoryList');
    const apptsList = $('dashAptList');
    const remindersList = $('dashRemindersList');

    if (!latestBox) return;

    // Update Welcome Strip based on authenticated user
    if (currentUser) {
      if (welcomeUser) welcomeUser.textContent = `${t('Welcome back', 'மீண்டும் வருக', 'वापसी पर स्वागत है')}, ${currentUser.name || 'Patient'}!`;
      if (welcomeStatus) welcomeStatus.textContent = `${t('Personal eye health summary for', 'தனிப்பட்ட கண் ஆரோக்கிய சுருக்கம்', 'व्यक्तिगत नेत्र स्वास्थ्य सारांश')}: ${currentUser.email}`;
    } else {
      if (welcomeUser) welcomeUser.textContent = t('Welcome to your Eye Health Space', 'உங்கள் கண் ஆரோக்கிய தளத்திற்கு வரவேற்கிறோம்', 'आपके नेत्र स्वास्थ्य स्थल में आपका स्वागत है');
      if (welcomeStatus) welcomeStatus.textContent = t('Sign in to sync your personal screening evaluations, clinical records, and appointments.', 'தனிப்பட்ட பரிசோதனை முடிவுகள், பதிவுகள் மற்றும் சந்திப்புகளை ஒத்திசைக்க உள்நுழையவும்.', 'अपने व्यक्तिगत स्क्रीनिंग मूल्यांकन, रिकॉर्ड और अपॉइंटमेंट सिंक करने के लिए साइन इन करें।');
    }

    try {
      let data = null;
      if (!isDemo() && currentUser) {
        try {
          data = await window.api('/api/public/dashboard');
        } catch (apiErr) {
          console.warn('Dashboard API error, falling back:', apiErr);
          data = null;
        }
      }

      if (!data) {
        const analyses = isDemo() ? demoRead('analyses') : [];
        const records = isDemo() ? demoRead('records') : [];
        const reminders = isDemo() ? demoRead('reminders') : [];
        const appointments = isDemo() ? demoRead('appointments') : [];

        data = {
          latest_analysis: analyses[0] || null,
          analyses_count: analyses.length,
          recent_analyses: analyses.slice(0, 5),
          records_count: records.length,
          recent_records: records.slice(0, 5),
          reminders_count: reminders.filter(x => !Number(x.completed)).length,
          pending_reminders: reminders.filter(x => !Number(x.completed)).slice(0, 5),
          all_reminders: reminders,
          upcoming_appointments: appointments.filter(x => x.status !== 'Cancelled').slice(0, 5)
        };
      }

      // Cache reminders for edit modals
      window._cachedReminders = data.all_reminders || data.pending_reminders || [];

      // Update Statistic Metric Cards & Latest Screening
      if (data.latest_analysis) {
        const item = data.latest_analysis;
        const resStr = item.result ? String(item.result) : t('Screening Completed', 'பரிசோதனை முடிந்தது', 'स्क्रीनिंग पूर्ण');
        const isPositive = /positive|suspect|high/i.test(resStr);
        const scoreStr = (item.score !== null && item.score !== undefined && item.score !== '') ? `${item.score}%` : t('Not available', 'கிடைக்கவில்லை', 'उपलब्ध नहीं');
        const cdrStr = (item.cdr !== null && item.cdr !== undefined && String(item.cdr).trim() !== '') ? parseFloat(item.cdr).toFixed(2) : null;
        const confStr = item.confidence ? String(item.confidence) : null;
        const iopStr = item.iop ? String(item.iop) : null;
        const screenDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : t('Recent', 'சமீபத்திய', 'हालिया');

        if (latestDatePill) {
          latestDatePill.textContent = screenDate;
          latestDatePill.className = `pill ${isPositive ? 'severe' : 'normal'}`;
        }

        if (m1Val) m1Val.textContent = resStr;
        if (m1Sub) m1Sub.textContent = `${t('Screened on', 'பரிசோதிக்கப்பட்டது', 'स्क्रीनिंग दिनांक')}: ${screenDate}`;

        if (m2Val) m2Val.textContent = scoreStr;
        if (m2Sub) {
          if (cdrStr) m2Sub.textContent = `CDR: ${cdrStr}${confStr ? ` · Conf: ${confStr}` : ''}`;
          else if (confStr) m2Sub.textContent = `${t('Confidence', 'நம்பகத்தன்மை', 'विश्वास')}: ${confStr}`;
          else m2Sub.textContent = t('Automated Risk Score', 'தானியங்கி அபாய மதிப்பெண்', 'स्वचालित जोखिम स्कोर');
        }

        // Parse details if JSON string
        let detailsList = [];
        if (Array.isArray(item.details)) {
          detailsList = item.details;
        } else if (typeof item.details === 'string' && item.details.trim()) {
          try {
            const parsed = JSON.parse(item.details);
            if (Array.isArray(parsed)) detailsList = parsed;
            else if (typeof parsed === 'string') detailsList = [parsed];
          } catch {
            detailsList = [item.details];
          }
        }

        latestBox.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
            <div>
              <span class="pill ${isPositive ? 'severe' : 'normal'}" style="font-weight:600;">${escapeHtml(resStr)}</span>
              <h4 style="margin:10px 0 4px;font-size:16px;">${t('Preliminary Glaucoma Risk Assessment', 'முதற்கட்ட கிளௌகோமா அபாய மதிப்பீடு', 'प्रारंभिक ग्लूकोमा जोखिम मूल्यांकन')}</h4>
              <p class="muted tiny" style="margin:0;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><strong>${escapeHtml(screenDate)}</strong>
                ${cdrStr ? ` · CDR: <strong>${escapeHtml(cdrStr)}</strong>` : ''}
                ${confStr ? ` · ${t('Confidence', 'நம்பகத்தன்மை', 'विश्वास')}: <strong>${escapeHtml(confStr)}</strong>` : ''}
                ${iopStr ? ` · IOP: <strong>${escapeHtml(iopStr)}</strong>` : ''}
              </p>
            </div>
            <div style="text-align:right;">
              <small class="muted" style="text-transform:uppercase;font-size:11px;font-weight:700;">${t('Risk Score', 'அபாய மதிப்பெண்', 'जोखिम स्कोर')}</small>
              <div style="font-size:24px;font-weight:800;color:${isPositive ? 'var(--severe, #dc2626)' : 'var(--teal, #168b8b)'};">${escapeHtml(scoreStr)}</div>
            </div>
          </div>

          ${detailsList.length ? `
            <div style="margin:12px 0 8px;padding:10px 14px;background:var(--tint, #f8fafc);border-radius:8px;border:1px solid var(--line, #e2e8f0);">
              <small class="muted" style="font-weight:700;display:block;margin-bottom:4px;">${t('Saved Observations', 'பதிவான அவதானிப்புகள்', 'सहेजे गए अवलोकन')}:</small>
              <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:var(--text-light, #334155);">
                ${detailsList.map(d => `<li>${escapeHtml(String(d))}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div style="margin:12px 0;padding:10px 12px;background:#fefce8;border:1px solid #fde047;border-radius:8px;font-size:12px;line-height:1.5;color:#854d0e;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><strong>${t('Clinical Notice', 'மருத்துவ அறிவிப்பு', 'नैदानिक सूचना')}:</strong>
            ${t('AI screening is preliminary and does not replace evaluation by a qualified ophthalmologist or eye specialist.', 'AI பரிசோதனை முதற்கட்டமானது மற்றும் தகுதிவாய்ந்த கண் மருத்துவ நிபுணரின் நேரடி பரிசோதனைக்கு மாற்றாகாது.', 'एआई स्क्रीनिंग केवल प्रारंभिक है और किसी योग्य नेत्र रोग विशेषज्ञ के परामर्श का विकल्प नहीं है।')}
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;">
            <a href="#journey" class="button outline small">${t('View Full Eye Journey', 'முழு பயணத்தைக் காண்க', 'पूरी यात्रा देखें')}</a>
            <button type="button" class="button small dash-pdf-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>${t('Download Clinical PDF Report', 'PDF அறிக்கையைப் பதிவிறக்கு', 'क्लीनिकल PDF रिपोर्ट डाउनलोड करें')}</button>
          </div>
        `;

        latestBox.querySelector('.dash-pdf-btn')?.addEventListener('click', async () => {
          if (window.generateGlaucomaPdf) {
            await window.generateGlaucomaPdf(item);
          }
        });
      } else {
        if (latestDatePill) {
          latestDatePill.textContent = t('No Records', 'பதிவுகள் இல்லை', 'कोई रिकॉर्ड नहीं');
          latestDatePill.className = 'pill';
        }
        if (m1Val) m1Val.textContent = '—';
        if (m1Sub) m1Sub.textContent = t('No screening records available yet.', 'பரிசோதனை பதிவுகள் எதுவும் இல்லை.', 'कोई स्क्रीनिंग रिकॉर्ड उपलब्ध नहीं है।');
        if (m2Val) m2Val.textContent = '—';
        if (m2Sub) m2Sub.textContent = t('Not available', 'கிடைக்கவில்லை', 'उपलब्ध नहीं');

        latestBox.innerHTML = `
          <div class="empty">
            <p style="margin-bottom:10px;">${t('No screening records available yet. Complete an automated glaucoma screening to view your ocular risk assessment here.', 'பரிசோதனை பதிவுகள் எதுவும் இல்லை. உங்கள் மதிப்பீட்டைக் காண AI பரிசோதனையை முடிக்கவும்.', 'कोई स्क्रीनिंग रिकॉर्ड उपलब्ध नहीं है। अपना जोखिम मूल्यांकन देखने के लिए एआई स्क्रीनिंग पूरी करें।')}</p>
            <a href="#screen" class="button small">${t('Start AI Screening', 'AI பரிசோதனையைத் தொடங்கு', 'AI स्क्रीनिंग शुरू करें')}</a>
          </div>
        `;
      }

      if (m3Val) m3Val.textContent = data.records_count || 0;
      if (m4Val) m4Val.textContent = data.reminders_count || 0;

      // History Timeline
      if (historyList) {
        if (data.recent_analyses && data.recent_analyses.length) {
          historyList.innerHTML = data.recent_analyses.map(x => {
            const isPos = /positive|suspect|high/i.test(String(x.result || ''));
            const sDate = x.created_at ? new Date(x.created_at).toLocaleDateString() : t('Recent', 'சமீபத்திய', 'हालिया');
            const scorePart = (x.score !== null && x.score !== undefined && x.score !== '') ? ` · ${t('Score', 'மதிப்பெண்', 'स्कोर')}: ${x.score}%` : '';
            const confPart = x.confidence ? ` · ${t('Conf', 'நம்பகத்தன்மை', 'विश्वास')}: ${escapeHtml(x.confidence)}` : '';
            const cdrPart = (x.cdr !== null && x.cdr !== undefined) ? ` · CDR: ${parseFloat(x.cdr).toFixed(2)}` : '';

            return `
              <div class="dash-list-item" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px;background:var(--card);">
                <div>
                  <strong>${escapeHtml(x.result || t('Screening Evaluation', 'பரிசோதனை மதிப்பீடு', 'स्क्रीनिंग मूल्यांकन'))}</strong>
                  <p class="muted tiny" style="margin:2px 0 0;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(sDate)}${scorePart}${confPart}${cdrPart}</p>
                </div>
                <span class="pill ${isPos ? 'severe' : 'normal'}">${escapeHtml(x.result ? (isPos ? 'Suspected' : 'Normal') : 'Screened')}</span>
              </div>
            `;
          }).join('');
        } else {
          historyList.innerHTML = `<p class="empty">${t('No screening records available yet.', 'பரிசோதனை பதிவுகள் எதுவும் இல்லை.', 'कोई स्क्रीनिंग रिकॉर्ड उपलब्ध नहीं है।')}</p>`;
        }
      }

      // Upcoming Appointments
      if (apptsList) {
        if (data.upcoming_appointments && data.upcoming_appointments.length) {
          apptsList.innerHTML = data.upcoming_appointments.map(a => `
            <div class="dash-list-item" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px;background:var(--card);">
              <div style="flex:1;">
                <strong>${escapeHtml(a.doctor_name)}</strong>
                <p class="muted tiny" style="margin:2px 0 0;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px;"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/><line x1="10" y1="9" x2="14" y2="9"/><line x1="12" y1="7" x2="12" y2="11"/></svg>${escapeHtml(a.hospital_name ? `${a.hospital_name}, ${a.city}` : a.city)} · <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><strong>${escapeHtml(a.appointment_date)}</strong> (${escapeHtml(a.appointment_time)})
                </p>
                ${a.reason ? `<p class="tiny muted" style="margin:2px 0 0;font-style:italic;">"${escapeHtml(a.reason)}"</p>` : ''}
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                <span class="pill ${a.status === 'Confirmed' ? 'normal' : 'moderate'}">${escapeHtml(a.status || 'Requested')}</span>
                <button type="button" class="btn-icon dash-apt-cancel-btn" data-apt-id="${escapeHtml(a.id)}" title="${t('Cancel Appointment', 'சந்திப்பை ரத்து செய்', 'अपॉइंटमेंट रद्द करें')}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>
            </div>
          `).join('');

          apptsList.querySelectorAll('.dash-apt-cancel-btn').forEach(btn => {
            btn.onclick = async () => {
              if (confirm(t('Cancel this appointment request?', 'இந்த சந்திப்பு கோரிக்கையை ரத்து செய்ய விரும்புகிறீர்களா?', 'क्या आप इस अपॉइंटमेंट अनुरोध को रद्द करना चाहते हैं?'))) {
                await cancelAppointment(btn.dataset.aptId);
                loadDashboard();
              }
            };
          });
        } else {
          apptsList.innerHTML = `<p class="empty">${t('No upcoming doctor appointments scheduled. Explore the specialist directory to book a consultation.', 'வரவிருக்கும் சந்திப்புகள் எதுவும் இல்லை.', 'कोई आगामी अपॉइंटमेंट नहीं है।')} <a href="#doctors">${t('Book Care', 'சிகிச்சையை முன்பதிவு செய்', 'देखभाल बुक करें')}</a></p>`;
        }
      }

      // Eye Care Reminders (Complete CRUD on Dashboard)
      if (remindersList) {
        const activeReminders = data.pending_reminders || (data.all_reminders ? data.all_reminders.filter(x => !Number(x.completed)) : []);
        if (activeReminders && activeReminders.length) {
          remindersList.innerHTML = activeReminders.map(rem => {
            const isDone = Number(rem.completed) === 1;
            return `
              <div class="dash-list-item" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px;background:var(--card);">
                <div style="flex:1;">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span class="pill ${isDone ? 'normal' : 'moderate'} tiny">${escapeHtml(rem.category || 'General Care')}</span>
                    <strong>${escapeHtml(rem.title)}</strong>
                  </div>
                  <p class="muted tiny" style="margin:2px 0 0;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:2px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${escapeHtml(rem.reminder_time || 'Scheduled')} · <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:2px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(rem.reminder_date || 'Ongoing')}
                    ${rem.description ? ` · ${escapeHtml(rem.description)}` : ''}
                  </p>
                </div>
                <div style="display:flex;gap:4px;align-items:center;">
                  <button type="button" class="btn-icon dash-rem-toggle-btn" data-rem-id="${escapeHtml(rem.id)}" data-next-status="${isDone ? 0 : 1}" title="${isDone ? t('Mark Pending', 'நிலுவை', 'लंबित करें') : t('Mark Complete', 'முடிக்க', 'पूर्ण करें')}">
                    ${isDone ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>'}
                  </button>
                  <button type="button" class="btn-icon dash-rem-edit-btn" data-rem-id="${escapeHtml(rem.id)}" title="${t('Edit', 'திருத்து', 'संपादित')}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                  <button type="button" class="btn-icon dash-rem-del-btn" data-rem-id="${escapeHtml(rem.id)}" title="${t('Delete', 'நீக்கு', 'हटाएँ')}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                </div>
              </div>
            `;
          }).join('');

          remindersList.querySelectorAll('.dash-rem-toggle-btn').forEach(btn => {
            btn.onclick = async () => {
              const id = btn.dataset.remId;
              const next = parseInt(btn.dataset.nextStatus, 10);
              await toggleReminderComplete(id, next);
              loadDashboard();
              loadRemindersPrivate();
            };
          });

          remindersList.querySelectorAll('.dash-rem-edit-btn').forEach(btn => {
            btn.onclick = () => openReminderModal(btn.dataset.remId);
          });

          remindersList.querySelectorAll('.dash-rem-del-btn').forEach(btn => {
            btn.onclick = async () => {
              if (confirm(t('Delete this reminder?', 'இந்த நினைவூட்டலை நீக்க விரும்புகிறீர்களா?', 'क्या आप इस रिमाइंडर को हटाना चाहते हैं?'))) {
                await deleteReminder(btn.dataset.remId);
                loadDashboard();
                loadRemindersPrivate();
              }
            };
          });
        } else {
          remindersList.innerHTML = `
            <p class="empty">${t('No active eye care reminders. Add a checkup, medication, or consultation reminder.', 'நினைவூட்டல்கள் எதுவும் இல்லை. புதிய நினைவூட்டலைச் சேர்க்கவும்.', 'कोई सक्रिय रिमाइंडर नहीं है। नया रिमाइंडर जोड़ें।')}
              <button type="button" class="button small outline" id="dashAddRemEmptyBtn" style="margin-left:6px;">${t('+ Add Reminder', '+ நினைவூட்டல்', '+ रिमाइंडर जोड़ें')}</button>
            </p>
          `;
          $('dashAddRemEmptyBtn')?.addEventListener('click', () => openReminderModal());
        }
      }

      // Wire Dashboard + Add Reminder button in card header
      if ($('dashAddReminderBtn')) {
        $('dashAddReminderBtn').onclick = () => openReminderModal();
      }

    } catch (e) {
      console.warn('Dashboard error:', e);
    }
  }

  if ($('dashRefreshBtn')) $('dashRefreshBtn').onclick = loadDashboard;

  // --------------------------------------------------------------------------
  // FEATURE 2: Voice-Based Eye Care Assistant
  // --------------------------------------------------------------------------
  function setupVoiceAssistant() {
    const fab = $('assistantFabBtn');
    const panel = $('assistantPanel');
    const closeBtn = $('closeAssistantBtn');
    const micBtn = $('astMicBtn');
    const sendBtn = $('astSendBtn');
    const textInput = $('astTextInput');
    const chatBody = $('assistantChatBody');
    const indicator = $('assistantIndicator');
    const indicatorText = $('astIndicatorText');

    if (!fab || !panel) return;

    let isAssistantListening = false;
    let recognition = null;

    fab.onclick = () => {
      panel.hidden = !panel.hidden;
      fab.setAttribute('aria-expanded', !panel.hidden ? 'true' : 'false');
      if (!panel.hidden && textInput) textInput.focus();
    };

    if (closeBtn) closeBtn.onclick = () => {
      panel.hidden = true;
      fab.setAttribute('aria-expanded', 'false');
    };

    function appendMessage(sender, text) {
      if (!chatBody) return;
      const msgDiv = document.createElement('div');
      msgDiv.className = `ast-msg ${sender === 'user' ? 'user' : 'bot'}`;
      msgDiv.innerHTML = `<p>${escapeHtml(text)}</p>`;
      chatBody.appendChild(msgDiv);
      chatBody.scrollTop = chatBody.scrollHeight;
    }

    function speakAssistantResponse(text) {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const l = lang();
      utter.lang = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' }[l] || 'en-IN';
      const voices = speechSynthesis.getVoices();
      utter.voice = voices.find(v => v.lang.toLowerCase() === utter.lang.toLowerCase()) || voices.find(v => v.lang.toLowerCase().startsWith(l + '-')) || null;

      if (indicator) {
        indicator.hidden = false;
        if (indicatorText) indicatorText.textContent = t('Assistant speaking...', 'உதவியாளர் பேசுகிறார்...', 'सहायक बोल रहा है...');
      }

      utter.onend = () => { if (indicator) indicator.hidden = true; };
      utter.onerror = () => { if (indicator) indicator.hidden = true; };

      speechSynthesis.speak(utter);
    }

    function processUserVoiceQuery(raw) {
      const q = String(raw || '').toLowerCase().trim();
      if (!q) return;

      appendMessage('user', raw);

      let reply = '';
      if (q.includes('screen') || q.includes('analysis') || q.includes('பரிசோதனை') || q.includes('जाँच') || q.includes('स्क्रीनिंग')) {
        window.location.hash = '#screen';
        reply = t('Navigating to AI Glaucoma Screening module.', 'AI குளுக்கோமா பரிசோதனைப் பக்கத்திற்கு செல்கிறேன்.', 'AI ग्लूकोमा स्क्रीनिंग पेज खोला जा रहा है।');
      } else if (q.includes('record') || q.includes('vault') || q.includes('பதிவு') || q.includes('रिकॉर्ड')) {
        window.location.hash = '#records';
        reply = t('Opening your Health Records Vault.', 'உங்கள் மருத்துவப் பதிவகத்தைத் திறக்கிறேன்.', 'आपका स्वास्थ्य रिकॉर्ड वॉल्ट खोला जा रहा है।');
      } else if (q.includes('journey') || q.includes('timeline') || q.includes('பயணம்') || q.includes('यात्रा')) {
        window.location.hash = '#journey';
        reply = t('Navigating to your Eye Journey timeline.', 'உங்கள் கண் பயணத்திற்கு செல்கிறேன்.', 'आपकी नेत्र यात्रा खोली जा रही है।');
      } else if (q.includes('doctor') || q.includes('hospital') || q.includes('மருத்துவர்') || q.includes('डॉक्टर')) {
        window.location.hash = '#doctors';
        reply = t('Opening Find Doctor & Specialist Directory.', 'மருத்துவர் பட்டியலைத் திறக்கிறேன்.', 'नेत्र विशेषज्ञ निर्देशिका खोली जा रही है।');
      } else if (q.includes('anatomy') || q.includes('உடற்கூறியல்') || q.includes('शरीर रचना')) {
        window.location.hash = '#anatomy';
        reply = t('Opening the Interactive Eye Anatomy section.', 'கண் உடற்கூறியல் பகுதியைத் திறக்கிறேன்.', 'नेत्र शरीर रचना अनुभाग खोला जा रहा है।');
      } else if (q.includes('quiz') || q.includes('வினாடி') || q.includes('प्रश्नोत्तरी')) {
        window.location.hash = '#quiz';
        reply = t('Opening the Eye Health Quiz.', 'கண் நல்வாழ்வு வினாடி வினாவைத் திறக்கிறேன்.', 'नेत्र स्वास्थ्य प्रश्नोत्तरी खोली जा रही है।');
      } else if (q.includes('dashboard') || q.includes('டாஷ்போர்டு') || q.includes('डैशबोर्ड')) {
        window.location.hash = '#dashboard';
        reply = t('Navigating to your Eye Health Dashboard.', 'கண் ஆரோக்கிய டாஷ்போர்டிற்கு செல்கிறேன்.', 'नेत्र स्वास्थ्य डैशबोर्ड खोला जा रहा है।');
      } else if (q.includes('glaucoma') || q.includes('குளுக்கோமா') || q.includes('ग्लूकोमा')) {
        reply = t(
          'Glaucoma is an eye disease causing optic nerve damage, often linked to high intraocular pressure. It is often called the "silent thief of sight" because early stages have no symptoms. Regular screening is essential.',
          'குளுக்கோமா என்பது பார்வை நரம்பைப் பாதிக்கும் கண் நோயாகும்; இது பெரும்பாலும் கண் அழுத்த அதிகரிப்புடன் தொடர்புடையது. ஆரம்பத்தில் அறிகுறிகள் இல்லாததால் வழக்கமான பரிசோதனை அவசியம்.',
          'ग्लूकोमा एक ऐसी बीमारी है जो ऑप्टिक तंत्रिका को नुकसान पहुँचाती है, जो अक्सर बढ़े हुए दबाव से जुड़ी होती है। शुरुआती लक्षण न होने के कारण नियमित जाँच आवश्यक है।'
        );
      } else if (q.includes('cdr') || q.includes('cup') || q.includes('disc') || q.includes('வட்டு') || q.includes('कप')) {
        reply = t(
          'Cup-to-Disc Ratio (CDR) compares the diameter of the optic cup to the total optic disc. A healthy CDR is typically under 0.40 to 0.50. An enlarged cup indicates optic nerve cupping from glaucoma.',
          'கப்-டு-டிஸ்க் விகிதம் (CDR) என்பது பார்வை கிண்ணத்தின் அளவை முழு பார்வை வட்டுடன் ஒப்பிடுவதாகும். ஆரோக்கியமான அளவு 0.40-0.50க்கு குறைவாக இருக்கும்.',
          'कप-टू-डिस्क अनुपात (CDR) कप के व्यास की तुलना डिस्क से करता है। स्वस्थ CDR 0.40 से 0.50 से कम होता है।'
        );
      } else {
        reply = t(
          'Drishti provides AI screening guidance, health records tracking, and educational tools. Please note that Drishti is an educational platform and not a replacement for a clinical eye examination.',
          'Drishti AI பரிசோதனை வழிகாட்டல், பதிவுகள் சேமிப்பு மற்றும் கல்வி உதவிகளை வழங்குகிறது. இது மருத்துவ நோயறிதலுக்கு மாற்றாகாது.',
          'Drishti AI स्क्रीनिंग मार्गदर्शन और रिकॉर्ड ट्रैकिंग प्रदान करता है। यह चिकित्सीय जाँच का विकल्प नहीं है।'
        );
      }

      appendMessage('bot', reply);
      speakAssistantResponse(reply);
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        isAssistantListening = true;
        if (indicator) {
          indicator.hidden = false;
          if (indicatorText) indicatorText.textContent = t('Listening... Speak now', 'கேட்கிறது... இப்போது பேசுங்கள்', 'सुन रहा हूँ... अब बोलें');
        }
      };

      recognition.onresult = event => {
        const transcript = event.results[0][0].transcript;
        processUserVoiceQuery(transcript);
      };

      recognition.onerror = () => {
        isAssistantListening = false;
        if (indicator) indicator.hidden = true;
      };

      recognition.onend = () => {
        isAssistantListening = false;
        if (indicator) indicator.hidden = true;
      };

      if (micBtn) {
        micBtn.onclick = () => {
          if (isAssistantListening) {
            recognition.stop();
          } else {
            const l = lang();
            recognition.lang = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' }[l] || 'en-IN';
            try { recognition.start(); } catch { }
          }
        };
      }
    } else {
      if (micBtn) {
        micBtn.onclick = () => {
          alert(t('Speech recognition is not supported in this browser. Please use text input.', 'இந்த உலாவியில் பேச்சு உணர்தல் வசதி இல்லை. உரையைப் பயன்படுத்தவும்.', 'इस ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है। टेक्स्ट इनपुट का उपयोग करें।'));
        };
      }
    }

    const handleSend = () => {
      const val = textInput.value.trim();
      if (!val) return;
      textInput.value = '';
      processUserVoiceQuery(val);
    };

    if (sendBtn) sendBtn.onclick = handleSend;
    if (textInput) {
      textInput.onkeydown = e => { if (e.key === 'Enter') handleSend(); };
    }

    document.querySelectorAll('.ast-chip').forEach(chip => {
      chip.onclick = () => {
        const q = chip.dataset.query;
        if (q) processUserVoiceQuery(q);
      };
    });
  }

  // --------------------------------------------------------------------------
  // FEATURE 3: Smart Eye Care Reminders (Complete CRUD + Filters)
  // --------------------------------------------------------------------------
  let activeReminderFilter = 'all';

  async function loadRemindersPrivate() {
    const list = $('reminderList');
    if (!list) return;
    if (!currentUser) {
      list.innerHTML = `<p class="empty">${t('Sign in to save and view personal reminders.', 'தனிப்பட்ட நினைவூட்டல்களுக்கு உள்நுழையவும்.', 'निजी रिमाइंडर के लिए साइन इन करें।')}</p>`;
      return;
    }
    try {
      let rows = isDemo() ? demoRead('reminders') : await window.api('/api/public/reminders');
      if (activeReminderFilter === 'pending') rows = rows.filter(x => !Number(x.completed));
      else if (activeReminderFilter === 'completed') rows = rows.filter(x => Number(x.completed));

      if (!rows.length) {
        list.innerHTML = `<p class="empty">${t('No reminders found for this filter. Add one above.', 'நினைவூட்டல்கள் எதுவும் இல்லை. மேலே ஒன்றைச் சேர்க்கவும்.', 'इस फ़िल्टर के लिए कोई रिमाइंडर नहीं मिला। ऊपर जोड़ें।')}</p>`;
        return;
      }

      list.innerHTML = rows.map(x => {
        const isDone = Number(x.completed) === 1;
        return `
          <div class="item-row ${isDone ? 'completed' : ''}" style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px;background:var(--card);">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                <span class="pill ${isDone ? 'normal' : 'moderate'}">${escapeHtml(x.category || 'General Care')}</span>
                <strong>${escapeHtml(x.title)}</strong>
              </div>
              <p class="muted tiny" style="margin:2px 0;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:2px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${escapeHtml(x.reminder_time || 'Morning')} · <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:2px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(x.reminder_date || 'Ongoing')}
                ${x.description ? `· ${escapeHtml(x.description)}` : ''}
              </p>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              <button type="button" class="button small outline rem-toggle-btn" data-rem-id="${escapeHtml(x.id)}" data-next-status="${isDone ? 0 : 1}">
                ${isDone ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:3px;"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>' + t('Undo', 'மீளமை', 'पूर्ववत') : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:3px;"><polyline points="20 6 9 17 4 12"/></svg>' + t('Complete', 'முடிக்க', 'पूर्ण')}
              </button>
              <button type="button" class="btn-icon rem-edit-btn" data-rem-id="${escapeHtml(x.id)}" title="${t('Edit', 'திருத்து', 'संपादित')}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
              <button type="button" class="btn-icon rem-del-btn" data-rem-id="${escapeHtml(x.id)}" title="${t('Delete', 'நீக்கு', 'हटाएँ')}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
            </div>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.rem-toggle-btn').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.remId;
          const next = parseInt(btn.dataset.nextStatus, 10);
          await toggleReminderComplete(id, next);
          await loadRemindersPrivate();
          loadDashboard();
        };
      });

      list.querySelectorAll('.rem-edit-btn').forEach(btn => {
        btn.onclick = () => openEditReminderModal(btn.dataset.remId);
      });

      list.querySelectorAll('.rem-del-btn').forEach(btn => {
        btn.onclick = async () => {
          if (confirm(t('Delete this reminder?', 'இந்த நினைவூட்டலை நீக்க விரும்புகிறீர்களா?', 'क्या आप इस रिमाइंडर को हटाना चाहते हैं?'))) {
            await deleteReminder(btn.dataset.remId);
            await loadRemindersPrivate();
            loadDashboard();
          }
        };
      });

    } catch (err) {
      list.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    }
  }

  async function toggleReminderComplete(id, completed) {
    if (isDemo()) {
      const rows = demoRead('reminders');
      const item = rows.find(x => String(x.id) === String(id));
      if (item) {
        item.completed = completed;
        demoWrite('reminders', rows);
      }
    } else {
      await window.api(`/api/public/reminders/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
    }
  }

  async function deleteReminder(id) {
    if (isDemo()) {
      let rows = demoRead('reminders');
      rows = rows.filter(x => String(x.id) !== String(id));
      demoWrite('reminders', rows);
    } else {
      await window.api(`/api/public/reminders/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }
  }

  async function cancelAppointment(id) {
    if (isDemo() || !currentUser) {
      const rows = demoRead('appointments');
      const item = rows.find(x => String(x.id) === String(id));
      if (item) item.status = 'Cancelled';
      demoWrite('appointments', rows);
    } else {
      await window.api(`/api/public/appointments/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' })
      });
    }
  }

  function openReminderModal(id = null) {
    if (!currentUser) {
      if (window.navigatePage) window.navigatePage('account');
      else location.hash = '#account';
      return;
    }
    const heading = $('editRemHeading');
    const submitBtn = $('saveRemEditBtn');
    const msg = $('editRemMsg');
    if (msg) msg.textContent = '';

    if (!id) {
      // Create Mode
      if ($('editRemId')) $('editRemId').value = '';
      if ($('editRemTitle')) $('editRemTitle').value = '';
      if ($('editRemDate')) $('editRemDate').value = new Date().toISOString().split('T')[0];
      if ($('editRemCategory')) $('editRemCategory').value = 'Routine checkup';
      if ($('editRemTime')) $('editRemTime').value = '09:00';
      if ($('editRemDesc')) $('editRemDesc').value = '';
      if ($('editRemCompleted')) $('editRemCompleted').checked = false;
      if (heading) heading.textContent = t('Add Eye Care Reminder', 'புதிய கண் நினைவூட்டல்', 'नया नेत्र रिमाइंडर जोड़ें');
      if (submitBtn) submitBtn.textContent = t('Create Reminder', 'நினைவூட்டலை உருவாக்கு', 'रिमाइंडर बनाएँ');
    } else {
      // Edit Mode
      const rows = isDemo() ? demoRead('reminders') : (window._cachedReminders || []);
      let item = rows.find(x => String(x.id) === String(id));
      if (!item && !isDemo()) {
        item = { id, title: '', category: 'Routine checkup', reminder_date: '', reminder_time: '', description: '', completed: 0 };
      }
      if (!item) return;

      if ($('editRemId')) $('editRemId').value = item.id;
      if ($('editRemTitle')) $('editRemTitle').value = item.title || '';
      if ($('editRemDate')) $('editRemDate').value = item.reminder_date || '';
      if ($('editRemCategory')) $('editRemCategory').value = item.category || 'Routine checkup';
      if ($('editRemTime')) $('editRemTime').value = item.reminder_time || '';
      if ($('editRemDesc')) $('editRemDesc').value = item.description || '';
      if ($('editRemCompleted')) $('editRemCompleted').checked = Number(item.completed) === 1;
      if (heading) heading.textContent = t('Edit Eye Care Reminder', 'நினைவூட்டலைத் திருத்து', 'नेत्र रिमाइंडर संपादित करें');
      if (submitBtn) submitBtn.textContent = t('Update Reminder', 'நினைவூட்டலைப் புதுப்பி', 'रिमाइंडर अपडेट करें');
    }

    if ($('reminderEditModal')) $('reminderEditModal').hidden = false;
  }

  function openEditReminderModal(id) {
    return openReminderModal(id);
  }

  if ($('closeRemEditModalBtn')) $('closeRemEditModalBtn').onclick = () => { if ($('reminderEditModal')) $('reminderEditModal').hidden = true; };
  if ($('cancelRemEditBtn')) $('cancelRemEditBtn').onclick = () => { if ($('reminderEditModal')) $('reminderEditModal').hidden = true; };

  if ($('reminderEditForm')) {
    $('reminderEditForm').onsubmit = async e => {
      e.preventDefault();
      const id = ($('editRemId')?.value || '').trim();
      const title = ($('editRemTitle')?.value || '').trim();
      const reminder_date = ($('editRemDate')?.value || '').trim();
      const category = ($('editRemCategory')?.value || 'Routine checkup').trim();
      const reminder_time = ($('editRemTime')?.value || '').trim();
      const description = ($('editRemDesc')?.value || '').trim();
      const completed = $('editRemCompleted')?.checked ? 1 : 0;
      const msg = $('editRemMsg');

      if (!title) {
        if (msg) {
          msg.textContent = t('Please enter a reminder title.', 'நினைவூட்டல் தலைப்பை உள்ளிடவும்.', 'कृपया रिमाइंडर शीर्षक दर्ज करें।');
          msg.className = 'form-message error';
        } else {
          alert(t('Please enter a reminder title.', 'நினைவூட்டல் தலைப்பை உள்ளிடவும்.', 'कृपया रिमाइंडर शीर्षक दर्ज करें।'));
        }
        return;
      }

      const submitBtn = $('saveRemEditBtn');
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (id) {
          // Update existing
          if (isDemo()) {
            const rows = demoRead('reminders');
            const idx = rows.findIndex(x => String(x.id) === String(id));
            if (idx !== -1) {
              rows[idx] = { ...rows[idx], title, reminder_date, category, reminder_time, description, completed };
              demoWrite('reminders', rows);
            }
          } else {
            await window.api(`/api/public/reminders/${encodeURIComponent(id)}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title, reminder_date, category, reminder_time, description, completed })
            });
          }
        } else {
          // Create new
          if (isDemo()) {
            const rows = demoRead('reminders');
            rows.unshift({ id: 'demo-' + Date.now(), title, reminder_date, category, reminder_time, description, completed });
            demoWrite('reminders', rows);
          } else {
            await window.api('/api/public/reminders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title, reminder_date, category, reminder_time, description, completed })
            });
          }
        }

        if ($('reminderEditModal')) $('reminderEditModal').hidden = true;
        await loadRemindersPrivate();
        loadDashboard();
      } catch (err) {
        if (msg) {
          msg.textContent = err.message || 'Operation failed';
          msg.className = 'form-message error';
        } else {
          alert(err.message);
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    };
  }

  if ($('filterRemAll')) $('filterRemAll').onclick = () => setReminderFilter('all');
  if ($('filterRemPending')) $('filterRemPending').onclick = () => setReminderFilter('pending');
  if ($('filterRemCompleted')) $('filterRemCompleted').onclick = () => setReminderFilter('completed');

  function setReminderFilter(f) {
    activeReminderFilter = f;
    [$('filterRemAll'), $('filterRemPending'), $('filterRemCompleted')].forEach(b => b?.classList.remove('active'));
    if (f === 'all') $('filterRemAll')?.classList.add('active');
    else if (f === 'pending') $('filterRemPending')?.classList.add('active');
    else if (f === 'completed') $('filterRemCompleted')?.classList.add('active');
    loadRemindersPrivate();
  }

  if ($('reminderForm')) {
    $('reminderForm').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.currentTarget;
      if (!currentUser) {
        if (window.navigatePage) window.navigatePage('account');
        else location.hash = '#account';
        return;
      }
      const f = new FormData(form);
      const reminder = {
        title: String(f.get('title') || '').trim(),
        reminder_date: f.get('reminder_date') || '',
        category: f.get('category') || 'Routine checkup',
        reminder_time: f.get('reminder_time') || '',
        description: String(f.get('description') || '').trim(),
        completed: 0
      };
      if (!reminder.title) {
        alert(t('Please enter a reminder.', 'நினைவூட்டலை உள்ளிடவும்.', 'रिमाइंडर दर्ज करें।'));
        return;
      }
      const btn = $('addReminderBtn') || form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        if (isDemo()) {
          const rows = demoRead('reminders');
          rows.unshift({ ...reminder, id: 'demo-' + Date.now() });
          demoWrite('reminders', rows);
        } else {
          await window.api('/api/public/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reminder)
          });
        }
        form.reset();
        await loadRemindersPrivate();
        loadDashboard();
      } catch (err) {
        alert(err.message);
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  // --------------------------------------------------------------------------
  // FEATURE 4: Interactive Eye Anatomy (Selectable Parts + Glaucoma Context)
  // --------------------------------------------------------------------------
  let activeAnatomyPart = 'optic_nerve';

  const anatomyData = {
    'optic_nerve': {
      image: '/static/images/anatomy/optic_nerve.jpg',
      title: { en: 'Optic Nerve (Cranial Nerve II)', ta: 'பார்வை நரம்பு (Optic Nerve)', hi: 'ऑप्टिक तंत्रिका (Optic Nerve)' },
      sub: { en: 'The visual cable transmitting ocular light impulses to the brain', ta: 'மூளைக்கு பார்வை சமிக்ஞைகளை கடத்தும் நரம்பு கேபிள்', hi: 'मस्तिष्क तक दृश्य संकेत पहुँचाने वाला केबल' },
      badge: { en: 'PRIMARY OCULAR STRUCTURE', ta: 'முக்கிய கண் அமைப்பு', hi: 'प्राथमिक नेत्र संरचना' },
      func: {
        en: 'The optic nerve is composed of over 1.2 million retinal ganglion cell axons. It carries electrical impulses generated by the photoreceptors of the retina directly to the visual cortex of the brain for image interpretation.',
        ta: 'பார்வை நரம்பு 1.2 மில்லியனுக்கும் அதிகமான நரம்பிழைகளால் உருவானது. இது விழித்திரையிலிருந்து பார்வை சமிக்ஞைகளை மூளைக்கு எடுத்துச் செல்கிறது.',
        hi: 'ऑप्टिक तंत्रिका 1.2 मिलियन से अधिक तंत्रिका तंतुओं से बनी है। यह रेटिना से दृश्य संकेतों को सीधे मस्तिष्क तक ले जाती है।'
      },
      glaucoma: {
        en: 'Glaucoma is primarily an optic neuropathy. When fluid pressure inside the eye (intraocular pressure) rises or when vascular perfusion is insufficient, the delicate nerve fibers within the optic nerve suffer irreversible progressive damage. In fundus image screening, eye care algorithms assess the health, color, and margin of the optic nerve head to detect early thinning or nerve fiber loss before peripheral vision is permanently degraded.',
        ta: 'குளுக்கோமா என்பது பார்வை நரம்பைப் பாதிக்கும் முதன்மை நோயாகும். கண் உள் அழுத்தம் அதிகரிக்கும் போது, நரம்பிழைகள் நிரந்தரமாக சேதமடைகின்றன. எங்கள் AI பரிசோதனை பார்வை நரம்பின் விளிம்புகளை ஆய்வு செய்து ஆரம்ப நிலையிலேயே நரம்பு இழப்பைக் கண்டறிகிறது.',
        hi: 'ग्लूकोमा मुख्य रूप से ऑप्टिक न्यूरोपैथी है। जब आँख का दबाव बढ़ता है, तो तंत्रिका तंतुओं को नुकसान पहुँचता है। फंडस स्क्रीनिंग में शुरुआती नुकसान का पता लगाने के लिए ऑप्टिक नर्व हेड का विश्लेषण किया जाता है।'
      }
    },
    'optic_disc': {
      image: '/static/images/anatomy/optic_disc.jpg',
      title: { en: 'Optic Disc (Optic Nerve Head)', ta: 'பார்வை வட்டு (Optic Disc)', hi: 'ऑप्टिक डिस्क (Optic Disc)' },
      sub: { en: 'The entry/exit boundary for retinal nerve fibers', ta: 'நரம்பிழைகள் வெளியேறும் எல்லைப் பகுதி', hi: 'तंत्रिका तंतुओं का निकास क्षेत्र' },
      badge: { en: 'SCREENING BIOMARKER', ta: 'பரிசோதனை அளவீடு', hi: 'स्क्रीनिंग बायोमार्कर' },
      func: {
        en: 'The anatomical circular region where ganglion cell axons gather and exit the eye to form the optic nerve. Contains no photoreceptors (the physiological blind spot).',
        ta: 'நரம்பிழைகள் ஒன்றிணைந்து கண்ணை விட்டு வெளியேறும் வட்ட வடிவிலான பகுதி. இங்கு பார்வை உணர்வு இல்லை (இயற்கையான குருட்டுப் புள்ளி).',
        hi: 'वह गोल क्षेत्र जहाँ तंत्रिका तंतु मिलकर आँख से बाहर निकलते हैं। इसमें कोई फोटोरिसेप्टर नहीं होता।'
      },
      glaucoma: {
        en: 'The optic disc margin is the reference boundary for calculating the Cup-to-Disc Ratio (CDR). Glaucoma causes progressive neuroretinal rim thinning and disc hemorrhages, which our AI algorithms detect.',
        ta: 'கப்-டு-டிஸ்க் விகிதத்தை (CDR) கணக்கிட பார்வை வட்டின் விளிம்பு பயன்படுகிறது. குளுக்கோமா வட்டின் விளிம்புகளை மெலிதாக்குகிறது, இதை AI அடையாளம் காண்கிறது.',
        hi: 'ऑप्टिक डिस्क कप-टू-डिस्क अनुपात (CDR) की गणना का मुख्य आधार है। ग्लूकोमा इसके किनारों को पतला कर देता है।'
      }
    },
    'optic_cup': {
      image: '/static/images/anatomy/optic_cup.jpg',
      title: { en: 'Optic Cup (Central Depression)', ta: 'பார்வை கிண்ணம் (Optic Cup)', hi: 'ऑप्टिक कप (Optic Cup)' },
      sub: { en: 'The central physiological indentation within the optic disc', ta: 'பார்வை வட்டின் மையத்தில் உள்ள பள்ளம்', hi: 'ऑप्टिक डिस्क के केंद्र में स्थित गड्ढा' },
      badge: { en: 'CDR RATIO CORE', ta: 'CDR மையப் பகுதி', hi: 'CDR अनुपात केंद्र' },
      func: {
        en: 'In healthy eyes, the cup occupies less than half of the disc diameter (CDR ratio between 0.20 and 0.40). Its pale whitish appearance contrasts against the pink neuroretinal rim.',
        ta: 'ஆரோக்கியமான கண்களில், இக்கிண்ணம் வட்டின் பாதியை விடக் குறைவாகவே இருக்கும் (CDR 0.20 முதல் 0.40 வரை). இது வெளிறிய நிறத்தில் இருக்கும்.',
        hi: 'स्वस्थ आँखों में, यह डिस्क के आधे से कम हिस्से को घेरता है (CDR 0.20 से 0.40)।'
      },
      glaucoma: {
        en: 'As glaucoma destroys surrounding axons, the cup hollows out and enlarges ("cupping"). A vertical CDR ≥ 0.60 or asymmetrical cupping between eyes is a key hallmark indicator of glaucoma.',
        ta: 'குளுக்கோமாவால் நரம்புகள் அழியும்போது, இக்கிண்ணம் பெரிதாகிறது (Cupping). CDR அளவு 0.60 அல்லது அதற்கு மேல் அதிகரிப்பது குளுக்கோமாவின் முக்கிய அறிகுறியாகும்.',
        hi: 'जैसे-जैसे ग्लूकोमा तंतुओं को नष्ट करता है, कप बड़ा होता जाता है। CDR ≥ 0.60 होना ग्लूकोमा का प्रमुख संकेत है।'
      }
    },
    'retina': {
      image: '/static/images/anatomy/retina.jpg',
      title: { en: 'Retina & Nerve Fiber Layer (RNFL)', ta: 'விழித்திரை (Retina & RNFL)', hi: 'रेटिना और तंत्रिका फाइबर परत' },
      sub: { en: 'Light-sensitive neural canvas at the posterior globe', ta: 'கண்ணின் ஒளி உணர் நரம்பு அடுக்கு', hi: 'प्रकाश संवेदी न्यूरल परत' },
      badge: { en: 'PHOTORECEPTOR CANVAS', ta: 'ஒளி ஏற்பி அடுக்கு', hi: 'फोटोरिसेप्टर परत' },
      func: {
        en: 'Converts focused optical light into electrochemical neuro-signals via rods and cones, initiating the process of vision.',
        ta: 'கண்ணில் விழும் ஒளியை நரம்பு சமிக்ஞைகளாக மாற்றி பார்வைக்கு உதவுகிறது.',
        hi: 'रॉड्स और कोन्स के माध्यम से प्रकाश को न्यूरो-सिग्नल में परिवर्तित करता है।'
      },
      glaucoma: {
        en: 'Retinal Nerve Fiber Layer (RNFL) bundle defects and thinning often precede detectable visual field loss by several years. Fundus screening analyzes RNFL integrity.',
        ta: 'பார்வை இழப்பு வெளிப்படையாகத் தெரிவதற்கு பல ஆண்டுகளுக்கு முன்பே விழித்திரை நரம்பிழைகள் மெலியத் தொடங்கும். இதை எங்கள் பரிசோதனை மதிப்பீடு செய்கிறது.',
        hi: 'दृष्टि हानि महसूस होने से कई साल पहले ही रेटिना तंत्रिका परत पतली होने लगती है।'
      }
    },
    'cornea': {
      image: '/static/images/anatomy/cornea.jpg',
      title: { en: 'Cornea (Clear Front Window)', ta: 'விழிவெண்படலம் (Cornea)', hi: 'कॉर्निया (पारदर्शी खिड़की)' },
      sub: { en: 'The transparent anterior optical dome', ta: 'கண்ணின் முன்புற ஒளிபுகும் படலம்', hi: 'पारदर्शी पूर्वकाल ऑप्टिकल गुंबद' },
      badge: { en: 'OPTICAL REFRACTION', ta: 'ஒளிவிலகல் அமைப்பு', hi: 'ऑप्टिकल अपवर्तन' },
      func: {
        en: 'The transparent anterior dome of the eye providing approximately two-thirds of the total optical refractive focusing power.',
        ta: 'கண்ணின் முன்புறம் உள்ள ஒளி ஊடுருவக்கூடிய பகுதி; ஒளியை ஒருமுகப்படுத்த உதவுகிறது.',
        hi: 'आँख का पारदर्शी अगला हिस्सा जो कुल फोकसिंग शक्ति का दो-तिहाई प्रदान करता है।'
      },
      glaucoma: {
        en: 'Central Corneal Thickness (CCT) significantly impacts intraocular pressure (IOP) tonometer measurements. Thinner corneas artificially lower pressure readings, masking real glaucoma risk.',
        ta: 'விழிவெண்படலத்தின் தடிமன் கண் அழுத்த அளவீட்டைப் பாதிக்கிறது. மெல்லிய படலம் உண்மையான அதிக அழுத்தத்தை மறைக்கக்கூடும்.',
        hi: 'कॉर्निया की मोटाई इंट्राओकुलर दबाव (IOP) माप को प्रभावित करती है। पतला कॉर्निया वास्तविक उच्च दबाव को छिपा सकता है।'
      }
    },
    'lens': {
      image: '/static/images/anatomy/lens.jpg',
      title: { en: 'Crystalline Lens', ta: 'கண் லென்ஸ் (Lens)', hi: 'क्रिस्टलीय लेंस (Lens)' },
      sub: { en: 'Dynamic refractive focusing element', ta: 'பார்வை குவிய அமைப்பு', hi: 'गतिशील फोकसिंग तत्व' },
      badge: { en: 'DYNAMIC ACCOMMODATION', ta: 'பார்வை குவிய அமைப்பு', hi: 'गतिशील आवास' },
      func: {
        en: 'Changes shape to dynamically focus light on the retina at varying distances (accommodation for near and distance vision).',
        ta: 'அருகிலுள்ள மற்றும் தூரத்திலுள்ள பொருட்களைத் தெளிவாகப் பார்க்க ஒளியை விழித்திரையில் குவிக்கிறது.',
        hi: 'विभिन्न दूरियों पर प्रकाश को रेटिना पर केंद्रित करने के लिए अपना आकार बदलता है।'
      },
      glaucoma: {
        en: 'Age-related lens swelling or thickening can push the iris forward, narrowing or completely blocking the anterior chamber angle and triggering acute angle-closure glaucoma.',
        ta: 'முதுமையால் லென்ஸ் தடிமனாகும்போது, அது கண் நீரோட்டப் பாதையை அடைத்து தீவிர குளுக்கோமா பாதிப்பை ஏற்படுத்தலாம்.',
        hi: 'உम्र के साथ लेंस के मोटे होने से कोण बंद हो सकता है, जिससे एंगल-क्लोज़र ग्लूकोमा हो सकता है।'
      }
    }
  };

  function renderAnatomyDetails(partKey) {
    activeAnatomyPart = partKey;
    const data = anatomyData[partKey];
    if (!data) return;

    const l = lang();
    if ($('anatomyPartTitle')) $('anatomyPartTitle').textContent = data.title[l] || data.title.en;
    if ($('anatomyPartSubtitle')) $('anatomyPartSubtitle').textContent = data.sub[l] || data.sub.en;
    if ($('anatomyPartCategory')) $('anatomyPartCategory').textContent = data.badge[l] || data.badge.en;
    if ($('anatomyFunctionText')) $('anatomyFunctionText').textContent = data.func[l] || data.func.en;
    if ($('anatomyGlaucomaText')) $('anatomyGlaucomaText').textContent = data.glaucoma[l] || data.glaucoma.en;

    // Dynamically update the medical photo view with smooth transition
    const dynamicImg = $('anatomyDynamicImg');
    if (dynamicImg && data.image) {
      dynamicImg.style.opacity = '0.3';
      dynamicImg.src = data.image;
      dynamicImg.alt = data.title[l] || data.title.en;
      dynamicImg.onload = () => { dynamicImg.style.opacity = '1'; };
    }
    if ($('anatomyPhotoTitle')) $('anatomyPhotoTitle').textContent = data.title[l] || data.title.en;
    if ($('anatomyPhotoCaption')) $('anatomyPhotoCaption').textContent = data.sub[l] || data.sub.en;

    // Update chip buttons
    document.querySelectorAll('.anatomy-chip').forEach(chip => {
      const isCurrent = chip.dataset.part === partKey;
      chip.classList.toggle('active', isCurrent);
      chip.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
    });

    // Update SVG part paths
    document.querySelectorAll('.anatomy-part').forEach(part => {
      part.classList.toggle('selected-part', part.dataset.part === partKey);
    });

    // Update numbered SVG pins
    document.querySelectorAll('.anatomy-pin').forEach(pin => {
      pin.classList.toggle('active', pin.dataset.part === partKey);
    });
  }

  function setupEyeAnatomy() {
    document.querySelectorAll('.anatomy-chip').forEach(chip => {
      chip.onclick = () => renderAnatomyDetails(chip.dataset.part);
    });

    document.querySelectorAll('.anatomy-part').forEach(part => {
      part.onclick = () => {
        const key = part.dataset.part;
        if (key) renderAnatomyDetails(key);
      };
    });

    document.querySelectorAll('.anatomy-pin').forEach(pin => {
      pin.onclick = () => {
        const key = pin.dataset.part;
        if (key) renderAnatomyDetails(key);
      };
    });

    // View mode switchers (Photo View vs Diagram View)
    const btnPhoto = $('btnViewPhoto');
    const btnDiagram = $('btnViewDiagram');
    const photoContainer = $('anatomyImageContainer');
    const svgContainer = $('anatomySvgContainer');

    if (btnPhoto && btnDiagram) {
      btnPhoto.onclick = () => {
        btnPhoto.classList.add('active');
        btnDiagram.classList.remove('active');
        if (photoContainer) photoContainer.style.display = 'flex';
        if (svgContainer) svgContainer.style.display = 'none';
      };
      btnDiagram.onclick = () => {
        btnDiagram.classList.add('active');
        btnPhoto.classList.remove('active');
        if (photoContainer) photoContainer.style.display = 'none';
        if (svgContainer) svgContainer.style.display = 'block';
      };
    }

    renderAnatomyDetails('optic_nerve');
  }

  // --------------------------------------------------------------------------
  // FEATURE 5: Doctor Appointment Booking Workflow
  // --------------------------------------------------------------------------
  let selectedDoctorForBooking = null;

  function setupAppointments() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.book-doctor-btn');
      if (btn) {
        selectedDoctorForBooking = {
          id: btn.dataset.docId || 'doc-gen',
          name: btn.dataset.docName || 'Specialist Ophthalmologist',
          specialization: btn.dataset.docSpec || 'Ophthalmologist',
          hospital: btn.dataset.docHosp || 'Eye Care Hospital',
          city: btn.dataset.docCity || 'Karur'
        };
        openAppointmentModal();
      }
    });

    if ($('closeAptModalBtn')) $('closeAptModalBtn').onclick = () => { if ($('appointmentModal')) $('appointmentModal').hidden = true; };
    if ($('cancelAptModalBtn')) $('cancelAptModalBtn').onclick = () => { if ($('appointmentModal')) $('appointmentModal').hidden = true; };

    if ($('appointmentForm')) {
      $('appointmentForm').onsubmit = async e => {
        e.preventDefault();
        const appointment_date = $('aptDateInput').value;
        const appointment_time = $('aptTimeInput').value;
        const patient_name = $('aptPatientNameInput').value.trim();
        const patient_phone = $('aptPatientPhoneInput').value.trim();
        const reason = $('aptReasonInput').value.trim();

        if (!appointment_date || !appointment_time || !patient_name || !patient_phone) {
          alert(t('Please fill in required fields.', 'தேவையான அனைத்து விவரங்களையும் நிரப்பவும்.', 'कृपया सभी आवश्यक फ़ील्ड भरें।'));
          return;
        }

        const payload = {
          doctor_id: selectedDoctorForBooking?.id || $('aptDoctorId')?.value || 'doc-1',
          doctor_name: selectedDoctorForBooking?.name || 'Eye Specialist',
          specialization: selectedDoctorForBooking?.specialization || 'Ophthalmologist',
          hospital_name: selectedDoctorForBooking?.hospital || 'Eye Care Clinic',
          city: selectedDoctorForBooking?.city || 'Karur',
          appointment_date,
          appointment_time,
          patient_name,
          patient_phone,
          reason,
          status: 'Requested'
        };

        const submitBtn = $('submitAptModalBtn');
        if (submitBtn) submitBtn.disabled = true;

        try {
          if (isDemo() || !currentUser) {
            const list = demoRead('appointments');
            list.unshift({ ...payload, id: 'demo-appt-' + Date.now(), created_at: new Date().toISOString() });
            demoWrite('appointments', list);
          } else {
            await window.api('/api/public/appointments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          }

          alert(t('Appointment request submitted! The clinic will review your request.', 'சந்திப்பு கோரிக்கை சமர்ப்பிக்கப்பட்டது!', 'अपॉइंटमेंट अनुरोध सबमिट किया गया!'));
          if ($('appointmentModal')) $('appointmentModal').hidden = true;
          loadAppointments();
          loadDashboard();
        } catch (err) {
          alert(err.message);
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      };
    }

    if ($('refreshAppointmentsBtn')) $('refreshAppointmentsBtn').onclick = loadAppointments;
    loadAppointments();
  }

  function openAppointmentModal() {
    if (!$('appointmentModal')) return;
    if ($('aptModalDoctorName')) $('aptModalDoctorName').textContent = selectedDoctorForBooking?.name || 'Eye Specialist';
    if ($('aptModalDoctorInfo')) $('aptModalDoctorInfo').textContent = `${selectedDoctorForBooking?.hospital || ''} (${selectedDoctorForBooking?.city || ''}) · ${selectedDoctorForBooking?.specialization || 'Ophthalmologist'}`;
    if ($('aptPatientNameInput') && currentUser) $('aptPatientNameInput').value = currentUser.name || '';
    $('appointmentModal').hidden = false;
  }

  async function loadAppointments() {
    const list = $('appointmentList');
    if (!list) return;

    try {
      const rows = (isDemo() || !currentUser) ? demoRead('appointments') : await window.api('/api/public/appointments');
      if (!rows || !rows.length) {
        list.innerHTML = `<p class="empty">${t('No consultation requests submitted yet. Use the doctor directory above to request an appointment.', 'இன்னும் சந்திப்பு கோரிக்கைகள் இல்லை.', 'अभी तक कोई अपॉइंटमेंट अनुरोध नहीं है।')}</p>`;
        return;
      }

      list.innerHTML = rows.map(a => {
        const isCancelled = a.status === 'Cancelled';
        return `
          <div class="item-row ${isCancelled ? 'cancelled' : ''}" style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px;background:var(--card);">
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:gap:8px;">
                <strong>${escapeHtml(a.doctor_name)}</strong>
                <span class="pill ${isCancelled ? 'suspect' : (a.status === 'Confirmed' ? 'normal' : 'moderate')}">
                  ${escapeHtml(a.status || 'Requested')}
                </span>
              </div>
              <p class="muted tiny" style="margin:2px 0;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px;"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/><line x1="10" y1="9" x2="14" y2="9"/><line x1="12" y1="7" x2="12" y2="11"/></svg>${escapeHtml(a.hospital_name || a.city)} · <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px;"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>${escapeHtml(a.specialization || 'Ophthalmology')}</p>
              <p class="tiny" style="margin:4px 0;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><strong>${escapeHtml(a.appointment_date)}</strong> · <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${escapeHtml(a.appointment_time)}</p>
              <p class="muted tiny" style="margin:2px 0;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escapeHtml(a.patient_name)} (${escapeHtml(a.patient_phone)}) ${a.reason ? `· "${escapeHtml(a.reason)}"` : ''}</p>
            </div>
            ${!isCancelled ? `
              <div style="margin-left:12px;">
                <button type="button" class="button outline small cancel-appt-btn" data-appt-id="${escapeHtml(a.id)}">${t('Cancel Request', 'கோரிக்கையை ரத்து செய்', 'अनुरोध रद्द करें')}</button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      list.querySelectorAll('.cancel-appt-btn').forEach(btn => {
        btn.onclick = async () => {
          if (confirm(t('Cancel this appointment request?', 'இந்த சந்திப்பு கோரிக்கையை ரத்து செய்ய விரும்புகிறீர்களா?', 'क्या आप इस अनुरोध को रद्द करना चाहते हैं?'))) {
            const id = btn.dataset.apptId;
            if (isDemo() || !currentUser) {
              const rows = demoRead('appointments');
              const item = rows.find(x => String(x.id) === String(id));
              if (item) item.status = 'Cancelled';
              demoWrite('appointments', rows);
            } else {
              await window.api(`/api/public/appointments/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Cancelled' })
              });
            }
            loadAppointments();
            loadDashboard();
          }
        };
      });

    } catch (e) {
      list.innerHTML = `<p class="empty">${escapeHtml(e.message)}</p>`;
    }
  }

  // --------------------------------------------------------------------------
  // FEATURE 6: Eye Health & Glaucoma Quiz
  // --------------------------------------------------------------------------
  const quizData = [
    {
      q: {
        en: 'Why is glaucoma frequently called the "silent thief of sight"?',
        ta: 'குளுக்கோமா ஏன் "பார்வையைத் திருடும் அமைதியான திருடன்" என்று அழைக்கப்படுகிறது?',
        hi: 'ग्लूकोमा को अक्सर दृष्टि का "मूक चोर" क्यों कहा जाता है?'
      },
      options: [
        { en: 'It only develops during night sleep', ta: 'இரவில் தூங்கும் போது மட்டுமே இது தோன்றும்', hi: 'यह केवल रात में सोने के दौरान होता है', correct: false },
        { en: 'Early stages have zero noticeable pain or vision symptoms', ta: 'ஆரம்ப கட்டங்களில் வலி அல்லது பார்வை மங்கல் போன்ற அறிகுறிகள் தெரிவதில்லை', hi: 'शुरुआती चरणों में कोई दर्द या दृश्य लक्षण नहीं होते हैं', correct: true },
        { en: 'It permanently changes the color of the iris', ta: 'இது கருவிழியின் நிறத்தை நிரந்தரமாக மாற்றுகிறது', hi: 'यह परितारिका का रंग बदल देता है', correct: false },
        { en: 'It is caused exclusively by reading in poor light', ta: 'மங்கலான வெளிச்சத்தில் படிப்பதால் மட்டுமே ஏற்படுகிறது', hi: 'यह केवल कम रोशनी में पढ़ने से होता है', correct: false }
      ],
      insight: {
        en: 'Open-angle glaucoma typically develops painlessly with normal central vision intact, slowly destroying peripheral nerve fibers without early warning.',
        ta: 'குளுக்கோமா பொதுவாக எந்த வலியும் இல்லாமல் தொடங்கி, நரம்புகளை அமைதியாக அழித்து, தாமதமாகவே தெரியவரும்.',
        hi: 'ओपन-एंगल ग्लूकोमा आमतौर पर बिना किसी दर्द के विकसित होता है और धीरे-धीरे दृष्टि को नुकसान पहुँचाता है।'
      }
    },
    {
      q: {
        en: 'What is a typical healthy Cup-to-Disc Ratio (CDR) in an optic nerve evaluation?',
        ta: 'பார்வை நரம்பு பரிசோதனையில் வழக்கமான ஆரோக்கியமான கப்-டு-டிஸ்க் விகிதம் (CDR) எது?',
        hi: 'ऑप्टिक तंत्रिका मूल्यांकन में एक सामान्य स्वस्थ कप-टू-डिस्क अनुपात (CDR) क्या है?'
      },
      options: [
        { en: '0.80 to 0.95', ta: '0.80 முதல் 0.95 வரை', hi: '0.80 से 0.95', correct: false },
        { en: '0.30 to 0.40', ta: '0.30 முதல் 0.40 வரை', hi: '0.30 से 0.40', correct: true },
        { en: '1.20 to 1.50', ta: '1.20 முதல் 1.50 வரை', hi: '1.20 से 1.50', correct: false },
        { en: '0.00 (no optic cup should ever exist)', ta: '0.00 (கிண்ணம் இருக்கவே கூடாது)', hi: '0.00 (कोई कप नहीं होना चाहिए)', correct: false }
      ],
      insight: {
        en: 'A standard healthy optic cup is compact, occupying about 30% to 40% of the disc diameter. CDR ≥ 0.60 suggests significant cupping and loss of neural tissue.',
        ta: 'ஆரோக்கியமான கண்களில் கிண்ணம் வட்டின் 30% முதல் 40% வரை மட்டுமே இருக்கும். CDR 0.60-க்கு மேல் இருந்தால் அது நரம்பு பாதிப்பைக் குறிக்கும்.',
        hi: 'एक स्वस्थ ऑप्टिक कप डिस्क के लगभग 30% से 40% हिस्से को घेरता है। 0.60 से अधिक अनुपात गंभीर संकेत है।'
      }
    },
    {
      q: {
        en: 'What is the primary modifiable risk factor for glaucoma optic nerve damage?',
        ta: 'குளுக்கோமா நரம்பு பாதிப்பைத் தடுக்க மாற்றியமைக்கக்கூடிய முக்கிய காரணி எது?',
        hi: 'ग्लूकोमा से होने वाले तंत्रिका नुकसान का मुख्य नियंत्रणीय कारक क्या है?'
      },
      options: [
        { en: 'Dietary sugar consumption only', ta: 'உணவில் உள்ள சர்க்கரை அளவு மட்டுமே', hi: 'केवल आहार में चीनी का सेवन', correct: false },
        { en: 'High intraocular pressure (IOP)', ta: 'அதிகரித்த கண் உள் அழுத்தம் (IOP)', hi: 'उच्च इंट्राओकुलर दबाव (IOP)', correct: true },
        { en: 'Lack of vitamin C', ta: 'வைட்டமின் சி குறைபாடு', hi: 'विटामिन सी की कमी', correct: false },
        { en: 'Wearing reading glasses', ta: 'வாசிப்பு கண்ணாடிகள் அணிவது', hi: 'रीडिंग चश्मा पहनना', correct: false }
      ],
      insight: {
        en: 'Intraocular pressure (IOP) is currently the only clinically proven modifiable risk factor. Lowering IOP with prescription drops, laser, or surgery preserves sight.',
        ta: 'கண் அழுத்தத்தைக் குறைப்பதே பார்வை இழப்பைத் தடுக்கும் ஒரே நிரூபிக்கப்பட்ட மருத்துவ முறையாகும்.',
        hi: 'इंट्राओकुलर दबाव को नियंत्रित करना ही दृष्टि बचाने का मुख्य चिकित्सीय तरीका है।'
      }
    },
    {
      q: {
        en: 'How frequently should adults aged 40 and older have a comprehensive dilated eye exam?',
        ta: '40 வயதுக்கு மேற்பட்டவர்கள் எவ்வளவு காலத்திற்கு ஒருமுறை விரிவான கண் பரிசோதனை செய்ய வேண்டும்?',
        hi: '40 वर्ष और उससे अधिक उम्र के वयस्कों को कितनी बार व्यापक नेत्र जाँच करानी चाहिए?'
      },
      options: [
        { en: 'Only when severe eye pain occurs', ta: 'கடுமையான கண் வலி ஏற்படும் போது மட்டுமே', hi: 'केवल तभी जब गंभीर आँख दर्द हो', correct: false },
        { en: 'Every 1 to 2 years', ta: 'ஒவ்வொரு 1 முதல் 2 ஆண்டுகளுக்கு ஒருமுறை', hi: 'प्रत्येक 1 से 2 वर्ष में एक बार', correct: true },
        { en: 'Once every 10 years', ta: '10 ஆண்டுகளுக்கு ஒருமுறை', hi: '10 साल में एक बार', correct: false },
        { en: 'Never unless spectacles break', ta: 'கண்ணாடி உடையும் வரை அவசியமில்லை', hi: 'कभी नहीं जब तक चश्मा न टूटे', correct: false }
      ],
      insight: {
        en: 'Glaucoma prevalence rises substantially after age 40. Routine dilated eye exams allow specialists to examine the optic nerve head before irreversible vision loss occurs.',
        ta: '40 வயதுக்கு மேல் குளுக்கோமா அபாயம் கணிசமாக அதிகரிக்கிறது. வழக்கமான பரிசோதனை பார்வையைப் பாதுகாக்க உதவுகிறது.',
        hi: '40 की उम्र के बाद ग्लूकोमा का खतरा काफी बढ़ जाता है। नियमित जाँच से समय पर इसका पता लगाया जा सकता है।'
      }
    },
    {
      q: {
        en: 'What is the scientifically recommended "20-20-20 rule" for digital eye comfort?',
        ta: 'டிஜிட்டல் கண் சோர்வைத் தடுக்க பரிந்துரைக்கப்படும் "20-20-20 விதி" என்ன?',
        hi: 'डिजिटल आँखों के तनाव को कम करने के लिए वैज्ञानिक रूप से अनुशंसित "20-20-20 नियम" क्या है?'
      },
      options: [
        { en: 'Every 20 minutes, gaze 20 feet away for at least 20 seconds', ta: 'ஒவ்வொரு 20 நிமிடங்களுக்கும், 20 அடி தூரத்திலுள்ள பொருளை 20 விநாடிகள் பார்க்கவும்', hi: 'हर 20 मिनट में, कम से कम 20 सेकंड के लिए 20 फीट दूर देखें', correct: true },
        { en: 'Blink 20 times every 20 hours', ta: '20 மணி நேரத்திற்கு 20 முறை சிமிட்டவும்', hi: 'हर 20 घंटे में 20 बार पलकें झपकाएँ', correct: false },
        { en: 'Drink 20 glasses of water before 2:00 PM', ta: 'மதியம் 2:00 மணிக்குள் 20 டம்ளர் தண்ணீர் குடிக்கவும்', hi: 'दोपहर 2 बजे से पहले 20 गिलास पानी पिएँ', correct: false },
        { en: 'Read screens continuously for 20 minutes with eyes closed', ta: 'கண்களை மூடிக்கொண்டு 20 நிமிடங்கள் படிக்கவும்', hi: 'आँखें बंद करके 20 मिनट तक स्क्रीन पढ़ें', correct: false }
      ],
      insight: {
        en: 'Looking into the distance relaxes the ciliary muscles within the eye and prompts natural blink reflex lubrication, minimizing digital eye fatigue.',
        ta: 'தூரத்துப் பொருளைப் பார்ப்பது கண் தசைகளைத் தளர்த்தி கண் சோர்வைக் குறைக்கிறது.',
        hi: 'दूर देखने से आँखों की सिलिअरी मांसपेशियों को आराम मिलता है और थकान कम होती है।'
      }
    }
  ];

  let quizCurrentIndex = 0;
  let quizScore = 0;
  let quizAnswered = false;

  function renderQuizQuestion() {
    const counterText = $('quizCounterText');
    const pBar = $('quizProgressBar');
    const qTextEl = $('quizQuestionText');
    const optsBox = $('quizOptionsList');
    const expBox = $('quizExplanationBox');
    const expBadge = $('quizExpBadge');
    const expText = $('quizExpText');
    const nextBtn = $('quizNextBtn');
    const quizCont = $('quizContainer');
    const resultScreen = $('quizResultScreen');
    const liveScore = $('quizLiveScore');

    if (!qTextEl || !optsBox) return;

    if (quizCurrentIndex >= quizData.length) {
      if (quizCont) quizCont.hidden = true;
      if (resultScreen) {
        resultScreen.hidden = false;
        if ($('quizFinalScoreNumber')) $('quizFinalScoreNumber').textContent = `${quizScore} / ${quizData.length}`;
        if ($('quizScorePercentage')) $('quizScorePercentage').textContent = `${Math.round((quizScore / quizData.length) * 100)}% Accuracy`;
        let msg = t('Regular comprehensive eye exams are essential because early-stage glaucoma exhibits no pain or noticeable symptoms. Scheduling routine exams every 1 to 2 years protects against irreversible vision loss.', 'ஆரம்ப நிலையிலேயே குளுக்கோமாவைக் கண்டறிய வழக்கமான கண் பரிசோதனை அவசியம்.', 'शुरुआती ग्लूकोमा का पता लगाने के लिए नियमित नेत्र जाँच आवश्यक है।');
        if ($('quizRecText')) $('quizRecText').textContent = msg;
      }
      return;
    }

    if (quizCont) quizCont.hidden = false;
    if (resultScreen) resultScreen.hidden = true;
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.textContent = (quizCurrentIndex === quizData.length - 1)
        ? t('View Results', 'முடிவுகளைக் காண்க', 'परिणाम देखें')
        : t('Next Question →', 'அடுத்த கேள்வி →', 'अगला प्रश्न →');
    }
    if (expBox) expBox.hidden = true;

    quizAnswered = false;
    const item = quizData[quizCurrentIndex];
    const l = lang();

    if (counterText) counterText.textContent = `${t('Question', 'கேள்வி', 'प्रश्न')} ${quizCurrentIndex + 1} ${t('of 5', '/ 5', '/ 5')}`;
    if (pBar) pBar.style.width = `${((quizCurrentIndex + 1) / quizData.length) * 100}%`;
    if (liveScore) liveScore.innerHTML = `<span id="quizScoreLabel">${t('Score:', 'மதிப்பெண்:', 'स्कोर:')}</span> <strong>${quizScore} / ${quizData.length}</strong>`;

    qTextEl.textContent = item.q[l] || item.q.en;

    optsBox.innerHTML = item.options.map((opt, i) => `
      <button type="button" class="quiz-option-card" data-idx="${i}" style="width:100%;text-align:left;padding:12px 16px;border:1.5px solid var(--line);border-radius:10px;margin-bottom:8px;background:var(--card);cursor:pointer;display:flex;align-items:center;gap:12px;font-size:14px;">
        <span style="font-weight:700;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--bg);border:1px solid var(--line);">${String.fromCharCode(65 + i)}</span>
        <span>${escapeHtml(opt[l] || opt.en)}</span>
      </button>
    `).join('');

    optsBox.querySelectorAll('.quiz-option-card').forEach(btn => {
      btn.onclick = () => {
        if (quizAnswered) return;
        quizAnswered = true;
        const chosenIdx = parseInt(btn.dataset.idx, 10);
        const chosenOpt = item.options[chosenIdx];

        optsBox.querySelectorAll('.quiz-option-card').forEach((b, idx) => {
          b.disabled = true;
          if (item.options[idx].correct) {
            b.style.borderColor = '#10b981';
            b.style.background = '#ecfdf5';
          } else if (idx === chosenIdx) {
            b.style.borderColor = '#ef4444';
            b.style.background = '#fef2f2';
          }
        });

        if (chosenOpt.correct) quizScore++;
        if (liveScore) liveScore.innerHTML = `<span id="quizScoreLabel">${t('Score:', 'மதிப்பெண்:', 'स्कोर:')}</span> <strong>${quizScore} / ${quizData.length}</strong>`;

        if (expBox) {
          expBox.hidden = false;
          if (expBadge) {
            expBadge.innerHTML = chosenOpt.correct
              ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:3px;"><polyline points="20 6 9 17 4 12"/></svg>' + t('Correct!', 'சரியானது!', 'सही!')
              : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:3px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' + t('Incorrect', 'தவறானது', 'गलत');
            expBadge.style.background = chosenOpt.correct ? '#10b981' : '#ef4444';
          }
          if (expText) expText.textContent = item.insight[l] || item.insight.en;
        }

        if (nextBtn) nextBtn.disabled = false;
      };
    });
  }

  function setupQuiz() {
    if ($('quizNextBtn')) {
      $('quizNextBtn').onclick = () => {
        quizCurrentIndex++;
        renderQuizQuestion();
      };
    }
    const restart = () => {
      quizCurrentIndex = 0;
      quizScore = 0;
      renderQuizQuestion();
    };
    if ($('quizRestartBtn')) $('quizRestartBtn').onclick = restart;
    if ($('quizPlayAgainBtn')) $('quizPlayAgainBtn').onclick = restart;
    renderQuizQuestion();
  }

  // --------------------------------------------------------------------------
  // EXISTING FEATURES PRESERVED: Records Management (CRUD with MySQL)
  // --------------------------------------------------------------------------
  let activeDeleteRecordId = null;

  async function renderRecords() {
    const list = $('recordList');
    if (!list) return;
    if (!currentUser) {
      list.innerHTML = `<p class="empty">${t('Sign in to save and view your personal records. ', 'உங்கள் தனிப்பட்ட பதிவுகளைப் பார்க்க அல்லது சேமிக்க உள்நுழையவும்.', 'अपने निजी रिकॉर्ड देखने या सहेजने के लिए साइन इन करें।')}<a href="#account">${t('Sign in', 'உள்நுழை', 'साइन इन')}</a></p>`;
      return;
    }

    try {
      const rows = isDemo() ? demoRead('records') : await window.api('/api/public/records');
      if (!rows.length) {
        list.innerHTML = `<p class="empty">${t('No saved records yet. Add your first record above.', 'இன்னும் பதிவுகள் இல்லை. மேலே உங்கள் முதல் பதிவைச் சேர்க்கவும்.', 'अभी कोई रिकॉर्ड नहीं है। ऊपर अपना पहला रिकॉर्ड जोड़ें।')}</p>`;
        return;
      }

      list.innerHTML = `
        <table class="records-table">
          <thead>
            <tr>
              <th>${t('Record Title / Type', 'பதிவின் தலைப்பு / வகை', 'शीर्षक / प्रकार')}</th>
              <th>${t('Record Date', 'தேதி', 'तारीख')}</th>
              <th>${t('Attachment', 'இணைப்பு', 'அட்டैचमेंट')}</th>
              <th>${t('Actions', 'செயல்கள்', 'कार्रवाई')}</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(x => `
              <tr>
                <td class="record-title-cell">
                  <b>${escapeHtml(x.title)}</b>
                  <small>${escapeHtml(x.record_type || 'Eye report')} ${x.description ? `· ${escapeHtml(x.description.slice(0, 40))}` : ''}</small>
                </td>
                <td>${(x.record_date && String(x.record_date).trim()) ? escapeHtml(x.record_date) : 'N/A'}</td>
                <td>
                  ${x.filename ? (isDemo() ? `<small class="pill">${escapeHtml(x.filename)}</small>` : `<a class="btn-icon" href="/api/public/files/${encodeURIComponent(x.filename)}" target="_blank" rel="noopener"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:3px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Open</a>`) : `<span class="muted tiny">None</span>`}
                </td>
                <td>
                  <div class="record-action-btns" style="display:flex;gap:4px;">
                    <button type="button" class="btn-icon rec-view-btn" data-rec-id="${escapeHtml(x.id)}" title="${t('View Details', 'விவரங்கள்', 'विवरण')}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                    <button type="button" class="btn-icon rec-edit-btn" data-rec-id="${escapeHtml(x.id)}" title="${t('Edit', 'திருத்து', 'संपादित')}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button type="button" class="btn-icon rec-del-btn" data-rec-id="${escapeHtml(x.id)}" title="${t('Delete', 'நீக்கு', 'हटाएँ')}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      list.querySelectorAll('.rec-view-btn').forEach(btn => {
        btn.onclick = () => {
          const rec = rows.find(r => String(r.id) === String(btn.dataset.recId));
          if (!rec) return;
          if ($('viewModalTitle')) $('viewModalTitle').textContent = rec.title;
          if ($('viewModalType')) $('viewModalType').textContent = rec.record_type || 'Eye report';
          if ($('viewModalDate')) $('viewModalDate').textContent = rec.record_date || 'N/A';
          if ($('viewModalDesc')) $('viewModalDesc').textContent = rec.description || 'No description provided.';
          if ($('viewModalFile')) {
            $('viewModalFile').innerHTML = rec.filename ? `<a href="/api/public/files/${encodeURIComponent(rec.filename)}" target="_blank"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:3px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>${escapeHtml(rec.filename)}</a>` : 'None';
          }
          if ($('recordViewModal')) $('recordViewModal').hidden = false;
        };
      });

      list.querySelectorAll('.rec-edit-btn').forEach(btn => {
        btn.onclick = () => {
          const rec = rows.find(r => String(r.id) === String(btn.dataset.recId));
          if (!rec) return;
          if ($('editModalId')) $('editModalId').value = rec.id;
          if ($('editModalTitle')) $('editModalTitle').value = rec.title;
          if ($('editModalType')) $('editModalType').value = rec.record_type || 'Eye report';
          if ($('editModalDate')) $('editModalDate').value = rec.record_date || '';
          if ($('editModalDesc')) $('editModalDesc').value = rec.description || '';
          if ($('recordEditModal')) $('recordEditModal').hidden = false;
        };
      });

      list.querySelectorAll('.rec-del-btn').forEach(btn => {
        btn.onclick = () => {
          activeDeleteRecordId = btn.dataset.recId;
          if ($('recordDeleteModal')) $('recordDeleteModal').hidden = false;
        };
      });

    } catch (err) {
      list.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    }
  }

  if ($('closeViewModalBtn')) $('closeViewModalBtn').onclick = () => { if ($('recordViewModal')) $('recordViewModal').hidden = true; };
  if ($('doneViewModalBtn')) $('doneViewModalBtn').onclick = () => { if ($('recordViewModal')) $('recordViewModal').hidden = true; };
  if ($('closeEditModalBtn')) $('closeEditModalBtn').onclick = () => { if ($('recordEditModal')) $('recordEditModal').hidden = true; };
  if ($('cancelEditModalBtn')) $('cancelEditModalBtn').onclick = () => { if ($('recordEditModal')) $('recordEditModal').hidden = true; };
  if ($('closeDeleteModalBtn')) $('closeDeleteModalBtn').onclick = () => { if ($('recordDeleteModal')) $('recordDeleteModal').hidden = true; };
  if ($('cancelDeleteModalBtn')) $('cancelDeleteModalBtn').onclick = () => { if ($('recordDeleteModal')) $('recordDeleteModal').hidden = true; };

  if ($('confirmDeleteModalBtn')) {
    $('confirmDeleteModalBtn').onclick = async () => {
      if (!activeDeleteRecordId) return;
      try {
        if (isDemo()) {
          demoWrite('records', demoRead('records').filter(x => String(x.id) !== String(activeDeleteRecordId)));
        } else {
          await window.api(`/api/public/records/${encodeURIComponent(activeDeleteRecordId)}`, { method: 'DELETE' });
        }
        if ($('recordDeleteModal')) $('recordDeleteModal').hidden = true;
        await renderRecords();
        loadDashboard();
      } catch (err) {
        alert(err.message);
      }
    };
  }

  if ($('recordEditForm')) {
    $('recordEditForm').onsubmit = async e => {
      e.preventDefault();
      const id = $('editModalId').value;
      const title = $('editModalTitle').value.trim();
      const record_type = $('editModalType').value;
      const record_date = $('editModalDate').value;
      const description = $('editModalDesc').value.trim();

      if (!title) return;

      try {
        if (isDemo()) {
          const rows = demoRead('records');
          const idx = rows.findIndex(x => String(x.id) === String(id));
          if (idx !== -1) {
            rows[idx] = { ...rows[idx], title, record_type, record_date, description, updated_at: new Date().toISOString() };
            demoWrite('records', rows);
          }
        } else {
          await window.api(`/api/public/records/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, record_type, record_date, description })
          });
        }
        if ($('recordEditModal')) $('recordEditModal').hidden = true;
        await renderRecords();
        loadDashboard();
      } catch (err) {
        alert(err.message);
      }
    };
  }

  if ($('recordForm')) {
    $('recordForm').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.currentTarget;
      if (!currentUser) {
        if (window.navigatePage) window.navigatePage('account');
        else location.hash = '#account';
        return;
      }
      const f = new FormData(form);
      const title = String(f.get('title') || '').trim();
      if (!title) {
        alert(t('Please enter a record title.', 'பதிவின் தலைப்பை உள்ளிடவும்.', 'रिकॉर्ड का शीर्षक दर्ज करें।'));
        return;
      }
      const file = f.get('file');
      const btn = $('recSubmitBtn') || form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;

      try {
        let filename = '';
        const record = {
          title,
          record_type: f.get('record_type') || 'Eye report',
          record_date: f.get('record_date') || '',
          description: String(f.get('description') || '').trim()
        };

        if (isDemo()) {
          if (file && file.size) filename = file.name;
          const rows = demoRead('records');
          rows.unshift({ ...record, filename, id: 'demo-rec-' + Date.now(), created_at: new Date().toISOString() });
          demoWrite('records', rows);
        } else {
          if (file && file.size) {
            const up = new FormData();
            up.append('file', file);
            const res = await window.api('/api/public/upload', { method: 'POST', body: up });
            filename = res.filename;
          }
          await window.api('/api/public/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...record, filename })
          });
        }
        form.reset();
        await renderRecords();
        loadDashboard();
      } catch (err) {
        alert(err.message);
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  // --------------------------------------------------------------------------
  // EXISTING FEATURES PRESERVED: Eye Journey (Screening History Timeline)
  // --------------------------------------------------------------------------
  function getClassificationInfo(item) {
    const rawRes = String(item.result || item.classification || '').trim();
    const score = Number(item.score) || 0;
    const cdr = item.cdr ? parseFloat(item.cdr) : null;

    let classification = 'Normal';
    let badgeClass = 'normal';
    let explanation = t('No characteristic structural signs of glaucoma were detected.', 'குளுக்கோமாவுக்கான அறிகுறிகள் எதுவும் கண்டறியப்படவில்லை.', 'ग्लूकोमा का कोई लक्षण नहीं पाया गया।');
    let guidance = t('Regular annual preventive eye examination recommended.', 'வழக்கமான வருடாந்திர கண் பரிசோதனை பரிந்துரைக்கப்படுகிறது.', 'नियमित वार्षिक नेत्र जाँच की सलाह दी जाती है।');

    if (rawRes === 'Severe' || score >= 75 || (cdr && cdr >= 0.70)) {
      classification = 'Severe';
      badgeClass = 'suspect';
      explanation = t('High-likelihood structural markers associated with glaucoma detected.', 'குளுக்கோமா தொடர்பான அதிக பாதிப்பு அடையாளங்கள் காணப்படுகின்றன.', 'ग्लूकोमा से जुड़े उच्च जोखिम लक्षण पाए गए हैं।');
      guidance = t('Prompt clinical evaluation by an ophthalmologist is essential.', 'கண் மருத்துவரை உடனடியாக அணுகி முழுமையான பரிசோதனை மேற்கொள்ளவும்.', 'नेत्र विशेषज्ञ से तत्काल चिकित्सकीय परामर्श लें।');
    } else if (rawRes === 'Moderate' || score >= 55 || (cdr && cdr >= 0.60)) {
      classification = 'Moderate';
      badgeClass = 'suspect';
      explanation = t('Screening detected optic nerve patterns that may indicate glaucomatous changes.', 'பார்வை நரம்பில் மிதமான மாற்றங்கள் காணப்படுகின்றன.', 'ऑप्टिक तंत्रिका में ग्लूकोमा से जुड़े बदलाव देखे गए हैं।');
      guidance = t('Consult an eye specialist for comprehensive exam.', 'கண் மருத்துவரை அணுகி முழு பரிசோதனை மேற்கொள்ளவும்.', 'नेत्र विशेषज्ञ से व्यापक जाँच करवाएँ।');
    } else if (rawRes.includes('Suspect') || score >= 35 || (cdr && cdr >= 0.50)) {
      classification = 'Glaucoma Suspect';
      badgeClass = 'moderate';
      explanation = t('Preliminary screening shows borderline optic disc features.', 'பார்வை வட்டில் எல்லைக்கோடு அளவீடுகள் காணப்படுகின்றன.', 'ऑप्टिक डिस्क में मामूली लक्षण देखे गए हैं।');
      guidance = t('Schedule a professional eye checkup.', 'மருத்துவக் கண் பரிசோதனைக்கு நேரம் பதிவு செய்யவும்.', 'पेशेवर नेत्र जाँच का समय लें।');
    }

    return { classification, badgeClass, explanation, guidance };
  }

  async function loadJourneyPrivate() {
    const list = $('journeyList');
    const summaryBar = $('journeySummaryBar');
    if (!list) return;
    if (!currentUser) {
      if (summaryBar) summaryBar.hidden = true;
      list.innerHTML = `<p class="empty">${t('Sign in to see your private Eye Journey.', 'தனிப்பட்ட கண் பயணத்தைப் பார்க்க உள்நுழையவும்.', 'अपनी निजी आँखों की यात्रा देखने के लिए साइन इन करें।')} <a href="#account">${t('Sign in', 'உள்நுழை', 'साइन इन')}</a></p>`;
      return;
    }
    try {
      const rows = isDemo() ? demoRead('analyses') : await window.api('/api/public/analyses');
      if (!rows || !rows.length) {
        if (summaryBar) summaryBar.hidden = true;
        list.innerHTML = `<p class="empty">${t('Saved screening results will appear here. Run an AI Screening and click "Save to my journey" to begin tracking.', 'சேமித்த பரிசோதனைகள் இங்கே தோன்றும்.', 'सहेजे गए जाँच परिणाम यहाँ दिखेंगे।')}</p>`;
        return;
      }

      rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      if (summaryBar) {
        summaryBar.hidden = false;
        const total = rows.length;
        const latest = rows[0];
        const latestInfo = getClassificationInfo(latest);

        summaryBar.innerHTML = `
          <div class="journey-summary-item">
            <div class="journey-summary-text">
              <small>${t('Screening History', 'பரிசோதனை வரலாறு', 'स्क्रीनिंग इतिहास')}</small>
              <b>${total} ${total === 1 ? t('Screening Recorded', 'பரிசோதனை பதிவு', 'जाँच दर्ज') : t('Screenings Recorded', 'பரிசோதனைகள் பதிவு', 'जाँचें दर्ज')}</b>
            </div>
          </div>
          <div class="journey-summary-item">
            <div class="journey-summary-text">
              <small>${t('Latest Classification', 'சமீபத்திய வகைப்பாடு', 'नवीनतम वर्गीकरण')}</small>
              <b><span class="pill ${latestInfo.badgeClass}">${escapeHtml(latestInfo.classification)}</span></b>
            </div>
          </div>
        `;
      }

      list.innerHTML = rows.map((x, idx) => {
        const info = getClassificationInfo(x);
        const dateStr = x.created_at ? new Date(x.created_at).toLocaleString() : 'N/A';
        const scoreVal = (x.score !== undefined && x.score !== null) ? `${x.score}%` : '—';
        const cdrVal = (x.cdr !== undefined && x.cdr !== null && String(x.cdr).trim() !== '') ? x.cdr : '0.40';

        return `
          <div class="journey-card ${info.badgeClass}">
            <div class="journey-card-header">
              <div class="journey-date-group">
                <span class="journey-date-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(dateStr)}</span>
                <span class="journey-id-pill">#${escapeHtml(String(x.id || (idx + 1)).slice(0, 8))}</span>
              </div>
              <span class="pill ${info.badgeClass}">${escapeHtml(info.classification)}</span>
            </div>
            <div class="journey-metrics-row">
              <div class="journey-metric">
                <small>${t('Screening Result', 'பரிசோதனை முடிவு', 'स्क्रीनिंग परिणाम')}</small>
                <b>Preliminary AI</b>
              </div>
              <div class="journey-metric">
                <small>${t('Glaucoma Classification', 'வகைப்பாடு', 'वर्गीकरण')}</small>
                <b>${escapeHtml(info.classification)}</b>
              </div>
              <div class="journey-metric">
                <small>${t('Risk Score / Probability', 'அபாய மதிப்பெண்', 'जोखिम स्कोर')}</small>
                <b>${escapeHtml(scoreVal)}</b>
              </div>
              <div class="journey-metric">
                <small>${t('Cup-to-Disc Ratio (CDR)', 'CDR அளவு', 'कप-टू-डिस्क अनुपात')}</small>
                <b>${escapeHtml(cdrVal)}</b>
              </div>
            </div>
            <div class="journey-card-explanation">
              <strong>${t('Screening Assessment', 'மதிப்பீடு', 'मूल्यांकन')}:</strong> ${escapeHtml(info.explanation)}
            </div>
            <div class="journey-card-footer">
              <span class="journey-guidance-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>${escapeHtml(info.guidance)}</span>
              <button type="button" class="button outline small journey-pdf-btn" data-row-idx="${idx}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>${t('Download PDF Report', 'PDF அறிக்கை', 'PDF रिपोर्ट')}
              </button>
            </div>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.journey-pdf-btn').forEach(btn => {
        btn.onclick = async () => {
          const rowIdx = parseInt(btn.dataset.rowIdx, 10);
          const item = rows[rowIdx];
          if (!item) return;
          if (window.generateGlaucomaPdf) {
            await window.generateGlaucomaPdf(item);
          }
        };
      });

    } catch (err) {
      if (summaryBar) summaryBar.hidden = true;
      list.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    }
  }

  // Save to Journey button
  if ($('saveResult')) {
    $('saveResult').addEventListener('click', async () => {
      const btn = $('saveResult');
      const r = window.lastResult;
      if (!r) {
        alert(t('Run the screening first, then save the result.', 'முதலில் பரிசோதனையை இயக்கவும்.', 'पहले जाँच चलाएँ।'));
        return;
      }
      if (r.saved) {
        alert(t('This screening result is already saved in your Eye Journey.', 'இந்த முடிவு ஏற்கனவே சேமிக்கப்பட்டுள்ளது.', 'यह परिणाम पहले से सहेजा गया है।'));
        return;
      }

      const payload = {
        id: r.id,
        idempotency_key: r.idempotency_key || r.id,
        result: r.result,
        score: r.score,
        confidence: r.confidence,
        cdr: r.cdr,
        iop: r.iop,
        details: r.details || [],
        source: r.source,
        date: r.date,
        model_version: r.model_version || 'glaucoma-match-v1'
      };

      if (!currentUser) {
        try { sessionStorage.setItem('drishti-pending-result', JSON.stringify(payload)); } catch { }
        if (window.navigatePage) window.navigatePage('account');
        else location.hash = '#account';
        return;
      }

      btn.disabled = true;
      try {
        if (isDemo()) {
          const rows = demoRead('analyses');
          rows.unshift({ ...payload, id: payload.id || ('demo-anal-' + Date.now()), created_at: new Date().toISOString() });
          demoWrite('analyses', rows);
        } else {
          await window.api('/api/public/analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
        r.saved = true;
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>' + t('Saved in Journey', 'பயணத்தில் சேமிக்கப்பட்டது', 'यात्रा में सहेजा गया');
        btn.disabled = true;
        await loadJourneyPrivate();
        loadDashboard();
      } catch (e) {
        btn.disabled = false;
        alert(e.message);
      }
    });
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION & LIFECYCLE
  // --------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('drishti-language');
    if (savedLang && $('language')) {
      $('language').value = savedLang;
    }

    applyAccessibilityPreferences();
    applyTranslations();
    setupEyeAnatomy();
    setupVoiceAssistant();
    setupAppointments();
    setupQuiz();
    loadDashboard();
    renderRecords();
    loadJourneyPrivate();
  });

  $('language')?.addEventListener('change', () => {
    const selected = $('language').value;
    setLanguage(selected);
    loadDashboard();
    loadAppointments();
    loadRemindersPrivate();
    renderRecords();
    loadJourneyPrivate();
  });

  document.addEventListener('drishti:auth', e => {
    currentUser = e.detail || null;
    updateAccountUI();
    loadDashboard();
    loadRemindersPrivate();
    loadAppointments();
    renderRecords();
    loadJourneyPrivate();
  });

  const observer = new MutationObserver(() => {
    if (!observer._scheduled) {
      observer._scheduled = true;
      queueMicrotask(() => {
        observer._scheduled = false;
        applyTranslations();
      });
    }
  });
  observer.observe(document.querySelector('main') || document.body, { subtree: true, childList: true });

  window.refreshDashboardData = loadDashboard;
  window.applyAppTranslations = applyTranslations;
  window.loadRemindersPrivate = loadRemindersPrivate;
  window.loadAppointmentsPrivate = loadAppointments;
  window.renderRecords = renderRecords;
  window.loadJourneyPrivate = loadJourneyPrivate;

})();
