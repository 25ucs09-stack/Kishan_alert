/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { LanguageCode, translations, WeatherData } from '../types';
import { Sun, CloudRain, CloudLightning, Wind, Droplets, AlertTriangle, CloudSun } from 'lucide-react';

interface WeatherCardProps {
  currentLang: LanguageCode;
}

export default function WeatherCard({ currentLang }: WeatherCardProps) {
  const t = translations[currentLang];
  const [weather, setWeather] = useState<WeatherData>({
    temp: 31,
    condition: 'Partly Cloudy',
    humidity: 78,
    windSpeed: 14,
    location: 'Coimbatore, TN, India',
    forecast: [
      { day: 'Mon', temp: 32, condition: 'Sunny' },
      { day: 'Tue', temp: 30, condition: 'Cloudy' },
      { day: 'Wed', temp: 28, condition: 'Heavy Rain' },
      { day: 'Thu', temp: 29, condition: 'Lightning' },
      { day: 'Fri', temp: 31, condition: 'Partly Cloudy' }
    ]
  });

  const [simAlerts, setSimAlerts] = useState<string[]>([
    'Monsoon rain expected to intensify in the next 48 hours. Postpone open spraying of pesticides.',
    'High heat index warning: Irrigate paddy crops during early morning to avoid moisture stress.'
  ]);

  // Simulate seasonal variation
  useEffect(() => {
    const timer = setInterval(() => {
      setWeather(prev => ({
        ...prev,
        temp: Math.floor(Math.random() * (35 - 28 + 1) + 28),
        humidity: Math.floor(Math.random() * (85 - 70 + 1) + 70)
      }));
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div id="weather-dashboard-card" className="bg-gradient-to-br from-brand-primary to-brand-secondary text-white rounded-[32px] p-6 shadow-lg border border-brand-primary/20">
      <div className="flex justify-between items-start border-b border-white/10 pb-4">
        <div>
          <span className="text-xs text-emerald-100/75 font-bold uppercase tracking-widest">{t.weatherCard}</span>
          <h3 className="text-xl font-bold font-sans mt-0.5">{weather.location}</h3>
          <p className="text-xs text-emerald-100/70 font-semibold mt-1">Sowing Season: Southwest Monsoon</p>
        </div>
        <div className="flex items-center gap-1">
          <Sun className="text-amber-300 animate-[spin_10s_linear_infinite]" size={36} />
          <span className="text-3xl font-black">{weather.temp}°C</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
            <Droplets size={18} />
          </div>
          <div>
            <span className="text-[10px] text-emerald-100/70 font-semibold block uppercase tracking-wider">Relative Humidity</span>
            <span className="text-sm font-black">{weather.humidity}%</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
            <Wind size={18} />
          </div>
          <div>
            <span className="text-[10px] text-emerald-100/70 font-semibold block uppercase tracking-wider">Wind Velocity</span>
            <span className="text-sm font-black">{weather.windSpeed} km/h</span>
          </div>
        </div>
      </div>

      {/* 5-day Forecast */}
      <div className="pt-4 space-y-3">
        <span className="text-[10px] text-emerald-100/75 font-bold uppercase tracking-wider block">5-Day Agriculture Forecast</span>
        <div className="flex justify-between gap-1">
          {weather.forecast.map((fc, idx) => (
            <div key={idx} className="text-center p-2 rounded-xl bg-white/5 hover:bg-white/10 transition shrink-0 min-w-[52px]">
              <span className="text-[10px] font-bold block text-emerald-100/75 uppercase">{fc.day}</span>
              <span className="text-xs mt-1 block">
                {fc.condition === 'Sunny' ? '☀️' : fc.condition === 'Cloudy' ? '☁️' : fc.condition === 'Heavy Rain' ? '🌧️' : fc.condition === 'Lightning' ? '⛈️' : '⛅'}
              </span>
              <span className="text-xs font-bold block mt-1">{fc.temp}°C</span>
            </div>
          ))}
        </div>
      </div>

      {/* Crop Weather Alerts */}
      <div className="mt-5 p-4 bg-amber-500/10 border border-amber-400/20 rounded-2xl space-y-2">
        <div className="flex items-center gap-2 text-amber-200">
          <AlertTriangle size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Active Weather Warning</span>
        </div>
        <ul className="space-y-1.5 pl-5 list-disc text-xs text-amber-100/90 leading-normal font-medium">
          {simAlerts.map((alert, idx) => (
            <li key={idx}>{alert}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
