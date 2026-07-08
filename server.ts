/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limits for base64 image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File-based simple database for farmer credentials and profile data
// Use /tmp in production to avoid EACCES permission errors on read-only container filesystems
const DEFAULT_DB_FILE = path.join(process.cwd(), 'src', 'db_store.json');
const DB_FILE = process.env.NODE_ENV === 'production'
  ? path.join('/tmp', 'db_store.json')
  : DEFAULT_DB_FILE;

// Memory fallback to guarantee service continuity even under zero-write access environments
let memoryDB: { users: any[]; chatHistories: Record<string, any>; smsSubscribers: any[] } = {
  users: [],
  chatHistories: {},
  smsSubscribers: []
};
let useMemoryDB = false;

// Ensure database file exists
function initDB() {
  try {
    const dbDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // In production, migrate initial database seeds from build directory if needed
    if (process.env.NODE_ENV === 'production' && !fs.existsSync(DB_FILE)) {
      if (fs.existsSync(DEFAULT_DB_FILE)) {
        try {
          fs.copyFileSync(DEFAULT_DB_FILE, DB_FILE);
          console.log('[Kishan Alert] Successfully copied seed db_store.json to /tmp/db_store.json');
        } catch (copyErr) {
          console.error('[Kishan Alert] Failed to copy seed db_store.json, creating empty database:', copyErr);
          fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB, null, 2));
        }
      } else {
        fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB, null, 2));
      }
    } else if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB, null, 2));
    }
  } catch (err) {
    console.error('[Kishan Alert] Error initializing database file, falling back to in-memory mode:', err);
    useMemoryDB = true;
  }
}

// Perform initial setup safely
initDB();

function readDB() {
  if (useMemoryDB) {
    return memoryDB;
  }
  try {
    initDB();
    if (!fs.existsSync(DB_FILE)) {
      return memoryDB;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    // Keep memory DB in sync
    memoryDB = parsed;
    return parsed;
  } catch (e) {
    console.error('[Kishan Alert] Failed to read database file, returning in-memory:', e);
    return memoryDB;
  }
}

function writeDB(data: any) {
  // Always update in-memory state
  memoryDB = data;
  if (useMemoryDB) {
    return;
  }
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[Kishan Alert] Failed to write database file, switching permanently to in-memory fallback:', e);
    useMemoryDB = true;
  }
}

// Lazy load Gemini Client to prevent startup crashes if GEMINI_API_KEY is missing
let aiInstance: GoogleGenAI | null = null;
let lastApiKey: string | null = null;
function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is missing. Please set the GEMINI_API_KEY environment variable on your server (or configure it in the "Settings > Secrets" panel in the AI Studio UI during development).');
  }
  if (!aiInstance || lastApiKey !== apiKey) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    lastApiKey = apiKey;
  }
  return aiInstance;
}

// Helper to clean up error messages (extracts human-readable messages and avoids raw JSON logs)
function cleanErrorMessage(msg: string): string {
  const lowercaseMsg = (msg || '').toLowerCase();
  if (lowercaseMsg.includes('denied access') || lowercaseMsg.includes('permission_denied') || lowercaseMsg.includes('403')) {
    return 'Permission Denied / Denied Access (Please check your API key / project configuration)';
  }
  if (lowercaseMsg.includes('quota exceeded') || lowercaseMsg.includes('resource_exhausted') || lowercaseMsg.includes('429')) {
    return 'Quota Exceeded / Resource Exhausted (Free tier rate limit reached)';
  }
  
  // Try to parse JSON and get the inner message if any
  try {
    const trimmed = msg.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      if (parsed.error && parsed.error.message) {
        return cleanErrorMessage(parsed.error.message);
      }
    }
  } catch (e) {}

  return msg;
}

// Safe wrapper for Gemini content generation to catch and map specific errors (e.g. Permission Denied, Quota Exceeded)
async function generateContentSafe(ai: GoogleGenAI, options: { model: string; contents: any; config?: any }) {
  const modelsToTry = [
    options.model,
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite'
  ];
  
  const uniqueModels = Array.from(new Set(modelsToTry.filter(Boolean)));
  let lastError: any = null;
  
  for (const modelName of uniqueModels) {
    try {
      const response = await ai.models.generateContent({
        ...options,
        model: modelName
      });
      // Attach metadata to the response so callers can read it if needed
      (response as any).modelUsed = modelName;
      return response;
    } catch (error: any) {
      lastError = error;
      const msg = error.message || String(error);
      const cleanMsg = cleanErrorMessage(msg);
      console.log(`[Kishan Alert] Model ${modelName} state: ${cleanMsg}`);
    }
  }
  
  const errorMsg = typeof lastError === 'object' && lastError !== null ? (lastError.message || JSON.stringify(lastError)) : String(lastError);
  const cleanedErrorMsg = cleanErrorMessage(errorMsg);
  
  if (cleanedErrorMsg.includes('Permission Denied') || cleanedErrorMsg.includes('denied access')) {
    throw new Error('Your Gemini API key has run into a permission restriction. Please configure your own Gemini API key in the "Settings > Secrets" panel in the AI Studio UI (or set the GEMINI_API_KEY environment variable on your production server) to restore full AI functionality with web search.');
  }
  if (cleanedErrorMsg.includes('Quota Exceeded') || cleanedErrorMsg.includes('quota exceeded')) {
    throw new Error('The Gemini API free tier quota has been exceeded. Please retry in a few seconds, or configure your own Gemini API key in the "Settings > Secrets" panel in the AI Studio UI (or set the GEMINI_API_KEY environment variable on your production server) to restore full AI functionality with web search.');
  }
  throw new Error(cleanedErrorMsg);
}

// Helper to convert LanguageCode to a readable name for Gemini
function getLangName(langCode: string): string {
  switch (langCode) {
    case 'ta': return 'Tamil';
    case 'hi': return 'Hindi';
    case 'te': return 'Telugu';
    case 'kn': return 'Kannada';
    case 'ml': return 'Malayalam';
    default: return 'English';
  }
}

/// --------------------------------------------------------
// UNIFIED HIGHEST-QUALITY OFFLINE FALLBACKS
// --------------------------------------------------------

