import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gameAudio } from './audio';
import { DEATH_REASONS, ZONES, pickDialogue } from './dialogues';
import {
  CAVE_TRAIN_HALF_DEPTH,
  CAVE_TRAIN_ROOF_Y,
  CockroachRig,
  bakeStaticGroup,
  createBathRampModel,
  createBathSegmentProps,
  createBeakerVatModel,
  createBioDrumStackModel,
  createBiomeTransitionGateModel,
  createBroomModel,
  createButterBlockModel,
  createCaveTrainModel,
  createCheeseAsteroidModel,
  createCheeseSatelliteModel,
  createCityBusWithRampModel,
  createCityTreeModel,
  createCockroachModel,
  createConeBarrierModel,
  createCrystalPillarModel,
  createDumpsterModel,
  createEarthBoulderModel,
  createEarthCavernSegmentProps,
  createEarthRampModel,
  createFireBarrelModel,
  createFirePillarModel,
  createFireWorldSegmentProps,
  createFridgeBlockModel,
  createGiantSlipperModel,
  createIceCrystalModel,
  createIceRampModel,
  createIceWallModel,
  createIceWorldSegmentProps,
  createIcicleArchModel,
  createJellyCubeModel,
  createKitchenRampModel,
  createKitchenSegmentProps,
  createLabRampModel,
  createLabSegmentProps,
  createLaserArchModel,
  createLavaCauldronModel,
  createLavaRampModel,
  createLavaRockModel,
  createMagmaArchModel,
  createMahalleSegmentDecor,
  createMovingDuckTubModel,
  createMovingIceSledModel,
  createMovingLabBotModel,
  createMovingMagmaCartModel,
  createMovingMixerCartModel,
  createMovingSpaceRoverModel,
  createMovingTaxiModel,
  createMushroomClusterModel,
  createPhoneRoachObstacle,
  createPowerupModel,
  createRaidCanModel,
  createRecordGateModel,
  createRoadSignHighModel,
  createRollingPinModel,
  createRootArchModel,
  createShampooTowerModel,
  createShowcasePedestal,
  createSimitCoinModel,
  createSkywaySegmentModel,
  createSnowBallModel,
  createSnowmanBarrierModel,
  createSoapBarModel,
  createSpaceMeteorModel,
  createSpaceRampModel,
  createSpaceSegmentProps,
  createSpectatorCockroachModel,
  createSpringPadModel,
  createStreetArchModel,
  createStreetLampModel,
  createTaxiModel,
  createTireModel,
  createToasterArchModel,
  createTomatoBallModel,
  createTowelArchModel,
  createTpRollModel,
  createTunnelDescentModel,
  createTunnelStaircaseExitModel,
  createUfoSaucerModel,
  createWarpArchModel,
  disposeModelsModuleSingletons,
  isCaveTrainModelReady,
  preloadCaveTrainModel,
} from './models';
import {
  CHARACTER_GLB_URLS,
  GlbCharacterController,
  GlbChaserController,
  type LoadedGlbAsset,
  disposeAllCachedGlbAssets,
  evictUnusedCharacterGlbs,
  getCachedCharacterGlb,
  getCachedChaserGlb,
  preloadCharacterGlb,
  preloadChaserGlb,
} from './glbCharacters';
import { SKINS } from './storage';
import { CityTextureSet, createCityTextures } from './textures';
import {
  DialogueLine,
  DialogueTrigger,
  GamePhase,
  GraphicsQuality,
  HudSnapshot,
  PowerupType,
  RunMetrics,
  SkinId,
  UpgradeKey,
  ZoneConfig,
  ZoneId,
} from './types';

// Exact 3-lane centers matching the 7.8m wide road (each lane = 2.6m wide!)
const ROAD_WIDTH = 7.8;
const LANE_X = [-2.6, 0, 2.6];
const SEGMENT_LENGTH = 20;
const SEGMENT_COUNT = 11;
const ZONE_DISTANCE = 850;
const TUNNEL_DEPTH = -4.2;
const TRANSITION_IN_METERS = 24;
const TRANSITION_OUT_SECONDS = 0.85;
const BASE_SPEED = 19.2;
const MAX_SPEED = 44.5;
const ROLL_DURATION = 0.72;
const BUS_ROOF_Y = 1.95;
const MAX_SIM_STEP = 1 / 48;
const JET_EXHAUST_INTERVAL = 1 / 60;
const MENU_SHOWCASE_Z = -0.55;

const INITIAL_STAGE_ORDER: ZoneId[] = [
  'mahalle_caddesi',
  'yeralti_magarasi',
  'buzul_dunyasi',
  'ates_diyari',
  'dev_mutfak',
  'kopuklu_banyo',
  'cilgin_lab',
  'peynir_galaksisi',
];

const ZONE_LIGHT_COLORS: Record<
  ZoneId,
  { dir: number; hemiSky: number; hemiGround: number }
> = {
  mahalle_caddesi: { dir: 0xffedd5, hemiSky: 0x93c5fd, hemiGround: 0x1e293b },
  yeralti_magarasi: { dir: 0xfde68a, hemiSky: 0x92400e, hemiGround: 0x1c1008 },
  buzul_dunyasi: { dir: 0xe0f2fe, hemiSky: 0xbae6fd, hemiGround: 0x0c4a6e },
  ates_diyari: { dir: 0xfdba74, hemiSky: 0xf97316, hemiGround: 0x450a0a },
  dev_mutfak: { dir: 0xfef3c7, hemiSky: 0xfde68a, hemiGround: 0x78350f },
  kopuklu_banyo: { dir: 0xf0fdfa, hemiSky: 0xa5f3fc, hemiGround: 0x0e7490 },
  cilgin_lab: { dir: 0xdcfce7, hemiSky: 0x86efac, hemiGround: 0x052e16 },
  peynir_galaksisi: { dir: 0xf5d0fe, hemiSky: 0xc084fc, hemiGround: 0x1e1b4b },
};

type ObstacleKind =
  | 'taxi'
  | 'moving_taxi'
  | 'bus_ramp'
  | 'terrain_ramp'
  | 'spring_pad'
  | 'dumpster'
  | 'cone'
  | 'tire'
  | 'road_sign'
  | 'phone_roach'
  | 'moving_train'
  | 'parked_train'
  | 'earth_boulder'
  | 'crystal_pillar'
  | 'root_arch'
  | 'mushroom_cluster'
  | 'ice_wall'
  | 'ice_crystal'
  | 'moving_ice_sled'
  | 'snowman_barrier'
  | 'icicle_arch'
  | 'snow_ball'
  | 'lava_rock'
  | 'fire_pillar'
  | 'moving_magma_cart'
  | 'lava_cauldron'
  | 'magma_arch'
  | 'fire_barrel'
  | 'rolling_pin'
  | 'butter_block'
  | 'fridge_block'
  | 'moving_mixer_cart'
  | 'toaster_arch'
  | 'tomato_ball'
  | 'giant_slipper'
  | 'moving_duck_tub'
  | 'shampoo_tower'
  | 'soap_bar'
  | 'towel_arch'
  | 'tp_roll'
  | 'raid_can'
  | 'beaker_vat'
  | 'moving_lab_bot'
  | 'bio_drum_stack'
  | 'laser_arch'
  | 'jelly_cube'
  | 'ufo_saucer'
  | 'cheese_asteroid'
  | 'moving_space_rover'
  | 'cheese_satellite'
  | 'warp_arch'
  | 'space_meteor';

function isMovingObstacleKind(kind: ObstacleKind): boolean {
  return (
    kind === 'moving_taxi' ||
    kind === 'moving_train' ||
    kind === 'moving_ice_sled' ||
    kind === 'moving_magma_cart' ||
    kind === 'moving_mixer_cart' ||
    kind === 'moving_duck_tub' ||
    kind === 'moving_lab_bot' ||
    kind === 'moving_space_rover'
  );
}

interface ObstacleSubBox {
  minZ: number;
  maxZ: number;
  minY: number;
  height: number;
  halfWidth?: number;
}

interface ActiveObstacle {
  id: number;
  kind: ObstacleKind;
  poolKey: string;
  lane: number;
  z: number;
  baseY: number;
  mesh: THREE.Group;
  trafficSpeed?: number;
  visualX?: number;
  impactDone?: boolean;
  nearMissAwarded?: boolean;
  roofCredited?: boolean;
  height: number;
  minY: number;
  halfDepth: number;
  halfWidth?: number;
  subBoxes?: ObstacleSubBox[];
}

interface ActiveCoin {
  lane: number;
  z: number;
  y: number;
  localY: number;
  isSkyCoin?: boolean;
  mesh: THREE.Group;
}

interface ActivePowerup {
  type: PowerupType;
  lane: number;
  z: number;
  baseY: number;
  localY?: number;
  mesh: THREE.Group;
}

interface StreetSegment {
  index: number;
  group: THREE.Group;
  spectators: THREE.Group[];
  biomeGroups: Partial<Record<ZoneId, THREE.Group>> & { mahalle_caddesi: THREE.Group };
  activeBiomeGroup: THREE.Group;
  activeZoneId: ZoneId;
  skywayGroup: THREE.Group;
  biomeVisible: boolean;
}

interface QualityProfile {
  pixelRatioCap: number;
  lowResRatio: number | null;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  shadowFrustumHalf: number;
  envIntensity: number;
  toneExposure: number;
  cameraFar: number;
  segmentCutoffZ: number;
  fogNear: number;
  fogFar: number;
  starsRatio: number;
  particleRatio: number;
  burstMultiplier: number;
  anisotropyCap: number;
  headlampDistance: number;
  menuKeyIntensity: number;
  menuRimIntensity: number;
}

const QUALITY_PROFILES: Record<GraphicsQuality, QualityProfile> = {
  low: {
    pixelRatioCap: 0.65,
    lowResRatio: 0.62,
    shadowsEnabled: false,
    shadowMapSize: 512,
    shadowFrustumHalf: 12,
    envIntensity: 0,
    toneExposure: 1.0,
    cameraFar: 96,
    segmentCutoffZ: -74,
    fogNear: 34,
    fogFar: 88,
    starsRatio: 0,
    particleRatio: 0.25,
    burstMultiplier: 0.35,
    anisotropyCap: 1,
    headlampDistance: 32,
    menuKeyIntensity: 2.1,
    menuRimIntensity: 0,
  },
  medium: {
    pixelRatioCap: 1.0,
    lowResRatio: null,
    shadowsEnabled: true,
    shadowMapSize: 512,
    shadowFrustumHalf: 13,
    envIntensity: 0.38,
    toneExposure: 1.06,
    cameraFar: 165,
    segmentCutoffZ: -135,
    fogNear: 58,
    fogFar: 152,
    starsRatio: 0.5,
    particleRatio: 0.6,
    burstMultiplier: 0.75,
    anisotropyCap: 4,
    headlampDistance: 46,
    menuKeyIntensity: 2.4,
    menuRimIntensity: 1.4,
  },
  high: {
    pixelRatioCap: 1.5,
    lowResRatio: null,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    shadowFrustumHalf: 13,
    envIntensity: 0.72,
    toneExposure: 1.12,
    cameraFar: 250,
    segmentCutoffZ: -240,
    fogNear: 88,
    fogFar: 230,
    starsRatio: 1.0,
    particleRatio: 1.0,
    burstMultiplier: 1.2,
    anisotropyCap: 16,
    headlampDistance: 56,
    menuKeyIntensity: 2.7,
    menuRimIntensity: 2.2,
  },
};

const MOBILE_HIGH_QUALITY_PROFILE: QualityProfile = {
  ...QUALITY_PROFILES.high,
  pixelRatioCap: 1.35,
  shadowMapSize: 512,
  cameraFar: 195,
  segmentCutoffZ: -185,
  fogFar: 185,
  anisotropyCap: 4,
};

interface PooledParticle {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  g: number;
  b: number;
  life: number;
  maxLife: number;
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onDialogue: (line: DialogueLine) => void;
  onZoneChange: (zone: ZoneConfig) => void;
  onGameOver: (snapshot: HudSnapshot) => void;
  onPortraitReady?: (skinId: SkinId, dataUrl: string) => void;
}

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _quatA = new THREE.Quaternion();
const _eulerA = new THREE.Euler();
const _mat4A = new THREE.Matrix4();
const _zeroScale = new THREE.Vector3(0, 0, 0);
const _colorA = new THREE.Color();
const _jetFireColor = new THREE.Color(0xff5500);
const _jetGoldColor = new THREE.Color(0xfacc15);
const _jetPhosphorColor = new THREE.Color(0x39ff14);
const _jetCyanColor = new THREE.Color(0x00e5ff);
const SRGB_LUT = (() => {
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.min(255, Math.round(Math.pow(i / 255, 1 / 2.1) * 255));
  }
  return lut;
})();

