import {
  AchievementCategory,
  AppLanguage,
  LanguagePreference,
  MissionCategory,
  SkinId,
  UpgradeKey,
  ZoneId,
} from './types';

export function detectDeviceLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return 'tr';
  const candidates: string[] = [];
  if (Array.isArray(navigator.languages)) {
    candidates.push(...navigator.languages);
  }
  if (navigator.language) {
    candidates.push(navigator.language);
  }
  for (const raw of candidates) {
    const code = String(raw).trim().toLowerCase();
    if (!code) continue;
    if (code === 'tr' || code.startsWith('tr-') || code.startsWith('tr_')) {
      return 'tr';
    }
    return 'en';
  }
  return 'tr';
}

export function resolveLanguage(pref?: LanguagePreference): AppLanguage {
  if (pref === 'tr' || pref === 'en') return pref;
  return detectDeviceLanguage();
}

export function formatNum(value: number, lang: AppLanguage): string {
  return value.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US');
}

export const SKIN_TEXT_EN: Record<SkinId, { name: string; subtitle: string }> = {
  kivircik_riza: {
    name: 'Curly Riza',
    subtitle: 'Street legend · Orange tee & curly hair',
  },
  tamirci_kazim: {
    name: 'Mechanic Kazim',
    subtitle: 'Master mechanic · Navy overalls & goggles',
  },
  diva_bocek: {
    name: 'Diva',
    subtitle: 'Divas never cook · Fuchsia coat, fur & crown',
  },
  duktur_bocek: {
    name: 'Doc Roach',
    subtitle: 'ER hero · White coat & head mirror',
  },
  hahamcan: {
    name: 'Hahamcan',
    subtitle: 'Wise master · Pink long coat, hat & gold chain',
  },
};

export const ZONE_TEXT_EN: Record<ZoneId, { title: string; subtitle: string }> = {
  mahalle_caddesi: {
    title: 'NEIGHBORHOOD STREET',
    subtitle: 'City Traffic · Taxis & Municipal Buses',
  },
  yeralti_magarasi: {
    title: 'UNDERGROUND CAVERN',
    subtitle: 'Deep Roots · Mine Carts & Glowing Crystals',
  },
  buzul_dunyasi: {
    title: 'FROZEN WORLD',
    subtitle: 'Polar Storm · Slippery Glaciers & Snowballs',
  },
  ates_diyari: {
    title: 'FIRE & LAVA REALM',
    subtitle: 'Volcanic Magma Bridge · Flame Pillars',
  },
  dev_mutfak: {
    title: 'GIANT KITCHEN COUNTER',
    subtitle: 'Ketchup Lane · Giant Rolling Pins & Butter Chaos',
  },
  kopuklu_banyo: {
    title: 'BUBBLE BATH',
    subtitle: 'Soap Suds · Giant Slippers & Rubber Ducks',
  },
  cilgin_lab: {
    title: 'MAD LABORATORY',
    subtitle: 'Bug Spray Base · Lasers & Neon Jelly',
  },
  peynir_galaksisi: {
    title: 'CHEESE GALAXY',
    subtitle: 'Space Crumb Hunt · UFOs & Giant Cheddar Craters',
  },
};

export const UPGRADE_TEXT_EN: Record<UpgradeKey, { name: string; desc: string }> = {
  wings: {
    name: 'Jetpack Flight',
    desc: 'Extends mid-air flight duration with turbo jetpack',
  },
  magnet: {
    name: 'Crumb Magnet',
    desc: 'Pulls bagel crumbs from lanes for longer',
  },
  turbo: {
    name: 'Turbo Dash',
    desc: 'Extends 2x score super-speed boost duration',
  },
  flashlight: {
    name: 'Headlamp',
    desc: 'Extends dark tunnel lighting & 2x score time',
  },
  shield: {
    name: 'Crash Shield',
    desc: 'Increases protection time after shield breaks',
  },
};

export const COIN_PACK_TEXT_EN: Record<
  'kirinti_1' | 'kirinti_2' | 'kirinti_3',
  { name: string; desc: string; badge?: string }
