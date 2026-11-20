import {
  AchievementDef,
  AppLanguage,
  DailyRewardState,
  LanguagePreference,
  MissionDef,
  NotificationState,
  RunMetrics,
  SaveData,
  SkinConfig,
  SkinId,
  UpgradeKey,
} from './types';

export const SKINS: SkinConfig[] = [
  {
    id: 'kivircik_riza',
    name: 'Kıvırcık Rıza',
    subtitle: 'Mahallenin fenomeni · Turuncu tişört & kıvırcık saç',
    cost: 0,
    carapaceColor: 0x6e3514,
    shirtColor: 0xea580c,
    accentColor: 0xfbbf24,
    voicePitch: 1.05,
  },
  {
    id: 'tamirci_kazim',
    name: 'Tamirci Kazım',
    subtitle: 'Usta tamirci · Lacivert tulum & tamirci gözlüğü',
    cost: 1800,
    carapaceColor: 0x7c4a26,
    shirtColor: 0x1e3a5f,
    accentColor: 0x38bdf8,
    voicePitch: 0.82,
  },
  {
    id: 'diva_bocek',
    name: 'Diva',
    subtitle: 'Divalar yemek yapmaz · Fuşya ceket, kürk & taç',
    cost: 4200,
    carapaceColor: 0x7e2954,
    shirtColor: 0xbe185d,
    accentColor: 0xfde047,
    voicePitch: 1.32,
  },
  {
    id: 'duktur_bocek',
    name: 'Acilci Duktur',
    subtitle: 'Duktur yetişti · Beyaz önlük & baş aynası',
    cost: 8500,
    carapaceColor: 0x5c2c12,
    shirtColor: 0xf8fafc,
    accentColor: 0x0ea5e9,
    voicePitch: 0.88,
  },
  {
    id: 'hahamcan',
    name: 'Hahamcan',
    subtitle: 'Bilge usta · Pembe uzun palto, şapka & altın köstek',
    cost: 15000,
    carapaceColor: 0x542914,
    shirtColor: 0xf472b6,
    accentColor: 0xfbbf24,
    voicePitch: 0.78,
  },
];

export interface UpgradeInfo {
  key: UpgradeKey;
  name: string;
  desc: string;
  baseCost: number;
  maxLevel: number;
  accentHex: string;
}

export const UPGRADE_CATALOG: UpgradeInfo[] = [
  {
    key: 'wings',
    name: 'Jetpack Uçuşu',
    desc: 'Fosfor gazlı jetpack ile havada uçuş süresini uzatır',
    baseCost: 90,
    maxLevel: 5,
    accentHex: '#22d3ee',
  },
  {
    key: 'magnet',
    name: 'Kırıntı Mıknatısı',
    desc: 'Simit kırıntılarını daha uzun süre çeker',
    baseCost: 80,
    maxLevel: 5,
    accentHex: '#a855f7',
  },
  {
    key: 'turbo',
    name: 'Turbo Fırlatma',
    desc: '2x skorlu süper hız süresini uzatır',
    baseCost: 100,
    maxLevel: 5,
    accentHex: '#f97316',
  },
  {
    key: 'flashlight',
    name: 'Kafa Feneri',
    desc: 'Karanlık sokakta aydınlatma ve 2x puan süresi',
    baseCost: 75,
    maxLevel: 5,
    accentHex: '#facc15',
  },
  {
    key: 'shield',
    name: 'Çarpma Kalkanı',
    desc: 'Kalkan kırıldıktan sonraki koruma süresini artırır',
    baseCost: 85,
    maxLevel: 5,
    accentHex: '#22d3ee',
  },
];

export interface CoinPackInfo {
  id: 'kirinti_1' | 'kirinti_2' | 'kirinti_3';
  name: string;
  desc: string;
  coins: number;
  badge?: string;
}

export const COIN_PACKS: CoinPackInfo[] = [
  {
    id: 'kirinti_1',
    name: 'Küçük Kırıntı',
    desc: 'Güçlendirme ve canlanma için ideal',
    coins: 1200,
  },
  {
    id: 'kirinti_2',
    name: 'Kırıntı Çuvalı',
    desc: 'Diva ve ekstra güçler için',
    coins: 4500,
    badge: 'Popüler',
  },
  {
    id: 'kirinti_3',
    name: 'Dev Hazine',
    desc: 'Acilci Duktur ve tam stok',
    coins: 10000,
    badge: 'En Avantajlı',
  },
];