export class RunnerEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;
  private readonly isMobileDevice: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: CityTextureSet;
  private maxAniso = 1;
  private envMapTexture: THREE.Texture | null = null;
  private sharedDisposables: { dispose: () => void }[] = [];
  private sharedDisposableSet = new Set<{ dispose: () => void }>();
  private lastFrameMs = 0;
  private simTime = 0;
  private jetExhaustEmitAccum = 0;
  private jetExhaustDirty = false;
  private pendingPortraitSkins: SkinId[] = [];
  private remainingGlbQueue: SkinId[] = [];
  private glbQueueActive = false;
  private glbQueueTimerId = 0;
  private chaserPreloadTimerId = 0;
  private biomePrewarmTimerId = 0;
  private deferredObstacleTasks: Array<{
    zoneId: ZoneId;
    key: string;
    factory: () => THREE.Group;
    targetCopies: number;
  }> = [];
  private compiledPoolKeys = new Set<string>();
  private compiledBiomeGroups = new Set<ZoneId>();
  private prewarmedZoneVoices = new Set<ZoneId>(['mahalle_caddesi']);
  private caveTrainPreloadStarted = false;
  private caveTrainPoolWarmed = false;
  private lastLookaheadStepMs = 0;
  private loopYieldTimerId = 0;
  private portraitCache: Partial<Record<SkinId, string>> = {};
  private backgroundSuspended = false;
  private externalSuspended = false;
  private loopRunning = false;
  private lastRenderWidth = 0;
  private lastRenderHeight = 0;
  private lastPixelRatio = 0;
  private buildSegmentBiomeGroup: ((segIndex: number, zoneId: ZoneId) => THREE.Group) | null = null;

  private hemiLight!: THREE.HemisphereLight;
  private dirLight!: THREE.DirectionalLight;
  private menuKeyLight!: THREE.PointLight;
  private menuRimLight!: THREE.PointLight;
  private headlamp!: THREE.SpotLight;
  private headlampTarget!: THREE.Object3D;

  private segments: StreetSegment[] = [];
  private stageZones: ZoneId[] = [...INITIAL_STAGE_ORDER];
  private transitionGateMesh!: THREE.Group;
  private transitionGateBoundaryDist = -1;
  private transitionGateBurstDone = false;
  private descentTunnelMesh!: THREE.Group;
  private staircaseExitMesh!: THREE.Group;
  private moonMesh!: THREE.Mesh;
  private starsPoints!: THREE.Points;
  private biomeParticles!: THREE.Points;
  private biomeParticlePositions!: Float32Array;
  private biomeParticleMat!: THREE.PointsMaterial;
  private snowNearPoints!: THREE.Points;
  private snowNearPositions!: Float32Array;
  private snowFarPoints!: THREE.Points;
  private snowFarPositions!: Float32Array;
  private playerRig: CockroachRig | null = null;
  private playerGlb: GlbCharacterController | null = null;
  private pendingPlayerPlaceholder: {
    root: THREE.Group;
    rollPivot: THREE.Group;
    headlampMesh: THREE.Mesh;
    shieldSphere: THREE.Mesh;
    jetpackGroup: THREE.Group;
    leftJetFlame: THREE.Mesh;
    rightJetFlame: THREE.Mesh;
    leftNozzleTip: THREE.Object3D;
    rightNozzleTip: THREE.Object3D;
  } | null = null;
  private buildGeneration = 0;
  private pedestalGroup!: THREE.Group;
  private playerShadow!: THREE.Mesh;
  private chaserShadow!: THREE.Mesh;
  private broomMesh!: THREE.Group;
  private chaserGlb: GlbChaserController | null = null;
  private recordGateMesh!: THREE.Group;
  private recordGateActive = false;
  private recordGateZ = -999;
  private recordGatePassed = false;

  private obstacles: ActiveObstacle[] = [];
  private coins: ActiveCoin[] = [];
  private powerups: ActivePowerup[] = [];
  private obstaclePool = new Map<string, THREE.Group[]>();
  private powerupPool = new Map<PowerupType, THREE.Group[]>();
  private coinPool: THREE.Group[] = [];
  private particleInstancedMesh!: THREE.InstancedMesh;
  private particles: PooledParticle[] = [];
  private particleCursor = 0;
  private jetExhaustInstancedMesh!: THREE.InstancedMesh;
  private jetExhaustPool: PooledParticle[] = [];
  private jetExhaustCursor = 0;
  private flightCoinLane = 1;
  private skyPatternIndex = 0;
  private lastPowerupSpawnDist = -60;
  private lastJetpackSpawnDist = -160;
  private nextObstacleId = 1;
  private resizeObserver: ResizeObserver | null = null;
  private contextLost = false;

  private phase: GamePhase = 'menu';
  private currentSkinId: SkinId = 'kivircik_riza';
  private graphicsQuality: GraphicsQuality = 'high';
  private shopPreviewOpen = false;
  private menuSpinYaw = 0;
  private menuShowcaseX = 0;
  private menuTapTimer = 0;
  private highScore = 0;
  private score = 0;
  private distance = 0;
  private runCoins = 0;
  private speed = BASE_SPEED;
  private zoneIndex = 0;
  private biomeRevealTimer = 0;
  private deathReason = '';
  private deathReasonKey = '';
  private isNewRecord = false;
  private continueCount = 0;
  private adReviveUsed = false;
  private resumeCountdownTimer = 0;
  private lastCountdownInt = 0;

  private upgrades: Record<UpgradeKey, number> = {
    magnet: 1,
    shield: 1,
    flashlight: 1,
    turbo: 1,
    wings: 1,
  };
  private bonusMultiplier = 1;
  private metrics: RunMetrics = {
    distance: 0,
    coins: 0,
    rolls: 0,
    jumps: 0,
    nearMisses: 0,
    flights: 0,
    powerups: 0,
    magnets: 0,
    shields: 0,
    flashlights: 0,
    turbos: 0,
    zonesReached: ['mahalle_caddesi'],
  };

  // 3-lane kinematics (0 = Sol, 1 = Orta, 2 = Sağ)
  private targetLane = 1;
  private prevSafeLane = 1;
  private playerX = 0;
  private playerVelX = 0;
  private laneSwitchFromX = 0;
  private laneSwitchToX = 0;
  private laneSwitchM0 = 0;
  private laneSwitchElapsed = 0;
  private laneSwitchDuration = 0.19;
  private laneSwitchActive = false;
  private laneSwitchDir = 0;
  private laneDodgeArc = 0;
  private laneDodgeBank = 0;
  private laneSettleTimer = 0;
  private laneSettleDir = 0;
  private dodgeAnimTimer = 0;
  private dodgeAnimDuration = 0.27;
  private dodgeAnimDir = 0;
  private dodgeJustTriggered = false;
  private playerY = 0;
  private currentGroundY = 0;
  private crashFloorY = 0;
  private velY = 0;
  private isGrounded = true;
  private jumpBufferTimer = 0;
  private rollBufferTimer = 0;
  private rollTimer = 0;
  private longJumpSpinTimer = 0;
  private springSafeTimer = 0;
  private springArcPullTimer = 0;
  private landSquashTimer = 0;
  private invulnTimer = 0;
  private stumbleTimer = 0;
  private introChaseTimer = 0;
  private chaserY = 0;
  private chaserGroundY = 0;
  private chaserVelY = 0;
  private chaserGrounded = true;
  private chaserJumpCooldown = 0;
  private chaserJustJumped = false;
  private combo = 1;
  private comboTimer = 0;
  private crashTimer = 0;
  private crashDeathType: 'obstacle' | 'chaser' = 'obstacle';
  private crashSlapImpactDone = false;
  private gameOverDelayTimer = 0;
  private pendingGameOverSnap: HudSnapshot | null = null;
  private startTransitionTimer = 0;
  private runAnimPhase = 0;
  private cameraShake = 0;

  // Powerups
  private magnetTimer = 0;
  private flashlightTimer = 0;
  private turboTimer = 0;
  private wingsTimer = 0;
  private nextFlightCoinZ = -24;
  private hasShield = false;

  // Spawners
  private nextSpawnZ = -42;
  private nextTrafficWaveZ = -90;
  private reservedMovingLane: number | null = null;
  private reservedMovingUntilWorldDist = 0;
  private nextMovingExpressWorldDist = 18;
  private reservedMovingZoneId: ZoneId | null = null;
  private dialogueTimer = 5.0;
  private lastDialogueId = '';
  private hudThrottle = 0;

  private frameId = 0;
  private disposed = false;

  constructor(
    container: HTMLElement,
    initialSkin: SkinId,
    highScore: number,
    callbacks: EngineCallbacks,
  ) {
    this.container = container;
    this.currentSkinId = initialSkin;
    this.highScore = highScore;
    this.callbacks = callbacks;
    this.portraitCache = this.loadCachedPortraits();

    this.isMobileDevice = (() => {
      if (typeof navigator === 'undefined') return false;
      const ua = navigator.userAgent || '';
      if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
      return navigator.maxTouchPoints > 1 && window.innerWidth <= 1024;
    })();

    this.renderer = (() => {
      try {
        return new THREE.WebGLRenderer({
          alpha: false,
          antialias: !this.isMobileDevice,
          powerPreference: 'high-performance',
        });
      } catch {
        return new THREE.WebGLRenderer({
          alpha: false,
          antialias: false,
          powerPreference: 'default',
        });
      }
    })();

    // Inspect the real renderer's GL context directly instead of spawning & losing a throwaway context
    this.isSoftwareGl = (() => {
      try {
        const gl = this.renderer.getContext();
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    const initPixelRatio = this.isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, this.isMobileDevice ? 1.35 : 1.5);
    this.lastPixelRatio = initPixelRatio;
    this.renderer.setPixelRatio(initPixelRatio);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);
    this.lastRenderWidth = width;
    this.lastRenderHeight = height;
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.backgroundColor = '#081513';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const z0 = ZONES[0];
    this.scene.background = new THREE.Color(z0.skyColor);
    this.scene.fog = new THREE.Fog(z0.fogColor, 88, 230);

    const aspect = width / Math.max(height, 1);
    const fov = aspect < 0.85 ? 54 : 45;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.4, 250);
    this.camera.position.set(0, 1.88, 3.95);
    this.camera.lookAt(0, 1.16, MENU_SHOWCASE_Z);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envMapTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    this.scene.environment = this.envMapTexture;
    pmremGenerator.dispose();

    this.maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createCityTextures(this.maxAniso);

    this.setupLighting();
    this.buildSkyAndMoon();
    this.buildBiomeParticles();
    this.buildBiomeGrounds();
    this.buildCityStreet();
    this.buildPedestal();
    this.buildPlayer(this.currentSkinId);
    this.buildBroom();
    this.buildParticlePool();
    this.buildJetExhaustPool();
    this.setGraphicsQuality(this.graphicsQuality);
    this.prewarmAllBiomeAssets();
    this.preloadRegisteredGlbCharacters();

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleResize);
    window.visualViewport?.addEventListener('resize', this.handleResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(container);
    }
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      this.handleContextLost,
    );
    this.renderer.domElement.addEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
    );

    this.emitHud();
    // Paint frame 0 immediately so the canvas is never presented empty/white
    this.renderer.render(this.scene, this.camera);
    this.startLoop();
  }

  private setupLighting(): void {
    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.9);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffedd5, 1.38);
    this.dirLight.position.set(10, 18, 10);
    if (!this.isSoftwareGl) {
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.set(512, 512);
      this.dirLight.shadow.camera.near = 1;
      this.dirLight.shadow.camera.far = 36;
      const d = 11;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
      this.dirLight.shadow.bias = -0.0005;
      this.dirLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.dirLight);

    this.headlamp = new THREE.SpotLight(0xfef08a, 0, 52, Math.PI / 4, 0.45, 1.0);
    this.headlamp.position.set(0, 2.2, 0);
    this.headlamp.visible = false;
    this.headlampTarget = new THREE.Object3D();
    this.headlampTarget.position.set(0, 0.4, -22);
    this.scene.add(this.headlamp);
    this.scene.add(this.headlampTarget);
    this.headlamp.target = this.headlampTarget;

    // Dedicated studio key & rim light for crisp 3D character clarity on Home & Shop
    this.menuKeyLight = new THREE.PointLight(0xfff7ed, 2.6, 18, 1.2);
    this.menuKeyLight.position.set(2.4, 3.6, 3.8);
    this.scene.add(this.menuKeyLight);

    this.menuRimLight = new THREE.PointLight(0x38bdf8, 2.2, 16, 1.2);
    this.menuRimLight.position.set(-2.6, 2.8, -2.4);
    this.scene.add(this.menuRimLight);
  }

  private buildSkyAndMoon(): void {
    this.moonMesh = new THREE.Mesh(
      new THREE.CircleGeometry(7.5, 24),
      new THREE.MeshBasicMaterial({ color: 0xfef3c7, fog: false }),
    );
    this.moonMesh.position.set(22, 34, -175);
    this.scene.add(this.moonMesh);

    const starCount = 160;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 240;
      starPos[i * 3 + 1] = 22 + Math.random() * 65;
      starPos[i * 3 + 2] = -60 - Math.random() * 140;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.starsPoints = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xf8fafc, size: 0.65, fog: false }),
    );
    this.scene.add(this.starsPoints);
  }

  private buildBiomeParticles(): void {
    const count = 90;
    this.biomeParticlePositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this.biomeParticlePositions[i * 3] = (Math.random() - 0.5) * 28;
      this.biomeParticlePositions[i * 3 + 1] = 0.5 + Math.random() * 13;
      this.biomeParticlePositions[i * 3 + 2] = -4 - Math.random() * 68;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.biomeParticlePositions, 3),
    );
    this.biomeParticleMat = new THREE.PointsMaterial({
      color: 0xf0f9ff,
      map: this.textures.snowFlakeTexture,
      size: 0.42,
      transparent: true,
      opacity: 0.85,
      alphaTest: 0.01,
      depthWrite: false,
    });
    this.biomeParticles = new THREE.Points(geo, this.biomeParticleMat);
    this.biomeParticles.frustumCulled = false;
    this.biomeParticles.visible = false;
    this.scene.add(this.biomeParticles);

    // Realistic 2-layer "lapa lapa" crystal snowfall for Buzul Dünyası (trimmed for crisp fill-rate)
    const nearCount = 100;
    this.snowNearPositions = new Float32Array(nearCount * 3);
    for (let i = 0; i < nearCount; i++) {
      this.snowNearPositions[i * 3] = (Math.random() - 0.5) * 28;
      this.snowNearPositions[i * 3 + 1] = Math.random() * 14.5;
      this.snowNearPositions[i * 3 + 2] = 7.5 - Math.random() * 64;
    }
    const nearGeo = new THREE.BufferGeometry();
    nearGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.snowNearPositions, 3),
    );
    this.snowNearPoints = new THREE.Points(
      nearGeo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        map: this.textures.snowFlakeTexture,
        size: 0.58,
        transparent: true,
        opacity: 0.94,
        alphaTest: 0.12,
        depthWrite: false,
      }),
    );
    this.snowNearPoints.frustumCulled = false;
    this.snowNearPoints.visible = false;
    this.scene.add(this.snowNearPoints);

    const farCount = 160;
    this.snowFarPositions = new Float32Array(farCount * 3);
    for (let i = 0; i < farCount; i++) {
      this.snowFarPositions[i * 3] = (Math.random() - 0.5) * 48;
      this.snowFarPositions[i * 3 + 1] = Math.random() * 18;
      this.snowFarPositions[i * 3 + 2] = 5 - Math.random() * 100;
    }
    const farGeo = new THREE.BufferGeometry();
    farGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.snowFarPositions, 3),
    );
    this.snowFarPoints = new THREE.Points(
      farGeo,
      new THREE.PointsMaterial({
        color: 0xe0f2fe,
        map: this.textures.snowFlakeTexture,
        size: 0.36,
        transparent: true,
        opacity: 0.85,
        alphaTest: 0.12,
        depthWrite: false,
      }),
    );
    this.snowFarPoints.frustumCulled = false;
    this.snowFarPoints.visible = false;
    this.scene.add(this.snowFarPoints);
  }

  private updateBiomeParticles(
    dt: number,
    zoneId: ZoneId,
    dz: number,
    t: number,
    floorY: number,
  ): void {
    const isSnowWorld = zoneId === 'buzul_dunyasi';
    const particleRatio = QUALITY_PROFILES[this.graphicsQuality].particleRatio;
    this.snowNearPoints.visible = isSnowWorld;
    this.snowFarPoints.visible = isSnowWorld && this.graphicsQuality !== 'low';

    if (isSnowWorld) {
      this.biomeParticles.visible = false;
      const windGust = -1.25 + Math.sin(t * 0.65) * 0.9;

      const nearPos = this.snowNearPositions;
      const nearTotal = nearPos.length / 3;
      const nearCount = Math.floor(nearTotal * particleRatio);
      for (let i = 0; i < nearCount; i++) {
        const idx = i * 3;
        nearPos[idx] += (windGust + Math.sin(t * 2.1 + i * 0.73) * 1.45) * dt;
        nearPos[idx + 1] -= (3.3 + (i % 5) * 0.42) * dt;
        nearPos[idx + 2] += dz * 0.72;
        if (nearPos[idx] < -14) nearPos[idx] += 28;
        else if (nearPos[idx] > 14) nearPos[idx] -= 28;
        if (nearPos[idx + 1] < 0.05) {
          nearPos[idx + 1] = 13.8 + Math.random() * 1.2;
          nearPos[idx] = (Math.random() - 0.5) * 28;
        }
        if (nearPos[idx + 2] > 7.5) {
          nearPos[idx + 2] = -56 - Math.random() * 4;
        }
      }
      (
        this.snowNearPoints.geometry.getAttribute('position') as THREE.BufferAttribute
      ).needsUpdate = true;

      const farPos = this.snowFarPositions;
      const farTotal = farPos.length / 3;
      const farCount =
        this.graphicsQuality === 'low' ? 0 : Math.floor(farTotal * particleRatio);
      for (let i = 0; i < farCount; i++) {
        const idx = i * 3;
        farPos[idx] += (windGust * 0.8 + Math.cos(t * 1.5 + i * 0.51) * 0.95) * dt;
        farPos[idx + 1] -= (2.5 + (i % 4) * 0.35) * dt;
        farPos[idx + 2] += dz * 0.92;
        if (farPos[idx] < -24) farPos[idx] += 48;
        else if (farPos[idx] > 24) farPos[idx] -= 48;
        if (farPos[idx + 1] < 0.05) {
          farPos[idx + 1] = 16.5 + Math.random() * 2;
          farPos[idx] = (Math.random() - 0.5) * 48;
        }
        if (farPos[idx + 2] > 5) {
          farPos[idx + 2] = -95 - Math.random() * 5;
        }
      }
      (
        this.snowFarPoints.geometry.getAttribute('position') as THREE.BufferAttribute
      ).needsUpdate = true;
      return;
    }

    if (zoneId === 'mahalle_caddesi') {
      this.biomeParticles.visible = false;
      return;
    }
    this.biomeParticles.visible = true;
    const targetParticleMap =
      zoneId === 'kopuklu_banyo'
        ? this.textures.bubbleParticleTexture
        : this.textures.glowOrbParticleTexture;
    if (this.biomeParticleMat.map !== targetParticleMap) {
      this.biomeParticleMat.map = targetParticleMap;
      this.biomeParticleMat.needsUpdate = true;
    }

    const pos = this.biomeParticlePositions;
    const bioRatio = QUALITY_PROFILES[this.graphicsQuality].particleRatio;
    const count = Math.floor((pos.length / 3) * bioRatio);

    if (zoneId === 'ates_diyari') {
      this.biomeParticleMat.color.setHex(0xfb923c);
      this.biomeParticleMat.size = 0.34;
      this.biomeParticleMat.opacity = 0.92;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        pos[idx] += Math.cos(t * 3 + i) * 0.9 * dt;
        pos[idx + 1] += 4.6 * dt;
        pos[idx + 2] += dz * 0.75;
        if (pos[idx + 1] > 14 || pos[idx + 1] < 0) pos[idx + 1] = 0.2;
        if (pos[idx + 2] > 4) pos[idx + 2] = -70;
      }
    } else if (zoneId === 'dev_mutfak') {
      this.biomeParticleMat.color.setHex(0xfef08a);
      this.biomeParticleMat.size = 0.26;
      this.biomeParticleMat.opacity = 0.78;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        pos[idx] += Math.sin(t * 1.8 + i) * 0.65 * dt;
        pos[idx + 1] -= 1.3 * dt;
        pos[idx + 2] += dz * 0.8;
        if (pos[idx + 1] < 0.3 || pos[idx + 1] > 13.5) pos[idx + 1] = 13.0;
        if (pos[idx + 2] > 4) pos[idx + 2] = -70;
      }
    } else if (zoneId === 'kopuklu_banyo') {
      this.biomeParticleMat.color.setHex(0xffffff);
      this.biomeParticleMat.size = 0.56;
      this.biomeParticleMat.opacity = 0.86;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        pos[idx] += Math.sin(t * 2.2 + i * 0.85) * 1.15 * dt;
        pos[idx + 1] += (2.35 + (i % 3) * 0.4) * dt;
        pos[idx + 2] += dz * 0.75;
        if (pos[idx] < -14) pos[idx] += 28;
        else if (pos[idx] > 14) pos[idx] -= 28;
        if (pos[idx + 1] > 13.8 || pos[idx + 1] < 0.2) pos[idx + 1] = 0.4;
        if (pos[idx + 2] > 4) pos[idx + 2] = -70;
      }
    } else if (zoneId === 'cilgin_lab') {
      this.biomeParticleMat.color.setHex(0x4ade80);
      this.biomeParticleMat.size = 0.28;
      this.biomeParticleMat.opacity = 0.88;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        pos[idx] += Math.cos(t * 2.5 + i) * 0.7 * dt;
        pos[idx + 1] += 3.2 * dt;
        pos[idx + 2] += dz * 0.78;
        if (pos[idx + 1] > 13.5 || pos[idx + 1] < 0.2) pos[idx + 1] = 0.3;
        if (pos[idx + 2] > 4) pos[idx + 2] = -70;
      }
    } else if (zoneId === 'peynir_galaksisi') {
      this.biomeParticleMat.color.setHex(0xf0abfc);
      this.biomeParticleMat.size = 0.3;
      this.biomeParticleMat.opacity = 0.92;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        pos[idx] += Math.sin(t * 1.2 + i) * 0.45 * dt;
        pos[idx + 1] += Math.cos(t * 1.4 + i) * 0.45 * dt;
        pos[idx + 2] += dz * 1.15;
        if (pos[idx + 1] < 0.4 || pos[idx + 1] > 14) pos[idx + 1] = 2 + (i % 10);
        if (pos[idx + 2] > 4) pos[idx + 2] = -70;
      }
    } else {
      // yeralti_magarasi -> golden cave dust floating inside the -4.2m earth tunnel
      this.biomeParticleMat.color.setHex(0xfbbf24);
      this.biomeParticleMat.size = 0.22;
      this.biomeParticleMat.opacity = 0.7;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        pos[idx] = THREE.MathUtils.clamp(pos[idx], -5.8, 5.8);
        if (pos[idx + 1] < floorY + 0.3 || pos[idx + 1] > floorY + 8.5) {
          pos[idx + 1] = floorY + 0.6 + Math.random() * 7.2;
        }
        pos[idx + 1] += Math.sin(t * 1.5 + i) * 0.35 * dt;
        pos[idx + 2] += dz * 0.7;
        if (pos[idx + 2] > 4) pos[idx + 2] = -70;
      }
    }
    const attr = this.biomeParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  private buildBiomeGrounds(): void {
    // Physical 3D Tunnel Entrance Descent & Exit Staircase meshes (positioned at active Yeraltı stage boundaries)
    this.descentTunnelMesh = createTunnelDescentModel(
      this.textures.earthRoadTexture,
      this.textures.earthWallTexture,
    );
    this.descentTunnelMesh.visible = false;
    this.scene.add(this.descentTunnelMesh);

    this.staircaseExitMesh = createTunnelStaircaseExitModel(
      this.textures.earthWallTexture,
    );
    this.staircaseExitMesh.visible = false;
    this.scene.add(this.staircaseExitMesh);

    // Persistent Biome Transition Gate & Record Gate (zero mid-run allocations or shader compiles!)
    this.transitionGateMesh = createBiomeTransitionGateModel(
      ZONES[1].lampColor,
      ZONES[1].buildingTint,
    );
    this.transitionGateMesh.visible = false;
    this.scene.add(this.transitionGateMesh);

    this.recordGateMesh = createRecordGateModel(this.textures.recordBannerTexture);
    this.recordGateMesh.visible = false;
    this.scene.add(this.recordGateMesh);
  }

  private prewarmAllBiomeAssets(): void {
    // Stage 1 (immediate): only starting biome + shared gameplay assets so first frame & hero appear fast
    const immediateTemplates: [string, () => THREE.Group][] = [
      ['taxi', createTaxiModel],
      ['moving_taxi', createMovingTaxiModel],
      ['bus_ramp', createCityBusWithRampModel],
      ['spring_pad', createSpringPadModel],
      ['dumpster', createDumpsterModel],
      ['cone', createConeBarrierModel],
      ['tire', createTireModel],
      ['road_sign', createRoadSignHighModel],
      ...SKINS.filter(
        (s) => !CHARACTER_GLB_URLS[s.id] && (s.id === 'kivircik_riza' || s.id === 'diva_bocek'),
      ).map(
        (skin): [string, () => THREE.Group] => [
          `phone_roach_${skin.id}`,
          () =>
            createPhoneRoachObstacle(
              skin,
              this.textures.chitinWingTexture,
              this.textures.fabricWeaveTexture,
            ),
        ],
      ),
    ];

    // Stage 2 (deferred idle batches): remaining 7 biomes prewarmed lazily without blocking startup
    const extraCopiesKeys = new Set([
      'taxi',
      'cone',
      'dumpster',
      'tire',
      'earth_boulder',
      'crystal_pillar',
      'ice_wall',
      'ice_crystal',
      'snowman_barrier',
      'lava_rock',
      'fire_pillar',
      'lava_cauldron',
      'rolling_pin',
      'butter_block',
      'fridge_block',
      'giant_slipper',
      'shampoo_tower',
      'soap_bar',
      'raid_can',
      'beaker_vat',
      'bio_drum_stack',
      'ufo_saucer',
      'cheese_asteroid',
      'cheese_satellite',
    ]);

    const addDeferredZoneTasks = (
      zoneId: ZoneId,
      items: [string, () => THREE.Group][],
    ) => {
      for (const [key, factory] of items) {
        this.deferredObstacleTasks.push({
          zoneId,
          key,
          factory,
          targetCopies: extraCopiesKeys.has(key) ? 3 : 2,
        });
      }
    };

    this.deferredObstacleTasks = [];
    for (const [key] of immediateTemplates) {
      this.compiledPoolKeys.add(key);
    }
    if (!this.isSoftwareGl) {
      this.compiledBiomeGroups.add('mahalle_caddesi');
    }

    addDeferredZoneTasks('yeralti_magarasi', [
      ['terrain_ramp_yeralti_magarasi', createEarthRampModel],
      ['moving_train', () => createCaveTrainModel(true)],
      ['parked_train', () => createCaveTrainModel(false)],
      ['earth_boulder', createEarthBoulderModel],
      ['crystal_pillar', createCrystalPillarModel],
      ['root_arch', createRootArchModel],
      ['mushroom_cluster', createMushroomClusterModel],
    ]);
    addDeferredZoneTasks('buzul_dunyasi', [
      ['terrain_ramp_buzul_dunyasi', createIceRampModel],
      ['ice_wall', createIceWallModel],
      ['ice_crystal', createIceCrystalModel],
      ['moving_ice_sled', createMovingIceSledModel],
      ['snowman_barrier', createSnowmanBarrierModel],
      ['icicle_arch', createIcicleArchModel],
      ['snow_ball', createSnowBallModel],
    ]);
    addDeferredZoneTasks('ates_diyari', [
      ['terrain_ramp_ates_diyari', createLavaRampModel],
      ['lava_rock', createLavaRockModel],
      ['fire_pillar', createFirePillarModel],
      ['moving_magma_cart', createMovingMagmaCartModel],
      ['lava_cauldron', createLavaCauldronModel],
      ['magma_arch', createMagmaArchModel],
      ['fire_barrel', createFireBarrelModel],
    ]);
    addDeferredZoneTasks('dev_mutfak', [
      ['terrain_ramp_dev_mutfak', createKitchenRampModel],
      ['rolling_pin', createRollingPinModel],
      ['butter_block', createButterBlockModel],
      ['fridge_block', createFridgeBlockModel],
      ['moving_mixer_cart', createMovingMixerCartModel],
      ['toaster_arch', createToasterArchModel],
      ['tomato_ball', createTomatoBallModel],
    ]);
    addDeferredZoneTasks('kopuklu_banyo', [
      ['terrain_ramp_kopuklu_banyo', createBathRampModel],
      ['giant_slipper', createGiantSlipperModel],
      ['moving_duck_tub', createMovingDuckTubModel],
      ['shampoo_tower', createShampooTowerModel],
      ['soap_bar', createSoapBarModel],
      ['towel_arch', createTowelArchModel],
      ['tp_roll', createTpRollModel],
    ]);
    addDeferredZoneTasks('cilgin_lab', [
      ['terrain_ramp_cilgin_lab', createLabRampModel],
      ['raid_can', createRaidCanModel],
      ['beaker_vat', createBeakerVatModel],
      ['moving_lab_bot', createMovingLabBotModel],
      ['bio_drum_stack', createBioDrumStackModel],
      ['laser_arch', createLaserArchModel],
      ['jelly_cube', createJellyCubeModel],
    ]);
    addDeferredZoneTasks('peynir_galaksisi', [
      ['terrain_ramp_peynir_galaksisi', createSpaceRampModel],
      ['ufo_saucer', createUfoSaucerModel],
      ['cheese_asteroid', createCheeseAsteroidModel],
      ['moving_space_rover', createMovingSpaceRoverModel],
      ['cheese_satellite', createCheeseSatelliteModel],
      ['warp_arch', createWarpArchModel],
      ['space_meteor', createSpaceMeteorModel],
    ]);

    const powerupTypes: PowerupType[] = ['magnet', 'shield', 'flashlight', 'turbo', 'wings'];
    const tempObstacles: [string, THREE.Group][] = [];
    const tempPowerups: [PowerupType, THREE.Group][] = [];
    const tempCoins: THREE.Group[] = [];

    for (const [key, factory] of immediateTemplates) {
      const copies = extraCopiesKeys.has(key) ? 3 : 2;
      for (let i = 0; i < copies; i++) {
        const mesh = factory();
        if (i === 0) {
          mesh.position.set(0, 0, -24);
          this.scene.add(mesh);
        }
        tempObstacles.push([key, mesh]);
      }
    }
    for (const pType of powerupTypes) {
      for (let i = 0; i < 2; i++) {
        const mesh = createPowerupModel(pType);
        if (i === 0) {
          mesh.position.set(0, 1, -24);
          this.scene.add(mesh);
        }
        tempPowerups.push([pType, mesh]);
      }
    }
    for (let c = 0; c < 32; c++) {
      const coinMesh = createSimitCoinModel();
      if (c === 0) {
        coinMesh.position.set(0, 1, -22);
        this.scene.add(coinMesh);
      }
      tempCoins.push(coinMesh);
    }

    if (!this.isSoftwareGl) {
      for (const seg of this.segments) {
        seg.group.visible = true;
        seg.biomeGroups.mahalle_caddesi.visible = true;
        seg.skywayGroup.visible = true;
      }
      this.transitionGateMesh.visible = true;
      this.recordGateMesh.visible = true;
      this.broomMesh.visible = true;
      this.biomeParticles.visible = true;
      this.activeJetpackGroup.visible = true;
      this.activeShieldSphere.visible = true;
      this.activeHeadlampMesh.visible = true;
      this.particleInstancedMesh.visible = true;
      this.jetExhaustInstancedMesh.visible = true;
      _mat4A.compose(_vec3A.set(0, 1, -20), _quatA.identity(), _vec3B.set(0.05, 0.05, 0.05));
      this.particleInstancedMesh.setMatrixAt(0, _mat4A);
      this.particleInstancedMesh.instanceMatrix.needsUpdate = true;
      this.jetExhaustInstancedMesh.setMatrixAt(0, _mat4A);
      this.jetExhaustInstancedMesh.instanceMatrix.needsUpdate = true;

      const prevKeyVis = this.menuKeyLight.visible;
      const prevRimVis = this.menuRimLight.visible;
      const prevLampVis = this.headlamp.visible;
      const prevLampIntensity = this.headlamp.intensity;

      // 1) Prewarm Menu lighting state
      this.menuKeyLight.visible = true;
      this.menuRimLight.visible = true;
      this.headlamp.visible = false;
      this.headlamp.intensity = 0;
      this.renderer.compile(this.scene, this.camera);

      // 2) Prewarm Daytime Gameplay lighting state
      this.menuKeyLight.visible = false;
      this.menuRimLight.visible = false;
      this.headlamp.visible = false;
      this.renderer.compile(this.scene, this.camera);

      // 3) Prewarm Dark/Flashlight SpotLight permutation (headlamp on) so cave entry & flashlight never hitch
      this.headlamp.visible = true;
      this.headlamp.intensity = 74;
      this.renderer.compile(this.scene, this.camera);

      // Restore initial Menu lighting & hide temporary prewarm meshes
      this.menuKeyLight.visible = prevKeyVis;
      this.menuRimLight.visible = prevRimVis;
      this.headlamp.visible = prevLampVis;
      this.headlamp.intensity = prevLampIntensity;

      _mat4A.compose(_vec3A.set(0, -50, 0), _quatA.identity(), _zeroScale);
      this.particleInstancedMesh.setMatrixAt(0, _mat4A);
      this.particleInstancedMesh.instanceMatrix.needsUpdate = true;
      this.particleInstancedMesh.visible = false;
      this.jetExhaustInstancedMesh.setMatrixAt(0, _mat4A);
      this.jetExhaustInstancedMesh.instanceMatrix.needsUpdate = true;
      this.jetExhaustInstancedMesh.visible = false;

      this.descentTunnelMesh.visible = false;
      this.staircaseExitMesh.visible = false;
      this.transitionGateMesh.visible = false;
      this.recordGateMesh.visible = false;
      this.broomMesh.visible = false;
      this.biomeParticles.visible = false;
      this.snowNearPoints.visible = false;
      this.snowFarPoints.visible = false;
      this.activeJetpackGroup.visible = false;
      this.activeShieldSphere.visible = false;
      this.activeHeadlampMesh.visible = false;
      for (const seg of this.segments) {
        (Object.keys(seg.biomeGroups) as ZoneId[]).forEach((k) => {
          const g = seg.biomeGroups[k];
          if (g) g.visible = k === 'mahalle_caddesi';
        });
        seg.activeBiomeGroup = seg.biomeGroups.mahalle_caddesi;
        seg.activeZoneId = 'mahalle_caddesi';
        seg.skywayGroup.visible = false;
      }
      this.applyZoneVisuals(ZONES[0], true);
    }

    for (const [key, mesh] of tempObstacles) {
      if (mesh.parent === this.scene) this.scene.remove(mesh);
      let bucket = this.obstaclePool.get(key);
      if (!bucket) {
        bucket = [];
        this.obstaclePool.set(key, bucket);
      }
      bucket.push(mesh);
    }
    for (const [pType, mesh] of tempPowerups) {
      if (mesh.parent === this.scene) this.scene.remove(mesh);
      let bucket = this.powerupPool.get(pType);
      if (!bucket) {
        bucket = [];
        this.powerupPool.set(pType, bucket);
      }
      bucket.push(mesh);
    }
    for (const coinMesh of tempCoins) {
      if (coinMesh.parent === this.scene) this.scene.remove(coinMesh);
      this.coinPool.push(coinMesh);
    }

    this.scheduleDeferredBiomePrewarm(450);
  }

  private ensureCaveTrainPoolReady(): void {
    if (this.caveTrainPreloadStarted) return;
    this.caveTrainPreloadStarted = true;
    void preloadCaveTrainModel().then((tmpl) => {
      if (this.disposed || !tmpl || this.caveTrainPoolWarmed) return;
      this.caveTrainPoolWarmed = true;
      for (const [key, isMoving, count] of [
        ['moving_train', true, 3],
        ['parked_train', false, 3],
      ] as const) {
        const existing = this.obstaclePool.get(key);
        if (existing) {
          existing.forEach((m) => this.removeAndDispose(m));
          existing.length = 0;
        }
        const bucket: THREE.Group[] = [];
        for (let i = 0; i < count; i++) {
          const trainMesh = createCaveTrainModel(isMoving);
          bucket.push(trainMesh);
          if (i === 0 && !this.isSoftwareGl) {
            const prevLampVis = this.headlamp.visible;
            const prevLampInt = this.headlamp.intensity;
            this.headlamp.visible = true;
            this.headlamp.intensity = Math.max(prevLampInt, 74);
            void this.renderer.compileAsync(trainMesh, this.camera, this.scene);
            this.headlamp.visible = prevLampVis;
            this.headlamp.intensity = prevLampInt;
          }
        }
        this.obstaclePool.set(key, bucket);
        this.compiledPoolKeys.add(key);
      }
    });
  }

  private buildOneDeferredObstacleTask(taskIndex = 0): boolean {
    while (taskIndex < this.deferredObstacleTasks.length) {
      const task = this.deferredObstacleTasks[taskIndex];
      if (
        (task.key === 'moving_train' || task.key === 'parked_train') &&
        !isCaveTrainModelReady()
      ) {
        this.ensureCaveTrainPoolReady();
        taskIndex++;
        continue;
      }
      let bucket = this.obstaclePool.get(task.key);
      if (!bucket) {
        bucket = [];
        this.obstaclePool.set(task.key, bucket);
      }
      if (bucket.length >= task.targetCopies) {
        this.deferredObstacleTasks.splice(taskIndex, 1);
        continue;
      }
      const mesh = task.factory();
      bucket.push(mesh);
      if (!this.compiledPoolKeys.has(task.key)) {
        this.compiledPoolKeys.add(task.key);
        if (!this.isSoftwareGl) {
          if (task.zoneId === 'yeralti_magarasi') {
            const prevLampVis = this.headlamp.visible;
            const prevLampInt = this.headlamp.intensity;
            this.headlamp.visible = true;
            this.headlamp.intensity = Math.max(prevLampInt, 74);
            void this.renderer.compileAsync(mesh, this.camera, this.scene);
            this.headlamp.visible = prevLampVis;
            this.headlamp.intensity = prevLampInt;
          } else {
            void this.renderer.compileAsync(mesh, this.camera, this.scene);
          }
        }
      }
      if (bucket.length >= task.targetCopies) {
        this.deferredObstacleTasks.splice(taskIndex, 1);
      }
      return true;
    }
    return false;
  }

  private scheduleDeferredBiomePrewarm(delayMs = 95): void {
    if (this.disposed || this.deferredObstacleTasks.length === 0) return;
    window.clearTimeout(this.biomePrewarmTimerId);
    this.biomePrewarmTimerId = window.setTimeout(() => {
      if (this.disposed || this.deferredObstacleTasks.length === 0) return;
      if (
        this.contextLost ||
        this.phase === 'playing' ||
        this.backgroundSuspended ||
        this.externalSuspended ||
        this.glbQueueActive ||
        this.shopPreviewOpen
      ) {
        this.scheduleDeferredBiomePrewarm(600);
        return;
      }
      this.ensureCaveTrainPoolReady();
      this.buildOneDeferredObstacleTask(0);
      if (this.deferredObstacleTasks.length > 0) {
        this.scheduleDeferredBiomePrewarm(95);
      }
    }, delayMs);
  }

  private stepPlayingLookaheadPrewarm(
    upcomingZoneId: ZoneId,
    remainingToTransition: number,
  ): void {
    if (
      this.disposed ||
      this.contextLost ||
      this.backgroundSuspended ||
      this.externalSuspended ||
      remainingToTransition > 520
    ) {
      return;
    }
    if (upcomingZoneId === 'yeralti_magarasi') {
      this.ensureCaveTrainPoolReady();
    }
    if (remainingToTransition > 460) {
      return;
    }
    const nowMs = performance.now();
    if (nowMs - this.lastLookaheadStepMs < 95) {
      return;
    }

    // 1) Pre-build upcoming biome segments one-by-one (~1 segment per 95ms) well ahead of transition
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (!seg.biomeGroups[upcomingZoneId]) {
        const built = this.ensureSegmentBiomeGroup(seg, upcomingZoneId);
        if (!this.compiledBiomeGroups.has(upcomingZoneId)) {
          this.compiledBiomeGroups.add(upcomingZoneId);
          if (!this.isSoftwareGl) {
            if (upcomingZoneId === 'yeralti_magarasi') {
              const prevLampVis = this.headlamp.visible;
              const prevLampInt = this.headlamp.intensity;
              this.headlamp.visible = true;
              this.headlamp.intensity = Math.max(prevLampInt, 74);
              void this.renderer.compileAsync(built, this.camera, this.scene);
              this.headlamp.visible = prevLampVis;
              this.headlamp.intensity = prevLampInt;
            } else {
              void this.renderer.compileAsync(built, this.camera, this.scene);
            }
          }
        }
        this.lastLookaheadStepMs = nowMs;
        return;
      }
    }

    // 2) Pre-build upcoming biome obstacle templates 1 copy at a time so spawn never misses pool
    if (remainingToTransition <= 420 && this.deferredObstacleTasks.length > 0) {
      const idx = this.deferredObstacleTasks.findIndex(
        (t) =>
          t.zoneId === upcomingZoneId &&
          !((t.key === 'moving_train' || t.key === 'parked_train') && !isCaveTrainModelReady()),
      );
      if (idx >= 0 && this.buildOneDeferredObstacleTask(idx)) {
        this.lastLookaheadStepMs = nowMs;
        return;
      }
    }

    // 3) Pre-decode upcoming zone voiceover (~160m ahead) before crossing the biome gate
    if (remainingToTransition <= 160 && !this.prewarmedZoneVoices.has(upcomingZoneId)) {
      this.prewarmedZoneVoices.add(upcomingZoneId);
      gameAudio.prewarmZoneVoice(upcomingZoneId);
      this.lastLookaheadStepMs = nowMs;
    }
  }

  private buildCityStreet(): void {
    const signGeo = new THREE.PlaneGeometry(4.2, 1.6);
    const awningColors = [0xdc2626, 0x059669, 0xd97706, 0x2563eb];
    const shopSignMats = this.textures.shopSigns.map(
      (signTex) =>
        new THREE.MeshStandardMaterial({
          map: signTex,
          emissive: 0xffffff,
          emissiveMap: signTex,
          emissiveIntensity: 0.45,
          roughness: 0.3,
        }),
    );
    const cityBuildingMats = [0xfff3e0, 0xfecaca, 0xdbeafe].map(
      (tint) =>
        new THREE.MeshStandardMaterial({
          map: this.textures.buildingTexture,
          color: tint,
          roughness: 0.78,
        }),
    );

    // Shared 20m road + flank geometries/materials per biome for seamless infinite cycling
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH);
    const roadMats: Record<ZoneId, THREE.Material> = {
      mahalle_caddesi: new THREE.MeshStandardMaterial({
        map: this.textures.asphaltTexture,
        roughness: 0.72,
        metalness: 0.08,
      }),
      yeralti_magarasi: new THREE.MeshStandardMaterial({
        map: this.textures.earthRoadTexture,
        roughness: 0.94,
      }),
      buzul_dunyasi: new THREE.MeshStandardMaterial({
        map: this.textures.iceRoadTexture,
        roughness: 0.14,
        metalness: 0.16,
      }),
      ates_diyari: new THREE.MeshStandardMaterial({
        map: this.textures.lavaRoadTexture,
        roughness: 0.58,
        metalness: 0.24,
      }),
      dev_mutfak: new THREE.MeshStandardMaterial({
        map: this.textures.kitchenRoadTexture,
        roughness: 0.32,
        metalness: 0.06,
      }),
      kopuklu_banyo: new THREE.MeshStandardMaterial({
        map: this.textures.bathRoadTexture,
        roughness: 0.12,
        metalness: 0.12,
      }),
      cilgin_lab: new THREE.MeshStandardMaterial({
        map: this.textures.labRoadTexture,
        roughness: 0.35,
        metalness: 0.52,
      }),
      peynir_galaksisi: new THREE.MeshStandardMaterial({
        map: this.textures.spaceRoadTexture,
        roughness: 0.38,
        metalness: 0.28,
      }),
    };

    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: this.textures.sidewalkTexture,
      roughness: 0.82,
    });
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
    const earthBankMat = new THREE.MeshStandardMaterial({
      map: this.textures.earthWallTexture,
      color: 0x85583a,
      roughness: 0.96,
    });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf0f9ff, roughness: 0.82 });
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.32,
      metalness: 0.55,
    });
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const counterFlankMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.34,
      metalness: 0.04,
    });
    const bathFlankMat = new THREE.MeshStandardMaterial({
      color: 0x155e75,
      roughness: 0.25,
    });
    const bathWaterMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.62,
      roughness: 0.08,
      metalness: 0.16,
    });
    const labAcidMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const spaceFlankMat = new THREE.MeshStandardMaterial({ color: 0x0f0b2e, roughness: 0.75 });

    const sidewalkGeo = new THREE.BoxGeometry(5.2, 0.22, SEGMENT_LENGTH);
    const curbGeo = new THREE.BoxGeometry(0.28, 0.26, SEGMENT_LENGTH);
    const emberGeo = new THREE.BoxGeometry(0.1, 0.08, SEGMENT_LENGTH);
    const wideFlankBoxGeo = new THREE.BoxGeometry(22, 0.36, SEGMENT_LENGTH);
    const wideLiquidPlaneGeo = new THREE.PlaneGeometry(28, SEGMENT_LENGTH);
    const bldgGeos = [0, 1, 2, 3].map(
      (hIdx) => new THREE.BoxGeometry(7.2, 14 + hIdx * 3.5, SEGMENT_LENGTH - 0.6),
    );
    const kitchenWallMat = new THREE.MeshStandardMaterial({
      map: this.textures.kitchenWallTexture,
      roughness: 0.3,
    });
    const bathWallMat = new THREE.MeshStandardMaterial({
      map: this.textures.bathWallTexture,
      roughness: 0.2,
    });
    const bathBoardGeo = new THREE.PlaneGeometry(4.4, 2.2);
    const bathBoardMats = this.textures.bathMirrorTextures.map(
      (tex) =>
        new THREE.MeshStandardMaterial({
          map: tex,
          emissive: 0xffffff,
          emissiveMap: tex,
          emissiveIntensity: 0.42,
          roughness: 0.18,
        }),
    );
    const labBoardGeo = new THREE.PlaneGeometry(4.4, 2.2);
    const labBoardMats = this.textures.labBoardTextures.map(
      (tex) =>
        new THREE.MeshStandardMaterial({
          map: tex,
          emissive: 0xffffff,
          emissiveMap: tex,
          emissiveIntensity: 0.55,
          roughness: 0.25,
        }),
    );

    this.sharedDisposables.push(
      signGeo,
      roadGeo,
      sidewalkMat,
      curbMat,
      earthBankMat,
      snowMat,
      obsidianMat,
      emberMat,
      lavaMat,
      counterFlankMat,
      bathFlankMat,
      bathWaterMat,
      labAcidMat,
      spaceFlankMat,
      kitchenWallMat,
      bathWallMat,
      bathBoardGeo,
      ...bathBoardMats,
      labBoardGeo,
      ...labBoardMats,
      sidewalkGeo,
      curbGeo,
      emberGeo,
      wideFlankBoxGeo,
      wideLiquidPlaneGeo,
      ...cityBuildingMats,
      ...shopSignMats,
      ...Object.values(roadMats),
      ...bldgGeos,
    );
    for (const d of this.sharedDisposables) {
      this.sharedDisposableSet.add(d);
    }

    const markShared = (mesh: THREE.Mesh, sharedGeo = true) => {
      mesh.userData.sharedMaterial = true;
      if (sharedGeo) mesh.userData.sharedGeometry = true;
      return mesh;
    };

    const addGroundTo = (target: THREE.Group, zoneId: ZoneId) => {
      const road = markShared(new THREE.Mesh(roadGeo, roadMats[zoneId]));
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = true;
      target.add(road);

      [-1, 1].forEach((side) => {
        if (zoneId === 'mahalle_caddesi') {
          const sw = markShared(new THREE.Mesh(sidewalkGeo, sidewalkMat));
          sw.position.set(side * 6.64, 0.11, 0);
          sw.receiveShadow = true;
          target.add(sw);
          const curb = markShared(new THREE.Mesh(curbGeo, curbMat));
          curb.position.set(side * 4.04, 0.13, 0);
          target.add(curb);
        } else if (zoneId === 'yeralti_magarasi') {
          const bank = markShared(new THREE.Mesh(wideFlankBoxGeo, earthBankMat));
          bank.position.set(side * 14.9, 0.14, 0);
          target.add(bank);
        } else if (zoneId === 'buzul_dunyasi') {
          const snowBank = markShared(new THREE.Mesh(wideFlankBoxGeo, snowMat));
          snowBank.position.set(side * 15.0, 0.15, 0);
          snowBank.receiveShadow = true;
          target.add(snowBank);
        } else if (zoneId === 'ates_diyari') {
          const curb = markShared(new THREE.Mesh(curbGeo, obsidianMat));
          curb.position.set(side * 4.0, 0.17, 0);
          target.add(curb);
          const ember = markShared(new THREE.Mesh(emberGeo, emberMat));
          ember.position.set(side * 4.0, 0.35, 0);
          target.add(ember);
          const lava = markShared(new THREE.Mesh(wideLiquidPlaneGeo, lavaMat));
          lava.rotation.x = -Math.PI / 2;
          lava.position.set(side * 18.0, -0.75, 0);
          target.add(lava);
        } else if (zoneId === 'dev_mutfak') {
          const deck = markShared(new THREE.Mesh(wideFlankBoxGeo, counterFlankMat));
          deck.position.set(side * 15.0, 0.1, 0);
          deck.receiveShadow = true;
          target.add(deck);
        } else if (zoneId === 'kopuklu_banyo') {
          const tubFloor = markShared(new THREE.Mesh(wideLiquidPlaneGeo, bathFlankMat));
          tubFloor.rotation.x = -Math.PI / 2;
          tubFloor.position.set(side * 18.0, -0.68, 0);
          target.add(tubFloor);
          const bathWater = markShared(new THREE.Mesh(wideLiquidPlaneGeo, bathWaterMat));
          bathWater.rotation.x = -Math.PI / 2;
          bathWater.position.set(side * 18.0, -0.22, 0);
          target.add(bathWater);
        } else if (zoneId === 'cilgin_lab') {
          const curb = markShared(new THREE.Mesh(curbGeo, obsidianMat));
          curb.position.set(side * 4.05, 0.14, 0);
          target.add(curb);
          const acid = markShared(new THREE.Mesh(wideLiquidPlaneGeo, labAcidMat));
          acid.rotation.x = -Math.PI / 2;
          acid.position.set(side * 18.0, -0.55, 0);
          target.add(acid);
        } else {
          const voidSide = markShared(new THREE.Mesh(wideLiquidPlaneGeo, spaceFlankMat));
          voidSide.rotation.x = -Math.PI / 2;
          voidSide.position.set(side * 18.0, -0.9, 0);
          target.add(voidSide);
        }
      });
    };

    // Lazy builder for the 7 non-starting biomes so boot doesn't construct 77 hidden 3D chunks upfront
    this.buildSegmentBiomeGroup = (segIndex: number, zoneId: ZoneId): THREE.Group => {
      let biomeGroup: THREE.Group;
      if (zoneId === 'yeralti_magarasi') {
        biomeGroup = createEarthCavernSegmentProps(segIndex, this.textures.earthWallTexture);
      } else if (zoneId === 'buzul_dunyasi') {
        biomeGroup = createIceWorldSegmentProps(segIndex);
      } else if (zoneId === 'ates_diyari') {
        biomeGroup = createFireWorldSegmentProps(segIndex);
      } else if (zoneId === 'dev_mutfak') {
        biomeGroup = createKitchenSegmentProps(segIndex, kitchenWallMat);
      } else if (zoneId === 'kopuklu_banyo') {
        biomeGroup = createBathSegmentProps(segIndex, bathWallMat, bathBoardMats, bathBoardGeo);
      } else if (zoneId === 'cilgin_lab') {
        biomeGroup = createLabSegmentProps(segIndex, labBoardMats, labBoardGeo);
      } else {
        biomeGroup = createSpaceSegmentProps(segIndex);
      }
      addGroundTo(biomeGroup, zoneId);
      biomeGroup.visible = false;
      return biomeGroup;
    };

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const group = new THREE.Group();
      group.position.z = -i * SEGMENT_LENGTH;

      // 1. City Street Group (starting biome built immediately)
      const cityGroup = new THREE.Group();
      addGroundTo(cityGroup, 'mahalle_caddesi');

      [-1, 1].forEach((side, bIdx) => {
        const hIdx = (i * 3 + bIdx * 5) % 4;
        const height = 14 + hIdx * 3.5;
        const bldg = markShared(
          new THREE.Mesh(
            bldgGeos[hIdx],
            cityBuildingMats[(i + bIdx) % cityBuildingMats.length],
          ),
        );
        bldg.position.set(side * 11.1, height / 2, 0);
        bldg.receiveShadow = true;
        cityGroup.add(bldg);

        const facadeExtras = createMahalleSegmentDecor(
          i,
          side as -1 | 1,
          height,
          awningColors[(i + bIdx) % awningColors.length],
        );
        cityGroup.add(facadeExtras);

        const shopSign = markShared(
          new THREE.Mesh(signGeo, shopSignMats[(i * 2 + bIdx) % shopSignMats.length]),
        );
        shopSign.position.set(side * 7.36, 4.28, 0);
        shopSign.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
        cityGroup.add(shopSign);
      });

      const lampSide = i % 2 === 0 ? -1 : 1;
      const lamp = createStreetLampModel();
      lamp.position.set(lampSide * 4.55, 0.22, -4);
      if (lampSide === 1) lamp.rotation.y = Math.PI;
      cityGroup.add(lamp);

      const tree = createCityTreeModel();
      tree.position.set(-lampSide * 5.0, 0.22, 4);
      cityGroup.add(tree);

      const spectators: THREE.Group[] = [];
      const skipObjects = new Set<THREE.Object3D>();
      const legacyNpcSkins = SKINS.filter((s) => !CHARACTER_GLB_URLS[s.id]);
      if (i > 0 && i % 2 === 1 && legacyNpcSkins.length > 0) {
        const side = i % 4 === 1 ? -1 : 1;
        const specSkin = legacyNpcSkins[(i + 1) % legacyNpcSkins.length];
        const specRoot = createSpectatorCockroachModel(
          specSkin,
          this.textures.chitinWingTexture,
          this.textures.fabricWeaveTexture,
        );
        specRoot.scale.setScalar(0.68);
        specRoot.position.set(side * 5.05, 0.22, -1.5);
        specRoot.rotation.y = side === -1 ? -Math.PI / 2.2 : Math.PI / 2.2;
        cityGroup.add(specRoot);
        spectators.push(specRoot);
        skipObjects.add(specRoot);
      }

      if (i % 4 === 2) {
        const arch = createStreetArchModel();
        cityGroup.add(arch);
      }
      bakeStaticGroup(cityGroup, {
        castShadow: false,
        receiveShadow: false,
        keepTransparent: true,
        keepTextured: true,
        skipObjects,
      });
      group.add(cityGroup);

      const skywayGroup = createSkywaySegmentModel(i);
      skywayGroup.visible = false;
      group.add(skywayGroup);

      this.scene.add(group);
      this.segments.push({
        index: i,
        group,
        spectators,
        biomeGroups: {
          mahalle_caddesi: cityGroup,
        },
        activeBiomeGroup: cityGroup,
        activeZoneId: 'mahalle_caddesi',
        skywayGroup,
        biomeVisible: true,
      });
    }
  }

  private ensureSegmentBiomeGroup(seg: StreetSegment, zoneId: ZoneId): THREE.Group {
    const existing = seg.biomeGroups[zoneId];
    if (existing) return existing;
    if (!this.buildSegmentBiomeGroup) {
      return seg.biomeGroups.mahalle_caddesi;
    }
    const built = this.buildSegmentBiomeGroup(seg.index, zoneId);
    seg.group.add(built);
    seg.biomeGroups[zoneId] = built;
    return built;
  }

  private applySegmentEnvironment(
    seg: StreetSegment,
    zoneId: ZoneId,
    forceSync = false,
  ): void {
    const targetGroup = this.ensureSegmentBiomeGroup(seg, zoneId);
    if (forceSync) {
      (Object.keys(seg.biomeGroups) as ZoneId[]).forEach((k) => {
        const g = seg.biomeGroups[k];
        if (g) g.visible = k === zoneId;
      });
      seg.activeBiomeGroup = targetGroup;
      seg.activeZoneId = zoneId;
    } else if (seg.activeZoneId !== zoneId) {
      seg.activeBiomeGroup.visible = false;
      seg.activeBiomeGroup = targetGroup;
      seg.activeBiomeGroup.visible = true;
      seg.activeZoneId = zoneId;
    }
    const currentZoneId = ZONES[this.zoneIndex]?.id ?? 'mahalle_caddesi';
    const currStage = Math.max(0, Math.floor(this.distance / ZONE_DISTANCE));
    const upcomingZoneId = this.getZoneIdForStage(currStage + 1);
    const builtKeys = Object.keys(seg.biomeGroups) as ZoneId[];
    if (builtKeys.length > 2) {
      for (const k of builtKeys) {
        if (
          k === 'mahalle_caddesi' ||
          k === seg.activeZoneId ||
          k === zoneId ||
          k === currentZoneId ||
          k === upcomingZoneId
        ) {
          continue;
        }
        const staleGroup = seg.biomeGroups[k];
        if (staleGroup) {
          seg.group.remove(staleGroup);
          this.disposeDetachedTree(staleGroup);
          delete seg.biomeGroups[k];
          this.compiledBiomeGroups.delete(k);
        }
      }
    }
    seg.skywayGroup.visible = this.wingsTimer > 0 && zoneId !== 'yeralti_magarasi';
  }

  private pruneAllSegmentBiomes(keepZones: Set<ZoneId>): void {
    for (const seg of this.segments) {
      const keys = Object.keys(seg.biomeGroups) as ZoneId[];
      for (const k of keys) {
        if (keepZones.has(k) || k === seg.activeZoneId) continue;
        const staleGroup = seg.biomeGroups[k];
        if (staleGroup) {
          seg.group.remove(staleGroup);
          this.disposeDetachedTree(staleGroup);
          delete seg.biomeGroups[k];
          this.compiledBiomeGroups.delete(k);
        }
      }
    }
  }

  private disposeDetachedTree(root: THREE.Object3D): void {
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        if (obj.userData?.glbCachedAsset || obj.userData?.sharedAsset) return;
        if (
          obj.geometry &&
          !obj.userData?.sharedGeometry &&
          !this.sharedDisposableSet.has(obj.geometry)
        ) {
          obj.geometry.dispose();
        }
        if (!obj.userData?.sharedMaterial) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (m && !this.sharedDisposableSet.has(m)) {
              m.dispose();
            }
          }
        }
      }
    });
  }

  private getPendingPlaceholder() {
    if (!this.pendingPlayerPlaceholder) {
      const root = new THREE.Group();
      const rollPivot = new THREE.Group();
      rollPivot.position.y = 0.85;
      root.add(rollPivot);
      const emptyGeo = new THREE.BufferGeometry();
      const emptyMat = new THREE.MeshBasicMaterial({ visible: false });
      this.sharedDisposables.push(emptyGeo, emptyMat);
      this.sharedDisposableSet.add(emptyGeo);
      this.sharedDisposableSet.add(emptyMat);
      const markDummy = (m: THREE.Mesh) => {
        m.userData.sharedGeometry = true;
        m.userData.sharedMaterial = true;
        m.visible = false;
        return m;
      };
      const headlampMesh = markDummy(new THREE.Mesh(emptyGeo, emptyMat));
      const shieldSphere = markDummy(new THREE.Mesh(emptyGeo, emptyMat));
      const jetpackGroup = new THREE.Group();
      jetpackGroup.visible = false;
      const leftJetFlame = markDummy(new THREE.Mesh(emptyGeo, emptyMat));
      const rightJetFlame = markDummy(new THREE.Mesh(emptyGeo, emptyMat));
      const leftNozzleTip = new THREE.Object3D();
      const rightNozzleTip = new THREE.Object3D();
      jetpackGroup.add(leftJetFlame, rightJetFlame, leftNozzleTip, rightNozzleTip);
      rollPivot.add(headlampMesh, shieldSphere, jetpackGroup);
      this.pendingPlayerPlaceholder = {
        root,
        rollPivot,
        headlampMesh,
        shieldSphere,
        jetpackGroup,
        leftJetFlame,
        rightJetFlame,
        leftNozzleTip,
        rightNozzleTip,
      };
    }
    return this.pendingPlayerPlaceholder;
  }

  private get activePlayerRoot(): THREE.Object3D {
    return this.playerGlb
      ? this.playerGlb.root
      : this.playerRig
        ? this.playerRig.root
        : this.getPendingPlaceholder().root;
  }

  private get activeRollPivot(): THREE.Object3D {
    return this.playerGlb
      ? this.playerGlb.rollPivot
      : this.playerRig
        ? this.playerRig.rollPivot
        : this.getPendingPlaceholder().rollPivot;
  }

  private get activeHeadlampMesh(): THREE.Mesh {
    return this.playerGlb
      ? this.playerGlb.headlampMesh
      : this.playerRig
        ? this.playerRig.headlampMesh
        : this.getPendingPlaceholder().headlampMesh;
  }

  private get activeShieldSphere(): THREE.Mesh {
    return this.playerGlb
      ? this.playerGlb.shieldSphere
      : this.playerRig
        ? this.playerRig.shieldSphere
        : this.getPendingPlaceholder().shieldSphere;
  }

  private get activeJetpackGroup(): THREE.Group {
    return this.playerGlb
      ? this.playerGlb.jetpack.group
      : this.playerRig
        ? this.playerRig.jetpackGroup
        : this.getPendingPlaceholder().jetpackGroup;
  }

  private get activeLeftJetFlame(): THREE.Mesh {
    return this.playerGlb
      ? this.playerGlb.jetpack.leftFlame
      : this.playerRig
        ? this.playerRig.leftJetFlame
        : this.getPendingPlaceholder().leftJetFlame;
  }

  private get activeRightJetFlame(): THREE.Mesh {
    return this.playerGlb
      ? this.playerGlb.jetpack.rightFlame
      : this.playerRig
        ? this.playerRig.rightJetFlame
        : this.getPendingPlaceholder().rightJetFlame;
  }

  private get activeLeftNozzleTip(): THREE.Object3D {
    return this.playerGlb
      ? this.playerGlb.jetpack.leftNozzleTip
      : this.playerRig
        ? this.playerRig.leftNozzleTip
        : this.getPendingPlaceholder().leftNozzleTip;
  }

  private get activeRightNozzleTip(): THREE.Object3D {
    return this.playerGlb
      ? this.playerGlb.jetpack.rightNozzleTip
      : this.playerRig
        ? this.playerRig.rightNozzleTip
        : this.getPendingPlaceholder().rightNozzleTip;
  }

  private loadCachedPortraits(): Partial<Record<SkinId, string>> {
    try {
      localStorage.removeItem('bocek_firar_portraits_v2');
      const raw = localStorage.getItem('bocek_firar_portraits_v3');
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const out: Partial<Record<SkinId, string>> = {};
      for (const skin of SKINS) {
        const val = parsed[skin.id];
        if (typeof val === 'string' && val.startsWith('data:image/')) {
          out[skin.id] = val;
        }
      }
      return out;
    } catch {
      return {};
    }
  }

  private saveCachedPortrait(skinId: SkinId, dataUrl: string): void {
    this.portraitCache[skinId] = dataUrl;
    try {
      localStorage.setItem(
        'bocek_firar_portraits_v3',
        JSON.stringify(this.portraitCache),
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  private handleLoadedGlbCharacter(skinId: SkinId, asset: LoadedGlbAsset): void {
    if (this.disposed) return;
    if (this.currentSkinId === skinId && !this.playerGlb) {
      this.buildPlayer(skinId);
    }
    if (!this.portraitCache[skinId]) {
      if (this.phase === 'playing' || this.contextLost || this.backgroundSuspended) {
        if (!this.pendingPortraitSkins.includes(skinId)) {
          this.pendingPortraitSkins.push(skinId);
        }
        return;
      }
      try {
        const shot = this.captureGlbPortrait(asset, skinId);
        if (shot) {
          this.saveCachedPortrait(skinId, shot);
          this.callbacks.onPortraitReady?.(skinId, shot);
        }
      } catch {
        // Keep fallback portrait if offscreen capture fails
      }
    }
    if (skinId !== this.currentSkinId && this.phase !== 'playing') {
      evictUnusedCharacterGlbs([this.currentSkinId]);
    }
  }

  private queueMissingShopPortraits(): void {
    if (this.disposed || this.phase === 'playing') return;
    const ids = Object.keys(CHARACTER_GLB_URLS) as SkinId[];
    const missing = ids.filter(
      (id) =>
        !this.portraitCache[id] &&
        !this.remainingGlbQueue.includes(id),
    );
    if (missing.length === 0) return;
    this.remainingGlbQueue.push(...missing);
    this.pumpRemainingGlbQueue();
  }

  private pumpRemainingGlbQueue(): void {
    if (
      this.disposed ||
      this.glbQueueActive ||
      this.phase === 'playing' ||
      !this.shopPreviewOpen
    ) {
      return;
    }
    const nextId = this.remainingGlbQueue.shift();
    if (!nextId) {
      evictUnusedCharacterGlbs([this.currentSkinId]);
      return;
    }
    if (this.portraitCache[nextId]) {
      this.glbQueueTimerId = window.setTimeout(() => this.pumpRemainingGlbQueue(), 40);
      return;
    }
    const cached = getCachedCharacterGlb(nextId);
    if (cached) {
      this.handleLoadedGlbCharacter(nextId, cached);
      this.glbQueueTimerId = window.setTimeout(() => this.pumpRemainingGlbQueue(), 120);
      return;
    }
    this.glbQueueActive = true;
    void preloadCharacterGlb(nextId)
      .then((asset) => {
        if (this.disposed) return;
        if (asset) {
          this.handleLoadedGlbCharacter(nextId, asset);
        }
      })
      .catch(() => {
        // Wait quietly if GLB load fails
      })
      .finally(() => {
        this.glbQueueActive = false;
        if (this.disposed || this.phase === 'playing') {
          return;
        }
        if (this.remainingGlbQueue.length === 0 || !this.shopPreviewOpen) {
          evictUnusedCharacterGlbs([this.currentSkinId]);
          return;
        }
        this.glbQueueTimerId = window.setTimeout(() => this.pumpRemainingGlbQueue(), 180);
      });
  }

  private flushPendingBackgroundWork(): void {
    if (this.disposed || this.contextLost || this.backgroundSuspended || this.phase === 'playing') {
      return;
    }
    while (this.pendingPortraitSkins.length > 0) {
      const skinId = this.pendingPortraitSkins.shift()!;
      if (this.portraitCache[skinId]) continue;
      const cached = getCachedCharacterGlb(skinId);
      if (!cached) continue;
      try {
        const shot = this.captureGlbPortrait(cached, skinId);
        if (shot) {
          this.saveCachedPortrait(skinId, shot);
          this.callbacks.onPortraitReady?.(skinId, shot);
        }
      } catch {
        // Keep fallback portrait if offscreen capture fails
      }
    }
    evictUnusedCharacterGlbs([this.currentSkinId]);
    if (this.shopPreviewOpen) {
      this.pumpRemainingGlbQueue();
    }
  }

  private preloadChaserInBackground(): void {
    if (this.disposed || this.chaserGlb) return;
    void preloadChaserGlb()
      .then((asset) => {
        if (this.disposed || this.chaserGlb) return;
        this.chaserGlb = new GlbChaserController(asset, 2.04);
        const startX = THREE.MathUtils.clamp(this.playerX + 0.56, -3.05, 3.05);
        this.chaserGlb.root.position.set(startX, this.chaserY, 1.95);
        this.chaserGlb.root.rotation.set(0, -0.15, 0);
        this.chaserGlb.root.visible =
          this.phase === 'playing' &&
          this.wingsTimer <= 0 &&
          (this.stumbleTimer > 0 || this.introChaseTimer > 0);
        this.scene.add(this.chaserGlb.root);
        if (!this.isSoftwareGl) {
          void this.renderer.compileAsync(this.chaserGlb.root, this.camera, this.scene);
        }
      })
      .catch(() => {
        // Keep broom fallback if chaser GLB fails to load
      });
  }

  private preloadRegisteredGlbCharacters(): void {
    const ids = Object.keys(CHARACTER_GLB_URLS) as SkinId[];
    const primarySkinId = ids.includes(this.currentSkinId) ? this.currentSkinId : ids[0];
    this.remainingGlbQueue = [];

    if (primarySkinId) {
      // Prioritize active hero exclusively so it renders on pedestal with zero contention
      void preloadCharacterGlb(primarySkinId)
        .then((asset) => {
          if (this.disposed || !asset) return;
          this.handleLoadedGlbCharacter(primarySkinId, asset);
        })
        .catch(() => {
          // Wait quietly if GLB load fails
        })
        .finally(() => {
          if (this.disposed) return;
          window.clearTimeout(this.chaserPreloadTimerId);
          this.chaserPreloadTimerId = window.setTimeout(() => {
            this.preloadChaserInBackground();
          }, 120);
        });
    } else {
      this.preloadChaserInBackground();
    }
  }

  private buildPlayer(skinId: SkinId): void {
    const gen = ++this.buildGeneration;
    if (this.playerGlb) {
      this.scene.remove(this.playerGlb.root);
      this.playerGlb.dispose();
      this.playerGlb = null;
    }
    if (this.playerRig) {
      this.removeAndDispose(this.playerRig.root);
      this.playerRig = null;
    }
    if (this.pendingPlayerPlaceholder && this.pendingPlayerPlaceholder.root.parent === this.scene) {
      this.scene.remove(this.pendingPlayerPlaceholder.root);
    }
    if (this.playerShadow) this.removeAndDispose(this.playerShadow);

    const hasGlbRegistration = Boolean(CHARACTER_GLB_URLS[skinId]);
    const cachedAsset = getCachedCharacterGlb(skinId);
    if (cachedAsset) {
      this.playerGlb = new GlbCharacterController(cachedAsset, { withEffects: true });
      const initialRotY = this.phase === 'menu' ? Math.PI + this.menuSpinYaw : 0;
      const initialPosY = this.phase === 'menu' ? 0.27 : this.playerY;
      const initialPosX = this.phase === 'menu' ? this.menuShowcaseX : this.playerX;
      const initialPosZ = this.phase === 'menu' ? MENU_SHOWCASE_Z : 0;
      this.playerGlb.root.position.set(initialPosX, initialPosY, initialPosZ);
      this.playerGlb.root.rotation.set(0, initialRotY, 0);
      this.playerGlb.setState(this.phase === 'menu' ? 'idle' : 'run', 0, 1);
      this.scene.add(this.playerGlb.root);
      if (!this.isSoftwareGl) {
        void this.renderer.compileAsync(this.playerGlb.root, this.camera, this.scene);
      }
      if (!this.glbQueueActive && this.phase !== 'playing') {
        evictUnusedCharacterGlbs([this.currentSkinId]);
      }
    } else if (hasGlbRegistration) {
      // Never instantiate or show legacy procedural cockroach for GLB-upgraded characters
      const placeholder = this.getPendingPlaceholder();
      const initialPosY = this.phase === 'menu' ? 0.27 : this.playerY;
      const initialPosX = this.phase === 'menu' ? this.menuShowcaseX : this.playerX;
      const initialPosZ = this.phase === 'menu' ? MENU_SHOWCASE_Z : 0;
      placeholder.root.position.set(initialPosX, initialPosY, initialPosZ);
      this.scene.add(placeholder.root);

      void preloadCharacterGlb(skinId)
        .then((asset) => {
          if (this.disposed || !asset || gen !== this.buildGeneration) return;
          if (this.currentSkinId === skinId && !this.playerGlb) {
            this.buildPlayer(skinId);
          }
          if (!this.portraitCache[skinId] && this.phase !== 'playing' && !this.contextLost) {
            try {
              const shot = this.captureGlbPortrait(asset, skinId);
              if (shot) {
                this.saveCachedPortrait(skinId, shot);
                this.callbacks.onPortraitReady?.(skinId, shot);
              }
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {});
    } else {
      const skin = SKINS.find((s) => s.id === skinId) || SKINS[0];
      this.playerRig = createCockroachModel(
        skin,
        this.textures.chitinWingTexture,
        this.textures.fabricWeaveTexture,
      );
      this.playerRig.root.position.set(0, 0, 0);
      this.scene.add(this.playerRig.root);
    }

    this.playerShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.75, 1.75),
      new THREE.MeshBasicMaterial({
        map: this.textures.shadowTexture,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    this.playerShadow.rotation.x = -Math.PI / 2;
    this.playerShadow.position.set(0, 0.02, 0);
    this.scene.add(this.playerShadow);
  }

  private buildPedestal(): void {
    this.pedestalGroup = createShowcasePedestal();
    this.pedestalGroup.position.set(0, 0, MENU_SHOWCASE_Z);
    this.scene.add(this.pedestalGroup);
  }

  private buildBroom(): void {
    this.broomMesh = createBroomModel();
    this.broomMesh.position.set(8, 0, 1.5);
    this.broomMesh.visible = false;
    this.scene.add(this.broomMesh);

    this.chaserShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.75, 1.75),
      new THREE.MeshBasicMaterial({
        map: this.textures.shadowTexture,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    this.chaserShadow.rotation.x = -Math.PI / 2;
    this.chaserShadow.position.set(-0.76, 0.02, 1.42);
    this.chaserShadow.visible = false;
    this.scene.add(this.chaserShadow);

    const cachedChaser = getCachedChaserGlb();
    if (cachedChaser && !this.chaserGlb) {
      this.chaserGlb = new GlbChaserController(cachedChaser, 2.04);
      this.chaserGlb.root.visible = false;
      this.scene.add(this.chaserGlb.root);
    }
  }

  private buildParticlePool(): void {
    const count = 36;
    const geo = new THREE.OctahedronGeometry(0.11, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    this.particleInstancedMesh = new THREE.InstancedMesh(geo, mat, count);
    this.particleInstancedMesh.frustumCulled = false;
    this.particleInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    _mat4A.compose(_vec3A.set(0, -50, 0), _quatA.identity(), _zeroScale);
    _colorA.setHex(0xfbbf24);
    for (let i = 0; i < count; i++) {
      this.particleInstancedMesh.setMatrixAt(i, _mat4A);
      this.particleInstancedMesh.setColorAt(i, _colorA);
      this.particles.push({
        x: 0,
        y: -50,
        z: 0,
        rx: 0,
        ry: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        r: _colorA.r,
        g: _colorA.g,
        b: _colorA.b,
        life: 0,
        maxLife: 0.35,
      });
    }
    this.particleInstancedMesh.instanceMatrix.needsUpdate = true;
    if (this.particleInstancedMesh.instanceColor) {
      this.particleInstancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      this.particleInstancedMesh.instanceColor.needsUpdate = true;
    }
    this.particleInstancedMesh.visible = false;
    this.scene.add(this.particleInstancedMesh);
  }

  private spawnBurst(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count: number,
    spread = 3.2,
  ): void {
    const scaledCount = Math.max(
      1,
      Math.round(count * QUALITY_PROFILES[this.graphicsQuality].burstMultiplier),
    );
    _colorA.setHex(colorHex);
    for (let i = 0; i < scaledCount; i++) {
      const idx = this.particleCursor;
      const p = this.particles[idx];
      this.particleCursor = (idx + 1) % this.particles.length;
      p.x = x;
      p.y = y;
      p.z = z;
      p.rx = 0;
      p.ry = 0;
      p.vx = (Math.random() - 0.5) * spread * 2;
      p.vy = 1.4 + Math.random() * spread;
      p.vz = (Math.random() - 0.5) * spread * 1.4;
      p.r = _colorA.r;
      p.g = _colorA.g;
      p.b = _colorA.b;
      p.maxLife = 0.28 + Math.random() * 0.18;
      p.life = p.maxLife;
      this.particleInstancedMesh.setColorAt(idx, _colorA);
      _mat4A.compose(_vec3A.set(x, y, z), _quatA.identity(), _vec3B.set(1, 1, 1));
      this.particleInstancedMesh.setMatrixAt(idx, _mat4A);
    }
    this.particleInstancedMesh.instanceMatrix.needsUpdate = true;
    if (this.particleInstancedMesh.instanceColor) {
      this.particleInstancedMesh.instanceColor.needsUpdate = true;
    }
    this.particleInstancedMesh.visible = true;
  }

  private updateParticles(dt: number): void {
    if (!this.particleInstancedMesh.visible) return;
    const floorLimit = this.currentGroundY + 0.05;
    let anyAlive = false;
    let dirtyMatrix = false;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        _mat4A.compose(_vec3A.set(0, -50, 0), _quatA.identity(), _zeroScale);
        this.particleInstancedMesh.setMatrixAt(i, _mat4A);
        dirtyMatrix = true;
        continue;
      }
      anyAlive = true;
      p.vy -= 12 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(floorLimit, p.y + p.vy * dt);
      p.z += p.vz * dt;
      p.rx += dt * 8;
      p.ry += dt * 6;
      const ratio = p.life / p.maxLife;
      const s = 0.28 + ratio * 0.9;
      _eulerA.set(p.rx, p.ry, 0);
      _quatA.setFromEuler(_eulerA);
      _mat4A.compose(_vec3A.set(p.x, p.y, p.z), _quatA, _vec3B.set(s, s, s));
      this.particleInstancedMesh.setMatrixAt(i, _mat4A);
      dirtyMatrix = true;
    }

    if (dirtyMatrix) {
      this.particleInstancedMesh.instanceMatrix.needsUpdate = true;
    }
    if (!anyAlive) {
      this.particleInstancedMesh.visible = false;
    }
  }

  private buildJetExhaustPool(): void {
    const count = 120;
    const geo = new THREE.SphereGeometry(0.16, 6, 5);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    this.jetExhaustInstancedMesh = new THREE.InstancedMesh(geo, mat, count);
    this.jetExhaustInstancedMesh.frustumCulled = false;
    this.jetExhaustInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    _mat4A.compose(_vec3A.set(0, -50, 0), _quatA.identity(), _zeroScale);
    for (let i = 0; i < count; i++) {
      this.jetExhaustInstancedMesh.setMatrixAt(i, _mat4A);
      this.jetExhaustInstancedMesh.setColorAt(i, _jetFireColor);
      this.jetExhaustPool.push({
        x: 0,
        y: -50,
        z: 0,
        rx: 0,
        ry: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        r: _jetFireColor.r,
        g: _jetFireColor.g,
        b: _jetFireColor.b,
        life: 0,
        maxLife: 0.38,
      });
    }
    this.jetExhaustInstancedMesh.instanceMatrix.needsUpdate = true;
    if (this.jetExhaustInstancedMesh.instanceColor) {
      this.jetExhaustInstancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      this.jetExhaustInstancedMesh.instanceColor.needsUpdate = true;
    }
    this.jetExhaustInstancedMesh.visible = false;
    this.scene.add(this.jetExhaustInstancedMesh);
  }

  private emitJetExhaust(
    x: number,
    y: number,
    z: number,
    lateralVel: number,
  ): void {
    const idx = this.jetExhaustCursor;
    const p = this.jetExhaustPool[idx];
    this.jetExhaustCursor = (idx + 1) % this.jetExhaustPool.length;
    p.x = x + (Math.random() - 0.5) * 0.08;
    p.y = y + (Math.random() - 0.5) * 0.08;
    p.z = z + (Math.random() - 0.5) * 0.08;
    p.vx = lateralVel * 0.09 + (Math.random() - 0.5) * 1.1;
    p.vy = -1.55 - Math.random() * 0.85;
    p.vz = 7.4 + Math.random() * 2.4;
    p.maxLife = 0.42 + Math.random() * 0.1;
    p.life = p.maxLife;
    const s = 0.88 + Math.random() * 0.26;
    _mat4A.compose(_vec3A.set(p.x, p.y, p.z), _quatA.identity(), _vec3B.set(s, s, s));
    this.jetExhaustInstancedMesh.setMatrixAt(idx, _mat4A);
    this.jetExhaustInstancedMesh.setColorAt(idx, _jetFireColor);
    this.jetExhaustDirty = true;
    this.jetExhaustInstancedMesh.visible = true;
  }

  private updateJetExhaust(dt: number): void {
    if (!this.jetExhaustInstancedMesh.visible) return;
    let anyAlive = false;
    let dirtyMatrix = this.jetExhaustDirty;
    let dirtyColor = this.jetExhaustDirty;
    this.jetExhaustDirty = false;
    _quatA.identity();

    for (let i = 0; i < this.jetExhaustPool.length; i++) {
      const p = this.jetExhaustPool[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        _mat4A.compose(_vec3A.set(0, -50, 0), _quatA, _zeroScale);
        this.jetExhaustInstancedMesh.setMatrixAt(i, _mat4A);
        dirtyMatrix = true;
        continue;
      }
      anyAlive = true;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const progress = 1 - p.life / p.maxLife;
      // Subway Surfers gradient: fiery orange-red -> gold -> neon phosphor lime -> electric cyan!
      if (progress < 0.22) {
        _colorA.copy(_jetFireColor).lerp(_jetGoldColor, progress / 0.22);
      } else if (progress < 0.56) {
        _colorA.copy(_jetGoldColor).lerp(_jetPhosphorColor, (progress - 0.22) / 0.34);
      } else {
        _colorA.copy(_jetPhosphorColor).lerp(_jetCyanColor, (progress - 0.56) / 0.44);
      }
      const fade = progress > 0.72 ? (1 - progress) / 0.28 : 1;
      const s = (0.92 + progress * 1.45) * fade;
      _mat4A.compose(_vec3A.set(p.x, p.y, p.z), _quatA, _vec3B.set(s, s, s));
      this.jetExhaustInstancedMesh.setMatrixAt(i, _mat4A);
      this.jetExhaustInstancedMesh.setColorAt(i, _colorA);
      dirtyMatrix = true;
      dirtyColor = true;
    }

    if (dirtyMatrix) {
      this.jetExhaustInstancedMesh.instanceMatrix.needsUpdate = true;
    }
    if (dirtyColor && this.jetExhaustInstancedMesh.instanceColor) {
      this.jetExhaustInstancedMesh.instanceColor.needsUpdate = true;
    }
    if (!anyAlive) {
      this.jetExhaustInstancedMesh.visible = false;
    }
  }

  // --- Public Controls ---

  public setSkin(skinId: SkinId): void {
    this.currentSkinId = skinId;
    this.buildPlayer(skinId);
  }

  public setHighScore(score: number): void {
    this.highScore = score;
  }

  public setUpgrades(upgrades: Record<UpgradeKey, number>): void {
    this.upgrades = { ...upgrades };
  }

  public setBonusMultiplier(multiplier: number): void {
    this.bonusMultiplier = Math.max(1, multiplier);
  }

  public setShopPreviewMode(open: boolean): void {
    this.shopPreviewOpen = open;
    if (!open) {
      this.menuSpinYaw = 0;
      window.clearTimeout(this.glbQueueTimerId);
      if (!this.glbQueueActive) {
        evictUnusedCharacterGlbs([this.currentSkinId]);
      }
    } else {
      this.queueMissingShopPortraits();
    }
  }

  public setExternalSuspend(suspended: boolean): void {
    if (this.externalSuspended === suspended) return;
    this.externalSuspended = suspended;
    if (suspended && this.phase === 'playing') {
      this.pause();
    }
    this.syncLoopState();
  }

  public rotateMenuCharacter(deltaX: number): void {
    if (this.phase !== 'menu') return;
    this.menuSpinYaw += deltaX * 0.012;
  }

  public isPointOnMenuCharacter(clientX: number, clientY: number): boolean {
    if (this.phase !== 'menu' || this.shopPreviewOpen) return false;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    const cx = this.menuShowcaseX;
    const cz = MENU_SHOWCASE_Z;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let xi = -1; xi <= 1; xi += 2) {
      for (let yi = 0; yi <= 1; yi += 1) {
        for (let zi = -1; zi <= 1; zi += 2) {
          _vec3A.set(cx + xi * 1.15, yi === 0 ? -0.25 : 2.8, cz + zi * 0.9);
          _vec3A.project(this.camera);
          const sx = rect.left + (_vec3A.x * 0.5 + 0.5) * rect.width;
          const sy = rect.top + (-_vec3A.y * 0.5 + 0.5) * rect.height;
          if (sx < minX) minX = sx;
          if (sx > maxX) maxX = sx;
          if (sy < minY) minY = sy;
          if (sy > maxY) maxY = sy;
        }
      }
    }

    const pad = 42;
    return (
      clientX >= minX - pad &&
      clientX <= maxX + pad &&
      clientY >= minY - pad &&
      clientY <= maxY + pad
    );
  }

  public triggerMenuCharacterTapAnim(): void {
    if (this.phase !== 'menu') return;
    this.menuTapTimer = 0.65;
    this.playerGlb?.setState('tap', 0.12, 1.15, true);
  }

  private getEffectiveQualityProfile(): QualityProfile {
    if (this.isMobileDevice && this.graphicsQuality === 'high') {
      return MOBILE_HIGH_QUALITY_PROFILE;
    }
    return QUALITY_PROFILES[this.graphicsQuality];
  }

  public setGraphicsQuality(quality: GraphicsQuality): void {
    this.graphicsQuality = quality;
    this.applyQualityProfile();
  }

  private applyQualityProfile(): void {
    const profile = this.getEffectiveQualityProfile();
    const dpr = window.devicePixelRatio || 1;
    const baseRatio =
      profile.lowResRatio !== null
        ? profile.lowResRatio
        : Math.min(dpr, profile.pixelRatioCap);
    const cappedRatio = this.isSoftwareGl ? Math.min(baseRatio, 1.0) : baseRatio;
    if (Math.abs(cappedRatio - this.lastPixelRatio) > 0.001) {
      this.lastPixelRatio = cappedRatio;
      this.renderer.setPixelRatio(cappedRatio);
    }

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = profile.toneExposure;
    this.scene.environment = profile.envIntensity > 0 ? this.envMapTexture : null;
    this.scene.environmentIntensity = profile.envIntensity;

    if (!this.isSoftwareGl) {
      const shadowsOn = profile.shadowsEnabled;
      this.renderer.shadowMap.enabled = shadowsOn;
      if (this.dirLight) {
        this.dirLight.castShadow = shadowsOn;
        if (this.dirLight.shadow.mapSize.x !== profile.shadowMapSize) {
          this.dirLight.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
          this.dirLight.shadow.map?.dispose();
          this.dirLight.shadow.map = null;
        }
        const d = profile.shadowFrustumHalf;
        this.dirLight.shadow.camera.left = -d;
        this.dirLight.shadow.camera.right = d;
        this.dirLight.shadow.camera.top = d;
        this.dirLight.shadow.camera.bottom = -d;
        this.dirLight.shadow.camera.updateProjectionMatrix();
        this.renderer.shadowMap.needsUpdate = true;
      }
    } else {
      this.renderer.shadowMap.enabled = false;
      if (this.dirLight) this.dirLight.castShadow = false;
    }

    if (this.camera) {
      let camChanged = false;
      if (this.camera.far !== profile.cameraFar) {
        this.camera.far = profile.cameraFar;
        camChanged = true;
      }
      if (this.phase !== 'playing') {
        const calmFov = this.camera.aspect < 0.85 ? 54 : 45;
        if (this.camera.fov !== calmFov) {
          this.camera.fov = calmFov;
          camChanged = true;
        }
      }
      if (camChanged) {
        this.camera.updateProjectionMatrix();
      }
    }

    if (this.textures) {
      this.textures.setAnisotropy(Math.min(this.maxAniso, profile.anisotropyCap));
    }

    if (this.headlamp) {
      this.headlamp.distance = profile.headlampDistance;
    }

    if (this.menuKeyLight && this.menuRimLight) {
      const isMenu = this.phase === 'menu';
      this.menuKeyLight.visible = isMenu && profile.menuKeyIntensity > 0;
      this.menuRimLight.visible = isMenu && profile.menuRimIntensity > 0;
      if (isMenu) {
        this.menuKeyLight.intensity = profile.menuKeyIntensity;
        this.menuRimLight.intensity = profile.menuRimIntensity;
      }
    }

    const currentZone = ZONES[this.zoneIndex] ?? ZONES[0];
    if (this.starsPoints) {
      const skyAllowsStars =
        currentZone.id === 'mahalle_caddesi' ||
        currentZone.id === 'buzul_dunyasi' ||
        currentZone.id === 'peynir_galaksisi';
      const starAttr = this.starsPoints.geometry.getAttribute('position');
      const totalStars = starAttr ? starAttr.count : 160;
      this.starsPoints.geometry.setDrawRange(0, Math.floor(totalStars * profile.starsRatio));
      this.starsPoints.visible = skyAllowsStars && profile.starsRatio > 0;
    }

    if (this.scene.fog instanceof THREE.Fog && this.phase !== 'playing') {
      const isCave = currentZone.id === 'yeralti_magarasi';
      this.scene.fog.near = isCave ? profile.fogNear * 0.62 : profile.fogNear;
      this.scene.fog.far = isCave ? profile.fogFar * 0.65 : profile.fogFar;
    }

    for (const seg of this.segments) {
      seg.group.visible = seg.biomeVisible && seg.group.position.z >= profile.segmentCutoffZ;
    }

    this.applyAdaptiveParticleRange();
  }

  private applyAdaptiveParticleRange(): void {
    const profile = QUALITY_PROFILES[this.graphicsQuality];
    const scale = profile.particleRatio;
    if (this.snowNearPoints && this.snowFarPoints) {
      const nearTotal = this.snowNearPositions.length / 3;
      const farTotal = this.snowFarPositions.length / 3;
      this.snowNearPoints.geometry.setDrawRange(0, Math.floor(nearTotal * scale));
      this.snowFarPoints.geometry.setDrawRange(
        0,
        this.graphicsQuality === 'low' ? 0 : Math.floor(farTotal * scale),
      );
      if (this.graphicsQuality === 'low') {
        this.snowFarPoints.visible = false;
      }
    }
    if (this.biomeParticles) {
      const bioTotal = this.biomeParticlePositions.length / 3;
      this.biomeParticles.geometry.setDrawRange(0, Math.floor(bioTotal * scale));
    }
  }

  private acquireObstacle(poolKey: string, factory: () => THREE.Group): THREE.Group {
    const bucket = this.obstaclePool.get(poolKey);
    const pooled = bucket?.pop();
    if (pooled) {
      pooled.rotation.set(0, 0, 0);
      const spinTarget = pooled.userData.spinPivot as THREE.Object3D | undefined;
      spinTarget?.rotation.set(0, 0, 0);
      return pooled;
    }
    return factory();
  }

  private releaseObstacle(obs: ActiveObstacle): void {
    this.scene.remove(obs.mesh);
    obs.mesh.rotation.set(0, 0, 0);
    const spinTarget = obs.mesh.userData.spinPivot as THREE.Object3D | undefined;
    spinTarget?.rotation.set(0, 0, 0);
    let bucket = this.obstaclePool.get(obs.poolKey);
    if (!bucket) {
      bucket = [];
      this.obstaclePool.set(obs.poolKey, bucket);
    }
    if (bucket.length < 6) {
      bucket.push(obs.mesh);
    } else {
      this.removeAndDispose(obs.mesh);
    }
  }

  private acquirePowerup(type: PowerupType): THREE.Group {
    const pooled = this.powerupPool.get(type)?.pop();
    if (pooled) {
      pooled.rotation.set(0, 0, 0);
      return pooled;
    }
    return createPowerupModel(type);
  }

  private releasePowerup(p: ActivePowerup): void {
    this.scene.remove(p.mesh);
    p.mesh.rotation.set(0, 0, 0);
    let bucket = this.powerupPool.get(p.type);
    if (!bucket) {
      bucket = [];
      this.powerupPool.set(p.type, bucket);
    }
    if (bucket.length < 6) {
      bucket.push(p.mesh);
    } else {
      this.removeAndDispose(p.mesh);
    }
  }

  private acquireCoin(): THREE.Group {
    const pooled = this.coinPool.pop();
    if (pooled) {
      pooled.rotation.set(0, 0, 0);
      return pooled;
    }
    return createSimitCoinModel();
  }

  private releaseCoin(coin: ActiveCoin): void {
    this.scene.remove(coin.mesh);
    coin.mesh.rotation.set(0, 0, 0);
    if (this.coinPool.length < 64) {
      this.coinPool.push(coin.mesh);
    } else {
      this.removeAndDispose(coin.mesh);
    }
  }

  private removeAndDispose(mesh: THREE.Object3D): void {
    this.scene.remove(mesh);
    this.disposeDetachedTree(mesh);
  }

  private captureGlbPortrait(asset: LoadedGlbAsset, skinId?: SkinId): string | null {
    if (this.disposed || this.contextLost) return null;
    const size = 192;
    const rt = new THREE.WebGLRenderTarget(size, size, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
    });

    const pScene = new THREE.Scene();
    pScene.environment = this.scene.environment;
    pScene.add(new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 1.65));
    const key = new THREE.DirectionalLight(0xfff7ed, 2.25);
    key.position.set(1.4, 2.5, 3.6);
    pScene.add(key);
    const fill = new THREE.DirectionalLight(0xfde68a, 1.0);
    fill.position.set(-1.4, 1.5, 3.4);
    pScene.add(fill);
    const rim = new THREE.DirectionalLight(0x38bdf8, 1.45);
    rim.position.set(-2.2, 2.4, -2.2);
    pScene.add(rim);

    const ctrl = new GlbCharacterController(asset, { withEffects: false });
    ctrl.setState('idle', 0, 1);
    ctrl.update(0.12);
    ctrl.root.rotation.y = Math.PI + 0.08;
    pScene.add(ctrl.root);

    // Tight chest-up close-up studio portrait framed cleanly to each character's actual face/head center
    const isMechanic = skinId === 'tamirci_kazim';
    const focusY = isMechanic ? 1.76 : ctrl.portraitFocusY;
    const camZ = isMechanic ? 1.98 : 1.82;
    const pCam = new THREE.PerspectiveCamera(26.5, 1, 0.1, 20);
    pCam.position.set(0.09, focusY + 0.03, camZ);
    pCam.lookAt(0, focusY, 0);

    const prevTarget = this.renderer.getRenderTarget();
    const prevClearAlpha = this.renderer.getClearAlpha();
    const prevClearColor = new THREE.Color();
    this.renderer.getClearColor(prevClearColor);

    const pixelBuffer = new Uint8Array(size * size * 4);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    let outUrl: string | null = null;

    try {
      if (ctx) {
        const imgData = ctx.createImageData(size, size);
        this.renderer.setRenderTarget(rt);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.clear(true, true, true);
        this.renderer.render(pScene, pCam);
        this.renderer.readRenderTargetPixels(rt, 0, 0, size, size, pixelBuffer);

        const dst = imgData.data;
        for (let y = 0; y < size; y++) {
          const srcRow = (size - 1 - y) * size * 4;
          const dstRow = y * size * 4;
          for (let x = 0; x < size * 4; x += 4) {
            const a = pixelBuffer[srcRow + x + 3];
            if (a === 0) {
              dst[dstRow + x] = 0;
              dst[dstRow + x + 1] = 0;
              dst[dstRow + x + 2] = 0;
              dst[dstRow + x + 3] = 0;
            } else {
              dst[dstRow + x] = SRGB_LUT[pixelBuffer[srcRow + x]];
              dst[dstRow + x + 1] = SRGB_LUT[pixelBuffer[srcRow + x + 1]];
              dst[dstRow + x + 2] = SRGB_LUT[pixelBuffer[srcRow + x + 2]];
              dst[dstRow + x + 3] = a;
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
        const webpUrl = canvas.toDataURL('image/webp', 0.86);
        outUrl = webpUrl.startsWith('data:image/webp')
          ? webpUrl
          : canvas.toDataURL('image/png');
      }
    } finally {
      pScene.remove(ctrl.root);
      pScene.clear();
      ctrl.dispose();
      this.renderer.setRenderTarget(prevTarget);
      this.renderer.setClearColor(prevClearColor, prevClearAlpha);
      rt.dispose();
    }

    if (!this.contextLost && !this.isRenderSuspended()) {
      this.renderer.render(this.scene, this.camera);
    }

    return outUrl;
  }

  /**
   * Her karakterin gerçek 3D modelinden stüdyo ışıklı portre fotoğrafı üretir veya önbellekten döndürür.
   */
  public captureSkinPortraits(): Partial<Record<SkinId, string>> {
    const result: Partial<Record<SkinId, string>> = { ...this.portraitCache };
    if (this.disposed || this.contextLost) return result;
    const hasLegacySkins = SKINS.some((skin) => !CHARACTER_GLB_URLS[skin.id]);
    if (!hasLegacySkins) {
      for (const skin of SKINS) {
        if (result[skin.id]) continue;
        const cached = getCachedCharacterGlb(skin.id);
        if (cached) {
          const shot = this.captureGlbPortrait(cached, skin.id);
          if (shot) {
            this.saveCachedPortrait(skin.id, shot);
            result[skin.id] = shot;
          }
        }
      }
      return result;
    }

    const size = 256;

    const rt = new THREE.WebGLRenderTarget(size, size, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
    });

    const pScene = new THREE.Scene();
    pScene.environment = this.scene.environment;

    const hemi = new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 1.65);
    pScene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff7ed, 2.25);
    key.position.set(1.4, 2.5, 3.6);
    pScene.add(key);
    const fill = new THREE.DirectionalLight(0xfde68a, 1.0);
    fill.position.set(-1.4, 1.5, 3.4);
    pScene.add(fill);
    const rim = new THREE.DirectionalLight(0x38bdf8, 1.45);
    rim.position.set(-2.2, 2.4, -2.2);
    pScene.add(rim);

    const pCam = new THREE.PerspectiveCamera(26.5, 1, 0.1, 20);
    pCam.position.set(0.09, 1.51, 1.8);
    pCam.lookAt(0, 1.48, 0);

    const prevTarget = this.renderer.getRenderTarget();
    const prevClearAlpha = this.renderer.getClearAlpha();
    const prevClearColor = new THREE.Color();
    this.renderer.getClearColor(prevClearColor);

    const pixelBuffer = new Uint8Array(size * size * 4);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    try {
      if (ctx) {
        const imgData = ctx.createImageData(size, size);
        for (const skin of SKINS) {
          if (CHARACTER_GLB_URLS[skin.id]) {
            if (result[skin.id]) continue;
            const cached = getCachedCharacterGlb(skin.id);
            if (cached) {
              const shot = this.captureGlbPortrait(cached, skin.id);
              if (shot) {
                this.saveCachedPortrait(skin.id, shot);
                result[skin.id] = shot;
              }
            }
            continue;
          }
          const rig = createCockroachModel(
            skin,
            this.textures.chitinWingTexture,
            this.textures.fabricWeaveTexture,
          );
          try {
            rig.root.rotation.y = Math.PI + 0.08;
            rig.leftArm.rotation.x = -0.24;
            rig.rightArm.rotation.x = 0.16;
            pScene.add(rig.root);

            this.renderer.setRenderTarget(rt);
            this.renderer.setClearColor(0x000000, 0);
            this.renderer.clear(true, true, true);
            this.renderer.render(pScene, pCam);
            this.renderer.readRenderTargetPixels(rt, 0, 0, size, size, pixelBuffer);

            const dst = imgData.data;
            for (let y = 0; y < size; y++) {
              const srcRow = (size - 1 - y) * size * 4;
              const dstRow = y * size * 4;
              for (let x = 0; x < size * 4; x += 4) {
                const a = pixelBuffer[srcRow + x + 3];
                if (a === 0) {
                  dst[dstRow + x] = 0;
                  dst[dstRow + x + 1] = 0;
                  dst[dstRow + x + 2] = 0;
                  dst[dstRow + x + 3] = 0;
                } else {
                  dst[dstRow + x] = SRGB_LUT[pixelBuffer[srcRow + x]];
                  dst[dstRow + x + 1] = SRGB_LUT[pixelBuffer[srcRow + x + 1]];
                  dst[dstRow + x + 2] = SRGB_LUT[pixelBuffer[srcRow + x + 2]];
                  dst[dstRow + x + 3] = a;
                }
              }
            }
            ctx.putImageData(imgData, 0, 0);
            result[skin.id] = canvas.toDataURL('image/png');
          } finally {
            pScene.remove(rig.root);
            this.disposeDetachedTree(rig.root);
          }
        }
      }
    } finally {
      pScene.clear();
      this.renderer.setRenderTarget(prevTarget);
      this.renderer.setClearColor(prevClearColor, prevClearAlpha);
      rt.dispose();
    }

    return result;
  }

  public startRun(): void {
    gameAudio.unlock();
    window.clearTimeout(this.glbQueueTimerId);
    this.remainingGlbQueue = [];
    if (!this.glbQueueActive) {
      evictUnusedCharacterGlbs([this.currentSkinId]);
    }
    this.pruneAllSegmentBiomes(new Set(['mahalle_caddesi']));
    this.clearEntities();

    const wasInMenu = this.phase === 'menu';
    this.phase = 'playing';
    this.shopPreviewOpen = false;
    this.pedestalGroup.visible = false;
    this.menuKeyLight.visible = false;
    this.menuKeyLight.intensity = 0;
    this.menuRimLight.visible = false;
    this.menuRimLight.intensity = 0;
    this.headlamp.visible = false;
    this.headlamp.intensity = 0;
    this.score = 0;
    this.distance = 0;
    this.runCoins = 0;
    this.speed = BASE_SPEED;
    this.zoneIndex = 0;
    this.stageZones = [...INITIAL_STAGE_ORDER];
    this.biomeRevealTimer = 0;
    this.prewarmedZoneVoices = new Set<ZoneId>(['mahalle_caddesi']);
    this.lastLookaheadStepMs = performance.now();
    this.deathReason = '';
    this.deathReasonKey = '';
    this.isNewRecord = false;
    this.continueCount = 0;
    this.adReviveUsed = false;
    this.resumeCountdownTimer = 0;
    this.lastCountdownInt = 0;
    this.cameraShake = 0;
    this.lastFrameMs = performance.now();
    this.camera.fov = this.camera.aspect < 0.85 ? 59 : 49;
    this.camera.updateProjectionMatrix();
    if (!wasInMenu) {
      this.camera.position.set(0.2, 3.45, 8.45);
    }
    this.startTransitionTimer = wasInMenu ? 0.55 : 0;

    this.targetLane = 1; // Always start dead-center on Orta şerit
    this.prevSafeLane = 1;
    this.playerX = LANE_X[1];
    this.resetLaneMotion();
    this.playerY = 0;
    this.currentGroundY = 0;
    this.crashFloorY = 0;
    this.velY = 0;
    this.isGrounded = true;
    this.jumpBufferTimer = 0;
    this.rollBufferTimer = 0;
    this.rollTimer = 0;
    this.longJumpSpinTimer = 0;
    this.springSafeTimer = 0;
    this.springArcPullTimer = 0;
    this.landSquashTimer = 0;
    this.invulnTimer = 0;
    this.stumbleTimer = 0;
    this.introChaseTimer = 3.5;
    this.chaserY = 0;
    this.chaserGroundY = 0;
    this.chaserVelY = 0;
    this.chaserGrounded = true;
    this.chaserJumpCooldown = 0;
    this.chaserJustJumped = false;
    this.combo = 1;
    this.comboTimer = 0;
    this.crashTimer = 0;
    this.crashSlapImpactDone = false;
    this.gameOverDelayTimer = 0;
    this.pendingGameOverSnap = null;
    this.magnetTimer = 0;
    this.flashlightTimer = 0;
    this.turboTimer = 0;
    this.wingsTimer = 0;
    this.nextFlightCoinZ = -24;
    this.flightCoinLane = 1;
    this.skyPatternIndex = 0;
    this.lastPowerupSpawnDist = -40;
    this.lastJetpackSpawnDist = -220;
    this.hasShield = false;
    this.metrics = {
      distance: 0,
      coins: 0,
      rolls: 0,
      jumps: 0,
      nearMisses: 0,
      flights: 0,
      powerups: 0,
      magnets: 0,
      shields: 0,
      flashlights: 0,
      turbos: 0,
      zonesReached: ['mahalle_caddesi'],
    };
    this.recordGateActive = false;
    this.recordGatePassed = false;
    this.recordGateZ = -999;
    this.recordGateMesh.visible = false;
    this.jetExhaustEmitAccum = 0;

    this.broomMesh.visible = false;
    if (this.chaserGlb) {
      this.chaserGlb.resetSlap();
      this.chaserGlb.root.position.set(0.56, 0, 1.95);
      this.chaserGlb.root.rotation.set(0, -0.15, 0);
      this.chaserGlb.setState('run', 0, 1.18, true);
      this.chaserGlb.root.visible = true;
      this.chaserShadow.position.set(0.56, 0.02, 1.95);
      this.chaserShadow.scale.setScalar(1);
      this.chaserShadow.visible = true;
    } else {
      this.chaserShadow.visible = false;
    }
    this.activeJetpackGroup.visible = false;
    this.activePlayerRoot.visible = true;
    this.activePlayerRoot.rotation.set(0, wasInMenu ? Math.PI : 0, 0);
    this.activePlayerRoot.position.set(this.playerX, 0, 0);
    this.activeRollPivot.rotation.set(0, 0, 0);
    this.activeRollPivot.position.set(0, 0.85, 0);

    if (this.playerGlb) {
      this.playerGlb.setState('run', 0.22, 1, false);
    } else if (this.playerRig) {
      this.playerRig.leftWing.visible = false;
      this.playerRig.rightWing.visible = false;
      this.playerRig.headGroup.rotation.set(0, 0, 0);
      this.playerRig.leftArm.rotation.set(0, 0, 0);
      this.playerRig.rightArm.rotation.set(0, 0, 0);
    }

    this.nextSpawnZ = -42;
    this.nextTrafficWaveZ = -90;
    this.reservedMovingLane = null;
    this.reservedMovingUntilWorldDist = 0;
    this.nextMovingExpressWorldDist = 18;
    this.reservedMovingZoneId = null;
    this.dialogueTimer = 3.2;

    const z0 = ZONES[0];
    this.applyZoneVisuals(z0, true);
    this.updateBiomeGroundPositions();
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      seg.group.position.z = -i * SEGMENT_LENGTH;
      this.updateSegmentBiome(seg, -seg.group.position.z, z0.buildingTint);
    }
    gameAudio.setZoneAmbience(z0.ambienceType);
    gameAudio.setPlaying(true);
    gameAudio.playRunStart(
      () =>
        this.phase === 'playing' &&
        ZONES[this.zoneIndex]?.id === 'mahalle_caddesi' &&
        this.stumbleTimer <= 0,
    );

    this.triggerDialogue('start');
    this.callbacks.onZoneChange(z0);
    this.emitHud();
  }

  private flushPendingGameOver(skipBackgroundFlush = false): void {
    if (this.phase !== 'gameover' || this.gameOverDelayTimer <= 0 || !this.pendingGameOverSnap) {
      return;
    }
    const snap = this.pendingGameOverSnap;
    this.gameOverDelayTimer = 0;
    this.pendingGameOverSnap = null;
    this.callbacks.onHudUpdate(snap);
    this.callbacks.onGameOver(snap);
    if (!skipBackgroundFlush) {
      this.flushPendingBackgroundWork();
    }
  }

  public pause(skipBackgroundFlush = false): void {
    if (this.phase === 'gameover' && this.gameOverDelayTimer > 0) {
      this.flushPendingGameOver(skipBackgroundFlush);
      return;
    }
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.resumeCountdownTimer = 0;
    this.lastCountdownInt = 0;
    gameAudio.stopGameVoice();
    gameAudio.setPlaying(false);
    this.emitHud();
    if (!skipBackgroundFlush) {
      this.flushPendingBackgroundWork();
    }
  }

  public resume(): void {
    if (this.phase !== 'paused') return;
    gameAudio.unlock();
    this.phase = 'playing';
    this.resumeCountdownTimer = 3.0;
    this.lastCountdownInt = 3;
    this.lastFrameMs = performance.now();
    gameAudio.setPlaying(false);
    gameAudio.playCountdownTick(false);
    this.emitHud();
  }

  public returnToMenu(): void {
    this.clearEntities();
    this.pruneAllSegmentBiomes(new Set(['mahalle_caddesi']));
    this.phase = 'menu';
    this.camera.fov = this.camera.aspect < 0.85 ? 54 : 45;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 1.88, 3.95);
    this.camera.lookAt(0, 1.16, MENU_SHOWCASE_Z);
    this.resumeCountdownTimer = 0;
    this.lastCountdownInt = 0;
    this.startTransitionTimer = 0;
    this.jetExhaustEmitAccum = 0;
    this.pedestalGroup.visible = true;
    const menuProfile = QUALITY_PROFILES[this.graphicsQuality];
    this.headlamp.visible = false;
    this.headlamp.intensity = 0;
    this.menuKeyLight.visible = menuProfile.menuKeyIntensity > 0;
    this.menuKeyLight.intensity = menuProfile.menuKeyIntensity;
    this.menuRimLight.visible = menuProfile.menuRimIntensity > 0;
    this.menuRimLight.intensity = menuProfile.menuRimIntensity;
    this.menuSpinYaw = 0;
    this.score = 0;
    this.runCoins = 0;
    this.speed = BASE_SPEED;
    this.combo = 1;
    this.comboTimer = 0;
    this.metrics = {
      distance: 0,
      coins: 0,
      rolls: 0,
      jumps: 0,
      nearMisses: 0,
      flights: 0,
      powerups: 0,
      magnets: 0,
      shields: 0,
      flashlights: 0,
      turbos: 0,
      zonesReached: ['mahalle_caddesi'],
    };
    this.targetLane = 1;
    this.prevSafeLane = 1;
    this.playerX = 0;
    this.resetLaneMotion();
    this.playerY = 0;
    this.currentGroundY = 0;
    this.crashFloorY = 0;
    this.rollTimer = 0;
    this.wingsTimer = 0;
    this.stumbleTimer = 0;
    this.introChaseTimer = 0;
    this.chaserY = 0;
    this.chaserGroundY = 0;
    this.chaserVelY = 0;
    this.chaserGrounded = true;
    this.chaserJumpCooldown = 0;
    this.chaserJustJumped = false;
    this.crashTimer = 0;
    this.gameOverDelayTimer = 0;
    this.pendingGameOverSnap = null;
    this.broomMesh.visible = false;
    this.chaserShadow.visible = false;
    if (this.chaserGlb) {
      this.chaserGlb.resetSlap();
      this.chaserGlb.root.visible = false;
    }
    this.activeJetpackGroup.visible = false;
    this.activePlayerRoot.visible = true;
    this.activePlayerRoot.rotation.set(0, Math.PI, 0);
    this.activeRollPivot.rotation.set(0, 0, 0);
    this.activeRollPivot.position.set(0, 0.85, 0);

    if (this.playerGlb) {
      this.playerGlb.setState('idle', 0.16, 1, true);
    } else if (this.playerRig) {
      this.playerRig.leftWing.visible = false;
      this.playerRig.rightWing.visible = false;
      this.playerRig.headGroup.rotation.set(0, 0, 0);
      this.playerRig.leftArm.rotation.set(0, 0, 0);
      this.playerRig.rightArm.rotation.set(0, 0, 0);
    }

    this.biomeRevealTimer = 0;
    this.continueCount = 0;
    this.adReviveUsed = false;
    this.distance = 0;
    this.zoneIndex = 0;
    this.stageZones = [...INITIAL_STAGE_ORDER];
    this.applyZoneVisuals(ZONES[0], true);
    this.updateBiomeGroundPositions();
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      seg.group.position.z = -i * SEGMENT_LENGTH;
      this.updateSegmentBiome(seg, -seg.group.position.z, ZONES[0].buildingTint);
    }
    gameAudio.stopGameVoice();
    gameAudio.setPlaying(false);
    this.emitHud();
    this.flushPendingBackgroundWork();
  }

  public getContinueCount(): number {
    return this.continueCount;
  }

  public continueRun(fromAd = false): void {
    if (this.phase !== 'gameover') return;
    if (fromAd) {
      if (this.adReviveUsed) return;
      this.adReviveUsed = true;
    } else {
      this.continueCount += 1;
    }
    gameAudio.unlock();
    this.phase = 'playing';
    this.resumeCountdownTimer = 0;
    this.lastCountdownInt = 0;
    this.startTransitionTimer = 0;
    this.lastFrameMs = performance.now();
    this.crashTimer = 0;
    this.crashSlapImpactDone = false;
    this.gameOverDelayTimer = 0;
    this.pendingGameOverSnap = null;
    this.cameraShake = 0;
    this.invulnTimer = 3.2;
    const floorY = this.getWorldGroundY(this.distance);
    this.playerX = LANE_X[this.targetLane];
    this.prevSafeLane = this.targetLane;
    this.resetLaneMotion();
    this.playerY = floorY;
    this.currentGroundY = floorY;
    this.crashFloorY = floorY;
    this.velY = 0;
    this.isGrounded = true;
    this.rollTimer = 0;
    this.stumbleTimer = 0;
    this.introChaseTimer = 0;
    this.chaserY = floorY;
    this.chaserGroundY = floorY;
    this.chaserVelY = 0;
    this.chaserGrounded = true;
    this.chaserJumpCooldown = 0;
    this.chaserJustJumped = false;
    this.broomMesh.visible = false;
    this.chaserShadow.visible = false;
    if (this.chaserGlb) {
      this.chaserGlb.resetSlap();
      this.chaserGlb.root.visible = false;
    }
    this.activePlayerRoot.visible = true;
    this.activePlayerRoot.rotation.set(0, 0, 0);
    this.activeRollPivot.rotation.set(0, 0, 0);
    this.activeRollPivot.position.set(0, 0.85, 0);
    this.playerGlb?.setState('run', 0.14, 1, true);

    this.obstacles = this.obstacles.filter((obs) => {
      if (obs.z > -26) {
        this.releaseObstacle(obs);
        return false;
      }
      return true;
    });

    gameAudio.setPlaying(true);
    gameAudio.playPowerup();
    gameAudio.playReviveVoice();
    this.triggerDialogue('revive');
    this.emitHud();
  }

  private resetLaneMotion(): void {
    this.playerVelX = 0;
    this.laneSwitchFromX = this.playerX;
    this.laneSwitchToX = this.playerX;
    this.laneSwitchM0 = 0;
    this.laneSwitchElapsed = 0;
    this.laneSwitchDuration = 0.175;
    this.laneSwitchActive = false;
    this.laneSwitchDir = 0;
    this.laneDodgeArc = 0;
    this.laneDodgeBank = 0;
    this.laneSettleTimer = 0;
    this.laneSettleDir = 0;
    this.dodgeAnimTimer = 0;
    this.dodgeAnimDir = 0;
    this.dodgeJustTriggered = false;
  }

  private startLaneSwitch(lane: number, customDuration?: number): void {
    const x0 = this.playerX;
    const x1 = LANE_X[lane];
    const dx = x1 - x0;
    if (Math.abs(dx) < 0.008) {
      this.playerX = x1;
      this.playerVelX = 0;
      this.laneSwitchActive = false;
      this.laneSwitchDir = 0;
      this.laneDodgeArc = 0;
      return;
    }

    const dir = dx > 0 ? 1 : -1;
    const speedRatio = THREE.MathUtils.clamp(
      (this.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED),
      0,
      1,
    );
    const singleLaneDuration = 0.22 - speedRatio * 0.045;
    const distScale = THREE.MathUtils.clamp(Math.abs(dx) / 2.6, 0.72, 1.35);
    const dur = customDuration ?? singleLaneDuration * distScale;

    let m0: number;
    if (Math.abs(this.playerVelX) < 1.2) {
      // Silky Subway Surfers glide tangent (1.45 * dx: fluid flowing glide with zero overshoot)
      m0 = dx * 1.45;
    } else if (this.playerVelX * dir > 0) {
      // Mid-switch double-lane redirect: carry existing momentum smoothly
      m0 = THREE.MathUtils.clamp(
        this.playerVelX * dur,
        Math.abs(dx) * 0.95 * dir,
        Math.abs(dx) * 1.7 * dir,
      );
    } else {
      // Rapid reversal mid-switch: blend smoothly without sluggish lag
      m0 = this.playerVelX * dur * 0.25 + dx * 0.85;
    }

    this.laneSwitchFromX = x0;
    this.laneSwitchToX = x1;
    this.laneSwitchM0 = m0;
    this.laneSwitchElapsed = 0;
    this.laneSwitchDuration = dur;
    this.laneSwitchActive = true;
    this.laneSwitchDir = dir;
    this.laneSettleTimer = 0;

    if (
      this.isGrounded &&
      this.wingsTimer <= 0 &&
      this.rollTimer <= 0 &&
      this.longJumpSpinTimer <= 0
    ) {
      this.dodgeAnimDuration = THREE.MathUtils.clamp(dur + 0.075, 0.24, 0.30);
      this.dodgeAnimTimer = this.dodgeAnimDuration;
      this.dodgeAnimDir = dir;
      this.dodgeJustTriggered = true;
    }
  }

  public moveLeft(): void {
    if (this.phase !== 'playing' || this.resumeCountdownTimer > 0) return;
    if (this.targetLane > 0) {
      if (Math.abs(this.playerX - LANE_X[this.targetLane]) < 0.72) {
        this.prevSafeLane = this.targetLane;
      }
      this.targetLane -= 1;
      this.startLaneSwitch(this.targetLane);
      gameAudio.playLaneSwitch();
      if (this.isGrounded) {
        this.spawnBurst(this.playerX, this.playerY + 0.14, 0.1, 0xcbd5e1, 4, 2.5);
      }
    }
  }

  public moveRight(): void {
    if (this.phase !== 'playing' || this.resumeCountdownTimer > 0) return;
    if (this.targetLane < 2) {
      if (Math.abs(this.playerX - LANE_X[this.targetLane]) < 0.72) {
        this.prevSafeLane = this.targetLane;
      }
      this.targetLane += 1;
      this.startLaneSwitch(this.targetLane);
      gameAudio.playLaneSwitch();
      if (this.isGrounded) {
        this.spawnBurst(this.playerX, this.playerY + 0.14, 0.1, 0xcbd5e1, 4, 2.5);
      }
    }
  }

  public jump(): void {
    if (this.phase !== 'playing' || this.resumeCountdownTimer > 0) return;
    if (this.isGrounded) {
      this.executeJump();
    } else {
      this.jumpBufferTimer = 0.16;
    }
  }

  private executeJump(): void {
    if (this.wingsTimer > 0) return;
    this.velY = 15.4;
    this.isGrounded = false;
    this.rollTimer = 0;
    this.longJumpSpinTimer = 0;
    this.jumpBufferTimer = 0;
    this.rollBufferTimer = 0;
    this.dodgeAnimTimer = 0;
    this.dodgeAnimDir = 0;
    this.dodgeJustTriggered = false;
    this.metrics.jumps += 1;
    this.playerGlb?.setState('jump', 0.09, 1.45, true);
    gameAudio.playJump();
  }

  public slide(): void {
    if (
      this.phase !== 'playing' ||
      this.resumeCountdownTimer > 0 ||
      this.wingsTimer > 0
    ) {
      return;
    }
    if (!this.isGrounded) {
      // Pro Subway Surfers fast-fall slam -> buffers into ground roll!
      this.velY = Math.min(this.velY, -34);
      this.rollBufferTimer = 0.25;
      gameAudio.playSlide();
    } else {
      this.executeRoll();
    }
  }

  private executeRoll(): void {
    this.rollTimer = ROLL_DURATION;
    this.rollBufferTimer = 0;
    this.dodgeAnimTimer = 0;
    this.dodgeAnimDir = 0;
    this.dodgeJustTriggered = false;
    this.metrics.rolls += 1;
    this.playerGlb?.setState('slide', 0.07, 1, true);
    gameAudio.playSlide();
    this.spawnBurst(this.playerX, this.playerY + 0.18, 0.15, 0xe2e8f0, 5, 2.6);
  }

  private clearEntities(): void {
    this.obstacles.forEach((o) => this.releaseObstacle(o));
    this.coins.forEach((c) => this.releaseCoin(c));
    this.powerups.forEach((p) => this.releasePowerup(p));
    if (this.recordGateMesh) {
      this.recordGateMesh.visible = false;
    }
    this.recordGateActive = false;
    this.recordGatePassed = false;
    if (this.transitionGateMesh) {
      this.transitionGateMesh.visible = false;
    }
    this.transitionGateBoundaryDist = -1;
    this.transitionGateBurstDone = false;
    this.obstacles = [];
    this.coins = [];
    this.powerups = [];
    _mat4A.compose(_vec3A.set(0, -50, 0), _quatA.identity(), _zeroScale);
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].life = 0;
      this.particleInstancedMesh.setMatrixAt(i, _mat4A);
    }
    this.particleInstancedMesh.instanceMatrix.needsUpdate = true;
    this.particleInstancedMesh.visible = false;
    for (let i = 0; i < this.jetExhaustPool.length; i++) {
      this.jetExhaustPool[i].life = 0;
      this.jetExhaustInstancedMesh.setMatrixAt(i, _mat4A);
    }
    this.jetExhaustInstancedMesh.instanceMatrix.needsUpdate = true;
    this.jetExhaustInstancedMesh.visible = false;
  }

  private triggerDialogue(trigger: DialogueTrigger): void {
    const line = pickDialogue(trigger, this.lastDialogueId);
    this.lastDialogueId = line.id;
    this.callbacks.onDialogue(line);
  }

  private getZoneIdForStage(stageIdx: number): ZoneId {
    if (stageIdx <= 0) return INITIAL_STAGE_ORDER[0];
    while (this.stageZones.length <= stageIdx + 2) {
      const bag = [...INITIAL_STAGE_ORDER];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      const prevLast = this.stageZones[this.stageZones.length - 1];
      if (bag[0] === prevLast) {
        [bag[0], bag[1]] = [bag[1], bag[0]];
      }
      this.stageZones.push(...bag);
    }
    return this.stageZones[stageIdx];
  }

  private getTargetRunSpeed(worldDist: number): number {
    const d = Math.max(0, worldDist);
    // Stage 1 (0 - 2550m, first 3 biomes): smooth climb from 19.2 to 33.5 m/s
    const midDist = ZONE_DISTANCE * 3;
    const midSpeed = 33.5;
    if (d <= midDist) {
      return BASE_SPEED + (d / midDist) * (midSpeed - BASE_SPEED);
    }
    // Stage 2 (2550m - 6800m, biomes 4..8): smooth climb from 33.5 to 44.5 m/s
    const topSpan = ZONE_DISTANCE * 5;
    const t = Math.min(1, (d - midDist) / topSpan);
    return midSpeed + t * (MAX_SPEED - midSpeed);
  }

  private getZoneConfigById(zoneId: ZoneId): ZoneConfig {
    return ZONES.find((z) => z.id === zoneId) || ZONES[0];
  }

  private getZoneIndexById(zoneId: ZoneId): number {
    const idx = ZONES.findIndex((z) => z.id === zoneId);
    return idx >= 0 ? idx : 0;
  }

  private getEarthStageCenters(stageIdx: number): {
    descentCenter: number;
    descentStart: number;
    descentEnd: number;
    stairCenter: number;
    stairStart: number;
    stairEnd: number;
  } {
    const stageStart = stageIdx * ZONE_DISTANCE;
    const stageEnd = (stageIdx + 1) * ZONE_DISTANCE;
    const descentCenter =
      Math.round((stageStart - SEGMENT_LENGTH * 0.5) / SEGMENT_LENGTH) *
      SEGMENT_LENGTH;
    const stairCenter = Math.round(stageEnd / SEGMENT_LENGTH) * SEGMENT_LENGTH;
    return {
      descentCenter,
      descentStart: descentCenter - SEGMENT_LENGTH * 0.5,
      descentEnd: descentCenter + SEGMENT_LENGTH * 0.5,
      stairCenter,
      stairStart: stairCenter - SEGMENT_LENGTH * 0.5,
      stairEnd: stairCenter + SEGMENT_LENGTH * 0.5,
    };
  }

  private getEarthWindowForWorldDist(worldDist: number): {
    inEarth: boolean;
    stageIdx: number;
    descentStart: number;
    descentEnd: number;
    stairStart: number;
    stairEnd: number;
  } | null {
    const centerStage = Math.max(0, Math.floor(worldDist / ZONE_DISTANCE));
    for (let s = Math.max(0, centerStage - 1); s <= centerStage + 1; s++) {
      if (this.getZoneIdForStage(s) !== 'yeralti_magarasi') continue;
      const ec = this.getEarthStageCenters(s);
      if (worldDist >= ec.descentStart && worldDist < ec.stairEnd) {
        return {
          inEarth: true,
          stageIdx: s,
          descentStart: ec.descentStart,
          descentEnd: ec.descentEnd,
          stairStart: ec.stairStart,
          stairEnd: ec.stairEnd,
        };
      }
    }
    return null;
  }

  private getWorldGroundY(worldDist: number): number {
    const ew = this.getEarthWindowForWorldDist(worldDist);
    if (!ew) return 0;
    if (worldDist < ew.descentEnd) {
      return (
        TUNNEL_DEPTH *
        ((worldDist - ew.descentStart) / (ew.descentEnd - ew.descentStart))
      );
    }
    if (worldDist < ew.stairStart) {
      return TUNNEL_DEPTH;
    }
    return (
      TUNNEL_DEPTH *
      (1 - (worldDist - ew.stairStart) / (ew.stairEnd - ew.stairStart))
    );
  }

  private getEffectiveZoneId(worldDist: number): ZoneId {
    const safeDist = Math.max(0, worldDist);
    if (this.getEarthWindowForWorldDist(safeDist)) {
      return 'yeralti_magarasi';
    }
    const stageIdx = Math.floor(safeDist / ZONE_DISTANCE);
    return this.getZoneIdForStage(stageIdx);
  }

  private getZoneIndexForWorldDist(worldDist: number): number {
    return this.getZoneIndexById(this.getEffectiveZoneId(worldDist));
  }

  private getFlightHoverOffset(worldDist: number): number {
    const ew = this.getEarthWindowForWorldDist(worldDist);
    const skyH = 9.6;
    const tunnelH = 5.45;
    if (ew) {
      return tunnelH;
    }
    // Smooth ramp down 24m before approaching any Yeraltı tunnel entrance
    const nextStage = Math.floor(Math.max(0, worldDist) / ZONE_DISTANCE) + 1;
    if (this.getZoneIdForStage(nextStage) === 'yeralti_magarasi') {
      const { descentStart } = this.getEarthStageCenters(nextStage);
      if (worldDist >= descentStart - 24 && worldDist < descentStart) {
        const k = (worldDist - (descentStart - 24)) / 24;
        return skyH + (tunnelH - skyH) * k;
      }
    }
    // Smooth climb back up 24m after exiting any Yeraltı staircase
    const currStage = Math.floor(Math.max(0, worldDist) / ZONE_DISTANCE);
    if (currStage > 0 && this.getZoneIdForStage(currStage - 1) === 'yeralti_magarasi') {
      const { stairEnd } = this.getEarthStageCenters(currStage - 1);
      if (worldDist >= stairEnd && worldDist < stairEnd + 24) {
        const k = (worldDist - stairEnd) / 24;
        return tunnelH + (skyH - tunnelH) * k;
      }
    }
    return skyH;
  }

  private getRemainingDistToTransition(worldDist: number): number {
    const safeDist = Math.max(0, worldDist);
    const currStage = Math.floor(safeDist / ZONE_DISTANCE);
    const stageEnd = (currStage + 1) * ZONE_DISTANCE;
    const nextZoneId = this.getZoneIdForStage(currStage + 1);
    const transitionStart =
      nextZoneId === 'yeralti_magarasi'
        ? this.getEarthStageCenters(currStage + 1).descentStart
        : stageEnd;
    return transitionStart - safeDist;
  }

  private updateBiomeGroundPositions(): void {
    const currStage = Math.max(0, Math.floor(this.distance / ZONE_DISTANCE));
    let activeDescentZ: number | null = null;
    let activeStairZ: number | null = null;

    for (let s = Math.max(0, currStage - 1); s <= currStage + 2; s++) {
      if (this.getZoneIdForStage(s) !== 'yeralti_magarasi') continue;
      const ec = this.getEarthStageCenters(s);
      // Exact 20m descent snapped to 20m segment grid
      const descentZ = this.distance - ec.descentCenter;
      if (descentZ > -240 && descentZ < 45) {
        activeDescentZ = descentZ;
      }
      // Exact 20m staircase snapped to 20m segment grid
      const stairZ = this.distance - ec.stairCenter;
      if (stairZ > -240 && stairZ < 45) {
        activeStairZ = stairZ;
      }
    }

    if (this.descentTunnelMesh) {
      if (activeDescentZ !== null) {
        this.descentTunnelMesh.position.z = activeDescentZ;
        this.descentTunnelMesh.visible = true;
      } else {
        this.descentTunnelMesh.visible = false;
      }
    }
    if (this.staircaseExitMesh) {
      if (activeStairZ !== null) {
        this.staircaseExitMesh.position.z = activeStairZ;
        this.staircaseExitMesh.visible = true;
      } else {
        this.staircaseExitMesh.visible = false;
      }
    }

    // Position a crisp 3D thematic arch gate at upcoming non-tunnel 1000m boundaries
    let targetBoundary = -1;
    let nextBiome: ZoneConfig | null = null;
    for (let s = currStage; s <= currStage + 1; s++) {
      const boundaryDist = (s + 1) * ZONE_DISTANCE;
      const zRel = this.distance - boundaryDist;
      if (zRel > -165 && zRel < 22) {
        const fromId = this.getZoneIdForStage(s);
        const toId = this.getZoneIdForStage(s + 1);
        if (fromId !== 'yeralti_magarasi' && toId !== 'yeralti_magarasi') {
          targetBoundary = boundaryDist;
          nextBiome = this.getZoneConfigById(toId);
          break;
        }
      }
    }

    if (targetBoundary > 0 && nextBiome) {
      if (this.transitionGateBoundaryDist !== targetBoundary) {
        const glowMat = this.transitionGateMesh.userData.glowMat as
          | THREE.MeshBasicMaterial
          | undefined;
        const trimMat = this.transitionGateMesh.userData.trimMat as
          | THREE.MeshStandardMaterial
          | undefined;
        glowMat?.color.setHex(nextBiome.lampColor);
        if (trimMat) {
          trimMat.color.setHex(nextBiome.buildingTint);
          trimMat.emissive.setHex(nextBiome.lampColor);
        }
        this.transitionGateBoundaryDist = targetBoundary;
        this.transitionGateBurstDone = false;
      }
      this.transitionGateMesh.position.set(0, 0, this.distance - targetBoundary);
      this.transitionGateMesh.visible = true;
    } else {
      this.transitionGateMesh.visible = false;
    }
  }

  private updateSegmentBiome(
    seg: StreetSegment,
    rawWorldDist: number,
    _buildingTint: number,
    forceSync = false,
  ): void {
    const segWorldDist = Math.round(rawWorldDist / SEGMENT_LENGTH) * SEGMENT_LENGTH;
    const checkStage = Math.max(0, Math.floor(Math.max(0, segWorldDist) / ZONE_DISTANCE));
    for (let s = Math.max(0, checkStage - 1); s <= checkStage + 1; s++) {
      if (this.getZoneIdForStage(s) !== 'yeralti_magarasi') continue;
      const ec = this.getEarthStageCenters(s);
      // Hide exact 20m segments replaced 1:1 by descent tunnel & exit staircase
      if (
        Math.abs(segWorldDist - ec.descentCenter) < 1 ||
        Math.abs(segWorldDist - ec.stairCenter) < 1
      ) {
        seg.biomeVisible = false;
        seg.group.visible = false;
        return;
      }
    }

    seg.biomeVisible = true;
    seg.group.visible =
      seg.group.position.z >= this.getEffectiveQualityProfile().segmentCutoffZ;
    const zId = this.getEffectiveZoneId(segWorldDist);
    seg.group.position.y = zId === 'yeralti_magarasi' ? TUNNEL_DEPTH : 0;
    this.applySegmentEnvironment(seg, zId, forceSync);
  }

  private applyZoneVisuals(zone: ZoneConfig, instant = false): void {
    const profile = this.getEffectiveQualityProfile();
    this.moonMesh.visible =
      zone.id === 'mahalle_caddesi' ||
      zone.id === 'buzul_dunyasi' ||
      zone.id === 'peynir_galaksisi';
    this.starsPoints.visible =
      profile.starsRatio > 0 &&
      (zone.id === 'mahalle_caddesi' ||
        zone.id === 'buzul_dunyasi' ||
        zone.id === 'peynir_galaksisi');
    if (this.biomeParticles && zone.id === 'mahalle_caddesi') {
      this.biomeParticles.visible = false;
    }
    if (this.snowNearPoints && zone.id !== 'buzul_dunyasi') {
      this.snowNearPoints.visible = false;
    }
    if (this.snowFarPoints && zone.id !== 'buzul_dunyasi') {
      this.snowFarPoints.visible = false;
    }
    if (instant) {
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.setHex(zone.skyColor);
      }
      if (this.scene.fog instanceof THREE.Fog) {
        const isCave = zone.id === 'yeralti_magarasi';
        this.scene.fog.color.setHex(zone.fogColor);
        this.scene.fog.near = isCave ? profile.fogNear * 0.62 : profile.fogNear;
        this.scene.fog.far = isCave ? profile.fogFar * 0.65 : profile.fogFar;
      }
      this.dirLight.intensity = zone.lightIntensity * 1.38;
      this.hemiLight.intensity = zone.lightIntensity * 0.9;
      const lightColors = ZONE_LIGHT_COLORS[zone.id];
      this.dirLight.color.setHex(lightColors.dir);
      this.hemiLight.color.setHex(lightColors.hemiSky);
      this.hemiLight.groundColor.setHex(lightColors.hemiGround);
      this.updateBiomeGroundPositions();
      this.segments.forEach((seg, idx) => {
        seg.group.position.z = -idx * SEGMENT_LENGTH;
        this.updateSegmentBiome(seg, idx * SEGMENT_LENGTH, zone.buildingTint, true);
      });
    }
  }

  // --- Biome Pattern Generator ---

  private spawnPattern(zStart: number): number {
    const spawnWorldDist = this.distance + Math.max(0, -zStart);
    const zone = ZONES[this.getZoneIndexForWorldDist(spawnWorldDist)];
    const distInZone = spawnWorldDist % ZONE_DISTANCE;
    const currStage = Math.max(0, Math.floor(spawnWorldDist / ZONE_DISTANCE));
    const ew = this.getEarthWindowForWorldDist(spawnWorldDist);
    const approachingEarthMouth =
      this.getZoneIdForStage(currStage + 1) === 'yeralti_magarasi' &&
      spawnWorldDist >= this.getEarthStageCenters(currStage + 1).descentStart - 16;

    // Keep descent tunnel ramp, exit staircase, and 1000m gate boundaries obstacle-free with guiding coins!
    const onTunnelSlope =
      approachingEarthMouth ||
      (ew !== null &&
        ((spawnWorldDist >= ew.descentStart - 16 && spawnWorldDist <= ew.descentEnd + 10) ||
          (spawnWorldDist >= ew.stairStart - 12 && spawnWorldDist <= ew.stairEnd + 14)));
    const nearGateBoundary =
      spawnWorldDist > 200 &&
      (distInZone >= ZONE_DISTANCE - 32 || distInZone <= 22);
    if (onTunnelSlope || nearGateBoundary) {
      this.reservedMovingLane = null;
      this.reservedMovingZoneId = null;
      const safeLane = 1;
      this.spawnCoinLine(safeLane, zStart, 5, 2.2);
      return 16;
    }

    const roll = Math.random();
    const safeLane = Math.floor(Math.random() * 3);
    const isCity = zone.id === 'mahalle_caddesi';
    const isCave = zone.id === 'yeralti_magarasi';
    if (isCave) {
      this.ensureCaveTrainPoolReady();
    }
    const caveTrainReady = isCave && isCaveTrainModelReady();

    const rampKind: ObstacleKind = isCity ? 'bus_ramp' : 'terrain_ramp';
    const heavyKind: ObstacleKind =
      zone.id === 'yeralti_magarasi'
        ? Math.random() < 0.55
          ? 'earth_boulder'
          : 'crystal_pillar'
        : zone.id === 'buzul_dunyasi'
          ? Math.random() < 0.5
            ? 'ice_wall'
            : 'snowman_barrier'
          : zone.id === 'ates_diyari'
            ? Math.random() < 0.5
              ? 'lava_rock'
              : 'lava_cauldron'
            : zone.id === 'dev_mutfak'
              ? 'fridge_block'
              : zone.id === 'kopuklu_banyo'
                ? Math.random() < 0.5
                  ? 'giant_slipper'
                  : 'shampoo_tower'
                : zone.id === 'cilgin_lab'
                  ? Math.random() < 0.5
                    ? 'raid_can'
                    : 'bio_drum_stack'
                  : zone.id === 'peynir_galaksisi'
                    ? Math.random() < 0.5
                      ? 'ufo_saucer'
                      : 'cheese_satellite'
                    : 'taxi';
    const mediumKind: ObstacleKind =
      zone.id === 'yeralti_magarasi'
        ? Math.random() < 0.5
          ? 'earth_boulder'
          : 'crystal_pillar'
        : zone.id === 'buzul_dunyasi'
          ? 'ice_crystal'
          : zone.id === 'ates_diyari'
            ? 'fire_pillar'
            : zone.id === 'dev_mutfak'
              ? 'butter_block'
              : zone.id === 'kopuklu_banyo'
                ? 'soap_bar'
                : zone.id === 'cilgin_lab'
                  ? 'beaker_vat'
                  : zone.id === 'peynir_galaksisi'
                    ? 'cheese_asteroid'
                    : 'dumpster';
    const archKind: ObstacleKind =
      zone.id === 'yeralti_magarasi'
        ? 'root_arch'
        : zone.id === 'buzul_dunyasi'
          ? 'icicle_arch'
          : zone.id === 'ates_diyari'
            ? 'magma_arch'
            : zone.id === 'dev_mutfak'
              ? 'toaster_arch'
              : zone.id === 'kopuklu_banyo'
                ? 'towel_arch'
                : zone.id === 'cilgin_lab'
                  ? 'laser_arch'
                  : zone.id === 'peynir_galaksisi'
                    ? 'warp_arch'
                    : 'road_sign';
    const lowKind: ObstacleKind =
      zone.id === 'yeralti_magarasi'
        ? 'mushroom_cluster'
        : zone.id === 'buzul_dunyasi'
          ? 'snow_ball'
          : zone.id === 'ates_diyari'
            ? 'fire_barrel'
            : zone.id === 'dev_mutfak'
              ? Math.random() < 0.5
                ? 'tomato_ball'
                : 'rolling_pin'
              : zone.id === 'kopuklu_banyo'
                ? 'tp_roll'
                : zone.id === 'cilgin_lab'
                  ? 'jelly_cube'
                  : zone.id === 'peynir_galaksisi'
                    ? 'space_meteor'
                    : Math.random() < 0.5
                      ? 'cone'
                      : 'tire';
    const movingKind: ObstacleKind =
      zone.id === 'yeralti_magarasi'
        ? 'moving_train'
        : zone.id === 'buzul_dunyasi'
          ? 'moving_ice_sled'
          : zone.id === 'ates_diyari'
            ? 'moving_magma_cart'
            : zone.id === 'dev_mutfak'
              ? 'moving_mixer_cart'
              : zone.id === 'kopuklu_banyo'
                ? 'moving_duck_tub'
                : zone.id === 'cilgin_lab'
                  ? 'moving_lab_bot'
                  : zone.id === 'peynir_galaksisi'
                    ? 'moving_space_rover'
                    : 'moving_taxi';

    const speedGapScale =
      1 + THREE.MathUtils.clamp((this.speed - 28) / (MAX_SPEED - 28), 0, 1) * 0.22;
    const scaleGap = (baseGap: number) => Math.round(baseGap * speedGapScale);

    // Dynamic Moving Traffic / Express Train Corridor Scheduler:
    // Reserves one clean lane for 92m (road) / 106m (cave) ahead before launching an oncoming moving car or train,
    // guaranteeing full-speed visible oncoming traffic that never gets blocked or brakes behind static obstacles.
    if (this.reservedMovingLane !== null) {
      const corridorExpiredByBoundary =
        this.reservedMovingZoneId !== zone.id ||
        (isCave ? !ew || spawnWorldDist >= ew.stairStart - 45 : distInZone >= ZONE_DISTANCE - 65);
      if (corridorExpiredByBoundary) {
        this.reservedMovingLane = null;
        this.reservedMovingZoneId = null;
      } else if (spawnWorldDist >= this.reservedMovingUntilWorldDist) {
        const reservedLane = this.reservedMovingLane;
        this.reservedMovingLane = null;
        this.reservedMovingZoneId = null;
        const vSpeed = isCave ? 16.2 : 14.0;
        const zExpress = isCave ? zStart - 7.8 : zStart - 3;
        const caveSafe = !isCave || this.isCaveMovingTrainSpawnSafe(zExpress);
        if (caveSafe) {
          const fwdRange = this.getVehicleClearanceForward(zExpress, vSpeed);
          if (
            this.isLaneCorridorClearForVehicle(reservedLane, zExpress, fwdRange + 4, 16) &&
            !this.wouldMovingVehicleBlockAllLanes(reservedLane, zExpress, vSpeed)
          ) {
            this.clearLaneCoinsAndPowerups(
              reservedLane,
              zExpress - (isCave ? CAVE_TRAIN_HALF_DEPTH + 3 : 10),
              zExpress + fwdRange,
            );
            this.spawnObstacle(movingKind, reservedLane, zExpress, zone.id);
            gameAudio.playTrafficWarning();
            const guideLane = (reservedLane + 1) % 3;
            this.spawnCoinLine(guideLane, zStart + 1, 5, 2.2);
            const thirdLane = (reservedLane + 2) % 3;
            if (
              Math.random() < 0.5 &&
              this.isLaneObstacleWindowFree(thirdLane, zStart - 2.5, zStart + 1.5, 1.8)
            ) {
              this.spawnObstacle(lowKind, thirdLane, zStart - 1, zone.id);
            } else if (
              Math.random() < 0.45 &&
              this.isLaneObstacleWindowFree(thirdLane, zStart - 5, zStart - 1, 1.5)
            ) {
              this.spawnRandomPowerup(thirdLane, zStart - 3, zone.isDark);
            }
            this.nextMovingExpressWorldDist =
              spawnWorldDist +
              (isCave ? 45 + Math.random() * 30 : 48 + Math.random() * 28);
            return scaleGap(isCave ? 32 : 24);
          }
        }
        this.nextMovingExpressWorldDist = spawnWorldDist + 20;
      }
    } else if (spawnWorldDist >= this.nextMovingExpressWorldDist) {
      const canStartReservation = isCave
        ? caveTrainReady &&
          ew !== null &&
          spawnWorldDist >= ew.descentEnd + 55 &&
          spawnWorldDist <= ew.stairStart - 150
        : distInZone >= 12 && distInZone <= ZONE_DISTANCE - 155;
      if (canStartReservation) {
        const preferredStartLanes = [0, 1, 2].filter((l) =>
          this.isLaneObstacleWindowFree(l, zStart - 8, zStart + 20, 1.5),
        );
        const lanePool = preferredStartLanes.length > 0 ? preferredStartLanes : [0, 1, 2];
        this.reservedMovingLane = lanePool[Math.floor(Math.random() * lanePool.length)];
        this.reservedMovingZoneId = zone.id;
        this.reservedMovingUntilWorldDist = spawnWorldDist + (isCave ? 106 : 92);
      }
    }

    const laneAllowed = (l: number) => this.reservedMovingLane !== l;
    const allowedLanes = [0, 1, 2].filter(laneAllowed);
    const pickAllowedLane = () =>
      allowedLanes[Math.floor(Math.random() * allowedLanes.length)] ?? 0;

    // Cave Subway Metro Choreography: balanced mix of moving express trains,
    // sleek industrial boarding ramp + 2-car parked metro train, un-ramped parked trains, spring-pad flights over trains, and cavern hazards!
    let effectiveRoll = roll;
    const inCaveTrainSafeWindow =
      isCave &&
      caveTrainReady &&
      ew !== null &&
      spawnWorldDist >= ew.descentEnd + 24 &&
      spawnWorldDist <= ew.stairStart - 92;
    const movingTrainSafe =
      inCaveTrainSafeWindow && this.isCaveMovingTrainSpawnSafe(zStart - 7.8);

    if (inCaveTrainSafeWindow) {
      // A) ~28% Oncoming Moving Express Metro Train on a guaranteed clear rail corridor
      if (
        this.reservedMovingLane === null &&
        this.distance > 35 &&
        movingTrainSafe &&
        roll < 0.28
      ) {
        const zTrain = zStart - 7.8;
        const fwdRange = this.getVehicleClearanceForward(zTrain, 16.2);
        const candidateLanes = allowedLanes.filter(
          (l) =>
            this.isLaneCorridorClearForVehicle(l, zTrain, fwdRange + 4, 16) &&
            !this.wouldMovingVehicleBlockAllLanes(l, zTrain, 16.2),
        );
        if (candidateLanes.length > 0) {
          const trafficLane =
            candidateLanes[Math.floor(Math.random() * candidateLanes.length)];
          this.clearLaneCoinsAndPowerups(
            trafficLane,
            zTrain - CAVE_TRAIN_HALF_DEPTH - 3,
            zTrain + fwdRange,
          );
          this.spawnObstacle('moving_train', trafficLane, zTrain, zone.id);
          gameAudio.playTrafficWarning();
          const guideLane = (trafficLane + 1) % 3;
          this.spawnCoinLine(guideLane, zStart + 1, 5, 2.2);
          const thirdLane = (trafficLane + 2) % 3;
          if (
            Math.random() < 0.5 &&
            this.isLaneObstacleWindowFree(thirdLane, zStart - 2.5, zStart + 1.5, 2.0)
          ) {
            this.spawnObstacle(lowKind, thirdLane, zStart - 1, zone.id);
          } else if (
            Math.random() < 0.45 &&
            this.isLaneObstacleWindowFree(thirdLane, zStart - 5, zStart - 1, 1.5)
          ) {
            this.spawnRandomPowerup(thirdLane, zStart - 3, zone.isDark);
          }
          return scaleGap(32);
        }
      }

      // B) ~22% Sleek Subway Boarding Ramp + Coupled 2-Car Parked Metro Train Rooftop Run (exact flush edge-to-edge join at zRamp - 2.74)
      if (roll < 0.5) {
        const zRamp = zStart - 1.5;
        const zTrain = zRamp - (2.5 + CAVE_TRAIN_HALF_DEPTH);
        const candidateRampLanes = allowedLanes.filter((l) =>
          this.isLaneObstacleWindowFree(
            l,
            zTrain - CAVE_TRAIN_HALF_DEPTH - 0.5,
            zRamp + 3.25,
            2.5,
          ),
        );
        if (candidateRampLanes.length > 0) {
          const rampLane =
            candidateRampLanes[Math.floor(Math.random() * candidateRampLanes.length)];
          this.clearLaneCoinsAndPowerups(
            rampLane,
            zTrain - CAVE_TRAIN_HALF_DEPTH - 0.5,
            zRamp + 3.25,
          );
          this.spawnObstacle('terrain_ramp', rampLane, zRamp, zone.id);
          this.spawnObstacle('parked_train', rampLane, zTrain, zone.id);

          // Guiding coins smoothly up the slope and across both coupled train cars
          this.spawnCoinLine(rampLane, zStart + 0.8, 1, 1.0, 0.9);
          this.spawnCoinLine(rampLane, zStart - 0.9, 1, 1.0, 2.0);
          this.spawnCoinLine(rampLane, zStart - 2.6, 1, 1.0, 3.15);
          this.spawnCoinLine(rampLane, zStart - 4.4, 7, 2.15, CAVE_TRAIN_ROOF_Y + 0.35);

          const sideLane = (rampLane + 1) % 3;
          const openLane = (rampLane + 2) % 3;
          let placedSideMoving = false;
          if (laneAllowed(sideLane) && movingTrainSafe && Math.random() < 0.45) {
            const zSideTrain = zStart - 7.8;
            const fwdRange = this.getVehicleClearanceForward(zSideTrain, 16.2);
            if (
              this.isCaveMovingTrainSpawnSafe(zSideTrain) &&
              this.isLaneCorridorClearForVehicle(sideLane, zSideTrain, fwdRange + 4, 16) &&
              !this.wouldMovingVehicleBlockAllLanes(sideLane, zSideTrain, 16.2)
            ) {
              this.clearLaneCoinsAndPowerups(
                sideLane,
                zSideTrain - CAVE_TRAIN_HALF_DEPTH - 3,
                zSideTrain + fwdRange,
              );
              this.spawnObstacle('moving_train', sideLane, zSideTrain, zone.id);
              placedSideMoving = true;
            }
          }
          if (
            !placedSideMoving &&
            laneAllowed(sideLane) &&
            this.isLaneObstacleWindowFree(sideLane, zStart - 5.5, zStart - 2.5, 2.0)
          ) {
            this.spawnObstacle(
              Math.random() < 0.55 ? mediumKind : lowKind,
              sideLane,
              zStart - 4,
              zone.id,
            );
          }
          if (
            Math.random() < 0.45 &&
            this.isLaneObstacleWindowFree(openLane, zStart - 7, zStart - 3, 1.5)
          ) {
            this.spawnRandomPowerup(openLane, zStart - 5, zone.isDark);
          }
          return scaleGap(40);
        }
      }

      // C) ~18% Standalone 2-Car Parked Train WITHOUT a Ramp (balanced variety!)
      if (roll < 0.68) {
        const zTrain = zStart - 7.4;
        const candidateTrainLanes = allowedLanes.filter((l) =>
          this.isLaneObstacleWindowFree(
            l,
            zTrain - CAVE_TRAIN_HALF_DEPTH - 0.5,
            zTrain + CAVE_TRAIN_HALF_DEPTH + 0.5,
            2.4,
          ),
        );
        if (candidateTrainLanes.length > 0) {
          const trainLane =
            candidateTrainLanes[Math.floor(Math.random() * candidateTrainLanes.length)];
          this.clearLaneCoinsAndPowerups(
            trainLane,
            zTrain - CAVE_TRAIN_HALF_DEPTH - 0.5,
            zTrain + CAVE_TRAIN_HALF_DEPTH + 0.5,
          );
          this.spawnObstacle('parked_train', trainLane, zTrain, zone.id);

          const sideLane = (trainLane + 1) % 3;
          const openLane = (trainLane + 2) % 3;
          let placedSideMoving = false;
          if (laneAllowed(sideLane) && movingTrainSafe && Math.random() < 0.48) {
            const zSideTrain = zStart - 7.8;
            const fwdRange = this.getVehicleClearanceForward(zSideTrain, 16.2);
            if (
              this.isCaveMovingTrainSpawnSafe(zSideTrain) &&
              this.isLaneCorridorClearForVehicle(sideLane, zSideTrain, fwdRange + 4, 16) &&
              !this.wouldMovingVehicleBlockAllLanes(sideLane, zSideTrain, 16.2)
            ) {
              this.clearLaneCoinsAndPowerups(
                sideLane,
                zSideTrain - CAVE_TRAIN_HALF_DEPTH - 3,
                zSideTrain + fwdRange,
              );
              this.spawnObstacle('moving_train', sideLane, zSideTrain, zone.id);
              placedSideMoving = true;
            }
          }
          if (
            !placedSideMoving &&
            laneAllowed(sideLane) &&
            Math.random() < 0.65 &&
            this.isLaneObstacleWindowFree(sideLane, zStart - 5.5, zStart - 2.5, 2.0)
          ) {
            this.spawnObstacle(
              Math.random() < 0.5 ? archKind : lowKind,
              sideLane,
              zStart - 4,
              zone.id,
            );
          }
          this.spawnCoinLine(openLane, zStart, 6, 2.2);
          return scaleGap(33);
        }
      }

      // D) Re-normalize remaining ~32% across [0.20 .. 1.0) so Spring Pad flights, arches, boulders & powerups all trigger cleanly!
      effectiveRoll = 0.2 + ((Math.max(0.68, roll) - 0.68) / 0.32) * 0.8;
    }

    // 0. Dedicated Straight-Lane Moving Express (non-cave biomes, or fallback)
    if (
      this.reservedMovingLane === null &&
      !isCave &&
      this.distance > 18 &&
      distInZone < ZONE_DISTANCE - 60 &&
      Math.random() < (isCity ? 0.34 : 0.22)
    ) {
      const fwdRange = this.getVehicleClearanceForward(zStart - 2, 14.0);
      const candidateLanes = allowedLanes.filter(
        (l) =>
          this.isLaneCorridorClearForVehicle(l, zStart - 2, fwdRange, 16) &&
          !this.wouldMovingVehicleBlockAllLanes(l, zStart - 2, 14.0),
      );
      if (candidateLanes.length > 0) {
        const trafficLane =
          candidateLanes[Math.floor(Math.random() * candidateLanes.length)];
        this.clearLaneCoinsAndPowerups(trafficLane, zStart - 10, zStart - 2 + fwdRange);
        this.spawnObstacle(movingKind, trafficLane, zStart - 3, zone.id);
        gameAudio.playTrafficWarning();
        const guideLane = (trafficLane + 1) % 3;
        this.spawnCoinLine(guideLane, zStart + 1, 5, 2.2);
        const thirdLane = (trafficLane + 2) % 3;
        if (
          Math.random() < 0.55 &&
          this.isLaneObstacleWindowFree(thirdLane, zStart - 2.5, zStart + 0.5, 1.5)
        ) {
          this.spawnObstacle(lowKind, thirdLane, zStart - 1, zone.id);
        } else if (
          Math.random() < 0.45 &&
          this.isLaneObstacleWindowFree(thirdLane, zStart - 4.5, zStart - 1.5, 1.5)
        ) {
          this.spawnRandomPowerup(thirdLane, zStart - 3, zone.isDark);
        }
        return scaleGap(24);
      }
    }

    // 1. Climbable Ramp + Roof Run Coins (non-cave biomes only; cave ramps always attach to parked trains!)
    if (!isCave && effectiveRoll < 0.2) {
      const rampLane = pickAllowedLane();
      if (
        laneAllowed(rampLane) &&
        this.isLaneObstacleWindowFree(rampLane, zStart - 6.5, zStart + 2.5, 2.0)
      ) {
        this.clearLaneCoinsAndPowerups(rampLane, zStart - 6.5, zStart + 2.5);
        this.spawnObstacle(rampKind, rampLane, zStart - 2, zone.id);
        this.spawnCoinLine(rampLane, zStart - 1.1, 4, 1.35, BUS_ROOF_Y + 0.32);
      }
      const otherLane = (rampLane + 1) % 3;
      if (
        laneAllowed(otherLane) &&
        this.isLaneObstacleWindowFree(otherLane, zStart - 5.5, zStart - 0.5, 1.8)
      ) {
        const otherHeavy = this.pickZoneHeavyKind(
          isCity,
          movingKind,
          heavyKind,
          otherLane,
          zStart - 3,
        );
        this.spawnObstacle(otherHeavy, otherLane, zStart - 3, zone.id);
      }
      if (
        Math.random() < 0.45 &&
        this.isLaneObstacleWindowFree((rampLane + 2) % 3, zStart - 3.5, zStart - 0.5, 1.2)
      ) {
        this.spawnRandomPowerup((rampLane + 2) % 3, zStart - 2, zone.isDark);
      }
      return scaleGap(26);
    }

    // 2. Super Spring Launch Pad -> Parabolic Sky Coin Arc + Safe Landing Zone (soars right over a 2-car metro train in the cave!)
    if (effectiveRoll < 0.37) {
      const padLane = pickAllowedLane();
      let soaredOverTrain = false;
      if (
        laneAllowed(padLane) &&
        this.isLaneObstacleWindowFree(padLane, zStart - 2.0, zStart + 2.0, 2.0)
      ) {
        this.spawnObstacle('spring_pad', padLane, zStart, zone.id);
        this.spawnHighSkyArc(padLane, zStart);
        if (
          inCaveTrainSafeWindow &&
          Math.random() < 0.65 &&
          this.isLaneObstacleWindowFree(padLane, zStart - 23.0, zStart - 6.0, 2.0)
        ) {
          this.clearLaneCoinsAndPowerups(padLane, zStart - 22.5, zStart - 6.0);
          this.spawnObstacle('parked_train', padLane, zStart - 14.5, zone.id);
          soaredOverTrain = true;
        }
      }
      const sideLane = (padLane + 1) % 3;
      if (
        laneAllowed(sideLane) &&
        this.isLaneObstacleWindowFree(sideLane, zStart - 2.0, zStart + 2.0, 2.0)
      ) {
        this.spawnObstacle(mediumKind, sideLane, zStart, zone.id);
      }
      return Math.round((soaredOverTrain ? 56 : 48) * (1 + (speedGapScale - 1) * 0.55));
    }

    // 3. Double lane blockers
    if (effectiveRoll < 0.56) {
      const effectiveSafeLane =
        this.reservedMovingLane !== null ? pickAllowedLane() : safeLane;
      for (let lane = 0; lane < 3; lane++) {
        if (!laneAllowed(lane)) {
          this.spawnCoinLine(lane, zStart + 2, 4, 2.3);
          continue;
        }
        if (lane !== effectiveSafeLane) {
          const laneHeavy = isCave
            ? heavyKind
            : this.pickZoneHeavyKind(isCity, movingKind, heavyKind, lane, zStart);
          const pick = Math.random() < 0.55 ? laneHeavy : mediumKind;
          if (this.isLaneObstacleWindowFree(lane, zStart - 2.2, zStart + 2.2, 2.0)) {
            if (isMovingObstacleKind(pick)) {
              const fwd = this.getVehicleClearanceForward(zStart, 14.0);
              this.clearLaneCoinsAndPowerups(lane, zStart - 4, zStart + fwd);
            }
            this.spawnObstacle(pick, lane, zStart, zone.id);
          }
        } else {
          this.spawnCoinLine(lane, zStart + 2, 5, 2.3);
        }
      }
      return scaleGap(23);
    }

    // 4. Overhead Arch (Roll Under) + Low Trip/Roll Hazard
    if (effectiveRoll < 0.74) {
      const archLane = pickAllowedLane();
      if (
        laneAllowed(archLane) &&
        this.isLaneObstacleWindowFree(archLane, zStart - 1.5, zStart + 1.5, 1.8)
      ) {
        this.spawnObstacle(archKind, archLane, zStart, zone.id);
        this.spawnCoinLine(archLane, zStart + 1.5, 4, 2.2, 0.25);
      }

      const otherLane = (archLane + 1) % 3;
      if (
        laneAllowed(otherLane) &&
        this.isLaneObstacleWindowFree(otherLane, zStart - 1.5, zStart + 1.5, 1.8)
      ) {
        this.spawnObstacle(lowKind, otherLane, zStart, zone.id);
      }
      return scaleGap(20);
    }

    // 5. Hazard / Phone Roach + Heavy Blocker
    if (effectiveRoll < 0.88) {
      const altLane = pickAllowedLane();
      const lowPick = isCity ? 'phone_roach' : lowKind;
      if (
        laneAllowed(altLane) &&
        this.isLaneObstacleWindowFree(altLane, zStart - 1.5, zStart + 1.5, 1.8)
      ) {
        this.spawnObstacle(lowPick, altLane, zStart, zone.id);
      }
      const thirdLane = (altLane + 2) % 3;
      if (
        laneAllowed(thirdLane) &&
        this.isLaneObstacleWindowFree(thirdLane, zStart - 4.2, zStart + 0.2, 2.0)
      ) {
        const thirdHeavy = isCave
          ? heavyKind
          : this.pickZoneHeavyKind(isCity, movingKind, heavyKind, thirdLane, zStart - 2);
        if (isMovingObstacleKind(thirdHeavy)) {
          const fwd = this.getVehicleClearanceForward(zStart - 2, 14.0);
          this.clearLaneCoinsAndPowerups(thirdLane, zStart - 6, zStart - 2 + fwd);
        }
        this.spawnObstacle(thirdHeavy, thirdLane, zStart - 2, zone.id);
      }
      this.spawnCoinLine((altLane + 1) % 3, zStart, 5, 2.2);
      if (
        Math.random() < 0.4 &&
        this.isLaneObstacleWindowFree((altLane + 1) % 3, zStart - 13.5, zStart - 10.5, 1.2)
      ) {
        this.spawnRandomPowerup((altLane + 1) % 3, zStart - 12.0, zone.isDark);
      }
      return scaleGap(22);
    }

    // 6. Coin Run + Powerup
    const coinLane = Math.floor(Math.random() * 3);
    this.spawnCoinLine(coinLane, zStart, 7, 2.1);
    if (
      Math.random() < 0.65 &&
      this.isLaneObstacleWindowFree((coinLane + 1) % 3, zStart - 5.5, zStart - 2.5, 1.2)
    ) {
      this.spawnRandomPowerup((coinLane + 1) % 3, zStart - 4, zone.isDark);
    }
    return scaleGap(19);
  }

  private getObstacleRoofY(obs: ActiveObstacle): number {
    if (obs.kind === 'moving_train' || obs.kind === 'parked_train') {
      return CAVE_TRAIN_ROOF_Y;
    }
    if (
      obs.kind === 'terrain_ramp' &&
      obs.poolKey === 'terrain_ramp_yeralti_magarasi'
    ) {
      return CAVE_TRAIN_ROOF_Y;
    }
    return BUS_ROOF_Y;
  }

  private getVehicleClearanceForward(z: number, vehicleSpeed = 14.0): number {
    const distToPlayer = Math.max(0, -z);
    const minPlayerSpeed =
      vehicleSpeed >= 14.8
        ? Math.max(18, this.speed * 0.82)
        : Math.max(BASE_SPEED, this.speed);
    const catchup =
      distToPlayer * (vehicleSpeed / (minPlayerSpeed + vehicleSpeed));
    return Math.ceil(catchup) + (vehicleSpeed >= 14.8 ? 16 : 10);
  }

  private isLaneObstacleWindowFree(
    lane: number,
    zMin: number,
    zMax: number,
    padding = 1.6,
  ): boolean {
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      if (obs.lane !== lane) continue;
      const obsFront = obs.z + obs.halfDepth;
      const obsBack = obs.z - obs.halfDepth;
      if (obsFront > zMin - padding && obsBack < zMax + padding) {
        return false;
      }
      // Never place an obstacle ahead of an oncoming moving vehicle's catchup path
      if (isMovingObstacleKind(obs.kind) && obsFront <= zMin) {
        const vSpeed = obs.trafficSpeed ?? (obs.kind === 'moving_train' ? 16.2 : 14.0);
        const fwd = this.getVehicleClearanceForward(obs.z, vSpeed);
        const beamMargin = obs.kind === 'moving_train' ? 10 : 0;
        if (obs.z + fwd + obs.halfDepth + beamMargin > zMin - padding) {
          return false;
        }
      }
    }
    return true;
  }

  private clearLaneCoinsAndPowerups(lane: number, zMin: number, zMax: number): void {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      if (coin.isSkyCoin || coin.localY > 1.2 || coin.lane !== lane) continue;
      if (coin.z >= zMin && coin.z <= zMax) {
        this.releaseCoin(coin);
        this.coins.splice(i, 1);
      }
    }
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      if (p.localY !== undefined || p.lane !== lane) continue;
      if (p.z >= zMin && p.z <= zMax) {
        this.releasePowerup(p);
        this.powerups.splice(i, 1);
      }
    }
  }

  private isLaneCorridorClearForVehicle(
    lane: number,
    z: number,
    forwardRange: number,
    backRange: number,
    excludeId = -1,
  ): boolean {
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      if (obs.id === excludeId || obs.lane !== lane) continue;
      if (obs.z + obs.halfDepth > z - backRange && obs.z - obs.halfDepth < z + forwardRange) {
        return false;
      }
    }
    return true;
  }

  private getMovingVehicleMeetWorldDist(z: number, vSpeed: number): number {
    const playerSpeed = Math.max(BASE_SPEED * 0.9, this.speed * 0.92);
    const tMeet = Math.max(0, -z) / (playerSpeed + vSpeed);
    return this.distance + playerSpeed * tMeet;
  }

  private isCaveMovingTrainSpawnSafe(zTrain: number): boolean {
    if (!isCaveTrainModelReady()) return false;
    const trainWorldDist = this.distance + Math.max(0, -zTrain);
    const ew = this.getEarthWindowForWorldDist(trainWorldDist);
    if (!ew) return false;
    if (this.distance < ew.descentEnd - 10) return false;
    if (trainWorldDist > ew.stairStart - 42) return false;
    return this.getMovingVehicleMeetWorldDist(zTrain, 16.2) >= ew.descentEnd + 46;
  }

  private wouldMovingVehicleBlockAllLanes(
    targetLane: number,
    z: number,
    vSpeed = 14.0,
  ): boolean {
    const playerSpeed = Math.max(BASE_SPEED, this.speed);
    const zMeet = z * (playerSpeed / (playerSpeed + vSpeed));
    const zMin = zMeet - 18;
    const zMax = Math.min(2, zMeet + 18);
    const otherLanes = [0, 1, 2].filter((l) => l !== targetLane);
    const laneA = otherLanes[0];
    const laneB = otherLanes[1];
    for (let i = 0; i < this.obstacles.length; i++) {
      const obsA = this.obstacles[i];
      if (obsA.lane !== laneA || obsA.z + obsA.halfDepth < zMin || obsA.z - obsA.halfDepth > zMax) {
        continue;
      }
      for (let j = 0; j < this.obstacles.length; j++) {
        const obsB = this.obstacles[j];
        if (
          obsB.lane !== laneB ||
          obsB.z + obsB.halfDepth < zMin ||
          obsB.z - obsB.halfDepth > zMax
        ) {
          continue;
        }
        if (Math.abs(obsA.z - obsB.z) < obsA.halfDepth + obsB.halfDepth + 12) {
          return true;
        }
      }
    }
    return false;
  }

  private pickZoneHeavyKind(
    isCity: boolean,
    movingKind: ObstacleKind,
    fallbackHeavy: ObstacleKind,
    lane: number,
    z: number,
  ): ObstacleKind {
    const moveChance = isCity ? 0.68 : 0.42;
    if (this.distance <= 18 || Math.random() >= moveChance) return fallbackHeavy;
    const worldDist = this.distance + Math.max(0, -z);
    const distInZone = worldDist % ZONE_DISTANCE;
    if (distInZone >= ZONE_DISTANCE - 60) return fallbackHeavy;
    const vSpeed = movingKind === 'moving_train' ? 16.2 : 14.0;
    const fwdRange = this.getVehicleClearanceForward(z, vSpeed);
    if (
      !this.isLaneCorridorClearForVehicle(lane, z, fwdRange, 14) ||
      this.wouldMovingVehicleBlockAllLanes(lane, z, vSpeed)
    ) {
      return fallbackHeavy;
    }
    return movingKind;
  }

  private spawnObstacle(
    kind: ObstacleKind,
    lane: number,
    z: number,
    zoneOverride?: ZoneId,
  ): void {
    const zoneId = zoneOverride ?? ZONES[this.zoneIndex].id;
    let poolKey: string = kind;
    let mesh: THREE.Group;
    let height = 1.8;
    let minY = 0;
    let halfDepth = 0.85;
    let halfWidth: number | undefined;
    let subBoxes: ObstacleSubBox[] | undefined;

    switch (kind) {
      case 'taxi':
        mesh = this.acquireObstacle(poolKey, createTaxiModel);
        height = 1.65;
        halfDepth = 1.65;
        break;
      case 'moving_taxi':
        mesh = this.acquireObstacle(poolKey, createMovingTaxiModel);
        height = 1.65;
        halfDepth = 1.72;
        break;
      case 'bus_ramp':
        mesh = this.acquireObstacle(poolKey, createCityBusWithRampModel);
        height = BUS_ROOF_Y;
        halfDepth = 3.85;
        break;
      case 'terrain_ramp':
        poolKey = `terrain_ramp_${zoneId}`;
        mesh = this.acquireObstacle(poolKey, () =>
          zoneId === 'yeralti_magarasi'
            ? createEarthRampModel()
            : zoneId === 'buzul_dunyasi'
              ? createIceRampModel()
              : zoneId === 'ates_diyari'
                ? createLavaRampModel()
                : zoneId === 'dev_mutfak'
                  ? createKitchenRampModel()
                  : zoneId === 'kopuklu_banyo'
                    ? createBathRampModel()
                    : zoneId === 'cilgin_lab'
                      ? createLabRampModel()
                      : createSpaceRampModel(),
        );
        height = zoneId === 'yeralti_magarasi' ? CAVE_TRAIN_ROOF_Y : BUS_ROOF_Y;
        halfDepth = zoneId === 'yeralti_magarasi' ? 3.15 : 3.85;
        break;
      case 'spring_pad':
        mesh = this.acquireObstacle(poolKey, createSpringPadModel);
        height = 0.45;
        halfDepth = 0.85;
        break;
      case 'dumpster':
        mesh = this.acquireObstacle(poolKey, createDumpsterModel);
        height = 1.5;
        halfDepth = 0.65;
        break;
      case 'cone':
        mesh = this.acquireObstacle(poolKey, createConeBarrierModel);
        height = 0.85;
        halfDepth = 0.28;
        break;
      case 'tire':
        mesh = this.acquireObstacle(poolKey, createTireModel);
        height = 1.38;
        halfDepth = 0.26;
        break;
      case 'road_sign':
        mesh = this.acquireObstacle(poolKey, createRoadSignHighModel);
        minY = 1.45;
        height = 2.2;
        halfDepth = 0.22;
        break;
      case 'phone_roach': {
        const legacyNpcSkins = SKINS.filter((s) => !CHARACTER_GLB_URLS[s.id]);
        if (legacyNpcSkins.length > 0) {
          const roachSkin =
            legacyNpcSkins[Math.floor(Math.random() * legacyNpcSkins.length)];
          poolKey = `phone_roach_${roachSkin.id}`;
          mesh = this.acquireObstacle(poolKey, () =>
            createPhoneRoachObstacle(
              roachSkin,
              this.textures.chitinWingTexture,
              this.textures.fabricWeaveTexture,
            ),
          );
          height = 1.95;
          halfDepth = 0.38;
        } else {
          poolKey = 'cone';
          mesh = this.acquireObstacle(poolKey, createConeBarrierModel);
          height = 0.92;
          halfDepth = 0.35;
        }
        break;
      }
      case 'moving_train':
        mesh = this.acquireObstacle(poolKey, () => createCaveTrainModel(true));
        height = CAVE_TRAIN_ROOF_Y;
        halfDepth = CAVE_TRAIN_HALF_DEPTH;
        halfWidth = 1.1;
        break;
      case 'parked_train':
        mesh = this.acquireObstacle(poolKey, () => createCaveTrainModel(false));
        height = CAVE_TRAIN_ROOF_Y;
        halfDepth = CAVE_TRAIN_HALF_DEPTH;
        halfWidth = 1.1;
        break;
      case 'earth_boulder':
        mesh = this.acquireObstacle(poolKey, createEarthBoulderModel);
        height = 1.62;
        halfDepth = 0.78;
        break;
      case 'crystal_pillar':
        mesh = this.acquireObstacle(poolKey, createCrystalPillarModel);
        height = 1.9;
        halfDepth = 0.72;
        halfWidth = 0.72;
        break;
      case 'root_arch':
        mesh = this.acquireObstacle(poolKey, createRootArchModel);
        minY = 1.45;
        height = 2.2;
        halfDepth = 0.34;
        break;
      case 'mushroom_cluster':
        mesh = this.acquireObstacle(poolKey, createMushroomClusterModel);
        height = 1.1;
        halfDepth = 0.48;
        break;
      case 'ice_wall':
        mesh = this.acquireObstacle(poolKey, createIceWallModel);
        height = 1.94;
        halfDepth = 0.64;
        break;
      case 'ice_crystal':
        mesh = this.acquireObstacle(poolKey, createIceCrystalModel);
        height = 1.88;
        halfDepth = 0.65;
        halfWidth = 0.68;
        break;
      case 'moving_ice_sled':
        mesh = this.acquireObstacle(poolKey, createMovingIceSledModel);
        height = 1.56;
        halfDepth = 1.25;
        break;
      case 'snowman_barrier':
        mesh = this.acquireObstacle(poolKey, createSnowmanBarrierModel);
        height = 2.15;
        halfDepth = 0.76;
        halfWidth = 0.76;
        break;
      case 'icicle_arch':
        mesh = this.acquireObstacle(poolKey, createIcicleArchModel);
        minY = 1.45;
        height = 2.2;
        halfDepth = 0.26;
        break;
      case 'snow_ball':
        mesh = this.acquireObstacle(poolKey, createSnowBallModel);
        height = 1.12;
        halfDepth = 0.52;
        break;
      case 'lava_rock':
        mesh = this.acquireObstacle(poolKey, createLavaRockModel);
        height = 1.65;
        halfDepth = 0.78;
        break;
      case 'fire_pillar':
        mesh = this.acquireObstacle(poolKey, createFirePillarModel);
        height = 1.96;
        halfDepth = 0.54;
        halfWidth = 0.68;
        break;
      case 'moving_magma_cart':
        mesh = this.acquireObstacle(poolKey, createMovingMagmaCartModel);
        height = 1.58;
        halfDepth = 1.28;
        break;
      case 'lava_cauldron':
        mesh = this.acquireObstacle(poolKey, createLavaCauldronModel);
        height = 1.85;
        halfDepth = 0.84;
        break;
      case 'magma_arch':
        mesh = this.acquireObstacle(poolKey, createMagmaArchModel);
        minY = 1.45;
        height = 2.2;
        halfDepth = 0.26;
        break;
      case 'fire_barrel':
        mesh = this.acquireObstacle(poolKey, createFireBarrelModel);
        height = 1.12;
        halfDepth = 0.5;
        break;
      case 'rolling_pin':
        mesh = this.acquireObstacle(poolKey, createRollingPinModel);
        height = 1.14;
        halfDepth = 0.52;
        break;
      case 'butter_block':
        mesh = this.acquireObstacle(poolKey, createButterBlockModel);
        height = 1.38;
        halfDepth = 1.04;
        break;
      case 'fridge_block':
        mesh = this.acquireObstacle(poolKey, createFridgeBlockModel);
        height = 1.88;
        halfDepth = 0.82;
        break;
      case 'moving_mixer_cart':
        mesh = this.acquireObstacle(poolKey, createMovingMixerCartModel);
        height = 1.66;
        halfDepth = 1.18;
        break;
      case 'toaster_arch':
        mesh = this.acquireObstacle(poolKey, createToasterArchModel);
        minY = 1.45;
        height = 2.2;
        halfDepth = 0.28;
        break;
      case 'tomato_ball':
        mesh = this.acquireObstacle(poolKey, createTomatoBallModel);
        height = 1.12;
        halfDepth = 0.56;
        break;
      case 'giant_slipper':
        mesh = this.acquireObstacle(poolKey, createGiantSlipperModel);
        height = 1.42;
        halfDepth = 1.48;
        subBoxes = [
          { minZ: -1.48, maxZ: -0.45, minY: 0, height: 0.62 },
          { minZ: -0.45, maxZ: 0.85, minY: 0, height: 1.42 },
          { minZ: 0.85, maxZ: 1.48, minY: 0, height: 0.62 },
        ];
        break;
      case 'moving_duck_tub':
        mesh = this.acquireObstacle(poolKey, createMovingDuckTubModel);
        height = 1.78;
        halfDepth = 1.18;
        break;
      case 'shampoo_tower':
        mesh = this.acquireObstacle(poolKey, createShampooTowerModel);
        height = 1.88;
        halfDepth = 0.74;
        break;
      case 'soap_bar':
        mesh = this.acquireObstacle(poolKey, createSoapBarModel);
        height = 1.34;
        halfDepth = 0.68;
        break;
      case 'towel_arch':
        mesh = this.acquireObstacle(poolKey, createTowelArchModel);
        minY = 1.45;
        height = 2.2;
        halfDepth = 0.22;
        break;
      case 'tp_roll':
        mesh = this.acquireObstacle(poolKey, createTpRollModel);
        height = 1.12;
        halfDepth = 0.52;
        break;
      case 'raid_can':
        mesh = this.acquireObstacle(poolKey, createRaidCanModel);
        height = 2.0;
        halfDepth = 0.72;
        break;
      case 'beaker_vat':
        mesh = this.acquireObstacle(poolKey, createBeakerVatModel);
        height = 1.66;
        halfDepth = 0.82;
        break;
      case 'moving_lab_bot':
        mesh = this.acquireObstacle(poolKey, createMovingLabBotModel);
        height = 1.78;
        halfDepth = 1.12;
        break;
      case 'bio_drum_stack':
        mesh = this.acquireObstacle(poolKey, createBioDrumStackModel);
        height = 1.86;
        halfDepth = 0.78;
        break;
      case 'laser_arch':
        mesh = this.acquireObstacle(poolKey, createLaserArchModel);
        minY = 1.45;
        height = 2.2;
        halfDepth = 0.22;
        break;
      case 'jelly_cube':
        mesh = this.acquireObstacle(poolKey, createJellyCubeModel);
        height = 1.05;
        halfDepth = 0.54;
        break;
      case 'ufo_saucer':
        mesh = this.acquireObstacle(poolKey, createUfoSaucerModel);
        height = 1.72;
        halfDepth = 1.12;
        subBoxes = [
          { minZ: -0.78, maxZ: 0.78, minY: 0, height: 0.72, halfWidth: 0.72 },
          { minZ: -1.12, maxZ: 1.12, minY: 0.68, height: 1.22, halfWidth: 0.88 },
          { minZ: -0.58, maxZ: 0.58, minY: 1.16, height: 1.72, halfWidth: 0.62 },
        ];
        break;
      case 'cheese_asteroid':
        mesh = this.acquireObstacle(poolKey, createCheeseAsteroidModel);
        height = 1.78;
        halfDepth = 0.85;
        break;
      case 'moving_space_rover':
        mesh = this.acquireObstacle(poolKey, createMovingSpaceRoverModel);
        height = 1.68;
        halfDepth = 1.16;
        break;
      case 'cheese_satellite':
        mesh = this.acquireObstacle(poolKey, createCheeseSatelliteModel);
        height = 1.9;
        halfDepth = 0.78;
        break;
      case 'warp_arch':
        mesh = this.acquireObstacle(poolKey, createWarpArchModel);
        minY = 1.45;
        height = 2.2;
        halfDepth = 0.24;
        break;
      case 'space_meteor':
        mesh = this.acquireObstacle(poolKey, createSpaceMeteorModel);
        height = 1.14;
        halfDepth = 0.56;
        break;
    }

    const baseY = this.getWorldGroundY(this.distance + Math.max(0, -z));
    mesh.position.set(LANE_X[lane], baseY, z);
    this.scene.add(mesh);
    this.obstacles.push({
      id: this.nextObstacleId++,
      kind,
      poolKey,
      lane,
      z,
      baseY,
      mesh,
      trafficSpeed: isMovingObstacleKind(kind)
        ? kind === 'moving_train'
          ? 16.2
          : 14.0
        : undefined,
      visualX: LANE_X[lane],
      height,
      minY,
      halfDepth,
      halfWidth,
      subBoxes,
    });
  }

  private spawnTrafficRushWave(z: number): boolean {
    // Only pick lanes clear across the vehicle's actual catchup distance so traffic flows straight & freely without clipping
    const fwdRange = this.getVehicleClearanceForward(z, 14.0);
    const clearLanes = [0, 1, 2].filter(
      (l) =>
        this.reservedMovingLane !== l &&
        this.isLaneCorridorClearForVehicle(l, z, fwdRange, 14) &&
        !this.wouldMovingVehicleBlockAllLanes(l, z, 14.0),
    );
    if (clearLanes.length === 0) return false;

    const chosenLane = clearLanes[Math.floor(Math.random() * clearLanes.length)];
    this.clearLaneCoinsAndPowerups(chosenLane, z - 8, z + fwdRange);
    this.spawnObstacle('moving_taxi', chosenLane, z, 'mahalle_caddesi');
    gameAudio.playTrafficWarning();
    return true;
  }

  private spawnCaveTrainWave(z: number): boolean {
    if (!this.isCaveMovingTrainSpawnSafe(z)) return false;
    const fwdRange = this.getVehicleClearanceForward(z, 16.2);
    const clearLanes = [0, 1, 2].filter(
      (l) =>
        this.reservedMovingLane !== l &&
        this.isLaneCorridorClearForVehicle(l, z, fwdRange + 4, 16) &&
        !this.wouldMovingVehicleBlockAllLanes(l, z, 16.2),
    );
    if (clearLanes.length === 0) return false;

    const chosenLane = clearLanes[Math.floor(Math.random() * clearLanes.length)];
    this.clearLaneCoinsAndPowerups(
      chosenLane,
      z - CAVE_TRAIN_HALF_DEPTH - 3,
      z + fwdRange,
    );
    this.spawnObstacle('moving_train', chosenLane, z, 'yeralti_magarasi');
    gameAudio.playTrafficWarning();
    return true;
  }

  private spawnCoinLine(
    lane: number,
    zStart: number,
    count: number,
    step: number,
    localY = 0.2,
  ): void {
    const checkGroundOverlap = localY < 1.1;
    for (let i = 0; i < count; i++) {
      const z = zStart - i * step;
      if (checkGroundOverlap) {
        let hitsObstacle = false;
        for (let j = 0; j < this.obstacles.length; j++) {
          const obs = this.obstacles[j];
          if (obs.lane !== lane || obs.minY >= 1.1) continue;
          if (z >= obs.z - obs.halfDepth - 0.9 && z <= obs.z + obs.halfDepth + 0.9) {
            hitsObstacle = true;
            break;
          }
        }
        if (hitsObstacle) continue;
      }
      const mesh = this.acquireCoin();
      const baseY = this.getWorldGroundY(this.distance + Math.max(0, -z));
      const y = baseY + localY;
      mesh.position.set(LANE_X[lane], y, z);
      this.scene.add(mesh);
      this.coins.push({ lane, z, y, localY, mesh });
    }
  }

  private getSkyFlightCoinY(worldDist: number): number {
    // Level aerial floor inside tunnel vs crisp level sky height outdoors (no sagging transitions!)
    if (this.getEarthWindowForWorldDist(worldDist)) {
      return TUNNEL_DEPTH + 5.15;
    }
    return 9.35;
  }

  private isCrossingTunnelMouth(zStart: number, spanLen: number): boolean {
    const wStart = this.distance + Math.max(0, -zStart);
    const wEnd = this.distance + Math.max(0, -zStart + spanLen);
    const check = (wd: number) => {
      const ew = this.getEarthWindowForWorldDist(wd);
      if (ew) {
        if (wd >= ew.descentStart - 26 && wd <= ew.descentEnd + 10) return true;
        if (wd >= ew.stairStart - 12 && wd <= ew.stairEnd + 24) return true;
      }
      const nextStage = Math.floor(Math.max(0, wd) / ZONE_DISTANCE) + 1;
      if (this.getZoneIdForStage(nextStage) === 'yeralti_magarasi') {
        const { descentStart } = this.getEarthStageCenters(nextStage);
        if (wd >= descentStart - 26 && wd <= descentStart + 36) return true;
      }
      const currStage = Math.floor(Math.max(0, wd) / ZONE_DISTANCE);
      if (currStage > 0 && this.getZoneIdForStage(currStage - 1) === 'yeralti_magarasi') {
        const { stairEnd } = this.getEarthStageCenters(currStage - 1);
        if (wd >= stairEnd - 30 && wd <= stairEnd + 24) return true;
      }
      return false;
    };
    return check(wStart) || check(wEnd);
  }

  private addSkyCoin(x: number, y: number, z: number): void {
    const mesh = this.acquireCoin();
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    const nearestLane = x < -1.3 ? 0 : x > 1.3 ? 2 : 1;
    this.coins.push({
      lane: nearestLane,
      z,
      y,
      localY: y,
      isSkyCoin: true,
      mesh,
    });
  }

  private spawnSkyFlightFormation(zStart: number): number {
    const count = 8;
    const step = 2.05;
    const spanLen = (count - 1) * step;

    // Never spawn aerial coins across a tunnel portal cliff or into a biome transition boundary!
    const ribbonStartWorldDist = this.distance + Math.max(0, -zStart);
    if (
      this.isCrossingTunnelMouth(zStart, spanLen) ||
      this.getRemainingDistToTransition(ribbonStartWorldDist) < spanLen + 54
    ) {
      return 16;
    }

    const baseSkyY = this.getSkyFlightCoinY(this.distance + Math.max(0, -zStart));
    const pattern = this.skyPatternIndex % 4;
    this.skyPatternIndex += 1;

    const fromLane = this.flightCoinLane;
    const others = [0, 1, 2].filter((l) => l !== fromLane);
    const toLane = others[Math.floor(Math.random() * others.length)];

    if (pattern === 0) {
      // 1. Diagonal S-Curve weaving smoothly across lanes
      const startX = LANE_X[fromLane];
      const endX = LANE_X[toLane];
      for (let i = 0; i < count; i++) {
        const frac = i / (count - 1);
        const smoothFrac = 0.5 - 0.5 * Math.cos(Math.PI * frac);
        const x = startX + (endX - startX) * smoothFrac;
        const z = zStart - i * step;
        this.addSkyCoin(x, baseSkyY, z);
      }
      this.flightCoinLane = toLane;
      return spanLen + 4.5;
    }

    if (pattern === 1) {
      // 2. Twin Parallel Sky Rails (2 lanes lit up side-by-side!)
      const railA = fromLane;
      const railB = railA === 1 ? (Math.random() < 0.5 ? 0 : 2) : 1;
      for (let i = 0; i < 6; i++) {
        const z = zStart - i * 2.3;
        this.addSkyCoin(LANE_X[railA], baseSkyY, z);
        this.addSkyCoin(LANE_X[railB], baseSkyY, z);
      }
      this.flightCoinLane = railB;
      return 5 * 2.3 + 5.0;
    }

    if (pattern === 2) {
      // 3. Gently undulating Sky Wave + optional Mid-Air Bonus Orb!
      for (let i = 0; i < count; i++) {
        const z = zStart - i * step;
        const wave = Math.sin((i / (count - 1)) * Math.PI) * 0.55;
        this.addSkyCoin(LANE_X[fromLane], baseSkyY + wave, z);
      }
      if (
        Math.random() < 0.55 &&
        this.getRemainingDistToTransition(ribbonStartWorldDist) > 165
      ) {
        const bonusPool: PowerupType[] = ['magnet', 'shield', 'turbo'];
        const bonusType = bonusPool[Math.floor(Math.random() * bonusPool.length)];
        const bonusMesh = this.acquirePowerup(bonusType);
        const bonusZ = zStart - spanLen * 0.5;
        const bonusLane = toLane;
        bonusMesh.position.set(LANE_X[bonusLane], baseSkyY - 0.35, bonusZ);
        this.scene.add(bonusMesh);
        this.powerups.push({
          type: bonusType,
          lane: bonusLane,
          z: bonusZ,
          baseY: baseSkyY - 0.35,
          localY: baseSkyY - 0.35,
          mesh: bonusMesh,
        });
      }
      this.flightCoinLane = fromLane;
      return spanLen + 4.5;
    }

    // 4. 3-Lane V-Chevron Aerial Wedge
    const chevron: [number, number][] = [
      [1, 0],
      [0, -2.2],
      [2, -2.2],
      [0, -4.4],
      [2, -4.4],
      [1, -6.6],
      [1, -8.8],
    ];
    for (const [laneIdx, zOff] of chevron) {
      this.addSkyCoin(LANE_X[laneIdx], baseSkyY, zStart + zOff);
    }
    this.flightCoinLane = 1;
    return 13.5;
  }

  private spawnHighSkyArc(lane: number, zPad: number): void {
    const v0 = 20.2;
    const g = 40.0;
    const totalTime = (2 * v0) / g;
    const estSpeed = Math.max(
      this.speed,
      this.getTargetRunSpeed(this.distance + Math.max(0, -zPad)),
    );
    for (let k = 1; k <= 7; k++) {
      const tArc = (k / 8) * totalTime;
      const z = zPad - 0.5 - estSpeed * tArc;
      const baseY = this.getWorldGroundY(this.distance + Math.max(0, -z));
      const localY = Math.max(0.4, v0 * tArc - 0.5 * g * tArc * tArc - 0.25);
      const y = baseY + localY;
      const mesh = this.acquireCoin();
      mesh.position.set(LANE_X[lane], y, z);
      this.scene.add(mesh);
      this.coins.push({ lane, z, y, localY, mesh });
    }
  }

  private spawnRandomPowerup(lane: number, z: number, preferLight: boolean): void {
    const spawnWorldDist = this.distance + Math.max(0, -z);
    if (spawnWorldDist - this.lastPowerupSpawnDist < 42) {
      return;
    }

    const distInZone = spawnWorldDist % ZONE_DISTANCE;
    const remainingToTransition = this.getRemainingDistToTransition(spawnWorldDist);
    const sinceLastJetpack = spawnWorldDist - this.lastJetpackSpawnDist;

    const jetpackEligible =
      this.wingsTimer <= 0 &&
      spawnWorldDist >= 130 &&
      distInZone >= 55 &&
      remainingToTransition >= 140 &&
      sinceLastJetpack >= 360;

    const guaranteeJetpack = jetpackEligible && sinceLastJetpack >= 700;
    const boostJetpackOdds = jetpackEligible && sinceLastJetpack >= 520;
    const pool: PowerupType[] = preferLight
      ? jetpackEligible
        ? boostJetpackOdds
          ? ['flashlight', 'flashlight', 'magnet', 'shield', 'turbo', 'wings', 'wings']
          : ['flashlight', 'flashlight', 'magnet', 'shield', 'turbo', 'wings']
        : ['flashlight', 'flashlight', 'magnet', 'shield', 'turbo']
      : jetpackEligible
        ? boostJetpackOdds
          ? ['magnet', 'shield', 'turbo', 'flashlight', 'wings', 'wings']
          : ['magnet', 'shield', 'turbo', 'flashlight', 'wings']
        : ['magnet', 'shield', 'turbo', 'flashlight'];

    const type: PowerupType = guaranteeJetpack
      ? 'wings'
      : pool[Math.floor(Math.random() * pool.length)];
    const mesh = this.acquirePowerup(type);
    const baseY = this.getWorldGroundY(spawnWorldDist);
    mesh.position.set(LANE_X[lane], baseY, z);
    this.scene.add(mesh);
    this.powerups.push({ type, lane, z, baseY, mesh });

    this.lastPowerupSpawnDist = spawnWorldDist;
    if (type === 'wings') {
      this.lastJetpackSpawnDist = spawnWorldDist;
    }
  }

  // --- Loop ---

  private isRenderSuspended(): boolean {
    return this.disposed || this.backgroundSuspended || this.externalSuspended;
  }

  private syncLoopState(): void {
    if (this.isRenderSuspended()) {
      window.clearTimeout(this.loopYieldTimerId);
      this.loopYieldTimerId = 0;
      if (this.loopRunning) {
        cancelAnimationFrame(this.frameId);
        this.frameId = 0;
        this.loopRunning = false;
      }
      return;
    }
    if (!this.loopRunning) {
      this.startLoop();
    }
  }

  public setAppBackgrounded(backgrounded: boolean): void {
    if (this.backgroundSuspended === backgrounded) return;
    this.backgroundSuspended = backgrounded;
    if (backgrounded) {
      if (this.phase === 'playing') {
        this.pause(true);
      } else if (this.phase === 'gameover' && this.gameOverDelayTimer > 0) {
        this.flushPendingGameOver(true);
      }
      gameAudio.suspendForBackground();
    } else {
      this.lastFrameMs = performance.now();
      gameAudio.resumeFromBackground();
    }
    this.syncLoopState();
  }

  private handleVisibilityChange = (): void => {
    this.setAppBackgrounded(document.hidden);
  };

  private startLoop(): void {
    if (this.isRenderSuspended() || this.loopRunning) return;
    this.loopRunning = true;
    this.lastFrameMs = performance.now();
    const tick = (now: number) => {
      if (this.isRenderSuspended()) {
        this.loopRunning = false;
        this.frameId = 0;
        return;
      }

      const elapsedMs = now - this.lastFrameMs;
      this.lastFrameMs = now;
      const dt = Math.min(Math.max(elapsedMs / 1000, 0), 0.05);
      if (!this.contextLost) {
        this.update(dt);
        this.renderer.render(this.scene, this.camera);
      }
      if (this.isSoftwareGl && performance.now() - now > 18) {
        this.loopYieldTimerId = window.setTimeout(() => {
          this.loopYieldTimerId = 0;
          if (!this.isRenderSuspended()) {
            this.frameId = requestAnimationFrame(tick);
          }
        }, 0);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    this.frameId = requestAnimationFrame(tick);
  }

  private update(dt: number): void {
    if (this.phase === 'paused') return;
    if (this.phase === 'playing' && this.resumeCountdownTimer > 0) {
      this.resumeCountdownTimer = Math.max(0, this.resumeCountdownTimer - dt);
      const nextStep = Math.ceil(this.resumeCountdownTimer);
      if (nextStep !== this.lastCountdownInt) {
        this.lastCountdownInt = nextStep;
        if (nextStep > 0) {
          gameAudio.playCountdownTick(false);
        } else {
          gameAudio.playCountdownTick(true);
          gameAudio.setPlaying(true);
        }
        this.emitHud();
      }
      return;
    }
    this.simTime += dt;
    const t = this.simTime;

    if (this.phase === 'menu') {
      const targetShowcaseX = this.shopPreviewOpen
        ? this.camera.aspect < 0.78
          ? Math.max(-1.15, Math.min(-0.56, -1.25 * this.camera.aspect))
          : -1.45
        : 0;
      this.menuShowcaseX = THREE.MathUtils.damp(
        this.menuShowcaseX,
        targetShowcaseX,
        10,
        dt,
      );

      this.pedestalGroup.position.set(this.menuShowcaseX, 0, MENU_SHOWCASE_Z);
      this.pedestalGroup.rotation.y += dt * 0.35;

      // Single crisp front-facing 3D character standing squarely on the pedestal!
      if (this.menuTapTimer > 0) {
        this.menuTapTimer = Math.max(0, this.menuTapTimer - dt);
      }
      const tapFactor = this.menuTapTimer > 0 ? Math.sin((this.menuTapTimer / 0.65) * Math.PI) : 0;
      const idleBob = this.playerGlb ? tapFactor * 0.12 : Math.sin(t * 2.6) * 0.035 + tapFactor * 0.14;
      this.activePlayerRoot.position.set(this.menuShowcaseX, 0.27 + idleBob, MENU_SHOWCASE_Z);
      this.activePlayerRoot.rotation.set(
        0,
        Math.PI + this.menuSpinYaw + Math.sin(t * 0.85) * 0.14,
        0,
      );
      this.activeRollPivot.rotation.set(0, 0, 0);
      this.activeRollPivot.position.set(0, 0.85, 0);

      this.playerShadow.position.set(this.menuShowcaseX, 0.285, MENU_SHOWCASE_Z);
      this.playerShadow.scale.setScalar(0.88 - tapFactor * 0.08);

      if (this.playerGlb) {
        if (this.playerGlb.getState() !== 'idle' && this.playerGlb.getState() !== 'tap') {
          this.playerGlb.setState('idle', 0.18, 1);
        }
        this.playerGlb.update(dt, { clampFloor: true });
      } else if (this.playerRig) {
        this.playerRig.bodyGroup.rotation.set(0, 0, 0);
        this.playerRig.headGroup.rotation.y = Math.sin(t * 1.4) * 0.12 + tapFactor * 0.22;
        this.playerRig.leftArm.rotation.x = Math.sin(t * 2.6) * 0.16 - 0.12 - tapFactor * 1.15;
        this.playerRig.rightArm.rotation.x = -Math.sin(t * 2.6) * 0.16 - 0.08 - tapFactor * 0.65;
        this.playerRig.leftLeg.rotation.x = 0;
        this.playerRig.rightLeg.rotation.x = 0;
        this.playerRig.leftAntenna.rotation.x = Math.sin(t * 4.8) * 0.12;
        this.playerRig.rightAntenna.rotation.x = Math.cos(t * 4.8) * 0.12;
      }

      this.camera.position.x = THREE.MathUtils.damp(
        this.camera.position.x,
        Math.sin(t * 0.35) * 0.08,
        6,
        dt,
      );
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 1.88, 6, dt);
      this.camera.position.z = THREE.MathUtils.damp(
        this.camera.position.z,
        this.shopPreviewOpen ? 4.55 : 3.95,
        6,
        dt,
      );
      this.camera.lookAt(0, 1.16, MENU_SHOWCASE_Z);
      return;
    }

    if (this.phase === 'gameover') {
      this.crashTimer += dt;
      const crashFloorY = this.crashFloorY;
      if (this.playerY > crashFloorY) {
        this.playerY = THREE.MathUtils.damp(this.playerY, crashFloorY, 10, dt);
        this.activePlayerRoot.position.set(this.playerX, this.playerY, 0);
        this.playerShadow.position.set(this.playerX, crashFloorY + 0.02, 0);
      }
      const crashWorldY = this.getWorldGroundY(this.distance);
      const crashSlopeTan =
        crashFloorY <= crashWorldY + 0.08
          ? (this.getWorldGroundY(this.distance + 0.9) -
              this.getWorldGroundY(Math.max(0, this.distance - 0.9))) /
            1.8
          : 0;
      this.playerGlb?.update(dt, {
        clampFloor: this.playerY <= crashFloorY + 0.08,
        floorSlopeTan: crashSlopeTan,
      });
      const sideSign = this.playerX >= 0 ? -1 : 1;

      if (this.crashDeathType === 'chaser' && !this.crashSlapImpactDone) {
        this.activeRollPivot.rotation.z = Math.sin(this.crashTimer * 24) * 0.06;
      }

      if (this.chaserGlb) {
        this.broomMesh.visible = false;
        this.chaserGlb.root.visible = true;
        if (Math.abs(this.chaserY - crashFloorY) > 0.005) {
          this.chaserY = THREE.MathUtils.damp(this.chaserY, crashFloorY, 11, dt);
        } else {
          this.chaserY = crashFloorY;
        }

        if (this.crashDeathType === 'chaser') {
          const slapSpotX = THREE.MathUtils.clamp(this.playerX - sideSign * 0.54, -3.25, 3.25);
          this.chaserGlb.root.position.x = THREE.MathUtils.damp(
            this.chaserGlb.root.position.x,
            slapSpotX,
            13,
            dt,
          );
          this.chaserGlb.root.position.y = this.chaserY;
          this.chaserGlb.root.position.z = THREE.MathUtils.damp(
            this.chaserGlb.root.position.z,
            0.56,
            14,
            dt,
          );
          this.chaserGlb.root.rotation.y = THREE.MathUtils.damp(
            this.chaserGlb.root.rotation.y,
            sideSign * -0.44,
            12,
            dt,
          );

          if (this.crashTimer >= 0.5 && !this.crashSlapImpactDone) {
            this.crashSlapImpactDone = true;
            this.activeRollPivot.rotation.z = 0;
            gameAudio.playSlap();
            this.cameraShake = 0.85;
            this.spawnBurst(this.playerX, crashFloorY + 1.62, 0, 0xfbbf24, 18, 5.6);
            if (this.playerGlb) {
              this.playerGlb.setState('fall_face', 0.28, 1.0, true);
            } else if (this.playerRig) {
              this.playerRig.root.rotation.x = Math.PI / 2.2;
            }
          }
        } else {
          const arrivalX = THREE.MathUtils.clamp(this.playerX - sideSign * 0.74, -3.25, 3.25);
          this.chaserGlb.root.position.x = THREE.MathUtils.damp(
            this.chaserGlb.root.position.x,
            arrivalX,
            8.5,
            dt,
          );
          this.chaserGlb.root.position.y = this.chaserY;
          this.chaserGlb.root.position.z = THREE.MathUtils.damp(
            this.chaserGlb.root.position.z,
            0.88,
            8.5,
            dt,
          );
          if (this.crashTimer < 0.48) {
            this.chaserGlb.setState('run', 0.08, 1.25);
            this.chaserGlb.root.rotation.y = THREE.MathUtils.damp(
              this.chaserGlb.root.rotation.y,
              0,
              10,
              dt,
            );
          } else {
            this.chaserGlb.setState('angry', 0.16, 1.05);
            this.chaserGlb.root.rotation.y = THREE.MathUtils.damp(
              this.chaserGlb.root.rotation.y,
              sideSign * -0.22,
              10,
              dt,
            );
          }
        }
        this.chaserShadow.visible = true;
        this.chaserShadow.position.set(
          this.chaserGlb.root.position.x,
          crashFloorY + 0.02,
          this.chaserGlb.root.position.z,
        );
        this.chaserShadow.scale.setScalar(
          Math.max(0.35, 1 - Math.max(0, this.chaserY - crashFloorY) * 0.12),
        );
        this.chaserGlb.update(dt, {
          clampFloor: this.chaserY <= crashFloorY + 0.08,
          floorSlopeTan: crashSlopeTan,
        });
      } else if (this.broomMesh.visible) {
        this.chaserShadow.visible = false;
        this.broomMesh.position.x = THREE.MathUtils.damp(
          this.broomMesh.position.x,
          this.playerX - sideSign * 0.58,
          7,
          dt,
        );
        this.broomMesh.position.y = crashFloorY;
        this.broomMesh.position.z = THREE.MathUtils.damp(
          this.broomMesh.position.z,
          0.72,
          7,
          dt,
        );
        this.broomMesh.rotation.z = Math.sin(this.crashTimer * 14) * 0.14;
      }

      if (this.headlamp.visible) {
        this.headlamp.position.set(this.camera.position.x, this.camera.position.y + 0.35, 3.8);
        this.headlampTarget.position.set(this.playerX, crashFloorY + 1.0, 0.2);
      }
      const shakeX =
        this.cameraShake > 0
          ? (Math.sin(t * 48) * 0.65 + Math.cos(t * 73) * 0.35) * this.cameraShake * 0.45
          : 0;
      const shakeY =
        this.cameraShake > 0
          ? (Math.cos(t * 53) * 0.65 + Math.sin(t * 67) * 0.35) * this.cameraShake * 0.45
          : 0;
      if (this.cameraShake > 0) {
        this.cameraShake = Math.max(0, this.cameraShake - dt * 2.5);
      }
      // Dramatic 3/4 angled crash camera so the entire fall / slap beat is unobstructed and clear
      const isChaserDeath = this.crashDeathType === 'chaser';
      const camDamp = isChaserDeath ? 8.0 : 5.0;
      const crashCamX = THREE.MathUtils.clamp(
        this.playerX + sideSign * (isChaserDeath ? 1.65 : 1.55),
        -3.5,
        3.5,
      );
      const crashCamY = crashFloorY + (isChaserDeath ? 2.38 : 2.35);
      const crashCamZ = isChaserDeath ? 4.78 : 4.65;
      this.camera.position.x =
        THREE.MathUtils.damp(this.camera.position.x, crashCamX, camDamp, dt) + shakeX;
      this.camera.position.y =
        THREE.MathUtils.damp(this.camera.position.y, crashCamY, camDamp, dt) + shakeY;
      this.camera.position.z = THREE.MathUtils.damp(
        this.camera.position.z,
        crashCamZ,
        camDamp,
        dt,
      );
      const crashLookY =
        isChaserDeath && this.crashTimer < 0.65
          ? crashFloorY + 0.88
          : crashFloorY + (isChaserDeath ? 0.48 : 0.55);
      this.camera.lookAt(this.playerX, crashLookY, isChaserDeath ? 0.1 : -0.15);

      if (this.gameOverDelayTimer > 0) {
        this.gameOverDelayTimer -= dt;
        if (this.gameOverDelayTimer <= 0 && this.pendingGameOverSnap) {
          const snap = this.pendingGameOverSnap;
          this.pendingGameOverSnap = null;
          this.callbacks.onHudUpdate(snap);
          this.callbacks.onGameOver(snap);
          this.flushPendingBackgroundWork();
        }
      }
      return;
    }

    // --- Playing State (Frame-rate independent sub-stepped simulation for 60 / 120 / 240+ FPS parity) ---
    const subSteps = Math.min(3, Math.max(1, Math.ceil(dt / MAX_SIM_STEP)));
    const subDt = dt / subSteps;
    const prevFrameX = this.playerX;
    let frameDz = 0;

    for (let step = 0; step < subSteps; step++) {
      const turboBoost = this.turboTimer > 0 ? 1.4 : this.wingsTimer > 0 ? 1.25 : 1.0;
      const baseTargetSpeed = this.getTargetRunSpeed(this.distance);
      this.speed = THREE.MathUtils.damp(
        this.speed,
        baseTargetSpeed * turboBoost,
        5,
        subDt,
      );

      const dz = this.speed * subDt;
      frameDz += dz;
      this.distance += dz;
      this.metrics.distance = Math.floor(this.distance);
      this.metrics.coins = this.runCoins;

      if (this.comboTimer > 0) {
        this.comboTimer = Math.max(0, this.comboTimer - subDt);
        if (this.comboTimer <= 0) this.combo = 1;
      }

      const activeMult =
        (this.flashlightTimer > 0 ? 2 : 1) *
        (this.turboTimer > 0 ? 2 : 1) *
        this.bonusMultiplier *
        (1 + (this.combo - 1) * 0.25);
      this.score += dz * 1.4 * activeMult;

      // 3D "REKOR" Finish Gate once surpassing previous high score (>= 100)
      if (
        this.highScore >= 100 &&
        !this.isNewRecord &&
        this.score > this.highScore &&
        !this.recordGateActive
      ) {
        this.isNewRecord = true;
        this.recordGateActive = true;
        this.recordGateZ = -58;
        const gateY = this.getWorldGroundY(this.distance + 58);
        this.recordGateMesh.position.set(0, gateY, this.recordGateZ);
        this.recordGateMesh.visible = true;
        gameAudio.playNewRecord();
      }
      if (this.recordGateActive) {
        this.recordGateZ += dz;
        this.recordGateMesh.position.z = this.recordGateZ;
        if (!this.recordGatePassed && this.recordGateZ >= 0) {
          this.recordGatePassed = true;
          this.spawnBurst(0, 3.2, -1, 0xfbbf24, 18, 6.2);
          this.spawnBurst(this.playerX, this.playerY + 1.4, 0, 0x38bdf8, 12, 5.2);
        }
        if (this.recordGateZ > 15) {
          this.recordGateMesh.visible = false;
          this.recordGateActive = false;
        }
      }

      // Dynamic Full-World Biome Transitions every exact 1,000m
      const nextZoneIdx = this.getZoneIndexForWorldDist(this.distance);
      if (nextZoneIdx !== this.zoneIndex) {
        const prevZone = ZONES[this.zoneIndex];
        this.zoneIndex = nextZoneIdx;
        const newZone = ZONES[this.zoneIndex];
        if (!this.metrics.zonesReached.includes(newZone.id)) {
          this.metrics.zonesReached.push(newZone.id);
        }
        const usesMist =
          prevZone.id !== 'yeralti_magarasi' && newZone.id !== 'yeralti_magarasi';
        if (usesMist) {
          this.biomeRevealTimer = TRANSITION_OUT_SECONDS;
        }
        gameAudio.setZoneAmbience(newZone.ambienceType);
        gameAudio.playZoneTransition();
        gameAudio.playZoneAnnouncement(newZone.id);
        this.callbacks.onZoneChange(newZone);
        this.applyZoneVisuals(newZone, false);

        if (newZone.id === 'yeralti_magarasi') this.triggerDialogue('earth_zone');
        else if (newZone.id === 'buzul_dunyasi') this.triggerDialogue('ice_zone');
        else if (newZone.id === 'ates_diyari') this.triggerDialogue('fire_zone');
        else if (newZone.id === 'dev_mutfak') this.triggerDialogue('kitchen_zone');
        else if (newZone.id === 'kopuklu_banyo') this.triggerDialogue('bath_zone');
        else if (newZone.id === 'cilgin_lab') this.triggerDialogue('lab_zone');
        else if (newZone.id === 'peynir_galaksisi') this.triggerDialogue('space_zone');
        else if (newZone.id === 'mahalle_caddesi') this.triggerDialogue('street_zone');
      }

      if (this.biomeRevealTimer > 0) {
        this.biomeRevealTimer = Math.max(0, this.biomeRevealTimer - subDt);
      }
      if (this.magnetTimer > 0) this.magnetTimer = Math.max(0, this.magnetTimer - subDt);
      if (this.flashlightTimer > 0) {
        this.flashlightTimer = Math.max(0, this.flashlightTimer - subDt);
      }
      if (this.turboTimer > 0) this.turboTimer = Math.max(0, this.turboTimer - subDt);

      const remainingToTransition = this.getRemainingDistToTransition(this.distance);
      const wasFlying = this.wingsTimer > 0;
      if (this.wingsTimer > 0) {
        if (remainingToTransition <= 52) {
          this.wingsTimer = 0;
        } else {
          this.wingsTimer = Math.max(0, this.wingsTimer - subDt);
        }
        if (this.wingsTimer <= 0 && wasFlying) {
          this.invulnTimer = Math.max(this.invulnTimer, 1.8);
          this.lastJetpackSpawnDist = Math.max(
            this.lastJetpackSpawnDist,
            this.distance - 140,
          );
          for (let i = this.coins.length - 1; i >= 0; i--) {
            if (this.coins[i].isSkyCoin && this.coins[i].z < -6) {
              this.releaseCoin(this.coins[i]);
              this.coins.splice(i, 1);
            }
          }
          for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            if (p.localY !== undefined && p.z < -6) {
              this.releasePowerup(p);
              this.powerups.splice(i, 1);
            }
          }
        }
      }

      if (this.stumbleTimer > 0) {
        this.stumbleTimer = Math.max(0, this.stumbleTimer - subDt);
      }
      if (this.introChaseTimer > 0) {
        this.introChaseTimer = Math.max(0, this.introChaseTimer - subDt);
      }
      if (this.springSafeTimer > 0) {
        this.springSafeTimer = Math.max(0, this.springSafeTimer - subDt);
      }
      if (this.springArcPullTimer > 0) {
        this.springArcPullTimer = Math.max(0, this.springArcPullTimer - subDt);
      }
      if (this.invulnTimer > 0) {
        this.invulnTimer = Math.max(0, this.invulnTimer - subDt);
      }

      const prevSubX = this.playerX;
      if (this.laneSwitchActive) {
        this.laneSwitchElapsed += subDt;
        const u = Math.min(1, this.laneSwitchElapsed / this.laneSwitchDuration);
        const u2 = u * u;
        const u3 = u2 * u;
        const h00 = 2 * u3 - 3 * u2 + 1;
        const h10 = u3 - 2 * u2 + u;
        const h01 = -2 * u3 + 3 * u2;
        this.playerX =
          h00 * this.laneSwitchFromX +
          h10 * this.laneSwitchM0 +
          h01 * this.laneSwitchToX;

        const dh00 = 6 * u2 - 6 * u;
        const dh10 = 3 * u2 - 4 * u + 1;
        const dh01 = -6 * u2 + 6 * u;
        this.playerVelX =
          (dh00 * this.laneSwitchFromX +
            dh10 * this.laneSwitchM0 +
            dh01 * this.laneSwitchToX) /
          this.laneSwitchDuration;

        // Slightly front-loaded bell arc for athletic launch & crisp settle
        this.laneDodgeArc = Math.sin(Math.PI * Math.pow(u, 0.85));

        if (u >= 1) {
          this.playerX = this.laneSwitchToX;
          this.playerVelX = 0;
          this.laneSwitchActive = false;
          this.laneDodgeArc = 0;
          this.laneSettleTimer = 0.14;
          this.laneSettleDir = this.laneSwitchDir;
          this.laneSwitchDir = 0;
          this.prevSafeLane = this.targetLane;
        }
      } else {
        const targetX = LANE_X[this.targetLane];
        this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 24, subDt);
        this.playerVelX = (this.playerX - prevSubX) / Math.max(subDt, 0.0001);
        this.laneDodgeArc = 0;
        if (this.laneSettleTimer > 0) {
          this.laneSettleTimer = Math.max(0, this.laneSettleTimer - subDt);
        }
      }
      if (this.dodgeAnimTimer > 0) {
        this.dodgeAnimTimer = Math.max(0, this.dodgeAnimTimer - subDt);
        if (this.dodgeAnimTimer <= 0) {
          this.dodgeAnimDir = 0;
        }
      }
      if (Math.abs(this.playerX - LANE_X[this.targetLane]) < 0.12) {
        this.prevSafeLane = this.targetLane;
      }

      const stepZone = ZONES[this.zoneIndex];
      const stepFlying = this.wingsTimer > 0;
      const recycleThreshold = SEGMENT_LENGTH;
      const totalLength = SEGMENT_LENGTH * SEGMENT_COUNT;
      const cutoffZ = this.getEffectiveQualityProfile().segmentCutoffZ;
      for (const seg of this.segments) {
        seg.group.position.z += dz;
        if (seg.group.position.z > recycleThreshold) {
          seg.group.position.z -= totalLength;
          this.updateSegmentBiome(
            seg,
            this.distance - seg.group.position.z,
            stepZone.buildingTint,
          );
        }
        seg.group.visible = seg.biomeVisible && seg.group.position.z >= cutoffZ;
        seg.skywayGroup.visible =
          stepFlying && seg.group.visible && seg.activeZoneId !== 'yeralti_magarasi';
      }

      this.nextSpawnZ += dz;
      while (this.nextSpawnZ > -150) {
        const gap = this.spawnPattern(this.nextSpawnZ - 20);
        this.nextSpawnZ -= gap;
      }

      if (this.wingsTimer > 1.7) {
        this.nextFlightCoinZ += dz;
        while (this.nextFlightCoinZ > -74) {
          const ribbonWorldDist = this.distance + Math.max(0, -this.nextFlightCoinZ);
          if (this.getRemainingDistToTransition(ribbonWorldDist) <= 62) {
            this.nextFlightCoinZ -= 20;
            break;
          }
          const gap = this.spawnSkyFlightFormation(this.nextFlightCoinZ);
          this.nextFlightCoinZ -= gap;
        }
      }

      this.nextTrafficWaveZ += dz;
      const waveSpawnZ = -162;
      const waveWorldDist = this.distance - waveSpawnZ;
      const waveZone = ZONES[this.getZoneIndexForWorldDist(waveWorldDist)];
      const waveDistInZone = waveWorldDist % ZONE_DISTANCE;
      const waveInZoneSafe =
        waveZone.id === 'yeralti_magarasi'
          ? this.isCaveMovingTrainSpawnSafe(waveSpawnZ)
          : waveZone.id === 'mahalle_caddesi' &&
            waveDistInZone >= 24 &&
            waveDistInZone <= ZONE_DISTANCE - 95;
      if (
        waveInZoneSafe &&
        this.reservedMovingLane === null &&
        this.distance > 22 &&
        this.nextTrafficWaveZ > -112
      ) {
        const spawned =
          waveZone.id === 'yeralti_magarasi'
            ? this.spawnCaveTrainWave(waveSpawnZ)
            : this.spawnTrafficRushWave(waveSpawnZ);
        this.nextTrafficWaveZ = spawned
          ? (waveZone.id === 'yeralti_magarasi' ? -112 : -104) - Math.random() * 22
          : -118;
      }

      const stepFloorY = this.getWorldGroundY(this.distance);
      let groundHeight = stepFloorY;
      const stepChaserActive =
        !stepFlying &&
        Boolean(this.chaserGlb) &&
        (this.stumbleTimer > 0 || this.introChaseTimer > 0);
      const chaserX = this.chaserGlb ? this.chaserGlb.root.position.x : this.playerX;
      const chaserZ = this.chaserGlb ? this.chaserGlb.root.position.z : 1.42;
      const chaserInChaseSpot =
        stepChaserActive &&
        chaserZ <= 2.5 &&
        (this.stumbleTimer >= 1.1 || (this.stumbleTimer <= 0 && this.introChaseTimer >= 1.2));
      let chaserGround = stepChaserActive
        ? this.getWorldGroundY(Math.max(0, this.distance - chaserZ))
        : stepFloorY;
      let chaserObstacleAhead = false;
      const movingVehicles: ActiveObstacle[] = [];

      for (let i = 0; i < this.obstacles.length; i++) {
        const obs = this.obstacles[i];
        if (isMovingObstacleKind(obs.kind)) {
          movingVehicles.push(obs);
          continue;
        }
        obs.z += dz;
        obs.mesh.position.z = obs.z;

        if (
          obs.kind === 'tire' ||
          obs.kind === 'snow_ball' ||
          obs.kind === 'fire_barrel' ||
          obs.kind === 'rolling_pin' ||
          obs.kind === 'tomato_ball' ||
          obs.kind === 'tp_roll' ||
          obs.kind === 'space_meteor'
        ) {
          const spinTarget =
            (obs.mesh.userData.spinPivot as THREE.Object3D | undefined) ?? obs.mesh;
          spinTarget.rotation.x += subDt * 4.5;
        } else if (obs.kind === 'bus_ramp' || obs.kind === 'terrain_ramp') {
          const obsX = obs.visualX ?? LANE_X[obs.lane];
          const laneDist = Math.abs(this.playerX - obsX);
          const localZ = -obs.z;
          const isCaveRamp = obs.poolKey === 'terrain_ramp_yeralti_magarasi';
          const roofY = this.getObstacleRoofY(obs);
          const frontZ = isCaveRamp ? 3.15 : 3.95;
          const slopeTopZ = isCaveRamp ? -2.2 : 1.4;
          const rampRun = isCaveRamp ? 5.35 : 2.55;
          const backZ = isCaveRamp ? -2.82 : -3.65;
          const laneReach = isCaveRamp ? 1.16 : 1.08;
          if (laneDist < laneReach && localZ >= backZ && localZ <= frontZ + 0.05) {
            const surfaceY =
              obs.baseY +
              (localZ >= slopeTopZ
                ? THREE.MathUtils.clamp((frontZ - localZ) / rampRun, 0, 1) * roofY
                : roofY);
            const isOnFrontSlope = localZ >= slopeTopZ - 0.1;
            if (isOnFrontSlope || this.playerY >= surfaceY - 0.92) {
              groundHeight = Math.max(groundHeight, surfaceY);
              if (localZ < slopeTopZ && !obs.roofCredited) {
                obs.roofCredited = true;
                this.bumpCombo(30);
              }
            }
          }
          if (stepChaserActive) {
            const chaserLaneDist = Math.abs(chaserX - obsX);
            const chaserLocalZ = chaserZ - obs.z;
            if (
              chaserLaneDist < laneReach &&
              chaserLocalZ >= backZ &&
              chaserLocalZ <= frontZ + 0.05
            ) {
              const chaserSurfaceY =
                obs.baseY +
                (chaserLocalZ >= slopeTopZ
                  ? THREE.MathUtils.clamp((frontZ - chaserLocalZ) / rampRun, 0, 1) * roofY
                  : roofY);
              if (chaserLocalZ >= slopeTopZ - 0.2 || this.chaserY >= chaserSurfaceY - 0.95) {
                chaserGround = Math.max(chaserGround, chaserSurfaceY);
              }
            }
          }
        } else if (obs.kind === 'parked_train') {
          const obsX = obs.visualX ?? LANE_X[obs.lane];
          const laneDist = Math.abs(this.playerX - obsX);
          const surfaceY = obs.baseY + CAVE_TRAIN_ROOF_Y;
          // Subway Surfers rule: normal ground jump (2.96m) cannot reach 3.45m train roof (-0.22 -> 3.23m catch);
          // only ramps, super springs, Jetpack descent, or another train roof can mount!
          if (
            laneDist < 1.16 &&
            Math.abs(obs.z) <= obs.halfDepth + 0.35 &&
            this.playerY >= surfaceY - 0.22
          ) {
            groundHeight = Math.max(groundHeight, surfaceY);
            if (!obs.roofCredited) {
              obs.roofCredited = true;
              this.bumpCombo(35);
            }
          }
          if (stepChaserActive) {
            const chaserLaneDist = Math.abs(chaserX - obsX);
            if (
              chaserLaneDist < 1.16 &&
              Math.abs(chaserZ - obs.z) <= obs.halfDepth + 0.35 &&
              this.chaserY >= surfaceY - 0.24
            ) {
              chaserGround = Math.max(chaserGround, surfaceY);
            }
          }
        }

        if (
          chaserInChaseSpot &&
          obs.kind !== 'bus_ramp' &&
          obs.kind !== 'terrain_ramp' &&
          obs.kind !== 'spring_pad' &&
          obs.minY < 0.85 &&
          obs.height <= 1.65
        ) {
          const obsX = obs.visualX ?? LANE_X[obs.lane];
          if (
            Math.abs(obsX - chaserX) < 0.72 &&
            obs.z >= chaserZ - 2.15 - obs.halfDepth &&
            obs.z <= chaserZ - 0.1 &&
            chaserGround <= obs.baseY + 0.35
          ) {
            chaserObstacleAhead = true;
          }
        }
      }

      // Process moving vehicles front-to-back (largest z first), strictly straight in their assigned lane
      // with smooth bumper-to-bumper safety clamping so zero clipping ever occurs.
      if (movingVehicles.length > 1) {
        movingVehicles.sort((a, b) => b.z - a.z);
      }
      for (let v = 0; v < movingVehicles.length; v++) {
        const obs = movingVehicles[v];
        const laneX = LANE_X[obs.lane];
        const baseCruiseSpeed = obs.kind === 'moving_train' ? 16.2 : 14.0;
        let vSpeed = obs.trafficSpeed ?? baseCruiseSpeed;

        let trainTouchingDescentRamp = false;
        if (obs.kind === 'moving_train') {
          const trainFrontWorldDist = this.distance - (obs.z + obs.halfDepth + 3.0);
          if (
            obs.z < -obs.halfDepth &&
            this.getWorldGroundY(trainFrontWorldDist) > obs.baseY + 0.15
          ) {
            trainTouchingDescentRamp = true;
          }
          const surfaceY = obs.baseY + CAVE_TRAIN_ROOF_Y;
          if (
            Math.abs(this.playerX - laneX) < 1.16 &&
            Math.abs(obs.z) <= obs.halfDepth + 0.35 &&
            this.playerY >= surfaceY - 0.22
          ) {
            groundHeight = Math.max(groundHeight, surfaceY);
            if (!obs.roofCredited) {
              obs.roofCredited = true;
              this.bumpCombo(45);
            }
          }
        }

        let blocker: ActiveObstacle | null = null;
        for (let j = 0; j < this.obstacles.length; j++) {
          const other = this.obstacles[j];
          if (other.id === obs.id || other.lane !== obs.lane) continue;
          if (
            other.z + other.halfDepth > obs.z + obs.halfDepth &&
            (!blocker || other.z < blocker.z)
          ) {
            blocker = other;
          }
        }

        let desiredSpeed = trainTouchingDescentRamp ? 0 : baseCruiseSpeed;
        let blockerSpeed = 0;
        if (blocker) {
          const gap = blocker.z - blocker.halfDepth - (obs.z + obs.halfDepth);
          blockerSpeed = isMovingObstacleKind(blocker.kind)
            ? (blocker.trafficSpeed ?? 14.0)
            : 0;
          const safeGap = 2.8;
          const brakeDist = 16.0;
          if (gap <= safeGap) {
            desiredSpeed = Math.min(desiredSpeed, blockerSpeed);
          } else if (gap < brakeDist) {
            const ratio = (gap - safeGap) / (brakeDist - safeGap);
            desiredSpeed = Math.min(
              desiredSpeed,
              blockerSpeed + (baseCruiseSpeed - blockerSpeed) * (ratio * ratio),
            );
          }
        }

        const aheadWorldDist = this.distance - (obs.z + obs.halfDepth + 3.0);
        if (
          obs.z < 0 &&
          Math.abs(this.getWorldGroundY(aheadWorldDist) - obs.baseY) > 0.15
        ) {
          desiredSpeed = 0;
        }

        const accelRate = desiredSpeed < vSpeed ? 15 : 5;
        vSpeed = THREE.MathUtils.damp(vSpeed, desiredSpeed, accelRate, subDt);
        obs.z += dz + vSpeed * subDt;

        if (blocker) {
          const maxAllowedZ = blocker.z - blocker.halfDepth - 2.6 - obs.halfDepth;
          if (obs.z > maxAllowedZ) {
            obs.z = maxAllowedZ;
            vSpeed = Math.min(vSpeed, blockerSpeed);
          }
        }
        obs.trafficSpeed = vSpeed;
        obs.visualX = laneX;
        obs.mesh.position.set(laneX, obs.baseY, obs.z);
        obs.mesh.rotation.y = 0;

        const wheels = obs.mesh.userData.wheels as THREE.Mesh[] | undefined;
        if (wheels) {
          const spin = ((this.speed + vSpeed) * subDt) / 0.32;
          for (let w = 0; w < wheels.length; w++) {
            wheels[w].rotation.x += spin;
          }
        }
        const hoverMesh = obs.mesh.userData.hoverMesh as THREE.Object3D | undefined;
        if (hoverMesh) {
          hoverMesh.position.y = Math.sin(t * 7.0 + obs.id) * 0.06;
        }
        const trainHull = obs.mesh.userData.trainHull as THREE.Object3D | undefined;
        if (trainHull) {
          const railClatter = vSpeed > 0.5 ? Math.sin(t * 24.0 + obs.id) * 0.008 : 0;
          trainHull.position.y = railClatter;
          trainHull.rotation.z = railClatter * 0.45;
        }
        const headlightRig = obs.mesh.userData.headlightRig as THREE.Object3D | undefined;
        if (headlightRig) {
          const beamPulse = 0.96 + Math.sin(t * 9.0 + obs.id) * 0.05;
          headlightRig.scale.set(beamPulse, 1, beamPulse);
        }
      }
      this.currentGroundY = groundHeight;

      if (this.jumpBufferTimer > 0) {
        this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - subDt);
      }
      if (this.rollBufferTimer > 0) {
        this.rollBufferTimer = Math.max(0, this.rollBufferTimer - subDt);
      }
      if (this.longJumpSpinTimer > 0) {
        this.longJumpSpinTimer = Math.max(0, this.longJumpSpinTimer - subDt);
      }

      if (this.wingsTimer > 0) {
        const hoverOffset = this.getFlightHoverOffset(this.distance);
        this.playerY = THREE.MathUtils.damp(
          this.playerY,
          stepFloorY + hoverOffset + Math.sin(t * 4.0) * 0.2,
          6.0,
          subDt,
        );
        this.velY = 0;
        this.isGrounded = false;
        this.rollTimer = 0;
      } else if (!this.isGrounded || this.playerY > this.currentGroundY + 0.04) {
        // Exact Velocity-Verlet integration so jump apex and arc are identical at 60/120/240+ FPS
        const prevVelY = this.velY;
        this.velY -= 40 * subDt;
        this.playerY += 0.5 * (prevVelY + this.velY) * subDt;
        if (this.playerY <= this.currentGroundY) {
          this.playerY = this.currentGroundY;
          this.velY = 0;
          this.isGrounded = true;
          this.longJumpSpinTimer = 0;
          this.landSquashTimer = 0.09;
          this.spawnBurst(this.playerX, this.playerY + 0.15, 0.1, 0xe2e8f0, 5, 2.5);
          if (this.rollBufferTimer > 0) {
            this.executeRoll();
          } else if (this.jumpBufferTimer > 0) {
            this.executeJump();
          }
        }
      } else {
        this.playerY = this.currentGroundY;
        this.isGrounded = true;
      }

      if (this.landSquashTimer > 0) {
        this.landSquashTimer = Math.max(0, this.landSquashTimer - subDt);
      }
      if (this.rollTimer > 0) {
        this.rollTimer = Math.max(0, this.rollTimer - subDt);
      }

      // Subway Surfers chaser vertical kinematics (ramps, synced jumps, and hurdle vaulting)
      this.chaserGroundY = chaserGround;
      if (this.chaserJumpCooldown > 0) {
        this.chaserJumpCooldown = Math.max(0, this.chaserJumpCooldown - subDt);
      }
      if (stepChaserActive) {
        if (chaserInChaseSpot) {
          for (let v = 0; v < movingVehicles.length; v++) {
            const obs = movingVehicles[v];
            if (obs.height > 1.65) continue;
            const obsX = obs.visualX ?? LANE_X[obs.lane];
            if (
              Math.abs(obsX - chaserX) < 0.72 &&
              obs.z >= chaserZ - 2.15 - obs.halfDepth &&
              obs.z <= chaserZ - 0.1 &&
              chaserGround <= obs.baseY + 0.35
            ) {
              chaserObstacleAhead = true;
              break;
            }
          }
        }
        if (
          this.chaserGrounded &&
          this.chaserJumpCooldown <= 0 &&
          chaserObstacleAhead
        ) {
          this.chaserVelY = 14.8;
          this.chaserGrounded = false;
          this.chaserJumpCooldown = 0.55;
          this.chaserJustJumped = true;
        }
        if (!this.chaserGrounded || this.chaserY > this.chaserGroundY + 0.04) {
          const prevChaserVelY = this.chaserVelY;
          this.chaserVelY -= 40 * subDt;
          this.chaserY += 0.5 * (prevChaserVelY + this.chaserVelY) * subDt;
          if (this.chaserY <= this.chaserGroundY) {
            this.chaserY = this.chaserGroundY;
            this.chaserVelY = 0;
            this.chaserGrounded = true;
          }
        } else {
          this.chaserY = this.chaserGroundY;
          this.chaserGrounded = true;
        }
      } else {
        this.chaserY = stepFloorY;
        this.chaserGroundY = stepFloorY;
        this.chaserVelY = 0;
        this.chaserGrounded = true;
        this.chaserJumpCooldown = 0;
        this.chaserJustJumped = false;
      }

      const stepRolling = this.rollTimer > 0 && this.isGrounded;
      const playerBottom = this.playerY;
      const playerTop = this.playerY + (stepRolling ? 0.95 : 1.9);

      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        const inZRange = Math.abs(obs.z) < obs.halfDepth + 0.24;
        const obsX = obs.visualX ?? LANE_X[obs.lane];
        const laneDist = Math.abs(this.playerX - obsX);

        if (obs.kind === 'spring_pad') {
          if (
            !obs.impactDone &&
            Math.abs(obs.z) < 1.35 &&
            laneDist < 1.05 &&
            playerBottom < obs.baseY + 1.35
          ) {
            obs.impactDone = true;
            this.velY = 20.2;
            this.isGrounded = false;
            this.rollTimer = 0;
            this.longJumpSpinTimer = 0.98;
            this.springArcPullTimer = 1.25;
            this.springSafeTimer = 1.5;
            gameAudio.playSpringLaunch();
            gameAudio.playSpringVoice();
            this.bumpCombo(40);
            this.spawnBurst(this.playerX, this.playerY + 0.4, 0, 0x38bdf8, 12, 4.5);
          }
        } else if (obs.kind === 'bus_ramp' || obs.kind === 'terrain_ramp') {
          const localZ = -obs.z;
          const prevLaneDist = Math.abs(prevSubX - obsX);
          const isCaveRamp = obs.poolKey === 'terrain_ramp_yeralti_magarasi';
          const roofY = this.getObstacleRoofY(obs);
          const hitMinZ = isCaveRamp ? -2.72 : -3.4;
          const hitMaxZ = isCaveRamp ? 1.05 : 1.25;
          const hitHalfW = isCaveRamp ? 0.9 : 0.86;
          if (laneDist < hitHalfW && localZ >= hitMinZ && localZ < hitMaxZ) {
            const surfaceY =
              obs.baseY +
              (isCaveRamp
                ? localZ >= -2.2
                  ? THREE.MathUtils.clamp((3.15 - localZ) / 5.35, 0, 1) * roofY
                  : roofY
                : roofY);
            if (
              playerBottom < surfaceY - 0.92 &&
              this.invulnTimer <= 0 &&
              this.springSafeTimer <= 0 &&
              this.turboTimer <= 0 &&
              this.wingsTimer <= 0
            ) {
              if (this.hasShield) {
                this.breakShield(obs, i);
                continue;
              }
              const isSideHit =
                localZ < (isCaveRamp ? 0.9 : 1.1) &&
                (prevLaneDist >= (isCaveRamp ? 0.88 : 0.84) ||
                  this.prevSafeLane !== obs.lane);
              if (isSideHit) {
                const sideDir = prevSubX < obsX ? -1 : 1;
                if (this.stumbleTimer <= 0) {
                  this.triggerSideStumble(obsX, obs.lane, sideDir);
                  continue;
                }
                this.handleCrash(obs.kind, 'chaser', obs, sideDir);
                return;
              }
              this.handleCrash(obs.kind, this.stumbleTimer > 0 ? 'chaser' : 'obstacle', obs, 0);
              return;
            }
          }
        } else if (inZRange && laneDist < (obs.halfWidth ?? 0.82)) {
          const isTrainKind =
            obs.kind === 'moving_train' || obs.kind === 'parked_train';
          let yOverlap = false;
          if (isTrainKind && playerBottom >= obs.baseY + CAVE_TRAIN_ROOF_Y - 0.22) {
            yOverlap = false;
          } else if (obs.subBoxes && obs.subBoxes.length > 0) {
            const localZ = -obs.z;
            for (let sb = 0; sb < obs.subBoxes.length; sb++) {
              const box = obs.subBoxes[sb];
              const boxW = box.halfWidth ?? obs.halfWidth ?? 0.82;
              if (
                laneDist < boxW &&
                localZ >= box.minZ - 0.24 &&
                localZ <= box.maxZ + 0.24 &&
                playerBottom < obs.baseY + box.height &&
                playerTop > obs.baseY + box.minY
              ) {
                yOverlap = true;
                break;
              }
            }
          } else {
            yOverlap =
              playerBottom < obs.baseY + obs.height && playerTop > obs.baseY + obs.minY;
          }

          if (
            yOverlap &&
            this.invulnTimer <= 0 &&
            this.springSafeTimer <= 0 &&
            this.turboTimer <= 0 &&
            this.wingsTimer <= 0
          ) {
            if (this.hasShield) {
              this.breakShield(obs, i);
              continue;
            }
            const prevLaneDist = Math.abs(prevSubX - obsX);
            const isSmallStumbleProp =
              obs.kind === 'cone' ||
              obs.kind === 'tire' ||
              obs.kind === 'mushroom_cluster' ||
              obs.kind === 'snow_ball' ||
              obs.kind === 'fire_barrel' ||
              obs.kind === 'rolling_pin' ||
              obs.kind === 'tomato_ball' ||
              obs.kind === 'tp_roll' ||
              obs.kind === 'jelly_cube' ||
              obs.kind === 'space_meteor';

            if (isSmallStumbleProp) {
              const sideDir = prevLaneDist >= 0.78 ? (prevSubX < obsX ? -1 : 1) : 0;
              if (this.stumbleTimer <= 0) {
                this.stumbleTimer = 5.5;
                this.invulnTimer = 0.85;
                this.cameraShake = 0.42;
                this.combo = 1;
                this.comboTimer = 0;
                gameAudio.playStumble();
                gameAudio.playStumbleVoice();
                this.spawnBurst(this.playerX, this.playerY + 0.6, 0, 0xf97316, 10, 4.0);
                const targetX = THREE.MathUtils.clamp(this.playerX + 0.56, -3.05, 3.05);
                this.activateChaserOnStumble(targetX);
                this.releaseObstacle(obs);
                this.obstacles.splice(i, 1);
                continue;
              }
              this.handleCrash(obs.kind, 'chaser', obs, sideDir);
              return;
            }

            const isSideSwipe =
              prevLaneDist >= 0.78 && obs.z + obs.halfDepth > 0.22;
            if (isSideSwipe) {
              const sideDir = prevSubX < obsX ? -1 : 1;
              if (this.stumbleTimer <= 0) {
                this.triggerSideStumble(obsX, obs.lane, sideDir);
                continue;
              }
              this.handleCrash(obs.kind, 'chaser', obs, sideDir);
              return;
            }

            this.handleCrash(obs.kind, this.stumbleTimer > 0 ? 'chaser' : 'obstacle', obs, 0);
            return;
          }
        } else if (
          !obs.nearMissAwarded &&
          obs.z > 0.7 &&
          obs.z < 2.2 &&
          laneDist < 1.35 &&
          this.wingsTimer <= 0
        ) {
          obs.nearMissAwarded = true;
          this.metrics.nearMisses += 1;
          this.bumpCombo(25);
          if (Math.random() < 0.45) {
            gameAudio.playNearMissVoice();
          }
          if (Math.random() < 0.25) {
            this.triggerDialogue('near_miss');
          }
        }

        if (obs.z > Math.max(12, obs.halfDepth + 8)) {
          this.releaseObstacle(obs);
          this.obstacles.splice(i, 1);
        }
      }

      // Simit coins
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i];
        coin.z += dz;
        coin.mesh.rotation.y += subDt * 3.5;

        const isSpringArcPull =
          this.springArcPullTimer > 0 &&
          !coin.isSkyCoin &&
          coin.localY > 0.9 &&
          coin.z > -5.5 &&
          coin.z < 3.5 &&
          Math.abs(coin.mesh.position.x - this.playerX) < 2.4;

        const magnetMatchesLayer =
          this.magnetTimer > 0 &&
          coin.z > -22 &&
          coin.z < 4 &&
          (stepFlying ? Boolean(coin.isSkyCoin) : !coin.isSkyCoin);

        if (magnetMatchesLayer || isSpringArcPull) {
          _vec3A.set(this.playerX, this.playerY + 0.85, 0);
          coin.mesh.position.lerp(
            _vec3A,
            1 - Math.exp(-(isSpringArcPull ? 18 : 12) * subDt),
          );
          coin.z = coin.mesh.position.z;
        } else {
          coin.mesh.position.z = coin.z;
        }

        const dx = coin.mesh.position.x - this.playerX;
        const dy = coin.mesh.position.y + 0.45 - (this.playerY + 0.85);
        const cz = coin.mesh.position.z;
        const distSq = dx * dx + dy * dy + cz * cz;

        const pickupThreshold = stepFlying ? 4.2 : !this.isGrounded ? 3.4 : 1.95;
        if (distSq < pickupThreshold) {
          this.runCoins += 1;
          this.score += 10 * this.combo;
          gameAudio.playCoin();
          this.spawnBurst(
            coin.mesh.position.x,
            coin.mesh.position.y + 0.35,
            coin.mesh.position.z,
            0xfbbf24,
            6,
            3.4,
          );
          this.releaseCoin(coin);
          this.coins.splice(i, 1);
          continue;
        }

        if (coin.z > 8) {
          this.releaseCoin(coin);
          this.coins.splice(i, 1);
        }
      }

      // Powerups
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const p = this.powerups[i];
        p.z += dz;
        p.mesh.position.z = p.z;
        p.mesh.rotation.y += subDt * 2.5;
        p.mesh.position.y = p.baseY + Math.sin(t * 4 + i) * 0.15;

        if (
          Math.abs(p.z) < 1.35 &&
          Math.abs(LANE_X[p.lane] - this.playerX) < 1.25 &&
          Math.abs(p.baseY - this.playerY) < 2.4
        ) {
          this.activatePowerup(p.type);
          this.releasePowerup(p);
          this.powerups.splice(i, 1);
          continue;
        }

        if (p.z > 8) {
          this.releasePowerup(p);
          this.powerups.splice(i, 1);
        }
      }
    }

    // --- Per-Render-Frame Visual Updates (Smooth 60 / 120 / 240+ FPS) ---
    const currentZone = ZONES[this.zoneIndex];
    const earthNow = this.getEarthWindowForWorldDist(this.distance);
    const floorY = this.getWorldGroundY(this.distance);
    const currStage = Math.max(0, Math.floor(this.distance / ZONE_DISTANCE));
    const upcomingZone = this.getZoneConfigById(this.getZoneIdForStage(currStage + 1));
    const remainingToTransitionNow = this.getRemainingDistToTransition(this.distance);
    this.stepPlayingLookaheadPrewarm(upcomingZone.id, remainingToTransitionNow);
    const distInZone = this.distance % ZONE_DISTANCE;
    const isApproachingMistTransition =
      currentZone.id !== 'yeralti_magarasi' && upcomingZone.id !== 'yeralti_magarasi';
    const approachRatio = isApproachingMistTransition
      ? THREE.MathUtils.clamp(
          (distInZone - (ZONE_DISTANCE - TRANSITION_IN_METERS)) /
            TRANSITION_IN_METERS,
          0,
          1,
        )
      : 0;
    const approachSmooth = approachRatio * approachRatio * (3 - 2 * approachRatio);
    const revealRatio = this.biomeRevealTimer / TRANSITION_OUT_SECONDS;
    const revealSmooth = revealRatio * revealRatio * (3 - 2 * revealRatio);
    const rawMistEnvelope = Math.max(approachSmooth, revealSmooth);
    const isFlying = this.wingsTimer > 0;
    const mistEnvelope = isFlying ? rawMistEnvelope * 0.12 : rawMistEnvelope;

    if (this.scene.background instanceof THREE.Color) {
      if (isFlying && currentZone.id !== 'yeralti_magarasi') {
        _colorA.setHex(0x0284c7);
      } else {
        _colorA.setHex(
          approachRatio > 0.35 ? upcomingZone.fogColor : currentZone.skyColor,
        );
      }
      this.scene.background.lerp(_colorA, 1 - Math.exp(-3.6 * dt));
    }
    if (this.scene.fog instanceof THREE.Fog) {
      const stairTargetFog =
        earthNow && this.distance >= earthNow.stairStart
          ? this.getZoneConfigById(this.getZoneIdForStage(earthNow.stageIdx + 1)).fogColor
          : currentZone.fogColor;
      const targetFogHex =
        isFlying && currentZone.id !== 'yeralti_magarasi'
          ? 0x38bdf8
          : approachRatio > 0.25
            ? upcomingZone.fogColor
            : stairTargetFog;
      _colorA.setHex(targetFogHex);
      this.scene.fog.color.lerp(_colorA, 1 - Math.exp(-3.8 * dt));

      const profile = this.getEffectiveQualityProfile();
      const isCave = currentZone.id === 'yeralti_magarasi';
      const baseNear = isFlying
        ? profile.fogNear * 1.15
        : isCave
          ? profile.fogNear * 0.62
          : profile.fogNear;
      const baseFar = isFlying
        ? profile.fogFar * 1.1
        : isCave
          ? profile.fogFar * 0.65
          : profile.fogFar;
      this.scene.fog.near = baseNear + (14 - baseNear) * mistEnvelope;
      this.scene.fog.far = baseFar + (64 - baseFar) * mistEnvelope;
    }

    const effectiveLight =
      this.flashlightTimer > 0
        ? Math.max(currentZone.lightIntensity, 0.95)
        : currentZone.lightIntensity;
    this.dirLight.intensity = THREE.MathUtils.damp(
      this.dirLight.intensity,
      effectiveLight * 1.38,
      3.5,
      dt,
    );
    this.hemiLight.intensity = THREE.MathUtils.damp(
      this.hemiLight.intensity,
      effectiveLight * 0.9,
      3.5,
      dt,
    );
    const lightLerp = 1 - Math.exp(-3.2 * dt);
    const targetLightColors = ZONE_LIGHT_COLORS[currentZone.id];
    _colorA.setHex(targetLightColors.dir);
    this.dirLight.color.lerp(_colorA, lightLerp);
    _colorA.setHex(targetLightColors.hemiSky);
    this.hemiLight.color.lerp(_colorA, lightLerp);
    _colorA.setHex(targetLightColors.hemiGround);
    this.hemiLight.groundColor.lerp(_colorA, lightLerp);

    const lampActive = currentZone.isDark || this.flashlightTimer > 0;
    this.activeHeadlampMesh.visible = false;
    this.headlamp.intensity = THREE.MathUtils.damp(
      this.headlamp.intensity,
      lampActive ? 74 : 0,
      6,
      dt,
    );
    this.headlamp.visible = lampActive || this.headlamp.intensity > 0.05;

    const chaserActive = !isFlying && (this.stumbleTimer > 0 || this.introChaseTimer > 0);
    if (this.chaserGlb) {
      this.broomMesh.visible = false;
      if (chaserActive) {
        const wasVisible = this.chaserGlb.root.visible;
        this.chaserGlb.root.visible = true;
        const targetChaserX = THREE.MathUtils.clamp(
          this.playerX + 0.56,
          -3.05,
          3.05,
        );
        if (!wasVisible) {
          const spawnFloorY = this.getWorldGroundY(Math.max(0, this.distance - 8.2));
          this.chaserY = spawnFloorY;
          this.chaserGroundY = spawnFloorY;
          this.chaserVelY = 0;
          this.chaserGrounded = true;
          this.chaserJumpCooldown = 0;
          this.chaserJustJumped = false;
          this.chaserGlb.root.position.set(targetChaserX, spawnFloorY, 8.2);
          this.chaserGlb.root.rotation.set(0, -0.08, 0);
          this.chaserGlb.setState('run', 0.05, 1.32, true);
        }
        this.chaserGlb.root.position.x = THREE.MathUtils.damp(
          this.chaserGlb.root.position.x,
          targetChaserX,
          7.0,
          dt,
        );
        this.chaserGlb.root.position.y = this.chaserY;
        let targetChaserZ = 1.95 + Math.sin(t * 9) * 0.06;
        if (this.stumbleTimer > 0 && this.stumbleTimer < 1.1) {
          const dropRatio = 1 - this.stumbleTimer / 1.1;
          targetChaserZ = 1.95 + dropRatio * dropRatio * 7.5;
        } else if (
          this.stumbleTimer <= 0 &&
          this.introChaseTimer > 0 &&
          this.introChaseTimer < 1.2
        ) {
          // Smoothly fall back off-camera at the end of the opening Subway Surfers chase
          const dropRatio = 1 - this.introChaseTimer / 1.2;
          targetChaserZ = 1.95 + dropRatio * dropRatio * 7.5;
        }
        const isChaserRushingIn =
          this.chaserGlb.root.position.z > 2.35 &&
          (this.stumbleTimer >= 1.1 || (this.stumbleTimer <= 0 && this.introChaseTimer >= 1.2));
        this.chaserGlb.root.position.z = THREE.MathUtils.damp(
          this.chaserGlb.root.position.z,
          targetChaserZ,
          isChaserRushingIn ? 6.4 : 8.5,
          dt,
        );
        const aimYaw = THREE.MathUtils.clamp(
          (this.playerX - this.chaserGlb.root.position.x) * 0.28,
          -0.26,
          0.26,
        );
        this.chaserGlb.root.rotation.y = THREE.MathUtils.damp(
          this.chaserGlb.root.rotation.y,
          aimYaw,
          10,
          dt,
        );
        const chaserAirborne =
          !this.chaserGrounded || this.chaserY > this.chaserGroundY + 0.14;
        if (this.chaserJustJumped) {
          this.chaserJustJumped = false;
          this.chaserGlb.setState('jump', 0.07, 1.35, true);
        } else if (chaserAirborne) {
          this.chaserGlb.setState('jump', 0.08, 1.35);
        } else {
          const rushBoost = isChaserRushingIn ? 1.18 : 1.0;
          const chaserRate = THREE.MathUtils.clamp(
            (this.speed / BASE_SPEED) * rushBoost,
            1.08,
            1.72,
          );
          this.chaserGlb.setState('run', 0.1, chaserRate);
        }
        this.chaserShadow.visible = true;
        this.chaserShadow.position.set(
          this.chaserGlb.root.position.x,
          this.chaserGroundY + 0.02,
          this.chaserGlb.root.position.z,
        );
        this.chaserShadow.scale.setScalar(
          Math.max(0.35, 1 - Math.max(0, this.chaserY - this.chaserGroundY) * 0.12),
        );
        const chaserDist = Math.max(0, this.distance - this.chaserGlb.root.position.z);
        const chaserSlopeTan =
          this.chaserGrounded && this.chaserY <= this.getWorldGroundY(chaserDist) + 0.08
            ? (this.getWorldGroundY(chaserDist + 0.9) -
                this.getWorldGroundY(Math.max(0, chaserDist - 0.9))) /
              1.8
            : 0;
        this.chaserGlb.update(dt, {
          clampFloor: this.chaserGrounded,
          floorSlopeTan: chaserSlopeTan,
        });
      } else {
        this.chaserGlb.root.visible = false;
        this.chaserShadow.visible = false;
      }
    } else if (chaserActive) {
      this.chaserShadow.visible = false;
      const wasVisible = this.broomMesh.visible;
      this.broomMesh.visible = true;
      const targetChaserX = THREE.MathUtils.clamp(this.playerX + 0.56, -3.05, 3.05);
      if (!wasVisible) {
        const spawnFloorY = this.getWorldGroundY(Math.max(0, this.distance - 8.2));
        this.broomMesh.position.set(targetChaserX, spawnFloorY, 8.2);
      }
      let targetBroomZ = 2.45 + Math.sin(t * 14) * 0.14;
      if (this.stumbleTimer > 0 && this.stumbleTimer < 1.1) {
        const dropRatio = 1 - this.stumbleTimer / 1.1;
        targetBroomZ = 2.45 + dropRatio * dropRatio * 7.5;
      } else if (
        this.stumbleTimer <= 0 &&
        this.introChaseTimer > 0 &&
        this.introChaseTimer < 1.2
      ) {
        const dropRatio = 1 - this.introChaseTimer / 1.2;
        targetBroomZ = 2.45 + dropRatio * dropRatio * 7.5;
      }
      this.broomMesh.position.x = THREE.MathUtils.damp(
        this.broomMesh.position.x,
        targetChaserX,
        7.0,
        dt,
      );
      this.broomMesh.position.y = floorY;
      this.broomMesh.position.z = THREE.MathUtils.damp(
        this.broomMesh.position.z,
        targetBroomZ,
        this.broomMesh.position.z > 2.85 && this.stumbleTimer >= 1.1 ? 6.4 : 8.5,
        dt,
      );
      this.broomMesh.rotation.z = Math.sin(t * 12) * 0.14;
    } else {
      this.chaserShadow.visible = false;
      this.broomMesh.visible = false;
    }

    if (this.invulnTimer > 0) {
      this.activePlayerRoot.visible = Math.floor(this.invulnTimer * 14) % 2 === 0;
    } else {
      this.activePlayerRoot.visible = true;
    }
    this.activeShieldSphere.visible = this.hasShield || this.turboTimer > 0;

    const lateralVel = this.laneSwitchActive
      ? this.playerVelX
      : (this.playerX - prevFrameX) / Math.max(dt, 0.001);

    this.updateBiomeGroundPositions();
    if (
      this.transitionGateMesh &&
      this.transitionGateMesh.visible &&
      !this.transitionGateBurstDone &&
      this.transitionGateMesh.position.z >= 0
    ) {
      this.transitionGateBurstDone = true;
      this.spawnBurst(0, 3.0, -0.5, currentZone.lampColor, 14, 5.5);
    }
    for (const seg of this.segments) {
      if (!seg.group.visible) continue;
      if (seg.biomeGroups.mahalle_caddesi.visible) {
        for (const spec of seg.spectators) {
          spec.position.y =
            0.22 + Math.abs(Math.sin(t * 6 + seg.group.position.z)) * 0.22;
        }
      }
      const animProps = seg.activeBiomeGroup.userData.animatedProps as
        | Array<{
            obj: THREE.Object3D;
            kind: 'bob' | 'sway' | 'spin' | 'pulse';
            baseY: number;
            phase: number;
            amp: number;
            speed: number;
          }>
        | undefined;
      if (animProps && seg.activeBiomeGroup.visible) {
        for (let ap = 0; ap < animProps.length; ap++) {
          const p = animProps[ap];
          if (p.kind === 'bob') {
            p.obj.position.y = p.baseY + Math.sin(t * p.speed + p.phase) * p.amp;
          } else if (p.kind === 'sway') {
            p.obj.rotation.z = Math.sin(t * p.speed + p.phase) * p.amp;
          } else if (p.kind === 'spin') {
            p.obj.rotation.y = t * p.speed + p.phase;
          } else if (p.kind === 'pulse') {
            const s = 1 + Math.sin(t * p.speed + p.phase) * p.amp;
            p.obj.scale.setScalar(s);
          }
        }
      }
    }
    const isRolling = this.rollTimer > 0 && this.isGrounded;

    if (this.startTransitionTimer > 0) {
      this.startTransitionTimer = Math.max(0, this.startTransitionTimer - dt);
    }
    const startRatio = this.startTransitionTimer / 0.55;
    const startTurnYaw = startRatio * startRatio * (3 - 2 * startRatio) * Math.PI;

    const settlePhase =
      this.laneSettleTimer > 0
        ? Math.sin((1 - this.laneSettleTimer / 0.14) * Math.PI)
        : 0;
    const velNorm = THREE.MathUtils.clamp(lateralVel / 18, -1.1, 1.1);
    const activeSwitchBank = this.laneSwitchActive
      ? this.laneSwitchDir * (0.35 + 0.55 * this.laneDodgeArc)
      : velNorm;
    const targetBank =
      activeSwitchBank - this.laneSettleDir * 0.14 * settlePhase;
    this.laneDodgeBank = THREE.MathUtils.damp(
      this.laneDodgeBank,
      targetBank,
      this.laneSwitchActive ? 22 : 18,
      dt,
    );

    const isDodging =
      this.isGrounded &&
      !isFlying &&
      !isRolling &&
      this.dodgeAnimTimer > 0 &&
      this.dodgeAnimDir !== 0;

    const settleDipY =
      this.isGrounded && !isFlying && !isRolling ? settlePhase * 0.025 : 0;
    // Keep original jetpack steering yaw; on ground dodge keep root yaw near zero so head stays steady forward while dodge clip moves torso & legs!
    const dodgeYaw = isFlying
      ? THREE.MathUtils.clamp(-lateralVel * 0.02, -0.26, 0.26)
      : isDodging
        ? THREE.MathUtils.clamp(-this.laneDodgeBank * 0.04, -0.05, 0.05)
        : THREE.MathUtils.clamp(-this.laneDodgeBank * 0.14, -0.16, 0.16);

    this.activePlayerRoot.position.set(this.playerX, this.playerY, 0);
    this.activePlayerRoot.rotation.y = startTurnYaw + dodgeYaw;
    this.playerShadow.position.set(this.playerX, this.currentGroundY + 0.02, 0);
    this.playerShadow.scale.setScalar(
      Math.max(0.35, 1 - (this.playerY - this.currentGroundY) * 0.12),
    );

    this.headlamp.position.set(this.playerX, this.playerY + 1.65, -0.4);
    this.headlampTarget.position.set(this.playerX, floorY + 0.4, -24);

    // Subway Surfers Twin-Rocket Jetpack Visibility & Flame Pulse
    if (!this.playerGlb && this.playerRig) {
      this.playerRig.leftWing.visible = false;
      this.playerRig.rightWing.visible = false;
    }
    this.activeJetpackGroup.visible = isFlying;
    if (isFlying) {
      const lScaleY = 0.88 + Math.random() * 0.55;
      const rScaleY = 0.88 + Math.random() * 0.55;
      this.activeLeftJetFlame.scale.set(
        0.92 + Math.random() * 0.22,
        lScaleY,
        0.92 + Math.random() * 0.22,
      );
      this.activeRightJetFlame.scale.set(
        0.92 + Math.random() * 0.22,
        rScaleY,
        0.92 + Math.random() * 0.22,
      );
    }

    // --- Athletic Character Animation ---
    if (this.playerGlb) {
      if (isFlying) {
        this.dodgeAnimTimer = 0;
        this.dodgeAnimDir = 0;
        this.dodgeJustTriggered = false;
        this.playerGlb.setState('fly', 0.16, 0);
        this.playerGlb.rollPivot.rotation.x = THREE.MathUtils.damp(
          this.playerGlb.rollPivot.rotation.x,
          -1.24,
          11,
          dt,
        );
        this.playerGlb.rollPivot.rotation.z = THREE.MathUtils.damp(
          this.playerGlb.rollPivot.rotation.z,
          THREE.MathUtils.clamp(-lateralVel * 0.042, -0.52, 0.52),
          14,
          dt,
        );
        this.playerGlb.rollPivot.position.y = THREE.MathUtils.damp(
          this.playerGlb.rollPivot.position.y,
          1.0 + Math.sin(t * 7.5) * 0.045,
          14,
          dt,
        );
      } else if (this.longJumpSpinTimer > 0 && !this.isGrounded) {
        this.playerGlb.setState('jump', 0.08, 1.15);
        const spinProgress = 1 - this.longJumpSpinTimer / 0.98;
        this.playerGlb.rollPivot.rotation.x = -spinProgress * Math.PI * 2;
        this.playerGlb.rollPivot.rotation.z = THREE.MathUtils.damp(
          this.playerGlb.rollPivot.rotation.z,
          0,
          16,
          dt,
        );
        this.playerGlb.rollPivot.position.y = 0.85;
      } else if (isRolling) {
        this.playerGlb.setState('slide', 0.07, 1);
        this.playerGlb.rollPivot.rotation.x = THREE.MathUtils.damp(
          this.playerGlb.rollPivot.rotation.x,
          0,
          20,
          dt,
        );
        this.playerGlb.rollPivot.rotation.z = THREE.MathUtils.damp(
          this.playerGlb.rollPivot.rotation.z,
          -lateralVel * 0.024,
          16,
          dt,
        );
        this.playerGlb.rollPivot.position.y = THREE.MathUtils.damp(
          this.playerGlb.rollPivot.position.y,
          0.85,
          20,
          dt,
        );
      } else if (!this.isGrounded) {
        this.playerGlb.setState('jump', 0.1, 1.45);
        this.playerGlb.rollPivot.rotation.x = THREE.MathUtils.damp(
          this.playerGlb.rollPivot.rotation.x,
          THREE.MathUtils.clamp(this.velY * 0.012, -0.14, 0.14),
          16,
          dt,
        );
        this.playerGlb.rollPivot.rotation.z = THREE.MathUtils.damp(
          this.playerGlb.rollPivot.rotation.z,
          -this.laneDodgeBank * 0.2,
          16,
          dt,
        );
        this.playerGlb.rollPivot.position.y = THREE.MathUtils.damp(
          this.playerGlb.rollPivot.position.y,
          0.85,
          18,
          dt,
        );
      } else {
        if (isDodging) {
          const dodgeState =
            this.dodgeAnimDir > 0 ? 'dodge_right' : 'dodge_left';
          const dodgeScale = 0.31 / Math.max(0.2, this.dodgeAnimDuration);
          this.playerGlb.setState(
            dodgeState,
            0.055,
            dodgeScale,
            this.dodgeJustTriggered,
          );
          this.dodgeJustTriggered = false;
        } else {
          const runState = this.turboTimer > 0 || this.speed > 28 ? 'turbo' : 'run';
          const baseRunScale = THREE.MathUtils.clamp(this.speed / BASE_SPEED, 0.98, 1.9);
          this.playerGlb.setState(runState, 0.11, baseRunScale);
        }
        this.playerGlb.rollPivot.rotation.x = THREE.MathUtils.damp(
          this.playerGlb.rollPivot.rotation.x,
          0,
          20,
          dt,
        );
        this.playerGlb.rollPivot.rotation.z = THREE.MathUtils.damp(
          this.playerGlb.rollPivot.rotation.z,
          isDodging ? -this.laneDodgeBank * 0.07 : -this.laneDodgeBank * 0.16,
          16,
          dt,
        );
        const landDip = this.landSquashTimer > 0 ? -0.11 : 0;
        this.playerGlb.rollPivot.position.y = THREE.MathUtils.damp(
          this.playerGlb.rollPivot.position.y,
          0.85 + landDip - settleDipY,
          24,
          dt,
        );
      }
      const runSlopeTan =
        this.isGrounded && !isFlying && this.playerY <= floorY + 0.08
          ? (this.getWorldGroundY(this.distance + 0.9) -
              this.getWorldGroundY(Math.max(0, this.distance - 0.9))) /
            1.8
          : 0;
      this.playerGlb.update(dt, {
        clampFloor: this.isGrounded && !isFlying && this.longJumpSpinTimer <= 0,
        floorSlopeTan: runSlopeTan,
      });
    } else if (this.playerRig && isFlying) {
      // Subway Surfers horizontal superhero Jetpack flight pose with head lifted straight ahead
      this.playerRig.rollPivot.rotation.x = THREE.MathUtils.damp(
        this.playerRig.rollPivot.rotation.x,
        -1.26,
        11,
        dt,
      );
      this.playerRig.rollPivot.rotation.z = THREE.MathUtils.damp(
        this.playerRig.rollPivot.rotation.z,
        THREE.MathUtils.clamp(-lateralVel * 0.042, -0.52, 0.52),
        14,
        dt,
      );
      this.playerRig.rollPivot.position.y = THREE.MathUtils.damp(
        this.playerRig.rollPivot.position.y,
        1.0 + Math.sin(t * 7.5) * 0.045,
        14,
        dt,
      );
      this.playerRig.bodyGroup.rotation.x = 0;
      this.playerRig.bodyGroup.rotation.z = 0;
      this.playerRig.headGroup.rotation.x = THREE.MathUtils.damp(
        this.playerRig.headGroup.rotation.x,
        0.96,
        10,
        dt,
      );
      this.playerRig.leftArm.rotation.x = -1.75;
      this.playerRig.rightArm.rotation.x = -1.75;
      this.playerRig.leftArm.rotation.z = -0.32;
      this.playerRig.rightArm.rotation.z = 0.32;
      const flutter = Math.sin(t * 13) * 0.14;
      this.playerRig.leftLeg.rotation.x = 0.22 + flutter;
      this.playerRig.rightLeg.rotation.x = 0.22 - flutter;
      this.playerRig.leftLeg.rotation.z = 0;
      this.playerRig.rightLeg.rotation.z = 0;
    } else if (this.playerRig && this.longJumpSpinTimer > 0 && !this.isGrounded) {
      // Acrobatic Super-Spring Flip!
      const spinProgress = 1 - this.longJumpSpinTimer / 0.98;
      this.playerRig.rollPivot.rotation.x = -spinProgress * Math.PI * 2;
      this.playerRig.rollPivot.rotation.z = THREE.MathUtils.damp(
        this.playerRig.rollPivot.rotation.z,
        0,
        16,
        dt,
      );
      this.playerRig.rollPivot.position.y = 0.85;
      this.playerRig.headGroup.rotation.x = THREE.MathUtils.damp(
        this.playerRig.headGroup.rotation.x,
        0,
        16,
        dt,
      );
      this.playerRig.leftLeg.rotation.x = 0.9;
      this.playerRig.rightLeg.rotation.x = 0.9;
      this.playerRig.leftLeg.rotation.z = 0;
      this.playerRig.rightLeg.rotation.z = 0;
      this.playerRig.leftArm.rotation.x = -1.2;
      this.playerRig.rightArm.rotation.x = -1.2;
      this.playerRig.leftArm.rotation.z = 0;
      this.playerRig.rightArm.rotation.z = 0;
    } else if (this.playerRig && isRolling) {
      // Real 360° Forward Somersault Parkour Roll!
      const rollProgress = 1 - this.rollTimer / ROLL_DURATION;
      this.playerRig.rollPivot.rotation.x = -rollProgress * Math.PI * 2;
      this.playerRig.rollPivot.rotation.z = THREE.MathUtils.damp(
        this.playerRig.rollPivot.rotation.z,
        0,
        16,
        dt,
      );
      this.playerRig.rollPivot.position.y = THREE.MathUtils.damp(
        this.playerRig.rollPivot.position.y,
        0.52,
        24,
        dt,
      );
      this.playerRig.headGroup.rotation.x = THREE.MathUtils.damp(
        this.playerRig.headGroup.rotation.x,
        0,
        18,
        dt,
      );
      this.playerRig.leftLeg.rotation.x = 1.25;
      this.playerRig.rightLeg.rotation.x = 1.25;
      this.playerRig.leftLeg.rotation.z = 0;
      this.playerRig.rightLeg.rotation.z = 0;
      this.playerRig.leftArm.rotation.x = 1.1;
      this.playerRig.rightArm.rotation.x = 1.1;
      this.playerRig.leftArm.rotation.z = 0;
      this.playerRig.rightArm.rotation.z = 0;
      this.playerRig.bodyGroup.rotation.x = 0;
      this.playerRig.bodyGroup.rotation.z = THREE.MathUtils.damp(
        this.playerRig.bodyGroup.rotation.z,
        -lateralVel * 0.02,
        16,
        dt,
      );
    } else if (this.playerRig && !this.isGrounded) {
      this.playerRig.rollPivot.rotation.x = THREE.MathUtils.damp(
        this.playerRig.rollPivot.rotation.x,
        0,
        18,
        dt,
      );
      this.playerRig.rollPivot.rotation.z = THREE.MathUtils.damp(
        this.playerRig.rollPivot.rotation.z,
        0,
        18,
        dt,
      );
      this.playerRig.rollPivot.position.y = THREE.MathUtils.damp(
        this.playerRig.rollPivot.position.y,
        0.85,
        18,
        dt,
      );
      this.playerRig.headGroup.rotation.x = THREE.MathUtils.damp(
        this.playerRig.headGroup.rotation.x,
        0,
        16,
        dt,
      );
      const airPitch = THREE.MathUtils.clamp(this.velY * 0.02, -0.22, 0.24);
      this.playerRig.bodyGroup.rotation.x = airPitch;
      this.playerRig.bodyGroup.rotation.z = THREE.MathUtils.damp(
        this.playerRig.bodyGroup.rotation.z,
        -this.laneDodgeBank * 0.08,
        16,
        dt,
      );
      const airStrafe = this.laneDodgeArc * 0.22 * this.laneSwitchDir;
      this.playerRig.leftLeg.rotation.x = 0.85;
      this.playerRig.rightLeg.rotation.x = -0.55;
      this.playerRig.leftLeg.rotation.z =
        this.laneSwitchDir > 0 ? airStrafe * 0.55 : airStrafe;
      this.playerRig.rightLeg.rotation.z =
        this.laneSwitchDir < 0 ? airStrafe * 0.55 : airStrafe;
      this.playerRig.leftArm.rotation.x = -1.1;
      this.playerRig.rightArm.rotation.x = 0.75;
      this.playerRig.leftArm.rotation.z = 0;
      this.playerRig.rightArm.rotation.z = 0;
    } else if (this.playerRig) {
      this.playerRig.rollPivot.rotation.x = THREE.MathUtils.damp(
        this.playerRig.rollPivot.rotation.x,
        0,
        22,
        dt,
      );
      this.playerRig.rollPivot.rotation.z = THREE.MathUtils.damp(
        this.playerRig.rollPivot.rotation.z,
        0,
        22,
        dt,
      );
      const landDip = this.landSquashTimer > 0 ? -0.14 : 0;
      this.playerRig.rollPivot.position.y = THREE.MathUtils.damp(
        this.playerRig.rollPivot.position.y,
        0.85 + landDip - settleDipY,
        24,
        dt,
      );
      this.playerRig.headGroup.rotation.x = THREE.MathUtils.damp(
        this.playerRig.headGroup.rotation.x,
        0,
        18,
        dt,
      );
      this.playerRig.headGroup.rotation.y = THREE.MathUtils.damp(
        this.playerRig.headGroup.rotation.y,
        0,
        18,
        dt,
      );
      this.playerRig.bodyGroup.rotation.x = THREE.MathUtils.damp(
        this.playerRig.bodyGroup.rotation.x,
        -0.16,
        14,
        dt,
      );
      this.playerRig.bodyGroup.rotation.z = THREE.MathUtils.damp(
        this.playerRig.bodyGroup.rotation.z,
        -this.laneDodgeBank * 0.08,
        18,
        dt,
      );

      this.runAnimPhase += dt * this.speed * 0.92 * (1 + this.laneDodgeArc * 0.22);
      const swing = Math.sin(this.runAnimPhase);
      const strideBlend = 1 - this.laneDodgeArc * 0.65;
      const rightLead = this.laneSwitchDir > 0 ? this.laneDodgeArc : 0;
      const leftLead = this.laneSwitchDir < 0 ? this.laneDodgeArc : 0;
      this.playerRig.leftArm.rotation.x = swing * 0.95;
      this.playerRig.rightArm.rotation.x = -swing * 0.95;
      this.playerRig.leftArm.rotation.z = 0;
      this.playerRig.rightArm.rotation.z = 0;
      this.playerRig.leftLeg.rotation.x =
        -swing * 1.05 * strideBlend + leftLead * 0.44 - rightLead * 0.24;
      this.playerRig.rightLeg.rotation.x =
        swing * 1.05 * strideBlend + rightLead * 0.44 - leftLead * 0.24;
      this.playerRig.leftLeg.rotation.z = -leftLead * 0.32 + rightLead * 0.18;
      this.playerRig.rightLeg.rotation.z = rightLead * 0.32 - leftLead * 0.18;
    }

    // Emit twin-nozzle phosphor smoke plumes at a fixed 60 Hz cadence so 60 FPS and 240+ FPS match cleanly
    if (isFlying) {
      const jetInterval =
        this.graphicsQuality === 'low' ? JET_EXHAUST_INTERVAL * 2 : JET_EXHAUST_INTERVAL;
      this.jetExhaustEmitAccum = Math.min(
        this.jetExhaustEmitAccum + dt,
        jetInterval * 2,
      );
      if (this.jetExhaustEmitAccum >= jetInterval) {
        this.activePlayerRoot.updateMatrixWorld(true);
        const plumesPerNozzle = this.graphicsQuality === 'low' ? 1 : 2;
        while (this.jetExhaustEmitAccum >= jetInterval) {
          this.jetExhaustEmitAccum -= jetInterval;
          this.activeLeftNozzleTip.getWorldPosition(_vec3A);
          for (let p = 0; p < plumesPerNozzle; p++) {
            this.emitJetExhaust(_vec3A.x, _vec3A.y, _vec3A.z, lateralVel);
          }
          this.activeRightNozzleTip.getWorldPosition(_vec3A);
          for (let p = 0; p < plumesPerNozzle; p++) {
            this.emitJetExhaust(_vec3A.x, _vec3A.y, _vec3A.z, lateralVel);
          }
        }
      }
    } else {
      this.jetExhaustEmitAccum = 0;
    }

    if (!this.playerGlb && this.playerRig) {
      this.playerRig.leftAntenna.rotation.x = Math.sin(t * 14) * 0.16;
      this.playerRig.rightAntenna.rotation.x = Math.cos(t * 14) * 0.16;
    }

    this.updateParticles(dt);
    this.updateJetExhaust(dt);
    this.updateBiomeParticles(dt, currentZone.id, frameDz, t, floorY);

    // Periodic dialogues
    this.dialogueTimer -= dt;
    if (this.dialogueTimer <= 0) {
      this.dialogueTimer = 8.5 + Math.random() * 4.5;
      this.triggerDialogue('random');
    }

    const chaseCamPull =
      chaserActive && !isFlying
        ? this.stumbleTimer > 0
          ? Math.min(1, this.stumbleTimer / 1.1)
          : Math.min(1, Math.max(0, this.introChaseTimer / 1.2))
        : 0;

    // Crisp Subway Surfers camera (balanced proximity: both characters big & clear with chaser feet visible)
    const baseFov = this.camera.aspect < 0.85 ? 59 : 49;
    const speedFov = Math.min(3.0, Math.max(0, (this.speed - BASE_SPEED) * 0.13));
    const targetFov =
      baseFov +
      speedFov +
      chaseCamPull * 2.0 +
      (this.turboTimer > 0 ? 3.0 : isFlying ? 2.4 : 0);
    const nextFov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, dt);
    if (Math.abs(targetFov - this.camera.fov) <= 0.012) {
      if (this.camera.fov !== targetFov) {
        this.camera.fov = targetFov;
        this.camera.updateProjectionMatrix();
      }
    } else if (Math.abs(nextFov - this.camera.fov) > 0.012) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }

    const shakeX =
      this.cameraShake > 0
        ? (Math.sin(t * 48) * 0.65 + Math.cos(t * 73) * 0.35) * this.cameraShake * 0.5
        : 0;
    const shakeY =
      this.cameraShake > 0
        ? (Math.cos(t * 53) * 0.65 + Math.sin(t * 67) * 0.35) * this.cameraShake * 0.5
        : 0;
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 2);

    const relY = Math.max(0, this.playerY - floorY);
    const slopeLookOffset =
      earthNow && this.distance < earthNow.descentEnd
        ? -0.9
        : earthNow && this.distance >= earthNow.stairStart
          ? 1.15
          : 0;

    const inEarthTunnel = Boolean(earthNow);
    const targetCamX =
      this.playerX * (isFlying ? 0.72 : 0.92 + chaseCamPull * 0.05) +
      chaseCamPull * 0.16;
    const targetCamY = isFlying
      ? this.playerY + (inEarthTunnel ? 3.95 : 4.95)
      : floorY + 3.35 - chaseCamPull * 0.27 + relY * 0.62;
    const targetCamZ = isFlying ? (inEarthTunnel ? 6.25 : 6.85) : 5.25 + chaseCamPull * 1.75;
    const lookTargetY = isFlying
      ? this.playerY - (inEarthTunnel ? 2.6 : 3.15) + slopeLookOffset
      : floorY + 1.38 - chaseCamPull * 1.35 + relY * 0.48 + slopeLookOffset;
    const lookTargetZ = isFlying ? -11.5 : -16.5;

    const camRate =
      this.startTransitionTimer > 0 ? 6.5 : isFlying ? 10 : 7.6;
    const camYRate = isFlying ? 9.5 : 7.5;
    this.camera.position.x =
      THREE.MathUtils.damp(this.camera.position.x, targetCamX, camRate, dt) + shakeX;
    this.camera.position.y =
      THREE.MathUtils.damp(this.camera.position.y, targetCamY, camYRate, dt) + shakeY;
    this.camera.position.z = THREE.MathUtils.damp(
      this.camera.position.z,
      targetCamZ,
      7.5,
      dt,
    );
    this.camera.lookAt(
      this.playerX * (isFlying ? 0.48 : 0.76) + chaseCamPull * 0.15,
      lookTargetY,
      lookTargetZ,
    );

    this.hudThrottle += dt;
    if (this.hudThrottle >= 0.1) {
      this.hudThrottle = 0;
      this.emitHud();
    }
  }

  private bumpCombo(points: number): void {
    this.combo = Math.min(6, this.combo + 1);
    this.comboTimer = 4.2;
    this.score += points * this.combo;
  }

  private breakShield(obs: ActiveObstacle, index: number): void {
    this.hasShield = false;
    this.invulnTimer = 1.4 + (this.upgrades.shield - 1) * 0.35;
    gameAudio.playShieldBreak();
    gameAudio.playShieldBreakVoice();
    this.triggerDialogue('shield_break');
    this.releaseObstacle(obs);
    this.obstacles.splice(index, 1);
  }

  private activatePowerup(type: PowerupType): void {
    this.metrics.powerups += 1;
    gameAudio.playPowerup();
    gameAudio.playPowerupVoice(type);
    if (type === 'magnet') {
      this.metrics.magnets += 1;
      this.magnetTimer = 8.0 + (this.upgrades.magnet - 1) * 1.5;
      this.triggerDialogue('magnet');
    } else if (type === 'shield') {
      this.metrics.shields += 1;
      this.hasShield = true;
    } else if (type === 'flashlight') {
      this.metrics.flashlights += 1;
      this.flashlightTimer = 9.0 + (this.upgrades.flashlight - 1) * 1.5;
      this.triggerDialogue('flashlight');
    } else if (type === 'turbo') {
      this.metrics.turbos += 1;
      this.turboTimer = 4.0 + (this.upgrades.turbo - 1) * 0.75;
    } else if (type === 'wings') {
      this.wingsTimer = 6.5 + (this.upgrades.wings - 1) * 1.1;
      this.rollTimer = 0;
      this.longJumpSpinTimer = 0;
      const activePivot = this.playerGlb?.rollPivot ?? this.playerRig?.rollPivot;
      if (activePivot) {
        activePivot.rotation.x = THREE.MathUtils.euclideanModulo(
          activePivot.rotation.x + Math.PI,
          Math.PI * 2,
        ) - Math.PI;
      }
      this.dodgeAnimTimer = 0;
      this.dodgeAnimDir = 0;
      this.dodgeJustTriggered = false;
      this.metrics.flights += 1;
      this.flightCoinLane = this.targetLane;
      this.skyPatternIndex = Math.floor(Math.random() * 4);
      const firstGap = this.spawnSkyFlightFormation(-28);
      this.nextFlightCoinZ = -28 - firstGap;
      this.spawnBurst(this.playerX, this.playerY + 0.8, 0.2, 0x39ff14, 10, 3.6);
      gameAudio.playWingsFlap();
    }
    this.emitHud();
  }

  private triggerSideStumble(
    obsX: number,
    obsLane: number,
    sideDir: number,
  ): void {
    const resolvedSide =
      obsLane === 0 ? 1 : obsLane === 2 ? -1 : sideDir;
    const safeLane = THREE.MathUtils.clamp(obsLane + resolvedSide, 0, 2);
    this.targetLane = safeLane;
    this.prevSafeLane = safeLane;
    this.playerX = THREE.MathUtils.clamp(obsX + resolvedSide * 0.96, -3.25, 3.25);
    this.startLaneSwitch(safeLane, 0.14);
    this.stumbleTimer = 5.5;
    this.invulnTimer = 0.55;
    this.cameraShake = 0.42;
    this.combo = 1;
    this.comboTimer = 0;
    gameAudio.playStumble();
    gameAudio.playStumbleVoice();
    this.spawnBurst(obsX + resolvedSide * 0.85, this.playerY + 0.7, 0, 0xf97316, 10, 4.0);
    const targetChaserX = THREE.MathUtils.clamp(this.playerX + 0.56, -3.05, 3.05);
    this.activateChaserOnStumble(targetChaserX);
  }

  private activateChaserOnStumble(targetX: number): void {
    if (this.chaserGlb) {
      const wasVisible = this.chaserGlb.root.visible;
      this.chaserGlb.resetSlap();
      if (wasVisible) {
        this.chaserGlb.root.position.z = THREE.MathUtils.clamp(
          this.chaserGlb.root.position.z,
          1.85,
          8.2,
        );
        if (this.chaserGrounded) {
          this.chaserGlb.setState('run', 0.08, 1.25);
        }
      } else {
        const spawnFloorY = this.getWorldGroundY(Math.max(0, this.distance - 8.2));
        this.chaserY = spawnFloorY;
        this.chaserGroundY = spawnFloorY;
        this.chaserVelY = 0;
        this.chaserGrounded = true;
        this.chaserJumpCooldown = 0;
        this.chaserJustJumped = false;
        this.chaserGlb.root.position.set(targetX, spawnFloorY, 8.2);
        this.chaserGlb.root.rotation.set(0, -0.08, 0);
        this.chaserGlb.setState('run', 0.05, 1.32, true);
        this.chaserGlb.root.visible = true;
        this.chaserShadow.position.set(targetX, spawnFloorY + 0.02, 8.2);
        this.chaserShadow.visible = true;
      }
    } else {
      const wasVisible = this.broomMesh.visible;
      this.broomMesh.visible = true;
      if (!wasVisible) {
        const spawnFloorY = this.getWorldGroundY(Math.max(0, this.distance - 8.2));
        this.broomMesh.position.set(targetX, spawnFloorY, 8.2);
      }
    }
  }

  private handleCrash(
    kind: ObstacleKind,
    deathType: 'obstacle' | 'chaser' = 'obstacle',
    crashedObs?: ActiveObstacle,
    sideDir = 0,
  ): void {
    if (this.phase !== 'playing') return;
    this.phase = 'gameover';
    this.crashTimer = 0;
    this.startTransitionTimer = 0;
    this.cameraShake = 0.65;
    this.wingsTimer = 0;
    this.stumbleTimer = 0;
    this.activeJetpackGroup.visible = false;
    if (!this.playerGlb && this.playerRig) {
      this.playerRig.leftWing.visible = false;
      this.playerRig.rightWing.visible = false;
    }
    gameAudio.setPlaying(false);
    gameAudio.playCrash();
    gameAudio.playCrashVoice(deathType);

    this.deathReasonKey = deathType === 'chaser' ? 'broom' : kind;
    this.deathReason =
      deathType === 'chaser'
        ? 'EV SAHİBİ YAKALADI!'
        : DEATH_REASONS[kind] || 'EV SAHİBİ YAKALADI!';
    const finalScore = Math.floor(this.score);
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      this.isNewRecord = true;
    }

    // Resolve crash floor & zero-clipping positions so the falling character never intersects any obstacle
    const worldFloorY = this.getWorldGroundY(this.distance);
    let resolvedFloorY = worldFloorY;
    for (const obs of this.obstacles) {
      const isRoofObs =
        obs.kind === 'bus_ramp' ||
        obs.kind === 'terrain_ramp' ||
        obs.kind === 'moving_train' ||
        obs.kind === 'parked_train';
      if (!isRoofObs) continue;
      const obsX = obs.visualX ?? LANE_X[obs.lane];
      const localZ = -obs.z;
      const roofY = this.getObstacleRoofY(obs);
      const isCaveRamp = obs.poolKey === 'terrain_ramp_yeralti_magarasi';
      const onFootprint =
        obs.kind === 'moving_train' || obs.kind === 'parked_train'
          ? Math.abs(this.playerX - obsX) < 1.16 && Math.abs(obs.z) <= obs.halfDepth + 0.35
          : Math.abs(this.playerX - obsX) < 1.16 &&
            localZ >= (isCaveRamp ? -2.82 : -3.65) &&
            localZ <= (isCaveRamp ? 3.25 : 4.25);
      const isTrainRoof = obs.kind === 'moving_train' || obs.kind === 'parked_train';
      if (onFootprint && this.playerY >= obs.baseY + roofY - (isTrainRoof ? 0.24 : 0.55)) {
        resolvedFloorY = Math.max(resolvedFloorY, obs.baseY + roofY);
      }
    }
    this.crashFloorY = resolvedFloorY;
    this.playerY = Math.max(this.playerY, resolvedFloorY);

    if (sideDir !== 0 && crashedObs) {
      const obsX = crashedObs.visualX ?? LANE_X[crashedObs.lane];
      const resolvedSide =
        crashedObs.lane === 0 ? 1 : crashedObs.lane === 2 ? -1 : sideDir;
      this.playerX = THREE.MathUtils.clamp(obsX + resolvedSide * 1.36, -3.25, 3.25);
      this.targetLane = THREE.MathUtils.clamp(crashedObs.lane + resolvedSide, 0, 2);
      this.prevSafeLane = this.targetLane;
    } else if (crashedObs) {
      if (crashedObs.kind === 'bus_ramp' || crashedObs.kind === 'terrain_ramp') {
        const obsX = crashedObs.visualX ?? LANE_X[crashedObs.lane];
        const roofY = this.getObstacleRoofY(crashedObs);
        if (this.playerY < crashedObs.baseY + roofY - 0.25) {
          const pushSide =
            crashedObs.lane === 0
              ? 1
              : crashedObs.lane === 2
                ? -1
                : this.playerX < obsX
                  ? -1
                  : 1;
          this.playerX = THREE.MathUtils.clamp(obsX + pushSide * 1.36, -3.25, 3.25);
        }
      } else {
        const minFrontClearZ = deathType === 'chaser' ? -1.65 : -1.15;
        if (crashedObs.z + crashedObs.halfDepth > minFrontClearZ) {
          crashedObs.z = minFrontClearZ - crashedObs.halfDepth;
          crashedObs.mesh.position.z = crashedObs.z;
        }
      }
    }

    // Pass 1: Push player laterally clear of any bus/terrain ramp hull beside them
    for (const obs of this.obstacles) {
      if (obs.kind !== 'bus_ramp' && obs.kind !== 'terrain_ramp') continue;
      const obsX = obs.visualX ?? LANE_X[obs.lane];
      if (Math.abs(this.playerX - obsX) >= 1.32) continue;
      const localZ = -obs.z;
      const roofY = this.getObstacleRoofY(obs);
      const isCaveRamp = obs.poolKey === 'terrain_ramp_yeralti_magarasi';
      if (
        this.playerY < obs.baseY + roofY - 0.25 &&
        localZ >= (isCaveRamp ? -2.95 : -3.8) &&
        localZ <= (isCaveRamp ? 3.3 : 4.3)
      ) {
        const pushSide =
          obs.lane === 0
            ? 1
            : obs.lane === 2
              ? -1
              : this.playerX < obsX
                ? -1
                : 1;
        this.playerX = THREE.MathUtils.clamp(obsX + pushSide * 1.36, -3.25, 3.25);
      }
    }

    // Compute exact chaser death spot (unchanged arrival coordinates) so Pass 2 keeps both player and chaser clear of obstacles
    const sideSign = this.playerX >= 0 ? -1 : 1;
    const chaserSpotX = THREE.MathUtils.clamp(
      this.playerX - sideSign * (deathType === 'chaser' ? 0.54 : 0.78),
      -3.25,
      3.25,
    );
    const chaserApproachMaxZ =
      deathType === 'chaser'
        ? Math.max(
            2.15,
            (this.chaserGlb?.root.visible ? this.chaserGlb.root.position.z : 1.95) + 0.45,
          )
        : 3.55;

    // Pass 2: Sweep nearby obstacles & ramps around BOTH playerX and chaserSpotX so neither ever clips into meshes
    const frontClear = deathType === 'chaser' ? -1.65 : -1.15;
    const playerBackClear = deathType === 'chaser' ? 1.15 : 1.55;
    for (const obs of this.obstacles) {
      const obsX = obs.visualX ?? LANE_X[obs.lane];
      const isRamp = obs.kind === 'bus_ramp' || obs.kind === 'terrain_ramp';
      const obsHalfW = obs.halfWidth ?? (isRamp ? 1.02 : 0.94);
      const hitsPlayerX = Math.abs(this.playerX - obsX) < obsHalfW + 0.46;
      const hitsChaserX = Math.abs(chaserSpotX - obsX) < obsHalfW + 0.48;
      if (!hitsPlayerX && !hitsChaserX) continue;

      if (isRamp) {
        // Keep the roof intact if the player died on top of this ramp
        const roofY = this.getObstacleRoofY(obs);
        const isCaveRamp = obs.poolKey === 'terrain_ramp_yeralti_magarasi';
        const onThisRoof =
          this.crashFloorY >= obs.baseY + roofY - 0.25 &&
          Math.abs(this.playerX - obsX) < 1.35 &&
          -obs.z >= (isCaveRamp ? -2.95 : -3.9) &&
          -obs.z <= (isCaveRamp ? 3.35 : 4.35);
        if (onThisRoof) continue;
        const backClear = hitsChaserX
          ? Math.max(playerBackClear, chaserApproachMaxZ)
          : playerBackClear;
        if (obs.z + obs.halfDepth > frontClear && obs.z - obs.halfDepth < backClear) {
          if (obs.z < 0.25) {
            obs.z = Math.min(obs.z, frontClear - obs.halfDepth);
          } else {
            obs.z = Math.max(obs.z, backClear + obs.halfDepth);
          }
          obs.mesh.position.z = obs.z;
        }
        continue;
      }

      const backClear = hitsChaserX
        ? Math.max(playerBackClear, chaserApproachMaxZ)
        : playerBackClear;
      if (obs.z + obs.halfDepth > frontClear && obs.z - obs.halfDepth < backClear) {
        if (obs.z < 0.35) {
          obs.z = Math.min(obs.z, frontClear - obs.halfDepth);
        } else {
          obs.z = Math.max(obs.z, backClear + obs.halfDepth);
        }
        obs.mesh.position.z = obs.z;
      }
    }

    this.activePlayerRoot.visible = true;
    this.activePlayerRoot.position.set(this.playerX, this.playerY, 0);
    this.playerShadow.position.set(this.playerX, this.crashFloorY + 0.02, 0);

    this.crashDeathType = deathType;
    this.crashSlapImpactDone = deathType !== 'chaser';

    if (this.chaserGlb) {
      this.broomMesh.visible = false;
      const wasChaserVisible = this.chaserGlb.root.visible;
      this.chaserGlb.root.visible = true;
      if (deathType === 'chaser') {
        const startZ =
          wasChaserVisible &&
          this.chaserGlb.root.position.z > 0.5 &&
          this.chaserGlb.root.position.z < 9.5
            ? this.chaserGlb.root.position.z
            : 1.95;
        const startX = wasChaserVisible
          ? this.chaserGlb.root.position.x
          : THREE.MathUtils.clamp(this.playerX - sideSign * 0.54, -3.25, 3.25);
        this.chaserY = wasChaserVisible ? Math.max(this.crashFloorY, this.chaserY) : this.crashFloorY;
        this.chaserGlb.root.position.set(startX, this.chaserY, startZ);
        this.chaserGlb.root.rotation.set(0, sideSign * -0.44, 0);
        this.chaserGlb.triggerSlap(sideSign);
      } else {
        this.chaserGlb.resetSlap();
        this.chaserY = this.crashFloorY;
        this.chaserGlb.root.position.set(
          THREE.MathUtils.clamp(this.playerX - sideSign * 0.78, -3.25, 3.25),
          this.crashFloorY,
          3.15,
        );
        this.chaserGlb.root.rotation.set(0, 0, 0);
        this.chaserGlb.setState('run', 0.06, 1.25, true);
      }
      this.chaserShadow.visible = true;
      this.chaserShadow.position.set(
        this.chaserGlb.root.position.x,
        this.crashFloorY + 0.02,
        this.chaserGlb.root.position.z,
      );
    } else {
      this.chaserShadow.visible = false;
      this.broomMesh.visible = true;
      this.broomMesh.position.set(
        THREE.MathUtils.clamp(this.playerX + (this.playerX >= 0 ? -1.8 : 1.8), -3.2, 3.2),
        this.crashFloorY,
        1.35,
      );
    }

    this.dodgeAnimTimer = 0;
    this.dodgeAnimDir = 0;
    this.dodgeJustTriggered = false;
    if (this.playerGlb) {
      this.playerGlb.root.rotation.set(0, 0, 0);
      this.playerGlb.rollPivot.rotation.set(0, 0, 0);
      this.playerGlb.rollPivot.position.set(0, 0.85, 0);
      if (deathType === 'chaser') {
        // Hold briefly in upright stagger until the slap lands at t = 0.50s -> smooth fall_face
        this.playerGlb.setState('run', 0.06, 0.2, true);
      } else {
        this.playerGlb.setState('fall_back', 0.08, 1.05, true);
      }
    } else if (this.playerRig && deathType !== 'chaser') {
      this.playerRig.root.rotation.x = -Math.PI / 2.2;
    }

    this.triggerDialogue('crash');
    // Hold Game Over overlay long enough for the entire windup -> slap -> face-down fall beat
    this.pendingGameOverSnap = this.buildSnapshot();
    this.gameOverDelayTimer = deathType === 'chaser' ? 2.95 : 2.65;
  }

  private buildSnapshot(): HudSnapshot {
    return {
      phase: this.phase,
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      coins: this.runCoins,
      highScore: Math.max(this.highScore, Math.floor(this.score)),
      speedMultiplier: Number((this.speed / BASE_SPEED).toFixed(1)),
      combo: this.combo,
      stumbleTimer: Number(this.stumbleTimer.toFixed(1)),
      zone: ZONES[this.zoneIndex],
      activePowerups: {
        magnet: Math.ceil(this.magnetTimer),
        flashlight: Math.ceil(this.flashlightTimer),
        turbo: Math.ceil(this.turboTimer),
        wings: Math.ceil(this.wingsTimer),
        shield: this.hasShield,
      },
      deathReason: this.deathReason,
      deathReasonKey: this.deathReasonKey,
      isNewRecord: this.isNewRecord,
      continueCount: this.continueCount,
      adReviveUsed: this.adReviveUsed,
      resumeCountdown:
        this.phase === 'playing' && this.resumeCountdownTimer > 0
          ? Math.ceil(this.resumeCountdownTimer)
          : 0,
      metrics: {
        ...this.metrics,
        zonesReached: [...this.metrics.zonesReached],
      },
    };
  }

  private emitHud(): void {
    this.callbacks.onHudUpdate(this.buildSnapshot());
  }

  private handleResize = (): void => {
    const w = Math.max(1, Math.round(this.container.clientWidth || window.innerWidth));
    const h = Math.max(1, Math.round(this.container.clientHeight || window.innerHeight));
    const sizeChanged = w !== this.lastRenderWidth || h !== this.lastRenderHeight;
    if (!sizeChanged) return;

    this.lastRenderWidth = w;
    this.lastRenderHeight = h;
    const aspect = w / Math.max(h, 1);
    this.camera.aspect = aspect;
    if (this.phase === 'menu') {
      this.camera.fov = aspect < 0.85 ? 54 : 45;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.applyQualityProfile();
    if (!this.contextLost && !this.isRenderSuspended()) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
    this.loopRunning = false;
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    if (this.phase === 'playing') {
      this.pause(true);
    } else if (this.phase === 'gameover' && this.gameOverDelayTimer > 0) {
      this.flushPendingGameOver(true);
    }
  };

  private handleContextRestored = (): void => {
    this.contextLost = false;
    this.lastFrameMs = performance.now();
    try {
      this.envMapTexture?.dispose();
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.envMapTexture = pmremGenerator.fromScene(
        new RoomEnvironment(),
        0.04,
      ).texture;
      this.scene.environment = this.envMapTexture;
      pmremGenerator.dispose();
    } catch {
      // Keep running even if environment regeneration fails
    }
    this.textures.markNeedsUpdate();
    this.playerGlb?.markContextRestored();
    this.chaserGlb?.markContextRestored();
    if (this.dirLight?.shadow) {
      this.dirLight.shadow.map?.dispose();
      this.dirLight.shadow.map = null;
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.handleResize();
    this.syncLoopState();
    if (!this.isRenderSuspended()) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  public dispose(): void {
    this.disposed = true;
    this.loopRunning = false;
    window.clearTimeout(this.loopYieldTimerId);
    this.loopYieldTimerId = 0;
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    window.clearTimeout(this.glbQueueTimerId);
    window.clearTimeout(this.chaserPreloadTimerId);
    window.clearTimeout(this.biomePrewarmTimerId);
    this.deferredObstacleTasks = [];
    this.compiledPoolKeys.clear();
    this.compiledBiomeGroups.clear();
    this.prewarmedZoneVoices.clear();
    this.remainingGlbQueue = [];
    this.pendingPortraitSkins = [];
    this.buildSegmentBiomeGroup = null;
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);
    window.visualViewport?.removeEventListener('resize', this.handleResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.domElement.removeEventListener(
      'webglcontextlost',
      this.handleContextLost,
    );
    this.renderer.domElement.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
    );
    gameAudio.stopGameVoice();
    gameAudio.setPlaying(false);

    this.obstaclePool.forEach((bucket) => {
      bucket.forEach((mesh) => this.removeAndDispose(mesh));
    });
    this.obstaclePool.clear();
    this.powerupPool.forEach((bucket) => {
      bucket.forEach((mesh) => this.removeAndDispose(mesh));
    });
    this.powerupPool.clear();
    this.coinPool.forEach((mesh) => this.removeAndDispose(mesh));
    this.coinPool = [];
    this.obstacles = [];
    this.coins = [];
    this.powerups = [];
    this.segments = [];

    this.playerGlb?.dispose();
    this.playerGlb = null;
    this.chaserGlb?.dispose();
    this.chaserGlb = null;
    if (this.pendingPlayerPlaceholder) {
      this.removeAndDispose(this.pendingPlayerPlaceholder.root);
      this.pendingPlayerPlaceholder = null;
    }

    this.particleInstancedMesh?.dispose();
    this.jetExhaustInstancedMesh?.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        if (obj.userData?.glbCachedAsset || obj.userData?.sharedAsset) return;
        if (
          obj.geometry &&
          !obj.userData?.sharedGeometry &&
          !this.sharedDisposableSet.has(obj.geometry)
        ) {
          obj.geometry.dispose();
        }
        if (!obj.userData?.sharedMaterial) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (m && !this.sharedDisposableSet.has(m)) {
              m.dispose();
            }
          }
        }
      }
    });
    this.scene.clear();

    for (const d of this.sharedDisposables) {
      d.dispose();
    }
    this.sharedDisposables = [];
    this.sharedDisposableSet.clear();

    this.envMapTexture?.dispose();
    this.envMapTexture = null;
    this.textures.dispose();
    disposeModelsModuleSingletons();
    disposeAllCachedGlbAssets();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
