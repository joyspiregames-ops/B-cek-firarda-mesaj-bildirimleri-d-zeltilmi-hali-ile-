import {
  AlertTriangle,
  CheckCircle2,
  Flashlight,
  Flame,
  Magnet,
  Pause,
  Play,
  Rocket,
  Shield,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { formatNum, getZoneDisplay } from '../game/i18n';
import { AppLanguage, HudSnapshot, ZoneConfig } from '../game/types';

export interface MissionToast {
  id: string;
  title: string;
  rewardCoins: number;
}

interface GameHudOverlayProps {
  hud: HudSnapshot;
  lang: AppLanguage;
  zoneBanner: ZoneConfig | null;
  missionToast: MissionToast | null;
  muted: boolean;
  showSwipeHint: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onResume: () => void;
  onMainMenu: () => void;
}

export function GameHudOverlay({
  hud,
  lang,
  zoneBanner,
  missionToast,
  muted,
  showSwipeHint,
  onToggleMute,
  onPause,
  onResume,
  onMainMenu,
}: GameHudOverlayProps) {
  const isTr = lang === 'tr';
  const { activePowerups } = hud;
  const currentZoneText = getZoneDisplay(
    hud.zone.id,
    hud.zone.title,
    hud.zone.subtitle,
    lang,
  );
  const bannerZoneText = zoneBanner
    ? getZoneDisplay(zoneBanner.id, zoneBanner.title, zoneBanner.subtitle, lang)
    : null;

  return (
    <div className="safe-inset-overlay pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        {/* Score, Distance & Combo */}
        <div className="pointer-events-auto rounded-2xl bg-[#0b131b]/88 border border-white/10 px-3 py-2 sm:px-4 sm:py-2.5 shadow-lg">
          <div className="flex items-baseline gap-2 sm:gap-2.5">
            <div className="font-mono-num text-xl sm:text-3xl font-extrabold leading-none text-white">
              {formatNum(hud.score, lang)}
            </div>
            {hud.combo > 1 && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-400 to-rose-500 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-slate-950 shadow">
                <Flame className="h-3 w-3 fill-slate-950" />
                x{hud.combo}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-slate-300">
            <span className="font-mono-num text-emerald-400">{hud.distance} m</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num text-amber-300">{hud.speedMultiplier}x</span>
          </div>
        </div>

        {/* Right: Kırıntı & Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-2xl bg-[#0b131b]/88 border border-amber-400/25 px-2.5 py-2 sm:px-3.5 sm:py-2.5 shadow-lg">
            <span className="inline-block h-3.5 w-3.5 rotate-12 rounded-sm bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <span className="font-mono-num text-sm sm:text-base font-extrabold text-amber-300">
              {hud.coins}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={
              muted
                ? isTr
                  ? 'Sesi aç'
                  : 'Unmute'
                : isTr
                  ? 'Sesi kapat'
                  : 'Mute'
            }
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-[#0b131b]/88 border border-white/10 text-slate-200 hover:bg-slate-800 active:scale-95 transition-transform"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={hud.phase === 'paused' ? onResume : onPause}
            aria-label={
              hud.phase === 'paused'
                ? isTr
                  ? 'Devam et'
                  : 'Resume'
                : isTr
                  ? 'Duraklat'
                  : 'Pause'
            }
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-[#0b131b]/88 border border-white/10 text-slate-200 hover:bg-slate-800 active:scale-95 transition-transform"
          >
            {hud.phase === 'paused' ? (
              <Play className="h-5 w-5" />
            ) : (
              <Pause className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Ev Sahibi Chase Urgent Warning */}
      {hud.stumbleTimer > 0 && (
        <div className="safe-top-offset-20 fixed left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-2xl bg-rose-600/95 border-2 border-amber-300 px-4 py-1.5 text-xs font-extrabold tracking-wide text-white shadow-xl animate-pulse whitespace-nowrap">
          <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0" />
          <span>
            {isTr
              ? `EV SAHİBİ PEŞİNDE! (${hud.stumbleTimer.toFixed(1)}s)`
              : `HOMEOWNER CHASING! (${hud.stumbleTimer.toFixed(1)}s)`}
          </span>
        </div>
      )}

      {/* Live Mid-Run Mission Completed Toast */}
      {missionToast && hud.stumbleTimer <= 0 && (
        <div
          key={missionToast.id}
          className="safe-top-offset-20 fixed left-1/2 -translate-x-1/2 flex items-center gap-2.5 rounded-2xl bg-emerald-950/95 border-2 border-emerald-400 px-4 py-2 text-xs font-extrabold text-white shadow-[0_10px_30px_rgba(16,185,129,0.45)] max-w-[90vw]"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
          <span className="truncate">
            {isTr ? 'GÖREV TAMAM:' : 'QUEST DONE:'} {missionToast.title}
          </span>
          <span className="shrink-0 font-mono-num rounded-lg bg-amber-400 px-1.5 py-0.5 text-[11px] font-extrabold text-slate-950">
            +{missionToast.rewardCoins}
          </span>
        </div>
      )}

      {/* Active Powerups Strip (center-left) */}
      {(activePowerups.shield ||
        activePowerups.wings > 0 ||
        activePowerups.magnet > 0 ||
        activePowerups.flashlight > 0 ||
        activePowerups.turbo > 0) && (
        <div className="safe-top-offset-24 safe-left-offset fixed flex flex-col gap-2">
          {activePowerups.wings > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-cyan-950/92 border border-lime-400/65 px-3 py-1.5 text-xs font-bold text-lime-200 shadow-lg">
              <Rocket className="h-4 w-4 text-lime-300" />
              <span className="font-mono-num">Jetpack · {activePowerups.wings}s</span>
            </div>
          )}
          {activePowerups.shield && (
            <div className="flex items-center gap-2 rounded-xl bg-sky-950/90 border border-sky-400/40 px-3 py-1.5 text-xs font-bold text-sky-200">
              <Shield className="h-4 w-4 text-sky-400" />
              <span>{isTr ? 'Kalkan Hazır' : 'Shield Ready'}</span>
            </div>
          )}
          {activePowerups.magnet > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-purple-950/90 border border-purple-400/40 px-3 py-1.5 text-xs font-bold text-purple-200">
              <Magnet className="h-4 w-4 text-purple-400" />
              <span className="font-mono-num">{activePowerups.magnet}s</span>
            </div>
          )}
          {activePowerups.flashlight > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-yellow-950/90 border border-yellow-400/40 px-3 py-1.5 text-xs font-bold text-yellow-200">
              <Flashlight className="h-4 w-4 text-yellow-400" />
              <span className="font-mono-num">2x · {activePowerups.flashlight}s</span>
            </div>
          )}
          {activePowerups.turbo > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-orange-950/90 border border-orange-400/40 px-3 py-1.5 text-xs font-bold text-orange-200">
              <Zap className="h-4 w-4 text-orange-400" />
              <span className="font-mono-num">2x · {activePowerups.turbo}s</span>
            </div>
          )}
        </div>
      )}

      {/* Dramatic Zone Banner */}
      {zoneBanner && bannerZoneText && (
        <div
          key={zoneBanner.id}
          className="zone-banner-anim fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none w-[90vw] max-w-md"
        >
          <p className="text-xs font-extrabold tracking-[0.22em] text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            {isTr ? 'YENİ BÖLGE' : 'NEW STAGE'}
          </p>
          <h2 className="font-display mt-1 text-3xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)]">
            {bannerZoneText.title}
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            {bannerZoneText.subtitle}
          </p>
        </div>
      )}

      {/* Subtle Bottom Swipe Guide on Run Start */}
      {showSwipeHint && hud.phase === 'playing' && (
        <div className="mx-auto mb-4 rounded-2xl bg-[#0b131b]/85 border border-white/10 px-4 py-2 text-center text-xs font-bold text-slate-200">
          {isTr
            ? 'Kaydır: Sol / Sağ şerit · Yukarı zıpla · Aşağı takla'
            : 'Swipe: Left / Right lane · Up to jump · Down to roll'}
        </div>
      )}

      {/* 3-Second Resume Countdown */}
      {hud.phase === 'playing' && hud.resumeCountdown > 0 && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-black/35">
          <div
            key={hud.resumeCountdown}
            className="countdown-pop flex flex-col items-center justify-center rounded-3xl bg-[#0b131b]/90 border-2 border-amber-400/75 px-10 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.65)]"
          >
            <span className="text-xs font-extrabold uppercase tracking-[0.26em] text-amber-300">
              {isTr ? 'Hazır Ol' : 'Get Ready'}
            </span>
            <span className="font-mono-num mt-1 text-7xl sm:text-8xl font-black leading-none text-white drop-shadow-[0_4px_14px_rgba(251,191,36,0.45)]">
              {hud.resumeCountdown}
            </span>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {hud.phase === 'paused' && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xs rounded-3xl bg-[#101823] border border-white/12 p-6 text-center shadow-2xl">
            <h2 className="font-display text-2xl font-extrabold text-white">
              {isTr ? 'Oyun Duraklatıldı' : 'Game Paused'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {currentZoneText.title} · {hud.distance} m
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={onResume}
                className="w-full rounded-2xl bg-amber-400 py-3.5 text-base font-extrabold text-slate-950 hover:bg-amber-300 active:scale-98 transition-transform"
              >
                {isTr ? 'Koşuya Devam Et' : 'Resume Run'}
              </button>
              <button
                type="button"
                onClick={onMainMenu}
                className="w-full rounded-2xl bg-slate-800 py-3 text-sm font-bold text-slate-200 hover:bg-slate-700"
              >
                {isTr ? 'Ana Menü' : 'Main Menu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
