/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LanguageCode, translations, CropRecommendationResult } from '../types';
import { Compass, Thermometer, Droplet, ArrowUpRight, TrendingUp, Sparkles, Sprout, AlertCircle, FileDown, Share2, ShieldAlert } from 'lucide-react';

interface CropAdvisorProps {
  currentLang: LanguageCode;
}

export default function CropAdvisor({ currentLang }: CropAdvisorProps) {
  const t = translations[currentLang];
  const [soilType, setSoilType] = useState('Alluvial Soil');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [season, setSeason] = useState('Kharif (Monsoon)');
  const [rainfall, setRainfall] = useState('Medium');
  const [waterAvailability, setWaterAvailability] = useState('Canal Irrigation');
  const [temperature, setTemperature] = useState('28°C - 32°C');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CropRecommendationResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.trim() || !district.trim()) {
      setError('Please fill in your State and District.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/recommend-crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soilType,
          district,
          state,
          season,
          rainfall,
          waterAvailability,
          temperature,
          language: currentLang
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze crop suitability.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to process crop suggestion. Check your API configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const contentText = `
KISHAN ALERT - CROP RECOMMENDATION ADVISORY
----------------------------------------------
Parameters Analyzed:
- State: ${state}, District: ${district}
- Soil Type: ${soilType}
- Season: ${season}
- Rainfall: ${rainfall}, Irrigation: ${waterAvailability}
- Temp: ${temperature}

AI Recommended Crops:
${result.recommendedCrops.map((c, i) => `
[Option ${i + 1}] Crop Name: ${c.name}
- Expected Yield: ${c.expectedYield}
- Profitability: ${c.profitability}
- Water Requirement: ${c.waterRequirement}
- Fertilizer Requirement: ${c.fertilizerRequirement}
- Overview: ${c.description}
`).join('\n')}
----------------------------------------------
Please consult local extension blocks before commencing heavy agricultural modifications.
`;
    const element = document.createElement('a');
    const file = new Blob([contentText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Crop_Recommendation_Advice.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleShare = () => {
    if (!result) return;
    const bestCrop = result.recommendedCrops[0]?.name || '';
    const shareText = encodeURIComponent(
      `*Kishan Alert Crop Advisory*\n\n` +
      `*Best Crop Suggested:* ${bestCrop}\n` +
      `*Soil:* ${soilType}\n` +
      `*Expected Profit:* ${result.recommendedCrops[0]?.profitability || 'High'}\n\n` +
      `Check details on Kishan Alert App!`
    );
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
  };

  return (
    <div id="crop-advisor-panel" className="space-y-6">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm font-semibold flex items-start gap-2.5">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Inputs panel */}
      {!result && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">{t.state}</label>
              <input
                id="crop-state-input"
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Maharashtra, Tamil Nadu"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">{t.district}</label>
              <input
                id="crop-district-input"
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Nashik, Coimbatore"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">{t.soilType}</label>
              <select
                id="crop-soil-select"
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="Alluvial Soil">Alluvial Soil (गंगा-जमुनी जलोढ़)</option>
                <option value="Black Soil">Black Cotton Soil (रेगुर / काली मिट्टी)</option>
                <option value="Red Sandy Soil">Red and Yellow Soil (लाल-पीली बलुई)</option>
                <option value="Laterite Soil">Laterite Soil (लैटेराइट मरुस्थली)</option>
                <option value="Loamy Soil">Loamy Soil (दोमट मटियारी)</option>
                <option value="Clay Soil">Clayey Soil (चिकनी मिट्टी)</option>
                <option value="Marshy/Peaty Soil">Marshy Peaty Soil (दलदली/जैविक)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">{t.season}</label>
              <select
                id="crop-season-select"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="Kharif (Monsoon)">Kharif Monsoon (खरीफ - June to Oct)</option>
                <option value="Rabi (Winter)">Rabi Winter (रबी - Nov to April)</option>
                <option value="Zaid (Summer)">Zaid Summer (जायद - May to June)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">{t.rainfall}</label>
              <select
                id="crop-rainfall-select"
                value={rainfall}
                onChange={(e) => setRainfall(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="Very High (> 2000mm)">Very High (भारी वर्षा)</option>
                <option value="High (1000mm - 2000mm)">High (उच्च वर्षा)</option>
                <option value="Medium (500mm - 1000mm)">Medium (मध्यम वर्षा)</option>
                <option value="Low (< 500mm)">Low / Arid (अल्प वर्षा)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">{t.waterAvail}</label>
              <select
                id="crop-water-select"
                value={waterAvailability}
                onChange={(e) => setWaterAvailability(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="Canal Irrigation">Canal Supply (नहरी सिंचाई)</option>
                <option value="Borewell/Tube well">Borewell Tube-Well (नलकूप / बोरवेल)</option>
                <option value="Rainfed (Only Rain)">Rainfed (पूर्णतः वर्षा आश्रित)</option>
                <option value="Drip / Sprinkler system">Drip & Sprinkler (टपक सिंचाई पद्धति)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">{t.temperature}</label>
              <input
                id="crop-temp-input"
                type="text"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="e.g. 25°C - 30°C"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <button
            id="crop-submit-btn"
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
                <Compass size={18} />
                <span>{t.getRecommendation}</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Recommendation Results Display */}
      {result && (
        <div className="space-y-6">
          {/* Fallback Warning Banner */}
          {result.isFallback && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-amber-800 font-medium shadow-sm">
              <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">Live AI Crop Advice is Offline</p>
                <p className="mt-1">
                  The shared Gemini API free-tier quota is currently exhausted or denied. We have activated our local agronomy expert simulator to recommend optimal crops based on standard regional conditions.
                </p>
                <p className="mt-1.5 font-semibold text-slate-500 bg-amber-100/40 border border-amber-200/40 p-1.5 rounded font-mono text-[10px] break-all">
                  API Status: {result.fallbackReason}
                </p>
                <p className="mt-1.5 text-slate-600 font-normal">
                  To restore live AI web-grounded crop advising, please configure your own <strong className="font-mono bg-amber-100 px-1 rounded text-slate-700">GEMINI_API_KEY</strong> in the AI Studio <strong>Settings &gt; Secrets</strong> panel.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                <Compass size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Crop Recommendations</h3>
                <p className="text-xs text-slate-500">Based on your district, rainfall and soil properties</p>
              </div>
            </div>
            <button
              id="crop-advisor-retest"
              onClick={() => setResult(null)}
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              Modify Conditions
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {result.recommendedCrops.map((crop, idx) => (
              <div key={idx} className="bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-md rounded-2xl p-6 shadow-sm flex flex-col justify-between transition relative overflow-hidden group">
                <div className="absolute top-0 right-0 bg-emerald-500 text-white font-black px-3.5 py-1.5 rounded-bl-2xl text-[10px] uppercase tracking-wider">
                  #{idx + 1} Best Fit
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition">
                      <Sprout size={24} />
                    </div>
                    <h4 className="text-lg font-bold text-slate-800">{crop.name}</h4>
                  </div>

                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {crop.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 border-t border-slate-50 pt-4">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Expected Yield</span>
                      <span className="text-sm text-slate-700 font-bold mt-0.5 block">{crop.expectedYield}</span>
                    </div>
                    <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/30">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest block flex items-center gap-1">
                        <TrendingUp size={10} /> Profitability
                      </span>
                      <span className="text-sm text-emerald-800 font-bold mt-0.5 block">{crop.profitability}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block flex items-center gap-1">
                        <Droplet size={10} /> Water Needs
                      </span>
                      <span className="text-sm text-slate-700 font-medium mt-0.5 block">{crop.waterRequirement}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block flex items-center gap-1">
                        <Thermometer size={10} /> Fertilizer
                      </span>
                      <span className="text-sm text-slate-700 font-medium mt-0.5 block">{crop.fertilizerRequirement}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Download and Share Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              id="crop-download-advice"
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold shadow hover:bg-slate-700 transition"
            >
              <FileDown size={16} />
              Download Advice
            </button>
            <button
              id="crop-share-whatsapp"
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow hover:bg-emerald-500 transition"
            >
              <Share2 size={16} />
              Share via WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
