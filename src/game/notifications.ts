import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from '@capacitor/local-notifications';
import {
  formatNum,
  getMissionTitle,
  getSkinName,
  resolveLanguage,
} from './i18n';
import {
  DailyRewardInfo,
  SKINS,
  getDaysBetweenDateKeys,
  getLocalDateKey,
  getMissionById,
} from './storage';
import { AppLanguage, SaveData } from './types';

const NATIVE_CHANNEL_ID = 'bocek-firar-alerts';
const NATIVE_DAILY_ID_BASE = 1000;
const NATIVE_PRIME_ID_BASE = 2000;
const NATIVE_IMMEDIATE_ID_MIN = 3000;

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let nativeChannelLang: AppLanguage | null = null;
let nativeImmediateSeq = 0;

export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

export function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (isNativeApp()) return Promise.resolve(null);
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register('/sw.js')
      .catch(() => null);
  }
  return swRegistrationPromise;
}

export function isEmbeddedIframe(): boolean {
  if (typeof window === 'undefined' || isNativeApp()) return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function mapNativePermissionState(
  state: string,
): NotificationPermission | 'unsupported' {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  return 'default';
}

async function ensureNativeChannel(lang: AppLanguage = resolveLanguage()): Promise<void> {
  if (!isNativeApp() || nativeChannelLang === lang) return;
  try {
    await LocalNotifications.createChannel({
      id: NATIVE_CHANNEL_ID,
      name: lang === 'en' ? 'Bug Escape Alerts' : 'Böcek Firarda Bildirimleri',
      description:
        lang === 'en'
          ? 'Daily reward & evening escape reminders'
          : 'Günlük ödül ve akşam firar hatırlatmaları',
      importance: 4,
      visibility: 1,
      sound: 'default',
      vibration: true,
    });
    nativeChannelLang = lang;
  } catch {
    // Ignore channel errors on older Android versions
  }
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (isNativeApp()) {
    return 'default';
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function getAppNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (isNativeApp()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      return mapNativePermissionState(status.display);
    } catch {
      return 'unsupported';
    }
  }
  return getBrowserNotificationPermission();
}

export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (isNativeApp()) {
    try {
      await ensureNativeChannel();
      const status = await LocalNotifications.requestPermissions();
      return mapNativePermissionState(status.display);
    } catch {
      return 'unsupported';
    }
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export const requestAppNotificationPermission = requestBrowserNotificationPermission;

const NATIVE_GIFT_LARGE_ICON = 'ic_notif_gift';
const NATIVE_GAME_LARGE_ICON = 'ic_notif_game';
const WEB_GIFT_ICON_PATH = '/assets/notifications/ic_notif_gift.png';
const WEB_GAME_ICON_PATH = '/assets/notifications/ic_notif_game.png';

export interface NotificationIconOptions {
  largeIcon?: string;
  webIcon?: string;
}

export async function sendGameNotification(
  title: string,
  body: string,
  tag: string,
  onInAppFallback?: (title: string, body: string) => void,
  iconOpts?: NotificationIconOptions,
): Promise<boolean> {
  if (isNativeApp()) {
    const perm = await getAppNotificationPermission();
    if (perm === 'granted') {
      try {
        await ensureNativeChannel();
        const id = NATIVE_IMMEDIATE_ID_MIN + (nativeImmediateSeq++ % 900);
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title,
              body,
              channelId: NATIVE_CHANNEL_ID,
              ...(iconOpts?.largeIcon ? { largeIcon: iconOpts.largeIcon } : {}),
              autoCancel: true,
              foreground: true,
              isExactNotification: false,
              schedule: {
                at: new Date(Date.now() + 300),
                allowWhileIdle: true,
              },
              extra: { tag },
            },
          ],
        });
        return true;
      } catch {
        // Fall through to in-app banner if provided
      }
    }
    if (onInAppFallback) {
      onInAppFallback(title, body);
      return true;
    }
    return false;
  }

  const webIcon = iconOpts?.webIcon;
  if (getBrowserNotificationPermission() === 'granted') {
    try {
      const reg = await registerNotificationServiceWorker();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          tag,
          renotify: false,
          ...(webIcon ? { icon: webIcon } : {}),
        } as NotificationOptions);
        return true;
      }
    } catch {
      // Fall back to direct window Notification
    }

    try {
      new Notification(title, {
        body,
        tag,
        ...(webIcon ? { icon: webIcon } : {}),
      });
      return true;
    } catch {
      // Fall through to in-app fallback if embedded
    }
  }

  if (onInAppFallback) {
    onInAppFallback(title, body);
    return true;
  }
  return false;
}

interface NotificationPayload {
  title: string;
  body: string;
  tag: string;
  largeIcon?: string;
  webIcon?: string;
}

