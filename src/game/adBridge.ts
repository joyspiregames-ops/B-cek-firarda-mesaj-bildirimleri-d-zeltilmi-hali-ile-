import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import {
  AdMob,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { gameAudio } from './audio';

/**
 * Android / Capacitor AdMob entegrasyonu + Web güvenli yedek arayüzü.
 * - Rewarded (Ödüllü): Oyuncu isterse reklam izleyip ücretsiz canlanır.
 * - Interstitial (Geçiş): Her 2 yanışta 1 kez, oyun sonu çıkışında gösterilir.
 */
export interface AdBridge {
  isRewardedReady: () => boolean;
  showRewardedContinue: () => Promise<boolean>;
  isInterstitialReady: () => boolean;
  showInterstitial: () => Promise<boolean>;
}

export const INTERSTITIAL_CRASH_INTERVAL = 2;
const AD_CRASH_COUNTER_KEY = 'bocek_firar_ad_crash_count';

// Google resmi test reklam birimi ID'leri (env ile gerçek ID verilmezse otomatik kullanılır)
const GOOGLE_TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';
const GOOGLE_TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';

const REWARDED_AD_ID =
  import.meta.env.VITE_ADMOB_REWARDED_ID || GOOGLE_TEST_REWARDED_ID;
const INTERSTITIAL_AD_ID =
  import.meta.env.VITE_ADMOB_INTERSTITIAL_ID || GOOGLE_TEST_INTERSTITIAL_ID;
const USE_TEST_ADS = import.meta.env.VITE_ADMOB_TESTING !== 'false';

let initialized = false;
let initPromise: Promise<void> | null = null;
let rewardedReady = false;
let rewardedLoading = false;
let rewardedRetryTimerId: number | null = null;
let rewardedRetryDelayMs = 15_000;
let interstitialReady = false;
let interstitialLoading = false;
let interstitialRetryTimerId: number | null = null;
let interstitialRetryDelayMs = 15_000;

async function prepareRewardedAd(): Promise<void> {
  if (!Capacitor.isNativePlatform() || rewardedLoading || rewardedReady) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (rewardedRetryTimerId !== null) {
    window.clearTimeout(rewardedRetryTimerId);
    rewardedRetryTimerId = null;
  }
  rewardedLoading = true;
  try {
    await AdMob.prepareRewardVideoAd({
      adId: REWARDED_AD_ID,
      isTesting: USE_TEST_ADS,
      immersiveMode: true,
    });
    rewardedReady = true;
    rewardedRetryDelayMs = 15_000;
  } catch {
    rewardedReady = false;
    const delay = rewardedRetryDelayMs;
    rewardedRetryDelayMs = Math.min(60_000, Math.round(rewardedRetryDelayMs * 1.5));
    rewardedRetryTimerId = window.setTimeout(() => {
      rewardedRetryTimerId = null;
      void prepareRewardedAd();
    }, delay);
  } finally {
    rewardedLoading = false;
  }
}

async function prepareInterstitialAd(): Promise<void> {
  if (!Capacitor.isNativePlatform() || interstitialLoading || interstitialReady) {
    return;
  }
  if (typeof document !== 'undefined' && document.hidden) return;
  if (interstitialRetryTimerId !== null) {
    window.clearTimeout(interstitialRetryTimerId);
    interstitialRetryTimerId = null;
  }
  interstitialLoading = true;
  try {
    await AdMob.prepareInterstitial({
      adId: INTERSTITIAL_AD_ID,
      isTesting: USE_TEST_ADS,
      immersiveMode: true,
    });
    interstitialReady = true;
    interstitialRetryDelayMs = 15_000;
  } catch {
    interstitialReady = false;
    const delay = interstitialRetryDelayMs;
    interstitialRetryDelayMs = Math.min(60_000, Math.round(interstitialRetryDelayMs * 1.5));
    interstitialRetryTimerId = window.setTimeout(() => {
      interstitialRetryTimerId = null;
      void prepareInterstitialAd();
    }, delay);
  } finally {
    interstitialLoading = false;
  }
}

export async function initAdBridge(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await AdMob.initialize({
        initializeForTesting: USE_TEST_ADS,
      });

      await AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
        rewardedReady = true;
      });
      await AdMob.addListener(RewardAdPluginEvents.Showed, () => {
        gameAudio.setAdMuted(true);
      });
      await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
        rewardedReady = false;
      });
      await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
        gameAudio.setAdMuted(false);
      });
      await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        rewardedReady = false;
        gameAudio.setAdMuted(false);
        void prepareRewardedAd();
      });

      await AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
        interstitialReady = true;
      });
      await AdMob.addListener(InterstitialAdPluginEvents.Showed, () => {
        gameAudio.setAdMuted(true);
      });
      await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
        interstitialReady = false;
      });
      await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
        gameAudio.setAdMuted(false);
      });
      await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        interstitialReady = false;
        gameAudio.setAdMuted(false);
        void prepareInterstitialAd();
      });

      initialized = true;
      void prepareRewardedAd();
      void prepareInterstitialAd();
    } catch {
      initPromise = null;
    }
  })();

  return initPromise;
}

