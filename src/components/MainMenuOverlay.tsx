import {
  ClipboardList,
  Play,
  Plus,
  Settings,
  ShoppingCart,
  Trophy,
} from 'lucide-react';
import { formatNum, getSkinName } from '../game/i18n';
import {
  SKINS,
  getMissionById,
  getReadyAchievementsCount,
  getScoreMultiplierFromMissions,
} from '../game/storage';
import { AppLanguage, SaveData } from '../game/types';
import { MissionsModal } from './MissionsModal';

interface MainMenuOverlayProps {
  save: SaveData;
  lang: AppLanguage;
  missionsOpen: boolean;
  canBuyCoins: boolean;
  onSetMissionsOpen: (open: boolean) => void;
  onStopCharacterVoice?: () => void;
  onStart: () => void;
  onOpenShop: (initialTab?: 'skins' | 'upgrades' | 'coins') => void;
  onOpenSettings: () => void;
  onClaimMission: (missionId: string) => void;
  onRerollMission: (missionId: string) => void;
  onClaimDailyQuest: (missionId: string) => void;
  onClaimDailyChest: () => void;
  onClaimAchievement: (achievementId: string) => void;
}

export function MainMenuOverlay({
  save,
  lang,
  missionsOpen,
  canBuyCoins,
  onSetMissionsOpen,
  onStopCharacterVoice,
  onStart,
  onOpenShop,
  onOpenSettings,
  onClaimMission,
  onRerollMission,
  onClaimDailyQuest,
  onClaimDailyChest,
  onClaimAchievement,
}: MainMenuOverlayProps) {
  const isTr = lang === 'tr';
  const activeSkin = SKINS.find((s) => s.id === save.selectedSkin) || SKINS[0];
  const activeSkinName = getSkinName(activeSkin.id, activeSkin.name, lang);
  const scoreMult = getScoreMultiplierFromMissions(save.missions.completedCount);

  const dailyClaimedCount = save.missions.dailyIds.filter((id) =>
    save.missions.dailyClaimedIds.includes(id),
  ).length;
  const dailyChestReady =
    dailyClaimedCount >= 3 && !save.missions.dailyChestClaimed;
  const dailyReadyCount =
    save.missions.dailyIds.filter((id) => {
      const def = getMissionById(id);
      if (!def || save.missions.dailyClaimedIds.includes(id)) return false;
      return (save.missions.dailyProgress[id] ?? 0) >= def.target;
    }).length + (dailyChestReady ? 1 : 0);

  const readyAchievementsCount = getReadyAchievementsCount(save);
  const totalClaimableCount =
    save.missions.claimableIds.length + dailyReadyCount + readyAchievementsCount;

  return (
    <div className="safe-inset-overlay pointer-events-none fixed inset-0 z-20 flex flex-col justify-between">
      {/* Top Bar: Settings + Missions Left · Shop + Coins Right */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="pointer-events-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label={isTr ? 'Ayarlar' : 'Settings'}
            title={isTr ? 'Ayarlar' : 'Settings'}
            className="group active:scale-95 transition-transform"
          >
            <span className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#111926]/90 border-2 border-white/75 text-white shadow-lg group-hover:bg-slate-800">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onStopCharacterVoice?.();
              onSetMissionsOpen(true);
            }}
            aria-label={isTr ? 'Görevler' : 'Missions'}
            title={isTr ? 'Görevler' : 'Missions'}
            className="group active:scale-95 transition-transform"
          >
            <span className="relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#111926]/90 border-2 border-emerald-400/80 text-emerald-300 shadow-lg group-hover:bg-slate-800">
              <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="absolute -bottom-1.5 -right-1.5 rounded-md bg-emerald-400 px-1 text-[9px] font-extrabold text-slate-950 shadow">
                {scoreMult}x
              </span>
              {totalClaimableCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 border-2 border-white px-1 text-[10px] font-extrabold text-white shadow animate-pulse">
                  {totalClaimableCount}
                </span>
              )}
            </span>
          </button>
        </div>

        <div className="pointer-events-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => onOpenShop('skins')}
            aria-label={isTr ? 'Mağaza' : 'Shop'}
            title={isTr ? 'Mağaza' : 'Shop'}
            className="group active:scale-95 transition-transform"
          >
            <span className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#111926]/90 border-2 border-white/75 text-white shadow-lg group-hover:bg-slate-800">
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
          </button>

          {canBuyCoins ? (
            <button
              type="button"
              onClick={() => onOpenShop('coins')}
              aria-label={isTr ? 'Kırıntı Satın Al' : 'Buy Crumbs'}
              className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-[#111926]/92 border-2 border-amber-300/75 pl-2 sm:pl-3 pr-1.5 py-1.5 shadow-lg hover:border-amber-300 active:scale-95 transition-all"
            >
              <span className="inline-block h-3.5 w-3.5 shrink-0 rotate-12 rounded-sm bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
              <span className="font-mono-num whitespace-nowrap text-xs sm:text-base font-extrabold text-white">
                {formatNum(save.totalCoins, lang)}
              </span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.55)]">
                <Plus className="h-3.5 w-3.5 stroke-[3]" />
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-[#111926]/92 border-2 border-white/60 px-2.5 sm:px-3.5 py-1.5 shadow-lg">
              <span className="inline-block h-3.5 w-3.5 shrink-0 rotate-12 rounded-sm bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
              <span className="font-mono-num whitespace-nowrap text-xs sm:text-base font-extrabold text-white">
                {formatNum(save.totalCoins, lang)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Center: Character Name + Chunky PLAY Button + Record */}
      <div className="mx-auto mb-3 sm:mb-5 flex w-full max-w-xs flex-col items-center gap-3">
        <div className="text-center select-none">
          <span className="rounded-full bg-black/55 border border-white/25 px-3.5 py-1 text-xs font-extrabold tracking-wide text-amber-300 shadow">
            {activeSkinName}
          </span>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="pointer-events-auto flex w-56 sm:w-64 items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-amber-400 via-orange-500 to-orange-600 border-[3px] border-slate-950 border-b-[6px] py-3.5 text-2xl font-extrabold tracking-wider text-white shadow-[0_12px_30px_rgba(249,115,22,0.5)] hover:brightness-105 active:translate-y-0.5 active:border-b-[3px] transition-all"
        >
          <Play className="h-6 w-6 fill-white" />
          <span>{isTr ? 'OYNA' : 'PLAY'}</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-extrabold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] select-none">
          <Trophy className="h-4 w-4 text-amber-400" />
          <span>{isTr ? 'Rekor:' : 'Best:'}</span>
          <span className="font-mono-num text-amber-300">
            {formatNum(save.highScore, lang)}
          </span>
        </div>
      </div>

      {/* Upgraded Missions Modal */}
      {missionsOpen && (
        <MissionsModal
          save={save}
          lang={lang}
          onClaimMission={onClaimMission}
          onRerollMission={onRerollMission}
          onClaimDailyQuest={onClaimDailyQuest}
          onClaimDailyChest={onClaimDailyChest}
          onClaimAchievement={onClaimAchievement}
          onClose={() => onSetMissionsOpen(false)}
        />
      )}
    </div>
  );
}
