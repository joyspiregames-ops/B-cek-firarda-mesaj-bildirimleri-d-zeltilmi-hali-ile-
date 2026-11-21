import { PowerupType, SkinId, ZoneConfig, ZoneId } from './types';

const MENU_VOICE_URLS: Record<SkinId, string> = {
  kivircik_riza: '/audio/menu/kivircik_riza.wav',
  tamirci_kazim: '/audio/menu/tamirci_kazim.wav',
  diva_bocek: '/audio/menu/diva_bocek.wav',
  duktur_bocek: '/assets/media/Acilci_Duktur_ana_sayfa_776dfd35.mp3',
  hahamcan: '/audio/menu/hahamcan.wav',
};

const ZONE_VOICE_URLS: Record<ZoneId, string> = {
  mahalle_caddesi: '/audio/zones/mahalle_caddesi.wav',
  yeralti_magarasi: '/audio/zones/yeralti_magarasi.wav',
  buzul_dunyasi: '/audio/zones/buzul_dunyasi.wav',
  ates_diyari: '/audio/zones/ates_diyari.wav',
  dev_mutfak: '/audio/zones/dev_mutfak.wav',
  kopuklu_banyo: '/audio/zones/kopuklu_banyo.wav',
  cilgin_lab: '/audio/zones/cilgin_lab.wav',
  peynir_galaksisi: '/audio/zones/peynir_galaksisi.wav',
};

type GameEventVoiceKey =
  | 'start'
  | 'revive'
  | 'jetpack'
  | 'turbo'
  | 'magnet'
  | 'shield_break'
  | 'spring'
  | 'near_miss'
  | 'stumble'
  | 'chaser_catch'
  | 'obstacle_crash';

const EVENT_VOICE_URLS: Record<GameEventVoiceKey, string[]> = {
  start: ['/audio/events/start.wav'],
  revive: ['/audio/events/revive.wav'],
  jetpack: ['/audio/events/jetpack_1.wav', '/audio/events/jetpack_2.wav'],
  turbo: ['/audio/events/turbo.wav'],
  magnet: ['/audio/events/magnet.wav'],
  shield_break: ['/audio/events/shield_break.wav'],
  spring: ['/audio/events/spring.wav'],
  near_miss: ['/audio/events/near_miss_1.wav', '/audio/events/near_miss_2.wav'],
  stumble: ['/audio/events/stumble_1.wav', '/audio/events/stumble_2.wav'],
  chaser_catch: ['/audio/events/chaser_catch.wav'],
  obstacle_crash: ['/audio/events/obstacle_crash.mp3'],
};

const MAX_CACHED_VOICE_BUFFERS = 12;
const MAX_CACHED_RAW_VOICES = 12;

const GAME_VOICE_WARM_QUEUE: string[] = Array.from(
  new Set([
    ...EVENT_VOICE_URLS.chaser_catch,
    ...EVENT_VOICE_URLS.obstacle_crash,
    ...EVENT_VOICE_URLS.revive,
    ...EVENT_VOICE_URLS.start,
    ZONE_VOICE_URLS.mahalle_caddesi,
    EVENT_VOICE_URLS.stumble[0],
    ...EVENT_VOICE_URLS.shield_break,
    ...EVENT_VOICE_URLS.spring,
  ]),
);

const VOICE_PRIORITY_FLAVOR = 40;
const VOICE_PRIORITY_EVENT = 65;
const VOICE_PRIORITY_ZONE = 80;
const VOICE_PRIORITY_CRITICAL = 100;

interface PendingGameVoice {
  url: string;
  priority: number;
  queuedAtMs: number;
  onComplete?: () => void;
}

