/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LanguageCode = 'en' | 'ta' | 'hi' | 'te' | 'kn' | 'ml';

export interface UserProfile {
  id: string;
  name: string;
  mobile: string;
  state: string;
  district: string;
  preferredLanguage: LanguageCode;
  primaryCrop?: string;
  farmSize?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  groundingSources?: Array<{ uri: string; title: string }>;
}

export interface DiseaseDiagnosisResult {
  diseaseName: string;
  confidence: number;
  symptoms: string[];
  causes: string[];
  treatment: {
    chemical: string[];
    organic: string[];
  };
  prevention: string[];
  safetyPrecautions: string[];
  isFallback?: boolean;
  fallbackReason?: string;
}

export interface CropRecommendationResult {
  recommendedCrops: Array<{
    name: string;
    expectedYield: string;
    profitability: string;
    waterRequirement: string;
    fertilizerRequirement: string;
    description: string;
  }>;
  isFallback?: boolean;
  fallbackReason?: string;
}

export interface SoilHealthResult {
  soilScore: number;
  status: string;
  organicCarbonAdvice: string;
  npkAdvice: string;
  compostAdvice: string;
  greenManureAdvice: string;
  vermicompostAdvice: string;
  biofertilizerAdvice: string;
  soilImprovementPlan: string[];
  isFallback?: boolean;
  fallbackReason?: string;
}

export interface FertilizerDetails {
  name: string;
  category: 'Chemical' | 'Organic';
  advantages: string[];
  disadvantages: string[];
  dosage: string;
  applicationMethod: string;
  safetyPrecautions: string[];
  organicAlternatives: string[];
}

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
  forecast: Array<{
    day: string;
    temp: number;
    condition: string;
  }>;
}

export interface GovernmentScheme {
  id: string;
  name: string;
  benefits: string;
  eligibility: string;
  howToApply: string;
  linkPlaceholder: string;
}

export interface SMSAdvisoryConfig {
  mobileNumber: string;
  language: LanguageCode;
  crop: string;
  smsEnabled: boolean;
  frequency: 'daily' | 'weekly';
}

