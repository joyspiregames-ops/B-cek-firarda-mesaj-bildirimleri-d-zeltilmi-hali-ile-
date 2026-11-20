import { DialogueLine } from '../game/types';

interface ViralChatterBubbleProps {
  line: DialogueLine | null;
}

export function ViralChatterBubble({ line }: ViralChatterBubbleProps) {
  if (!line) return null;

  const accent = line.color || '#fbbf24';

  return (
    <div
      key={line.id + line.text}
      className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-20 w-[min(92vw,420px)] px-2"
    >
      <div
        className="relative flex items-center gap-3 rounded-2xl bg-[#0c141d]/92 px-4 py-3 shadow-2xl border"
        style={{ borderColor: `${accent}55` }}
      >
        {/* Stylized SVG Viral Cockroach Avatar */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10"
          style={{ backgroundColor: `${accent}22` }}
        >
          <svg
            viewBox="0 0 36 36"
            className="h-7 w-7"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M13 8C11 4 8 3 6 3M23 8C25 4 28 3 30 3"
              stroke={accent}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <ellipse cx="18" cy="21" rx="8" ry="10.5" fill={accent} />
            <circle cx="18" cy="10.5" r="4.5" fill="#1e293b" />
            <circle cx="16.3" cy="9.8" r="1.1" fill="#ffffff" />
            <circle cx="19.7" cy="9.8" r="1.1" fill="#ffffff" />
            <path
              d="M18 15V31M10 17L6 15M26 17L30 15M9 22L5 23M27 22L31 23M10 27L6 30M26 27L30 30"
              stroke="#0f172a"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
            <span style={{ color: accent }}>{line.speaker}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 font-semibold">{line.badge}</span>
          </div>
          <p className="mt-0.5 text-sm font-bold leading-snug text-white">
            “{line.text}”
          </p>
        </div>
      </div>
    </div>
  );
}