export const MISSION_POOL: MissionDef[] = [
  // SET 1 - Başlangıç
  {
    id: 'm_dist_400',
    title: '400 metre koş',
    category: 'birikimli',
    tier: 1,
    metric: 'distance',
    target: 400,
    rewardCoins: 60,
  },
  {
    id: 'm_coins_35',
    title: '35 simit kırıntısı topla',
    category: 'birikimli',
    tier: 1,
    metric: 'coins',
    target: 35,
    rewardCoins: 55,
  },
  {
    id: 'm_rolls_6',
    title: '6 kez parkur taklası at',
    category: 'birikimli',
    tier: 1,
    metric: 'rolls',
    target: 6,
    rewardCoins: 50,
  },
  {
    id: 'm_jumps_12',
    title: '12 kez zıpla',
    category: 'birikimli',
    tier: 1,
    metric: 'jumps',
    target: 12,
    rewardCoins: 50,
  },
  {
    id: 'm_near_5',
    title: '5 engeli milimetrik sıyır',
    category: 'birikimli',
    tier: 1,
    metric: 'nearMisses',
    target: 5,
    rewardCoins: 75,
  },
  {
    id: 'm_powerup_2',
    title: '2 güçlendirme topla',
    category: 'guc',
    tier: 1,
    metric: 'powerups',
    target: 2,
    rewardCoins: 65,
  },
  {
    id: 'm_char_riza_500',
    title: 'Kıvırcık Rıza ile 500m koş',
    category: 'karakter',
    tier: 1,
    metric: 'distance',
    target: 500,
    requiredSkin: 'kivircik_riza',
    rewardCoins: 70,
  },

  // SET 2 - Sokak Ustası
  {
    id: 'm_dist_900',
    title: '900 metre hayatta kal',
    category: 'birikimli',
    tier: 2,
    metric: 'distance',
    target: 900,
    rewardCoins: 110,
  },
  {
    id: 'm_single_dist_450',
    title: 'Tek koşuda 450 metre git',
    category: 'tek_kosu',
    tier: 2,
    metric: 'distance',
    target: 450,
    rewardCoins: 120,
  },
  {
    id: 'm_flight_2',
    title: '2 kez Jetpack ile uç',
    category: 'guc',
    tier: 2,
    metric: 'flights',
    target: 2,
    rewardCoins: 95,
  },
  {
    id: 'm_magnet_2',
    title: '2 kez Kırıntı Mıknatısı al',
    category: 'guc',
    tier: 2,
    metric: 'magnets',
    target: 2,
    rewardCoins: 90,
  },
  {
    id: 'm_zone_magara',
    title: "Yeraltı Mağarası'na ulaş (1.000m)",
    category: 'bolge',
    tier: 2,
    metric: 'zone',
    target: 1,
    zoneId: 'yeralti_magarasi',
    rewardCoins: 140,
  },
  {
    id: 'm_coins_100',
    title: '100 simit kırıntısı topla',
    category: 'birikimli',
    tier: 2,
    metric: 'coins',
    target: 100,
    rewardCoins: 100,
  },
  {
    id: 'm_single_rolls_5',
    title: 'Tek koşuda 5 takla at',
    category: 'tek_kosu',
    tier: 2,
    metric: 'rolls',
    target: 5,
    rewardCoins: 95,
  },
  {
    id: 'm_char_kazim_800',
    title: 'Tamirci Kazım ile 800m koş',
    category: 'karakter',
    tier: 2,
    metric: 'distance',
    target: 800,
    requiredSkin: 'tamirci_kazim',
    rewardCoins: 145,
  },

  // SET 3 - Firar Efsanesi
  {
    id: 'm_single_coins_40',
    title: 'Tek koşuda 40 kırıntı topla',
    category: 'tek_kosu',
    tier: 3,
    metric: 'coins',
    target: 40,
    rewardCoins: 135,
  },
  {
    id: 'm_turbo_2',
    title: '2 kez Turbo Fırlatma kullan',
    category: 'guc',
    tier: 3,
    metric: 'turbos',
    target: 2,
    rewardCoins: 130,
  },
  {
    id: 'm_shield_2',
    title: '2 kez Çarpma Kalkanı kap',
    category: 'guc',
    tier: 3,
    metric: 'shields',
    target: 2,
    rewardCoins: 130,
  },
  {
    id: 'm_near_15',
    title: '15 engeli milimetrik sıyır',
    category: 'birikimli',
    tier: 3,
    metric: 'nearMisses',
    target: 15,
    rewardCoins: 150,
  },
  {
    id: 'm_zone_buzul',
    title: "Buzul Dünyası'na ulaş (2.000m)",
    category: 'bolge',
    tier: 3,
    metric: 'zone',
    target: 1,
    zoneId: 'buzul_dunyasi',
    rewardCoins: 200,
  },
  {
    id: 'm_single_score_1800',
    title: 'Tek koşuda 1.800 skor yap',
    category: 'tek_kosu',
    tier: 3,
    metric: 'score',
    target: 1800,
    rewardCoins: 160,
  },
  {
    id: 'm_char_diva_1000',
    title: 'Diva ile 1.000m koş',
    category: 'karakter',
    tier: 3,
    metric: 'distance',
    target: 1000,
    requiredSkin: 'diva_bocek',
    rewardCoins: 195,
  },
  {
    id: 'm_char_duktur_1200',
    title: 'Acilci Duktur ile 1.200m koş',
    category: 'karakter',
    tier: 3,
    metric: 'distance',
    target: 1200,
    requiredSkin: 'duktur_bocek',
    rewardCoins: 220,
  },

  // SET 4 - Galaksi Şampiyonu
  {
    id: 'm_zone_ates',
    title: "Ateş Diyarı'na ulaş (3.000m)",
    category: 'bolge',
    tier: 4,
    metric: 'zone',
    target: 1,
    zoneId: 'ates_diyari',
    rewardCoins: 260,
  },
  {
    id: 'm_zone_mutfak',
    title: "Dev Mutfak'a ulaş (4.000m)",
    category: 'bolge',
    tier: 4,
    metric: 'zone',
    target: 1,
    zoneId: 'dev_mutfak',
    rewardCoins: 320,
  },
  {
    id: 'm_zone_banyo',
    title: "Köpüklü Banyo'ya ulaş (5.000m)",
    category: 'bolge',
    tier: 4,
    metric: 'zone',
    target: 1,
    zoneId: 'kopuklu_banyo',
    rewardCoins: 380,
  },
  {
    id: 'm_zone_lab',
    title: "Çılgın Lab'a ulaş (6.000m)",
    category: 'bolge',
    tier: 4,
    metric: 'zone',
    target: 1,
    zoneId: 'cilgin_lab',
    rewardCoins: 450,
  },
  {
    id: 'm_zone_galaksi',
    title: "Peynir Galaksisi'ne ulaş (7.000m)",
    category: 'bolge',
    tier: 4,
    metric: 'zone',
    target: 1,
    zoneId: 'peynir_galaksisi',
    rewardCoins: 600,
  },
  {
    id: 'm_single_near_6',
    title: 'Tek koşuda 6 kez milimetrik sıyır',
    category: 'tek_kosu',
    tier: 4,
    metric: 'nearMisses',
    target: 6,
    rewardCoins: 190,
  },
  {
    id: 'm_single_powerups_3',
    title: 'Tek koşuda 3 güçlendirme al',
    category: 'guc',
    tier: 4,
    metric: 'powerups',
    target: 3,
    rewardCoins: 180,
  },
  {
    id: 'm_flights_5',
    title: '5 kez Jetpack ile uç',
    category: 'guc',
    tier: 4,
    metric: 'flights',
    target: 5,
    rewardCoins: 220,
  },
  {
    id: 'm_char_hahamcan_1500',
    title: 'Hahamcan ile 1.500m koş',
    category: 'karakter',
    tier: 4,
    metric: 'distance',
    target: 1500,
    requiredSkin: 'hahamcan',
    rewardCoins: 300,
  },
];

