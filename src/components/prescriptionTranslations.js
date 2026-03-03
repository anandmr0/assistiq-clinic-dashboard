// ─────────────────────────────────────────────────────────────────────────────
// prescriptionTranslations.js
// Translates medicine instruction fields for WhatsApp messages & PDF labels
// ─────────────────────────────────────────────────────────────────────────────

export const LANGUAGES = [
  { code: 'en',    label: 'English',    flag: '🇬🇧' },
  { code: 'hi',    label: 'हिंदी',      flag: '🇮🇳' },
  { code: 'ta',    label: 'தமிழ்',      flag: '🏴' },
  { code: 'te',    label: 'తెలుగు',     flag: '🏴' },
  { code: 'mr',    label: 'मराठी',      flag: '🏴' },
  { code: 'bn',    label: 'বাংলা',      flag: '🏴' },
  { code: 'gu',    label: 'ગુજરાતી',    flag: '🏴' },
  { code: 'kn',    label: 'ಕನ್ನಡ',      flag: '🏴' },
  { code: 'ml',    label: 'മലയാളം',    flag: '🏴' },
  { code: 'pa',    label: 'ਪੰਜਾਬੀ',     flag: '🏴' },
];

// ── Frequency ─────────────────────────────────────────────────────────────────
const FREQ = {
  once_daily:    { en:'Once daily',       hi:'दिन में एक बार',        ta:'தினமும் ஒருமுறை',      te:'రోజుకు ఒకసారి',       mr:'दिवसातून एकदा',        bn:'দিনে একবার',         gu:'દિવસમાં એક વખત',    kn:'ದಿನಕ್ಕೆ ಒಮ್ಮೆ',       ml:'ദിവസം ഒരു തവണ',      pa:'ਦਿਨ ਵਿੱਚ ਇੱਕ ਵਾਰ' },
  twice_daily:   { en:'Twice daily',      hi:'दिन में दो बार',        ta:'தினமும் இரண்டு முறை',  te:'రోజుకు రెండుసార్లు',   mr:'दिवसातून दोनदा',       bn:'দিনে দুইবার',        gu:'દિવસમાં બે વખત',    kn:'ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ',  ml:'ദിവസം രണ്ട് തവണ',    pa:'ਦਿਨ ਵਿੱਚ ਦੋ ਵਾਰ' },
  thrice_daily:  { en:'3 times daily',    hi:'दिन में तीन बार',       ta:'தினமும் மூன்று முறை',  te:'రోజుకు మూడుసార్లు',   mr:'दिवसातून तीनदा',       bn:'দিনে তিনবার',        gu:'દિવસમાં ત્રણ વખત',  kn:'ದಿನಕ್ಕೆ ಮೂರು ಬಾರಿ',  ml:'ദിവസം മൂന്ന് തവണ',   pa:'ਦਿਨ ਵਿੱਚ ਤਿੰਨ ਵਾਰ' },
  four_times:    { en:'4 times daily',    hi:'दिन में चार बार',       ta:'தினமும் நான்கு முறை',  te:'రోజుకు నాలుగుసార్లు', mr:'दिवसातून चारदा',       bn:'দিনে চারবার',        gu:'દિવસમાં ચાર વખત',   kn:'ದಿನಕ್ಕೆ ನಾಲ್ಕು ಬಾರಿ', ml:'ദിവസം നാല് തവണ',    pa:'ਦਿਨ ਵਿੱਚ ਚਾਰ ਵਾਰ' },
  every_6_hours: { en:'Every 6 hours',    hi:'हर 6 घंटे में',         ta:'ஒவ்வொரு 6 மணிக்கும்', te:'ప్రతి 6 గంటలకు',      mr:'दर 6 तासांनी',         bn:'প্রতি ৬ ঘণ্টায়',     gu:'દર 6 કલાકે',        kn:'ಪ್ರತಿ 6 ಗಂಟೆಗೆ',      ml:'എല്ലാ 6 മണിക്കൂറിലും', pa:'ਹਰ 6 ਘੰਟੇ ਵਿੱਚ' },
  every_8_hours: { en:'Every 8 hours',    hi:'हर 8 घंटे में',         ta:'ஒவ்வொரு 8 மணிக்கும்', te:'ప్రతి 8 గంటలకు',      mr:'दर 8 तासांनी',         bn:'প্রতি ৮ ঘণ্টায়',     gu:'દર 8 કલાકે',        kn:'ಪ್ರತಿ 8 ಗಂಟೆಗೆ',      ml:'എല്ലാ 8 മണിക്കൂറിലും', pa:'ਹਰ 8 ਘੰਟੇ ਵਿੱਚ' },
  as_needed:     { en:'As needed',        hi:'जरूरत पड़ने पर',        ta:'தேவைப்படும்போது',      te:'అవసరమైనప్పుడు',       mr:'गरज पडल्यास',          bn:'প্রয়োজনমতো',         gu:'જરૂર પ્રમાણે',      kn:'ಅಗತ್ಯವಿದ್ದಾಗ',        ml:'ആവശ്യമുള്ളപ്പോൾ',    pa:'ਲੋੜ ਅਨੁਸਾਰ' },
};

