import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Home,
  PlayCircle,
  RotateCcw,
  Share2,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  formatNum,
  getDeathReasonDisplay,
  getMissionTitle,
} from '../game/i18n';
import {
  getContinueCost,
  getMissionById,
  getScoreMultiplierFromMissions,
} from '../game/storage';
import { AppLanguage, HudSnapshot, MissionProgress } from '../game/types';

interface GameOverOverlayProps {
  hud: HudSnapshot;
  lang: AppLanguage;
  totalCoins: number;
  missions: MissionProgress;
  completedMissionsThisRun: { title: string; rewardCoins: number }[];
  adNotice?: string | null;
  onContinueWithCoins: () => void;
  onContinueWithAd: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export function GameOverOverlay({
  hud,
  lang,
  totalCoins,
  missions,
  completedMissionsThisRun,
  adNotice,
  onContinueWithCoins,
  onContinueWithAd,
  onRestart,
  onMainMenu,
}: GameOverOverlayProps) {
  const isTr = lang === 'tr';
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const shareTimerRef = useRef<number | null>(null);
  const continueCost = getContinueCost(hud.continueCount);
  const canContinue = totalCoins >= continueCost;
  const showAdRevive = !hud.adReviveUsed;
  const scoreMult = getScoreMultiplierFromMissions(missions.completedCount);
  const deathText = getDeathReasonDisplay(hud.deathReasonKey, hud.deathReason, lang);

  useEffect(() => {
    return () => {
      if (shareTimerRef.current !== null) {
        window.clearTimeout(shareTimerRef.current);
      }
    };
  }, []);

  const handleShare = async () => {
    const shareText = isTr
      ? `Böcek Firarda'da ${hud.score} puan (${hud.distance} m) yaptım! Geçebilir misin?`
      : `I scored ${hud.score} pts (${hud.distance} m) in Bug Escape! Can you beat me?`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: isTr ? 'Böcek Firarda' : 'Bug Escape',
          text: shareText,
        });
        setShareMsg(isTr ? 'Paylaşıldı!' : 'Shared!');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setShareMsg(isTr ? 'Skor kopyalandı!' : 'Score copied!');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setShareMsg(isTr ? 'Kopyalanamadı' : 'Copy failed');
    }
    if (shareTimerRef.current !== null) {
      window.clearTimeout(shareTimerRef.current);
    }
    shareTimerRef.current = window.setTimeout(() => {
      shareTimerRef.current = null;
      setShareMsg(null);
    }, 2200);
  };

  return (
    <div
      className="safe-inset-overlay pointer-events-auto touch-pan-y fixed inset-0 z-30 flex items-center justify-center bg-black/72"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-3xl bg-[#131110]/96 border border-white/12 p-4 sm:p-5 shadow-2xl">
        {/* Death Reason Kicker */}
        <div className="text-center">
          <p className="text-[11px] font-extrabold tracking-[0.2em] text-amber-400">
            {deathText}
          </p>
          <div className="font-mono-num mt-0.5 text-4xl sm:text-5xl font-extrabold tracking-tight text-[#fef3c7]">
            {formatNum(hud.score, lang)}
          </div>
          {hud.isNewRecord && (
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isTr ? 'YENİ REKOR!' : 'NEW RECORD!'}</span>
            </div>
          )}
        </div>

        {/* 3 Clean Stat Boxes */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-2 text-center">
            <div className="text-[10px] font-bold tracking-wider text-slate-400">
              {isTr ? 'KIRINTI' : 'CRUMBS'}
            </div>
            <div className="font-mono-num mt-0.5 text-base font-extrabold text-amber-300">
              +{hud.coins}
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-2 text-center">
            <div className="text-[10px] font-bold tracking-wider text-slate-400">
              {isTr ? 'MESAFE' : 'DISTANCE'}
            </div>
            <div className="font-mono-num mt-0.5 text-base font-extrabold text-white">
              {hud.distance} m
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-2 text-center">
            <div className="text-[10px] font-bold tracking-wider text-slate-400">
              {isTr ? 'REKOR' : 'BEST'}
            </div>
            <div className="font-mono-num mt-0.5 text-base font-extrabold text-emerald-300">
              {formatNum(hud.highScore, lang)}
            </div>
          </div>
        </div>

        {/* Primary Actions — Immediately visible without scrolling */}
        <div className="mt-3.5 flex flex-col gap-2">
          <button
            type="button"
            disabled={!canContinue}
            onClick={onContinueWithCoins}
            className={`relative overflow-hidden w-full rounded-2xl py-3 px-3 text-sm sm:text-base font-extrabold transition-all ${
              canContinue
                ? 'bg-gradient-to-b from-cyan-200 via-cyan-400 to-sky-500 text-slate-950 border-2 border-cyan-100 border-b-[4px] border-b-sky-800 shadow-[0_0_28px_rgba(34,211,238,0.68)] hover:brightness-105 active:translate-y-0.5 active:border-b-2'
                : 'bg-slate-800 border border-white/10 text-slate-400 cursor-not-allowed'
            }`}
          >
            {canContinue && (
              <span
                aria-hidden="true"
                className="revive-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent"
              />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {canContinue && <Zap className="h-4 w-4 fill-slate-950 shrink-0" />}
              {canContinue ? (
                <span>
                  {isTr ? 'CANLAN' : 'REVIVE'} · {formatNum(continueCost, lang)}{' '}
                  {isTr ? 'kırıntı' : 'crumbs'}
                  {hud.continueCount > 0 && (
                    <span className="ml-1.5 rounded-md bg-slate-950/15 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950">
                      {isTr
                        ? `${hud.continueCount + 1}. Canlanma`
                        : `Revive #${hud.continueCount + 1}`}
                    </span>
                  )}
                </span>
              ) : (
                <span>
                  {isTr ? 'CANLAN' : 'REVIVE'} · {formatNum(continueCost, lang)}{' '}
                  {isTr ? 'kırıntı' : 'crumbs'} ({formatNum(totalCoins, lang)}/
                  {formatNum(continueCost, lang)})
                </span>
              )}
            </span>
          </button>

          {showAdRevive && (
            <button
              type="button"
              onClick={onContinueWithAd}
              className="relative overflow-hidden flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-600 border-2 border-emerald-100 border-b-[4px] border-b-emerald-800 py-3 px-3 text-sm sm:text-base font-extrabold text-slate-950 shadow-[0_0_24px_rgba(16,185,129,0.55)] hover:brightness-105 active:translate-y-0.5 active:border-b-2 transition-all"
            >
              <span
                aria-hidden="true"
                className="revive-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
              />
              <PlayCircle className="relative h-4 w-4 stroke-[2.5] shrink-0" />
              <span className="relative">
                {isTr ? 'REKLAM İZLE · ÜCRETSİZ CANLAN' : 'WATCH AD · FREE REVIVE'}
              </span>
            </button>
          )}

          {adNotice && (
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-3 py-1.5 text-center text-[11px] font-bold text-emerald-200">
              {adNotice}
            </div>
          )}

          <button
            type="button"
            onClick={onRestart}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 py-3 text-base sm:text-lg font-extrabold text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-105 active:scale-98 transition-transform"
          >
            <RotateCcw className="h-5 w-5 stroke-[2.5]" />
            <span>{isTr ? 'Tekrar koş' : 'Run Again'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onMainMenu}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] border border-white/10 py-2 text-xs sm:text-sm font-bold text-slate-200 hover:bg-white/[0.1]"
            >
              <Home className="h-4 w-4" />
              <span>{isTr ? 'Ana menü' : 'Main Menu'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] border border-white/10 py-2 text-xs sm:text-sm font-bold text-slate-200 hover:bg-white/[0.1]"
            >
              <Share2 className="h-4 w-4" />
              <span>{shareMsg || (isTr ? 'Skoru paylaş' : 'Share Score')}</span>
            </button>
          </div>
        </div>

        {/* Completed Missions Celebration */}
        {completedMissionsThisRun.length > 0 && (
          <div className="mt-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/45 p-2.5">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-emerald-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{isTr ? 'GÖREV TAMAMLANDI!' : 'MISSION COMPLETE!'}</span>
              </span>
              <span className="text-[10px] text-amber-300">
                {isTr ? 'Menüden ödülünü al' : 'Claim in Menu'}
              </span>
            </div>
            {completedMissionsThisRun.map((m, idx) => (
              <div
                key={idx}
                className="mt-1 flex items-center justify-between text-xs font-bold text-white"
              >
                <span>{m.title}</span>
                <span className="font-mono-num text-amber-300">+{m.rewardCoins}</span>
              </div>
            ))}
          </div>
        )}

        {/* Active Rotating Missions */}
        <div className="mt-3 rounded-2xl bg-white/[0.03] border border-white/10 p-2.5">
          <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-300">
            <span>{isTr ? 'AKTİF GÖREVLER' : 'ACTIVE MISSIONS'}</span>
            <span className="text-emerald-400">
              {isTr ? 'Skor:' : 'Score:'} {scoreMult}x
            </span>
          </div>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {missions.activeIds.map((id) => {
              const def = getMissionById(id);
              if (!def) return null;
              const isClaimable = missions.claimableIds.includes(id);
              const val = isClaimable
                ? def.target
                : Math.min(def.target, missions.progress[id] ?? 0);
              const pct = Math.min(100, Math.round((val / def.target) * 100));
              return (
                <div key={id} className="text-[11px]">
                  <div className="flex items-center justify-between text-slate-200 font-semibold">
                    <span>{getMissionTitle(def.id, def.title, lang)}</span>
                    {isClaimable ? (
                      <span className="font-extrabold text-emerald-400">
                        {isTr ? 'HAZIR!' : 'READY!'}
                      </span>
                    ) : (
                      <span className="font-mono-num text-slate-400">
                        {val}/{def.target}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${isClaimable ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