function pickNonRepeatingIndex(poolLength: number, usedIds: number[]): number {
  const allIndices = Array.from({ length: poolLength }, (_, i) => i);
  const lastUsed = usedIds.length > 0 ? usedIds[usedIds.length - 1] : -1;
  let available = allIndices.filter((i) => !usedIds.includes(i));
  if (available.length === 0) {
    // Havuz bittiğinde son gönderileni hariç tutarak sıfırla
    available = allIndices.filter((i) => i !== lastUsed);
  }
  if (available.length === 0) return 0;
  return available[Math.floor(Math.random() * available.length)];
}

function getNotificationTitle(lang: AppLanguage): string {
  return lang === 'en' ? 'Bug Escape' : 'Böcek Firarda';
}

function buildDailyRewardNotification(
  usedIds: number[],
  lang: AppLanguage,
): { payload: NotificationPayload; msgIdx: number } {
  const mysteryBodies =
    lang === 'en'
      ? [
          'Your daily gift is ready! Grab yours! 🎁',
          'Mystery reward unlocked! Jump in now! 👀',
          'Your daily chest is waiting! Open it! ✨',
          'Keep your streak! Grab today’s bonus! 🔥',
          'Curly Riza is waiting! Claim your gift! 🥐',
          'Reward time! Mystery bonus is active! ⏰',
          'Today’s surprise is ready! Open now! 🌟',
          'Gift box unlocked! Claim before midnight! 🎉',
          'Fresh out of the oven! Open your gift! 🥖',
          'Secret bonus ready! Your turn to claim! 🗝️',
          'Streak bonus active! Claim yours now! 💎',
          'Lucky day! Today’s chest just unlocked! 🍀',
          'Your daily gift arrived! Claim today! 🚪',
          'Surprise time! Grab your daily reward! 🎊',
        ]
      : [
          'Günlük hediyen hazır! Hemen kap! 🎁',
          'Sürpriz ödülün açıldı! Sıra sende! 👀',
          'Günlük kasan bekliyor! Açıp gör! ✨',
          'Serini bozma! Günlük ödülünü kap! 🔥',
          'Kıvırcık Rıza kapıda! Hediyeni aç! 🥐',
          'Ödül saati! Gizemli bonus aktif! ⏰',
          'Günün sürprizi hazır! Kutunu aç! 🌟',
          'Hediye kutun açıldı! Geç kalma! 🎉',
          'Fırından yeni çıktı! Ödülünü kap! 🥖',
          'Saklı ödülün hazır! Sıra sende! 🗝️',
          'Seri ödülün aktif! Kaçırma! 💎',
          'Şanslı günün! Kilit açıldı, gör! 🍀',
          'Günlük hediyen geldi! Almadan çıkma! 🚪',
          'Sürpriz zamanı! Hemen ödülünü al! 🎊',
        ];

  const msgIdx = pickNonRepeatingIndex(mysteryBodies.length, usedIds);
  return {
    payload: {
      title: getNotificationTitle(lang),
      body: mysteryBodies[msgIdx],
      tag: 'bocek-daily-reward',
      largeIcon: NATIVE_GIFT_LARGE_ICON,
      webIcon: WEB_GIFT_ICON_PATH,
    },
    msgIdx,
  };
}

