/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { LanguageCode, translations, DiseaseDiagnosisResult } from '../types';
import { Upload, Keyboard, AlertTriangle, Check, ShieldAlert, Sparkles, Sprout, Heart, FileDown, Share2, ArrowRight } from 'lucide-react';

interface DiseaseDiagnosisProps {
  currentLang: LanguageCode;
}

export default function DiseaseDiagnosis({ currentLang }: DiseaseDiagnosisProps) {
  const t = translations[currentLang];
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  
  // Image states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Text symptoms states
  const [textSymptoms, setTextSymptoms] = useState('');
  
  // Results & UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DiseaseDiagnosisResult | null>(null);

  // Convert File to Base64
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, etc.).');
      return;
    }
    setError('');
    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      setBase64Image(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setBase64Image(null);
    setResult(null);
    setError('');
  };

  const handleSymptomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'upload' && !base64Image) {
      setError('Please upload a plant leaf image first.');
      return;
    }
    if (activeTab === 'text' && !textSymptoms.trim()) {
      setError('Please describe the symptoms of your plant first.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const payload = {
        imageBase64: activeTab === 'upload' ? base64Image : null,
        mimeType: selectedFile ? selectedFile.type : null,
        symptoms: activeTab === 'text' ? textSymptoms : null,
        language: currentLang
      };

      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Diagnosis failed. Check your GEMINI_API_KEY settings.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during plant disease detection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAdvice = () => {
    if (!result) return;
    const reportText = `
KISHAN ALERT - PLANT DISEASE DIAGNOSIS REPORT
----------------------------------------------
Disease Name: ${result.diseaseName}
Confidence Score: ${result.confidence}%

Symptoms:
${result.symptoms.map(s => `- ${s}`).join('\n')}

Possible Causes:
${result.causes.map(c => `- ${c}`).join('\n')}

Chemical Treatment Recommended:
${result.treatment.chemical.map(t => `- ${t}`).join('\n')}

Organic / Eco-Friendly Remedies:
${result.treatment.organic.map(o => `- ${o}`).join('\n')}

Preventive Measures:
${result.prevention.map(p => `- ${p}`).join('\n')}

Safety Guidelines:
${result.safetyPrecautions.map(s => `- ${s}`).join('\n')}
----------------------------------------------
Consult your local agricultural extension service for official approvals.
`;
    const element = document.createElement('a');
    const file = new Blob([reportText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${result.diseaseName.replace(/\s+/g, '_')}_Advice.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleShareWhatsApp = () => {
    if (!result) return;
    const shareText = encodeURIComponent(
      `*Kishan Alert Disease Advisory*\n\n` +
      `*Disease:* ${result.diseaseName} (${result.confidence}% Confidence)\n` +
      `*Organic Solution:* ${result.treatment.organic[0] || 'Check App'}\n` +
      `*Prevention:* ${result.prevention[0] || 'Check App'}\n\n` +
      `Stay alert, save crops!`
    );
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
  };

  return (
    <div id="disease-diagnosis-panel" className="space-y-6">
      {/* Tab Selectors */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl max-w-md mx-auto border border-slate-200">
        <button
          id="diagnosis-tab-upload"
          onClick={() => { setActiveTab('upload'); setError(''); }}
          className={`flex-1 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition ${
            activeTab === 'upload' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Upload size={16} />
          {t.uploadLeaf}
        </button>
        <button
          id="diagnosis-tab-text"
          onClick={() => { setActiveTab('text'); setError(''); }}
          className={`flex-1 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition ${
            activeTab === 'text' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Keyboard size={16} />
          {t.typeSymptoms}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm font-semibold flex items-start gap-2.5">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Block */}
      {!result && (
        <form onSubmit={handleSymptomSubmit} className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          {activeTab === 'upload' ? (
            <div className="space-y-4">
              <div
                id="dropzone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition ${
                  isDragOver 
                    ? 'border-emerald-500 bg-emerald-50/40' 
                    : previewUrl 
                      ? 'border-emerald-300 bg-emerald-50/10' 
                      : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="text-center space-y-3">
                    <img
                      src={previewUrl}
                      alt="Crop disease preview"
                      className="max-h-64 rounded-xl mx-auto border border-emerald-100 shadow-md object-contain"
                    />
                    <p className="text-xs text-slate-500 font-medium">
                      Selected: {selectedFile?.name} ({(selectedFile!.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset();
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-xs transition"
                    >
                      Remove Leaf Image
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                      <Upload size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-700">Drag & drop plant leaf picture here</p>
                      <p className="text-xs text-slate-400">or click to choose file from computer / mobile camera</p>
                    </div>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Supports JPG, JPEG, PNG</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700">{t.typeSymptoms}</label>
              <textarea
                id="symptoms-textarea"
                rows={4}
                value={textSymptoms}
                onChange={(e) => setTextSymptoms(e.target.value)}
                placeholder={t.enterSymptoms}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium text-slate-700 shadow-inner"
              ></textarea>
              <p className="text-xs text-slate-400 italic">
                Tips: Describe color changes (yellow spots, white dust), shape deformities (curled leaves, wilting stems), or bug sightings for best diagnosis accuracy.
              </p>
            </div>
          )}

          <button
            id="diagnosis-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
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
                <Sparkles size={18} />
                <span>{t.submit}</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Structured Advice Results */}
      {result && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Fallback Warning Banner */}
          {result.isFallback && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-amber-800 font-medium shadow-sm">
              <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">Live AI Plant Diagnosis is Offline</p>
                <p className="mt-1">
                  The shared Gemini API free-tier quota is currently exhausted or denied. We have activated our high-fidelity agricultural pathologist simulator to provide safe, standard recommendations.
                </p>
                <p className="mt-1.5 font-semibold text-slate-500 bg-amber-100/40 border border-amber-200/40 p-1.5 rounded font-mono text-[10px] break-all">
                  API Status: {result.fallbackReason}
                </p>
                <p className="mt-1.5 text-slate-600 font-normal">
                  To restore live custom image analysis and smart pathology, please configure your own <strong className="font-mono bg-amber-100 px-1 rounded text-slate-700">GEMINI_API_KEY</strong> in the AI Studio <strong>Settings &gt; Secrets</strong> panel.
                </p>
              </div>
            </div>
          )}

          {/* Header Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shrink-0">
                <Sprout size={28} />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Diagnosed Disease</span>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{result.diseaseName}</h3>
              </div>
            </div>
            
            <div className="flex items-center gap-6 self-stretch md:self-auto border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
              <div className="text-center md:text-right">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest block">AI Confidence</span>
                <div className="flex items-center gap-1.5 mt-1 justify-center md:justify-end">
                  <span className="text-2xl font-black text-emerald-600">{result.confidence}%</span>
                  <div className="w-10 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${result.confidence}%` }}></div>
                  </div>
                </div>
              </div>
              <button
                id="diagnose-retest-btn"
                onClick={handleReset}
                className="px-4 py-2 text-xs border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 transition"
              >
                Analyze New Leaf
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Symptoms & Causes */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2 mb-3">
                  <Sprout size={18} className="text-emerald-500" /> Symptoms Detected
                </h4>
                <ul className="space-y-2">
                  {result.symptoms.map((sym, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-slate-600 font-medium">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{sym}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2 mb-3">
                  <AlertTriangle size={18} className="text-amber-500" /> Key Causes
                </h4>
                <ul className="space-y-2">
                  {result.causes.map((cause, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-slate-600 font-medium">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Treatment Card */}
            <div className="bg-gradient-to-b from-emerald-50/50 to-teal-50/30 border border-emerald-100 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b border-emerald-100 pb-2 mb-3">
                  <Heart size={18} className="text-emerald-600" /> {t.organicOptions}
                </h4>
                <div className="bg-emerald-600 text-white px-3 py-1 text-xs font-bold rounded-full inline-block mb-2">
                  Highly Recommended
                </div>
                <ul className="space-y-2">
                  {result.treatment.organic.map((org, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-emerald-800 font-semibold">
                      <span className="text-emerald-600">🌿</span>
                      <span>{org}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b border-emerald-100 pb-2 mb-3">
                  <Sprout size={18} className="text-teal-700" /> {t.pesticides} / Chemical
                </h4>
                <ul className="space-y-2">
                  {result.treatment.chemical.map((chem, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-slate-700 font-medium">
                      <span className="text-teal-600 font-bold">⚡</span>
                      <span>{chem}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Prevention & Safety Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2 mb-3">
                <Check size={18} className="text-emerald-500" /> {t.preventionTips}
              </h4>
              <ul className="space-y-2.5">
                {result.prevention.map((prev, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-slate-600 font-medium">
                    <ArrowRight size={14} className="text-emerald-500 shrink-0 mt-1" />
                    <span>{prev}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6 shadow-sm">
              <h4 className="font-bold text-rose-800 flex items-center gap-2 border-b border-rose-100 pb-2 mb-3">
                <ShieldAlert size={18} className="text-rose-600" /> {t.safetyMeasures}
              </h4>
              <ul className="space-y-2.5">
                {result.safetyPrecautions.map((safe, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-rose-700 font-medium">
                    <span className="text-rose-500 shrink-0 mt-0.5">⚠️</span>
                    <span>{safe}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Print / Export Actions */}
          <div className="flex gap-3 justify-end">
            <button
              id="diagnose-download-advice"
              onClick={handleDownloadAdvice}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold shadow hover:bg-slate-700 transition"
            >
              <FileDown size={16} />
              Download Advice
            </button>
            <button
              id="diagnose-share-whatsapp"
              onClick={handleShareWhatsApp}
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