function getUnifiedOfflineFallback(message: string, language: string): string {
  const msg = (message || '').trim().toLowerCase();
  
  const isPest = msg.includes('disease') || msg.includes('pest') || msg.includes('insect') || 
                 msg.includes('leaf') || msg.includes('spot') || msg.includes('die') || 
                 msg.includes('कीड़ा') || msg.includes('बीमारी') || msg.includes('रोग') || 
                 msg.includes('दवा') || msg.includes('பூச்சி') || msg.includes('நோய்') || 
                 msg.includes('తెగులు') || msg.includes('పురుగు') || msg.includes('ಕೀಟ') || 
                 msg.includes('ರೋಗ') || msg.includes('ಕೀಟಂ') || msg.includes('രോഗം');

  const isSoil = msg.includes('soil') || msg.includes('fertilizer') || msg.includes('urea') || 
                 msg.includes('compost') || msg.includes('manure') || msg.includes('मिट्टी') || 
                 msg.includes('खाद') || msg.includes('गोबर') || msg.includes('यूरिया') || 
                 msg.includes('மண்') || msg.includes('உரம்') || msg.includes('మట్టి') || 
                 msg.includes('ఎరువు') || msg.includes('ಮಣ್ಣು') || msg.includes('ಗೊಬ್ಬರ') || 
                 msg.includes('മണ്ണു') || msg.includes('വളം');

  const isScheme = msg.includes('scheme') || msg.includes('pm-kisan') || msg.includes('insurance') || 
                   msg.includes('subsidy') || msg.includes('pension') || msg.includes('योजना') || 
                   msg.includes('திட்டம்') || msg.includes('పథకం') || msg.includes('ಯೋಜನೆ') || 
                   msg.includes('പദ്ധതി');

  if (language === 'hi') {
    if (isPest) {
      return `### 🌾 फसल स्वास्थ्य और कीट संरक्षण सलाह
आपकी पूछताछ के आधार पर, फसल सुरक्षा के लिए व्यावहारिक उपाय नीचे दिए गए हैं:

1. **जैविक समाधान (अनुशंसित)**: **नीम का तेल (1500 ppm)** 5 मिलीलीटर लिक्विड साबुन के साथ मिलाकर 1 लीटर पानी में घोलकर छिड़काव करें। यह रस चूसने वाले कीटों और चेपा (aphids) के लिए अत्यधिक प्रभावी है।
2. **जैविक नियंत्रण**: कवक रोगों से बचाव के लिए बीज या जड़ उपचार के लिए ट्राइकोडर्मा विरिडी या स्यूडोमोनास फ्लोरेसेंस का उपयोग करें।
3. **सुरक्षा सावधानियां**: यदि रासायनिक कीटनाशकों का उपयोग करना हो, तो दस्ताने और मास्क पहनें। हवा तेज होने पर या दोपहर की तेज धूप में छिड़काव न करें।

*नोट: सटीक निदान के लिए, आप **Crop Diagnosis** टैब में प्रभावित पौधे की फोटो अपलोड कर सकते हैं!*`;
    }
    if (isSoil) {
      return `### 🧪 मृदा उर्वरता और पोषक तत्व प्रबंधन सलाह
सतत और अधिक उपज के लिए मिट्टी को समृद्ध बनाने के तरीके:

1. **जैविक संवर्धन**: खेत की तैयारी के समय अच्छी तरह से सड़ी हुई **गोबर की खाद** या **वर्मीकंपोस्ट (केंचुआ खाद)** (लगभग 5-10 टन प्रति एकड़) डालें।
2. **हरी खाद**: ढैंचा या सनई जैसी फसलें उगाएं और 45 दिनों के बाद उन्हें मिट्टी में जोत दें। यह मिट्टी में प्रचुर मात्रा में नाइट्रोजन और जैविक कार्बन जोड़ता है।
3. **संतुलित NPK**: यूरिया का अत्यधिक उपयोग न करें। अपनी मिट्टी परीक्षण कार्ड (Soil Health Card) की सिफारिशों के आधार पर नाइट्रोजन, फास्फोरस और पोटाश का संतुलित उपयोग करें।
4. **जैव उर्वरक**: मिट्टी में प्राकृतिक रूप से नाइट्रोजन स्थिर करने के लिए एजोटोबैक्टर या राइजोबियम कल्चर को जैविक खाद के साथ मिलाकर डालें।`;
    }
    if (isScheme) {
      return `### 🏛️ सरकारी योजनाएं और सहायता
यहाँ प्रमुख सक्रिय कृषि सहायता योजनाएं दी गई हैं:

1. **पीएम-किसान**: भूमिधारक किसान परिवारों के बैंक खातों में सीधे ₹6,000 वार्षिक तीन समान किश्तों में प्रदान करता है।
2. **पीएम फसल बीमा योजना**: न्यूनतम प्रीमियम दरों (खरीफ के लिए 2%, रबी के लिए 1.5%) पर प्राकृतिक आपदाओं से सुरक्षा प्रदान करती है।
3. **बीज और उर्वरक सब्सिडी**: स्थानीय कृषि सहकारी समिति (PACS) या जिला कृषि कार्यालय के माध्यम से उपलब्ध है। आवेदन के लिए आधार कार्ड और भूमि दस्तावेज लाएं।`;
    }
    return `### 👋 नमस्ते! किशन अलर्ट एआई सहायक में आपका स्वागत है
मैं आपका स्मार्ट कृषि सलाहकार हूँ। मैं आपको फसल प्रबंधन, कीट नियंत्रण, मृदा उर्वरता और सरकारी योजनाओं के बारे में मार्गदर्शन दे सकता हूँ।

वर्तमान सीजन के लिए **तीन महत्वपूर्ण कृषि अभ्यास**:
1. **मिट्टी का परीक्षण**: खाद की लागत बचाने और उपज बढ़ाने के लिए बुवाई से पहले मिट्टी की जांच जरूर करवाएं।
2. **सिंचाई का समय**: पानी की बर्बादी कम करने के लिए सुबह जल्दी या शाम को सिंचाई करें।
3. **फसल चक्र (Crop Rotation)**: मिट्टी की उर्वरता बढ़ाने और कीट चक्र को तोड़ने के लिए अनाजों के बाद दलहनी फसलें उगाएं।

*आज मैं आपकी क्या सहायता कर सकता हूँ? कृपया किसी विशेष फसल, बीमारी, खाद या स्थानीय कृषि समस्याओं के बारे में पूछें!*`;
  }

  if (language === 'ta') {
    if (isPest) {
      return `### 🌾 பயிர் பாதுகாப்பு மற்றும் பூச்சி மேலாண்மை
பயிர் பாதுகாப்புக்கான எளிய மற்றும் இயற்கை வழிகள்:

1. **வேப்ப எண்ணெய் கரைசல் (சிறந்தது)**: 1 லிட்டர் நீரில் 5 மில்லி வேப்ப எண்ணெய் மற்றும் 5 மில்லி திரவ சோப்பு கலந்து தெளிக்கவும். இது சாறு உறிஞ்சும் பூச்சிகளைக் கட்டுப்படுத்தும்.
2. **உயிரியல் கட்டுப்பாடு**: பூஞ்சை நோய்களைத் தடுக்க விதை நேர்த்திக்கு ட்ரைக்கோடெர்மா விரிடி (Trichoderma viride) பயன்படுத்தவும்.
3. **பாதுகாப்பு**: ரசாயன பூச்சிக்கொல்லிகளைப் பயன்படுத்தும்போது முகமூடி மற்றும் கையுறைகளை அணியுங்கள்.

*துல்லியமான கண்டறிதலுக்கு, உங்கள் பயிரின் புகைப்படத்தை **Crop Diagnosis** பக்கத்தில் பதிவேற்றலாம்!*`;
    }
    if (isSoil) {
      return `### 🧪 மண் வளம் மற்றும் ஊட்டச்சத்து மேலாண்மை
விவசாய நிலத்தை மேம்படுத்துவதற்கான எளிய வழிகள்:

1. **இயற்கை உரம்**: நிலம் தயாரிக்கும் போது ஏக்கருக்கு 5-10 டன் மட்கிய தொழுஉரம் அல்லது மண்புழு உரம் இடவும்.
2. **பசுந்தாள் உரம்**: தக்கைப்பூண்டு அல்லது சணப்பை போன்ற பயிர்களை வளர்த்து, 45 நாட்களுக்குப் பின் மண்ணில் மடக்கி உழவும்.
3. **உயிர் உரங்கள்**: அசோஸ்பைரில்லம் அல்லது பாஸ்போ-பாக்டீரியா போன்ற உயிர் உரங்களை பயன்படுத்தவும்.`;
    }
    if (isScheme) {
      return `### 🏛️ அரசு திட்டங்கள் மற்றும் நிதியுதவி
விவசாயிகளுக்கான முக்கிய திட்டங்கள்:

1. **PM-KISAN**: நிலமுள்ள விவசாயிகளுக்கு ஆண்டுக்கு ₹6,000 நிதியுதவி மூன்று தவணைகளாக வழங்கப்படுகிறது.
2. **பயிர் காப்பீட்டுத் திட்டம் (PMFBY)**: இயற்கை பேரிடர்களால் ஏற்படும் இழப்புகளுக்கு குறைந்த பிரீமியத்தில் காப்பீடு வழங்குகிறது.
3. **உரம் மற்றும் விதை மானியம்**: கூட்டுறவு சங்கங்கள் மூலம் மானிய விலையில் விதைகள் மற்றும் உரங்களை பெற்றுக்கொள்ளலாம்.`;
    }
    return `### 👋 வணக்கம்! கிஷான் அலர்ட் AI உங்களை வரவேற்கிறது
நான் உங்கள் விவசாய ஆலோசகர். பயிர் மேலாண்மை, பூச்சி கட்டுப்பாடு, மண் வளம் மற்றும் அரசு திட்டங்கள் குறித்து உங்களுக்கு உதவ முடியும்.

**மூன்று முக்கிய விவசாய ஆলোசனைகள்**:
1. **மண் பரிசோதனை**: உரச் செலவைக் குறைக்கவும், மகசூலை அதிகரிக்கவும் மண் பரிசோதனை அவசியம்.
2. **நீர் மேலாண்மை**: காலை அல்லது மாலை வேளையில் மட்டுமே நீர் பாய்ச்சவும்.
3. **பயிர் சுழற்சி**: மண்ணின் நைட்ரஜன் சத்தை அதிகரிக்க தானியங்களுடன் பருப்பு வகைகளையும் பயிரிடுங்கள்.

*இன்று உங்களுக்கு எவ்வாறு உதவ முடியும்? பயிர், பூச்சி அல்லது உரங்கள் குறித்து கேளுங்கள்!*`;
  }

  if (language === 'te') {
    if (isPest) {
      return `### 🌾 పంట సంరక్షణ మరియు తెగుళ్ల నివారణ
పంట రక్షణ కోసం ఆచరణాత్మక సలహాలు:

1. **వేప నూనె (సిఫార్సు చేయబడింది)**: 1 లీటరు నీటిలో 5ml వేప నూనె మరియు 5ml లిక్విడ్ సోప్ కలిపి పిచికారీ చేయండి. ఇది రసం పీల్చే పురుగులను నివారిస్తుంది.
2. **జీవ నియంత్రణ**: శిలీంద్ర తెగుళ్ల నివారణకు ట్రైకోడెర్మా విరిడితో విత్తన శుద్ధి చేయండి.
3. **జాగ్రత్తలు**: రసాయన మందులు పిచికారీ చేసేటప్పుడు తప్పనిసరిగా మాస్క్ మరియు గ్లౌజులు ధరించండి.

*మరింత ఖచ్చితమైన రోగ నిర్ధారణ కోసం, **Crop Diagnosis** ట్యాబ్‌లో మీ పంట ఫోటోను అప్‌లోడ్ చేయండి!*`;
    }
    if (isSoil) {
      return `### 🧪 నేల సారం మరియు పోషకాల యాజమాన్యం
నేల సారాన్ని పెంచే మార్గాలు:

1. **సేంద్రీయ ఎరువులు**: పొలం తయారీలో ఎకరానికి 5-10 టన్నుల పశువుల ఎరువు లేదా వర్మీకంపోస్ట్ వేయాలి.
2. **పచ్చిరొట్ట ఎరువులు**: జనుము లేదా జీలుగ పంటలను సాగు చేసి, 45 రోజుల తర్వాత భూమిలోనే కలియదున్నాలి.
3. **జీవ ఎరువులు**: నత్రజని స్థిరీకరణకు అజటోబాక్టర్ లేదా రైజోబియం వాడాలి.`;
    }
    if (isScheme) {
      return `### 🏛️ ప్రభుత్వ పథకాలు
రైతులకు అందుబాటులో ఉన్న ముఖ్యమైన పథకాలు:

1. **PM-KISAN**: భూమి ఉన్న రైతు కుటుంబాలకు ఏడాదికి ₹6,000 చొప్పున మూడు వాయిదాలలో నేరుగా खाताలో వేస్తారు.
2. **ఫసల్ బీమా యోజన**: ప్రకృతి వైపరీత్యాల వల్ల నష్టపోతే తక్కువ ప్రీమియంతో పంట భీమా కల్పిస్తుంది.
3. **సబ్సిడీ ఎరువులు**: స్థానిక రైతు సేవా కేంద్రాల ద్వారా రాయితీపై విత్తనాలు మరియు ఎరువులు పొందవచ్చు.`;
    }
    return `### 👋 నమస్కారం! కిషాన్ అలర్ట్ AI సహాయకునికి స్వాగతం
నేను మీ వ్యవసాయ సలహాదారుని. పంటల సాగు, తెగుళ్ల నివారణ, నేల సారం మరియు ప్రభుత్వ పథకాలపై సమాచారం అందించగలను.

**రైతులకు మూడు ముఖ్యమైన సూచనలు**:
1. **నేల పరీక్ష**: ఎరువుల ఖర్చు తగ్గించుకోవడానికి విత్తే ముందు నేల పరీక్ష చేయించండి.
2. **నీటి యాజమాన్యం**: ఆవిరి నష్టాన్ని తగ్గించడానికి ఉదయం లేదా సాయంత్రం వేళల్లోనే నీరు పెట్టండి.
3. **పంట మార్పిడి**: నేల సారాన్ని సహజంగా పెంచడానికి పంట మార్పిడి పద్ధతిని పాటించండి.

*ఈరోజు నేను మీకు ఏ విధంగా సహాయపడగలను? పంటలు, తెగుళ్లు లేదా ఎరువుల గురించి నన్ను అడగండి!*`;
  }

  if (language === 'kn') {
    if (isPest) {
      return `### 🌾 ಬೆಲೆ ರಕ್ಷಣೆ ಮತ್ತು ಕೀಟ ನಿಯಂತ್ರಣ ಸಲಹೆ
ಕೀಟ ಮತ್ತು ರೋಗ ಬಾಧೆ ತಡೆಯಲು ಪ್ರಾಯೋಗಿಕ ಕ್ರಮಗಳು:

1. **ಬೇವಿನ ಎಣ್ಣೆ ದ್ರಾವಣ**: 1 ಲೀಟರ್ ನೀರಿಗೆ 5 ಮಿಲಿ ಬೇವಿನ ಎಣ್ಣೆ ಮತ್ತು 5 ಮಿಲಿ ಲಿಕ್ವಿಡ್ ಸೋಪ್ ಸೇರಿಸಿ ಸಿಂಪಡಿಸಿ. ಇದು ರಸ ಹೀರುವ ಕೀಟಗಳನ್ನು ನಿಯಂತ್ರಿಸುತ್ತದೆ.
2. **ಜೈವಿಕ ನಿಯಂತ್ರಣ**: ಶಿಲೀಂಧ್ರ ರೋಗಗಳ ತಡೆಗೆ ಟ್ರೈಕೋಡರ್ಮಾ ವಿರಿಡಿಯಿಂದ ಬೀಜೋಪಚಾರ ಮಾಡಿ.
3. **ಮುನ್ನೆಚ್ಚರಿಕೆ**: ರಾಸಾಯನಿಕ ಸಿಂಪಡಿಸುವಾಗ ಕಡ್ಡಾಯವಾಗಿ ಮಾಸ್ಕ್ ಮತ್ತು ಕೈಗವಸು ಧರಿಸಿ.`;
    }
    if (isSoil) {
      return `### 🧪 ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಮತ್ತು ಪೋಷಕಾಂಶ ನಿರ್ವಹಣೆ
ಮಣ್ಣಿನ ಫಲವತ್ತತೆ ಹೆಚ್ಚಿಸುವ ಕ್ರಮಗಳು:

1. **ಸಾವಯವ ಗೊಬ್ಬರ**: ಮಣ್ಣಿನ ತಯಾರಿಕೆಯಲ್ಲಿ ಕೊಟ್ಟಿಗೆ ಗೊಬ್ಬರ ಮತ್ತು ಎರೆಹುಳು ಗೊಬ್ಬರವನ್ನು ಬಳಸಿ.
2. **ಹಸಿರು ಗೊಬ್ಬರ**: ಮಣ್ಣಿನಲ್ಲಿ ಸಾರಜನಕ ಹೆಚ್ಚಿಸಲು ಡಯಾಂಚಾ ಅಥವಾ ಇತರ ಹಸಿರು ಗೊಬ್ಬರ ಬೆಳೆಗಳನ್ನು ಮಣ್ಣಿನಲ್ಲಿ ಉಳುಮೆ ಮಾಡಿ.
3. **ಜೈವಿಕ ಗೊಬ್ಬರ**: ಅಜಟೋಬ್ಯಾಕ್ಟರ್ ಅಥವಾ ರೈಜೋಬಿಯಂ ಜೈವಿಕ ಗೊಬ್ಬರಗಳನ್ನು ಬಳಸಿ.`;
    }
    return `### 👋 ನಮಸ್ಕಾರ! ಕಿಶಾನ್ ಅಲರ್ಟ್ AI ಗೆ ಸುಸ್ವಾಗತ
ನಾನು ನಿಮ್ಮ ಕೃಷಿ ಸಲಹೆಗಾರ. ಬೆಳೆ ನಿರ್ವಹಣೆ, ಕೀಟ ನಿಯಂತ್ರಣ, ಮಣ್ಣಿನ ಫಲವತ್ತತೆ ಮತ್ತು ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಬಗ್ಗೆ ನಾನು ನಿಮಗೆ ಮಾಹಿತಿ ನೀಡಬಲ್ಲೆ.

**ಮೂರು ಪ್ರಮುಖ ಕೃಷಿ ಸಲಹೆಗಳು**:
1. **ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ**: ಗೊಬ್ಬರದ ವೆಚ್ಚವನ್ನು ಉಳಿಸಲು ಮತ್ತು ಇಳುವರಿಯನ್ನು ಹೆಚ್ಚಿಸಲು ಬಿತ್ತನೆಗೆ ಮುನ್ನ ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ ಮಾಡಿಸಿ.
2. **ನೀರಾವರಿ ಸಮಯ**: ನೀರಿನ ನಷ್ಟವನ್ನು ಕಡಿಮೆ ಮಾಡಲು ಮುಂಜಾನೆ ಅಥವಾ ಸಂಜೆ ನೀರು ಹಾಯಿಸಿ.
3. **ಬೆಳೆ ಸರದಿ**: ಮಣ್ಣಿನ ಸಾರವನ್ನು ಹೆಚ್ಚಿಸಲು ಧಾನ್ಯಗಳ ನಂತರ ದ್ವಿದಳ ಧಾನ್ಯಗಳನ್ನು ಬೆಳೆಯಿರಿ.

*ಇಂದು ನಿಮಗೆ ಯಾವ ಮಾಹಿತಿ ಬೇಕು? ನಿರ್ದಿಷ್ಟ ಬೆಳೆಗಳು, ಕೀಟಗಳು ಅಥವಾ ರಸಗೊಬ್ಬರಗಳ ಬಗ್ಗೆ ಕೇಳಿ!*`;
  }

  if (language === 'ml') {
    if (isPest) {
      return `### 🌾 വിള സംരക്ഷണവും കീടനയന്ത്രണവും
വിളകൾ രോഗങ്ങളിൽ നിന്നും കീടങ്ങളിൽ നിന്നും സംരക്ഷിക്കാൻ ചില മാർഗ്ഗങ്ങൾ:

1. **വേപ്പെണ്ണ ലായനി**: 1 ലിറ്റർ വെള്ളത്തിൽ 5 മില്ലി വേപ്പെണ്ണയും 5 മില്ലി സോപ്പ് ലായനിയും കലർത്തി തളിക്കുക. ഇത് ചെറുകീടങ്ങളെ നിയന്ത്രിക്കും.
2. **ജൈവ നിയന്ത്രണം**: കുമിൾ രോഗങ്ങൾ തടയാൻ ട്രൈക്കോഡെർമ ഉപയോഗിച്ച് വിത്തുചികിത്സ നടത്തുക.
3. **സുരക്ഷ**: രാസകീടനാശിനികൾ ഉപയോഗിക്കുമ്പോൾ മാസ്കും കയ്യുറകളും ധരിക്കുക.`;
    }
    if (isSoil) {
      return `### 🧪 മണ്ണ് സംരക്ഷണവും വളപ്രയോഗവും
മണ്ണിൻ്റെ ഫലഭൂയിഷ്ഠത കൂട്ടാൻ:

1. **ജൈവവളം**: നിലമൊരുക്കുമ്പോൾ ഏക്കറിന് 5-10 ടൺ കാലിവളമോ കമ്പോസ്റ്റോ ചേർക്കുക.
2. **പച്ചിലവളം**: ചണമ്പോ ധഞ്ചയോ വളർത്തി 45 ദിവസത്തിന് ശേഷം മണ്ണിൽ ഉഴുതു ചേർക്കുക.
3. **ജൈവവളങ്ങൾ**: അസോസ്പൈറില്ലം അല്ലെങ്കിൽ റൈസോബിയം പോലുള്ളവ ഉപയോഗിക്കുക.`;
    }
    return `### 👋 നമസ്കാരം! കിഷാൻ അലേർട്ട് AI-ലേക്ക് സ്വാഗതം
ഞാൻ നിങ്ങളുടെ കൃഷി സഹായിയാണ്. കൃഷി രീതികൾ, കീടനയന്ത്രണം, മണ്ണുപരിശോധന, സർക്കാർ പദ്ധതികൾ എന്നിവയെക്കുറിച്ച് ഞാൻ മാർഗ്ಗനിർദ്ദേശം നൽകാം.

**മൂന്ന് പ്രധാന കൃഷി നിർദ്ദേശങ്ങൾ**:
1. **മണ്ണുപരിശോധന**: വളപ്രയോഗം ഫലപ്രദമാക്കാനും ഉൽപ്പാദനം കൂട്ടാനും മണ്ണുപരിശോധന നടത്തുക.
2. **നനയ്ക്കൽ**: ജലനഷ്ടം ഒഴിവാക്കാൻ രാവിലെയോ വൈകുന്നേരമോ നനയ്ക്കുക.
3. **വിളപരിക്രമണം**: മണ്ണ് ഫലഭൂയിഷ്ഠമാക്കാൻ പയറുവർഗ്ഗങ്ങൾ മാറി മാറി കൃഷി ചെയ്യുക.

*ഇന്ന് ഞാൻ നിങ്ങൾക്ക് എങ്ങനെയാണ് സഹായിക്കേണ്ടത്? വിളകളെക്കുറിച്ചോ കീടങ്ങളെക്കുറിച്ചോ ചോദിക്കൂ!*`;
  }

  // English (Default)
  if (isPest) {
    return `### 🌾 Crop Health & Pest Protection Advice
Based on your query, here is practical advice to protect your crop:

1. **Organic Solution (Recommended)**: Spray **Neem Oil (1500 ppm)** mixed with 5ml liquid soap in 1 liter of water. This is highly effective against sucking pests, aphids, and whiteflies.
2. **Biological Control**: Use Trichoderma viride or Pseudomonas fluorescens for seed/root treatment to prevent fungal diseases.
3. **Safety Precautions**: If you must use chemical pesticides, wear protective gloves and mask. Avoid spraying during high winds or midday heat. Ensure a safe waiting period (harvest interval) before consuming the crop.

*Note: For a precise diagnosis, you can upload a photo of the affected plant in our **Crop Diagnosis** tab!*`;
  }
  if (isSoil) {
    return `### 🧪 Soil Fertility & Nutrient Management Advice
To build rich, productive soil for sustainable farming:

1. **Organic Replenishment**: Apply well-decomposed **Cow Dung Manure** or **Vermicompost** (approx. 5-10 tons per acre) during land preparation.
2. **Green Manuring**: Grow nitrogen-fixing crops like Dhaincha (*Sesbania*) or Sunnhemp and plough them back into the soil after 45 days.
3. **NPK Balance**: Avoid excessive Urea. Use a balanced ratio of Nitrogen, Phosphorus, and Potassium based on your Soil Health Card recommendations.
4. **Bio-fertilizers**: Mix Azotobacter or Rhizobium cultures with organic manure to naturally fix nitrogen.`;
  }
  if (isScheme) {
    return `### 🏛️ Government Schemes & Support
Here are the major active agricultural support programs you can benefit from:

1. **PM-KISAN**: Provides ₹6,000 annually in three equal installments directly to bank accounts of land-holding farmer families.
2. **Pradhan Mantri Fasal Bima Yojana (PMFBY)**: Crop insurance protecting against natural calamities at extremely low premium rates (2% for Kharif, 1.5% for Rabi).
3. **Seed & Fertilizer Subsidies**: Available through your local Primary Agricultural Credit Society (PACS) or district agriculture office. Bring your land documents and Aadhaar card to apply.`;
  }

  return `### 👋 Namaste! Welcome to Kishan Alert AI Assistant
I am your smart agricultural advisor. I can guide you on crop management, pest control, soil fertility, and government schemes.

Here are **three essential farming practices** for the current season:
1. **Soil Testing**: Always test your soil before sowing to save on fertilizer costs and improve yield.
2. **Irrigation Timing**: Irrigate early morning or late evening to minimize water loss due to evaporation.
3. **Crop Rotation**: Alternate grains with legumes (like pulses) to naturally restore soil nitrogen and break pest life cycles.

*How can I help you today? Please feel free to ask about specific crops, pests, fertilizers, or local farming concerns!*`;
}