> = {
  kirinti_1: {
    name: 'Crumb Pouch',
    desc: 'Great for upgrades and quick revives',
  },
  kirinti_2: {
    name: 'Crumb Sack',
    desc: 'For unlocking Diva & extra boosts',
    badge: 'Popular',
  },
  kirinti_3: {
    name: 'Giant Treasure',
    desc: 'For Doc Roach & full max stock',
    badge: 'Best Value',
  },
};

export const MISSION_TITLE_EN: Record<string, string> = {
  m_dist_400: 'Run 400 meters',
  m_coins_35: 'Collect 35 bagel crumbs',
  m_rolls_6: 'Do 6 parkour rolls',
  m_jumps_12: 'Jump 12 times',
  m_near_5: 'Near-miss 5 obstacles',
  m_powerup_2: 'Collect 2 power-ups',
  m_char_riza_500: 'Run 500m as Curly Riza',
  m_dist_900: 'Survive 900 meters',
  m_single_dist_450: 'Run 450m in a single run',
  m_flight_2: 'Fly with Jetpack 2 times',
  m_magnet_2: 'Grab Crumb Magnet 2 times',
  m_zone_magara: 'Reach Underground Cavern (1,000m)',
  m_coins_100: 'Collect 100 bagel crumbs',
  m_single_rolls_5: 'Do 5 rolls in a single run',
  m_char_kazim_800: 'Run 800m as Mechanic Kazim',
  m_single_coins_40: 'Collect 40 crumbs in a single run',
  m_turbo_2: 'Use Turbo Dash 2 times',
  m_shield_2: 'Grab Crash Shield 2 times',
  m_near_15: 'Near-miss 15 obstacles',
  m_zone_buzul: 'Reach Frozen World (2,000m)',
  m_single_score_1800: 'Score 1,800 in a single run',
  m_char_diva_1000: 'Run 1,000m as Diva',
  m_char_duktur_1200: 'Run 1,200m as Doc Roach',
  m_zone_ates: 'Reach Fire & Lava Realm (3,000m)',
  m_zone_mutfak: 'Reach Giant Kitchen (4,000m)',
  m_zone_banyo: 'Reach Bubble Bath (5,000m)',
  m_zone_lab: 'Reach Mad Lab (6,000m)',
  m_zone_galaksi: 'Reach Cheese Galaxy (7,000m)',
  m_single_near_6: 'Get 6 near-misses in a single run',
  m_single_powerups_3: 'Grab 3 power-ups in a single run',
  m_flights_5: 'Fly with Jetpack 5 times',
  m_char_hahamcan_1500: 'Run 1,500m as Hahamcan',
  d_dist_600: 'Run 600 meters today',
  d_coins_45: 'Collect 45 crumbs today',
  d_rolls_6: 'Do 6 rolls today',
  d_jumps_15: 'Jump 15 times today',
  d_near_4: 'Near-miss 4 obstacles today',
  d_powerups_2: 'Collect 2 power-ups today',
  d_single_score_900: 'Score 900 in one run',
  d_single_dist_350: 'Run 350m in one run',
  d_flight_1: 'Fly with Jetpack 1 time today',
};

export const ACHIEVEMENT_TEXT_EN: Record<
  string,
  { title: string; desc: string }