function buildPrimeTimeNotification(
  save: SaveData,
  usedIds: number[],
  lang: AppLanguage,
): { payload: NotificationPayload; msgIdx: number } {
  const rawSkin = SKINS.find((s) => s.id === save.selectedSkin) || SKINS[0];
  const skinName = getSkinName(rawSkin.id, rawSkin.name, lang);
  const activeDef = save.missions.activeIds
    .map((id) => getMissionById(id))
    .find(Boolean);
  const activeTitle = activeDef
    ? getMissionTitle(activeDef.id, activeDef.title, lang)
    : null;

  const bodies =
    lang === 'en'
      ? [
          save.highScore > 0
            ? `Beat your ${formatNum(save.highScore, 'en')} record with ${skinName}! 🪳`
            : `${skinName} is waiting! Ready to run? 🪳`,
          'Evening race is on! Hit the street! 🏆',
          activeTitle
            ? `Mission: ${activeTitle}! Quick run? 🎯`
            : 'Time for a quick run! Hit the track! ⚡',
          'Homeowner’s chasing! 2-min wild run! 🧹',
          'Grab the Jetpack! Fly to Cheese Galaxy! 🧀',
          'Chaos in the kitchen! Grab crumbs now! 😎',
          'Frozen & Fire realms await! Ready? ❄️',
          'Daily quests ending! Unlock the Chest! ⏳',
          'New hero is close! Grab more crumbs! 🛒',
          'Lights out! Spark headlamp, grab crumbs! 🔦',
          'Doc Roach calls! Smash your record! 🩺',
          'Kazim at full throttle! Grab Turbo! 🔧',
          'Kitchen danger! Dodge the broom now! 🍳',
          'Finish 1 mission to boost your score! 📈',
        ]
      : [
          save.highScore > 0
            ? `${skinName} ile ${formatNum(save.highScore, 'tr')} rekorunu geç! 🪳`
            : `${skinName} bekliyor! Kaçışa hazır mısın? 🪳`,
          'Akşam yarışı kızıştı! Hadi piste! 🏆',
          activeTitle
            ? `Görev bekliyor: ${activeTitle}! 🎯`
            : 'Kısa bir koşu zamanı! Tam gaz koş! ⚡',
          'Ev sahibi peşinde! 2 dk koş, stres at! 🧹',
          'Jetpack’i tak! Galaksiye uç! 🧀',
          'Mutfak karıştı! Altın kırıntıları kap! 😎',
          'Buzul ve Ateş bekliyor! Hazır mısın? ❄️',
          'Görevler bitiyor! Büyük Kasayı aç! ⏳',
          'Yeni karakter yakın! Kırıntı topla! 🛒',
          'Işıklar söndü! Feneri yak, koş! 🔦',
          'Acilci Duktur çağırıyor! Rekor kır! 🩺',
          'Tamirci Kazım tam gaz! Turbo’yu kap! 🔧',
          'Dev Mutfak tehlikede! Engeli sıyır! 🍳',
          '1 görev bitir, skor çarpanını katla! 📈',
        ];

  const msgIdx = pickNonRepeatingIndex(bodies.length, usedIds);
  return {
    payload: {
      title: getNotificationTitle(lang),
      body: bodies[msgIdx],
      tag: 'bocek-prime-time',
      largeIcon: NATIVE_GAME_LARGE_ICON,
      webIcon: WEB_GAME_ICON_PATH,
    },
    msgIdx,
  };
}

/**
 * Android APK (Capacitor) için oyun tamamen kapalıyken dahi çalışacak
 * 27 günlük (7 gün her gün, 8-27. günler 3 günde 1) OS seviyesi alarm planlaması.
 */
export async function syncNativeScheduledNotifications(
  save: SaveData,
  dailyInfo: DailyRewardInfo,
  now = new Date(),
): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const pending = await LocalNotifications.getPending();
    const toCancel = pending.notifications
      .filter(
        (n) =>
          (n.id >= NATIVE_DAILY_ID_BASE && n.id < NATIVE_PRIME_ID_BASE + 100) ||
          n.id >= NATIVE_IMMEDIATE_ID_MIN,
      )
      .map((n) => ({ id: n.id }));

    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }
  } catch {
    // Continue cleanly
  }

  if (!save.notifications.enabled) return;
  const perm = await getAppNotificationPermission();
  if (perm !== 'granted') return;

  const lang = resolveLanguage(save.languagePreference);
  await ensureNativeChannel(lang);

  const todayKey = getLocalDateKey(now);
  const lastOpened = save.notifications.lastOpenedDate || todayKey;
  const upcoming: LocalNotificationSchema[] = [];

  let usedDailyIds = [...save.notifications.usedDailyMsgIds];
  let usedPrimeIds = [...save.notifications.usedPrimeMsgIds];

  for (let dayOffset = 0; dayOffset < 28; dayOffset++) {
    const targetDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + dayOffset,
      0,
      0,
      0,
      0,
    );
    const targetKey = getLocalDateKey(targetDate);
    const inactiveDays = Math.max(
      0,
      getDaysBetweenDateKeys(lastOpened, targetKey),
    );

    if (inactiveDays >= 28) break;
    if (inactiveDays > 7 && (inactiveDays - 8) % 3 !== 0) {
      continue;
    }

    // 1. Günlük Ödül Bildirimi: 09:30 (sessiz saat bitimi)
    const dailyAt = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      9,
      30,
      0,
      0,
    );
    const canScheduleTodayDaily =
      dayOffset > 0 ||
      (dailyInfo.canClaim &&
        save.notifications.lastDailyNotifyDate !== todayKey &&
        dailyAt.getTime() > now.getTime() + 10_000);

    if (canScheduleTodayDaily && dailyAt.getTime() > now.getTime() + 5_000) {
      const { payload, msgIdx } = buildDailyRewardNotification(usedDailyIds, lang);
      usedDailyIds =
        usedDailyIds.length >= 14
          ? [msgIdx]
          : [...usedDailyIds.filter((i) => i !== msgIdx), msgIdx];

      upcoming.push({
        id: NATIVE_DAILY_ID_BASE + dayOffset,
        title: payload.title,
        body: payload.body,
        channelId: NATIVE_CHANNEL_ID,
        ...(payload.largeIcon ? { largeIcon: payload.largeIcon } : {}),
        autoCancel: true,
        isExactNotification: false,
        schedule: {
          at: dailyAt,
          allowWhileIdle: true,
        },
        extra: { tag: payload.tag },
      });
    }

    // 2. Akşam Teşvik Bildirimi: 19:45 (19:30 - 21:30 aralığı)
    const primeAt = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      19,
      45,
      0,
      0,
    );
    const canScheduleTodayPrime =
      dayOffset > 0 ||
      (save.notifications.lastPrimeNotifyDate !== todayKey &&
        primeAt.getTime() > now.getTime() + 10_000);

    if (canScheduleTodayPrime && primeAt.getTime() > now.getTime() + 5_000) {
      const { payload, msgIdx } = buildPrimeTimeNotification(save, usedPrimeIds, lang);
      usedPrimeIds =
        usedPrimeIds.length >= 14
          ? [msgIdx]
          : [...usedPrimeIds.filter((i) => i !== msgIdx), msgIdx];

      upcoming.push({
        id: NATIVE_PRIME_ID_BASE + dayOffset,
        title: payload.title,
        body: payload.body,
        channelId: NATIVE_CHANNEL_ID,
        ...(payload.largeIcon ? { largeIcon: payload.largeIcon } : {}),
        autoCancel: true,
        isExactNotification: false,
        schedule: {
          at: primeAt,
          allowWhileIdle: true,
        },
        extra: { tag: payload.tag },
      });
    }
  }

  if (upcoming.length > 0) {
    try {
      await LocalNotifications.schedule({ notifications: upcoming });
    } catch {
      // Ignore transient OS schedule rejections
    }
  }
}