export const DAILY_MISSION_POOL: MissionDef[] = [
  {
    id: 'd_dist_600',
    title: 'Bugün 600 metre koş',
    category: 'birikimli',
    tier: 1,
    metric: 'distance',
    target: 600,
    rewardCoins: 80,
  },
  {
    id: 'd_coins_45',
    title: 'Bugün 45 kırıntı topla',
    category: 'birikimli',
    tier: 1,
    metric: 'coins',
    target: 45,
    rewardCoins: 75,
  },
  {
    id: 'd_rolls_6',
    title: 'Bugün 6 takla at',
    category: 'birikimli',
    tier: 1,
    metric: 'rolls',
    target: 6,
    rewardCoins: 70,
  },
  {
    id: 'd_jumps_15',
    title: 'Bugün 15 kez zıpla',
    category: 'birikimli',
    tier: 1,
    metric: 'jumps',
    target: 15,
    rewardCoins: 70,
  },
  {
    id: 'd_near_4',
    title: 'Bugün 4 engeli sıyır',
    category: 'birikimli',
    tier: 1,
    metric: 'nearMisses',
    target: 4,
    rewardCoins: 85,
  },
  {
    id: 'd_powerups_2',
    title: 'Bugün 2 güçlendirme al',
    category: 'guc',
    tier: 1,
    metric: 'powerups',
    target: 2,
    rewardCoins: 80,
  },
  {
    id: 'd_single_score_900',
    title: 'Tek koşuda 900 skor yap',
    category: 'tek_kosu',
    tier: 1,
    metric: 'score',
    target: 900,
    rewardCoins: 95,
  },
  {
    id: 'd_single_dist_350',
    title: 'Tek koşuda 350m koş',
    category: 'tek_kosu',
    tier: 1,
    metric: 'distance',
    target: 350,
    rewardCoins: 90,
  },
  {
    id: 'd_flight_1',
    title: 'Bugün 1 kez Jetpack ile uç',
    category: 'guc',
    tier: 1,
    metric: 'flights',
    target: 1,
    rewardCoins: 85,
  },
];

