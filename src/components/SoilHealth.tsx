/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LanguageCode, translations, SoilHealthResult } from '../types';
import { Sprout, AlertCircle, HeartPulse, CheckCircle2, Award, Info, FileDown, Share2, Compass, ShieldAlert } from 'lucide-react';

interface SoilHealthProps {
  currentLang: LanguageCode;
}

export default function SoilHealth({ currentLang }: SoilHealthProps) {
  const t = translations[currentLang];
  const [ph, setPh] = useState('6.5');
  const [organicCarbon, setOrganicCarbon] = useState('0.45'); // percent
  const [nitrogen, setNitrogen] = useState('Low');
  const [phosphorus, setPhosphorus] = useState('Medium');
  const [potassium, setPotassium] = useState('High');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SoilHealthResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/soil-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ph,
          organicCarbon,
          nitrogen,
          phosphorus,
          potassium,
          language: currentLang
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze soil properties.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to process soil analysis. Verify your environment keys.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const contentText = `
KISHAN ALERT - SOIL HEALTH CARD REPORT
----------------------------------------------
Input Parameters:
- Soil pH: ${ph}
- Organic Carbon: ${organicCarbon}%
- Nitrogen (N): ${nitrogen}
- Phosphorus (P): ${phosphorus}
- Potassium (K): ${potassium}

Soil Analysis:
- Soil Health Score: ${result.soilScore}/100
- Soil Status: ${result.status}

Advisory Details:
- Organic Carbon: ${result.organicCarbonAdvice}
- NPK Balance: ${result.npkAdvice}
- Compost Usage: ${result.compostAdvice}
- Green Manure: ${result.greenManureAdvice}
- Vermicompost: ${result.vermicompostAdvice}
- Biofertilizer: ${result.biofertilizerAdvice}

Step-by-Step Improvement Plan:
${result.soilImprovementPlan.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}
----------------------------------------------
We recommend testing your soil physically at a government laboratory once every 2 years.
`;
    const element = document.createElement('a');
    const file = new Blob([contentText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Soil_Health_Advisory_Report.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleShare = () => {
    if (!result) return;
    const shareText = encodeURIComponent(
      `*Kishan Alert Soil Advisory*\n\n` +
      `*Soil Score:* ${result.soilScore}/100\n` +
      `*Status:* ${result.status}\n` +
      `*Compost:* ${result.compostAdvice.substring(0, 100)}...\n\n` +
      `Tested with AI on Kishan Alert!`
    );
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
  };

  return (
    <div id="soil-health-panel" className="space-y-6">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm font-semibold flex items-start gap-2.5">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Inputs Section */}
      {!result && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">{t.soilPh} (0 - 14)</label>
              <input
                id="soil-ph-input"
                type="number"
                step="0.1"
                min="0"
                max="14"
                required
                value={ph}
                onChange={(e) => setPh(e.target.value)}
                placeholder="e.g. 6.5 (Neutral)"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">{t.organicCarbon}</label>
              <input
                id="soil-oc-input"
                type="number"
                step="0.01"
                min="0"
                required
                value={organicCarbon}
                onChange={(e) => setOrganicCarbon(e.target.value)}
                placeholder="e.g. 0.5% - 0.75%"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">{t.nitrogen}</label>
              <select
                id="soil-n-select"
                value={nitrogen}
                onChange={(e) => setNitrogen(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
              >
                <option value="Low">{t.low} (&lt; 280 kg/Ha)</option>
                <option value="Medium">{t.medium} (280 - 560 kg/Ha)</option>
                <option value="High">{t.high} (&gt; 560 kg/Ha)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">{t.phosphorus}</label>
              <select
                id="soil-p-select"
                value={phosphorus}
                onChange={(e) => setPhosphorus(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
              >
                <option value="Low">{t.low} (&lt; 10 kg/Ha)</option>
                <option value="Medium">{t.medium} (10 - 25 kg/Ha)</option>
                <option value="High">{t.high} (&gt; 25 kg/Ha)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">{t.potassium}</label>
              <select
                id="soil-k-select"
                value={potassium}
                onChange={(e) => setPotassium(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
              >
                <option value="Low">{t.low} (&lt; 108 kg/Ha)</option>
                <option value="Medium">{t.medium} (108 - 280 kg/Ha)</option>
                <option value="High">{t.high} (&gt; 280 kg/Ha)</option>
              </select>
            </div>
          </div>

          <button
            id="soil-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-600/10 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{t.loading}</span>
              </>
            ) : (
              <>
                <HeartPulse size={18} />
                <span>{t.analyzeSoil}</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Response Results Display */}
      {result && (
        <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
          {/* Fallback Warning Banner */}
          {result.isFallback && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-amber-800 font-medium shadow-sm">
              <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">Live AI Soil Advisor is Offline</p>
                <p className="mt-1">
                  The shared Gemini API free-tier quota is currently exhausted or denied. We have activated our local organic soil science simulator to generate optimal soil improvement plans based on standard chemistry conditions.
                </p>
                <p className="mt-1.5 font-semibold text-slate-500 bg-amber-100/40 border border-amber-200/40 p-1.5 rounded font-mono text-[10px] break-all">
                  API Status: {result.fallbackReason}
                </p>
                <p className="mt-1.5 text-slate-600 font-normal">
                  To restore live custom AI soil assessment, please configure your own <strong className="font-mono bg-amber-100 px-1 rounded text-slate-700">GEMINI_API_KEY</strong> in the AI Studio <strong>Settings &gt; Secrets</strong> panel.
                </p>
              </div>
            </div>
          )}

          {/* Health Index Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Giant Score Gauge */}
              <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke={result.soilScore > 70 ? '#10b981' : result.soilScore > 40 ? '#f59e0b' : '#f43f5e'}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * result.soilScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-black text-slate-800">{result.soilScore}</span>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Index</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t.soilHealthScore}</span>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{result.status}</h3>
                <p className="text-xs text-slate-500 mt-1">NPK rating: N({nitrogen}), P({phosphorus}), K({potassium}) • pH {ph}</p>
              </div>
            </div>

            <button
              id="soil-advisor-retest"
              onClick={() => setResult(null)}
              className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition"
            >
              Test New Soil Sample
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Organic Compost & Manure Advice */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2.5 mb-3">
                <Award size={18} className="text-emerald-500 animate-pulse" /> Organic Fertilizers
              </h4>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="text-xl shrink-0 mt-0.5">🌾</span>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vermicompost Advice</span>
                    <p className="text-sm text-slate-600 font-semibold mt-0.5">{result.vermicompostAdvice}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-xl shrink-0 mt-0.5">🍃</span>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Green Manure</span>
                    <p className="text-sm text-slate-600 font-semibold mt-0.5">{result.greenManureAdvice}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-xl shrink-0 mt-0.5">💩</span>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Organic Compost</span>
                    <p className="text-sm text-slate-600 font-semibold mt-0.5">{result.compostAdvice}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-xl shrink-0 mt-0.5">🔬</span>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Biofertilizer</span>
                    <p className="text-sm text-slate-600 font-semibold mt-0.5">{result.biofertilizerAdvice}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* General Improvement Guidelines */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-2.5 mb-3">
                <Compass size={18} /> Step-by-Step Improvement Plan
              </h4>

              <div className="space-y-3">
                {result.soilImprovementPlan.map((step, idx) => (
                  <div key={idx} className="flex gap-3.5 items-start">
                    <span className="w-6 h-6 bg-emerald-500/10 text-emerald-400 rounded-full font-black text-xs flex items-center justify-center shrink-0 border border-emerald-500/20 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-emerald-100 font-semibold leading-relaxed">
                      {step}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <p className="text-[11px] text-emerald-300 font-semibold uppercase tracking-wider">Critical Advice:</p>
                <p className="text-xs text-slate-300">
                  {result.organicCarbonAdvice} {result.npkAdvice}
                </p>
              </div>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              id="soil-download-advice"
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold shadow hover:bg-slate-700 transition"
            >
              <FileDown size={16} />
              Download Advice Card
            </button>
            <button
              id="soil-share-whatsapp"
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow hover:bg-emerald-500 transition"
            >
              <Share2 size={16} />
              Share Card via WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