export async function evaluateAndSendScheduledNotifications(
  save: SaveData,
  dailyInfo: DailyRewardInfo,
  onMarkSent: (slot: 'daily' | 'prime', todayKey: string, msgIdx: number) => void,
  now = new Date(),
): Promise<void> {
  // On native Android/iOS, syncNativeScheduledNotifications handles OS-level background alarms
  // so we never interrupt active gameplay with immediate foreground banners.
  if (!save.notifications.enabled || isNativeApp()) return;
  const perm = await getAppNotificationPermission();
  if (perm !== 'granted') return;

  const todayKey = getLocalDateKey(now);
  const sentToday =
    save.notifications.sentCountDate === todayKey
      ? save.notifications.sentCountToday
      : 0;

  if (sentToday >= 2) return;

  // İnaktiflik kuralı: ilk 7 gün her gün, 8-27. günler 3 günde bir, 28. günde tamamen durur
  const inactiveDays = Math.max(
    0,
    getDaysBetweenDateKeys(save.notifications.lastOpenedDate || todayKey, todayKey),
  );
  if (inactiveDays >= 28) return;
  if (inactiveDays > 7 && sentToday === 0 && save.notifications.lastSentDate) {
    const daysSinceLastSent = getDaysBetweenDateKeys(
      save.notifications.lastSentDate,
      todayKey,
    );
    if (daysSinceLastSent < 3) return;
  }

  const lang = resolveLanguage(save.languagePreference);
  const hour = now.getHours();
  const minute = now.getMinutes();

  // 1. Bildirim: Günlük dönüş hakkı (Gece 23:00 - 09:30 arası sessiz saat -> 09:30'da gider)
  const inDaytimeWindow =
    (hour > 9 || (hour === 9 && minute >= 30)) && hour < 23;
  if (
    dailyInfo.canClaim &&
    inDaytimeWindow &&
    save.notifications.lastDailyNotifyDate !== todayKey
  ) {
    const { payload, msgIdx } = buildDailyRewardNotification(
      save.notifications.usedDailyMsgIds,
      lang,
    );
    const ok = await sendGameNotification(
      payload.title,
      payload.body,
      payload.tag,
      undefined,
      { largeIcon: payload.largeIcon, webIcon: payload.webIcon },
    );
    if (ok) {
      onMarkSent('daily', todayKey, msgIdx);
      return;
    }
  }

  // 2. Bildirim: Akşam 19:30 - 21:30 arası oyuna teşvik bildirimi (günde 1 kez)
  const inPrimeWindow =
    (hour === 19 && minute >= 30) ||
    hour === 20 ||
    (hour === 21 && minute <= 30);
  if (inPrimeWindow && save.notifications.lastPrimeNotifyDate !== todayKey) {
    const { payload, msgIdx } = buildPrimeTimeNotification(
      save,
      save.notifications.usedPrimeMsgIds,
      lang,
    );
    const ok = await sendGameNotification(
      payload.title,
      payload.body,
      payload.tag,
      undefined,
      { largeIcon: payload.largeIcon, webIcon: payload.webIcon },
    );
    if (ok) {
      onMarkSent('prime', todayKey, msgIdx);
    }
  }
}
