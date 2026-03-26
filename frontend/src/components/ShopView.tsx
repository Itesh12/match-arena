'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { 
  ShoppingBag, 
  Coins, 
  Shield, 
  Crown, 
  Zap, 
  Flame, 
  CheckCircle2, 
  Lock,
  Package,
  Book,
  AlertCircle
} from 'lucide-react';
import { API_URL } from '@/config';
import { useTranslation } from 'react-i18next';

const iconMap = {
  Shield: Shield,
  Crown: Crown,
  Zap: Zap,
  Flame: Flame,
  Package: Package,
  Book: Book
};

export default function ShopView() {
  const { t } = useTranslation();
  const { user, token, fetchStats, showToast } = useGameStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_URL}/shop`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch shop items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (itemKey: string, price: number) => {
    if (!user || user.coins! < price) {
      showToast(t('shop.insufficient_coins'), 'error');
      return;
    }

    setPurchasing(itemKey);
    try {
      const res = await fetch(`${API_URL}/shop/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemKey })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(t('shop.purchase_success'), 'success', 'Item Unlocked!');
        fetchStats(); // Update coins and inventory in global store
      } else {
        showToast(data.message || t('shop.purchase_failed'), 'error');
      }
    } catch (err) {
      showToast(t('shop.server_error'), 'error');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <ShoppingBag className="w-12 h-12 text-slate-700 mb-4" />
        <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Marketplace...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Shop Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-6 rounded-[32px] border border-white/10">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-blue-400" />
            {t('shop.title') || 'Arena Marketplace'}
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Spend your coins on premium upgrades
          </p>
        </div>
        <div className="flex items-center gap-2 bg-yellow-500/20 text-yellow-500 px-6 py-3 rounded-2xl border border-yellow-500/30">
          <Coins className="w-5 h-5" />
          <span className="text-xl font-black">{user?.coins || 0}</span>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap] || Package;
          const isOwned = user?.inventory?.includes(item.key);
          const canAfford = user?.coins! >= item.price;
          const isPurchasing = purchasing === item.key;

          return (
            <div 
              key={item.key} 
              className={`glass group relative overflow-hidden rounded-[40px] border transition-all duration-500 ${isOwned ? 'border-green-500/20' : 'border-white/5 hover:border-blue-500/30'}`}
            >
              {/* Rarity Glow */}
              <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none transition-all duration-700 group-hover:opacity-40 
                ${item.rarity === 'legendary' ? 'bg-orange-500' : 
                  item.rarity === 'epic' ? 'bg-purple-500' : 
                  item.rarity === 'rare' ? 'bg-blue-500' : 'bg-slate-500'}`} 
              />

              <div className="p-8 relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className={`p-4 rounded-3xl border transition-all duration-500 group-hover:scale-110 
                    ${item.rarity === 'legendary' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 
                      item.rarity === 'epic' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 
                      item.rarity === 'rare' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-slate-400'}`}
                  >
                    <Icon className="w-8 h-8" />
                  </div>
                  {isOwned ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Owned</span>
                    </div>
                  ) : (
                    <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border 
                      ${item.rarity === 'legendary' ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' : 
                        item.rarity === 'epic' ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' : 
                        item.rarity === 'rare' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 'text-slate-500 border-white/5 bg-white/5'}`}
                    >
                      {item.rarity}
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-black text-white mb-2">{item.name}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.description}</p>
                </div>

                <div className="flex items-center gap-4">
                  {!isOwned ? (
                    <button 
                      onClick={() => handlePurchase(item.key, item.price)}
                      disabled={isPurchasing || !canAfford}
                      className={`flex-1 h-14 rounded-2xl font-black uppercase tracking-wider text-sm flex items-center justify-center gap-3 transition-all active:scale-95 
                        ${canAfford 
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20' 
                          : 'bg-white/5 border border-white/5 text-slate-600 cursor-not-allowed'}`}
                    >
                      {isPurchasing ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Coins className="w-4 h-4" />
                          {item.price}
                        </>
                      )}
                    </button>
                  ) : (
                    <button 
                      className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-wider text-sm flex items-center justify-center gap-3 cursor-default"
                    >
                      Equip Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Card */}
      <div className="bg-blue-600/5 border border-blue-500/10 p-8 rounded-[40px] flex items-center gap-6">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
          <AlertCircle className="w-6 h-6 text-blue-400" />
        </div>
        <div className="text-sm text-slate-500 font-medium">
          <span className="text-blue-400 font-black">Pro Tip:</span> Earn more coins by completing Daily Challenges and winning matches in the Arena!
        </div>
      </div>
    </div>
  );
}
