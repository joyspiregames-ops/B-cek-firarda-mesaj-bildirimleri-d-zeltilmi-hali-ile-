import { useState } from 'react';
import {
  Check,
  Coins,
  Flashlight,
  Lock,
  Magnet,
  Rocket,
  Shield,
  Sparkles,
  User,
  X,
  Zap,
} from 'lucide-react';
import {
  COIN_PACK_TEXT_EN,
  UPGRADE_TEXT_EN,
  formatNum,
  getSkinName,
} from '../game/i18n';
import {
  COIN_PACKS,
  SKINS,
  UPGRADE_CATALOG,
  getUpgradeCost,
} from '../game/storage';
import { AppLanguage, SkinId, UpgradeKey } from '../game/types';

interface SkinShopModalProps {
  lang: AppLanguage;
  totalCoins: number;
  unlockedSkins: SkinId[];
  selectedSkin: SkinId;
  upgrades: Record<UpgradeKey, number>;
  portraits: Partial<Record<SkinId, string>>;
  initialTab?: 'skins' | 'upgrades' | 'coins';
  isNativeStore: boolean;
  storePrices: Record<string, string>;
  buyingProductId: string | null;
  purchaseNotice: string | null;
  onSelect: (id: SkinId) => void;
  onUnlock: (id: SkinId, cost: number) => void;
  onUpgrade: (key: UpgradeKey) => void;
  onBuyCoins: (id: string) => void;
  onClose: () => void;
}

const UPGRADE_ICONS: Record<UpgradeKey, typeof Rocket> = {
  wings: Rocket,
  magnet: Magnet,
  turbo: Zap,
  flashlight: Flashlight,
  shield: Shield,
};

