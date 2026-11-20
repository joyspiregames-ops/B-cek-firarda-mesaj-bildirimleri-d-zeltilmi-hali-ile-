import { Bell, BellOff, Music, Volume2, VolumeX, X } from 'lucide-react';
import { formatNum } from '../game/i18n';
import {
  AppLanguage,
  GraphicsQuality,
  LanguagePreference,
  SaveData,
} from '../game/types';
import { SettingsLanguageSelector } from './LanguageSwitchButton';

interface SettingsModalProps {
  save: SaveData;
  lang: AppLanguage;
  detectedLang: AppLanguage;
  browserPermission: NotificationPermission | 'unsupported';
  isEmbedded: boolean;
  notifFeedback: string | null;
  onChangeSfxVolume: (val: number) => void;
  onChangeAmbienceVolume: (val: number) => void;
  onToggleSfx: () => void;
  onToggleAmbience: () => void;
  onToggleNotifications: () => void;
  onChangeQuality: (quality: GraphicsQuality) => void;
  onChangeLanguage: (pref: LanguagePreference) => void;
  onClose: () => void;
}

export function SettingsModal({
  save,
  lang,
  detectedLang,
  browserPermission,
  isEmbedded,
  notifFeedback,
  onChangeSfxVolume,
  onChangeAmbienceVolume,
  onToggleSfx,
  onToggleAmbience,
  onToggleNotifications,
  onChangeQuality,
  onChangeLanguage,
  onClose,
}: SettingsModalProps) {
  const isTr = lang === 'tr';

  const qualities: { id: GraphicsQuality; label: string; activeClass: string }[] = [
    {
      id: 'low',
      label: isTr ? 'DÜŞÜK' : 'LOW',
      activeClass: 'bg-sky-500 border-sky-300 text-white shadow-sky-500/30',
    },
    {
      id: 'medium',
      label: isTr ? 'ORTA' : 'MEDIUM',
      activeClass: 'bg-emerald-500 border-emerald-300 text-white shadow-emerald-500/30',
    },
    {
      id: 'high',
      label: isTr ? 'YÜKSEK' : 'HIGH',
      activeClass: 'bg-orange-500 border-orange-300 text-white shadow-orange-500/30',
    },
  ];

  const notifOn =
    save.notifications.enabled &&
    (browserPermission === 'granted' || isEmbedded);

  return (
    <div
      className="safe-inset-overlay touch-pan-y fixed inset-0 z-40 overflow-y-auto bg-black/55"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Top-left Red Close Button + Top-right Kırıntı */}
      <button
        type="button"
        onClick={onClose}
        aria-label={isTr ? 'Kapat' : 'Close'}
        className="safe-top-corner-left fixed z-10 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-rose-500 border-2 border-white text-white shadow-xl hover:bg-rose-400 active:scale-95 transition-transform"
      >
        <X className="h-5 w-5 sm:h-6 sm:w-6 stroke-[3]" />
      </button>

      <div className="safe-top-corner-right fixed z-10 flex items-center gap-2 rounded-full bg-slate-900/90 border-2 border-white/40 px-3.5 py-1.5 sm:px-4 shadow-xl">
        <span className="inline-block h-3.5 w-3.5 rotate-12 rounded-sm bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
        <span className="font-mono-num text-sm sm:text-base font-extrabold text-white">
          {formatNum(save.totalCoins, lang)}
        </span>
      </div>

      {/* Main Options Card */}
      <div className="flex min-h-full items-center justify-center pt-16 pb-3 sm:pt-14 sm:pb-4">
        <div className="relative w-full max-w-sm rounded-[28px] bg-[#2a3342] border-[3px] border-white/85 px-4 sm:px-6 pt-8 pb-5 shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
          {/* Overlapping Header Plaque */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-2xl bg-[#3c4657] border-[3px] border-white/90 px-7 sm:px-8 py-1.5 shadow-lg">
            <h2 className="font-display text-lg sm:text-xl font-extrabold tracking-wide text-white">
              {isTr ? 'AYARLAR' : 'SETTINGS'}
            </h2>
          </div>

          {/* Audio Sliders & Language & Notifications */}
          <div className="mt-2 flex flex-col gap-3.5">
          {/* Ortam Sesi */}
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onToggleAmbience}
              aria-label={
                isTr ? 'Ortam sesini aç veya kapat' : 'Toggle ambience sound'
              }
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 transition-colors ${
                save.ambienceEnabled
                  ? 'bg-slate-800 border-white/60 text-white'
                  : 'bg-slate-900 border-slate-600 text-slate-500'
              }`}
            >
              <Music className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-200 mb-1.5">
                <span>{isTr ? 'Ortam Sesi' : 'Ambience'}</span>
                <span className="font-mono-num text-emerald-300">
                  {save.ambienceEnabled
                    ? `${Math.round(save.ambienceVolume * 100)}%`
                    : isTr
                      ? 'Kapalı'
                      : 'Off'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={save.ambienceEnabled ? Math.round(save.ambienceVolume * 100) : 0}
                onChange={(e) => onChangeAmbienceVolume(Number(e.target.value) / 100)}
                className="w-full h-3 rounded-full appearance-none bg-slate-900/90 border border-white/25 accent-emerald-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Efekt Sesi */}
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onToggleSfx}
              aria-label={
                isTr ? 'Efekt sesini aç veya kapat' : 'Toggle sound effects'
              }
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 transition-colors ${
                save.sfxEnabled
                  ? 'bg-slate-800 border-white/60 text-white'
                  : 'bg-slate-900 border-slate-600 text-slate-500'
              }`}
            >
              {save.sfxEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </button>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-200 mb-1.5">
                <span>{isTr ? 'Efekt Sesi' : 'Sound FX'}</span>
                <span className="font-mono-num text-amber-300">
                  {save.sfxEnabled
                    ? `${Math.round(save.sfxVolume * 100)}%`
                    : isTr
                      ? 'Kapalı'
                      : 'Off'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={save.sfxEnabled ? Math.round(save.sfxVolume * 100) : 0}
                onChange={(e) => onChangeSfxVolume(Number(e.target.value) / 100)}
                className="w-full h-3 rounded-full appearance-none bg-slate-900/90 border border-white/25 accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Dil / Language */}
          <SettingsLanguageSelector
            preference={save.languagePreference}
            resolvedLang={lang}
            detectedLang={detectedLang}
            onChange={onChangeLanguage}
          />

          {/* Bildirimler */}
          <div className="flex flex-col gap-1.5 rounded-2xl bg-slate-900/65 border border-white/15 px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    notifOn
                      ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                      : 'bg-slate-800 border-white/15 text-slate-400'
                  }`}
                >
                  {notifOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </div>
                <div>
                  <div className="text-xs font-extrabold text-white">
                    {isTr ? 'Bildirimler' : 'Notifications'}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400">
                    {!isEmbedded && browserPermission === 'denied'
                      ? isTr
                        ? 'Cihaz/tarayıcı izni engelli'
                        : 'Device/browser permission blocked'
                      : isTr
                        ? 'Oyundan haberdar ol'
                        : 'Stay updated on rewards'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleNotifications}
                className={`rounded-full border-2 px-4 py-1.5 text-xs font-extrabold tracking-wide transition-all active:scale-95 ${
                  notifOn
                    ? 'bg-emerald-400 border-emerald-200 text-slate-950 shadow-md shadow-emerald-500/25'
                    : 'bg-slate-800 border-white/25 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {notifOn ? (isTr ? 'AÇIK' : 'ON') : isTr ? 'KAPALI' : 'OFF'}
              </button>
            </div>
            {notifFeedback && (
              <div className="text-[10px] font-bold text-amber-300 leading-snug">
                {notifFeedback}
              </div>
            )}
          </div>
        </div>

        {/* Graphics Quality */}
        <div className="mt-4 text-center">
          <div className="inline-block rounded-full bg-slate-700/90 border-2 border-white/40 px-5 py-1 text-xs font-extrabold tracking-widest text-white">
            {isTr ? 'GRAFİK KALİTESİ' : 'GRAPHICS QUALITY'}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {qualities.map((q) => {
              const active = save.graphicsQuality === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onChangeQuality(q.id)}
                  className={`rounded-full border-2 py-2.5 text-xs font-extrabold tracking-wide transition-transform active:scale-95 ${
                    active
                      ? `${q.activeClass} shadow-lg scale-[1.03]`
                      : 'bg-slate-800/90 border-white/20 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {q.label}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-[11px] font-bold text-slate-300">
            {save.graphicsQuality === 'low'
              ? isTr
                ? 'Düşük Çözünürlük · Gölgesiz · Yansımasız · Yakın Görüş'
                : 'Low Res · No Shadows · No Reflections · Short Draw'
              : save.graphicsQuality === 'medium'
                ? isTr
                  ? '1x Çözünürlük · 512px Gölge · Dengeli Yansıma & Görüş'
                  : '1x Res · 512px Shadows · Balanced Reflections & View'
                : isTr
                  ? 'HD Çözünürlük · 1024px Gölge · Tam Yansıma & Ufuk'
                  : 'HD Res · 1024px Shadows · Full Reflections & Horizon'}
          </p>
        </div>

          {/* Controls Footer Pill */}
          <div className="mt-3.5 rounded-2xl bg-slate-900/65 border border-white/15 px-3.5 py-2 text-center text-[11px] sm:text-xs font-bold text-slate-300">
            {isTr
              ? 'Kaydır: Sol / Orta / Sağ · Yukarı: Zıpla · Aşağı: Takla'
              : 'Swipe: Left / Center / Right · Up: Jump · Down: Roll'}
          </div>
        </div>
      </div>
    </div>
  );
}