// ── Timing ────────────────────────────────────────────────────────────────────
const TIMING = {
  after_food:     { en:'After food',       hi:'खाने के बाद',          ta:'சாப்பிட்ட பின்',       te:'భోజనం తర్వాత',        mr:'जेवणानंतर',            bn:'খাবার পরে',           gu:'જમ્યા પછી',         kn:'ಊಟದ ನಂತರ',            ml:'ഭക്ഷണത്തിനു ശേഷം',   pa:'ਖਾਣੇ ਤੋਂ ਬਾਅਦ' },
  before_food:    { en:'Before food',      hi:'खाने से पहले',         ta:'சாப்பிடுவதற்கு முன்',  te:'భోజనానికి ముందు',     mr:'जेवणाआधी',             bn:'খাবার আগে',           gu:'જમ્યા પહેલા',        kn:'ಊಟದ ಮೊದಲು',           ml:'ഭക്ഷണത്തിനു മുമ്പ്', pa:'ਖਾਣੇ ਤੋਂ ਪਹਿਲਾਂ' },
  with_food:      { en:'With food',        hi:'खाने के साथ',          ta:'சாப்பிடும்போது',       te:'భోజనంతో పాటు',        mr:'जेवणासोबत',            bn:'খাবারের সাথে',        gu:'જમવાની સાથે',       kn:'ಊಟದ ಜೊತೆ',            ml:'ഭക്ഷണത്തോടൊപ്പം',   pa:'ਖਾਣੇ ਦੇ ਨਾਲ' },
  empty_stomach:  { en:'Empty stomach',    hi:'खाली पेट',             ta:'வெறும் வயிற்றில்',     te:'ఖాళీ కడుపుపై',        mr:'रिकाम्या पोटी',        bn:'খালি পেটে',           gu:'ખાલી પેટ',          kn:'ಖಾಲಿ ಹೊಟ್ಟೆಯಲ್ಲಿ',   ml:'ഒഴിഞ്ഞ വയറ്റിൽ',    pa:'ਖਾਲੀ ਪੇਟ' },
};

// ── Duration ──────────────────────────────────────────────────────────────────
const DUR = {
  '1_day':    { en:'1 day',    hi:'1 दिन',    ta:'1 நாள்',   te:'1 రోజు',  mr:'1 दिवस',  bn:'১ দিন',  gu:'1 દિવસ',  kn:'1 ದಿನ',   ml:'1 ദിവസം',  pa:'1 ਦਿਨ' },
  '3_days':   { en:'3 days',   hi:'3 दिन',    ta:'3 நாட்கள்', te:'3 రోజులు', mr:'3 दिवस', bn:'৩ দিন',  gu:'3 દિવસ', kn:'3 ದಿನಗಳು', ml:'3 ദിവസം', pa:'3 ਦਿਨ' },
  '5_days':   { en:'5 days',   hi:'5 दिन',    ta:'5 நாட்கள்', te:'5 రోజులు', mr:'5 दिवस', bn:'৫ দিন',  gu:'5 દિવસ', kn:'5 ದಿನಗಳು', ml:'5 ദിവസം', pa:'5 ਦਿਨ' },
  '7_days':   { en:'7 days',   hi:'7 दिन',    ta:'7 நாட்கள்', te:'7 రోజులు', mr:'7 दिवस', bn:'৭ দিন',  gu:'7 દિવસ', kn:'7 ದಿನಗಳು', ml:'7 ദിവസം', pa:'7 ਦਿਨ' },
  '10_days':  { en:'10 days',  hi:'10 दिन',   ta:'10 நாட்கள்', te:'10 రోజులు', mr:'10 दिवस', bn:'১০ দিন', gu:'10 દિવસ', kn:'10 ದಿನಗಳು', ml:'10 ദിവസം', pa:'10 ਦਿਨ' },
  '14_days':  { en:'14 days',  hi:'14 दिन',   ta:'14 நாட்கள்', te:'14 రోజులు', mr:'14 दिवस', bn:'১৪ দিন', gu:'14 દિવસ', kn:'14 ದಿನಗಳು', ml:'14 ദിവസം', pa:'14 ਦਿਨ' },
  '21_days':  { en:'21 days',  hi:'21 दिन',   ta:'21 நாட்கள்', te:'21 రోజులు', mr:'21 दिवस', bn:'২১ দিন', gu:'21 દિવસ', kn:'21 ದಿನಗಳು', ml:'21 ദിവസം', pa:'21 ਦਿਨ' },
  '30_days':  { en:'30 days',  hi:'30 दिन',   ta:'30 நாட்கள்', te:'30 రోజులు', mr:'30 दिवस', bn:'৩০ দিন', gu:'30 દિવસ', kn:'30 ದಿನಗಳು', ml:'30 ദിവസം', pa:'30 ਦਿਨ' },
};