> = {
  ach_unlock_kazim: {
    title: 'Unlock Mechanic Kazim',
    desc: 'Unlock Mechanic Kazim in the Shop.',
  },
  ach_unlock_diva: {
    title: 'Unlock Diva',
    desc: 'Unlock Diva in the Shop.',
  },
  ach_unlock_duktur: {
    title: 'Unlock Doc Roach',
    desc: 'Unlock Doc Roach in the Shop.',
  },
  ach_unlock_hahamcan: {
    title: 'Unlock Hahamcan',
    desc: 'Unlock the legendary Hahamcan in the Shop.',
  },
  ach_dist_riza: {
    title: '1,500m with Curly Riza',
    desc: 'Run a total of 1,500 meters as Curly Riza.',
  },
  ach_dist_kazim: {
    title: '1,200m with Mechanic Kazim',
    desc: 'Run a total of 1,200 meters as Mechanic Kazim.',
  },
  ach_dist_diva: {
    title: '1,500m with Diva',
    desc: 'Run a total of 1,500 meters as Diva.',
  },
  ach_dist_duktur: {
    title: '2,000m with Doc Roach',
    desc: 'Run a total of 2,000 meters as Doc Roach.',
  },
  ach_dist_hahamcan: {
    title: '2,500m with Hahamcan',
    desc: 'Run a total of 2,500 meters as Hahamcan.',
  },
  ach_zone_magara: {
    title: 'Explore Underground Cavern',
    desc: 'Pass 1,000m in one run to reach Underground Cavern.',
  },
  ach_zone_buzul: {
    title: 'Enter Frozen World',
    desc: 'Pass 2,000m in one run to reach Frozen World.',
  },
  ach_zone_ates: {
    title: 'Survive Fire & Lava',
    desc: 'Pass 3,000m in one run to reach Fire & Lava Realm.',
  },
  ach_zone_mutfak: {
    title: 'Climb Giant Kitchen',
    desc: 'Pass 4,000m in one run to reach Giant Kitchen.',
  },
  ach_zone_banyo: {
    title: 'Dive into Bubble Bath',
    desc: 'Pass 5,000m in one run to reach Bubble Bath.',
  },
  ach_zone_lab: {
    title: 'Escape Mad Lab',
    desc: 'Pass 6,000m in one run to reach Mad Laboratory.',
  },
  ach_zone_galaksi: {
    title: 'Fly to Cheese Galaxy',
    desc: 'Pass 7,000m in one run to reach Cheese Galaxy.',
  },
  ach_jetpack_10: {
    title: 'Jetpack Ace',
    desc: 'Fly with the Jetpack 10 times in total.',
  },
  ach_coins_1500: {
    title: 'Crumb Collector',
    desc: 'Collect a total of 1,500 bagel crumbs across runs.',
  },
  ach_dist_10000: {
    title: 'Escape Legend',
    desc: 'Run a total of 10,000 meters across all runs.',
  },
};

export const DEATH_REASONS_EN: Record<string, string> = {
  taxi: 'CRASHED INTO A TAXI!',
  moving_taxi: 'HIT BY A SPEEDING TAXI!',
  bus_ramp: 'HIT THE FRONT OF A BUS!',
  terrain_ramp: 'CLIPPED THE SIDE OF A RAMP!',
  dumpster: 'SMASHED INTO A DUMPSTER!',
  cone: 'TRIPPED OVER A TRAFFIC CONE!',
  tire: 'TRIPPED OVER A TIRE!',
  road_sign: 'CRASHED INTO A BARRIER!',
  phone_roach: 'BUMPED INTO A PHONE ROACH!',
  mine_cart: 'HIT A MINE CART!',
  moving_mine_cart: 'STRUCK BY A RAIL CART!',
  moving_train: 'STRUCK BY AN EXPRESS TRAIN!',
  parked_train: 'CRASHED INTO A PARKED TRAIN!',
  crystal_pillar: 'HIT A GIANT CRYSTAL PILLAR!',
  earth_boulder: 'CRASHED INTO A BOULDER!',
  root_arch: 'HIT A ROOT ARCH!',
  mushroom_cluster: 'TRIPPED ON A GIANT MUSHROOM!',
  ice_wall: 'SLAMMED INTO AN ICE WALL!',
  moving_ice_sled: 'HIT BY AN ARCTIC SLED!',
  snowman_barrier: 'CRASHED INTO A SNOWMAN!',
  ice_crystal: 'HIT AN ICE CRYSTAL!',
  icicle_arch: 'CLIPPED AN ICICLE ARCH!',
  snow_ball: 'TRIPPED ON A SNOWBALL!',
  lava_rock: 'HIT A VOLCANIC ROCK!',
  moving_magma_cart: 'STRUCK BY A MAGMA CART!',
  lava_cauldron: 'CRASHED INTO A LAVA CAULDRON!',
  fire_pillar: 'HIT A FLAME PILLAR!',
  magma_arch: 'HIT A MAGMA ARCH!',
  fire_barrel: 'TRIPPED ON A BURNING BARREL!',
  fridge_block: 'SLAMMED INTO A GIANT FRIDGE!',
  moving_mixer_cart: 'HIT BY A KITCHEN MIXER!',
  rolling_pin: 'TRIPPED ON A ROLLING PIN!',
  butter_block: 'CRASHED INTO A BUTTER BLOCK!',
  toaster_arch: 'HIT A TOASTER ARCH!',
  tomato_ball: 'TRIPPED ON A GIANT TOMATO!',
  giant_slipper: 'SMACKED BY A GIANT SLIPPER!',
  moving_duck_tub: 'HIT BY A SLIDING DUCK!',
  shampoo_tower: 'CRASHED INTO SHAMPOO TOWER!',
  soap_bar: 'SLIPPED INTO A SOAP BAR!',
  towel_arch: 'HIT A TOWEL RACK!',
  tp_roll: 'TRIPPED ON TOILET PAPER!',
  raid_can: 'HIT A BUG SPRAY CAN!',
  moving_lab_bot: 'STRUCK BY A LAB BOT!',
  bio_drum_stack: 'CRASHED INTO BIO DRUMS!',
  beaker_vat: 'HIT A LAB BEAKER!',
  laser_arch: 'ZAPPED BY A GREEN LASER!',
  jelly_cube: 'STUCK IN NEON JELLY!',
  ufo_saucer: 'CRASHED INTO A MINI UFO!',
  moving_space_rover: 'HIT BY A SPACE ROVER!',
  cheese_satellite: 'HIT A CHEESE SATELLITE!',
  cheese_asteroid: 'CRASHED INTO A CHEESE ASTEROID!',
  warp_arch: 'HIT A WARP ARCH!',
  space_meteor: 'TRIPPED ON A PURPLE METEOR!',
  broom: 'CAUGHT BY THE HOMEOWNER!',
};

