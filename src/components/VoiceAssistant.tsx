/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { LanguageCode, translations } from '../types';
import { Mic, MicOff, Volume2, VolumeX, Play, RotateCcw, AlertTriangle } from 'lucide-react';

interface VoiceAssistantProps {
  currentLang: LanguageCode;
  onVoiceInputText: (text: string) => void;
  lastAiResponse: string;
}

const permissionInstructions: Record<LanguageCode, { title: string; desc: string }> = {
  en: {
    title: "Microphone Access Required",
    desc: "Microphone access is blocked in this browser preview. Please click the \"Open in new tab\" button in the top-right corner to open the app directly and grant microphone permissions in your browser."
  },
  hi: {
    title: "माइक अनुमति आवश्यक है",
    desc: "इस ब्राउज़र प्रीव्यू में माइक अनुमति ब्लॉक है। सीधे ऐप खोलने और माइक अनुमति देने के लिए कृपया ऊपर दाईं ओर स्थित \"नए टैब में खोलें\" बटन पर क्लिक करें।"
  },
  ta: {
    title: "மைக்ரோஃபோன் அனுமதி தேவை",
    desc: "இந்த உலாவி முன்னோட்டத்தில் மைக்ரோஃபோன் அனுமதி தடுக்கப்பட்டுள்ளது. பயன்பாட்டை நேரடியாகத் திறந்து மைக் அனுமதியை வழங்க, மேலே வலதுபுறத்தில் உள்ள \"புதிய தாவலில் திற\" பொத்தானைக் கிளிக் செய்யவும்."
  },
  te: {
    title: "మైక్రోఫోన్ అనుమతి అవసరం",
    desc: "ఈ బ్రౌజర్ ప్రివ్యూలో మైక్రోఫోన్ అనుమతి నిరోధించబడింది. యాప్‌ను నేరుగా తెరవడానికి మరియు మైక్రోఫోన్ అనుమతిని మంజూరు చేయడానికి దయచేసి ఎగువ కాపీ చిహ్నం పక్కన ఉన్న \"కొత్త ట్యాబ్‌లో తెరువు\" బటన్‌ను క్ಲಿక్ చేయండి."
  },
  kn: {
    title: "ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ಅಗತ್ಯವಿದೆ",
    desc: "ಈ ಬ್ರೌಸರ್ ಮುನ್ನೋಟದಲ್ಲಿ ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿಯನ್ನು ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ. ನೇರವಾಗಿ ಅಪ್ಲಿಕೇಶನ್ ತೆರೆಯಲು ಮತ್ತು ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿಯನ್ನು ನೀಡಲು ದಯವಿಟ್ಟು ಮೇಲಿನ ಬಲ ಮೂಲೆ ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ."
  },
  ml: {
    title: "മൈക്രോഫോൺ അനുമതി ആവശ്യമാണ്",
    desc: "ഈ ബ്രൗസർ പ്രിവ്യൂവിൽ മൈക്രോഫോൺ അനുമതി തടഞ്ഞിരിക്കുന്നു. ആപ്പ് നേരിട്ട് തുറക്കാനും മൈക്രോഫോൺ അനുമതി നൽകാനും ദയവായി മുകളിൽ വലതുവശത്തുള്ള \"പുതിയ ടാബിൽ തുറക്കുക\" ബട്ടൺ ക്ലിക്ക് ചെയ്യുക."
  }
};

