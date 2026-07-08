/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LanguageCode, translations, UserProfile } from '../types';
import { 
  Sprout, 
  Droplet, 
  ShieldAlert, 
  Volume2, 
  MessageSquareCode, 
  MapPin, 
  Activity, 
  Compass, 
  Heart, 
  User, 
  Send 
} from 'lucide-react';
import WeatherCard from './WeatherCard';

interface DashboardProps {
  currentLang: LanguageCode;
  currentUser: UserProfile | null;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ currentLang, currentUser, onNavigate }: DashboardProps) {
  const t = translations[currentLang];

  // Simulated dashboard widgets state
  const alerts = [
    { id: 1, type: 'critical', msg: 'Yellow Rust outbreak reported in neighbouring crop blocks. Apply preventive bio-pesticides.' },
    { id: 2, type: 'info', msg: 'Government seeds subsidy portal is open for registration till next Friday.' }
  ];

  const recentActivities = [
    { id: 1, action: 'Soil health analysis requested', date: 'Today' },
    { id: 2, action: 'Activated weekly Paddy advisory SMS', date: 'Yesterday' }
  ];

  return (
    <div id="farmer-dashboard" className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-brand-primary flex items-center gap-2">
            👋 {t.welcome}, {currentUser?.name || 'Farmer'}
          </h2>
          <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin size={12} className="text-brand-accent" /> 
            {currentUser?.district ? `${currentUser.district}, ${currentUser.state}` : 'Coimbatore District, Tamil Nadu'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            id="dash-voice-btn"
            onClick={() => onNavigate('voice')}
            className="px-4 py-2 bg-brand-accent/10 text-brand-primary hover:bg-brand-accent/20 border border-brand-accent/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Volume2 size={14} className="text-brand-primary" /> Quick Talk
          </button>
          <button
            id="dash-edit-profile-btn"
            onClick={() => onNavigate('profile')}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <User size={14} /> My Profile
          </button>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Weather Dashboard */}
        <div className="space-y-6 lg:col-span-1">
          <WeatherCard currentLang={currentLang} />
          
          {/* Soil Quick Stats Widget styled like the exact gold accent Soil Health Index card */}
          <div className="bg-brand-accent text-white rounded-[32px] p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-80 mb-4">{t.soilHealthScore}</h3>
              <div className="flex items-end justify-between">
                <span className="text-5xl font-black">84%</span>
                <div className="text-right">
                  <div className="text-xs font-medium">pH: 6.8 (Optimal)</div>
                  <div className="text-xs font-medium">NPK: Balanced</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 text-xs italic">
                Recommendation: Apply Organic Compost
              </div>
            </div>
            <button
              id="dash-soil-btn"
              onClick={() => onNavigate('soil')}
              className="w-full text-center py-2.5 bg-white hover:bg-white/95 rounded-xl text-xs font-extrabold text-brand-primary transition cursor-pointer mt-4 shadow"
            >
              Update Soil Report
            </button>
          </div>
        </div>

        {/* Right columns: Active Crop alerts & Advisor Quick launch */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Crop Alerts Panel */}
          <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-brand-primary flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldAlert size={18} className="text-rose-500 animate-pulse" />
              {t.cropAlerts}
            </h3>

            <div className="space-y-3.5">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    alert.type === 'critical' 
                      ? 'bg-rose-50/50 border-rose-100 text-rose-800' 
                      : 'bg-emerald-50/40 border-emerald-100 text-emerald-800'
                  }`}
                >
                  <span className="text-lg shrink-0 mt-0.5">
                    {alert.type === 'critical' ? '⚠️' : '📢'}
                  </span>
                  <p className="text-xs font-semibold leading-relaxed">
                    {alert.msg}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bento Action Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Advisor Card */}
            <div 
              onClick={() => onNavigate('chat')}
              className="bg-white border border-slate-200/60 rounded-[24px] p-6 shadow-sm hover:shadow-md hover:border-brand-primary/30 transition duration-200 cursor-pointer flex flex-col justify-between h-[160px] group"
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-brand-primary text-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition">
                  <MessageSquareCode size={20} />
                </div>
                <span className="text-[10px] text-brand-primary font-bold uppercase tracking-wider bg-brand-primary/10 px-2 py-0.5 rounded-full">AI BOT</span>
              </div>
              <div>
                <h4 className="text-base font-extrabold text-brand-primary">{t.askAi}</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Instant chat with agricultural experts about crop issues.</p>
              </div>
            </div>

            {/* Disease Diagnosis Card */}
            <div 
              onClick={() => onNavigate('diagnosis')}
              className="bg-white border border-slate-200/60 rounded-[24px] p-6 shadow-sm hover:shadow-md hover:border-brand-secondary/30 transition duration-200 cursor-pointer flex flex-col justify-between h-[160px] group"
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-brand-secondary text-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition">
                  <Sprout size={20} />
                </div>
                <span className="text-[10px] text-brand-secondary font-bold uppercase tracking-wider bg-brand-secondary/10 px-2 py-0.5 rounded-full">PATHOLOGY</span>
              </div>
              <div>
                <h4 className="text-base font-extrabold text-brand-primary">{t.detectDisease}</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Diagnose plant diseases from photographs or typed symptoms.</p>
              </div>
            </div>

            {/* Crop Recommendation Card */}
            <div 
              onClick={() => onNavigate('crop-rec')}
              className="bg-white border border-slate-200/60 rounded-[24px] p-6 shadow-sm hover:shadow-md hover:border-brand-accent/30 transition duration-200 cursor-pointer flex flex-col justify-between h-[160px] group"
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-brand-accent text-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition">
                  <Compass size={20} />
                </div>
                <span className="text-[10px] text-brand-accent font-bold uppercase tracking-wider bg-brand-accent/10 px-2 py-0.5 rounded-full">SUGGESTION</span>
              </div>
              <div>
                <h4 className="text-base font-extrabold text-brand-primary">{t.cropRecBtn}</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Get expert crop guidelines matching your soil and region.</p>
              </div>
            </div>

            {/* SMS Advisory Card */}
            <div 
              onClick={() => onNavigate('sms')}
              className="bg-white border border-slate-200/60 rounded-[24px] p-6 shadow-sm hover:shadow-md hover:border-teal-700/30 transition duration-200 cursor-pointer flex flex-col justify-between h-[160px] group"
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-teal-700 text-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition">
                  <Activity size={20} />
                </div>
                <span className="text-[10px] text-teal-800 font-bold uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded-full">SMS</span>
              </div>
              <div>
                <h4 className="text-base font-extrabold text-brand-primary">{t.smsAdvisory}</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Register mobile number for offline regional SMS alerts.</p>
              </div>
            </div>
          </div>

          {/* Recent Activity List */}
          <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-brand-primary flex items-center gap-2 border-b border-slate-100 pb-3">
              <Activity size={18} className="text-brand-accent" />
              Recent Actions & Advisories
            </h3>
            <div className="space-y-3">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex justify-between items-center text-xs font-semibold py-2.5 border-b border-slate-100 last:border-b-0">
                  <span className="text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-brand-accent rounded-full"></span>
                    {act.action}
                  </span>
                  <span className="text-slate-500 font-extrabold">{act.date}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