export function SkinShopModal({
  lang,
  totalCoins,
  unlockedSkins,
  selectedSkin,
  upgrades,
  portraits,
  initialTab = 'skins',
  isNativeStore,
  storePrices,
  buyingProductId,
  purchaseNotice,
  onSelect,
  onUnlock,
  onUpgrade,
  onBuyCoins,
  onClose,
}: SkinShopModalProps) {
  const isTr = lang === 'tr';
  const [tab, setTab] = useState<'skins' | 'upgrades' | 'coins'>(initialTab);
  const activeTab = !isNativeStore && tab === 'coins' ? 'skins' : tab;

  return (
    <div className="safe-inset-shop pointer-events-none fixed inset-0 z-40 flex flex-col justify-between">
      {/* Top Bar: Close Button Left · Kırıntı Counter Right */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          aria-label={isTr ? 'Kapat' : 'Close'}
          className="pointer-events-auto flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-rose-500 border-2 border-white text-white shadow-xl hover:bg-rose-400 active:scale-95 transition-transform duration-150"
        >
          <X className="h-5 w-5 stroke-[3]" />
        </button>

        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-950/90 border-2 border-white/55 px-3.5 py-1.5 shadow-xl">
          <span className="inline-block h-3.5 w-3.5 rotate-12 rounded-sm bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
          <span className="font-mono-num text-sm sm:text-base font-extrabold tabular-nums text-white">
            {formatNum(totalCoins, lang)}
          </span>
        </div>
      </div>

      {/* Right-aligned Compact Shop Drawer */}
      <div className="pointer-events-auto ml-auto my-auto relative w-[59vw] min-w-[214px] max-w-[324px] sm:w-[340px] rounded-[20px] bg-[#0a0c1c]/95 border-2 border-fuchsia-500/85 ring-1 ring-cyan-400/25 px-2.5 pb-2.5 pt-5 sm:px-3.5 sm:pb-3.5 sm:pt-6 shadow-[0_0_28px_rgba(217,70,239,0.32)]">
        {/* Overlapping Neon SHOP Header */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 border-2 border-white/85 px-4 sm:px-6 py-0.5 shadow-[0_4px_14px_rgba(192,38,211,0.5)]">
          <h2 className="font-display text-xs sm:text-sm font-extrabold tracking-widest text-white">
            {isTr ? 'MAĞAZA' : 'SHOP'}
          </h2>
        </div>

        {/* Sleek Medallion Category Tabs */}
        <div
          className={`mb-2 grid gap-1.5 border-b border-white/10 pb-1.5 ${
            isNativeStore ? 'grid-cols-3' : 'grid-cols-2'
          }`}
        >
          <button
            type="button"
            onClick={() => setTab('skins')}
            className="flex min-h-[40px] flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-0.5 transition-transform active:scale-95"
          >
            <span
              className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 transition-all ${
                activeTab === 'skins'
                  ? 'border-white bg-gradient-to-br from-fuchsia-500 to-amber-500 text-white shadow-[0_0_12px_rgba(217,70,239,0.55)]'
                  : 'border-white/20 bg-slate-900/90 text-slate-400 hover:text-white'
              }`}
            >
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
            <span
              className={`text-[9px] sm:text-[10px] font-extrabold tracking-wider whitespace-nowrap ${
                activeTab === 'skins' ? 'text-white' : 'text-slate-400'
              }`}
            >
              {isTr ? 'KARAKTER' : 'HEROES'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('upgrades')}
            className="flex min-h-[40px] flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-0.5 transition-transform active:scale-95"
          >
            <span
              className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 transition-all ${
                activeTab === 'upgrades'
                  ? 'border-white bg-gradient-to-br from-cyan-400 to-sky-600 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.55)]'
                  : 'border-white/20 bg-slate-900/90 text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
            <span
              className={`text-[9px] sm:text-[10px] font-extrabold tracking-wider whitespace-nowrap ${
                activeTab === 'upgrades' ? 'text-sky-300' : 'text-slate-400'
              }`}
            >
              {isTr ? 'GÜÇLENDİR' : 'UPGRADES'}
            </span>
          </button>

          {isNativeStore && (
            <button
              type="button"
              onClick={() => setTab('coins')}
              className="flex min-h-[40px] flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-0.5 transition-transform active:scale-95"
            >
              <span
                className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 transition-all ${
                  activeTab === 'coins'
                    ? 'border-white bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                    : 'border-white/20 bg-slate-900/90 text-slate-400 hover:text-white'
                }`}
              >
                <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-extrabold tracking-wider whitespace-nowrap ${
                  activeTab === 'coins' ? 'text-amber-300' : 'text-slate-400'
                }`}
              >
                {isTr ? 'KIRINTI' : 'CRUMBS'}
              </span>
            </button>
          )}
        </div>

        {activeTab === 'skins' ? (
          /* All 5 Characters fit neatly with zero vertical scrolling on portrait */
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 max-h-[calc(100dvh-190px)] sm:max-h-[calc(100dvh-180px)] overflow-y-auto overscroll-contain">
            {SKINS.map((skin, idx) => {
              const isUnlocked = unlockedSkins.includes(skin.id);
              const isSelected = selectedSkin === skin.id;
              const canAfford = totalCoins >= skin.cost;
              const portraitUrl = portraits[skin.id];
              const accentHex = `#${skin.accentColor.toString(16).padStart(6, '0')}`;
              const skinName = getSkinName(skin.id, skin.name, lang);
              const isOddLast =
                SKINS.length % 2 === 1 && idx === SKINS.length - 1;

              const handleCardClick = () => {
                if (isUnlocked) {
                  onSelect(skin.id);
                } else if (canAfford) {
                  onUnlock(skin.id, skin.cost);
                }
              };

              const card = (
                <button
                  key={skin.id}
                  type="button"
                  onClick={handleCardClick}
                  className={`group relative flex w-full flex-col overflow-hidden rounded-xl border-[1.5px] text-left transition-all duration-150 active:scale-[0.97] ${
                    isSelected
                      ? 'bg-[#131e38] border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                      : isUnlocked
                        ? 'bg-[#11152a] border-fuchsia-400/45 hover:border-fuchsia-300/80'
                        : canAfford
                          ? 'bg-[#101428] border-amber-400/45 hover:border-amber-300/85'
                          : 'bg-[#0d1020] border-slate-700/85 hover:border-slate-500'
                  }`}
                >
                  {/* Clean Top Name Header (keeps close-up face 100% unobstructed) */}
                  <div className="px-1.5 pt-1 pb-0.5 text-center text-[8.5px] sm:text-[9.5px] font-extrabold uppercase tracking-wider text-white/95 truncate leading-tight">
                    {skinName}
                  </div>

                  {/* Compact Chest-Up Close-Up Portrait Box */}
                  <div
                    className="relative h-[64px] sm:h-[74px] w-full flex items-end justify-center overflow-hidden"
                    style={{
                      background: `radial-gradient(circle at 50% 58%, ${accentHex}38 0%, rgba(15,23,42,0.22) 64%, transparent 90%)`,
                    }}
                  >
                    {portraitUrl ? (
                      <img
                        src={portraitUrl}
                        alt={skinName}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain object-bottom drop-shadow-[0_4px_8px_rgba(0,0,0,0.85)] group-hover:scale-105 transition-transform duration-150"
                      />
                    ) : (
                      <div
                        className="my-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-[11px] font-extrabold text-white/90 shadow-inner"
                        style={{ backgroundColor: `${accentHex}55` }}
                      >
                        {skinName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Clean Bottom Status / Cost Strip */}
                  <div
                    className={`mt-auto flex items-center justify-center gap-1 border-t py-[3px] sm:py-1 text-[9.5px] sm:text-[10.5px] font-extrabold tabular-nums ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-400'
                        : isUnlocked
                          ? 'bg-white/[0.04] border-white/10 text-slate-200'
                          : canAfford
                            ? 'bg-amber-500/15 border-amber-400/35 text-amber-300'
                            : 'bg-slate-950/75 border-slate-800/90 text-slate-400'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[3]" />
                        <span>{isTr ? 'Kuşanıldı' : 'Equipped'}</span>
                      </>
                    ) : isUnlocked ? (
                      <span>{isTr ? 'Seç' : 'Select'}</span>
                    ) : skin.cost === 0 ? (
                      <span>{isTr ? 'Ücretsiz Al' : 'Free'}</span>
                    ) : (
                      <>
                        <Lock className="h-2.5 w-2.5 opacity-75" />
                        <span className="inline-block h-2 w-2 rotate-12 rounded-[2px] bg-amber-400" />
                        <span className="font-mono-num">
                          {formatNum(skin.cost, lang)}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              );

              return isOddLast ? (
                <div key={skin.id} className="col-span-2 flex justify-center">
                  <div className="w-[calc(50%-3px)] sm:w-[calc(50%-4px)]">
                    {card}
                  </div>
                </div>
              ) : (
                card
              );
            })}
          </div>
        ) : activeTab === 'upgrades' ? (
          /* All 5 Upgrades fit neatly with zero vertical scrolling on portrait */
          <div className="flex flex-col gap-1.5 sm:gap-2 max-h-[calc(100dvh-190px)] sm:max-h-[calc(100dvh-180px)] overflow-y-auto overscroll-contain">
            {UPGRADE_CATALOG.map((item) => {
              const Icon = UPGRADE_ICONS[item.key];
              const level = upgrades[item.key] ?? 1;
              const isMax = level >= item.maxLevel;
              const cost = getUpgradeCost(item.baseCost, level);
              const canAfford = !isMax && totalCoins >= cost;
              const upgradeText = isTr
                ? { name: item.name, desc: item.desc }
                : UPGRADE_TEXT_EN[item.key];

              return (
                <div
                  key={item.key}
                  className="flex items-center gap-2 rounded-xl bg-[#11152a] border border-white/12 px-2 py-1.5 sm:px-2.5 sm:py-2"
                >
                  <div
                    className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-white/20"
                    style={{
                      backgroundColor: `${item.accentHex}22`,
                      color: item.accentHex,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10.5px] sm:text-[11.5px] font-extrabold text-white truncate">
                        {upgradeText.name}
                      </span>
                      <span className="font-mono-num shrink-0 text-[9px] font-bold tabular-nums text-slate-400">
                        {isTr ? 'Sv.' : 'Lv.'}
                        {level}/{item.maxLevel}
                      </span>
                    </div>
                    <p className="text-[8.5px] sm:text-[9.5px] leading-tight text-slate-400 truncate">
                      {upgradeText.desc}
                    </p>
                    <div className="mt-1 flex gap-1">
                      {Array.from({ length: item.maxLevel }).map((_, idx) => (
                        <span
                          key={idx}
                          className={`h-1 flex-1 rounded-full ${
                            idx < level ? 'bg-sky-400' : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => onUpgrade(item.key)}
                    className={`min-h-[32px] sm:min-h-[36px] min-w-[46px] sm:min-w-[52px] shrink-0 rounded-lg px-2 py-1 text-[10px] sm:text-[11px] font-extrabold tabular-nums transition-transform active:scale-95 ${
                      isMax
                        ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 cursor-default'
                        : canAfford
                          ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isMax ? (
                      'MAX'
                    ) : (
                      <span className="flex items-center justify-center gap-1 font-mono-num">
                        <span className="inline-block h-2 w-2 rotate-12 rounded-[2px] bg-slate-950/60" />
                        {formatNum(cost, lang)}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Native Android Store Kırıntı Packs (hidden on Web via Capacitor.isNativePlatform()) */
          <div className="flex flex-col gap-2 max-h-[calc(100dvh-190px)] sm:max-h-[calc(100dvh-180px)] overflow-y-auto overscroll-contain">
            {COIN_PACKS.map((pack, idx) => {
              const isBusy = buyingProductId !== null;
              const isBuyingThis = buyingProductId === pack.id;
              const storePrice = storePrices[pack.id];
              const isFeatured = idx === 1;
              const isTop = idx === 2;
              const packText = isTr
                ? { name: pack.name, desc: pack.desc, badge: pack.badge }
                : COIN_PACK_TEXT_EN[
                    pack.id as keyof typeof COIN_PACK_TEXT_EN
                  ] ?? { name: pack.name, desc: pack.desc, badge: pack.badge };

              return (
                <div
                  key={pack.id}
                  className={`relative flex flex-col gap-1.5 rounded-xl border px-2.5 py-2 sm:px-3 sm:py-2.5 ${
                    isTop
                      ? 'bg-gradient-to-r from-[#1a1433] to-[#211538] border-amber-400/65 shadow-[0_0_16px_rgba(251,191,36,0.2)]'
                      : isFeatured
                        ? 'bg-gradient-to-r from-[#121933] to-[#1a1533] border-fuchsia-400/55'
                        : 'bg-[#11152a] border-white/15'
                  }`}
                >
                  {/* Top Row: Coin Icon + Amount Left · Optional Badge Right */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border ${
                          isTop
                            ? 'border-amber-300/60 bg-amber-400/20 text-amber-300'
                            : isFeatured
                              ? 'border-fuchsia-300/50 bg-fuchsia-500/20 text-fuchsia-300'
                              : 'border-amber-400/35 bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <span className="font-mono-num text-xs sm:text-sm font-extrabold tabular-nums text-amber-300 truncate">
                        +{formatNum(pack.coins, lang)}{' '}
                        {isTr ? 'Kırıntı' : 'Crumbs'}
                      </span>
                    </div>

                    {packText.badge && (
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wide whitespace-nowrap ${
                          isTop
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-fuchsia-500/90 text-white'
                        }`}
                      >
                        {packText.badge}
                      </span>
                    )}
                  </div>

                  {/* Bottom Row: Name & Desc Left · Dynamic Store Price Button Right */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10.5px] sm:text-[11.5px] font-extrabold text-white truncate">
                        {packText.name}
                      </div>
                      <p className="text-[8.5px] sm:text-[9.5px] leading-tight text-slate-400 truncate">
                        {packText.desc}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onBuyCoins(pack.id)}
                      className={`min-h-[32px] sm:min-h-[36px] min-w-[64px] sm:min-w-[74px] shrink-0 whitespace-nowrap rounded-xl px-2.5 py-1 text-[10.5px] sm:text-xs font-extrabold tabular-nums transition-transform active:scale-95 ${
                        isBusy
                          ? 'bg-slate-800 text-slate-400 cursor-wait'
                          : isTop
                            ? 'bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-950 hover:brightness-105 shadow'
                            : 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow'
                      }`}
                    >
                      {isBuyingThis
                        ? isTr
                          ? 'İşleniyor...'
                          : 'Processing...'
                        : storePrice || (isTr ? 'Satın Al' : 'Buy')}
                    </button>
                  </div>
                </div>
              );
            })}

            {purchaseNotice && (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1.5 text-center text-[10px] sm:text-[11px] font-bold text-emerald-200">
                {purchaseNotice}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Spacer */}
      <div className="h-1" />
    </div>
  );
}
