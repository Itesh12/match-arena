'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '@/config';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser, setToken } = useGameStore();
  const router = useRouter();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      router.push('/');
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

      <div className="relative z-10 max-w-md w-full glass rounded-[40px] p-10 shadow-2xl border-white/5 animate-float">
        <div className="text-center mb-10">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            {t('auth.welcome_back')}
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">{t('auth.login_title')}</h1>
          <p className="text-slate-500 font-medium text-sm">{t('auth.login_subtitle')}</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl mb-6 text-xs font-bold animate-in fade-in slide-in-from-top-2">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('auth.password_label')}</label>
            <div className="relative group/input">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              t('auth.sign_in')
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link href="/forgot-password" title={t('auth.forgot_password_link')} className="text-xs font-bold text-slate-500 hover:text-blue-400 transition-colors">
            {t('auth.forgot_password_link')}
          </Link>
        </div>

        <p className="mt-10 text-center text-slate-500 font-medium text-sm">
          {t('auth.no_account')}{' '}
          <Link href="/signup" className="text-blue-400 font-black hover:text-blue-300 transition-colors">
            {t('auth.create_one')}
          </Link>
        </p>
      </div>
    </div>
  );
}