export const ACHIEVEMENT_POOL: AchievementDef[] = [
  // Karakter Açma Hedefleri
  {
    id: 'ach_unlock_kazim',
    title: "Tamirci Kazım'ı Aç",
    desc: 'Mağazadan Tamirci Kazım karakterinin kilidini aç.',
    category: 'karakter',
    type: 'unlock_skin',
    skinId: 'tamirci_kazim',
    target: 1,
    rewardCoins: 150,
  },
  {
    id: 'ach_unlock_diva',
    title: "Diva'yı Aç",
    desc: 'Mağazadan Diva karakterinin kilidini aç.',
    category: 'karakter',
    type: 'unlock_skin',
    skinId: 'diva_bocek',
    target: 1,
    rewardCoins: 300,
  },
  {
    id: 'ach_unlock_duktur',
    title: "Acilci Duktur'u Aç",
    desc: 'Mağazadan Acilci Duktur karakterinin kilidini aç.',
    category: 'karakter',
    type: 'unlock_skin',
    skinId: 'duktur_bocek',
    target: 1,
    rewardCoins: 500,
  },
  {
    id: 'ach_unlock_hahamcan',
    title: "Hahamcan'ı Aç",
    desc: 'Mağazadan efsane Hahamcan karakterinin kilidini aç.',
    category: 'karakter',
    type: 'unlock_skin',
    skinId: 'hahamcan',
    target: 1,
    rewardCoins: 900,
  },

  // Karakterle Koşu Ustalığı
  {
    id: 'ach_dist_riza',
    title: 'Kıvırcık Rıza ile 1.500m',
    desc: 'Kıvırcık Rıza ile toplam 1.500 metre koş.',
    category: 'karakter',
    type: 'skin_distance',
    skinId: 'kivircik_riza',
    target: 1500,
    rewardCoins: 180,
  },
  {
    id: 'ach_dist_kazim',
    title: 'Tamirci Kazım ile 1.200m',
    desc: 'Tamirci Kazım ile toplam 1.200 metre koş.',
    category: 'karakter',
    type: 'skin_distance',
    skinId: 'tamirci_kazim',
    target: 1200,
    rewardCoins: 240,
  },
  {
    id: 'ach_dist_diva',
    title: 'Diva ile 1.500m',
    desc: 'Diva ile toplam 1.500 metre koş.',
    category: 'karakter',
    type: 'skin_distance',
    skinId: 'diva_bocek',
    target: 1500,
    rewardCoins: 320,
  },
  {
    id: 'ach_dist_duktur',
    title: 'Acilci Duktur ile 2.000m',
    desc: 'Acilci Duktur ile toplam 2.000 metre koş.',
    category: 'karakter',
    type: 'skin_distance',
    skinId: 'duktur_bocek',
    target: 2000,
    rewardCoins: 450,
  },
  {
    id: 'ach_dist_hahamcan',
    title: 'Hahamcan ile 2.500m',
    desc: 'Hahamcan ile toplam 2.500 metre koş.',
    category: 'karakter',
    type: 'skin_distance',
    skinId: 'hahamcan',
    target: 2500,
    rewardCoins: 700,
  },

  // Belirli Sahneler (Tüm Dünyalar)
  {
    id: 'ach_zone_magara',
    title: "Yeraltı Mağarası'nı Keşfet",
    desc: 'Tek koşuda 1.000m geçip Yeraltı Mağarası sahnesine ulaş.',
    category: 'sahne',
    type: 'reach_zone',
    zoneId: 'yeralti_magarasi',
    target: 1,
    rewardCoins: 120,
  },
  {
    id: 'ach_zone_buzul',
    title: "Buzul Dünyası'na Gir",
    desc: 'Tek koşuda 2.000m geçip Buzul Dünyası sahnesine ulaş.',
    category: 'sahne',
    type: 'reach_zone',
    zoneId: 'buzul_dunyasi',
    target: 1,
    rewardCoins: 180,
  },
  {
    id: 'ach_zone_ates',
    title: "Ateş Diyarı'na Dayan",
    desc: 'Tek koşuda 3.000m geçip Ateş Diyarı sahnesine ulaş.',
    category: 'sahne',
    type: 'reach_zone',
    zoneId: 'ates_diyari',
    target: 1,
    rewardCoins: 260,
  },
  {
    id: 'ach_zone_mutfak',
    title: "Dev Mutfak'a Çık",
    desc: 'Tek koşuda 4.000m geçip Dev Mutfak sahnesine ulaş.',
    category: 'sahne',
    type: 'reach_zone',
    zoneId: 'dev_mutfak',
    target: 1,
    rewardCoins: 350,
  },
  {
    id: 'ach_zone_banyo',
    title: "Köpüklü Banyo'ya Dal",
    desc: 'Tek koşuda 5.000m geçip Köpüklü Banyo sahnesine ulaş.',
    category: 'sahne',
    type: 'reach_zone',
    zoneId: 'kopuklu_banyo',
    target: 1,
    rewardCoins: 450,
  },
  {
    id: 'ach_zone_lab',
    title: "Çılgın Lab'dan Kaç",
    desc: 'Tek koşuda 6.000m geçip Çılgın Lab sahnesine ulaş.',
    category: 'sahne',
    type: 'reach_zone',
    zoneId: 'cilgin_lab',
    target: 1,
    rewardCoins: 600,
  },
  {
    id: 'ach_zone_galaksi',
    title: "Peynir Galaksisi'ne Uç",
    desc: 'Tek koşuda 7.000m geçip Peynir Galaksisi sahnesine ulaş.',
    category: 'sahne',
    type: 'reach_zone',
    zoneId: 'peynir_galaksisi',
    target: 1,
    rewardCoins: 1000,
  },

  // Jetpack & Kırıntı & Mesafe Ustalığı
  {
    id: 'ach_jetpack_10',
    title: 'Jetpack Ustası',
    desc: 'Toplam 10 kez Jetpack ile havada uç.',
    category: 'ustalik',
    type: 'total_flights',
    target: 10,
    rewardCoins: 250,
  },
  {
    id: 'ach_coins_1500',
    title: 'Kırıntı Koleksiyoncusu',
    desc: 'Koşularda toplam 1.500 simit kırıntısı topla.',
    category: 'ustalik',
    type: 'total_coins',
    target: 1500,
    rewardCoins: 300,
  },
  {
    id: 'ach_dist_10000',
    title: 'Efsane Firarcı',
    desc: 'Tüm koşularda toplam 10.000 metre yol kat et.',
    category: 'ustalik',
    type: 'total_distance',
    target: 10000,
    rewardCoins: 500,
  },
];