function getCropSoilAdvice(message: string, language: string): string | null {
  const msg = (message || '').trim().toLowerCase();
  
  const soilOrGrowKeywords = [
    'soil', 'mitti', 'grow', 'suit', 'best', 'type', 'quality', 'condition',
    'मिट्टी', 'मृदा', 'उगाने', 'उपयुक्त', 'सर्वोत्तम', 'प्रकार',
    'மண்', 'வளர', 'பொருந்தும்', 'சிறந்தது', 'வகை',
    'మట్టి', 'నేల', 'పెరగడానికి', 'అనుకూలం', 'ఉత్తమం', 'రకం',
    'ಮಣ್ಣು', 'ಬೆಳೆಯಲು', 'ಸೂಕ್ತ', 'ಉತ್ತಮ', 'ಪ್ರಕಾರ',
    'മണ്ണു', 'വളരാൻ', 'അനുയോജ്യം', 'മികച്ചത്', 'തരം'
  ];

  const hasSoilOrGrowContext = soilOrGrowKeywords.some(kw => msg.includes(kw));
  if (!hasSoilOrGrowContext) return null;

  // 1. Paddy / Rice
  const paddyKeywords = ['paddy', 'rice', 'धान', 'நெல்', 'వరి', 'ಭತ್ತ', 'നെല്ല്'];
  if (paddyKeywords.some(kw => msg.includes(kw))) {
    if (language === 'hi') {
      return `### 🌾 धान (Paddy/Rice) के लिए उपयुक्त मिट्टी की जानकारी
धान की सफल खेती और बंपर पैदावार के लिए मिट्टी में कुछ खास गुणों का होना आवश्यक है:

1. **सर्वोत्तम मिट्टी**: **चिकनी मिट्टी (Clayey Soil) या मटियार दोमट (Clay Loam)** धान के लिए सबसे उपयुक्त होती है। इस प्रकार की मिट्टी में पानी रोकने की क्षमता (Water Retention) बहुत अधिक होती है, जो धान की फसल के लिए आवश्यक है क्योंकि धान के खेतों में प्रारंभिक अवस्था में पानी खड़ा रहना चाहिए।
2. **दोमट और गाद दोमट (Loam & Silt Loam)**: यदि सिंचाई के प्रचुर साधन उपलब्ध हों, तो इस मिट्टी में भी धान उगाया जा सकता है। बलुई या रेतीली मिट्टी धान के लिए **अनुपयुक्त** होती है क्योंकि उसमें पानी बहुत जल्दी बह जाता है, जिससे पोषक तत्व भी नष्ट हो जाते हैं।
3. **मिट्टी का पीएच (pH) मान**: धान की खेती के लिए मिट्टी का पीएच मान **5.5 से 7.0** (हल्का अम्लीय से उदासीन) के बीच होना सबसे अच्छा माना जाता है।
4. **जैविक कार्बन**: मिट्टी में जैविक खाद की अच्छी मात्रा होनी चाहिए। बुवाई या रोपाई से पहले प्रति एकड़ 5 से 10 टन अच्छी तरह सड़ी हुई गोबर की खाद (FYM) या कम्पोस्ट अवश्य मिलाएं।
5. **कठोर उपसतह (Hard Subsoil Pan)**: मिट्टी की निचली सतह (15-20 सेमी नीचे) पर चिकनी मिट्टी की एक सख्त परत होना बहुत फायदेमंद होता है, जिससे पानी जमीन में बहुत नीचे रिस नहीं पाता और खेत में नमी बनी रहती है।`;
    }
    if (language === 'ta') {
      return `### 🌾 நெல் (Paddy) சாகுபடிக்கு உகந்த மண் வகை
நெல் பயிர் செழித்து வளர்ந்து நல்ல மகசூல் தர குறிப்பிட்ட மண் பண்புகள் தேவை:

1. **சிறந்த மண் வகை**: **களிமண் (Clayey Soil) அல்லது களிமண் கலந்த வண்டல் மண் (Clay Loam)** மிகவும் உகந்தது. இந்த மண்ணில் நீர் தேங்கும் திறன் அதிகம் என்பதால் நெற்பயிருக்கு இது மிகவும் ஏற்றது.
2. **வண்டல் மண் (Loam)**: தொடர்ச்சியான நீர் ஆதாரங்கள் இருந்தால் வண்டல் மண்ணிலும் நெல் பயிரிடலாம். மணல் கலந்த மண் நெல் சாகுபடிக்கு **உகந்தது அல்ல**.
3. **மண் pH அளவு**: நெல் பயிரிட உகந்த pH அளவு **5.5 முதல் 7.0** வரை இருக்க வேண்டும்.
4. **இயற்கை உரம்**: நடவு செய்வதற்கு முன் ஒரு ஏக்கருக்கு 5-10 டன் மட்கிய தொழுஉரம் இட வேண்டும்.`;
    }
    if (language === 'te') {
      return `### 🌾 వరి (Paddy) సాగుకు అనుకూలమైన నేలలు
వరి పంట బాగా పెరిగి ఎక్కువ దిగుబడి రావడానికి నేల రకం చాలా ముఖ్యం:

1. **అత్యంత అనుకూలమైన నేలలు**: **బంకమట్టి నేలలు (Clayey Soils) లేదా రేగడి లోమ్ నేలలు (Clay Loams)** వరికి అత్యంత అనుకూలం. ఇవి నీటిని నిలిపి ఉంచే అధిక సామర్థ్యం కలిగి ఉంటాయి.
2. **లోమ్ నేలలు**: నిరంతర నీటి సదుపాయం ఉంటే లోమ్ నేలల్లో కూడా పండించవచ్చు. ఇసుక నేలలు వరి సాగుకు **అనుకూలం కావు**.
3. **నేల pH విలువ**: వరి సాగుకు నేల pH విలువ **5.5 నుండి 7.0** వరకు ఉండటం మంచిది.
4. **సేంద్రీయ ఎరువులు**: నాటడానికి ముందు ఎకరానికి 5-10 టన్నుల బాగా కుళ్లిన పశువుల ఎరువును వేయాలి.`;
    }
    if (language === 'kn') {
      return `### 🌾 ಭತ್ತ (Paddy) ಬೇಸಾಯಕ್ಕೆ ಸೂಕ್ತವಾದ ಮಣ್ಣಿನ ವಿವರ
ಭತ್ತದ ಬೆಳೆಗೆ ನೀರನ್ನು ಹಿಡಿದಿಟ್ಟುಕೊಳ್ಳುವ ಮಣ್ಣು ಅತ್ಯಂತ ಅವಶ್ಯಕವಾಗಿದೆ:

1. **ಉತ್ತಮ ಮಣ್ಣಿನ ಪ್ರಕಾರ**: **ಜೇಡಿ ಮಣ್ಣು (Clayey Soil) ಅಥವಾ ಜೇಡಿ ಮಿಶ್ರಿತ ಲೋಮ್ ಮಣ್ಣು (Clay Loams)** ಅತ್ಯಂತ ಸೂಕ್ತ. ಇವು ನೀರನ್ನು ಹಿಡಿದಿಟ್ಟುಕೊಳ್ಳುವ ಹೆಚ್ಚಿನ ಸಾಮರ್ಥ್ಯ ಹೊಂದಿವೆ.
2. **ಲೋಮ್ ಮಣ್ಣು**: ಸತತ ನೀರಾವರಿ ಸೌಲಭ್ಯವಿದ್ದರೆ ಈ ಮಣ್ಣಿನಲ್ಲೂ ಬೆಳೆಯಬಹುದು. ಮರಳು ಮಿಶ್ರಿತ ಮಣ್ಣು ಭತ್ತಕ್ಕೆ **ಯೋಗ್ಯವಲ್ಲ**.
3. **ಮಣ್ಣಿನ pH ಪ್ರಮಾಣ**: ಭತ್ತಕ್ಕೆ ಸೂಕ್ತವಾದ ಮಣ್ಣಿನ pH ಪ್ರಮಾಣವು **5.5 ರಿಂದ 7.0** ಇರಬೇಕು.
4. **ಸಾವಯವ ಗೊಬ್ಬರ**: ನಾಟಿ ಮಾಡುವ ಮುನ್ನ ಎಕರೆಗೆ 5-10 ಟನ್ ಮட்கಿದ ಕೊಟ್ಟಿಗೆ ಗೊಬ್ಬರವನ್ನು ಮಣ್ಣಿಗೆ ಸೇರಿಸಿ.`;
    }
    if (language === 'ml') {
      return `### 🌾 നെല്ല് (Paddy) കൃഷിക്ക് അനുയോജ്യമായ മണ്ണുകൾ
നെൽക്കൃഷിയിൽ മികച്ച വിളവ് ലഭിക്കാൻ മണ്ണിൻ്റെ ഗുണനിലവാരം പ്രധാനമാണ്:

1. **ഏറ്റവും അനുയോജ്യമായ മണ്ണ്**: വെള്ളം കെട്ടിനിൽക്കാൻ ശേഷിയുള്ള **കരിമണ്ണും (Clayey Soil) കളിമൺ കലർന്ന മണ്ണും (Clay Loam)** ആണ് ഏറ്റവും നല്ലത്.
2. **ലോം മണ്ണുകൾ**: ആവശ്യത്തിന് ജലസേചനമുണ്ടെങ്കിൽ ഇവയിലും കൃഷി ചെയ്യാം. മണൽ മണ്ണ് നെൽകൃഷിക്ക് **അനുയോജ്യമല്ല**.
3. **മണ്ണിൻ്റെ pH മൂല്യം**: നെൽകൃഷിക്ക് അനുയോജ്യമായ pH പരിധി **5.5 നും 7.0 നും** ഇടയിലാണ്.
4. **ജൈവവളം**: നടീലിന് മുൻപ് ഏക്കറിന് 5-10 ടൺ ജൈവവളം ചേർത്ത് മണ്ണ് ഒരുക്കുക.`;
    }
    // Default English
    return `### 🌾 Soil Type Recommendations for Paddy / Rice
Paddy (Rice) is a crop that requires specific soil characteristics for optimal growth and high yields:

1. **Best Soil Type**: **Clayey or Clay Loam Soil** is the most ideal. These soils have excellent water retention capacity, which is crucial since paddy fields need to be flooded or kept constantly wet during initial growth stages.
2. **Silt Loam & Loam Soils**: Can also be used if there is an abundant and continuous source of irrigation water. Sandy soils are generally **unsuitable** because water drains too quickly, leading to nutrient loss and water stress.
3. **Soil pH Range**: The ideal soil pH for paddy cultivation is between **5.5 and 7.0** (slightly acidic to neutral).
4. **Organic Matter**: High organic matter content in the soil improves soil structure and water-holding capacity. Apply 5 to 10 tons of well-decomposed farmyard manure (FYM) or compost per acre before transplantation.
5. **Impermeable Subsoil Layer**: A clayey subsoil layer at a depth of 15-20 cm is highly beneficial because it creates a natural water-holding pan, preventing deep percolation of water.`;
  }

  // 2. Wheat (गेहूं)
  const wheatKeywords = ['wheat', 'गेहूं', 'गेहूँ', 'கோதுமை', 'గోధుమ', 'ಗೋಧಿ', 'ഗോതമ്പ്'];
  if (wheatKeywords.some(kw => msg.includes(kw))) {
    if (language === 'hi') {
      return `### 🌾 गेहूं (Wheat) के लिए उपयुक्त मिट्टी की जानकारी
गेहूं की अच्छी फसल के लिए मिट्टी की सही गुणवत्ता निम्नलिखित है:

1. **सर्वोत्तम मिट्टी**: **दोमट (Loamy Soil) या मटियार दोमट (Clay Loam)** गेहूं के लिए सबसे आदर्श मानी जाती है। इसमें जल निकासी अच्छी होती है और हवा का प्रवाह बेहतर रहता है।
2. **जल निकासी (Drainage)**: मिट्टी में उत्कृष्ट जल निकासी होनी चाहिए क्योंकि पानी का जमा होना गेहूं की जड़ों को नुकसान पहुंचाता है।
3. **मिट्टी का पीएच (pH) मान**: उदासीन मिट्टी (pH **6.0 से 7.5**) गेहूं के लिए सर्वोत्तम होती है।
4. **तैयारी**: बुवाई से पहले खेत की अच्छी तरह जुताई करके मिट्टी को भुरभुरा बना लें और केंचुआ खाद या गोबर की खाद डालें।`;
    }
    return `### 🌾 Soil Type Recommendations for Wheat
Wheat grows best under specific soil conditions to ensure strong rooting and grain development:

1. **Best Soil Type**: **Well-drained Fertile Loam or Clay Loam soils** are ideal for wheat. They offer a good balance of moisture retention and aeration.
2. **Drainage**: Excellent drainage is mandatory. Waterlogging or standing water at any growth stage will severely damage wheat roots and reduce yield.
3. **Soil pH Range**: Neutral soils with a pH between **6.0 and 7.5** are optimal.
4. **Soil Prep**: Ensure a fine-textured tilth by deep ploughing, and incorporate organic compost before sowing.`;
  }

  // 3. Cotton (कपास)
  const cottonKeywords = ['cotton', 'कपास', 'பருத்தி', 'ప్రత్తి', 'హత్తి', 'ಹತ್ತಿ', 'പരുത്തി'];
  if (cottonKeywords.some(kw => msg.includes(kw))) {
    if (language === 'hi') {
      return `### 🪵 कपास (Cotton) के लिए उपयुक्त मिट्टी की जानकारी
कपास को "सफेद सोना" भी कहा जाता है, और इसके लिए विशिष्ट प्रकार की मिट्टी आवश्यक है:

1. **सर्वोत्तम मिट्टी**: **काली मिट्टी (Black Cotton Soil या Regur)** कपास के लिए सबसे प्रसिद्ध और सर्वोत्तम है। यह गहराई तक नमी को संजोए रखने में सक्षम होती है।
2. **वैकल्पिक मिट्टी**: गहरी दोमट और जल निकासी वाली जلوढ़ मिट्टी (Alluvial soils) में भी इसकी अच्छी पैदावार होती है।
3. **मिट्टी का पीएच (pH) मान**: कपास के लिए आदर्श पीएच मान **6.0 से 8.0** है।
4. **जलभराव से बचाव**: कपास की फसल जलभराव के प्रति अत्यधिक संवेदनशील है; इसलिए खेत में जलनिकासी की उचित व्यवस्था होनी चाहिए।`;
    }
    return `### 🪵 Soil Type Recommendations for Cotton
Cotton is famously associated with specific soil profiles for successful boll development:

1. **Best Soil Type**: **Deep Black Cotton Soil (Regur soil)** is the absolute best due to its rich clay content and self-ploughing, high moisture-retention characteristics.
2. **Alternative Soils**: Deep, well-drained alluvial or loamy soils also produce excellent cotton yields.
3. **Soil pH Range**: Cotton is moderately tolerant to salinity and grows best in pH ranges from **6.0 to 8.0**.
4. **Drainage**: Highly sensitive to waterlogging. Ensure excellent surface drainage in heavy clay areas.`;
  }

  // 4. Tomato (टमाटर)
  const tomatoKeywords = ['tomato', 'टमाटर', 'தக்காளி', 'టమోటా', 'టొమాటో', 'ಟೊಮೆಟೊ', 'തക്കാളി'];
  if (tomatoKeywords.some(kw => msg.includes(kw))) {
    if (language === 'hi') {
      return `### 🍅 टमाटर (Tomato) के लिए उपयुक्त मिट्टी की जानकारी
टमाटर एक लोकप्रिय और संवेदनशील फसल है, जिसके लिए उत्तम मिट्टी आवश्यक है:

1. **सर्वोत्तम मिट्टी**: **अच्छी जलनिकासी वाली बलुई दोमट (Sandy Loam) या दोमट (Loam)** मिट्टी सबसे उपयुक्त होती है।
2. **मिट्टी का पीएच (pH) मान**: आदर्श पीएच स्तर **6.0 से 7.0** (हल्का अम्लीय) होना चाहिए।
3. **पोषक तत्व**: टमाटर को कैल्शियम और जैविक कार्बन की प्रचुर मात्रा चाहिए होती है। मिट्टी में कैल्शियम की कमी से फल का निचला हिस्सा सड़ने लगता है (Blossom End Rot)। रोपाई के समय जिप्सम या कम्पोस्ट जरूर डालें।
4. **जलभराव**: जलभराव से जड़ सड़न रोग हो सकता है, इसलिए ऊंची क्यारियों (Raised beds) पर टमाटर उगाना सबसे सुरक्षित है।`;
    }
    return `### 🍅 Soil Type Recommendations for Tomato
Tomatoes are sensitive feeders that require a loose, nutrient-rich soil structure:

1. **Best Soil Type**: **Deep, well-drained Sandy Loam or Loamy soils** are ideal. They allow easy root penetration and optimal moisture levels.
2. **Soil pH Range**: Slightly acidic to neutral pH between **6.0 and 7.0** is perfect.
3. **Nutrient Requirements**: Highly demanding of calcium and organic carbon. Calcium deficiency leads to Blossom End Rot. Add plenty of compost and organic mulch.
4. **Drainage**: Ensure superb drainage; water stagnating around stems quickly leads to root rot or bacterial wilt.`;
  }

  // 5. Maize (मक्का)
  const maizeKeywords = ['maize', 'corn', 'मक्का', 'मक्के', 'சோளம்', 'మొక్కజొన్న', 'ಮೆಕ್ಕೆಜೋಳ', 'ചോളം'];
  if (maizeKeywords.some(kw => msg.includes(kw))) {
    if (language === 'hi') {
      return `### 🌽 मक्का (Maize) के लिए उपयुक्त मिट्टी की जानकारी
मक्के की शानदार बढ़त के लिए उपयुक्त मिट्टी का विवरण निम्नलिखित है:

1. **सर्वोत्तम मिट्टी**: **गहरी दोमट मिट्टी (Deep Loam)** जिसमें नाइट्रोजन और जैविक तत्व प्रचुर मात्रा में हों, सबसे उपयुक्त होती है।
2. **जल निकासी**: मक्के की फसल पानी के जमाव को सहन नहीं कर सकती है। अत्यधिक जलभराव से पत्तियां पीली पड़ जाती हैं और विकास रुक जाता है।
3. **मिट्टी का पीएच (pH) मान**: मक्के के लिए पीएच मान **5.5 से 7.5** के बीच होना चाहिए।
4. **जैविक खाद**: बुवाई से पहले पर्याप्त कम्पोस्ट डालकर जुताई करें ताकि मिट्टी हवादार और पोषक तत्वों से भरपूर हो।`;
    }
    return `### 🌽 Soil Type Recommendations for Maize / Corn
Maize is a heavy feeder that requires aerated, high-fertility soils to reach its potential:

1. **Best Soil Type**: **Deep, fertile, well-drained Loam or Silt Loam soils** are ideal. It requires a deep soil profile since it has a robust rooting system.
2. **Drainage**: Highly sensitive to poor drainage and waterlogging. Avoid heavy tight clay soils unless they are well-tilled and drained.
3. **Soil pH Range**: Performs best in neutral soil with a pH range of **5.5 to 7.5**.
4. **Fertility**: Needs high nitrogen and organic content. Prepare the land with 6-8 tons of farmyard manure per acre.`;
  }

  return null;
}