// Global UI Translation Dictionary
export const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    appName: "Kishan Alert",
    home: "Home",
    dashboard: "Dashboard",
    chat: "AI Advisor",
    diagnosis: "Disease Diagnosis",
    cropRec: "Crop Suggestions",
    soilHealth: "Soil Health",
    smsAdv: "SMS Advisory",
    schemes: "Govt Schemes",
    fertilizer: "Fertilizer Guide",
    profile: "My Profile",
    login: "Farmer Login",
    register: "Register Farmer",
    logout: "Log Out",
    welcome: "Welcome to Kishan Alert",
    tagline: "Your AI-powered digital farming companion for expert advisory, disease control, and maximized yields.",
    askAi: "Ask AI Assistant",
    voiceInput: "Voice Assistant",
    smsAdvisory: "SMS Alerts",
    detectDisease: "Detect Disease",
    cropRecBtn: "Get Crop Suggestion",
    weatherCard: "Weather Status",
    recentChats: "Recent Conversations",
    cropAlerts: "Active Crop Alerts",
    soilHealthScore: "Soil Health Index",
    smsStatus: "SMS Subscription",
    voiceStatus: "Voice Active",
    languages: "Regional Languages",
    orText: "OR",
    uploadLeaf: "Upload Crop Leaf Image",
    typeSymptoms: "Type Plant Symptoms",
    submit: "Submit Details",
    loading: "Analyzing with AI...",
    results: "AI Analysis Results",
    recommended: "Recommended",
    pesticides: "Pesticides",
    organicOptions: "Organic Treatments",
    safetyMeasures: "Safety Precautions",
    preventionTips: "Prevention Guidelines",
    district: "District",
    state: "State",
    season: "Season",
    rainfall: "Rainfall Estimate",
    waterAvail: "Water Source",
    temperature: "Avg Temperature",
    soilType: "Soil Type",
    getRecommendation: "Get Suggestions",
    soilPh: "Soil pH",
    organicCarbon: "Organic Carbon (%)",
    nitrogen: "Nitrogen (N) Level",
    phosphorus: "Phosphorus (P) Level",
    potassium: "Potassium (K) Level",
    low: "Low",
    medium: "Medium",
    high: "High",
    analyzeSoil: "Analyze Soil Health",
    fertilizerAdvisor: "Fertilizer Advisor & Safety",
    adv: "Advantages",
    disadv: "Disadvantages",
    dosage: "Correct Dosage",
    appMethod: "Application Method",
    organicAlternative: "Organic Alternatives",
    pmKisan: "PM-KISAN Yojana",
    cropInsurance: "Fasal Bima (Crop Insurance)",
    subsidies: "Agricultural Subsidies",
    seeds: "High-Quality Seeds Scheme",
    fertilizerSubsidy: "Fertilizer Subsidy Scheme",
    smsPlaceholder: "Enter 10-digit mobile number",
    subscribeSms: "Activate Free SMS Tips",
    enterSymptoms: "e.g., My tomato leaves have yellow spots and black rings",
    chatPlaceholder: "Ask me about crops, pests, disease, organic manure, schemes...",
    unauthorized: "Please Login or Register to access AI Advisor and advanced farming tools."
  },
  ta: {
    appName: "கிசான் அலர்ட்",
    home: "முகப்பு",
    dashboard: "தகவல் பலகை",
    chat: "AI ஆலோசகர்",
    diagnosis: "நோய் கண்டறிதல்",
    cropRec: "பயிர் பரிந்துரை",
    soilHealth: "மண் வளம்",
    smsAdv: "SMS ஆலோசனை",
    schemes: "அரசு திட்டங்கள்",
    fertilizer: "உர வழிகாட்டி",
    profile: "எனது சுயவிவரம்",
    login: "விவசாயி உள்நுழைவு",
    register: "பதிவு செய்க",
    logout: "வெளியேறு",
    welcome: "கிசான் அலர்ட்டிற்கு உங்களை வரவேற்கிறோம்",
    tagline: "நிபுணர் ஆலோசனை, நோய் கட்டுப்பாடு மற்றும் அதிகபட்ச மகசூலுக்கான உங்கள் AI-இயங்கும் டிஜிட்டல் விவசாய துணை.",
    askAi: "AI உதவியாளரிடம் கேளுங்கள்",
    voiceInput: "குரல் உதவியாளர்",
    smsAdvisory: "SMS எச்சரிக்கைகள்",
    detectDisease: "நோய் கண்டறிதல்",
    cropRecBtn: "பயிர் பரிந்துரை பெறுக",
    weatherCard: "வானிலை நிலைமை",
    recentChats: "சமீபத்திய உரையாடல்கள்",
    cropAlerts: "செயலில் உள்ள பயிர் எச்சரிக்கைகள்",
    soilHealthScore: "மண் வளம் குறியீடு",
    smsStatus: "SMS சந்தா",
    voiceStatus: "குரல் சேவை",
    languages: "வட்டார மொழிகள்",
    orText: "அல்லது",
    uploadLeaf: "பயிர் இலை படத்தை பதிவேற்றுக",
    typeSymptoms: "நோயின் அறிகுறிகளை தட்டச்சு செய்க",
    submit: "சமர்ப்பிக்கவும்",
    loading: "AI பகுப்பாய்வு செய்கிறது...",
    results: "AI பகுப்பாய்வு முடிவுகள்",
    recommended: "பரிந்துரைக்கப்படுகிறது",
    pesticides: "பூச்சிக்கொல்லிகள்",
    organicOptions: "இயற்கை சிகிச்சைகள்",
    safetyMeasures: "பாதுகாப்பு முன்னெச்சரிக்கைகள்",
    preventionTips: "தடுப்பு வழிகாட்டுதல்கள்",
    district: "மாவட்டம்",
    state: "மாநிலம்",
    season: "பருவம்",
    rainfall: "மழைப்பொழிவு அளவு",
    waterAvail: "நீர் ஆதாரம்",
    temperature: "சராசரி வெப்பநிலை",
    soilType: "மண் வகை",
    getRecommendation: "பரிந்துரைகளை பெறுக",
    soilPh: "மண் pH",
    organicCarbon: "கரிம கார்பன் (%)",
    nitrogen: "நைட்ரஜன் (N) அளவு",
    phosphorus: "பாஸ்பரஸ் (P) அளவு",
    potassium: "பொட்டாசியம் (K) அளவு",
    low: "குறைவு",
    medium: "நடுத்தரம்",
    high: "அதிகம்",
    analyzeSoil: "மண் வளத்தை பகுப்பாய்வு செய்க",
    fertilizerAdvisor: "உர வழிகாட்டி & பாதுகாப்பு",
    adv: "நன்மைகள்",
    disadv: "தீமைகள்",
    dosage: "சரியான அளவு",
    appMethod: "பயன்படுத்தும் முறை",
    organicAlternative: "இயற்கை மாற்றுகள்",
    pmKisan: "PM-கிசான் திட்டம்",
    cropInsurance: "பயிர் காப்பீட்டுத் திட்டம்",
    subsidies: "விவசாய மானியங்கள்",
    seeds: "தரமான விதைகள் திட்டம்",
    fertilizerSubsidy: "உர மானிய திட்டம்",
    smsPlaceholder: "10-இலக்க மொபைல் எண்ணை உள்ளிடவும்",
    subscribeSms: "இலவச SMS ஆலோசனையை இயக்கு",
    enterSymptoms: "எ.கா: எனது தக்காளி இலையில் மஞ்சள் புள்ளிகள் உள்ளன",
    chatPlaceholder: "பயிர்கள், பூச்சிகள், நோய்கள், இயற்கை உரம் பற்றி கேளுங்கள்...",
    unauthorized: "AI ஆலோசகர் மற்றும் விவசாய கருவிகளைப் பயன்படுத்த உள்நுழையவும்."
  },
  hi: {
    appName: "किसान अलर्ट",
    home: "होम",
    dashboard: "डैशबोर्ड",
    chat: "एआई सलाहकार",
    diagnosis: "रोग पहचान",
    cropRec: "फसल सुझाव",
    soilHealth: "मृदा स्वास्थ्य",
    smsAdv: "एसएमएस सलाह",
    schemes: "सरकारी योजनाएं",
    fertilizer: "उर्वरक गाइड",
    profile: "मेरी प्रोफ़ाइल",
    login: "किसान लॉगिन",
    register: "किसान पंजीकरण",
    logout: "लॉग आउट",
    welcome: "किसान अलर्ट में आपका स्वागत है",
    tagline: "विशेषज्ञ सलाह, रोग नियंत्रण और अधिकतम उपज के लिए आपका एआई-संचालित डिजिटल खेती साथी।",
    askAi: "एआई सलाहकार से पूछें",
    voiceInput: "आवाज सहायक",
    smsAdvisory: "एसएमएस अलर्ट",
    detectDisease: "रोग का पता लगाएं",
    cropRecBtn: "फसल सुझाव प्राप्त करें",
    weatherCard: "मौसम की स्थिति",
    recentChats: "हाल की बातचीत",
    cropAlerts: "सक्रिय फसल अलर्ट",
    soilHealthScore: "मृदा स्वास्थ्य सूचकांक",
    smsStatus: "एसएमएस सदस्यता",
    voiceStatus: "आवाज सक्रिय",
    languages: "क्षेत्रीय भाषाएं",
    orText: "या",
    uploadLeaf: "फसल की पत्ती का चित्र अपलोड करें",
    typeSymptoms: "पौधे के लक्षण लिखें",
    submit: "जमा करें",
    loading: "एआई विश्लेषण कर रहा है...",
    results: "एआई विश्लेषण परिणाम",
    recommended: "अनुशंसित",
    pesticides: "कीटनाशक",
    organicOptions: "जैविक उपचार",
    safetyMeasures: "सुरक्षा सावधानियां",
    preventionTips: "रोकथाम दिशानिर्देश",
    district: "जिला",
    state: "राज्य",
    season: "मौसम",
    rainfall: "वर्षा का अनुमान",
    waterAvail: "जल स्रोत",
    temperature: "औसत तापमान",
    soilType: "मिट्टी का प्रकार",
    getRecommendation: "सुझाव प्राप्त करें",
    soilPh: "मिट्टी का पीएच",
    organicCarbon: "जैविक कार्बन (%)",
    nitrogen: "नाइट्रोजन (N) स्तर",
    phosphorus: "फास्फोरस (P) स्तर",
    potassium: "पोटेशियम (K) स्तर",
    low: "कम",
    medium: "मध्यम",
    high: "उच्च",
    analyzeSoil: "मिट्टी का परीक्षण करें",
    fertilizerAdvisor: "उर्वरक सलाहकार और सुरक्षा",
    adv: "लाभ",
    disadv: "हानि",
    dosage: "सही मात्रा",
    appMethod: "उपयोग विधि",
    organicAlternative: "जैविक विकल्प",
    pmKisan: "पीएम-किसान योजना",
    cropInsurance: "फसल बीमा योजना",
    subsidies: "कृषि सब्सिडी",
    seeds: "उच्च गुणवत्ता बीज योजना",
    fertilizerSubsidy: "उर्वरक सब्सिडी योजना",
    smsPlaceholder: "10 अंकों का मोबाइल नंबर दर्ज करें",
    subscribeSms: "निःशुल्क एसएमएस टिप्स सक्रिय करें",
    enterSymptoms: "जैसे: मेरे टमाटर के पत्तों पर पीले धब्बे हैं",
    chatPlaceholder: "फसलों, कीटों, रोगों, जैविक खाद, योजनाओं के बारे में पूछें...",
    unauthorized: "एआई सलाहकार और कृषि उपकरणों का उपयोग करने के लिए लॉगिन करें।"
  },
  te: {
    appName: "కిసాన్ అలర్ట్",
    home: "హోమ్",
    dashboard: "డ్యాష్‌బోర్డ్",
    chat: "AI సలహాదారు",
    diagnosis: "తెగుళ్ళ గుర్తింపు",
    cropRec: "పంట సూచనలు",
    soilHealth: "నేల ఆరోగ్యం",
    smsAdv: "SMS సలహా",
    schemes: "ప్రభుత్వ పథకాలు",
    fertilizer: "ఎరువుల గైడ్",
    profile: "నా ప్రొఫైల్",
    login: "రైతు లాగిన్",
    register: "రైతు నమోదు",
    logout: "లాగ్ అవుట్",
    welcome: "కిసాన్ అలర్ట్ కు స్వాగతం",
    tagline: "నిపుణుల సలహా, తెగుళ్ళ నివారణ మరియు గరిష్ట దిగుబడి కోసం మీ AI డిజిటల్ వ్యవసాయ తోడు.",
    askAi: "AI సహాయకుడిని అడగండి",
    voiceInput: "వాయిస్ అసిస్టెంట్",
    smsAdvisory: "SMS హెచ్చరికలు",
    detectDisease: "తెగులును గుర్తించండి",
    cropRecBtn: "పంట సలహా పొందండి",
    weatherCard: "వాతావరణ సమాచారం",
    recentChats: "ఇటీవలి సంభాషణలు",
    cropAlerts: "సక్రియ పంట హెచ్చరికలు",
    soilHealthScore: "నేల ఆరోగ్య సూచిక",
    smsStatus: "SMS సభ్యత్వం",
    voiceStatus: "వాయిస్ సక్రియం",
    languages: "ప్రాంతీయ భాషలు",
    orText: "లేదా",
    uploadLeaf: "ఆకు చిత్రాన్ని అప్‌లోడ్ చేయండి",
    typeSymptoms: "లక్షణాలను నమోదు చేయండి",
    submit: "సమర్పించు",
    loading: "AI విశ్లేషిస్తోంది...",
    results: "AI విશ્లేషణ ఫలితాలు",
    recommended: "సిఫార్సు చేయబడినది",
    pesticides: "కీటక నాశినులు",
    organicOptions: "సేంద్రీయ చికిత్సలు",
    safetyMeasures: "భద్రతా జాగ్రత్తలు",
    preventionTips: "నివారణ మార్గదర్శకాలు",
    district: "జిల్లా",
    state: "రాష్ట్రం",
    season: "పంట కాలం",
    rainfall: "వర్షపాతం అంచనా",
    waterAvail: "నీటి వనరు",
    temperature: "సగటు ఉష్ణోగ్రత",
    soilType: "నేల రకం",
    getRecommendation: "సిఫార్సులు పొందండి",
    soilPh: "నేల pH",
    organicCarbon: "సేంద్రీయ కార్బన్ (%)",
    nitrogen: "నైట్రోజన్ (N) స్థాయి",
    phosphorus: "ఫాస్ఫరస్ (P) స్థాయి",
    potassium: "పొటాషియం (K) స్థాయి",
    low: "తక్కువ",
    medium: "మధ్యమం",
    high: "ఎక్కువ",
    analyzeSoil: "నేల ఆరోగ్యం విశ్లేషించు",
    fertilizerAdvisor: "ఎరువుల సలహాదారు & భద్రత",
    adv: "ప్రయోజనాలు",
    disadv: "నష్టాలు",
    dosage: "సరైన మోతాదు",
    appMethod: "వాడే విధానం",
    organicAlternative: "సేంద్రీయ ప్రత్యామ్నాయాలు",
    pmKisan: "PM-కిసాన్ యోజన",
    cropInsurance: "పంట బీమా పథకం",
    subsidies: "వ్యవసాయ రాయితీలు",
    seeds: "నాణ్యమైన విత్తనాల పథకం",
    fertilizerSubsidy: "ఎరువుల సబ్సిడీ పథకం",
    smsPlaceholder: "10 అంకెల మొబైల్ సంఖ్యను నమోదు చేయండి",
    subscribeSms: "ఉచిత SMS చిట్కాలను సక్రియం చేయి",
    enterSymptoms: "ఉదా: నా టమోటా ఆకులపై పసుపు మచ్చలు ఉన్నాయి",
    chatPlaceholder: "పంటలు, తెగుళ్లు, సేంద్రీయ ఎరువులు, పథకాల గురించి అడగండి...",
    unauthorized: "AI సలహాదారు మరియు వ్యవసాయ సాధనాలను యాక్సెస్ చేయడానికి లాగిన్ అవ్వండి."
  },
  kn: {
    appName: "ಕಿಸಾನ್ ಅಲರ್ಟ್",
    home: "ಮುಖಪುಟ",
    dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    chat: "AI ಸಲಹೆಗಾರ",
    diagnosis: "ರೋಗ ಪತ್ತೆಹಚ್ಚುವಿಕೆ",
    cropRec: "ಬೆಳೆ ಶಿಫಾರಸು",
    soilHealth: "ಮಣ್ಣಿನ ಆರೋಗ್ಯ",
    smsAdv: "SMS ಸಲಹೆ",
    schemes: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು",
    fertilizer: "ಗೊಬ್ಬರ ಮಾರ್ಗದರ್ಶಿ",
    profile: "ನನ್ನ ಪ್ರೊಫೈಲ್",
    login: "ರೈತ ಲಾಗಿನ್",
    register: "ರೈತ ನೋಂದಣಿ",
    logout: "ಲಾಗ್ ಔಟ್",
    welcome: "ಕಿಸಾನ್ ಅಲರ್ಟ್‌ಗೆ ಸುಸ್ವಾಗತ",
    tagline: "ತಜ್ಞರ ಸಲಹೆ, ರೋಗ ನಿಯಂತ್ರಣ ಮತ್ತು ಗರಿಷ್ಠ ಇಳುವರಿಗಾಗಿ ನಿಮ್ಮ AI-ಚಾಲಿತ ಡಿಜಿಟಲ್ ಕೃಷಿ ಒಡನಾಡಿ.",
    askAi: "AI ಸಲಹೆಗಾರರನ್ನು ಕೇಳಿ",
    voiceInput: "ಧ್ವನಿ ಸಹಾಯಕ",
    smsAdvisory: "SMS ಎಚ್ಚರಿಕೆಗಳು",
    detectDisease: "ರೋಗ ಪತ್ತೆಹಚ್ಚಿ",
    cropRecBtn: "ಬೆಳೆ ಸಲಹೆ ಪಡೆಯಿರಿ",
    weatherCard: "ಹವಾಮಾನ ಮಾಹಿತಿ",
    recentChats: "ಇತ್ತೀಚಿನ ಸಂಭಾಷಣೆಗಳು",
    cropAlerts: "ಸಕ್ರಿಯ ಬೆಳೆ ಎಚ್ಚರಿಕೆಗಳು",
    soilHealthScore: "ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಸೂಚ್ಯಂಕ",
    smsStatus: "SMS ಚಂದಾದಾರಿಕೆ",
    voiceStatus: "ಧ್ವನಿ ಸಕ್ರಿಯ",
    languages: "ಪ್ರಾದೇಶಿಕ ಭಾಷೆಗಳು",
    orText: "ಅಥವಾ",
    uploadLeaf: "ಬೆಳೆ ಎಲೆಯ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    typeSymptoms: "ರೋಗದ ಲಕ್ಷಣಗಳನ್ನು ಟೈಪ್ ಮಾಡಿ",
    submit: "ಸಲ್ಲಿಸು",
    loading: "AI ವಿಶ್ಲೇಷಿಸುತ್ತಿದೆ...",
    results: "AI ವಿಶ್ಲೇಷಣೆ ಫಲಿತಾಂಶಗಳು",
    recommended: "ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ",
    pesticides: "ಕೀಟನಾಶಕಗಳು",
    organicOptions: "ಸಾವಯವ ಚಿಕಿತ್ಸೆಗಳು",
    safetyMeasures: "ಸುರಕ್ಷತಾ ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು",
    preventionTips: "ತಡೆಗಟ್ಟುವ ಮಾರ್ಗಸೂಚಿಗಳು",
    district: "ಜಿಲ್ಲೆ",
    state: "ರಾಜ್ಯ",
    season: "ಹಂಗಾಮು",
    rainfall: "ಮಳೆಯ ಅಂದಾಜು",
    waterAvail: "ನೀರಿನ ಮೂಲ",
    temperature: "ಸರಾಸರಿ ತಾಪಮಾನ",
    soilType: "ಮಣ್ಣಿನ ಪ್ರಕಾರ",
    getRecommendation: "ಶಿಫಾರಸುಗಳನ್ನು ಪಡೆಯಿರಿ",
    soilPh: "ಮಣ್ಣಿನ pH",
    organicCarbon: "ಸಾವಯವ ಇಂಗಾಲ (%)",
    nitrogen: "ಸಾರಜನಕ (N) ಮಟ್ಟ",
    phosphorus: "ರಂಜಕ (P) ಮಟ್ಟ",
    potassium: "ಪೊಟ್ಯಾಸಿಯಮ್ (K) ಮಟ್ಟ",
    low: "ಕಡಿಮೆ",
    medium: "ಮಧ್ಯಮ",
    high: "ಹೆಚ್ಚು",
    analyzeSoil: "ಮಣ್ಣಿನ ಆರೋಗ್ಯ ವಿಶ್ಲೇಷಿಸಿ",
    fertilizerAdvisor: "ಗೊಬ್ಬರ ಸಲಹೆಗಾರ ಮತ್ತು ಸುರಕ್ಷತೆ",
    adv: "ಅನುಕೂಲಗಳು",
    disadv: "ಅನಾನುಕೂಲಗಳು",
    dosage: "ಸರಿಯಾದ ಪ್ರಮಾಣ",
    appMethod: "ಬಳಸುವ ವಿಧಾನ",
    organicAlternative: "ಸಾವಯವ ಪರ್ಯಾಯಗಳು",
    pmKisan: "PM-ಕಿಸಾನ್ ಯೋಜನೆ",
    cropInsurance: "ಬೆಳೆ ವಿಮೆ ಯೋಜನೆ",
    subsidies: "ಕೃಷಿ ಸಹಾಯಧನ",
    seeds: "ಗುಣಮಟ್ಟದ ಬಿತ್ತನೆ ಬೀಜ ಯೋಜನೆ",
    fertilizerSubsidy: "ಗೊಬ್ಬರ ಸಬ್ಸಿಡಿ ಯೋಜನೆ",
    smsPlaceholder: "10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ",
    subscribeSms: "ಉಚಿತ SMS ಸಲಹೆಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ",
    enterSymptoms: "ಉದಾ: ನನ್ನ ಟೊಮೆಟೊ ಎಲೆಗಳ ಮೇಲೆ ಹಳದಿ ಚುಕ್ಕೆಗಳಿವೆ",
    chatPlaceholder: "ಬೆಳೆಗಳು, ಕೀಟಗಳು, ಸಾವಯವ ಗೊಬ್ಬರಗಳು, ಯೋಜನೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ...",
    unauthorized: "AI ಸಲಹೆಗಾರ ಮತ್ತು ಕೃಷಿ ಸಾಧನಗಳನ್ನು ಬಳಸಲು ಲಾಗಿನ್ ಮಾಡಿ."
  },
  ml: {
    appName: "കിസാൻ അലേർട്ട്",
    home: "ഹോം",
    dashboard: "ഡാഷ്‌ബോർഡ്",
    chat: "AI ഉപദേശകൻ",
    diagnosis: "രോഗനിർണ്ണയം",
    cropRec: "വിള നിർദ്ദേശം",
    soilHealth: "മണ്ണ് പരിശോധന",
    smsAdv: "SMS ഉപദേശം",
    schemes: "സർക്കാർ പദ്ധതികൾ",
    fertilizer: "വള ഗൈഡ്",
    profile: "എന്റെ പ്രൊഫൈൽ",
    login: "കർഷക ലോഗിൻ",
    register: "കർഷക രജിസ്ട്രേഷൻ",
    logout: "ലോഗ് ഔട്ട്",
    welcome: "കിസാൻ അലേർട്ടിലേക്ക് സ്വാഗതം",
    tagline: "വിദഗ്ദ്ധ ഉപദേശം, രോഗനിയന്ത്രണം, പരമാവധി വിളവ് എന്നിവയ്ക്കായുള്ള നിങ്ങളുടെ AI-അധിഷ്ഠിത ഡിജിറ്റൽ കൃഷി സഹായി.",
    askAi: "AI സഹായം ചോദിക്കുക",
    voiceInput: "വോയ്‌സ് അസിസ്റ്റന്റ്",
    smsAdvisory: "SMS അലേർട്ടുകൾ",
    detectDisease: "രോഗം കണ്ടെത്തുക",
    cropRecBtn: "വിള നിർദ്ദേശം നേടുക",
    weatherCard: "കാലാവസ്ഥ വിവരങ്ങൾ",
    recentChats: "സമീപകാല സംഭാഷണങ്ങൾ",
    cropAlerts: "സജീവ വിള അലേർട്ടുകൾ",
    soilHealthScore: "മൺ ആരോഗ്യ സൂചിക",
    smsStatus: "SMS സബ്‌സ്‌ക്രിപ്‌ഷൻ",
    voiceStatus: "വോയ്‌സ് സജീവം",
    languages: "പ്രാദേശിക ഭാഷകൾ",
    orText: "അല്ലെങ്കിൽ",
    uploadLeaf: "വിള ഇല ചിത്രം അപ്‌ലോഡ് ചെയ്യുക",
    typeSymptoms: "ലക്ഷണങ്ങൾ ടൈപ്പ് ചെയ്യുക",
    submit: "സമർപ്പിക്കുക",
    loading: "AI വിശകലനം ചെയ്യുന്നു...",
    results: "AI വിശകലന ഫലങ്ങൾ",
    recommended: "ശുപാർശ ചെയ്യുന്നത്",
    pesticides: "കീടനാശിനികൾ",
    organicOptions: "ജൈവ ചികിത്സകൾ",
    safetyMeasures: "സുരക്ഷാ മുൻകരുതലുകൾ",
    preventionTips: "പ്രതിരോധ മാർഗ്ഗനിർദ്ദേശങ്ങൾ",
    district: "ജില്ല",
    state: "സംസ്ഥാനം",
    season: "വിളക്കാലം",
    rainfall: "മഴയുടെ അളവ്",
    waterAvail: "ജലസ്രോതസ്സ്",
    temperature: "ശരാശരി താപനില",
    soilType: "മണ്ണിന്റെ തരം",
    getRecommendation: "നിർദ്ദേശങ്ങൾ നേടുക",
    soilPh: "മണ്ണ് pH",
    organicCarbon: "ജൈവ കാർബൺ (%)",
    nitrogen: "നൈട്രജൻ (N) അളവ്",
    phosphorus: "ഫോസ്ഫറസ് (P) അളവ്",
    potassium: "പൊട്ടാസ്യം (K) അളവ്",
    low: "കുറവ്",
    medium: "മിതമായത്",
    high: "ഉയർന്നത്",
    analyzeSoil: "മൺ വളം വിശകലനം ചെയ്യുക",
    fertilizerAdvisor: "വള ഉപദേശകനും സുരക്ഷയും",
    adv: "ഗുണങ്ങൾ",
    disadv: "ദോഷങ്ങൾ",
    dosage: "ശരിയായ അളവ്",
    appMethod: "ഉപയോഗിക്കേണ്ട രീതി",
    organicAlternative: "ജൈവ ബദലുകൾ",
    pmKisan: "PM-കിസാൻ യോജന",
    cropInsurance: "വിള ഇൻഷുറൻസ് പദ്ധതി",
    subsidies: "കാർഷിക സബ്‌സിഡികൾ",
    seeds: "ഗുണമേന്മയുള്ള വിത്തുകളുടെ പദ്ധതി",
    fertilizerSubsidy: "വള സബ്‌സിഡി പദ്ധതി",
    smsPlaceholder: "10 അക്ക മൊബൈൽ നമ്പർ നൽകുക",
    subscribeSms: "സൗജന്യ SMS ഉപദേശങ്ങൾ സജീവമാക്കുക",
    enterSymptoms: "ഉദാ: എന്റെ തക്കാളി ഇലകളിൽ മഞ്ഞ പാടുകളുണ്ട്",
    chatPlaceholder: "വിളകൾ, കീടങ്ങൾ, ജൈവവളം, പദ്ധതികൾ എന്നിവയെക്കുറിച്ച് ചോദിക്കുക...",
    unauthorized: "AI ഉപദേശകനും കൃഷി ഉപകരണങ്ങളും ഉപയോഗിക്കാൻ ലോഗിൻ ചെയ്യുക."
  }
};
