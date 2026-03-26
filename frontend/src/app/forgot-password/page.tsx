'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '@/config';

export default function ForgotPassword() {
  const [username, setUsername] = useState('');
  const [resetKey, setResetKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, resetKey, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reset failed');

      setMessage('Password reset successful! Redirecting to login...');
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#020617] text-white p-4 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full animate-pulse-glow" style={{ animationDelay: '0s' }}></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 max-w-md w-full glass rounded-[40px] p-10 shadow-2xl border-white/5 animate-float text-center">
        <button 
          onClick={() => router.back()} 
          className="absolute left-8 top-8 glass glass-hover p-2 rounded-xl border-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="mb-10">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-xl shadow-blue-500/10">
            <KeyRound className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-black mb-2">{t('auth.forgot_title')}</h1>
          <p className="text-slate-500 text-sm font-medium">{t('auth.forgot_subtitle')}</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl mb-6 text-xs font-bold">
            ⚠️ {error}
          </div>
        )}
        
        {message && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-2xl mb-6 text-xs font-bold">
            ✓ {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('auth.username_label')}</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('auth.username_placeholder')}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all font-medium placeholder-white/5 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('admin.modals.security_key')}</label>
            <input
              type="text"
              required
              value={resetKey}
              onChange={(e) => setResetKey(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all font-black placeholder-white/5 text-lg text-blue-400 text-center tracking-widest"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('auth.confirm_password')}</label>
            <div className="relative group/input">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all font-medium placeholder-white/5 text-sm pr-14"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 transform active:scale-[0.97] transition-all flex items-center justify-center gap-3 text-lg"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              t('auth.reset_password_link')
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