function checkAgriRules(message: string, language: string): string | null {
  const msg = (message || '').trim().toLowerCase();
  
  // 1. Example 1: Proper Agricultural Query (Exact or semantic matching for yellowing tomato spots)
  if (msg.includes('tomato leaves') && (msg.includes('yellow') || msg.includes('spots'))) {
    if (language === 'hi') {
      return `यह अगेती झुलसा (Early Blight) लग रहा है, जो एक आम फंगल बीमारी है। इन चरणों का पालन करें: 1. संक्रमित निचले पत्तों को काटकर नष्ट कर दें। 2. पत्तों को सूखा रखने के लिए ऊपर से पानी देने से बचें। 3. यदि यह फैलता है, तो जैविक तांबा-आधारित कवकनाशी (copper-based fungicide) का प्रयोग करें। 4. अगले सीजन में फसल चक्र (crop rotation) अपनाएं।`;
    }
    return `This sounds like Early Blight, a common fungal disease. Follow these steps: 1. Prune and destroy infected lower leaves. 2. Avoid overhead watering to keep leaves dry. 3. Apply an organic copper-based fungicide if it spreads. 4. Rotate your crops next season.`;
  }

  // 2. Example 2: Off-Topic Query (Enforcing Boundaries)
  // Exact or close matching for writing poems, scripts, non-agricultural general queries
  if (msg.includes('poem about space') || (msg.includes('poem') && msg.includes('space')) || msg === 'can you write a poem about space?') {
    if (language === 'hi') {
      return `मैं केवल खेती और कृषि संबंधी प्रश्नों में सहायता कर सकता हूँ। मुझे बताएं कि क्या आपके पास फसलों, मिट्टी या पशुधन के बारे में प्रश्न हैं!`;
    }
    return `I can only assist with farming and agricultural queries. Let me know if you have questions about crops, soil, or livestock!`;
  }

  // 3. Example 3: Handling Uncertain/Wrong Data Safely (Siberia / Rare Soil type)
  if (msg.includes('siberia') || msg.includes('northern siberia') || msg.includes('rare soil type in northern siberia') || msg.includes('fertilizer mix for a rare soil type in northern siberia')) {
    if (language === 'hi') {
      return `मेरे पास इसका सटीक उत्तर देने के लिए पर्याप्त विशिष्ट डेटा नहीं है। कृपया सटीक क्षेत्रीय सिफारिशों के लिए अपने स्थानीय कृषि विस्तार कार्यालय या स्थानीय मृदा परीक्षण प्रयोगशाला से संपर्क करें।`;
    }
    return `I do not have enough specific data to answer this accurately. Please consult your local agricultural extension office or a local soil testing lab for precise regional recommendations.`;
  }

  // General off-topic instruction matching
  const offTopicTriggers = [
    'write a poem', 'write a song', 'write a story', 'tell me a joke', 'write code', 'javascript', 'python', 'html', 'css',
    'react component', 'create a website', 'programming', 'stocks', 'cryptocurrency', 'bitcoin', 'investment tips',
    'capital of', 'who is', 'biography of', 'recipe for pizza', 'how to cook', 'space rocket', 'galaxy', 'universe', 'black hole',
    'nasa', 'spacex', 'astronaut', 'astrophysics', 'quantum physics', 'cricket score', 'movie review', 'actor', 'celebrity'
  ];

  if (offTopicTriggers.some(trigger => msg.includes(trigger))) {
    if (language === 'hi') {
      return `मैं केवल खेती और कृषि संबंधी प्रश्नों में सहायता कर सकता हूँ। मुझे बताएं कि क्या आपके पास फसलों, मिट्टी या पशुधन के बारे में प्रश्न हैं!`;
    }
    return `I can only assist with farming and agricultural queries. Let me know if you have questions about crops, soil, or livestock!`;
  }

  // General agricultural connection check
  const farmKeywords = [
    'farm', 'agri', 'crop', 'plant', 'pest', 'disease', 'fertilizer', 'soil', 'urea', 'compost', 'manure', 'livestock',
    'cattle', 'cow', 'goat', 'sheep', 'chicken', 'poultry', 'buffalo', 'insect', 'blight', 'spot', 'rot', 'water', 'irrigate',
    'seed', 'weed', 'harvest', 'scheme', 'pm-kisan', 'insurance', 'subsidy', 'weather', 'yield', 'organic', 'pesticide',
    'cultivat', 'garden', 'plough', 'till', 'sow', 'wheat', 'rice', 'paddy', 'tomato', 'potato', 'mustard', 'cotton',
    'chili', 'onion', 'garlic', 'maize', 'corn', 'sugarcane', 'millet', 'fungicide', 'herbicide', 'veterinary', 'dairy',
    'खेती', 'कृषि', 'फसल', 'पौधे', 'मिट्टी', 'खाद', 'यूरिया', 'बीमारी', 'कीट', 'गोबर', 'सिंचाई', 'बीज', 'कटाई', 'योजना',
    'धान', 'गेहूँ', 'सरसों', 'आलू', 'टमाटर', 'कपास', 'பயிர்', 'விவசாயம்', 'மண்', 'உரம்', 'பூச்சி', 'பயிர்', 'விவசாயம்',
    'పంట', 'వ్యవసాయం', 'నేల', 'ఎరువు', 'కీటకం', 'ಬೆಳೆ', 'ಕೃಷಿ', 'ಮಣ್ಣು', 'ಗೊಬ್ಬರ', 'കർഷകൻ', 'കൃഷി', 'മണ്ണ്', 'വളം', 'കീടം',
    // Allowed greetings/general prompts to introduce the bot
    'hello', 'hi', 'namaste', 'namaskar', 'hey', 'welcome', 'greet', 'morning', 'evening', 'how are you', 'how do you do',
    'नमस्ते', 'नमस्कार', 'வணக்கம்', 'నమస్కారం', 'ನಮಸ್ಕಾರ', 'നമസ്കാരം', 'help', 'मदद', 'सहायता', 'who are you', 'your name'
  ];

  const isAgriRelated = farmKeywords.some(keyword => msg.includes(keyword));

  if (!isAgriRelated) {
    if (language === 'hi') {
      return `मैं केवल खेती और कृषि संबंधी प्रश्नों में सहायता कर सकता हूँ।`;
    }
    return `I can only assist with farming and agricultural queries.`;
  }

  // General handling of highly unusual/distant geographical locations
  const unusualGeoKeywords = [
    'siberia', 'arctic', 'antarctic', 'antarctica', 'sahara', 'gobi', 'atacama', 'desert soil', 'permafrost', 'tundra',
    'mars soil', 'moon soil', 'lunar regolith', 'alien soil'
  ];

  if (unusualGeoKeywords.some(geo => msg.includes(geo))) {
    if (language === 'hi') {
      return `मेरे पास इसका सटीक उत्तर देने के लिए पर्याप्त विशिष्ट डेटा नहीं है। कृपया सटीक क्षेत्रीय सिफारिशों के लिए अपने स्थानीय कृषि विस्तार कार्यालय या स्थानीय मृदा परीक्षण प्रयोगशाला से संपर्क करें।`;
    }
    return `I do not have enough specific data to answer this accurately. Please consult your local agricultural extension office or a local soil testing lab for precise regional recommendations.`;
  }

  return null; // Passes all checks; can proceed to Gemini or full fallback generator
}

