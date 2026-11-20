import { Globe } from 'lucide-react';
import { AppLanguage, LanguagePreference } from '../game/types';

function TrCrestIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#dc2626" stroke="#ffffff" strokeWidth="1.4" />
      <circle cx="10.8" cy="12" r="5.1" fill="#ffffff" />
      <circle cx="12.3" cy="12" r="4.1" fill="#dc2626" />
      <polygon
        points="16.4,9.6 17.1,11.3 18.9,11.4 17.5,12.5 18,14.3 16.4,13.3 14.9,14.3 15.4,12.5 14,11.4 15.8,11.3"
        fill="#ffffff"
      />
    </svg>
  );
}

function EnCrestIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <clipPath id="en-crest-clip">
          <circle cx="12" cy="12" r="10.4" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="11" fill="#1e3a8a" stroke="#ffffff" strokeWidth="1.4" />
      <g clipPath="url(#en-crest-clip)">
        <path d="M2 2L22 22M22 2L2 22" stroke="#ffffff" strokeWidth="3.6" />
        <path d="M2 2L22 22M22 2L2 22" stroke="#ef4444" strokeWidth="1.6" />
        <path d="M12 1V23M1 12H23" stroke="#ffffff" strokeWidth="5.2" />
        <path d="M12 1V23M1 12H23" stroke="#ef4444" strokeWidth="3" />
      </g>
    </svg>
  );
}

interface SettingsLanguageSelectorProps {
  preference: LanguagePreference;
  resolvedLang: AppLanguage;
  detectedLang: AppLanguage;
  onChange: (pref: LanguagePreference) => void;
}

export function SettingsLanguageSelector({
  preference,
  resolvedLang,
  detectedLang,
  onChange,
}: SettingsLanguageSelectorProps) {
  const isTr = resolvedLang === 'tr';

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-slate-900/65 border border-white/15 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-extrabold text-white min-w-0">
          <Globe className="h-4 w-4 shrink-0 text-cyan-300" />
          <span className="truncate">
            {isTr ? 'Dil / Language' : 'Language / Dil'}
          </span>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-lg bg-slate-800/90 border border-white/10 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-cyan-300">
          {preference === 'auto'
            ? `${isTr ? 'OTOMATİK' : 'AUTO'} (${detectedLang.toUpperCase()})`
            : resolvedLang === 'tr'
              ? 'TÜRKÇE'
              : 'ENGLISH'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950/75 p-1 border border-white/10">
        <button
          type="button"
          onClick={() => onChange('auto')}
          className={`flex items-center justify-center gap-1 whitespace-nowrap rounded-lg py-2 px-1 text-[10.5px] sm:text-[11px] font-extrabold tracking-wide transition-all active:scale-95 ${
            preference === 'auto'
              ? 'bg-gradient-to-b from-emerald-400 to-teal-500 text-slate-950 border border-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.45)]'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Globe className="h-3.5 w-3.5 shrink-0" />
          <span>{isTr ? 'Otomatik' : 'Auto'}</span>
        </button>

        <button
          type="button"
          onClick={() => onChange('tr')}
          className={`flex items-center justify-center gap-1 whitespace-nowrap rounded-lg py-2 px-1 text-[10.5px] sm:text-[11px] font-extrabold tracking-wide transition-all active:scale-95 ${
            preference === 'tr'
              ? 'bg-gradient-to-b from-rose-500 to-red-600 text-white border border-rose-200/80 shadow-[0_0_12px_rgba(244,63,94,0.45)]'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <TrCrestIcon className="h-3.5 w-3.5 shrink-0" />
          <span>Türkçe</span>
        </button>

        <button
          type="button"
          onClick={() => onChange('en')}
          className={`flex items-center justify-center gap-1 whitespace-nowrap rounded-lg py-2 px-1 text-[10.5px] sm:text-[11px] font-extrabold tracking-wide transition-all active:scale-95 ${
            preference === 'en'
              ? 'bg-gradient-to-b from-cyan-400 to-blue-600 text-white border border-cyan-100/85 shadow-[0_0_12px_rgba(34,211,238,0.45)]'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <EnCrestIcon className="h-3.5 w-3.5 shrink-0" />
          <span>English</span>
        </button>
      </div>
    </div>
  );
}
