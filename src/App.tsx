/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  LanguageCode, 
  translations, 
  UserProfile, 
  ChatMessage 
} from './types';

// Icons
import { 
  Sprout, 
  LayoutDashboard, 
  MessageSquare, 
  Volume2, 
  VolumeX,
  Send,
  Trash2,
  ExternalLink,
  Activity, 
  Compass, 
  HeartPulse, 
  ShieldAlert, 
  HelpCircle, 
  UserCircle, 
  Languages, 
  Moon, 
  Sun, 
  Menu, 
  X, 
  Lock,
  Bot,
  ArrowLeft,
  RotateCw
} from 'lucide-react';

// Components
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import VoiceAssistant from './components/VoiceAssistant';
import DiseaseDiagnosis from './components/DiseaseDiagnosis';
import CropAdvisor from './components/CropAdvisor';
import SoilHealth from './components/SoilHealth';
import SMSAdvisory from './components/SMSAdvisory';
import GovernmentSchemes from './components/GovernmentSchemes';
import FertilizerHelper from './components/FertilizerHelper';
import FloatingChat from './components/FloatingChat';

export default function App() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<string>('home');
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['home']);

  const navigateTo = (tab: string) => {
    setNavigationHistory(prev => {
      if (prev[prev.length - 1] === tab) return prev;
      return [...prev, tab];
    });
    setActiveTab(tab);
  };

  const handleBack = () => {
    if (navigationHistory.length > 1) {
      const updatedHistory = [...navigationHistory];
      updatedHistory.pop(); // remove current tab
      const prevTab = updatedHistory[updatedHistory.length - 1];
      setNavigationHistory(updatedHistory);
      setActiveTab(prevTab);
    } else {
      setActiveTab('home');
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [currentLang, setCurrentLang] = useState<LanguageCode>('en');

  // Authentication state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Global chatbot history
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome_msg',
      sender: 'ai',
      text: 'Hello! I am Kishan Alert AI. Ask me any question about organic manures, plant disease, seed varieties, or crop safety.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Voice Assistant speech updates helper
  const [lastResponse, setLastResponse] = useState('');
  
  const [chatLoading, setChatLoading] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat history
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, chatLoading, activeTab]);

  const t = translations[currentLang];

  // Load language preference from user profile
  useEffect(() => {
    if (currentUser?.preferredLanguage) {
      setCurrentLang(currentUser.preferredLanguage);
    }
  }, [currentUser]);

  // Read auth token from localStorage on boot
  useEffect(() => {
    try {
      const stored = localStorage.getItem('farmer_profile');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse profile:', e);
    }
  }, []);

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('farmer_profile', JSON.stringify(user));
    if (user.preferredLanguage) {
      setCurrentLang(user.preferredLanguage);
    }
    navigateTo('dashboard'); // take logged-in user straight to dashboard
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('farmer_profile');
    navigateTo('home');
  };

  const handleUpdateProfile = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('farmer_profile', JSON.stringify(user));
  };

  const handleVoiceInputText = (text: string) => {
    // Append user voice text, open chat overlay
    const newMsg: ChatMessage = {
      id: 'voice_' + Date.now(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatHistory(prev => [...prev, newMsg]);

    // Query backend chat API
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: chatHistory,
        language: currentLang
      })
    })
    .then(res => res.json())
    .then(data => {
      const aiMsg: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        sender: 'ai',
        text: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, aiMsg]);
      setLastResponse(data.response); // triggers Speech readout!
    })
    .catch(err => {
      console.error(err);
    });
  };

  // Navigations list
  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'chat', label: t.chat, icon: MessageSquare },
    { id: 'voice', label: t.voiceInput, icon: Volume2 },
    { id: 'diagnosis', label: t.diagnosis, icon: ShieldAlert },
    { id: 'crop-rec', label: t.cropRec, icon: Compass },
    { id: 'soil', label: t.soilHealth, icon: HeartPulse },
    { id: 'sms', label: t.smsAdv, icon: Activity },
    { id: 'fertilizer', label: t.fertilizer, icon: Sprout },
    { id: 'schemes', label: t.schemes, icon: HelpCircle },
  ];

  // Render content based on activeTab
  const renderContent = () => {
    // 1. Check if accessing a secure page and not logged in
    const secureTabs = ['dashboard', 'chat', 'diagnosis', 'crop-rec', 'soil', 'sms', 'fertilizer', 'schemes'];
    if (secureTabs.includes(activeTab) && !currentUser) {
      return (
        <div className="max-w-md mx-auto py-12 px-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Lock size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-800">Secure Farmer Login Required</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {t.unauthorized}
              </p>
            </div>
            <Auth 
              currentUser={currentUser} 
              onLogin={handleLogin} 
              onLogout={handleLogout} 
              onUpdateProfile={handleUpdateProfile}
              currentLang={currentLang}
            />
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard currentLang={currentLang} currentUser={currentUser} onNavigate={(tab) => navigateTo(tab)} />;
      case 'chat':
        return (
          <div className="max-w-4xl mx-auto bg-white border border-slate-100 rounded-2xl h-[650px] flex flex-col shadow-sm overflow-hidden">
            {/* Full-screen Chat Header */}
            <div className="bg-brand-primary text-white p-4 flex justify-between items-center shrink-0 border-b border-emerald-900/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-secondary rounded-xl text-brand-accent">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-wide">Kishan Alert Chat Assistant</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <p className="text-[10px] text-emerald-200 font-bold">Live Gemini 3.5 AI Search Active</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear the conversation history?")) {
                      setChatHistory([
                        {
                          id: 'welcome_msg',
                          sender: 'ai',
                          text: 'Hello! I am Kishan Alert AI. Ask me any question about organic manures, plant disease, seed varieties, or crop safety.',
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                      ]);
                      window.speechSynthesis.cancel();
                      setSpeakingMessageId(null);
                    }
                  }}
                  className="p-2 hover:bg-emerald-900 rounded-xl text-emerald-100 transition"
                  title="Clear Conversation"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Chat Body & Scrollable Window */}
            <div className="flex-1 overflow-hidden relative bg-slate-50 flex flex-col">
              <div 
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-4"
              >
                {chatHistory.map((msg) => {
                  const isAi = msg.sender === 'ai';
                  const isSpeaking = speakingMessageId === msg.id;

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 max-w-[85%] ${!isAi ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      {/* Avatar / Icon */}
                      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-black select-none ${
                        !isAi ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {!isAi ? 'U' : 'AI'}
                      </div>

                      {/* Message bubble */}
                      <div className={`p-4 rounded-2xl shadow-sm leading-relaxed border relative group ${
                        !isAi 
                          ? 'bg-emerald-600 text-white border-emerald-500 rounded-tr-none' 
                          : 'bg-white text-slate-700 border-slate-100 rounded-tl-none'
                      }`}>
                        
                        {/* Text Render with Linebreak support */}
                        <div className="text-xs font-medium space-y-2">
                          {msg.text.split('\n').map((line, lIdx) => (
                            <p key={lIdx} className="leading-relaxed">{line}</p>
                          ))}
                        </div>

                        {/* Citations / Grounding sources */}
                        {isAi && msg.groundingSources && msg.groundingSources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                            <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold flex items-center gap-1">
                              <Compass size={10} className="text-emerald-600 animate-pulse" />
                              <span>Verified Search Citations</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.groundingSources.map((src, sIdx) => (
                                <a
                                  key={sIdx}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded px-2 py-1 text-[9px] font-semibold border border-slate-200 hover:border-emerald-200 transition-all max-w-[180px] truncate"
                                  title={src.title}
                                >
                                  <ExternalLink size={8} />
                                  <span>{src.title}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Footer details: timestamp and sound synthesis */}
                        <div className="mt-2 flex items-center justify-between gap-4 text-[9px] opacity-60">
                          <span>{msg.timestamp}</span>
                          
                          {isAi && (
                            <button
                              onClick={() => {
                                if (speakingMessageId === msg.id) {
                                  window.speechSynthesis.cancel();
                                  setSpeakingMessageId(null);
                                } else {
                                  window.speechSynthesis.cancel();
                                  const utterance = new SpeechSynthesisUtterance(msg.text);
                                  if (currentLang === 'hi') utterance.lang = 'hi-IN';
                                  else if (currentLang === 'ta') utterance.lang = 'ta-IN';
                                  else if (currentLang === 'te') utterance.lang = 'te-IN';
                                  else if (currentLang === 'kn') utterance.lang = 'kn-IN';
                                  else if (currentLang === 'ml') utterance.lang = 'ml-IN';
                                  else utterance.lang = 'en-US';

                                  utterance.onend = () => setSpeakingMessageId(null);
                                  utterance.onerror = () => setSpeakingMessageId(null);
                                  setSpeakingMessageId(msg.id);
                                  window.speechSynthesis.speak(utterance);
                                }
                              }}
                              className={`p-1 rounded-md transition-all ${
                                isSpeaking 
                                  ? 'bg-emerald-100 text-emerald-800 animate-pulse' 
                                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                              }`}
                              title={isSpeaking ? "Mute audio readout" : "Listen out loud"}
                            >
                              {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {chatLoading && (
                  <div className="flex gap-3 max-w-[80%] mr-auto items-center">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs font-black text-emerald-800">
                      AI
                    </div>
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce delay-75"></span>
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce delay-150"></span>
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Searching the web...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input form */}
              <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = document.getElementById('full-chat-input') as HTMLInputElement;
                    if (!input || !input.value.trim() || chatLoading) return;
                    const val = input.value;
                    input.value = '';
                    
                    const userMsg: ChatMessage = {
                      id: 'msg_f_' + Date.now(),
                      sender: 'user',
                      text: val.trim(),
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };

                    setChatHistory(prev => [...prev, userMsg]);
                    setChatLoading(true);
                    
                    fetch('/api/chat', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ message: val.trim(), history: chatHistory, language: currentLang })
                    })
                    .then(res => res.json())
                    .then(data => {
                      const sources: Array<{ uri: string; title: string }> = [];
                      if (data.groundingMetadata?.groundingChunks) {
                        data.groundingMetadata.groundingChunks.forEach((chunk: any) => {
                          if (chunk.web?.uri) {
                            sources.push({
                              uri: chunk.web.uri,
                              title: chunk.web.title || chunk.web.uri
                            });
                          }
                        });
                      }

                      setChatHistory(prev => [...prev, {
                        id: 'msg_f_ai_' + Date.now(),
                        sender: 'ai',
                        text: data.response,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        groundingSources: sources.length > 0 ? sources : undefined
                      }]);
                      setLastResponse(data.response);
                    })
                    .catch(err => {
                      console.error(err);
                      setChatHistory(prev => [...prev, {
                        id: 'msg_f_err_' + Date.now(),
                        sender: 'ai',
                        text: 'Connection error. Please try again.',
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }]);
                    })
                    .finally(() => {
                      setChatLoading(false);
                    });
                  }}
                  className="flex gap-2"
                >
                  <input
                    id="full-chat-input"
                    type="text"
                    disabled={chatLoading}
                    placeholder={chatLoading ? "Please wait..." : "Ask me about weather forecasts, pesticide ratios, subsidies, seed varieties..."}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white transition disabled:opacity-50"
                  />
                  <button 
                    type="submit" 
                    disabled={chatLoading}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Send size={14} />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        );
      case 'voice':
        return <VoiceAssistant currentLang={currentLang} onVoiceInputText={handleVoiceInputText} lastAiResponse={lastResponse} />;
      case 'diagnosis':
        return <DiseaseDiagnosis currentLang={currentLang} />;
      case 'crop-rec':
        return <CropAdvisor currentLang={currentLang} />;
      case 'soil':
        return <SoilHealth currentLang={currentLang} />;
      case 'sms':
        return <SMSAdvisory currentLang={currentLang} />;
      case 'fertilizer':
        return <FertilizerHelper currentLang={currentLang} />;
      case 'schemes':
        return <GovernmentSchemes currentLang={currentLang} />;
      case 'profile':
        return (
          <Auth 
            currentUser={currentUser} 
            onLogin={handleLogin} 
            onLogout={handleLogout} 
            onUpdateProfile={handleUpdateProfile}
            currentLang={currentLang}
          />
        );
      default:
        // Homepage Landing Page
        return (
          <div className="space-y-12">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-primary to-brand-secondary text-white p-8 md:p-14 border border-brand-secondary/40 shadow-xl flex flex-col justify-center min-h-[350px]">
              <div className="max-w-2xl space-y-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-accent/10 text-brand-accent text-[10px] font-black uppercase tracking-widest rounded-full border border-brand-accent/20">
                  🌱 Expert AI Agronomist Platform
                </span>
                <h1 className="text-4xl md:text-5xl font-black font-sans tracking-tight leading-tight">
                  Kishan Alert
                </h1>
                <p className="text-sm md:text-base text-emerald-100/90 font-medium leading-relaxed">
                  {t.tagline}
                </p>
                <div className="flex flex-wrap gap-3.5 pt-2">
                  <button
                    id="hero-ask-ai-btn"
                    onClick={() => navigateTo(currentUser ? 'chat' : 'dashboard')}
                    className="px-6 py-3 bg-brand-accent hover:scale-105 text-brand-primary font-extrabold rounded-xl text-sm transition shadow-lg cursor-pointer"
                  >
                    {t.askAi}
                  </button>
                  <button
                    id="hero-voice-btn"
                    onClick={() => navigateTo(currentUser ? 'voice' : 'dashboard')}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-extrabold border border-white/20 rounded-xl text-sm transition cursor-pointer"
                  >
                    {t.voiceInput}
                  </button>
                </div>
              </div>
            </div>

            {/* Language Chooser Bar */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-3.5 flex items-center justify-center gap-1.5">
                <Languages size={14} /> Choose Your Farming Language
              </span>
              <div className="flex flex-wrap gap-2.5 justify-center">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'हिन्दी (Hindi)' },
                  { code: 'ta', label: 'தமிழ் (Tamil)' },
                  { code: 'te', label: 'తెలుగు (Telugu)' },
                  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
                  { code: 'ml', label: 'മലയാളം (Malayalam)' }
                ].map((l) => (
                  <button
                    id={`lang-btn-${l.code}`}
                    key={l.code}
                    onClick={() => {
                      setCurrentLang(l.code as LanguageCode);
                      if (currentUser) {
                        handleUpdateProfile({ ...currentUser, preferredLanguage: l.code as LanguageCode });
                      }
                    }}
                    className={`px-4 py-2 text-xs font-black rounded-xl border transition ${
                      currentLang === l.code 
                        ? 'bg-brand-primary text-white border-brand-primary shadow-md scale-105' 
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100/70 border-slate-200/50'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Launcher Highlights Grid */}
            <div className="space-y-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Agri-Smart Toolkit Solutions</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { id: 'diagnosis', title: 'Crop Disease Pathology', desc: 'Identify crop anomalies from photographs using computer-vision diagnosis.', icon: ShieldAlert, color: 'text-rose-500 bg-rose-50 border-rose-100' },
                  { id: 'crop-rec', title: 'Smart Crop Suggestions', desc: 'Acquire precise crop suggestions based on local soil and seasonal elements.', icon: Compass, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
                  { id: 'soil', title: 'Soil Enrichment', desc: 'Balance pH and NPK levels using compost recommendations.', icon: HeartPulse, color: 'text-amber-500 bg-amber-50 border-amber-100' },
                  { id: 'fertilizer', title: t.fertilizer, desc: 'Detailed manuals for chemical fertilizer dosing safety and organic options.', icon: Sprout, color: 'text-teal-500 bg-teal-50 border-teal-100' },
                  { id: 'sms', title: 'SMS Advisory alerts', desc: 'Get regional farming, crop alerts, and tips on your basic phone via SMS.', icon: Activity, color: 'text-indigo-500 bg-indigo-50 border-indigo-100' },
                  { id: 'schemes', title: 'Agricultural Schemes', desc: 'Search and mark interest for PM-KISAN, crop insurance, and state grants.', icon: HelpCircle, color: 'text-sky-500 bg-sky-50 border-sky-100' },
                ].map((launcher) => (
                  <div
                    key={launcher.id}
                    onClick={() => navigateTo(launcher.id)}
                    className="bg-white border border-slate-100 hover:border-emerald-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition duration-200 cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="space-y-4">
                      <div className={`w-11 h-11 ${launcher.color} rounded-xl flex items-center justify-center border shrink-0 group-hover:scale-105 transition`}>
                        <launcher.icon size={22} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm leading-snug">{launcher.title}</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5">{launcher.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-white dark' : 'bg-brand-bg text-slate-800'
    }`}>
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200/60 sticky top-0 z-40 px-6 py-3.5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            {/* Stunning Modern Logo Emblem */}
            <div className="w-11 h-11 bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 rounded-2xl flex items-center justify-center text-white border border-emerald-400/20 shadow-md shadow-emerald-700/10 hover:scale-105 transition-transform duration-200">
              <div className="relative">
                <Sprout size={22} className="text-white drop-shadow-sm" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
              </div>
            </div>
            <div>
              <span className="text-xs text-brand-primary font-black tracking-widest block uppercase">Kishan Alert</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Agriculture AI Companion</span>
            </div>
          </div>

          {/* Navigation Controls: Back and Refresh */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 p-1 rounded-xl">
            <button
              id="header-back-btn"
              onClick={handleBack}
              disabled={navigationHistory.length <= 1 && activeTab === 'home'}
              className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                navigationHistory.length > 1 || activeTab !== 'home'
                  ? 'text-slate-600 hover:text-brand-primary hover:bg-white hover:shadow-sm'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
              title="Go Back"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <button
              id="header-refresh-btn"
              onClick={() => {
                window.location.reload();
              }}
              className="p-2 text-slate-600 hover:text-brand-primary hover:bg-white hover:shadow-sm rounded-lg transition-all flex items-center justify-center cursor-pointer"
              title="Refresh Application"
            >
              <RotateCw size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Main Navigation Links */}
          <nav className="hidden xl:flex items-center gap-2">
            <button
              id="nav-home-btn"
              onClick={() => navigateTo('home')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'home' 
                  ? 'bg-brand-primary/10 text-brand-primary font-extrabold' 
                  : 'text-slate-600 hover:text-brand-primary hover:bg-slate-50'
              }`}
            >
              {t.home}
            </button>
            {navItems.map((item) => (
              <button
                id={`nav-${item.id}-btn`}
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === item.id 
                    ? 'bg-brand-primary/10 text-brand-primary font-extrabold' 
                    : 'text-slate-600 hover:text-brand-primary hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* User Signin / Profile button */}
          <button
            id="nav-profile-btn"
            onClick={() => navigateTo('profile')}
            className={`p-2 rounded-xl border border-slate-200 transition flex items-center gap-1.5 cursor-pointer hover:bg-brand-bg text-brand-primary`}
            title={currentUser ? 'Farmer Profile' : 'Farmer Login'}
          >
            <UserCircle size={18} className="text-brand-primary" />
            <span className="text-xs font-bold text-slate-700 hidden md:inline">
              {currentUser ? currentUser.name : t.login}
            </span>
          </button>

          {/* Sidebar Toggle */}
          <button
            id="mobile-nav-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="xl:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex max-w-[1400px] w-full mx-auto">
        {/* Sidebar Navigation */}
        <aside className={`xl:block w-[240px] bg-brand-primary text-white p-5 space-y-6 shrink-0 z-30 transition-all duration-300 fixed xl:sticky top-[69px] h-[calc(100vh-69px)] ${
          sidebarOpen ? 'left-0 shadow-2xl' : '-left-[240px] xl:left-0'
        }`}>
          <div className="space-y-1.5">
            <span className="text-[10px] text-emerald-100/50 font-bold uppercase tracking-widest block px-3.5 mb-2">Farmer Navigation</span>
            <button
              id="sidebar-home-btn"
              onClick={() => { navigateTo('home'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'home' 
                  ? 'bg-brand-secondary text-white font-black shadow-md shadow-brand-secondary/10' 
                  : 'text-emerald-100/70 hover:text-white hover:bg-brand-secondary/50'
              }`}
            >
              <Sprout size={16} />
              <span>{t.home}</span>
            </button>

            {navItems.map((item) => (
              <button
                id={`sidebar-${item.id}-btn`}
                key={item.id}
                onClick={() => { navigateTo(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === item.id 
                    ? 'bg-brand-secondary text-white font-black shadow-md shadow-brand-secondary/10' 
                    : 'text-emerald-100/70 hover:text-white hover:bg-brand-secondary/50'
                }`}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Season info decoration block matching design template */}
          <div className="p-4 bg-brand-secondary rounded-2xl">
            <div className="text-xs font-semibold uppercase opacity-60 mb-2">Crop Season</div>
            <div className="text-sm font-bold">Kharif 2024</div>
            <div className="mt-3 h-1 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-brand-accent w-2/3"></div>
            </div>
          </div>

          <div className="pt-6 border-t border-emerald-900/40 text-center space-y-1 text-emerald-100/40 text-[10px] font-semibold">
            <p>© 2026 Kishan Alert</p>
            <p>Made in India for Rural Empowerment</p>
          </div>
        </aside>

        {/* Content Panel */}
        <main id="app-content-panel" className="flex-1 p-6 md:p-8 overflow-x-hidden min-h-[calc(100vh-69px)]">
          {renderContent()}
        </main>
      </div>

      {/* Floating Chat Overlay (Always Active) */}
      <FloatingChat 
        currentLang={currentLang} 
        onNewMessage={(txt) => setLastResponse(txt)}
        chatHistory={chatHistory}
        onSetChatHistory={setChatHistory}
      />
    </div>
  );
}