function getFallbackChatResponse(message: string, language: string): string {
  // Check specific crop-soil advice queries first
  const cropSoilAdvice = getCropSoilAdvice(message, language);
  if (cropSoilAdvice !== null) {
    return cropSoilAdvice;
  }

  // Always run rules validation first
  const ruleCheck = checkAgriRules(message, language);
  if (ruleCheck !== null) {
    return ruleCheck;
  }

  return getUnifiedOfflineFallback(message, language);
}

function getFallbackDiagnosis(symptoms: string = '', language: string = 'en') {
  const sym = (symptoms || '').toLowerCase();
  
  // Choose disease based on symptoms
  let diseaseName = 'Fungal Leaf Spot (Early Stage)';
  let confidence = 85;
  let symptomsList = ['Small brown circular spots on lower leaves', 'Yellowing of leaf margins', 'Premature leaf fall in severe cases'];
  let causes = ['High relative humidity and wet leaf surfaces', 'Poor spacing causing low air circulation', 'Over-head sprinkler irrigation'];
  let chemicalTreatment = ['Spray Mancozeb 75% WP @ 2g/liter of water', 'Apply Carbendazim 50% WP @ 1g/liter of water if spreading rapidly'];
  let organicTreatment = ['Spray Neem Oil (1500 ppm) @ 5ml/liter with soap', 'Apply Trichoderma viride bio-fungicide to the soil and foliage', 'Spray baking soda solution (1 tsp baking soda + 1 tsp vegetable oil in 1L water)'];
  let prevention = ['Ensure optimal spacing between plants', 'Avoid overhead watering; use drip or root watering', 'Remove and burn infected crop residues immediately after harvest'];
  let safetyPrecautions = ['Wear masks and gloves during pesticide application', 'Do not spray against the wind direction', 'Maintain 10-14 days safe period before harvesting'];

  if (sym.includes('rice') || sym.includes('paddy') || sym.includes('blast') || sym.includes('धान')) {
    diseaseName = 'Rice Blast (Magnaporthe oryzae)';
    symptomsList = ['Spindle-shaped spots with gray centers and brown borders on leaves', 'Bluish-grey lesions on node joints', 'Broken neck joints (neck blast)'];
    causes = ['Excessive Nitrogenous fertilizer application', 'High humidity and cloudy days with warm temperatures', 'Use of susceptible traditional varieties'];
    chemicalTreatment = ['Spray Tricyclazole 75% WP @ 0.6g/liter', 'Spray Isoprothiolane 40% EC @ 1.5ml/liter of water'];
    organicTreatment = ['Spray Pseudomonas fluorescens liquid culture @ 5g/liter', 'Apply neem seed kernel extract (NSKE 5%)', 'Spray fresh cow dung extract (20%) mixed with neem oil'];
    prevention = ['Use blast-resistant certified seeds', 'Avoid excessive nitrogen; apply nitrogen in 3-4 split doses', 'Destroy straw and stubble from previous infected crops'];
  } else if (sym.includes('tomato') || sym.includes('blight') || sym.includes('potato') || sym.includes('टमाटर') || sym.includes('आलू')) {
    diseaseName = 'Early Blight of Tomato / Potato (Alternaria solani)';
    symptomsList = ['Concentric rings (target board pattern) on older leaves', 'Dark sunken spots on stems and fruit', 'Yellowing around leaf spots causing dry foliage'];
    causes = ['Fungal spores overwintering in soil debris', 'Frequent rain and high humidity alternating with dry spells', 'Stressed plants due to nutrient deficiency'];
    chemicalTreatment = ['Spray Copper Oxychloride 50% WP @ 3g/liter', 'Spray Chlorothalonil @ 2g/liter of water'];
    organicTreatment = ['Spray Pseudomonas fluorescens culture @ 10g/liter', 'Spray fermented buttermilk whey diluted 10 times with water', 'Prune lower leaves to prevent splash infection from soil'];
    prevention = ['Practice 3-year crop rotation with non-solanaceous crops', 'Mulch the soil surface with straw to prevent soil-splash', 'Staking plants to keep foliage off the damp ground'];
  } else if (sym.includes('cotton') || sym.includes('boll') || sym.includes('कपास')) {
    diseaseName = 'Bollworm Infestation (Helicoverpa armigera)';
    symptomsList = ['Bored holes in buds, flowers, and cotton bolls', 'Shedding of squares and bolls', 'Larvae feeding visibly inside the bolls with excrete around the hole'];
    causes = ['Monoculture of cotton over wide areas', 'Delayed sowing and lack of trap crops', 'Weather conditions favorable for moth migration'];
    chemicalTreatment = ['Spray Spinosad 45% SC @ 0.3ml/liter', 'Apply Emamectin Benzoate 5% SG @ 0.5g/liter of water'];
    organicTreatment = ['Release Trichogramma egg parasitoids @ 5 cards/acre', 'Spray Bacillus thuringiensis (Bt) formulation @ 2g/liter', 'Set up pheromone traps (5 traps per acre) to monitor moths'];
    prevention = ['Grow trap crops like Marigold or Okra (1 row for every 10 cotton rows)', 'Sow early-maturing Bt cotton varieties', 'Deep summer ploughing to expose pupae to solar heat'];
  }

  // Handle localizations based on language code
  if (language === 'hi') {
    if (diseaseName.startsWith('Rice Blast')) {
      return {
        diseaseName: "धान का झोंका रोग (Rice Blast)",
        confidence,
        symptoms: ["पत्तियों पर नाव या धुरी के आकार के धब्बे", "धब्बों के बीच का भाग भूरा और किनारे बैंगनी होते हैं", "गांठों का काला होना और डंठल का टूट जाना (गर्दन झोंका)"],
        causes: ["नाइट्रोजन युक्त खाद (यूरिया) का बहुत अधिक उपयोग", "हवा में नमी और बादलों भरा मौसम", "खेत में पानी की कमी या सूखा पड़ना"],
        treatment: {
          chemical: ["ट्राइसाइक्लाजोल 75% WP का 0.6 ग्राम प्रति लीटर पानी में मिलाकर छिड़काव करें", "आइसोप्रोधियोलेन 40% EC का 1.5 मिलीलीटर प्रति लीटर पानी में छिड़काव करें"],
          organic: ["स्यूडोमोनास फ्लोरेसेंस लिक्विड कल्चर का 5 ग्राम प्रति लीटर पानी में छिड़काव करें", "नीम के बीज की गिरी का अर्क (NSKE 5%) का प्रयोग करें", "ताजा गाय के गोबर का अर्क (20%) नीम के तेल के साथ मिलाकर स्प्रे करें"]
        },
        prevention: ["रोग-प्रतिरोधी प्रमाणित बीजों का ही उपयोग करें", "यूरिया को एक बार में न डालकर 3-4 बार में बांटकर डालें", "संक्रमित फसल के अवशेषों को खेत से हटाकर नष्ट कर दें"],
        safetyPrecautions: ["दवा का छिड़काव करते समय मास्क और सुरक्षा चश्मा पहनें", "छिड़काव के बाद कम से कम 10 दिन तक फसल की कटाई न करें", "खाली बोतलों को जमीन में गहरा दबा दें"]
      };
    } else if (diseaseName.startsWith('Early Blight')) {
      return {
        diseaseName: "टमाटर/आलू का अगेती झुलसा रोग (Early Blight)",
        confidence,
        symptoms: ["पुरानी पत्तियों पर गोल भूरे छल्लेदार धब्बे (लक्ष्य बोर्ड की तरह)", "तने और फलों पर काले धंसे हुए धब्बे", "धब्बों के चारों ओर पीलापन जिससे पत्तियां सूख जाती हैं"],
        causes: ["मिट्टी के अवशेषों में जीवित फंगल बीजाणु", "बार-बार बारिश और उमस भरा मौसम", "मिट्टी में पोषक तत्वों की कमी से कमजोर पौधे"],
        treatment: {
          chemical: ["कॉपर ऑक्सीक्लोराइड 50% WP का 3 ग्राम प्रति लीटर पानी में छिड़काव करें", "क्लोरोथैलोनিল 2 ग्राम प्रति लीटर पानी में घोलकर स्प्रे करें"],
          organic: ["स्यूडोमोनास फ्लोरेसेंस 10 ग्राम प्रति लीटर पानी में मिलाकर छिड़काव करें", "खट्टी छाछ को 10 गुना पानी में मिलाकर पत्तियों पर स्प्रे करें", "नीचे की संक्रमित पत्तियों की समय पर छंटाई करें"]
        },
        prevention: ["टमाटर/आलू के बाद उसी खेत में बैंगन या मिर्च न लगाएं (फसल चक्र अपनाएं)", "मिट्टी की सतह पर पुआल की मल्चिंग करें ताकि पानी के छींटों से फंगस न फैले", "पौधों को डंडों के सहारे ऊपर बांधें ताकि पत्तियां जमीन से न छुएं"],
        safetyPrecautions: ["छिड़काव हमेशा हवा की दिशा में करें, विपरीत दिशा में नहीं", "हाथ-मुंह अच्छे से धोए बिना कुछ न खाएं", "बच्चों और पालतू जानवरों को छिड़काव वाले क्षेत्र से दूर रखें"]
      };
    } else {
      return {
        diseaseName: "फंगल लीफ स्पॉट / पत्ती धब्बा रोग (Fungal Leaf Spot)",
        confidence,
        symptoms: ["पत्तियों पर छोटे, गोलाकार भूरे रंग के धब्बे", "पत्तियों के किनारों का पीला पड़ना", "गंभीर मामलों में पत्तियों का समय से पहले गिरना"],
        causes: ["अत्यधिक नमी और गीले पत्ते", "पौधों के बीच कम दूरी जिससे हवा का संचरण ठीक नहीं रहता", "शाम के समय ऊपर से सिंचाई करना जिससे पत्ते रात भर गीले रहते हैं"],
        treatment: {
          chemical: ["मैनकोज़ेब 75% WP का 2 ग्राम प्रति लीटर पानी में छिड़काव करें", "कार्बेन्डाजिम 50% WP का 1 ग्राम प्रति लीटर पानी में स्प्रे करें"],
          organic: ["नीम का तेल (1500 ppm) 5 मिली प्रति लीटर साबुन के साथ मिलाकर छिड़काव करें", "ट्राइकोडर्मा विरिडी जैव-कवकनाशी को मिट्टी और पत्तियों पर लगाएं", "बेकिंग सोडा घोल (1 चम्मच बेकिंग सोडा + 1 चम्मच वनस्पति तेल 1L पानी में) स्प्रे करें"]
        },
        prevention: ["पौधों के बीच पर्याप्त दूरी सुनिश्चित करें", "ड्रिप सिंचाई प्रणाली का उपयोग करें ताकि पत्तियां गीली न हों", "संक्रमित पत्तियों और खरपतवार को तुरंत हटा दें"],
        safetyPrecautions: ["छिड़काव करते समय पूरा शरीर ढक कर रखें और सुरक्षा गियर पहनें", "छिड़काव के समय धूम्रपान या भोजन न करें", "रसायन को बच्चों की पहुंच से दूर ठंडी और सूखी जगह पर रखें"]
      };
    }
  }

  return {
    diseaseName,
    confidence,
    symptoms: symptomsList,
    causes,
    treatment: {
      chemical: chemicalTreatment,
      organic: organicTreatment
    },
    prevention,
    safetyPrecautions
  };
}

