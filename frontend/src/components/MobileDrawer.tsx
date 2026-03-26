'use client';

import React from 'react';
import { X, User, Shield, Coins, Globe, Users, History, LogOut, ChevronRight, Home, ShoppingBag, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onLogout: () => void;
  onChangeView: (view: any) => void;
  currentView: string;
  rank: any;
  languages: { code: string; label: string }[];
  currentLang: string;
  onLanguageChange: (code: string) => void;
}

export default function MobileDrawer({
  isOpen,
  onClose,
  user,
  onLogout,
  onChangeView,
  currentView,
  rank,
  languages,
  currentLang,
  onLanguageChange
}: MobileDrawerProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="absolute top-0 left-0 bottom-0 w-[85%] max-w-sm bg-[#0a0f1d] border-r border-white/5 shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white font-black text-base">{user.username[0].toUpperCase()}</span>
             </div>
             <div>
                <div className="font-black text-lg text-white leading-none mb-1">{user.username}</div>
                <div className="flex items-center gap-1.5">
                   <Shield className="w-3 h-3 text-blue-400" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-blue-400/80">{rank.name}</span>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 glass rounded-xl text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
            <div className="px-2 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Navigation</div>
            
            <button 
                onClick={() => { onChangeView('lobby'); onClose(); }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${currentView === 'lobby' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
            >
                <div className="flex items-center gap-3">
                    <Home className="w-5 h-5" />
                    <span className="font-bold">Home</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <button 
                onClick={() => { onChangeView('achievements'); onClose(); }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${currentView === 'achievements' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
            >
                <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5" />
                    <span className="font-bold">Achievements</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <button 
                onClick={() => { onChangeView('market'); onClose(); }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${currentView === 'market' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
            >
                <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5" />
                    <span className="font-bold">Marketplace</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <button 
                onClick={() => { onChangeView('history'); onClose(); }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${currentView === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
            >
                <div className="flex items-center gap-3">
                    <History className="w-5 h-5" />
                    <span className="font-bold">Match History</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <button 
                onClick={() => { onChangeView('social'); onClose(); }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${currentView === 'social' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
            >
                <div className="flex items-center gap-3">
                    <Users className="w-5 h-5" />
                    <span className="font-bold">Friends & Social</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
            </button>

            <div className="pt-6 px-2 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">System</div>

            <div className="p-4 glass rounded-[2rem] border border-white/5">
                <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span className="text-[11px] font-black text-white uppercase tracking-widest">Language</span>
                </div>
                <div className="flex gap-2">
                    {languages.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => onLanguageChange(lang.code)}
                            className={`flex-1 py-3 rounded-xl font-bold text-xs border transition-all ${currentLang === lang.code ? 'bg-blue-600/20 border-blue-500/50 text-white' : 'glass border-white/5 text-slate-500'}`}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between bg-yellow-500/10 text-yellow-500 p-4 rounded-2xl border border-yellow-500/20">
                <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    <span className="font-black">Your Balance</span>
                </div>
                <span className="text-xl font-black">{user.coins || 0}</span>
            </div>
            
            <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold transition-all hover:bg-red-500/20 active:scale-95"
            >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
            </button>
        </div>
      </div>
    </div>
  );
}
