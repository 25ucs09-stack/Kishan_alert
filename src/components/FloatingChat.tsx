/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { LanguageCode, translations, ChatMessage } from '../types';
import { MessageSquare, X, Send, Bot, RefreshCw, Volume2, VolumeX, ShieldAlert, Compass, ExternalLink } from 'lucide-react';

interface FloatingChatProps {
  currentLang: LanguageCode;
  onNewMessage: (text: string) => void;
  chatHistory: ChatMessage[];
  onSetChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export default function FloatingChat({ currentLang, onNewMessage, chatHistory, onSetChatHistory }: FloatingChatProps) {
  const t = translations[currentLang];
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isOpen]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: message.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    onSetChatHistory(prev => [...prev, userMsg]);
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          history: chatHistory,
          language: currentLang
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Chat failed. Check backend endpoints.');
      }

      if (data.isFallback) {
        setFallbackWarning(data.fallbackReason || 'Gemini API not available.');
      } else {
        setFallbackWarning(null);
      }

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

      const aiMsg: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        sender: 'ai',
        text: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundingSources: sources.length > 0 ? sources : undefined
      };

      onSetChatHistory(prev => [...prev, aiMsg]);
      onNewMessage(data.response); // notify parent for voice assistant readout if active
    } catch (err: any) {
      setFallbackWarning(err.message || 'Connection failed.');
      const errorMsg: ChatMessage = {
        id: 'msg_err_' + Date.now(),
        sender: 'ai',
        text: 'Error: ' + (err.message || 'Please ensure your GEMINI_API_KEY is configured in Secrets.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      onSetChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const clean = text.replace(/[*#_`~]/g, '').substring(0, 400);
    const utterance = new SpeechSynthesisUtterance(clean);
    
    // Auto locale
    const locale = currentLang === 'ta' ? 'ta-IN' : currentLang === 'hi' ? 'hi-IN' : currentLang === 'te' ? 'te-IN' : currentLang === 'kn' ? 'kn-IN' : currentLang === 'ml' ? 'ml-IN' : 'en-IN';
    utterance.lang = locale;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const clearHistory = () => {
    onSetChatHistory([
      {
        id: 'welcome_msg',
        sender: 'ai',
        text: 'Hello! I am Kishan Alert AI. Ask me any question about organic manures, plant disease, seed varieties, or crop safety.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    stopSpeaking();
  };

  return (
    <div id="floating-ai-assistant-container" className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          id="floating-toggle-btn"
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl transition hover:scale-105 cursor-pointer ring-4 ring-emerald-600/15"
          title="Ask AI Advisor"
        >
          <Bot size={28} className="animate-pulse" />
        </button>
      )}

      {/* Expanded Chat Window */}
      {isOpen && (
        <div 
          id="floating-chat-drawer" 
          className="bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col w-[360px] md:w-[400px] h-[500px] max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-emerald-700 text-white p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight">Kishan Alert AI</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">Expert Chatbot</span>
                  {fallbackWarning ? (
                    <span className="inline-flex items-center gap-0.5 bg-amber-800 text-amber-100 border border-amber-600/50 px-1 py-0.2 rounded text-[8px] font-bold">
                      <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                      Offline Mode
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 bg-emerald-800 text-emerald-100 border border-emerald-600/50 px-1 py-0.2 rounded text-[8px] font-bold">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                      Live Search
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="floating-chat-clear"
                onClick={clearHistory}
                title="Clear Chat History"
                className="p-1.5 hover:bg-emerald-600 rounded-lg text-emerald-100 transition"
              >
                <RefreshCw size={14} />
              </button>
              {isSpeaking ? (
                <button
                  id="floating-chat-stop-speak"
                  onClick={stopSpeaking}
                  title="Stop Audio"
                  className="p-1.5 hover:bg-emerald-600 rounded-lg text-emerald-100 transition"
                >
                  <VolumeX size={14} />
                </button>
              ) : (
                <button
                  id="floating-chat-speak"
                  onClick={() => speakText(chatHistory[chatHistory.length - 1]?.text || '')}
                  title="Speak last answer"
                  className="p-1.5 hover:bg-emerald-600 rounded-lg text-emerald-100 transition"
                >
                  <Volume2 size={14} />
                </button>
              )}
              <button
                id="floating-chat-close"
                onClick={() => { setIsOpen(false); stopSpeaking(); }}
                className="p-1.5 hover:bg-emerald-600 rounded-lg text-emerald-100 transition"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 font-sans">
            {chatHistory.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={14} />
                  </div>
                )}
                <div className="space-y-1">
                  <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                  }`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                    
                    {/* Floating bubble citations display */}
                    {msg.sender === 'ai' && msg.groundingSources && msg.groundingSources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                        <div className="text-[9px] uppercase tracking-wider text-emerald-800 font-bold flex items-center gap-0.5">
                          <Compass size={8} className="text-emerald-600 animate-pulse" />
                          <span>Search Sources</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {msg.groundingSources.map((src, sIdx) => (
                            <a
                              key={sIdx}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded px-1.5 py-0.5 text-[8px] font-semibold border border-slate-200 hover:border-emerald-200 transition-all max-w-[140px] truncate"
                              title={src.title}
                            >
                              <ExternalLink size={6} />
                              <span>{src.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className={`text-[9px] text-slate-400 block font-bold ${
                    msg.sender === 'user' ? 'text-right' : 'text-left pl-1'
                  }`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 max-w-[85%] mr-auto items-center">
                <div className="w-7 h-7 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center shrink-0 animate-pulse">
                  <Bot size={14} />
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-2xl rounded-tl-none text-xs font-semibold text-slate-400 flex items-center gap-1.5 shadow-sm">
                  <span>AI Advisor is thinking</span>
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Fallback Mode Warning Banner */}
          {fallbackWarning && (
            <div className="bg-amber-50 border-y border-amber-100 px-3 py-2 flex items-start gap-2 text-[10px] leading-relaxed text-amber-800 font-semibold select-none shrink-0">
              <ShieldAlert size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span>Live Gemini Search Grounding is offline (using simulated local database): </span>
                <span className="text-amber-700 italic block mt-0.5 font-bold font-mono text-[9px] bg-amber-100/50 p-1 rounded border border-amber-200/40 break-all">
                  {fallbackWarning}
                </span>
                <span className="mt-1 block text-slate-500 font-normal text-slate-600">
                  To restore live web search, please configure a valid <span className="font-semibold font-mono bg-amber-100 px-1 rounded text-slate-700">GEMINI_API_KEY</span> in the AI Studio <strong>Settings &gt; Secrets</strong> panel.
                </span>
              </div>
            </div>
          )}

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center shrink-0">
            <input
              id="floating-chat-input"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.chatPlaceholder}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
            />
            <button
              id="floating-chat-send"
              type="submit"
              disabled={loading || !message.trim()}
              className="w-9 h-9 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl flex items-center justify-center shadow-md transition shrink-0 cursor-pointer"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