function getFallbackCropRecommendations(body: any) {
  const { soilType = 'Clayey', state = 'Uttar Pradesh', district = 'Varanasi', season = 'Kharif', rainfall = 'Medium', waterAvailability = 'Canal', temperature = 'Warm', language = 'en' } = body;
  
  const recommendations: any[] = [];
  const isHi = language === 'hi';

  if (season.toLowerCase() === 'rabi' || season.includes('रबी') || season.includes('सर्دی')) {
    recommendations.push({
      name: isHi ? "गेहूं (Wheat - HD 2967 / HD 3086)" : "Wheat (High-Yielding HD 2967 / HD 3086)",
      expectedYield: isHi ? "20 - 24 क्विंटल प्रति एकड़" : "20-24 Quintals per acre",
      profitability: isHi ? "₹45,000 - ₹60,000 प्रति एकड़ (एमएसपी मूल्य पर आधारित)" : "₹45,000 - ₹60,000 per acre (based on MSP)",
      waterRequirement: isHi ? "मध्यम (4 से 6 बार सिंचाई की आवश्यकता क्रांतिक अवस्थाओं पर)" : "Moderate (4-6 irrigations at critical growth stages)",
      fertilizerRequirement: isHi ? "NPK 120:60:40 किलोग्राम प्रति हेक्टेयर + जिंक सल्फेट 25 किलोग्राम" : "NPK 120:60:40 kg/ha + Zinc Sulphate 25 kg/ha",
      description: isHi 
        ? "यह आपके जिले की मिट्टी और तापमान के लिए सर्वोत्तम अनुकूल है। बुवाई का सही समय नवंबर का पहला पखवाड़ा है।" 
        : "Highly suitable for winter temperatures in your region. Optimum sowing window is November 1-15."
    });
    recommendations.push({
      name: isHi ? "सरसों (Mustard - Pusa Bold / RH 749)" : "Mustard (Pusa Bold / RH 749)",
      expectedYield: isHi ? "8 - 10 क्विंटल प्रति एकड़" : "8-10 Quintals per acre",
      profitability: isHi ? "₹35,000 - ₹45,000 प्रति एकड़ (कम लागत में उच्च लाभ)" : "₹35,000 - ₹45,000 per acre (high profit with low cost)",
      waterRequirement: isHi ? "کم (केवल 2 सिंचाई की आवश्यकता - फूल आने और दाना बनते समय)" : "Low (requires only 2 irrigations at flowering and pod filling)",
      fertilizerRequirement: isHi ? "NPK 80:40:40 किलोग्राम प्रति हेक्टेयर + जिप्सम (सल्फर स्रोत) 100 किलोग्राम" : "NPK 80:40:40 kg/ha + Gypsum (Sulphur source) 100 kg/ha",
      description: isHi 
        ? "यदि आपके पास पानी सीमित मात्रा में उपलब्ध है तो सरसों सबसे बेहतर विकल्प है। यह मिट्टी में नमी का कुशलतापूर्वक उपयोग करती है।" 
        : "Excellent cash crop for limited water availability. Utilizes soil residual moisture efficiently."
    });
  } else if (season.toLowerCase() === 'zaid' || season.includes('जायद') || season.includes('गर्मी')) {
    recommendations.push({
      name: isHi ? "मूंग दाल (Moong/Green Gram - IPM 02-3)" : "Green Gram / Moong (IPM 02-3)",
      expectedYield: isHi ? "4 - 5 क्विंटल प्रति एकड़" : "4-5 Quintals per acre",
      profitability: isHi ? "₹25,000 - ₹35,000 प्रति एकड़ (60-65 दिनों की अल्पावधि फसल)" : "₹25,000 - ₹35,000 per acre (short duration 60-65 days)",
      waterRequirement: isHi ? "मध्यम (गर्मी के कारण 10-12 दिनों के अंतराल पर हल्की सिंचाई)" : "Moderate (requires light irrigations at 10-12 days intervals due to summer heat)",
      fertilizerRequirement: isHi ? "NPK 20:40:20 किलोग्राम प्रति हेक्टेयर (नाइट्रोजन की कम आवश्यकता क्योंकि यह एक दलहन है)" : "NPK 20:40:20 kg/ha (low nitrogen required as it is a legume)",
      description: isHi 
        ? "जायद सीजन के लिए उत्तम। यह मिट्टी की उर्वरता और नाइट्रोजन स्तर को बढ़ाने में मदद करती है, जिससे अगली फसल को लाभ मिलता है।" 
        : "Fixes atmospheric nitrogen, improving soil fertility for the subsequent Kharif crop."
    });
    recommendations.push({
      name: isHi ? "भिंडी (Okra/Ladyfinger)" : "Okra / Ladyfinger (High Yielding Hybrid)",
      expectedYield: isHi ? "45 - 55 क्विंटल प्रति एकड़" : "45-55 Quintals per acre",
      profitability: isHi ? "₹50,000 - ₹75,000 प्रति एकड़ (बाजार मांग के अनुसार दैनिक आय)" : "₹50,000 - ₹75,000 per acre (provides steady daily income)",
      waterRequirement: isHi ? "उच्च (नियमित सिंचाई की आवश्यकता, विशेष रूप से गर्मी के दिनों में)" : "High (regular irrigations required to keep soil moist)",
      fertilizerRequirement: isHi ? "NPK 100:50:50 किलोग्राम प्रति हेक्टेयर + जैविक कम्पोस्ट 5 टन" : "NPK 100:50:50 kg/ha + 5 tons Organic Compost",
      description: isHi 
        ? "स्थानीय बाजारों में गर्मियों में हरी सब्जियों की मांग बहुत अधिक होती है। जलनिकासी वाली बलुई दोमट मिट्टी इसके लिए आदर्श है।" 
        : "Grown widely during warm months. Loam or sandy loam soils with good drainage ensure excellent fruit quality."
    });
  } else {
    recommendations.push({
      name: isHi ? "धान (Paddy/Rice - Pusa Basmati 1509)" : "Paddy / Rice (Pusa Basmati 1509 / PR 126)",
      expectedYield: isHi ? "22 - 26 क्विंटल प्रति एकड़" : "22-26 Quintals per acre",
      profitability: isHi ? "₹50,000 - ₹65,000 प्रति एकड़" : "₹50,000 - ₹65,000 per acre",
      waterRequirement: isHi ? "उच्च (खेत में पानी खड़ा रखने या बार-बार हल्की सिंचाई की आवश्यकता)" : "High (requires flooded or frequent wet conditions)",
      fertilizerRequirement: isHi ? "NPK 120:60:40 किलोग्राम प्रति हेक्टेयर + जिंक सल्फेट 25 किलोग्राम" : "NPK 120:60:40 kg/ha + Zinc Sulphate 25 kg/ha",
      description: isHi 
        ? "मानसून सीजन और आपके जिले में प्रचुर जल उपलब्धता के लिए आदर्श। मध्यम से भारी दोमट मिट्टी में सर्वोत्तम परिणाम।" 
        : "Standard premium choice for the monsoon season with your region's rainfall and water source."
    });
    recommendations.push({
      name: isHi ? "मक्का (Maize - Pioneer 3396)" : "Hybrid Maize (Pioneer 3396)",
      expectedYield: isHi ? "25 - 30 क्विंटल प्रति एकड़" : "25-30 Quintals per acre",
      profitability: isHi ? "₹35,000 - ₹48,000 प्रति एकड़ (औद्योगिक और चारा मांग)" : "₹35,000 - ₹48,000 per acre (high demand in poultry/starch industry)",
      waterRequirement: isHi ? "मध्यम (उत्कृष्ट जलनिकासी आवश्यक; जलभराव से बचें)" : "Moderate (well-drained soils are essential; sensitive to waterlogging)",
      fertilizerRequirement: isHi ? "NPK 150:60:40 किलोग्राम प्रति हेक्टेयर" : "NPK 150:60:40 kg/ha",
      description: isHi 
        ? "कम लागत वाली और बहुमुखी फसल। यदि मिट्टी में जलनिकासी अच्छी है, तो भारी दोमट या बलुई दोमट मिट्टी इसके लिए सर्वोत्तम है।" 
        : "Versatile crop with lower input risk. Loam soils with great drainage deliver the highest yield."
    });
  }

  return { recommendedCrops: recommendations };
}