export const adBridge: AdBridge = {
  isRewardedReady: () => {
    if (!Capacitor.isNativePlatform()) return false;
    return rewardedReady;
  },

  showRewardedContinue: async () => {
    if (!Capacitor.isNativePlatform()) return false;
    await initAdBridge();
    if (!rewardedReady) {
      void prepareRewardedAd();
      return false;
    }

    rewardedReady = false;
    let earnedReward = false;
    const handles: PluginListenerHandle[] = [];
    let failsafeTimerId: number | null = null;
    gameAudio.setAdMuted(true);

    try {
      let resolveDismiss!: () => void;
      const dismissPromise = new Promise<void>((resolve) => {
        resolveDismiss = resolve;
      });

      const [rewardHandle, dismissHandle, failHandle] = await Promise.all([
        AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          earnedReward = true;
        }),
        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          resolveDismiss();
        }),
        AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
          resolveDismiss();
        }),
      ]);
      handles.push(rewardHandle, dismissHandle, failHandle);

      const rewardItem = await AdMob.showRewardVideoAd();
      if (rewardItem && typeof rewardItem.amount === 'number') {
        earnedReward = true;
      }

      // Wait until user actually closes the ad (including end-card); 90s failsafe prevents hang
      await Promise.race([
        dismissPromise,
        new Promise<void>((resolve) => {
          failsafeTimerId = window.setTimeout(resolve, 90_000);
        }),
      ]);
      return earnedReward;
    } catch {
      return earnedReward;
    } finally {
      if (failsafeTimerId !== null) {
        window.clearTimeout(failsafeTimerId);
      }
      gameAudio.setAdMuted(false);
      await Promise.all(handles.map((h) => h.remove().catch(() => {})));
      void prepareRewardedAd();
    }
  },

  isInterstitialReady: () => {
    if (!Capacitor.isNativePlatform()) return false;
    return interstitialReady;
  },

  showInterstitial: async () => {
    if (!Capacitor.isNativePlatform()) return false;
    await initAdBridge();
    if (!interstitialReady) {
      void prepareInterstitialAd();
      return false;
    }

    interstitialReady = false;
    const handles: PluginListenerHandle[] = [];
    let failsafeTimerId: number | null = null;
    gameAudio.setAdMuted(true);
    try {
      let resolveDismiss!: () => void;
      const dismissPromise = new Promise<void>((resolve) => {
        resolveDismiss = resolve;
      });

      const [dismissHandle, failHandle] = await Promise.all([
        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          resolveDismiss();
        }),
        AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
          resolveDismiss();
        }),
      ]);
      handles.push(dismissHandle, failHandle);

      await AdMob.showInterstitial();
      // Wait for full video/interstitial dismissal so game & audio never resume behind the ad
      await Promise.race([
        dismissPromise,
        new Promise<void>((resolve) => {
          failsafeTimerId = window.setTimeout(resolve, 90_000);
        }),
      ]);
      return true;
    } catch {
      return false;
    } finally {
      if (failsafeTimerId !== null) {
        window.clearTimeout(failsafeTimerId);
      }
      gameAudio.setAdMuted(false);
      await Promise.all(handles.map((h) => h.remove().catch(() => {})));
      void prepareInterstitialAd();
    }
  },
};

export function getCrashCountSinceAd(): number {
  try {
    const raw = localStorage.getItem(AD_CRASH_COUNTER_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

export function recordCrashForAd(): number {
  const next = getCrashCountSinceAd() + 1;
  try {
    localStorage.setItem(AD_CRASH_COUNTER_KEY, String(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}

export function resetCrashCountForAd(): void {
  try {
    localStorage.setItem(AD_CRASH_COUNTER_KEY, '0');
  } catch {
    // Ignore storage quota errors
  }
}

export function willShowInterstitialAfterCrash(): boolean {
  return (
    getCrashCountSinceAd() >= INTERSTITIAL_CRASH_INTERVAL &&
    adBridge.isInterstitialReady()
  );
}

export async function maybeShowInterstitialAfterCrash(): Promise<boolean> {
  if (!willShowInterstitialAfterCrash()) {
    return false;
  }
  const shown = await adBridge.showInterstitial();
  if (shown) {
    resetCrashCountForAd();
  }
  return shown;
}
