/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LanguageCode, translations } from '../types';
import { MessageSquare, BellRing, Phone, ShieldCheck, Cpu, Code, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface SMSAdvisoryProps {
  currentLang: LanguageCode;
}

export default function SMSAdvisory({ currentLang }: SMSAdvisoryProps) {
  const t = translations[currentLang];
  const [mobile, setMobile] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('Paddy (Rice)');
  const [prefLang, setPrefLang] = useState<LanguageCode>(currentLang);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('weekly');
  
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulatedSMS, setSimulatedSMS] = useState<string | null>(null);
  const [smsFallback, setSmsFallback] = useState<boolean>(false);
  const [error, setError] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/sms-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: mobile,
          crop: selectedCrop,
          language: prefLang,
          frequency
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to activate SMS subscription.');
      }

      setSubscribed(true);
    } catch (err: any) {
      setError(err.message || 'SMS registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const triggerSMSSimulation = async () => {
    if (!mobile) {
      setError('Please enter your mobile number above to simulate an advisory SMS.');
      return;
    }
    setError('');
    setSimulationLoading(true);
    setSimulatedSMS(null);

    try {
      const res = await fetch('/api/sms-send-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: mobile,
          crop: selectedCrop,
          language: prefLang
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }

      setSimulatedSMS(data.smsText);
      setSmsFallback(!!data.isFallback);
    } catch (err: any) {
      setError(err.message || 'SMS simulation failed.');
    } finally {
      setSimulationLoading(false);
    }
  };

  return (
    <div id="sms-advisory-panel" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Registration & Simulation Form */}
      <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="text-emerald-500" />
            {t.smsAdvisory} Activation
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Receive personalized farming alerts, weather warnings, and organic pesticide recommendations directly on your phone.
          </p>
        </div>

        {subscribed ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-emerald-800">SMS Advisory Activated Successfully!</h4>
              <p className="text-xs text-emerald-600 font-semibold">Tips for "{selectedCrop}" will be sent {frequency} to +91 {mobile} in {prefLang === 'ta' ? 'Tamil' : prefLang === 'hi' ? 'Hindi' : prefLang === 'te' ? 'Telugu' : prefLang === 'kn' ? 'Kannada' : prefLang === 'ml' ? 'Malayalam' : 'English'}.</p>
            </div>
            
            <div className="border-t border-emerald-200/50 pt-4 flex flex-col items-center gap-2">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Demo Simulation Console</p>
              <button
                id="sms-simulate-instant-btn"
                onClick={triggerSMSSimulation}
                disabled={simulationLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow"
              >
                {simulationLoading ? 'Generating Sim SMS...' : 'Test Simulate SMS Now'} <Send size={12} />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">Mobile Number</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-sm font-bold text-slate-400">+91</span>
                <input
                  id="sms-mobile-input"
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder={t.smsPlaceholder}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">Farming Crop</label>
                <select
                  id="sms-crop-select"
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
                >
                  <option value="Paddy (Rice)">Paddy (Rice / धान)</option>
                  <option value="Wheat">Wheat (गेंहू)</option>
                  <option value="Cotton">Cotton (कपास / பருத்தி)</option>
                  <option value="Sugarcane">Sugarcane (गन्ना / கரும்பு)</option>
                  <option value="Tomato">Tomato (टमाटर / തക്കാളി)</option>
                  <option value="Maize">Maize (मक्का)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">Preferred Language</label>
                <select
                  id="sms-lang-select"
                  value={prefLang}
                  onChange={(e) => setPrefLang(e.target.value as LanguageCode)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
                >
                  <option value="en">English</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="ml">മലയാളം (Malayalam)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 block mb-1.5">Alert Frequency</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl font-medium text-xs">
                  <input
                    type="radio"
                    name="frequency"
                    checked={frequency === 'weekly'}
                    onChange={() => setFrequency('weekly')}
                    className="accent-emerald-600"
                  />
                  Weekly Tips (Recommended)
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl font-medium text-xs">
                  <input
                    type="radio"
                    name="frequency"
                    checked={frequency === 'daily'}
                    onChange={() => setFrequency('daily')}
                    className="accent-emerald-600"
                  />
                  Daily Crop Alerts
                </label>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              id="sms-subscribe-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-600/10 transition flex items-center justify-center gap-2"
            >
              <BellRing size={16} />
              <span>{t.subscribeSms}</span>
            </button>
          </form>
        )}

        {/* Live Simulator View */}
        {simulatedSMS && (
          <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 space-y-4">
            {smsFallback && (
              <div className="bg-amber-950/40 border border-amber-900/50 p-3.5 rounded-xl text-xs leading-relaxed text-amber-200">
                ⚠️ <strong>SMS Advisory Live Generation is Offline</strong>. Due to Gemini free-tier quota limits, we simulated a standard agronomic SMS tip from our offline database. Configure your own <code>GEMINI_API_KEY</code> under Secrets to restore real-time customized alerts.
              </div>
            )}
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                <Cpu size={12} className="animate-spin" /> Simulated GSM Phone Ingress
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Carrier: Fast2SMS/Twilio</span>
            </div>

            {/* Handset mockup */}
            <div className="max-w-xs mx-auto bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-inner space-y-2">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans px-1">
                <span>💬 KishanAlert</span>
                <span>Just Now</span>
              </div>
              <div className="bg-slate-800 text-slate-100 p-3 rounded-lg text-xs leading-relaxed font-semibold">
                {simulatedSMS}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              * This SMS was dynamically generated in <strong>{prefLang.toUpperCase()}</strong> using Gemini for your crop: <strong>{selectedCrop}</strong>.
            </p>
          </div>
        )}
      </div>

      {/* Integration Code Placeholder */}
      <div className="bg-slate-900 text-emerald-200 rounded-2xl p-6 shadow-sm border border-slate-800 space-y-4 font-mono text-xs flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-white border-b border-slate-800 pb-2">
            <Code size={16} className="text-emerald-400" />
            <span className="font-bold font-sans">API Webhook Readiness</span>
          </div>

          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
            Our codebase includes full parameters mapping and handles backend requests. To send actual SMS using Twilio or Fast2SMS, configure your SDK in <code>server.ts</code>:
          </p>

          <pre className="p-3 bg-slate-950 rounded-lg text-[10px] overflow-x-auto text-emerald-300">
{`// Twilio Integration
const client = new Twilio(
  TWILIO_SID, 
  TWILIO_AUTH_TOKEN
);

await client.messages.create({
  body: smsText,
  to: \`+91\${mobileNumber}\`,
  from: 'KISHAN'
});`}
          </pre>

          <pre className="p-3 bg-slate-950 rounded-lg text-[10px] overflow-x-auto text-emerald-300">
{`// Fast2SMS API Hook
const url = 'https://www.fast2sms.com/dev/bulkV2';
await fetch(url, {
  method: 'POST',
  headers: { 'authorization': API_KEY },
  body: JSON.stringify({
    variables_values: smsText,
    numbers: mobileNumber
  })
});`}
          </pre>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2 text-slate-400 font-sans">
          <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
          <span className="text-[10px]">Securely pre-mapped in our production build configuration.</span>
        </div>
      </div>
    </div>
  );
}