// ── Section labels (for WhatsApp message body) ────────────────────────────────
export const LABELS = {
  greeting:      { en:'Dear',               hi:'प्रिय',            ta:'அன்புள்ள',        te:'ప్రియమైన',         mr:'प्रिय',             bn:'প্রিয়',           gu:'પ્રિય',           kn:'ಆತ್ಮೀಯ',           ml:'പ്രിയ',             pa:'ਪਿਆਰੇ' },
  prescription:  { en:'Prescription',       hi:'नुस्खा',           ta:'மருந்துச் சீட்டு', te:'ప్రిస్క్రిప్షన్',  mr:'प्रिस्क्रिप्शन',   bn:'প্রেসক্রিপশন',    gu:'પ્રિસ્ક્રિપ્શન',  kn:'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್',  ml:'പ്രിസ്ക്രിപ്ഷൻ',  pa:'ਨੁਸਖਾ' },
  medicines:     { en:'Medicines',          hi:'दवाइयाँ',          ta:'மருந்துகள்',       te:'మందులు',           mr:'औषधे',              bn:'ওষুধ',             gu:'દવાઓ',            kn:'ಔಷಧಗಳು',           ml:'മരുന്നുകൾ',         pa:'ਦਵਾਈਆਂ' },
  advice:        { en:'Advice',             hi:'सलाह',             ta:'ஆலோசனை',           te:'సలహా',             mr:'सल्ला',             bn:'পরামর্শ',          gu:'સલાહ',            kn:'ಸಲಹೆ',             ml:'ഉപദേശം',           pa:'ਸਲਾਹ' },
  followup:      { en:'Follow-up',          hi:'अनुवर्ती',         ta:'மேலும் சந்திப்பு', te:'ఫాలో-అప్',         mr:'फॉलो-अप',           bn:'ফলো-আপ',           gu:'ફોલો-અપ',         kn:'ಫಾಲೋ-ಅಪ್',         ml:'ഫോളോ-അപ്പ്',       pa:'ਫਾਲੋ-ਅੱਪ' },
  doctorNote:    { en:'Note from Doctor',   hi:'डॉक्टर की टिप्पणी', ta:'மருத்துவர் குறிப்பு', te:'డాక్టర్ నోట్',  mr:'डॉक्टरची नोंद',    bn:'ডাক্তারের নোট',   gu:'ડૉક્ટરની નોંધ',   kn:'ವೈದ್ಯರ ಟಿಪ್ಪಣಿ',   ml:'ഡോക്ടറുടെ കുറിപ്പ്', pa:'ਡਾਕਟਰ ਦੀ ਟਿੱਪਣੀ' },
};

// ── Main translation function ─────────────────────────────────────────────────

/**
 * Translate a prescription field value to the given language.
 * @param {'frequency'|'timing'|'duration'} field
 * @param {string} value  — e.g. 'twice_daily', 'after_food', '7_days'
 * @param {string} lang   — language code e.g. 'hi', 'ta', 'en'
 * @returns {string}
 */
export function translateField(field, value, lang = 'en') {
  const map = { frequency: FREQ, timing: TIMING, duration: DUR }[field];
  if (!map) return value;
  return map[value]?.[lang] ?? map[value]?.['en'] ?? value;
}

/**
 * Get a UI label in the given language.
 * @param {string} key  — key from LABELS
 * @param {string} lang
 */
export function getLabel(key, lang = 'en') {
  return LABELS[key]?.[lang] ?? LABELS[key]?.['en'] ?? key;
}

/**
 * Translate a full prescription array for WhatsApp message rendering.
 * Returns array of translated prescription objects.
 */
export function translatePrescriptions(prescriptions, lang = 'en') {
  return (prescriptions || []).map(p => ({
    ...p,
    frequencyLabel: translateField('frequency', p.frequency, lang),
    timingLabel:    translateField('timing',    p.timing,    lang),
    durationLabel:  translateField('duration',  p.duration,  lang),
  }));
}