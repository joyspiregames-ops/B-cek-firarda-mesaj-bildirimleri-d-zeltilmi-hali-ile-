import {
  Award,
  CalendarDays,
  CheckCircle2,
  Compass,
  Flame,
  Gift,
  MapPin,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  MISSION_CATEGORY_LABELS,
  formatNum,
  getAchievementDisplay,
  getMissionTitle,
} from '../game/i18n';
import {
  ACHIEVEMENT_POOL,
  DAILY_CHEST_BONUS,
  getAchievementValue,
  getBugRank,
  getLocalDateKey,
  getMissionById,
  getReadyAchievementsCount,
  getScoreMultiplierFromMissions,
} from '../game/storage';
import {
  AchievementCategory,
  AppLanguage,
  MissionCategory,
  SaveData,
} from '../game/types';

interface MissionsModalProps {
  save: SaveData;
  lang: AppLanguage;
  onClaimMission: (missionId: string) => void;
  onRerollMission: (missionId: string) => void;
  onClaimDailyQuest: (missionId: string) => void;
  onClaimDailyChest: () => void;
  onClaimAchievement: (achievementId: string) => void;
  onClose: () => void;
}

const CATEGORY_CLASS: Record<MissionCategory, string> = {
  birikimli: 'bg-sky-500/20 border-sky-400/40 text-sky-300',
  tek_kosu: 'bg-amber-500/20 border-amber-400/45 text-amber-300',
  bolge: 'bg-fuchsia-500/20 border-fuchsia-400/45 text-fuchsia-300',
  karakter: 'bg-emerald-500/20 border-emerald-400/45 text-emerald-300',
  guc: 'bg-cyan-500/20 border-cyan-400/45 text-cyan-300',
};

const ACHIEVEMENT_CLASS: Record<AchievementCategory, string> = {
  karakter: 'bg-emerald-500/20 border-emerald-400/45 text-emerald-300',
  sahne: 'bg-fuchsia-500/20 border-fuchsia-400/45 text-fuchsia-300',
  ustalik: 'bg-cyan-500/20 border-cyan-400/45 text-cyan-300',
};

