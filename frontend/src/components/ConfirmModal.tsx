'use client';

import { X, AlertTriangle, ArrowRight, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRejoin: () => void;
  title: string;
  message: string;
  roomId?: string;
}

export default function ConfirmModal({ show, onClose, onConfirm, onRejoin, title, message, roomId }: ConfirmModalProps) {
  const { t } = useTranslation();

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md animate-in fade-in duration-500"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg glass rounded-[40px] border border-white/10 shadow-3xl overflow-hidden animate-in zoom-in-95 fade-in duration-500">
        {/* Top Accent Gradient */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

        <div className="p-8 sm:p-12">
          {/* Header Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center relative group">
              <div className="absolute inset-0 bg-amber-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <AlertTriangle className="w-10 h-10 text-amber-500 relative z-10" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-4 mb-10">
            <h2 className="text-3xl font-black tracking-tight text-white">{title}</h2>
            <p className="text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
              {message}
            </p>
            {roomId && (
               <div className="inline-block px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                 {t('dashboard.room_code')}: {roomId}
               </div>
            )}
          </div>

          {/* Actions - Vertical Stack for Premium Feel */}
          <div className="flex flex-col gap-4">
            {/* Rejoin Option - Primary */}
            <button
              onClick={onRejoin}
              className="group relative w-full bg-white text-black font-black py-5 rounded-[24px] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 overflow-hidden"
            >
              <ArrowRight className="w-5 h-5 fill-current" />
              <span className="text-lg tracking-tight uppercase">{t('dashboard.return_to_arena')}</span>
            </button>

            {/* Start New Option - Warning style */}
            <button
              onClick={onConfirm}
              className="w-full bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400 font-bold py-5 rounded-[24px] border border-white/5 hover:border-red-500/20 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
            >
              <Play className="w-4 h-4 fill-current opacity-50" />
              {t('dashboard.create_game')} ({t('dashboard.terminate')})
            </button>

            {/* Cancel - Tertiary */}
            <button
              onClick={onClose}
              className="w-full py-4 text-slate-600 hover:text-white font-bold text-xs uppercase tracking-[0.3em] transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 transition-all group"
        >
          <X className="w-5 h-5 text-slate-500 group-hover:text-white" />
        </button>
      </div>
    </div>
  );
}