class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambienceMasterGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private ambienceNoise: AudioBufferSourceNode | null = null;
  private ambienceFilter: BiquadFilterNode | null = null;
  private ambienceTimer: number | null = null;
  private currentAmbience: ZoneConfig['ambienceType'] = 'street_evening';

  private sfxEnabled = true;
  private ambienceEnabled = true;
  private sfxVolume = 0.85;
  private ambienceVolume = 0.75;
  private coinCombo = 0;
  private lastCoinTime = 0;
  private isPlaying = false;
  private adMuted = false;

  private fallbackAudioEl: HTMLAudioElement | null = null;
  private voiceRawBytes = new Map<string, ArrayBuffer>();
  private voiceFetchPromises = new Map<string, Promise<ArrayBuffer | null>>();
  private voiceBuffers = new Map<string, AudioBuffer>();
  private voiceDecodePromises = new Map<string, Promise<AudioBuffer | null>>();

  private activeMenuAudioEl: HTMLAudioElement | null = null;
  private activeMenuBufferSrc: AudioBufferSourceNode | null = null;
  private menuVoiceGain: GainNode | null = null;
  private menuVoicePlayToken = 0;

  private activeGameAudioEl: HTMLAudioElement | null = null;
  private activeGameBufferSrc: AudioBufferSourceNode | null = null;
  private gameVoiceGain: GainNode | null = null;
  private gameVoicePlayToken = 0;
  private activeGameVoicePriority = 0;
  private activeGameVoiceStartMs = 0;
  private activeGameVoiceEndMs = 0;
  private activeGameVoiceUrl: string | null = null;
  private isGameVoiceLoading = false;
  private pendingGameVoice: PendingGameVoice | null = null;
  private isVoiceDucking = false;
  private startSequenceToken = 0;
  private startMahalleTimerId: number | null = null;
  private voiceWarmupTimerId: number | null = null;
  private voiceWarmupIndex = 0;
  private lastVariantIndex = new Map<string, number>();
  private lastEventVoiceMs = new Map<string, number>();
  private lastTrainPassSoundMs = 0;
  private lastTaxiHornMs = 0;

  private getFallbackAudioElement(url: string): HTMLAudioElement {
    if (!this.fallbackAudioEl) {
      this.fallbackAudioEl = new Audio();
      this.fallbackAudioEl.preload = 'auto';
    }
    const el = this.fallbackAudioEl;
    el.onended = null;
    try {
      el.pause();
    } catch {
      // ignore
    }
    if (el.getAttribute('data-src') !== url) {
      el.src = url;
      el.setAttribute('data-src', url);
    } else if (el.readyState > 0) {
      try {
        el.currentTime = 0;
      } catch {
        // ignore
      }
    }
    return el;
  }

  private fetchVoiceBytes(url: string): Promise<ArrayBuffer | null> {
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
      return Promise.resolve(null);
    }
    const existing = this.voiceRawBytes.get(url);
    if (existing) return Promise.resolve(existing);

    const inflight = this.voiceFetchPromises.get(url);
    if (inflight) return inflight;

    const p = fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((buf) => {
        if (!buf) {
          this.voiceFetchPromises.delete(url);
          return null;
        }
        this.voiceRawBytes.set(url, buf);
        while (this.voiceRawBytes.size > MAX_CACHED_RAW_VOICES) {
          const oldestRaw = this.voiceRawBytes.keys().next().value;
          if (!oldestRaw) break;
          this.voiceRawBytes.delete(oldestRaw);
        }
        return buf;
      })
      .catch(() => {
        this.voiceFetchPromises.delete(url);
        return null;
      });
    this.voiceFetchPromises.set(url, p);
    return p;
  }

  private cacheVoiceBuffer(url: string, buffer: AudioBuffer): void {
    if (this.voiceBuffers.has(url)) {
      this.voiceBuffers.delete(url);
    }
    this.voiceBuffers.set(url, buffer);
    // Drop compressed raw bytes once decoded to avoid double RAM usage on Android
    this.voiceRawBytes.delete(url);
    this.voiceFetchPromises.delete(url);

    while (this.voiceBuffers.size > MAX_CACHED_VOICE_BUFFERS) {
      const oldestKey = this.voiceBuffers.keys().next().value;
      if (!oldestKey) break;
      if (oldestKey === this.activeGameVoiceUrl) {
        // Move active voice to most-recent spot instead of evicting it mid-play
        const activeBuf = this.voiceBuffers.get(oldestKey);
        this.voiceBuffers.delete(oldestKey);
        if (activeBuf) this.voiceBuffers.set(oldestKey, activeBuf);
        if (this.voiceBuffers.size <= MAX_CACHED_VOICE_BUFFERS) break;
        const nextOldest = this.voiceBuffers.keys().next().value;
        if (!nextOldest || nextOldest === this.activeGameVoiceUrl) break;
        this.voiceBuffers.delete(nextOldest);
      } else {
        this.voiceBuffers.delete(oldestKey);
      }
    }
  }

  private async decodeVoiceUrl(url: string): Promise<AudioBuffer | null> {
    const existing = this.voiceBuffers.get(url);
    if (existing) {
      // Touch LRU order
      this.voiceBuffers.delete(url);
      this.voiceBuffers.set(url, existing);
      return existing;
    }
    if (!this.ctx) return null;
    const inflight = this.voiceDecodePromises.get(url);
    if (inflight) {
      return inflight;
    }

    const promise = (async (): Promise<AudioBuffer | null> => {
      const raw = await this.fetchVoiceBytes(url);
      if (!raw || !this.ctx) return null;
      const afterWait = this.voiceBuffers.get(url);
      if (afterWait) return afterWait;
      try {
        const decoded = await this.ctx.decodeAudioData(raw.slice(0));
        this.cacheVoiceBuffer(url, decoded);
        return decoded;
      } catch {
        return null;
      } finally {
        this.voiceDecodePromises.delete(url);
      }
    })();

    this.voiceDecodePromises.set(url, promise);
    return promise;
  }

  private updateMasterGain(): void {
    if (!this.masterGain || !this.ctx) return;
    const baseGain = this.isVoiceDucking ? 0.52 : 0.75;
    this.masterGain.gain.setTargetAtTime(
      this.sfxEnabled ? baseGain * this.sfxVolume : 0,
      this.ctx.currentTime,
      0.07,
    );
  }

  private setVoiceDucking(active: boolean): void {
    if (this.isVoiceDucking === active) return;
    this.isVoiceDucking = active;
    this.updateMasterGain();
    this.updateAmbienceGain();
  }

  public configure(opts: {
    sfxEnabled: boolean;
    ambienceEnabled: boolean;
    sfxVolume?: number;
    ambienceVolume?: number;
  }): void {
    this.sfxEnabled = opts.sfxEnabled;
    this.ambienceEnabled = opts.ambienceEnabled;
    if (typeof opts.sfxVolume === 'number') this.sfxVolume = opts.sfxVolume;
    if (typeof opts.ambienceVolume === 'number') this.ambienceVolume = opts.ambienceVolume;
    const targetVoiceVol = this.sfxEnabled ? this.sfxVolume : 0;
    this.updateMasterGain();
    if (this.menuVoiceGain && this.ctx) {
      this.menuVoiceGain.gain.setTargetAtTime(
        targetVoiceVol,
        this.ctx.currentTime,
        0.05,
      );
    }
    if (this.activeMenuAudioEl) {
      this.activeMenuAudioEl.volume = targetVoiceVol;
    }
    if (this.gameVoiceGain && this.ctx) {
      this.gameVoiceGain.gain.setTargetAtTime(
        targetVoiceVol,
        this.ctx.currentTime,
        0.05,
      );
    }
    if (this.activeGameAudioEl) {
      this.activeGameAudioEl.volume = targetVoiceVol;
    }
    this.updateAmbienceGain();
  }

  public hasMenuVoice(skinId: SkinId): boolean {
    return Boolean(MENU_VOICE_URLS[skinId]);
  }

  private playMenuBufferVoice(buffer: AudioBuffer, targetVol: number, token: number): boolean {
    if (!this.ctx || token !== this.menuVoicePlayToken) return false;
    if (!this.menuVoiceGain) {
      this.menuVoiceGain = this.ctx.createGain();
      this.menuVoiceGain.connect(this.ctx.destination);
    }
    this.menuVoiceGain.gain.setValueAtTime(targetVol, this.ctx.currentTime);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.menuVoiceGain);
    src.onended = () => {
      if (this.activeMenuBufferSrc === src) {
        this.activeMenuBufferSrc = null;
      }
    };
    this.activeMenuBufferSrc = src;
    src.start(0);
    return true;
  }

  public async playMenuCharacterVoice(
    skinId: SkinId,
    opts?: { auto?: boolean },
  ): Promise<'played' | 'blocked' | 'unavailable'> {
    if (typeof window === 'undefined' || this.adMuted) return 'unavailable';
    const url = MENU_VOICE_URLS[skinId];
    if (!url) return 'unavailable';

    if (opts?.auto && (!this.sfxEnabled || this.sfxVolume <= 0.01)) {
      return 'unavailable';
    }

    if (!opts?.auto) {
      this.unlock();
    }

    this.stopGameVoice();
    this.stopMenuVoice();
    const token = ++this.menuVoicePlayToken;
    const targetVol = this.sfxEnabled ? this.sfxVolume : 0;

    if (this.ctx && this.ctx.state === 'running') {
      const buffer = this.voiceBuffers.get(url) ?? (await this.decodeVoiceUrl(url));
      if (token !== this.menuVoicePlayToken) return 'unavailable';
      if (buffer && this.playMenuBufferVoice(buffer, targetVol, token)) {
        return 'played';
      }
    }

    if (token !== this.menuVoicePlayToken) return 'unavailable';

    if (!opts?.auto) {
      void this.decodeVoiceUrl(url);
    }

    const audio = this.getFallbackAudioElement(url);
    audio.volume = targetVol;
    this.activeMenuAudioEl = audio;
    try {
      await audio.play();
      if (token !== this.menuVoicePlayToken) {
        try {
          audio.pause();
        } catch {
          // ignore
        }
        return 'unavailable';
      }
      return 'played';
    } catch {
      if (this.activeMenuAudioEl === audio) {
        this.activeMenuAudioEl = null;
      }
      return 'blocked';
    }
  }

  public stopMenuVoice(): void {
    this.menuVoicePlayToken += 1;
    if (this.activeMenuBufferSrc) {
      try {
        this.activeMenuBufferSrc.stop();
      } catch {
        // ignore
      }
      this.activeMenuBufferSrc = null;
    }
    if (this.activeMenuAudioEl) {
      try {
        this.activeMenuAudioEl.pause();
        if (this.activeMenuAudioEl.readyState > 0) {
          this.activeMenuAudioEl.currentTime = 0;
        }
      } catch {
        // ignore
      }
      this.activeMenuAudioEl = null;
    }
  }

  private clearStartSequence(): void {
    this.startSequenceToken += 1;
    if (this.startMahalleTimerId !== null) {
      window.clearTimeout(this.startMahalleTimerId);
      this.startMahalleTimerId = null;
    }
  }

  private stopActiveGameVoicePlayback(): void {
    this.gameVoicePlayToken += 1;
    this.activeGameVoicePriority = 0;
    this.activeGameVoiceStartMs = 0;
    this.activeGameVoiceEndMs = 0;
    this.activeGameVoiceUrl = null;
    this.isGameVoiceLoading = false;
    this.setVoiceDucking(false);
    if (this.activeGameBufferSrc) {
      this.activeGameBufferSrc.onended = null;
      try {
        this.activeGameBufferSrc.stop();
      } catch {
        // ignore
      }
      this.activeGameBufferSrc = null;
    }
    if (this.activeGameAudioEl) {
      this.activeGameAudioEl.onended = null;
      try {
        this.activeGameAudioEl.pause();
        if (this.activeGameAudioEl.readyState > 0) {
          this.activeGameAudioEl.currentTime = 0;
        }
      } catch {
        // ignore
      }
      this.activeGameAudioEl = null;
    }
  }

  public stopGameVoice(): void {
    this.pendingGameVoice = null;
    this.clearStartSequence();
    this.stopActiveGameVoicePlayback();
  }

  private pickVariantUrl(key: GameEventVoiceKey): string {
    const list = EVENT_VOICE_URLS[key];
    if (list.length <= 1) return list[0];
    const lastIdx = this.lastVariantIndex.get(key) ?? -1;
    let idx = Math.floor(Math.random() * list.length);
    if (idx === lastIdx) {
      idx = (idx + 1) % list.length;
    }
    this.lastVariantIndex.set(key, idx);
    return list[idx];
  }

  private finishGameVoicePlayback(token: number, onComplete?: () => void): void {
    if (token !== this.gameVoicePlayToken) return;
    this.activeGameBufferSrc = null;
    this.activeGameAudioEl = null;
    this.activeGameVoicePriority = 0;
    this.activeGameVoiceStartMs = 0;
    this.activeGameVoiceEndMs = 0;
    this.activeGameVoiceUrl = null;
    this.isGameVoiceLoading = false;
    this.setVoiceDucking(false);

    onComplete?.();

      // If a queued zone/fresh line is waiting and still relevant, play it right away
      const next = this.pendingGameVoice;
      if (next) {
        this.pendingGameVoice = null;
        const ageMs = performance.now() - next.queuedAtMs;
        const maxAgeMs = next.priority >= VOICE_PRIORITY_ZONE ? 6000 : 800;
        const stillValid =
          ageMs < maxAgeMs &&
          (this.isPlaying || next.priority >= VOICE_PRIORITY_ZONE) &&
          token === this.gameVoicePlayToken;
        if (stillValid) {
          void this.playGameVoiceUrl(next.url, next.priority, next.onComplete);
        }
      }
    }

  private async playGameVoiceUrl(
    url: string,
    priority: number,
    onComplete?: () => void,
  ): Promise<void> {
    if (typeof window === 'undefined' || this.adMuted) return;
    if (!this.sfxEnabled || this.sfxVolume <= 0.01) return;

    const now = performance.now();
    const isOngoing =
      (this.activeGameBufferSrc !== null ||
        this.activeGameAudioEl !== null ||
        this.isGameVoiceLoading) &&
      now < this.activeGameVoiceEndMs;

    if (isOngoing) {
      if (priority <= this.activeGameVoicePriority) {
        const remainingMs = this.activeGameVoiceEndMs - now;
        // Never cut off an active announcement or equal/higher-priority voice.
        // Zone announcements wait behind another zone; instant action lines only queue
        // if <650ms remains so they never play noticeably late.
        const shouldQueue =
          priority >= VOICE_PRIORITY_ZONE ||
          (priority >= VOICE_PRIORITY_EVENT && remainingMs <= 650);
        if (
          shouldQueue &&
          (!this.pendingGameVoice || priority >= this.pendingGameVoice.priority)
        ) {
          this.pendingGameVoice = {
            url,
            priority,
            queuedAtMs: now,
            onComplete,
          };
        }
        return;
      }
      // Strictly higher priority (e.g. crash/revive over all, or new zone over flavor/event)
      // plays immediately with zero lag.
      if (priority >= VOICE_PRIORITY_CRITICAL) {
        this.pendingGameVoice = null;
      }
    }

    this.stopActiveGameVoicePlayback();
    const token = ++this.gameVoicePlayToken;
    const targetVol = this.sfxVolume;
    this.activeGameVoicePriority = priority;
    this.activeGameVoiceStartMs = now;
    this.activeGameVoiceEndMs = now + 7000;
    this.activeGameVoiceUrl = url;
    this.isGameVoiceLoading = true;
    this.setVoiceDucking(true);

    if (this.ctx && this.ctx.state === 'running') {
      const buffer = this.voiceBuffers.get(url) ?? (await this.decodeVoiceUrl(url));
      if (token !== this.gameVoicePlayToken) return;
      if (buffer) {
        this.isGameVoiceLoading = false;
        if (!this.gameVoiceGain) {
          this.gameVoiceGain = this.ctx.createGain();
          this.gameVoiceGain.connect(this.ctx.destination);
        }
        this.gameVoiceGain.gain.setValueAtTime(targetVol, this.ctx.currentTime);
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(this.gameVoiceGain);
        this.activeGameVoiceStartMs = performance.now();
        this.activeGameVoiceEndMs =
          this.activeGameVoiceStartMs + buffer.duration * 1000;
        src.onended = () => {
          this.finishGameVoicePlayback(token, onComplete);
        };
        this.activeGameBufferSrc = src;
        src.start(0);
        return;
      }
    }

    if (token !== this.gameVoicePlayToken) return;
    this.isGameVoiceLoading = false;
    void this.decodeVoiceUrl(url);

    const audio = this.getFallbackAudioElement(url);
    audio.volume = targetVol;
    this.activeGameAudioEl = audio;
    const estDurMs =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration * 1000
        : 6000;
    this.activeGameVoiceStartMs = performance.now();
    this.activeGameVoiceEndMs = this.activeGameVoiceStartMs + estDurMs;
    audio.onended = () => {
      this.finishGameVoicePlayback(token, onComplete);
    };
    try {
      await audio.play();
    } catch {
      this.pendingGameVoice = null;
      this.finishGameVoicePlayback(token);
    }
  }

  public playRunStart(canAnnounceMahalle: () => boolean): void {
    this.stopGameVoice();
    if (!this.sfxEnabled || this.sfxVolume <= 0.01) return;
    const seqToken = ++this.startSequenceToken;
    const startUrl = this.pickVariantUrl('start');
    void this.playGameVoiceUrl(startUrl, VOICE_PRIORITY_ZONE, () => {
      if (seqToken !== this.startSequenceToken) return;
      this.startMahalleTimerId = window.setTimeout(() => {
        this.startMahalleTimerId = null;
        if (seqToken !== this.startSequenceToken) return;
        if (!this.isPlaying || !canAnnounceMahalle()) return;
        this.playZoneAnnouncement('mahalle_caddesi');
      }, 480);
    });
  }

  public prewarmZoneVoice(zoneId: ZoneId): void {
    if (!this.sfxEnabled || this.sfxVolume <= 0.01 || this.adMuted || !this.ctx) {
      return;
    }
    const url = ZONE_VOICE_URLS[zoneId];
    if (!url || this.voiceBuffers.has(url) || this.voiceDecodePromises.has(url)) {
      return;
    }
    void this.decodeVoiceUrl(url);
  }

  public playZoneAnnouncement(zoneId: ZoneId): void {
    if (zoneId !== 'mahalle_caddesi') {
      this.clearStartSequence();
    }
    const url = ZONE_VOICE_URLS[zoneId];
    if (!url) return;
    void this.playGameVoiceUrl(url, VOICE_PRIORITY_ZONE);
  }

  public playPowerupVoice(type: PowerupType): void {
    const key: GameEventVoiceKey | null =
      type === 'wings'
        ? 'jetpack'
        : type === 'turbo'
          ? 'turbo'
          : type === 'magnet'
            ? 'magnet'
            : null;
    if (!key) return;
    void this.playGameVoiceUrl(this.pickVariantUrl(key), VOICE_PRIORITY_EVENT);
  }

  public playShieldBreakVoice(): void {
    void this.playGameVoiceUrl(
      this.pickVariantUrl('shield_break'),
      VOICE_PRIORITY_EVENT,
    );
  }

  public playSpringVoice(): void {
    const now = performance.now();
    const last = this.lastEventVoiceMs.get('spring') ?? 0;
    if (now - last < 2800) return;
    this.lastEventVoiceMs.set('spring', now);
    void this.playGameVoiceUrl(this.pickVariantUrl('spring'), VOICE_PRIORITY_EVENT);
  }

  public playNearMissVoice(): void {
    const now = performance.now();
    const last = this.lastEventVoiceMs.get('near_miss') ?? 0;
    if (now - last < 6500) return;
    const url = this.pickVariantUrl('near_miss');
    this.lastEventVoiceMs.set('near_miss', now);
    void this.playGameVoiceUrl(url, VOICE_PRIORITY_FLAVOR);
  }

  public playStumbleVoice(): void {
    void this.playGameVoiceUrl(this.pickVariantUrl('stumble'), VOICE_PRIORITY_EVENT);
  }

  public playCrashVoice(deathType: 'obstacle' | 'chaser'): void {
    this.clearStartSequence();
    const key: GameEventVoiceKey =
      deathType === 'chaser' ? 'chaser_catch' : 'obstacle_crash';
    void this.playGameVoiceUrl(this.pickVariantUrl(key), VOICE_PRIORITY_CRITICAL);
  }

  public playReviveVoice(): void {
    this.clearStartSequence();
    void this.playGameVoiceUrl(this.pickVariantUrl('revive'), VOICE_PRIORITY_CRITICAL);
  }

  private pumpSequentialVoiceWarmup(): void {
    if (typeof window === 'undefined' || !this.ctx) return;
    if (this.adMuted || (typeof document !== 'undefined' && document.hidden)) return;
    if (this.voiceWarmupIndex >= GAME_VOICE_WARM_QUEUE.length) return;
    const url = GAME_VOICE_WARM_QUEUE[this.voiceWarmupIndex++];
    void this.decodeVoiceUrl(url).finally(() => {
      if (!this.ctx || this.voiceWarmupIndex >= GAME_VOICE_WARM_QUEUE.length) return;
      if (this.adMuted || (typeof document !== 'undefined' && document.hidden)) return;
      this.voiceWarmupTimerId = window.setTimeout(() => {
        this.voiceWarmupTimerId = null;
        this.pumpSequentialVoiceWarmup();
      }, 65);
    });
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.sfxEnabled ? 0.75 * this.sfxVolume : 0;
      this.masterGain.connect(this.ctx.destination);

      this.ambienceMasterGain = this.ctx.createGain();
      this.ambienceMasterGain.gain.value = this.ambienceEnabled
        ? 0.65 * this.ambienceVolume
        : 0;
      this.ambienceMasterGain.connect(this.ctx.destination);

      this.setupAmbienceNodes();
      // Immediately warm crash/start/first-zone and trickle-decode the rest 1-by-1
      // with zero startup hitch and zero <audio> element bloat.
      void this.decodeVoiceUrl(EVENT_VOICE_URLS.chaser_catch[0]);
      void this.decodeVoiceUrl(EVENT_VOICE_URLS.obstacle_crash[0]);
      void this.decodeVoiceUrl(EVENT_VOICE_URLS.start[0]);
      void this.decodeVoiceUrl(ZONE_VOICE_URLS.mahalle_caddesi);
      this.pumpSequentialVoiceWarmup();
    }
    if (!this.adMuted && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setAdMuted(muted: boolean): void {
    this.adMuted = muted;
    if (muted) {
      this.suspendForBackground();
    } else {
      this.resumeFromBackground();
    }
  }

  public suspendForBackground(): void {
    this.stopMenuVoice();
    this.stopGameVoice();
    if (this.fallbackAudioEl) {
      try {
        this.fallbackAudioEl.pause();
      } catch {
        // ignore
      }
    }
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  public resumeFromBackground(): void {
    if (this.adMuted) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private setupAmbienceNodes(): void {
    if (!this.ctx || !this.ambienceMasterGain) return;
    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.value = 0;
    this.ambienceGain.connect(this.ambienceMasterGain);

    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.025 * white) / 1.025;
      lastOut = data[i];
      data[i] *= 1.8;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 340;

    noise.connect(filter);
    filter.connect(this.ambienceGain);
    noise.start();

    this.ambienceNoise = noise;
    this.ambienceFilter = filter;

    this.startAmbienceEvents();
  }

  private startAmbienceEvents(): void {
    if (this.ambienceTimer !== null) {
      window.clearInterval(this.ambienceTimer);
    }
    this.ambienceTimer = window.setInterval(() => {
      if (
        !this.isPlaying ||
        !this.ambienceEnabled ||
        !this.ctx ||
        this.ctx.state !== 'running'
      ) {
        return;
      }
      const roll = Math.random();
      switch (this.currentAmbience) {
        case 'street_evening':
          if (roll < 0.32) this.playDistantHorn();
          else if (roll < 0.6) this.playCarPassWhoosh();
          break;
        case 'earth_cavern':
          if (roll < 0.5) this.playCricketChirp();
          break;
        case 'ice_wind':
          if (roll < 0.65) this.playCarPassWhoosh();
          break;
        case 'fire_volcano':
          if (roll < 0.45) this.playDistantSiren();
          else if (roll < 0.7) this.playCarPassWhoosh();
          break;
        case 'kitchen_clatter':
          if (roll < 0.5) this.playKitchenClink();
          break;
        case 'bath_bubbles':
          if (roll < 0.6) this.playBubblePop();
          break;
        case 'lab_hum':
          if (roll < 0.5) this.playLabBlip();
          break;
        case 'space_synth':
          if (roll < 0.55) this.playSpaceShimmer();
          break;
      }
    }, 2400);
  }

  public setPlaying(playing: boolean): void {
    this.isPlaying = playing;
    if (playing) {
      this.stopMenuVoice();
    }
    this.updateAmbienceGain();
  }

  public setZoneAmbience(type: ZoneConfig['ambienceType']): void {
    this.currentAmbience = type;
    if (!this.ctx || !this.ambienceFilter) return;
    const freqMap: Record<ZoneConfig['ambienceType'], number> = {
      street_evening: 340,
      earth_cavern: 170,
      ice_wind: 740,
      fire_volcano: 260,
      kitchen_clatter: 480,
      bath_bubbles: 560,
      lab_hum: 220,
      space_synth: 410,
    };
    this.ambienceFilter.frequency.setTargetAtTime(
      freqMap[type],
      this.ctx.currentTime,
      0.4,
    );
  }

  private updateAmbienceGain(): void {
    if (!this.ctx) return;
    if (this.ambienceMasterGain) {
      const busBase = this.isVoiceDucking ? 0.36 : 0.65;
      const busTarget =
        this.isPlaying && this.ambienceEnabled
          ? busBase * this.ambienceVolume
          : 0;
      this.ambienceMasterGain.gain.setTargetAtTime(
        busTarget,
        this.ctx.currentTime,
        0.18,
      );
    }
    if (this.ambienceGain) {
      const noiseTarget = this.isPlaying && this.ambienceEnabled ? 0.09 : 0;
      this.ambienceGain.gain.setTargetAtTime(
        noiseTarget,
        this.ctx.currentTime,
        0.2,
      );
    }
  }

  private playCarPassWhoosh(): void {
    if (!this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    this.ambienceGain.gain.setValueAtTime(0.09, now);
    this.ambienceGain.gain.linearRampToValueAtTime(0.17, now + 0.35);
    this.ambienceGain.gain.linearRampToValueAtTime(0.09, now + 0.9);
  }

  private playCricketChirp(): void {
    if (!this.ctx || !this.ambienceMasterGain) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.065;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(4200 + Math.random() * 150, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.028, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      osc.connect(g);
      g.connect(this.ambienceMasterGain);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  }

  private playDistantHorn(): void {
    if (!this.ctx || !this.ambienceMasterGain) return;
    const now = this.ctx.currentTime;
    [340, 425].forEach((freq) => {
      if (!this.ctx || !this.ambienceMasterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 680;
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.025, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.ambienceMasterGain);
      osc.start(now);
      osc.stop(now + 0.27);
    });
  }

  private playBikeBell(): void {
    if (!this.ctx || !this.ambienceMasterGain) return;
    const now = this.ctx.currentTime;
    [0, 0.11].forEach((offset) => {
      if (!this.ctx || !this.ambienceMasterGain) return;
      const t = now + offset;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600, t);
      g.gain.setValueAtTime(0.032, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g);
      g.connect(this.ambienceMasterGain);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  private playDistantSiren(): void {
    if (!this.ctx || !this.ambienceMasterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.linearRampToValueAtTime(840, now + 0.35);
    osc.frequency.linearRampToValueAtTime(620, now + 0.7);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.025, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    osc.connect(g);
    g.connect(this.ambienceMasterGain);
    osc.start(now);
    osc.stop(now + 0.74);
  }

  private playKitchenClink(): void {
    if (!this.ctx || !this.ambienceMasterGain) return;
    const now = this.ctx.currentTime;
    [1480, 2120].forEach((freq, i) => {
      if (!this.ctx || !this.ambienceMasterGain) return;
      const t = now + i * 0.08;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq + Math.random() * 120, t);
      g.gain.setValueAtTime(0.025, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(g);
      g.connect(this.ambienceMasterGain);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  private playBubblePop(): void {
    if (!this.ctx || !this.ambienceMasterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    const startF = 380 + Math.random() * 240;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(startF * 2.2, now + 0.09);
    g.gain.setValueAtTime(0.032, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(g);
    g.connect(this.ambienceMasterGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  private playLabBlip(): void {
    if (!this.ctx || !this.ambienceMasterGain) return;
    const now = this.ctx.currentTime;
    [880, 1174].forEach((freq, i) => {
      if (!this.ctx || !this.ambienceMasterGain) return;
      const t = now + i * 0.11;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.022, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(g);
      g.connect(this.ambienceMasterGain);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }

  private playSpaceShimmer(): void {
    if (!this.ctx || !this.ambienceMasterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.linearRampToValueAtTime(783.99, now + 0.45);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.028, now + 0.14);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(g);
    g.connect(this.ambienceMasterGain);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playCoin(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    if (now - this.lastCoinTime < 0.45) {
      this.coinCombo = Math.min(this.coinCombo + 1, 10);
    } else {
      this.coinCombo = 0;
    }
    this.lastCoinTime = now;

    const baseFreq = 860 + this.coinCombo * 52;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, now + 0.08);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playLaneSwitch(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.045);
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playJump(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.15);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playSlide(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(105, now + 0.14);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 560;
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playTrafficWarning(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [0, 0.14].forEach((offset) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + offset;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, t);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 780;
      g.gain.setValueAtTime(0.055, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  public playTaxiHornPass(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain || this.adMuted) return;
    const nowMs = performance.now();
    if (nowMs - this.lastTaxiHornMs < 700) return;
    this.lastTaxiHornMs = nowMs;

    const now = this.ctx.currentTime;
    // Classic Istanbul/city taxi dual-tone horn ("DİT - DİİİT!")
    const honks = [
      { offset: 0, dur: 0.11, peak: 0.14 },
      { offset: 0.155, dur: 0.22, peak: 0.165 },
    ];
    honks.forEach(({ offset, dur, peak }) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + offset;
      [415, 523.25].forEach((freq) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        // Slight Doppler pitch drop on the second honk as the taxi sweeps past
        if (offset > 0) {
          osc.frequency.exponentialRampToValueAtTime(freq * 0.93, t + dur);
        }
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1450, t);
        filter.Q.value = 1.6;

        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.016);
        g.gain.setValueAtTime(peak * 0.92, t + dur * 0.65);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc.connect(filter);
        filter.connect(g);
        g.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      });
    });

    // Crisp rushing tire/air pass-by right alongside the horn
    const passDur = 0.42;
    const len = Math.floor(this.ctx.sampleRate * passDur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.sin((i / len) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(760, now + 0.05);
    bp.frequency.exponentialRampToValueAtTime(240, now + passDur);
    bp.Q.value = 1.2;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.001, now);
    ng.gain.linearRampToValueAtTime(0.15, now + 0.14);
    ng.gain.exponentialRampToValueAtTime(0.001, now + passDur);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(this.masterGain);
    noise.start(now);
  }

  public playMovingTrainPass(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain || this.adMuted) return;
    const nowMs = performance.now();
    if (nowMs - this.lastTrainPassSoundMs < 900) return;
    this.lastTrainPassSoundMs = nowMs;

    const now = this.ctx.currentTime;

    // 1. Powerful deep subway locomotive dual-chord horn (D3 + F#3 + A3)
    const hornNotes = [
      { freq: 146.83, gain: 0.17 },
      { freq: 185.0, gain: 0.15 },
      { freq: 220.0, gain: 0.12 },
    ];
    hornNotes.forEach(({ freq, gain }) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.015, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.91, now + 0.64);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(620, now);
      filter.frequency.linearRampToValueAtTime(980, now + 0.14);
      filter.frequency.exponentialRampToValueAtTime(420, now + 0.64);
      filter.Q.value = 1.4;

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(gain, now + 0.045);
      g.gain.setValueAtTime(gain * 0.9, now + 0.36);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.67);
    });

    // 2. Heavy underground rail & tunnel rumble sweeping across the 2 coupled train cars
    const rumbleDur = 1.05;
    const rumbleLen = Math.floor(this.ctx.sampleRate * rumbleDur);
    const rumbleBuf = this.ctx.createBuffer(1, rumbleLen, this.ctx.sampleRate);
    const rumbleData = rumbleBuf.getChannelData(0);
    let lastSample = 0;
    for (let i = 0; i < rumbleLen; i++) {
      const white = Math.random() * 2 - 1;
      lastSample = (lastSample + 0.08 * white) / 1.08;
      rumbleData[i] = lastSample * 2.4;
    }
    const rumbleSrc = this.ctx.createBufferSource();
    rumbleSrc.buffer = rumbleBuf;
    const rumbleLp = this.ctx.createBiquadFilter();
    rumbleLp.type = 'lowpass';
    rumbleLp.frequency.setValueAtTime(160, now);
    rumbleLp.frequency.linearRampToValueAtTime(340, now + 0.32);
    rumbleLp.frequency.exponentialRampToValueAtTime(110, now + rumbleDur);
    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.001, now);
    rumbleGain.gain.linearRampToValueAtTime(0.32, now + 0.22);
    rumbleGain.gain.setValueAtTime(0.28, now + 0.58);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + rumbleDur);
    rumbleSrc.connect(rumbleLp);
    rumbleLp.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    rumbleSrc.start(now);

    // 3. Rhythmic steel wagon wheel rail-joint clacks ("tak-tak ... tak-tak ... tak-tak")
    const clackOffsets = [0.1, 0.2, 0.42, 0.52, 0.74, 0.84];
    clackOffsets.forEach((offset, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + offset;
      const clackLen = Math.floor(this.ctx.sampleRate * 0.065);
      const clackBuf = this.ctx.createBuffer(1, clackLen, this.ctx.sampleRate);
      const cData = clackBuf.getChannelData(0);
      for (let i = 0; i < clackLen; i++) {
        cData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (clackLen * 0.24));
      }
      const cSrc = this.ctx.createBufferSource();
      cSrc.buffer = clackBuf;
      const cBp = this.ctx.createBiquadFilter();
      cBp.type = 'bandpass';
      cBp.frequency.value = idx % 2 === 0 ? 780 : 1040;
      cBp.Q.value = 1.6;
      const cGain = this.ctx.createGain();
      const envScale = offset > 0.6 ? 0.75 : 1.0;
      cGain.gain.setValueAtTime(0.22 * envScale, t);
      cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
      cSrc.connect(cBp);
      cBp.connect(cGain);
      cGain.connect(this.masterGain);
      cSrc.start(t);

      // Steel rail thump under each wheel hit
      const thud = this.ctx.createOscillator();
      const tg = this.ctx.createGain();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(idx % 2 === 0 ? 115 : 98, t);
      thud.frequency.exponentialRampToValueAtTime(48, t + 0.06);
      tg.gain.setValueAtTime(0.16 * envScale, t);
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
      thud.connect(tg);
      tg.connect(this.masterGain);
      thud.start(t);
      thud.stop(t + 0.07);
    });
  }

  public playPowerup(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.055;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.13, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  public playShieldBreak(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [1400, 1900, 1100].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + i * 0.03;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  public playZoneTransition(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [440, 554.37, 659.25].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + i * 0.07;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  public playCountdownTick(isGo = false): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = isGo ? [880, 1174.66] : [660];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.065;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.11, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.16 : 0.095));
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + (isGo ? 0.17 : 0.1));
    });
  }

  public playSpringLaunch(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(1180, now + 0.28);
    g.gain.setValueAtTime(0.19, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  public playWingsFlap(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [0, 0.1].forEach((offset, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + offset;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 480 : 640, t);
      osc.frequency.exponentialRampToValueAtTime(idx === 0 ? 780 : 980, t + 0.14);
      g.gain.setValueAtTime(0.13, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  public playStumble(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.2);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playSlap(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // 1. Crisp palm-smack noise burst
    const len = Math.floor(this.ctx.sampleRate * 0.11);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.26));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1650, now);
    bp.frequency.exponentialRampToValueAtTime(520, now + 0.09);
    bp.Q.value = 1.1;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.42, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(this.masterGain);
    noise.start(now);

    // 2. Heavy comic thud underneath
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.13);
    og.gain.setValueAtTime(0.28, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(og);
    og.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playNewRecord(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    fanfare.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + i * 0.065;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playCrash(): void {
    if (!this.sfxEnabled || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.42);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 580;
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  public dispose(): void {
    if (this.voiceWarmupTimerId !== null) {
      window.clearTimeout(this.voiceWarmupTimerId);
      this.voiceWarmupTimerId = null;
    }
    this.stopMenuVoice();
    this.stopGameVoice();
    if (this.fallbackAudioEl) {
      try {
        this.fallbackAudioEl.pause();
        this.fallbackAudioEl.removeAttribute('src');
      } catch {
        // ignore
      }
      this.fallbackAudioEl = null;
    }
    this.voiceRawBytes.clear();
    this.voiceFetchPromises.clear();
    this.voiceBuffers.clear();
    this.voiceDecodePromises.clear();
    if (this.ambienceTimer !== null) {
      window.clearInterval(this.ambienceTimer);
      this.ambienceTimer = null;
    }
    try {
      this.ambienceNoise?.stop();
    } catch {
      // ignore
    }
    try {
      this.ctx?.close();
    } catch {
      // ignore
    }
    this.ctx = null;
  }
}

export const gameAudio = new GameAudioEngine();