function getFallbackSoilAnalysis(body: any) {
  const { ph = 6.5, organicCarbon = 'Medium', nitrogen = 'Medium', phosphorus = 'Medium', potassium = 'Medium', language = 'en' } = body;
  
  const phVal = parseFloat(ph) || 6.5;
  const isHi = language === 'hi';

  // Calculate soil score
  let score = 80;
  if (phVal < 5.5 || phVal > 8.5) score -= 15;
  else if (phVal < 6.0 || phVal > 8.0) score -= 5;

  if (organicCarbon === 'Low') score -= 10;
  else if (organicCarbon === 'High') score += 5;

  if (nitrogen === 'Low') score -= 10;
  if (phosphorus === 'Low') score -= 10;
  if (potassium === 'Low') score -= 5;

  const soilScore = Math.max(35, Math.min(95, score));

  let status = '';
  if (soilScore >= 80) {
    status = isHi ? "मिट्टी उत्कृष्ट स्वास्थ्य में है! पोषक तत्व संतुलित हैं।" : "Soil is in excellent health with optimal fertility.";
  } else if (soilScore >= 60) {
    status = isHi ? "मिट्टी मध्यम स्वास्थ्य में है। कुछ सूक्ष्म पोषक तत्वों और जैविक सुधार की आवश्यकता है।" : "Soil is moderately healthy. Needs organic carbon replenishment and targeted NPK adjustments.";
  } else {
    status = isHi ? "मिट्टी का स्वास्थ्य कमजोर है। तत्काल सुधार और जैविक खाद प्रबंधन की आवश्यकता है।" : "Soil is depleted. Requires immediate organic amendments and active fertility restoration.";
  }

  let organicCarbonAdvice = '';
  if (organicCarbon === 'Low') {
    organicCarbonAdvice = isHi 
      ? "जैविक कार्बन 0.5% से कम है। बुवाई से पहले प्रति एकड़ 10 टन गोबर की खाद या 3 टन वर्मीकंपोस्ट अवश्य डालें।" 
      : "Organic carbon is critical (<0.5%). Incorporate 10 tons of farmyard manure or 3 tons of vermicompost per acre during field preparation.";
  } else {
    organicCarbonAdvice = isHi 
      ? "जैविक कार्बन का स्तर संतोषजनक है। इसे बनाए रखने के लिए फसल अवशेषों को न जलाएं और कम्पोस्ट डालें।" 
      : "Organic carbon level is stable. Maintain this by mulching, crop rotation, and adding regular compost.";
  }

  let npkAdvice = '';
  if (nitrogen === 'Low' || phosphorus === 'Low' || potassium === 'Low') {
    npkAdvice = isHi 
      ? "पोषक तत्वों की कमी पाई गई है। बेसल खुराक के रूप में डीएपी (DAP) या एमओपी (MOP) का संतुलित छिड़काव करें। यूरिया का अत्यधिक प्रयोग न करें।" 
      : "Specific nutrients are deficient. Apply a balanced basal dose of NPK (such as 12:32:16 or DAP) and avoid over-applying nitrogen/urea.";
  } else {
    npkAdvice = isHi 
      ? "एनपीके का स्तर संतुलित है। खड़ी फसल में केवल जरूरत के अनुसार नाइट्रोजन की टॉप ड्रेसिंग करें।" 
      : "NPK ratio is balanced. Only use nitrogen top-dressing at active tillering or vegetative stages as needed.";
  }

  let compostAdvice = isHi 
    ? "अच्छी तरह सड़ी हुई जैविक खाद का उपयोग करें। कच्चा गोबर डालने से दीमक की समस्या हो सकती है।" 
    : "Always use well-decomposed manure. Fresh cow dung attracts termites and can introduce soil pathogens.";

  let greenManureAdvice = isHi 
    ? "खरीफ बुवाई से पहले ढैंचा (Dhaincha) की हरी खाद उगाएं और 40-45 दिनों के बाद इसे खेत में जोतकर मिला दें।" 
    : "Grow green manure crops like Dhaincha (Sesbania) or Sunnhemp before the main season and plough them in at 45 days.";

  let vermicompostAdvice = isHi 
    ? "खड़ी फसलों में पंक्तियों के बीच प्रति एकड़ 1.5 से 2 टन वर्मीकंपोस्ट डालें और हल्की सिंचाई करें।" 
    : "Apply 1.5-2 tons of vermicompost per acre in active root zones of standing crops, followed by light irrigation.";

  let biofertilizerAdvice = isHi 
    ? "एजोटोबैक्टर (नाइट্রोजन के लिए) और पीएसबी (फॉस्फोरस घोलक बैक्टीरिया) को 200 ग्राम प्रति एकड़ की दर से जैविक खाद में मिलाकर प्रयोग करें।" 
    : "Use Azotobacter (for nitrogen) and PSB (Phosphate Solubilizing Bacteria) @ 200g/acre mixed with organic manure.";

  let soilImprovementPlan = [
    isHi ? "चरण 1: मिट्टी के अत्यधिक खारेपन या अम्लीयता को सुधारने के लिए मिट्टी परीक्षण के आधार पर जिप्सम या चूना डालें।" : "Step 1: Correct soil pH variations. Use Gypsum for alkaline soils or Lime for acidic soils based on testing.",
    isHi ? "चरण 2: बुवाई से पहले हरी खाद (जैसे ढैंचा) उगाकर मिट्टी में मिलाएं ताकि प्राकृतिक नाइट्रोजन और जैविक कार्बन बढ़ सके।" : "Step 2: Cultivate green manure crops and incorporate them into the soil to boost humus and nitrogen.",
    isHi ? "चरण 3: रासायनिक खादों पर निर्भरता 25% कम करें और उनकी जगह वर्मीकंपოस्ट तथा जैव उर्वरकों (PSB, Azotobacter) का उपयोग करें।" : "Step 3: Reduce chemical fertilizer dependence by 25% and integrate bio-fertilizers and organic compost."
  ];

  if (phVal < 5.8) {
    soilImprovementPlan[0] = isHi 
      ? "चरण 1: मिट्टी अत्यधिक अम्लीय (pH < 5.8) है। इसे सुधारने के लिए प्रति एकड़ 500 किलोग्राम कृषि चूना (Agricultural Lime) डालें।" 
      : "Step 1: Soil is highly acidic (pH < 5.8). Apply 500 kg of agricultural lime per acre to neutralize acidity.";
  } else if (phVal > 8.2) {
    soilImprovementPlan[0] = isHi 
      ? "चरण 1: मिट्टी अत्यधिक क्षारीय (pH > 8.2) है। इसे सुधारने के लिए जुताई के समय प्रति एकड़ 1-2 टन जिप्सम (Gypsum) डालें।" 
      : "Step 1: Soil is highly alkaline (pH > 8.2). Apply 1-2 tons of agricultural gypsum per acre to reduce alkalinity.";
  }

  return {
    soilScore,
    status,
    organicCarbonAdvice,
    npkAdvice,
    compostAdvice,
    greenManureAdvice,
    vermicompostAdvice,
    biofertilizerAdvice,
    soilImprovementPlan
  };
}

// --------------------------------------------------------
// API ENDPOINTS - AUTHENTICATION
// --------------------------------------------------------

app.post('/api/auth/register', (req, res) => {
  const { name, mobile, password, state, district, preferredLanguage } = req.body;
  if (!name || !mobile || !password) {
    return res.status(400).json({ error: 'Name, mobile, and password are required.' });
  }

  const db = readDB();
  const existingUser = db.users.find((u: any) => u.mobile === mobile);
  if (existingUser) {
    return res.status(400).json({ error: 'Farmer with this mobile number already registered.' });
  }

  const newUser = {
    id: 'user_' + Date.now(),
    name,
    mobile,
    password, // Store as is for simulation/local purposes
    state: state || '',
    district: district || '',
    preferredLanguage: preferredLanguage || 'en',
    primaryCrop: '',
    farmSize: ''
  };

  db.users.push(newUser);
  writeDB(db);

  // Return user without password
  const { password: _, ...userWithoutPassword } = newUser;
  res.json({ success: true, user: userWithoutPassword });
});

app.post('/api/auth/login', (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) {
    return res.status(400).json({ error: 'Mobile number and password are required.' });
  }

  const db = readDB();
  const user = db.users.find((u: any) => u.mobile === mobile && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid mobile number or password.' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, user: userWithoutPassword });
});

app.post('/api/auth/update-profile', (req, res) => {
  const { userId, state, district, preferredLanguage, primaryCrop, farmSize, name } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  const db = readDB();
  const userIndex = db.users.findIndex((u: any) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }

  db.users[userIndex] = {
    ...db.users[userIndex],
    name: name || db.users[userIndex].name,
    state: state !== undefined ? state : db.users[userIndex].state,
    district: district !== undefined ? district : db.users[userIndex].district,
    preferredLanguage: preferredLanguage || db.users[userIndex].preferredLanguage,
    primaryCrop: primaryCrop !== undefined ? primaryCrop : db.users[userIndex].primaryCrop,
    farmSize: farmSize !== undefined ? farmSize : db.users[userIndex].farmSize,
  };

  writeDB(db);

  const { password: _, ...userWithoutPassword } = db.users[userIndex];
  res.json({ success: true, user: userWithoutPassword });
});