export const DAILY_CHEST_BONUS = 250;

export function getMissionById(id: string): MissionDef | undefined {
  return (
    MISSION_POOL.find((m) => m.id === id) ||
    DAILY_MISSION_POOL.find((m) => m.id === id)
  );
}

export function getAchievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENT_POOL.find((a) => a.id === id);
}

export function getAchievementValue(def: AchievementDef, save: SaveData): number {
  if (def.type === 'unlock_skin') {
    return def.skinId && save.unlockedSkins.includes(def.skinId) ? 1 : 0;
  }
  return save.achievements.progress[def.id] ?? 0;
}

export function getReadyAchievementsCount(save: SaveData): number {
  return ACHIEVEMENT_POOL.filter((def) => {
    if (save.achievements.claimedIds.includes(def.id)) return false;
    return getAchievementValue(def, save) >= def.target;
  }).length;
}

export function isSingleRunMission(def: MissionDef): boolean {
  return (
    def.category === 'tek_kosu' ||
    def.category === 'bolge' ||
    def.id.includes('_single_')
  );
}

export function getMetricValueFromRun(
  def: MissionDef,
  metrics: RunMetrics,
  score: number,
  activeSkin?: SkinId,
): number {
  if (def.requiredSkin && activeSkin && def.requiredSkin !== activeSkin) {
    return 0;
  }
  switch (def.metric) {
    case 'distance':
      return metrics.distance;
    case 'coins':
      return metrics.coins;
    case 'rolls':
      return metrics.rolls;
    case 'jumps':
      return metrics.jumps;
    case 'nearMisses':
      return metrics.nearMisses;
    case 'flights':
      return metrics.flights;
    case 'powerups':
      return metrics.powerups;
    case 'magnets':
      return metrics.magnets;
    case 'shields':
      return metrics.shields;
    case 'flashlights':
      return metrics.flashlights;
    case 'turbos':
      return metrics.turbos;
    case 'score':
      return score;
    case 'zone':
      return def.zoneId && metrics.zonesReached.includes(def.zoneId) ? 1 : 0;
  }
}

export function getDailyIdsForDate(dateKey: string): string[] {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const pool = [...DAILY_MISSION_POOL];
  const picked: string[] = [];
  for (let k = 0; k < 3 && pool.length > 0; k++) {
    const idx = (hash + k * 7) % pool.length;
    picked.push(pool.splice(idx, 1)[0].id);
  }
  return picked;
}

export interface BugRankInfo {
  title: string;
  nextTitle: string | null;
  remainingForNext: number;
}

