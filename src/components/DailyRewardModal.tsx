import { Check, Crown, Flame, Gift, Sparkles, X } from 'lucide-react';
import { formatNum } from '../game/i18n';
import { DAILY_REWARD_AMOUNTS, DailyRewardInfo } from '../game/storage';
import { AppLanguage } from '../game/types';

interface DailyRewardModalProps {
  info: DailyRewardInfo;
  lang: AppLanguage;
  onClaim: () => void;
  onDismiss: () => void;
}

export function DailyRewardModal({
  info,
  lang,
  onClaim,
  onDismiss,
}: DailyRewardModalProps) {
  const isTr = lang === 'tr';
  const isDay7 = info.claimDay === 7;

  return (
    <div
      className="safe-inset-overlay touch-pan-y fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="relative my-auto w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#171d33] to-[#0d1221] border-2 border-amber-400/85 p-5 shadow-[0_0_52px_rgba(251,191,36,0.34)]">
        <button
          type="button"
          onClick={onDismiss}
          aria-label={isTr ? 'Kapat' : 'Close'}
          className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 border-2 border-white text-white shadow-lg hover:bg-rose-400 active:scale-95 transition-transform"
        >
          <X className="h-5 w-5 stroke-[3]" />
        </button>

        {/* Top Header + Streak Pill */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 border border-white/60 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.45)]">
              <Gift className="h-6 w-6 stroke-[2.4]" />
            </div>
            <div>
              <h2 className="font-display text-lg font-extrabold tracking-wide text-white leading-tight">
                {isTr ? 'GÜNLÜK ÖDÜLLER' : 'DAILY REWARDS'}
              </h2>
              <p className="text-[11px] font-semibold text-slate-300">
                {isTr ? 'Her gün katlanarak büyür!' : 'Grows bigger every day!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-full bg-orange-500/20 border border-orange-400/60 px-2.5 py-1 text-[11px] font-extrabold text-orange-300 shrink-0">
            <Flame className="h-3.5 w-3.5 fill-orange-400 text-orange-300" />
            <span>
              {isTr ? `${info.claimDay}/7 Gün` : `Day ${info.claimDay}/7`}
            </span>
          </div>
        </div>

        {/* 7-Day Escalating Ladder */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {DAILY_REWARD_AMOUNTS.map((amount, idx) => {
            const day = idx + 1;
            const isToday = day === info.claimDay;
            const isPast = day < info.claimDay;
            const isGrandDay = day === 7;

            return (
              <div
                key={day}
                className={`relative flex flex-col items-center justify-center rounded-2xl border px-2 py-2.5 text-center transition-all ${
                  isGrandDay ? 'col-span-3 flex-row justify-between px-4 py-3.5' : ''
                } ${
                  isToday
                    ? 'bg-gradient-to-b from-amber-400/30 via-orange-500/20 to-amber-500/15 border-2 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)] scale-[1.02]'
                    : isPast
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                      : isGrandDay
                        ? 'bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-orange-500/15 border-amber-400/40 text-amber-200'
                        : 'bg-slate-900/85 border-white/10 text-slate-400'
                }`}
              >
                {isToday && !isGrandDay && (
                  <span className="absolute -top-2 rounded-full bg-amber-300 px-1.5 py-0.2 text-[8px] font-extrabold tracking-wider text-slate-950 shadow">
                    {isTr ? 'HAZIR!' : 'READY!'}
                  </span>
                )}

                <div className={isGrandDay ? 'flex items-center gap-2.5 text-left' : ''}>
                  {isGrandDay && (
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isToday
                          ? 'bg-amber-300 text-slate-950 shadow'
                          : 'bg-amber-400/20 text-amber-300'
                      }`}
                    >
                      <Crown className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <div
                      className={`text-[11px] font-extrabold tracking-wide ${
                        isToday
                          ? 'text-amber-200'
                          : isPast
                            ? 'text-emerald-300'
                            : isGrandDay
                              ? 'text-amber-200'
                              : 'text-slate-400'
                      }`}
                    >
                      {isGrandDay
                        ? isTr
                          ? '7. Gün · Efsane Kasa'
                          : 'Day 7 · Grand Chest'
                        : isTr
                          ? `${day}. Gün`
                          : `Day ${day}`}
                    </div>
                    {isToday && (
                      <div className="text-[10px] font-extrabold text-white">
                        {isGrandDay
                          ? isTr
                            ? 'Büyük Ödül Açıldı!'
                            : 'Grand Prize Unlocked!'
                          : isTr
                            ? 'Bugünkü Ödül'
                            : "Today's Reward"}
                      </div>
                    )}
                    {isGrandDay && !isToday && (
                      <div className="text-[10px] font-semibold text-amber-300/80">
                        {isTr
                          ? 'Seriyi tamamla, büyük kasayı patlat!'
                          : 'Complete the streak for the grand chest!'}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={`${isGrandDay ? '' : 'mt-1.5'} flex items-center gap-1.5 font-mono-num ${
                    isGrandDay ? 'text-base' : 'text-sm'
                  } font-extrabold ${
                    isToday
                      ? 'text-amber-300'
                      : isPast
                        ? 'text-emerald-300'
                        : isGrandDay
                          ? 'text-amber-300'
                          : 'text-slate-300'
                  }`}
                >
                  {isPast ? (
                    <Check className="h-4 w-4 stroke-[3] text-emerald-400" />
                  ) : (
                    <span className="inline-block h-2.5 w-2.5 rotate-12 rounded-[2px] bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.85)]" />
                  )}
                  <span>+{formatNum(amount, lang)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClaim}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-950 border-b-[5px] py-3.5 text-base font-extrabold tracking-wide shadow-[0_10px_28px_rgba(251,191,36,0.35)] transition-transform active:translate-y-0.5 active:border-b-2 ${
            isDay7
              ? 'bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 text-slate-950'
              : 'bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 text-slate-950 hover:brightness-105'
          }`}
        >
          <Sparkles className="h-5 w-5" />
          <span>
            {isTr
              ? `+${formatNum(info.rewardCoins, lang)} KIRINTI AL`
              : `CLAIM +${formatNum(info.rewardCoins, lang)} CRUMBS`}
          </span>
        </button>
      </div>
    </div>
  );
}
