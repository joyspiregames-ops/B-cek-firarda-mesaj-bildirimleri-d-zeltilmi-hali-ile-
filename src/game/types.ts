export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover';

export type SkinId =
  | 'kivircik_riza'
  | 'tamirci_kazim'
  | 'diva_bocek'
  | 'duktur_bocek'
  | 'hahamcan';

export interface SkinConfig {
  id: SkinId;
  name: string;
  subtitle: string;
  cost: number;
  carapaceColor: number;
  shirtColor: number;
  accentColor: number;
  voicePitch: number;
}

export type ZoneId =
  | 'mahalle_caddesi'
  | 'yeralti_magarasi'
  | 'buzul_dunyasi'
  | 'ates_diyari'
  | 'dev_mutfak'
  | 'kopuklu_banyo'
  | 'cilgin_lab'
  | 'peynir_galaksisi';

export interface ZoneConfig {
  id: ZoneId;
  title: string;
  subtitle: string;
  skyColor: number;
  fogColor: number;
  buildingTint: number;
  lampColor: number;
  lightIntensity: number;
  isDark: boolean;
  ambienceType:
    | 'street_evening'
    | 'earth_cavern'
    | 'ice_wind'
    | 'fire_volcano'
    | 'kitchen_clatter'
    | 'bath_bubbles'
    | 'lab_hum'
    | 'space_synth';
}

export type PowerupType = 'magnet' | 'shield' | 'flashlight' | 'turbo' | 'wings';
export type UpgradeKey = PowerupType;

export type MissionCategory =
  | 'birikimli'
  | 'tek_kosu'
  | 'bolge'
  | 'karakter'
  | 'guc';

export type MissionMetric =
  | 'distance'
  | 'coins'
  | 'rolls'
  | 'jumps'
  | 'nearMisses'
  | 'flights'
  | 'powerups'
  | 'magnets'
  | 'shields'
  | 'flashlights'
  | 'turbos'
  | 'score'
  | 'zone';

export interface MissionDef {
  id: string;
  title: string;
  category: MissionCategory;
  tier: number;
  metric: MissionMetric;
  target: number;
  zoneId?: ZoneId;
  requiredSkin?: SkinId;
  rewardCoins: number;
}

export interface MissionProgress {
  activeIds: string[];
  progress: Record<string, number>;
  claimableIds: string[];
  completedCount: number;
  rerollDate: string | null;
  dailyDate: string | null;
  dailyIds: string[];
  dailyProgress: Record<string, number>;
  dailyClaimedIds: string[];
  dailyChestClaimed: boolean;
}

export type AchievementCategory = 'karakter' | 'sahne' | 'ustalik';

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  category: AchievementCategory;
  type:
    | 'unlock_skin'
    | 'skin_distance'
    | 'reach_zone'
    | 'total_flights'
    | 'total_coins'
    | 'total_distance';
  skinId?: SkinId;
  zoneId?: ZoneId;
  target: number;
  rewardCoins: number;
}

export interface AchievementProgress {
  progress: Record<string, number>;
  claimedIds: string[];
}

export interface NotificationState {
  v?: number;
  enabled: boolean;
  userDisabledInSettings: boolean;
  lastOpenedDate: string;
  lastPromptDate: string | null;
  lastDailyNotifyDate: string | null;
  lastPrimeNotifyDate: string | null;
  lastSentDate: string | null;
  sentCountDate: string | null;
  sentCountToday: number;
  usedDailyMsgIds: number[];
  usedPrimeMsgIds: number[];
}

export type DialogueTrigger =
  | 'start'
  | 'random'
  | 'darkness'
  | 'flashlight'
  | 'near_miss'
  | 'street_zone'
  | 'earth_zone'
  | 'ice_zone'
  | 'fire_zone'
  | 'kitchen_zone'
  | 'bath_zone'
  | 'lab_zone'
  | 'space_zone'
  | 'magnet'
  | 'shield_break'
  | 'crash'
  | 'revive';

export interface DialogueLine {
  id: string;
  speaker: string;
  badge: string;
  text: string;
  trigger: DialogueTrigger;
  audioUrl?: string;
  pitch?: number;
  rate?: number;
  color?: string;
}

export type GraphicsQuality = 'low' | 'medium' | 'high';
export type AppLanguage = 'tr' | 'en';
export type LanguagePreference = 'auto' | AppLanguage;

export interface DailyRewardState {
  lastClaimDate: string | null;
  streak: number;
}

export interface SaveData {
  highScore: number;
  totalCoins: number;
  unlockedSkins: SkinId[];
  selectedSkin: SkinId;
  sfxEnabled: boolean;
  ambienceEnabled: boolean;
  sfxVolume: number;
  ambienceVolume: number;
  graphicsQuality: GraphicsQuality;
  totalRuns: number;
  upgrades: Record<UpgradeKey, number>;
  missions: MissionProgress;
  achievements: AchievementProgress;
  dailyReward: DailyRewardState;
  notifications: NotificationState;
  languagePreference: LanguagePreference;
}

export interface RunMetrics {
  distance: number;
  coins: number;
  rolls: number;
  jumps: number;
  nearMisses: number;
  flights: number;
  powerups: number;
  magnets: number;
  shields: number;
  flashlights: number;
  turbos: number;
  zonesReached: ZoneId[];
}

export interface HudSnapshot {
  phase: GamePhase;
  score: number;
  distance: number;
  coins: number;
  highScore: number;
  speedMultiplier: number;
  combo: number;
  stumbleTimer: number;
  zone: ZoneConfig;
  activePowerups: {
    magnet: number;
    flashlight: number;
    turbo: number;
    wings: number;
    shield: boolean;
  };
  deathReason: string;
  deathReasonKey: string;
  isNewRecord: boolean;
  continueCount: number;
  adReviveUsed: boolean;
  resumeCountdown: number;
  metrics: RunMetrics;
}