export default function VoiceAssistant({ currentLang, onVoiceInputText, lastAiResponse }: VoiceAssistantProps) {
  const t = translations[currentLang];
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [ttsSupported, setTtsSupported] = useState(true);
  const [recError, setRecError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Speech Recognition & Synthesis
  useEffect(() => {
    // 1. Setup speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
    } else {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      // Set the language code
      rec.lang = getVoiceLocale(currentLang);

      rec.onstart = () => {
        setIsListening(true);
        setTranscript('');
        setRecError(null);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        onVoiceInputText(text);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setRecError(event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    // 2. Setup speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    } else {
      setTtsSupported(false);
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [currentLang]);

  // Handle change in language
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = getVoiceLocale(currentLang);
    }
  }, [currentLang]);

  const getVoiceLocale = (lang: LanguageCode): string => {
    switch (lang) {
      case 'ta': return 'ta-IN';
      case 'hi': return 'hi-IN';
      case 'te': return 'te-IN';
      case 'kn': return 'kn-IN';
      case 'ml': return 'ml-IN';
      default: return 'en-IN';
    }
  };

  const startListening = () => {
    setRecError(null);
    if (isSpeaking) {
      stopSpeaking();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const speakText = (textToSpeak: string) => {
    if (!synthRef.current || !textToSpeak) return;

    // Stop ongoing speech
    synthRef.current.cancel();

    // Clean text from markdown markers to make voice sound natural
    const cleanText = textToSpeak
      .replace(/[*#_`~]/g, '')
      .replace(/-\s+/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 500); // speak first 500 chars naturally

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = getVoiceLocale(currentLang);
    
    // Select appropriate voice if possible
    const voices = synthRef.current.getVoices();
    const targetedLocale = getVoiceLocale(currentLang);
    const voice = voices.find(v => v.lang.startsWith(targetedLocale) || v.lang.startsWith(currentLang));
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Auto-speak new response if it comes in
  useEffect(() => {
    if (lastAiResponse && ttsSupported) {
      // Speak the latest answer when it updates
      speakText(lastAiResponse);
    }
  }, [lastAiResponse]);

  return (
    <div id="voice-assistant-panel" className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl p-6 shadow-lg border border-emerald-700/50">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isListening ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isListening ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
            </span>
            {t.voiceInput}
          </h3>
          <p className="text-xs text-emerald-200/80 mt-1">
            {getVoiceLocale(currentLang)} • Speak in your regional language
          </p>
        </div>
        <div className="flex gap-2">
          {isSpeaking ? (
            <button
              id="voice-stop-speech-btn"
              onClick={stopSpeaking}
              title="Stop speaking"
              className="p-2 bg-emerald-800/80 hover:bg-emerald-700 rounded-lg text-emerald-100 transition"
            >
              <VolumeX size={18} />
            </button>
          ) : (
            <button
              id="voice-speak-last-btn"
              onClick={() => speakText(lastAiResponse || 'Welcome to Kishan Alert. Press the microphone button and ask your question.')}
              title="Read aloud"
              disabled={!lastAiResponse}
              className="p-2 bg-emerald-800/80 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-emerald-100 transition"
            >
              <Volume2 size={18} />
            </button>
          )}
        </div>
      </div>

      {!voiceSupported && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start gap-2 mb-4">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Speech recognition not fully supported on this browser frame. You can still type queries or use text-to-speech feedback.</span>
        </div>
      )}

      {recError === 'not-allowed' && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-rose-200 text-xs flex flex-col gap-1 mb-4 animate-fadeIn">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-400" />
            <span className="font-semibold text-red-200">{permissionInstructions[currentLang]?.title || 'Microphone Permission Needed'}</span>
          </div>
          <p className="pl-6 text-red-200/90 leading-relaxed text-[11px]">
            {permissionInstructions[currentLang]?.desc || 'Microphone permission has been denied. Please allow microphone access.'}
          </p>
        </div>
      )}

      {recError && recError !== 'not-allowed' && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start gap-2 mb-4 animate-fadeIn">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Speech recognition error: {recError}. Please try speaking again clearly in a quiet environment.</span>
        </div>
      )}

      {/* Main Mic Button */}
      <div className="flex flex-col items-center justify-center py-6">
        <button
          id="voice-mic-main-btn"
          onClick={isListening ? stopListening : startListening}
          disabled={!voiceSupported}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
            isListening 
              ? 'bg-rose-500 hover:bg-rose-600 ring-8 ring-rose-500/20 animate-pulse' 
              : 'bg-emerald-500 hover:bg-emerald-400 hover:scale-105 ring-8 ring-emerald-500/10'
          }`}
        >
          {isListening ? <Mic size={36} className="text-white" /> : <MicOff size={36} className="text-emerald-50" />}
        </button>
        <span className="text-xs text-emerald-300 font-semibold mt-3">
          {isListening ? 'Listening... Speak now' : 'Tap to start speaking'}
        </span>
      </div>

      {/* Audio Waveform Animation (when active) */}
      {(isListening || isSpeaking) && (
        <div className="flex items-center justify-center gap-1.5 h-6 my-2">
          <div className={`w-1 bg-emerald-400 rounded-full transition-all duration-300 ${isListening ? 'animate-[bounce_0.8s_infinite_100ms]' : isSpeaking ? 'animate-[pulse_0.8s_infinite_100ms] h-4' : 'h-1'}`}></div>
          <div className={`w-1 bg-emerald-400 rounded-full transition-all duration-300 ${isListening ? 'animate-[bounce_0.8s_infinite_200ms]' : isSpeaking ? 'animate-[pulse_0.8s_infinite_200ms] h-5' : 'h-1'}`}></div>
          <div className={`w-1 bg-emerald-400 rounded-full transition-all duration-300 ${isListening ? 'animate-[bounce_0.8s_infinite_300ms]' : isSpeaking ? 'animate-[pulse_0.8s_infinite_300ms] h-6' : 'h-1'}`}></div>
          <div className={`w-1 bg-emerald-400 rounded-full transition-all duration-300 ${isListening ? 'animate-[bounce_0.8s_infinite_400ms]' : isSpeaking ? 'animate-[pulse_0.8s_infinite_400ms] h-5' : 'h-1'}`}></div>
          <div className={`w-1 bg-emerald-400 rounded-full transition-all duration-300 ${isListening ? 'animate-[bounce_0.8s_infinite_500ms]' : isSpeaking ? 'animate-[pulse_0.8s_infinite_500ms] h-4' : 'h-1'}`}></div>
        </div>
      )}

      {/* Real-time speech transcription display */}
      <div className="bg-emerald-950/60 rounded-xl p-3 border border-emerald-800/40 min-h-[50px] flex items-center justify-center text-center">
        {transcript ? (
          <p className="text-sm font-medium italic text-emerald-100 font-sans">
            "{transcript}"
          </p>
        ) : (
          <p className="text-xs text-emerald-400/80">
            {isListening ? 'Try saying: "How to prevent yellow leaf disease in paddy?"' : 'Your spoken words will appear here...'}
          </p>
        )}
      </div>
    </div>
  );
}