export const MISSION_CATEGORY_LABELS: Record<
  AppLanguage,
  Record<MissionCategory, string>
> = {
  tr: {
    birikimli: 'BİRİKİMLİ',
    tek_kosu: 'TEK KOŞU',
    bolge: 'SAHNE',
    karakter: 'KARAKTER',
    guc: 'GÜÇ',
  },
  en: {
    birikimli: 'TOTAL',
    tek_kosu: 'ONE RUN',
    bolge: 'STAGE',
    karakter: 'HERO',
    guc: 'POWER',
  },
};

export const ACHIEVEMENT_CATEGORY_LABELS: Record<
  AppLanguage,
  Record<AchievementCategory, string>
> = {
  tr: {
    karakter: 'KARAKTER',
    sahne: 'SAHNE',
    ustalik: 'USTALIK',
  },
  en: {
    karakter: 'HEROES',
    sahne: 'STAGES',
    ustalik: 'MASTERY',
  },
};

export function getSkinName(id: SkinId, trName: string, lang: AppLanguage): string {
  return lang === 'en' ? SKIN_TEXT_EN[id]?.name ?? trName : trName;
}

export function getZoneDisplay(
  id: ZoneId,
  trTitle: string,
  trSubtitle: string,
  lang: AppLanguage,
): { title: string; subtitle: string } {
  if (lang === 'en' && ZONE_TEXT_EN[id]) {
    return ZONE_TEXT_EN[id];
  }
  return { title: trTitle, subtitle: trSubtitle };
}

export function getMissionTitle(
  id: string,
  trTitle: string,
  lang: AppLanguage,
): string {
  return lang === 'en' ? MISSION_TITLE_EN[id] ?? trTitle : trTitle;
}

export function getAchievementDisplay(
  id: string,
  trTitle: string,
  trDesc: string,
  lang: AppLanguage,
): { title: string; desc: string } {
  if (lang === 'en' && ACHIEVEMENT_TEXT_EN[id]) {
    return ACHIEVEMENT_TEXT_EN[id];
  }
  return { title: trTitle, desc: trDesc };
}

export function getDeathReasonDisplay(
  key: string,
  trFallback: string,
  lang: AppLanguage,
): string {
  if (lang === 'en') {
    return DEATH_REASONS_EN[key] || 'CAUGHT BY THE HOMEOWNER!';
  }
  return trFallback || 'EV SAHİBİ YAKALADI!';
}
