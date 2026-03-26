'use client';

import React from 'react';
import { CheckCircle2, XCircle, Info, Trophy } from 'lucide-react';

interface ToastProps {
  show: boolean;
  msg: string;
  type?: 'success' | 'error' | 'info' | 'achievement';
  title?: string;
}

export default function Toast({ show, msg, type = 'info', title }: ToastProps) {
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'achievement': return <Trophy className="w-4 h-4 text-yellow-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getAccent = () => {
    switch (type) {
      case 'success': return 'border-l-green-500 bg-green-500/10';
      case 'error': return 'border-l-red-500 bg-red-500/10';
      case 'achievement': return 'border-l-yellow-500 bg-yellow-500/10 shadow-[0_0_30px_rgba(234,179,8,0.2)]';
      default: return 'border-l-blue-500 bg-blue-500/10';
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'success': return 'Success';
      case 'error': return 'Attention';
      default: return 'Info';
    }
  };

  return (
    <div className={`fixed bottom-8 right-8 z-[150] transition-all duration-500 transform ${show ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95 pointer-events-none'}`}>
      <div className={`glass px-6 py-4 rounded-3xl border-l-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 border-white/10 ${getAccent()}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-white/10 ${
          type === 'success' ? 'bg-green-500/20' : type === 'error' ? 'bg-red-500/20' : 'bg-blue-500/20'
        }`}>
          {getIcon()}
        </div>
        <div className="pr-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{title || getDefaultTitle()}</div>
          <div className="text-sm font-bold text-white tracking-tight">{msg}</div>
        </div>
      </div>
    </div>
  );
}
