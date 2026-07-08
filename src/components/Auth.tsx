/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserProfile, LanguageCode, translations } from '../types';
import { User, Phone, Lock, MapPin, Globe, Compass, Landmark, Loader2, Key } from 'lucide-react';

interface AuthProps {
  currentUser: UserProfile | null;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
  onUpdateProfile: (updatedUser: UserProfile) => void;
  currentLang: LanguageCode;
}

export default function Auth({ currentUser, onLogin, onLogout, onUpdateProfile, currentLang }: AuthProps) {
  const t = translations[currentLang];
  const [isRegistering, setIsRegistering] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  
  // Login form state
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Registration form state
  const [regName, setRegName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regState, setRegState] = useState('');
  const [regDistrict, setRegDistrict] = useState('');
  const [regLang, setRegLang] = useState<LanguageCode>(currentLang);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editState, setEditState] = useState(currentUser?.state || '');
  const [editDistrict, setEditDistrict] = useState(currentUser?.district || '');
  const [editLang, setEditLang] = useState<LanguageCode>(currentUser?.preferredLanguage || currentLang);
  const [editCrop, setEditCrop] = useState(currentUser?.primaryCrop || '');
  const [editSize, setEditSize] = useState(currentUser?.farmSize || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginMobile || !loginPassword) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: loginMobile, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }
      onLogin(data.user);
      setSuccess('Logged in successfully!');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regMobile || !regPassword) {
      setError('Name, Mobile, and Password are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          mobile: regMobile,
          password: regPassword,
          state: regState,
          district: regDistrict,
          preferredLanguage: regLang
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }
      onLogin(data.user);
      setSuccess('Registration successful!');
      setIsRegistering(false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError('');
    setSuccess('');
    setLoading(true);

    const updatedUser: UserProfile = {
      ...currentUser,
      name: editName,
      state: editState,
      district: editDistrict,
      preferredLanguage: editLang,
      primaryCrop: editCrop,
      farmSize: editSize
    };

    // Optimistically update the UI/Local Storage
    onUpdateProfile(updatedUser);

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          name: editName,
          state: editState,
          district: editDistrict,
          preferredLanguage: editLang,
          primaryCrop: editCrop,
          farmSize: editSize
        })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onUpdateProfile(data.user);
      }
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      console.warn('API update failed, profile updated locally:', err);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('Password recovery code simulated! In production, a verification SMS will be sent.');
  };

  if (currentUser) {
    return (
      <div id="auth-profile-container" className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-md border border-emerald-100">
        <div className="flex flex-col items-center border-b border-emerald-50 pb-6 mb-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 border border-emerald-200">
            <User size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">{currentUser.name}</h2>
          <p className="text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <Phone size={14} /> {currentUser.mobile}
          </p>
        </div>

        {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg font-medium">{success}</div>}
        {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-lg font-medium">{error}</div>}

        {!isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">{t.state}</span>
                <span className="text-slate-700 font-semibold flex items-center gap-2 mt-1">
                  <MapPin size={16} className="text-emerald-500" /> {currentUser.state || 'Not set'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">{t.district}</span>
                <span className="text-slate-700 font-semibold flex items-center gap-2 mt-1">
                  <MapPin size={16} className="text-emerald-500" /> {currentUser.district || 'Not set'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Preferred Language</span>
                <span className="text-slate-700 font-semibold flex items-center gap-2 mt-1">
                  <Globe size={16} className="text-emerald-500" /> 
                  {currentUser.preferredLanguage === 'ta' ? 'தமிழ் (Tamil)' :
                   currentUser.preferredLanguage === 'hi' ? 'हिन्दी (Hindi)' :
                   currentUser.preferredLanguage === 'te' ? 'తెలుగు (Telugu)' :
                   currentUser.preferredLanguage === 'kn' ? 'ಕನ್ನಡ (Kannada)' :
                   currentUser.preferredLanguage === 'ml' ? 'മലയാളം (Malayalam)' : 'English'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Primary Crop</span>
                <span className="text-slate-700 font-semibold flex items-center gap-2 mt-1">
                  <Compass size={16} className="text-emerald-500" /> {currentUser.primaryCrop || 'Not configured'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
              <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Farm Size</span>
              <p className="text-slate-700 font-semibold mt-1">
                {currentUser.farmSize ? `${currentUser.farmSize} Acres` : 'Not specified'}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                id="edit-profile-btn"
                onClick={() => {
                  setEditName(currentUser.name);
                  setEditState(currentUser.state);
                  setEditDistrict(currentUser.district);
                  setEditLang(currentUser.preferredLanguage);
                  setEditCrop(currentUser.primaryCrop || '');
                  setEditSize(currentUser.farmSize || '');
                  setIsEditing(true);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition"
              >
                Edit Profile
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Full Name</label>
              <input
                id="edit-profile-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">{t.state}</label>
                <input
                  id="edit-profile-state"
                  type="text"
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">{t.district}</label>
                <input
                  id="edit-profile-district"
                  type="text"
                  value={editDistrict}
                  onChange={(e) => setEditDistrict(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Preferred Language</label>
                <select
                  id="edit-profile-lang"
                  value={editLang}
                  onChange={(e) => setEditLang(e.target.value as LanguageCode)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="en">English</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="ml">മലയാളം (Malayalam)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Primary Crop</label>
                <input
                  id="edit-profile-crop"
                  type="text"
                  value={editCrop}
                  onChange={(e) => setEditCrop(e.target.value)}
                  placeholder="e.g. Paddy, Cotton, Sugarcane"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Farm Size (Acres)</label>
              <input
                id="edit-profile-size"
                type="text"
                value={editSize}
                onChange={(e) => setEditSize(e.target.value)}
                placeholder="e.g. 2.5"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                id="edit-profile-save"
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition"
              >
                {loading && <Loader2 size={16} className="animate-spin" />} Save Changes
              </button>
              <button
                id="edit-profile-cancel"
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div id="auth-box" className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-xl border border-emerald-100">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">
          {forgotPassword ? 'Reset Password' : isRegistering ? t.register : t.login}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {forgotPassword ? 'Enter your details to verify' : isRegistering ? 'Join our community of smart farmers' : 'Securely access your farm records'}
        </p>
      </div>

      {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg font-medium">{success}</div>}
      {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-lg font-medium">{error}</div>}

      {forgotPassword ? (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Registered Mobile Number</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                id="forgot-mobile"
                type="tel"
                placeholder="10 digit number"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <button
            id="forgot-submit-btn"
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition"
          >
            Get OTP Advisory Code
          </button>
          <div className="text-center">
            <button
              id="forgot-back-btn"
              type="button"
              onClick={() => setForgotPassword(false)}
              className="text-xs text-emerald-600 font-semibold hover:underline"
            >
              Back to Login
            </button>
          </div>
        </form>
      ) : isRegistering ? (
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Farmer Name</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                id="reg-name"
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Enter Full Name"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Mobile Number</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                id="reg-mobile"
                type="tel"
                required
                pattern="[0-9]{10}"
                value={regMobile}
                onChange={(e) => setRegMobile(e.target.value)}
                placeholder="10 digit mobile number"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                id="reg-password"
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Choose safe password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">{t.state}</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  id="reg-state"
                  type="text"
                  value={regState}
                  onChange={(e) => setRegState(e.target.value)}
                  placeholder="State"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">{t.district}</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  id="reg-district"
                  type="text"
                  value={regDistrict}
                  onChange={(e) => setRegDistrict(e.target.value)}
                  placeholder="District"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Preferred Language</label>
            <div className="relative">
              <Globe size={18} className="absolute left-3 top-3 text-slate-400" />
              <select
                id="reg-lang"
                value={regLang}
                onChange={(e) => setRegLang(e.target.value as LanguageCode)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
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

          <button
            id="reg-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition"
          >
            {loading && <Loader2 size={16} className="animate-spin" />} {t.register}
          </button>

          <p className="text-center text-xs text-slate-500 mt-4">
            Already registered?{' '}
            <button
              id="switch-to-login-btn"
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError('');
              }}
              className="text-emerald-600 font-bold hover:underline"
            >
              Login Here
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">Mobile Number</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                id="login-mobile"
                type="tel"
                required
                pattern="[0-9]{10}"
                value={loginMobile}
                onChange={(e) => setLoginMobile(e.target.value)}
                placeholder="10 digit mobile number"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-semibold uppercase text-slate-500">Password</label>
              <button
                id="forgot-pw-btn"
                type="button"
                onClick={() => {
                  setForgotPassword(true);
                  setError('');
                }}
                className="text-xs text-emerald-600 font-semibold hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                id="login-password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition"
          >
            {loading && <Loader2 size={16} className="animate-spin" />} {t.login}
          </button>

          <p className="text-center text-xs text-slate-500 mt-4">
            New to Kishan Alert?{' '}
            <button
              id="switch-to-register-btn"
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setError('');
              }}
              className="text-emerald-600 font-bold hover:underline"
            >
              Create Account
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