// --------------------------------------------------------
// API ENDPOINTS - AI ASSISTANT CHAT
// --------------------------------------------------------

app.post('/api/chat', async (req, res) => {
  const { message, history, language } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    const ai = getGemini();
    const langName = getLangName(language);

    // Build chat history context for Gemini
    const systemInstruction = `You are an expert, highly accurate agricultural scientist and farming consultant named "Kishan Alert AI". Your sole purpose is to provide precise, safe, and scientifically accurate information about farming, crops, livestock, soil health, pest management, and agricultural techniques.

You MUST respond in ${langName} script/text (using easy-to-read local phrasing or direct translation as appropriate).

Follow these strict rules:
1. Only answer questions directly related to farming, agriculture, gardening, or livestock. 
2. If a question is outside the scope of agriculture, politely decline to answer by saying: "I can only assist with farming and agricultural queries." (or its equivalent in ${langName}).
3. Never guess or hallucinate. If you lack specific data or are unsure about a regional farming practice, say: "I do not have enough specific data to answer this accurately. Please consult your local agricultural extension office." (or its equivalent in ${langName}).
4. Keep answers highly practical, step-by-step, and easy for a farmer to understand.

Example 1: Proper Agricultural Query
User: My tomato leaves are turning yellow with dark spots. What should I do?
Model: This sounds like Early Blight, a common fungal disease. Follow these steps: 1. Prune and destroy infected lower leaves. 2. Avoid overhead watering to keep leaves dry. 3. Apply an organic copper-based fungicide if it spreads. 4. Rotate your crops next season.

Example 2: Off-Topic Query (Enforcing Boundaries)
User: Can you write a poem about space?
Model: I can only assist with farming and agricultural queries. Let me know if you have questions about crops, soil, or livestock!

Example 3: Handling Uncertain/Wrong Data Safely
User: What is the exact fertilizer mix for a rare soil type in northern Siberia?
Model: I do not have enough specific data to answer this accurately. Please consult your local agricultural extension office or a local soil testing lab for precise regional recommendations.

Structure your answers beautifully with step-by-step guidance, advantages/disadvantages, safety precautions for chemicals, and organic alternatives where relevant, while keeping it farmer-focused and highly encouraging.`;

    const chatContents: any[] = [];
    
    // Process conversation history
    if (Array.isArray(history)) {
      history.forEach((msg: any) => {
        chatContents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }

    // Append current message
    chatContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await generateContentSafe(ai, {
      model: 'gemini-3.5-flash',
      contents: chatContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
        tools: [{ googleSearch: {} }]
      }
    });

    const replyText = response.text || 'Sorry, I could not generate a response. Please try again.';
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;
    res.json({ 
      response: replyText, 
      isFallback: false, 
      modelUsed: (response as any).modelUsed,
      groundingMetadata
    });
  } catch (error: any) {
    const cleanMsg = cleanErrorMessage(error.message || String(error));
    console.log(`[Kishan Alert] Chat AI falling back to offline heuristic: ${cleanMsg}`);
    try {
      const replyText = getFallbackChatResponse(message, language || 'en');
      res.json({ 
        response: replyText, 
        isFallback: true, 
        fallbackReason: cleanMsg 
      });
    } catch (fallbackError) {
      res.status(500).json({ error: cleanMsg });
    }
  }
});

// --------------------------------------------------------
// API ENDPOINTS - PLANT DISEASE DIAGNOSIS
// --------------------------------------------------------

app.post('/api/diagnose', async (req, res) => {
  const { imageBase64, mimeType, symptoms, language } = req.body;
  
  if (!imageBase64 && !symptoms) {
    return res.status(400).json({ error: 'Please upload an image or type plant symptoms.' });
  }

  try {
    const ai = getGemini();
    const langName = getLangName(language);

    let prompt = `You are a leading agricultural plant pathologist. 
Analyze the symptoms/image of the plant and diagnose possible diseases.
You must return the response as a strict JSON object (NO markdown backticks, NO "json" prefix, just raw JSON) in ${langName} language.

The JSON object MUST match this precise schema:
{
  "diseaseName": "Name of the disease",
  "confidence": 85, // confidence percentage (number 1 to 100)
  "symptoms": ["Symptom 1", "Symptom 2", ...],
  "causes": ["Cause 1", "Cause 2", ...],
  "treatment": {
    "chemical": ["Chemical treatment 1", "Chemical treatment 2", ...],
    "organic": ["Organic treatment 1", "Organic treatment 2", ...]
  },
  "prevention": ["Prevention tip 1", "Prevention tip 2", ...],
  "safetyPrecautions": ["Safety advice 1", "Safety advice 2", ...]
}

Keep all descriptions practical, tailored for the local Indian farming context, and in ${langName}.`;

    if (symptoms) {
      prompt += `\n\nSymptoms reported by the farmer: "${symptoms}"`;
    }

    const contents: any[] = [];
    if (imageBase64) {
      // Clean base64 header if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      contents.push({
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType || 'image/jpeg'
        }
      });
    }
    
    contents.push(prompt);

    const response = await generateContentSafe(ai, {
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const resultText = response.text || '{}';
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    const cleanMsg = cleanErrorMessage(error.message || String(error));
    console.log(`[Kishan Alert] Diagnosis falling back to offline heuristic: ${cleanMsg}`);
    try {
      const fallbackResult = getFallbackDiagnosis(symptoms || '', language || 'en');
      res.json({
        ...fallbackResult,
        isFallback: true,
        fallbackReason: cleanMsg
      });
    } catch (fallbackError) {
      res.status(500).json({ error: cleanMsg });
    }
  }
});

// --------------------------------------------------------
// API ENDPOINTS - CROP RECOMMENDATION
// --------------------------------------------------------

app.post('/api/recommend-crop', async (req, res) => {
  const { soilType, district, state, season, rainfall, waterAvailability, temperature, language } = req.body;

  try {
    const ai = getGemini();
    const langName = getLangName(language);

    const prompt = `As an expert agronomist from the Indian Agricultural Research Institute (IARI), recommend the best crops for the following local farming conditions:
- State: ${state}
- District/Region: ${district}
- Soil Type: ${soilType}
- Season: ${season}
- Rainfall Level: ${rainfall}
- Irrigation/Water Source: ${waterAvailability}
- Avg Temperature: ${temperature}

Recommend 2-3 of the most suitable crops. Provide realistic yields (e.g. per acre) and commercial profitability estimates in INR.
You must return the response as a strict JSON object (NO markdown wrappers, NO markdown backticks, just raw JSON) in ${langName} language.

The JSON object MUST match this precise schema:
{
  "recommendedCrops": [
    {
      "name": "Crop Name",
      "expectedYield": "Expected yield details in ${langName}",
      "profitability": "Profitability details in INR in ${langName}",
      "waterRequirement": "Water needs in ${langName}",
      "fertilizerRequirement": "Fertilizer suggestion in ${langName}",
      "description": "Short summary of why this is suitable and any cultivation tips in ${langName}"
    }
  ]
}`;

    const response = await generateContentSafe(ai, {
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const resultText = response.text || '{"recommendedCrops":[]}';
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    const cleanMsg = cleanErrorMessage(error.message || String(error));
    console.log(`[Kishan Alert] Crop Recommendation falling back to offline heuristic: ${cleanMsg}`);
    try {
      const fallbackResult = getFallbackCropRecommendations(req.body);
      res.json({
        ...fallbackResult,
        isFallback: true,
        fallbackReason: cleanMsg
      });
    } catch (fallbackError) {
      res.status(500).json({ error: cleanMsg });
    }
  }
});

// --------------------------------------------------------
// API ENDPOINTS - SOIL HEALTH ADVISOR
// --------------------------------------------------------

app.post('/api/soil-health', async (req, res) => {
  const { ph, organicCarbon, nitrogen, phosphorus, potassium, language } = req.body;

  try {
    const ai = getGemini();
    const langName = getLangName(language);

    const prompt = `As a soil science chemist, analyze the soil parameters entered by the farmer:
- Soil pH: ${ph || '6.5'}
- Organic Carbon: ${organicCarbon || 'Medium'}%
- Nitrogen (N): ${nitrogen || 'Medium'}
- Phosphorus (P): ${phosphorus || 'Medium'}
- Potassium (K): ${potassium || 'Medium'}

Provide a soil improvement plan focusing heavily on organic compost, green manure, vermicompost, biofertilizers, and crop rotation.
You must return the response as a strict JSON object (NO markdown backticks, NO markdown tags, just raw JSON) in ${langName} language.

The JSON object MUST match this precise schema:
{
  "soilScore": 75, // A score between 1 and 100 assessing the overall soil quality
  "status": "Short description of soil state in ${langName}",
  "organicCarbonAdvice": "Organic carbon replenishment tip in ${langName}",
  "npkAdvice": "Nitrogen-Phosphorus-Potassium balance recommendation in ${langName}",
  "compostAdvice": "Compost dosage/preparation advice in ${langName}",
  "greenManureAdvice": "Recommended green manure crops in ${langName}",
  "vermicompostAdvice": "Vermicompost application advice in ${langName}",
  "biofertilizerAdvice": "Recommended bio-fertilizers (e.g. Azotobacter, Rhizobium) in ${langName}",
  "soilImprovementPlan": [
    "Step 1: Soil enhancement step",
    "Step 2: Soil enhancement step",
    "Step 3: Soil enhancement step"
  ]
}`;

    const response = await generateContentSafe(ai, {
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const resultText = response.text || '{}';
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    const cleanMsg = cleanErrorMessage(error.message || String(error));
    console.log(`[Kishan Alert] Soil Health falling back to offline heuristic: ${cleanMsg}`);
    try {
      const fallbackResult = getFallbackSoilAnalysis(req.body);
      res.json({
        ...fallbackResult,
        isFallback: true,
        fallbackReason: cleanMsg
      });
    } catch (fallbackError) {
      res.status(500).json({ error: cleanMsg });
    }
  }
});

// --------------------------------------------------------
// API ENDPOINTS - SMS ADVISORY
// --------------------------------------------------------

app.post('/api/sms-subscribe', (req, res) => {
  const { mobileNumber, language, crop, frequency } = req.body;
  if (!mobileNumber || !crop) {
    return res.status(400).json({ error: 'Mobile number and crop are required.' });
  }

  const db = readDB();
  const existingSubIndex = db.smsSubscribers.findIndex((s: any) => s.mobileNumber === mobileNumber);

  const subscriber = {
    mobileNumber,
    language: language || 'en',
    crop,
    smsEnabled: true,
    frequency: frequency || 'weekly',
    subscribedAt: new Date().toISOString()
  };

  if (existingSubIndex > -1) {
    db.smsSubscribers[existingSubIndex] = subscriber;
  } else {
    db.smsSubscribers.push(subscriber);
  }

  writeDB(db);
  res.json({ success: true, subscriber });
});

app.post('/api/sms-send-simulation', async (req, res) => {
  const { mobileNumber, crop, language } = req.body;
  if (!mobileNumber || !crop) {
    return res.status(400).json({ error: 'Mobile number and crop are required.' });
  }

  try {
    const ai = getGemini();
    const langName = getLangName(language);

    const prompt = `Generate a single short SMS tip (max 140 characters, suitable for SMS) in ${langName} language for a farmer growing "${crop}". 
The tip should be extremely practical (e.g., watering guidance, fertilizer application, or pest warning based on the current season).
Return only the short 140-character SMS text in ${langName} script.`;

    const response = await generateContentSafe(ai, {
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    const smsText = response.text?.trim() || `Kishan Alert: Keep monitoring ${crop} for early pest infestation. Add organic compost.`;
    res.json({ 
      success: true, 
      smsText,
      provider: "Twilio/Fast2SMS (Simulated In-App Queue)",
      sentAt: new Date().toISOString()
    });
  } catch (error: any) {
    const cleanMsg = cleanErrorMessage(error.message || String(error));
    console.log(`[Kishan Alert] SMS Simulation falling back to offline simulator: ${cleanMsg}`);
    res.json({ 
      success: true, 
      smsText: `Kishan Alert: Please irrigate your ${crop} field optimally in the morning and apply vermicompost for high yields.`,
      provider: "Local Offline Fallback Simulator",
      sentAt: new Date().toISOString(),
      isFallback: true,
      fallbackReason: cleanMsg
    });
  }
});

// --------------------------------------------------------
// VITE AND STATIC SERVING CONFIGURATION
// --------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kishan Alert Full-Stack Server running on port ${PORT}`);
  });
}

export { app };

if (!process.env.NETLIFY) {
  startServer();
}