export function MissionsModal({
  save,
  lang,
  onClaimMission,
  onRerollMission,
  onClaimDailyQuest,
  onClaimDailyChest,
  onClaimAchievement,
  onClose,
}: MissionsModalProps) {
  const isTr = lang === 'tr';
  const [tab, setTab] = useState<'set' | 'daily' | 'achievements'>('set');
  const [achFilter, setAchFilter] = useState<'all' | AchievementCategory>('all');
  const scoreMult = getScoreMultiplierFromMissions(save.missions.completedCount);
  const rank = getBugRank(save.missions.completedCount, lang);
  const todayKey = getLocalDateKey();
  const canRerollToday = save.missions.rerollDate !== todayKey;

  const nextMultProgress = save.missions.completedCount % 2;

  const dailyClaimedCount = save.missions.dailyIds.filter((id) =>
    save.missions.dailyClaimedIds.includes(id),
  ).length;
  const dailyChestReady =
    dailyClaimedCount >= 3 && !save.missions.dailyChestClaimed;

  const setReadyCount = save.missions.claimableIds.length;
  const dailyReadyCount =
    save.missions.dailyIds.filter((id) => {
      const def = getMissionById(id);
      if (!def || save.missions.dailyClaimedIds.includes(id)) return false;
      return (save.missions.dailyProgress[id] ?? 0) >= def.target;
    }).length + (dailyChestReady ? 1 : 0);
  const readyAchievementsCount = getReadyAchievementsCount(save);

  const filteredAchievements = ACHIEVEMENT_POOL.filter(
    (a) => achFilter === 'all' || a.category === achFilter,
  ).sort((a, b) => {
    const aClaimed = save.achievements.claimedIds.includes(a.id);
    const bClaimed = save.achievements.claimedIds.includes(b.id);
    const aReady = !aClaimed && getAchievementValue(a, save) >= a.target;
    const bReady = !bClaimed && getAchievementValue(b, save) >= b.target;
    if (aReady !== bReady) return aReady ? -1 : 1;
    if (aClaimed !== bClaimed) return aClaimed ? 1 : -1;
    return 0;
  });

  const claimedAchCount = save.achievements.claimedIds.length;

  return (
    <div
      className="safe-inset-overlay pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/78"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-[#0f1626] border-2 border-emerald-400/80 p-5 shadow-[0_0_45px_rgba(16,185,129,0.24)] max-h-[88dvh] flex flex-col">
        <button
          type="button"
          onClick={onClose}
          aria-label={isTr ? 'Kapat' : 'Close'}
          className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 border-2 border-white text-white shadow-lg hover:bg-rose-400 active:scale-95 transition-transform"
        >
          <X className="h-5 w-5 stroke-[3]" />
        </button>

        {/* Header & Rank Banner */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-extrabold tracking-wide text-white">
                {isTr ? 'GÖREVLER' : 'MISSIONS'}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400/20 border border-amber-400/45 px-2 py-0.5 text-[10px] font-extrabold text-amber-300">
                <Award className="h-3 w-3" />
                {rank.title}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {rank.nextTitle
                ? isTr
                  ? `Sonraki rütbe (${rank.nextTitle}) için ${rank.remainingForNext} görev`
                  : `${rank.remainingForNext} missions until ${rank.nextTitle}`
                : isTr
                  ? 'En yüksek böcek rütbesine ulaştın!'
                  : 'You reached the highest bug rank!'}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block rounded-xl bg-emerald-500/20 border border-emerald-400/60 px-2.5 py-1 text-xs font-extrabold text-emerald-300">
              {isTr ? 'Skor' : 'Score'}: {scoreMult}x
            </span>
            <div className="mt-1 text-[10px] font-bold text-slate-400">
              {isTr
                ? `+1x için ${nextMultProgress}/2`
                : `+1x in ${nextMultProgress}/2`}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-900/90 p-1 border border-white/10">
          <button
            type="button"
            onClick={() => setTab('set')}
            className={`relative flex items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-extrabold transition-colors ${
              tab === 'set'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Target className="h-3.5 w-3.5 shrink-0" />
            <span>{isTr ? 'Gelişim' : 'Progress'}</span>
            {setReadyCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white">
                {setReadyCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('daily')}
            className={`relative flex items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-extrabold transition-colors ${
              tab === 'daily'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>{isTr ? 'Günlük' : 'Daily'}</span>
            {dailyReadyCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white">
                {dailyReadyCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('achievements')}
            className={`relative flex items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-extrabold transition-colors ${
              tab === 'achievements'
                ? 'bg-fuchsia-400 text-slate-950 shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Trophy className="h-3.5 w-3.5 shrink-0" />
            <span>{isTr ? 'Hedefler' : 'Goals'}</span>
            {readyAchievementsCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white">
                {readyAchievementsCount}
              </span>
            )}
          </button>
        </div>

        {/* Scrollable Quest List */}
        <div className="mt-3 flex-1 overflow-y-auto pr-0.5 flex flex-col gap-2.5">
          {tab === 'set' && (
            <>
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                <span>
                  {isTr
                    ? 'Her 2 görev kalıcı skor çarpanını +1x artırır.'
                    : 'Every 2 missions grants +1x permanent score.'}
                </span>
                <span className="font-bold text-cyan-300 shrink-0 ml-2">
                  {canRerollToday
                    ? isTr
                      ? '1x Ücretsiz Değişim'
                      : '1x Free Swap'
                    : isTr
                      ? 'Değişim Kullanıldı'
                      : 'Swap Used'}
                </span>
              </div>

              {save.missions.activeIds.map((id) => {
                const def = getMissionById(id);
                if (!def) return null;
                const isClaimable = save.missions.claimableIds.includes(id);
                const val = isClaimable
                  ? def.target
                  : Math.min(def.target, save.missions.progress[id] ?? 0);
                const pct = Math.min(100, Math.round((val / def.target) * 100));
                const badgeClass = CATEGORY_CLASS[def.category];
                const badgeLabel = MISSION_CATEGORY_LABELS[lang][def.category];
                const title = getMissionTitle(def.id, def.title, lang);

                return (
                  <div
                    key={id}
                    className={`rounded-2xl border p-3 transition-all ${
                      isClaimable
                        ? 'bg-emerald-500/15 border-emerald-400/75 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                        : 'bg-slate-900/90 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold ${badgeClass}`}
                        >
                          {badgeLabel}
                        </span>
                        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-300">
                          {isTr ? 'SET' : 'TIER'} {def.tier}
                        </span>
                      </div>

                      <span className="font-mono-num text-xs font-extrabold text-amber-300">
                        +{def.rewardCoins} {isTr ? 'kırıntı' : 'crumbs'}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-white">
                        {title}
                      </span>

                      {!isClaimable && canRerollToday && (
                        <button
                          type="button"
                          onClick={() => onRerollMission(id)}
                          title={isTr ? 'Bu görevi değiştir' : 'Swap this mission'}
                          className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-800 border border-white/15 px-2 py-1 text-[10px] font-bold text-cyan-300 hover:bg-slate-700 active:scale-95"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>{isTr ? 'Değiştir' : 'Swap'}</span>
                        </button>
                      )}
                    </div>

                    {isClaimable ? (
                      <button
                        type="button"
                        onClick={() => onClaimMission(id)}
                        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-emerald-300 to-emerald-500 border border-slate-950 border-b-[3px] py-2 text-xs font-extrabold text-slate-950 shadow hover:brightness-105 active:translate-y-0.5"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>
                          {isTr
                            ? `ÖDÜLÜ AL (+${def.rewardCoins} KIRINTI)`
                            : `CLAIM REWARD (+${def.rewardCoins} CRUMBS)`}
                        </span>
                      </button>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono-num text-[11px] font-bold text-slate-300">
                          {formatNum(val, lang)}/{formatNum(def.target, lang)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {tab === 'daily' && (
            <>
              {/* Daily Grand Chest */}
              <div
                className={`rounded-2xl border p-3.5 ${
                  dailyChestReady
                    ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/20 border-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.28)]'
                    : save.missions.dailyChestClaimed
                      ? 'bg-emerald-500/12 border-emerald-400/45'
                      : 'bg-slate-900/90 border-amber-400/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                      <Gift className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white">
                        {isTr
                          ? `Günlük Büyük Kasa (${dailyClaimedCount}/3)`
                          : `Daily Grand Chest (${dailyClaimedCount}/3)`}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {isTr
                          ? '3 günlük görevi bitirip ödülünü al!'
                          : 'Complete 3 daily missions for a bonus!'}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono-num text-xs font-extrabold text-amber-300">
                    +{DAILY_CHEST_BONUS}
                  </span>
                </div>

                {dailyChestReady && (
                  <button
                    type="button"
                    onClick={onClaimDailyChest}
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-300 to-orange-500 border border-slate-950 border-b-[3px] py-2 text-xs font-extrabold text-slate-950 shadow hover:brightness-105"
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span>
                      {isTr
                        ? `KASAYI AÇ (+${DAILY_CHEST_BONUS} KIRINTI)`
                        : `OPEN CHEST (+${DAILY_CHEST_BONUS} CRUMBS)`}
                    </span>
                  </button>
                )}

                {save.missions.dailyChestClaimed && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      {isTr
                        ? 'Bugünkü Büyük Kasa Alındı!'
                        : "Today's Grand Chest Claimed!"}
                    </span>
                  </div>
                )}
              </div>

              {save.missions.dailyIds.map((id) => {
                const def = getMissionById(id);
                if (!def) return null;
                const isClaimed = save.missions.dailyClaimedIds.includes(id);
                const val = Math.min(
                  def.target,
                  save.missions.dailyProgress[id] ?? 0,
                );
                const isReady = !isClaimed && val >= def.target;
                const pct = Math.min(100, Math.round((val / def.target) * 100));
                const title = getMissionTitle(def.id, def.title, lang);

                return (
                  <div
                    key={id}
                    className={`rounded-2xl border p-3 ${
                      isClaimed
                        ? 'bg-emerald-500/10 border-emerald-400/35 opacity-80'
                        : isReady
                          ? 'bg-amber-400/15 border-amber-300'
                          : 'bg-slate-900/90 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-white">
                      <span className="flex items-center gap-1.5">
                        {def.category === 'tek_kosu' && (
                          <Compass className="h-3.5 w-3.5 text-amber-300" />
                        )}
                        <span>{title}</span>
                      </span>
                      <span className="font-mono-num text-amber-300 shrink-0">
                        +{def.rewardCoins} {isTr ? 'kırıntı' : 'crumbs'}
                      </span>
                    </div>

                    {isClaimed ? (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{isTr ? 'Tamamlandı' : 'Completed'}</span>
                      </div>
                    ) : isReady ? (
                      <button
                        type="button"
                        onClick={() => onClaimDailyQuest(id)}
                        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 border border-slate-950 border-b-[3px] py-2 text-xs font-extrabold text-slate-950 shadow hover:brightness-105"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>
                          {isTr
                            ? `ÖDÜLÜ AL (+${def.rewardCoins} KIRINTI)`
                            : `CLAIM REWARD (+${def.rewardCoins} CRUMBS)`}
                        </span>
                      </button>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono-num text-[11px] font-bold text-slate-300">
                          {formatNum(val, lang)}/{formatNum(def.target, lang)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {tab === 'achievements' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-1.5 px-0.5">
                <span className="text-[11px] text-slate-400">
                  {isTr ? 'Kalıcı hedefler' : 'Permanent goals'} (
                  {claimedAchCount}/{ACHIEVEMENT_POOL.length})
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {(
                    [
                      { key: 'all', label: isTr ? 'Tümü' : 'All' },
                      { key: 'karakter', label: isTr ? 'Karakter' : 'Heroes' },
                      { key: 'sahne', label: isTr ? 'Sahneler' : 'Stages' },
                      { key: 'ustalik', label: isTr ? 'Ustalık' : 'Mastery' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setAchFilter(f.key)}
                      className={`rounded-lg px-2 py-1 text-[10px] font-extrabold transition-colors ${
                        achFilter === f.key
                          ? 'bg-fuchsia-400 text-slate-950'
                          : 'bg-slate-800/90 text-slate-300 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredAchievements.map((def) => {
                const isClaimed = save.achievements.claimedIds.includes(def.id);
                const rawVal = getAchievementValue(def, save);
                const val = Math.min(def.target, rawVal);
                const isReady = !isClaimed && val >= def.target;
                const pct = Math.min(100, Math.round((val / def.target) * 100));
                const badgeClass = ACHIEVEMENT_CLASS[def.category];
                const badgeLabel =
                  ACHIEVEMENT_CATEGORY_LABELS[lang][def.category];
                const achText = getAchievementDisplay(
                  def.id,
                  def.title,
                  def.desc,
                  lang,
                );

                const Icon =
                  def.category === 'karakter'
                    ? UserCheck
                    : def.category === 'sahne'
                      ? MapPin
                      : Zap;

                return (
                  <div
                    key={def.id}
                    className={`rounded-2xl border p-3 transition-all ${
                      isClaimed
                        ? 'bg-emerald-500/10 border-emerald-400/35 opacity-80'
                        : isReady
                          ? 'bg-fuchsia-500/15 border-fuchsia-400 shadow-[0_0_20px_rgba(232,121,249,0.22)]'
                          : 'bg-slate-900/90 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold ${badgeClass}`}
                      >
                        <Icon className="h-2.5 w-2.5" />
                        <span>{badgeLabel}</span>
                      </span>

                      <span className="font-mono-num text-xs font-extrabold text-amber-300">
                        +{def.rewardCoins} {isTr ? 'kırıntı' : 'crumbs'}
                      </span>
                    </div>

                    <div className="mt-1.5 text-xs font-extrabold text-white">
                      {achText.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {achText.desc}
                    </div>

                    {isClaimed ? (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{isTr ? 'Tamamlandı' : 'Completed'}</span>
                      </div>
                    ) : isReady ? (
                      <button
                        type="button"
                        onClick={() => onClaimAchievement(def.id)}
                        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-fuchsia-300 to-fuchsia-500 border border-slate-950 border-b-[3px] py-2 text-xs font-extrabold text-slate-950 shadow hover:brightness-105 active:translate-y-0.5"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>
                          {isTr
                            ? `ÖDÜLÜ AL (+${def.rewardCoins} KIRINTI)`
                            : `CLAIM REWARD (+${def.rewardCoins} CRUMBS)`}
                        </span>
                      </button>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono-num text-[11px] font-bold text-slate-300">
                          {formatNum(val, lang)}/{formatNum(def.target, lang)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