export function getBugRank(
  completedCount: number,
  lang: AppLanguage = 'tr',
): BugRankInfo {
  if (lang === 'en') {
    if (completedCount < 2) {
      return {
        title: 'Kitchen Rookie',
        nextTitle: 'Pantry Escapee',
        remainingForNext: 2 - completedCount,
      };
    }
    if (completedCount < 6) {
      return {
        title: 'Pantry Escapee',
        nextTitle: 'Street Storm',
        remainingForNext: 6 - completedCount,
      };
    }
    if (completedCount < 12) {
      return {
        title: 'Street Storm',
        nextTitle: 'Night Legend',
        remainingForNext: 12 - completedCount,
      };
    }
    if (completedCount < 20) {
      return {
        title: 'Night Legend',
        nextTitle: 'Cheese Galaxy King',
        remainingForNext: 20 - completedCount,
      };
    }
    return {
      title: 'Cheese Galaxy King',
      nextTitle: null,
      remainingForNext: 0,
    };
  }

  if (completedCount < 2) {
    return {
      title: 'Mutfak Çaylağı',
      nextTitle: 'Kiler Kaçkını',
      remainingForNext: 2 - completedCount,
    };
  }
  if (completedCount < 6) {
    return {
      title: 'Kiler Kaçkını',
      nextTitle: 'Çarşı Fırtınası',
      remainingForNext: 6 - completedCount,
    };
  }
  if (completedCount < 12) {
    return {
      title: 'Çarşı Fırtınası',
      nextTitle: 'Gece Efsanesi',
      remainingForNext: 12 - completedCount,
    };
  }
  if (completedCount < 20) {
    return {
      title: 'Gece Efsanesi',
      nextTitle: 'Peynir Galaksisi Kralı',
      remainingForNext: 20 - completedCount,
    };
  }
  return {
    title: 'Peynir Galaksisi Kralı',
    nextTitle: null,
    remainingForNext: 0,
  };
}

export function getUpgradeCost(baseCost: number, currentLevel: number): number {
  return Math.round(baseCost * Math.pow(1.55, currentLevel - 1));
}

export function getScoreMultiplierFromMissions(completedCount: number): number {
  return 1 + Math.floor(completedCount / 2);
}

export const MAX_CONTINUE_COST = 1_000_000;

export function getContinueCost(continueCount: number): number {
  if (continueCount <= 0) return 100;
  return Math.min(MAX_CONTINUE_COST, 100 * Math.pow(2, continueCount));
}

const STORAGE_KEY = 'bocek_firar_city_v4';

const DEFAULT_UPGRADES: Record<UpgradeKey, number> = {
  magnet: 1,
  shield: 1,
  flashlight: 1,
  turbo: 1,
  wings: 1,
};

export const DAILY_REWARD_AMOUNTS = [75, 100, 150, 200, 275, 350, 750] as const;

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayDateKey(date = new Date()): string {
  return getLocalDateKey(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1),
  );
}

export function getDaysBetweenDateKeys(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return 0;
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.floor((toUtc - fromUtc) / 86_400_000);
}

export function shouldShowNotificationPrompt(
  notifications: NotificationState,
  browserPermission: NotificationPermission | 'unsupported',
  isEmbeddedIframe = false,
  now = new Date(),
): boolean {
  if (
    notifications.enabled &&
    (browserPermission === 'granted' || isEmbeddedIframe)
  ) {
    return false;
  }
  if (notifications.userDisabledInSettings) return false;
  if (!notifications.lastPromptDate) return true;
  const todayKey = getLocalDateKey(now);
  return getDaysBetweenDateKeys(notifications.lastPromptDate, todayKey) >= 3;
}

export interface DailyRewardInfo {
  canClaim: boolean;
  todayKey: string;
  claimDay: number;
  rewardCoins: number;
}

export function getDailyRewardInfo(
  dailyReward: DailyRewardState,
  now = new Date(),
): DailyRewardInfo {
  const todayKey = getLocalDateKey(now);
  const yesterdayKey = getYesterdayDateKey(now);

  if (dailyReward.lastClaimDate === todayKey) {
    const claimedDay = Math.max(1, Math.min(7, dailyReward.streak || 1));
    return {
      canClaim: false,
      todayKey,
      claimDay: claimedDay,
      rewardCoins: DAILY_REWARD_AMOUNTS[claimedDay - 1],
    };
  }

  const continuesStreak =
    dailyReward.lastClaimDate === yesterdayKey &&
    dailyReward.streak >= 1 &&
    dailyReward.streak < 7;
  const claimDay = continuesStreak ? dailyReward.streak + 1 : 1;

  return {
    canClaim: true,
    todayKey,
    claimDay,
    rewardCoins: DAILY_REWARD_AMOUNTS[claimDay - 1],
  };
}

const todayInit = getLocalDateKey();

const DEFAULT_NOTIFICATIONS: NotificationState = {
  v: 2,
  enabled: false,
  userDisabledInSettings: false,
  lastOpenedDate: todayInit,
  lastPromptDate: null,
  lastDailyNotifyDate: null,
  lastPrimeNotifyDate: null,
  lastSentDate: null,
  sentCountDate: null,
  sentCountToday: 0,
  usedDailyMsgIds: [],
  usedPrimeMsgIds: [],
};

const DEFAULT_SAVE: SaveData = {
  highScore: 0,
  totalCoins: 0,
  unlockedSkins: ['kivircik_riza'],
  selectedSkin: 'kivircik_riza',
  sfxEnabled: true,
  ambienceEnabled: true,
  sfxVolume: 0.85,
  ambienceVolume: 0.75,
  graphicsQuality: 'high',
  totalRuns: 0,
  upgrades: { ...DEFAULT_UPGRADES },
  missions: {
    activeIds: [MISSION_POOL[0].id, MISSION_POOL[1].id, MISSION_POOL[2].id],
    progress: {},
    claimableIds: [],
    completedCount: 0,
    rerollDate: null,
    dailyDate: todayInit,
    dailyIds: getDailyIdsForDate(todayInit),
    dailyProgress: {},
    dailyClaimedIds: [],
    dailyChestClaimed: false,
  },
  achievements: {
    progress: {},
    claimedIds: [],
  },
  dailyReward: {
    lastClaimDate: null,
    streak: 0,
  },
  notifications: { ...DEFAULT_NOTIFICATIONS },
  languagePreference: 'auto',
};

export function pickReplacementMission(
  excludeIds: string[],
  completedCount: number,
  unlockedSkins: SkinId[] = ['kivircik_riza'],
): MissionDef {
  const maxTier = Math.min(4, 1 + Math.floor(completedCount / 3));
  const isEligible = (m: MissionDef) =>
    !excludeIds.includes(m.id) &&
    (!m.requiredSkin || unlockedSkins.includes(m.requiredSkin));

  const candidates = MISSION_POOL.filter(
    (m) => isEligible(m) && m.tier <= maxTier,
  );
  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  const fallback = MISSION_POOL.filter(isEligible);
  if (fallback.length > 0) {
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  return MISSION_POOL[Math.floor(Math.random() * MISSION_POOL.length)];
}

export function ensureDailyQuestsFresh(save: SaveData, now = new Date()): SaveData {
  const todayKey = getLocalDateKey(now);
  if (save.missions.dailyDate === todayKey && save.missions.dailyIds.length === 3) {
    return save;
  }
  return {
    ...save,
    missions: {
      ...save.missions,
      dailyDate: todayKey,
      dailyIds: getDailyIdsForDate(todayKey),
      dailyProgress: {},
      dailyClaimedIds: [],
      dailyChestClaimed: false,
    },
  };
}

export function loadSaveData(): SaveData {
  try {
    localStorage.removeItem('bocek_firar_city_v2');
    localStorage.removeItem('bocek_firar_city_v3');
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_SAVE,
        unlockedSkins: [...DEFAULT_SAVE.unlockedSkins],
        upgrades: { ...DEFAULT_SAVE.upgrades },
      };
    }
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const validSkins: SkinId[] = Array.isArray(parsed.unlockedSkins)
      ? parsed.unlockedSkins.filter((s): s is SkinId =>
          SKINS.some((sk) => sk.id === s),
        )
      : ['kivircik_riza'];
    if (!validSkins.includes('kivircik_riza')) validSkins.unshift('kivircik_riza');

    const selectedSkin =
      parsed.selectedSkin && validSkins.includes(parsed.selectedSkin)
        ? parsed.selectedSkin
        : 'kivircik_riza';

    const graphicsQuality =
      parsed.graphicsQuality === 'low' ||
      parsed.graphicsQuality === 'medium' ||
      parsed.graphicsQuality === 'high'
        ? parsed.graphicsQuality
        : 'high';

    const upgrades: Record<UpgradeKey, number> = {
      magnet: Math.max(1, Math.min(5, parsed.upgrades?.magnet ?? 1)),
      shield: Math.max(1, Math.min(5, parsed.upgrades?.shield ?? 1)),
      flashlight: Math.max(1, Math.min(5, parsed.upgrades?.flashlight ?? 1)),
      turbo: Math.max(1, Math.min(5, parsed.upgrades?.turbo ?? 1)),
      wings: Math.max(1, Math.min(5, parsed.upgrades?.wings ?? 1)),
    };

    const validActiveIds = Array.isArray(parsed.missions?.activeIds)
      ? parsed.missions.activeIds.filter((id) =>
          MISSION_POOL.some((m) => m.id === id),
        )
      : [...DEFAULT_SAVE.missions.activeIds];
    while (validActiveIds.length < 3) {
      const next = MISSION_POOL.find(
        (m) =>
          !validActiveIds.includes(m.id) &&
          (!m.requiredSkin || validSkins.includes(m.requiredSkin)),
      );
      if (!next) break;
      validActiveIds.push(next.id);
    }

    const completedCount =
      typeof parsed.missions?.completedCount === 'number'
        ? parsed.missions.completedCount
        : 0;

    const rawClaimable = Array.isArray(parsed.missions?.claimableIds)
      ? parsed.missions.claimableIds.filter((id) => validActiveIds.includes(id))
      : [];

    const todayKey = getLocalDateKey();
    const sameDaily = parsed.missions?.dailyDate === todayKey;
    const dailyIds =
      sameDaily &&
      Array.isArray(parsed.missions?.dailyIds) &&
      parsed.missions.dailyIds.length === 3
        ? parsed.missions.dailyIds.filter((id) =>
            DAILY_MISSION_POOL.some((m) => m.id === id),
          )
        : getDailyIdsForDate(todayKey);

    const rawDaily = parsed.dailyReward;
    const dailyReward: DailyRewardState = {
      lastClaimDate:
        rawDaily && typeof rawDaily.lastClaimDate === 'string'
          ? rawDaily.lastClaimDate
          : null,
      streak:
        rawDaily && typeof rawDaily.streak === 'number'
          ? Math.max(0, Math.min(7, Math.floor(rawDaily.streak)))
          : 0,
    };

    const rawNotif = parsed.notifications;
    const isNotifV2 = rawNotif?.v === 2;
    const notifications: NotificationState = isNotifV2
      ? {
          v: 2,
          enabled: Boolean(rawNotif?.enabled),
          userDisabledInSettings: Boolean(rawNotif?.userDisabledInSettings),
          lastOpenedDate:
            typeof rawNotif?.lastOpenedDate === 'string'
              ? rawNotif.lastOpenedDate
              : todayKey,
          lastPromptDate:
            typeof rawNotif?.lastPromptDate === 'string'
              ? rawNotif.lastPromptDate
              : null,
          lastDailyNotifyDate:
            typeof rawNotif?.lastDailyNotifyDate === 'string'
              ? rawNotif.lastDailyNotifyDate
              : null,
          lastPrimeNotifyDate:
            typeof rawNotif?.lastPrimeNotifyDate === 'string'
              ? rawNotif.lastPrimeNotifyDate
              : null,
          lastSentDate:
            typeof rawNotif?.lastSentDate === 'string'
              ? rawNotif.lastSentDate
              : null,
          sentCountDate:
            typeof rawNotif?.sentCountDate === 'string'
              ? rawNotif.sentCountDate
              : null,
          sentCountToday:
            typeof rawNotif?.sentCountToday === 'number'
              ? rawNotif.sentCountToday
              : 0,
          usedDailyMsgIds: Array.isArray(rawNotif?.usedDailyMsgIds)
            ? rawNotif.usedDailyMsgIds.filter(
                (n): n is number => typeof n === 'number',
              )
            : [],
          usedPrimeMsgIds: Array.isArray(rawNotif?.usedPrimeMsgIds)
            ? rawNotif.usedPrimeMsgIds.filter(
                (n): n is number => typeof n === 'number',
              )
            : [],
        }
      : { ...DEFAULT_NOTIFICATIONS, lastOpenedDate: todayKey };

    const rawAch = parsed.achievements;
    const achievements = {
      progress:
        rawAch && typeof rawAch.progress === 'object' && rawAch.progress
          ? rawAch.progress
          : {},
      claimedIds:
        rawAch && Array.isArray(rawAch.claimedIds)
          ? rawAch.claimedIds.filter((id) =>
              ACHIEVEMENT_POOL.some((a) => a.id === id),
            )
          : [],
    };

    const languagePreference: LanguagePreference =
      parsed.languagePreference === 'tr' ||
      parsed.languagePreference === 'en' ||
      parsed.languagePreference === 'auto'
        ? parsed.languagePreference
        : 'auto';

    return {
      highScore: typeof parsed.highScore === 'number' ? parsed.highScore : 0,
      totalCoins: typeof parsed.totalCoins === 'number' ? parsed.totalCoins : 0,
      unlockedSkins: validSkins,
      selectedSkin,
      sfxEnabled: typeof parsed.sfxEnabled === 'boolean' ? parsed.sfxEnabled : true,
      ambienceEnabled:
        typeof parsed.ambienceEnabled === 'boolean' ? parsed.ambienceEnabled : true,
      sfxVolume:
        typeof parsed.sfxVolume === 'number'
          ? Math.max(0, Math.min(1, parsed.sfxVolume))
          : 0.85,
      ambienceVolume:
        typeof parsed.ambienceVolume === 'number'
          ? Math.max(0, Math.min(1, parsed.ambienceVolume))
          : 0.75,
      graphicsQuality,
      totalRuns: typeof parsed.totalRuns === 'number' ? parsed.totalRuns : 0,
      upgrades,
      missions: {
        activeIds: validActiveIds.slice(0, 3),
        progress: parsed.missions?.progress ?? {},
        claimableIds: rawClaimable,
        completedCount,
        rerollDate:
          typeof parsed.missions?.rerollDate === 'string'
            ? parsed.missions.rerollDate
            : null,
        dailyDate: todayKey,
        dailyIds: dailyIds.length === 3 ? dailyIds : getDailyIdsForDate(todayKey),
        dailyProgress: sameDaily ? (parsed.missions?.dailyProgress ?? {}) : {},
        dailyClaimedIds:
          sameDaily && Array.isArray(parsed.missions?.dailyClaimedIds)
            ? parsed.missions.dailyClaimedIds
            : [],
        dailyChestClaimed: sameDaily
          ? Boolean(parsed.missions?.dailyChestClaimed)
          : false,
      },
      achievements,
      dailyReward,
      notifications,
      languagePreference,
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function writeSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}
