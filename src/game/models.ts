import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PowerupType, SkinConfig, SkinId } from './types';

// --- Shared Vertex-Colored Material Buckets & Static Mesh Batching ---
const SHARED_BASIC_VC = new THREE.MeshBasicMaterial({ vertexColors: true });
const SHARED_BASIC_VC_DOUBLE = new THREE.MeshBasicMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
});
const SHARED_MATTE_VC = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.72,
  metalness: 0.08,
});
const SHARED_MATTE_VC_DOUBLE = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.72,
  metalness: 0.08,
  side: THREE.DoubleSide,
});
const SHARED_LAMBERT_VC = new THREE.MeshLambertMaterial({ vertexColors: true });
const SHARED_LAMBERT_VC_DOUBLE = new THREE.MeshLambertMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
});
const SHARED_STANDARD_VC = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.22,
  metalness: 0.42,
});

// Shared module-level biome materials (disposed in disposeModelsModuleSingletons)
let sharedEarthShellMat: THREE.MeshStandardMaterial | null = null;
let sharedEarthShellTex: THREE.Texture | null = null;
function getEarthTunnelShellMat(earthWallTexture: THREE.Texture): THREE.MeshStandardMaterial {
  if (!sharedEarthShellMat || sharedEarthShellTex !== earthWallTexture) {
    sharedEarthShellMat?.dispose();
    sharedEarthShellTex = earthWallTexture;
    sharedEarthShellMat = new THREE.MeshStandardMaterial({
      map: earthWallTexture,
      color: 0xb48a6a,
      roughness: 0.94,
      side: THREE.BackSide,
    });
  }
  return sharedEarthShellMat;
}

let sharedIceWorldMats: {
  glacierMat: THREE.MeshStandardMaterial;
  auroraGreenMat: THREE.MeshBasicMaterial;
  auroraCyanMat: THREE.MeshBasicMaterial;
  auroraVioletMat: THREE.MeshBasicMaterial;
} | null = null;
function getIceWorldSharedMats() {
  if (!sharedIceWorldMats) {
    sharedIceWorldMats = {
      glacierMat: new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0369a1,
        emissiveIntensity: 0.32,
        roughness: 0.1,
        metalness: 0.22,
        transparent: true,
        opacity: 0.88,
      }),
      auroraGreenMat: new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.48,
      }),
      auroraCyanMat: new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.48,
      }),
      auroraVioletMat: new THREE.MeshBasicMaterial({
        color: 0xa78bfa,
        transparent: true,
        opacity: 0.36,
      }),
    };
  }
  return sharedIceWorldMats;
}

let sharedBathTransMats: {
  waterStreamMat: THREE.MeshStandardMaterial;
  curtainAquaMat: THREE.MeshStandardMaterial;
  curtainPinkMat: THREE.MeshStandardMaterial;
  bubbleMat: THREE.MeshStandardMaterial;
} | null = null;
function getBathSharedTransMats() {
  if (!sharedBathTransMats) {
    sharedBathTransMats = {
      waterStreamMat: new THREE.MeshStandardMaterial({
        color: 0x67e8f9,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.62,
        roughness: 0.08,
      }),
      curtainAquaMat: new THREE.MeshStandardMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.72,
        roughness: 0.55,
        side: THREE.DoubleSide,
      }),
      curtainPinkMat: new THREE.MeshStandardMaterial({
        color: 0xfbcfe8,
        transparent: true,
        opacity: 0.72,
        roughness: 0.55,
        side: THREE.DoubleSide,
      }),
      bubbleMat: new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.28,
        transparent: true,
        opacity: 0.52,
        roughness: 0.08,
      }),
    };
  }
  return sharedBathTransMats;
}

let sharedLabGlassMat: THREE.MeshStandardMaterial | null = null;
function getLabSharedGlassMat(): THREE.MeshStandardMaterial {
  if (!sharedLabGlassMat) {
    sharedLabGlassMat = new THREE.MeshStandardMaterial({
      color: 0xdcfce7,
      transparent: true,
      opacity: 0.36,
      roughness: 0.08,
      metalness: 0.12,
    });
  }
  return sharedLabGlassMat;
}

let sharedSpaceTransMats: {
  ringMat: THREE.MeshBasicMaterial;
  domeMat: THREE.MeshStandardMaterial;
} | null = null;
function getSpaceSharedTransMats() {
  if (!sharedSpaceTransMats) {
    sharedSpaceTransMats = {
      ringMat: new THREE.MeshBasicMaterial({
        color: 0xe879f9,
        transparent: true,
        opacity: 0.65,
      }),
      domeMat: new THREE.MeshStandardMaterial({
        color: 0x86efac,
        transparent: true,
        opacity: 0.62,
        roughness: 0.1,
      }),
    };
  }
  return sharedSpaceTransMats;
}

type BakeBucketKey =
  | 'basic'
  | 'basic_double'
  | 'matte'
  | 'matte_double'
  | 'lambert'
  | 'lambert_double'
  | 'standard';

const _bakeInvRoot = new THREE.Matrix4();
const _bakeRelMat = new THREE.Matrix4();
const _bakeColor = new THREE.Color();

export interface BakeStaticOptions {
  castShadow?: boolean;
  receiveShadow?: boolean;
  keepTransparent?: boolean;
  keepTextured?: boolean;
  forceLambert?: boolean;
  skipObjects?: Set<THREE.Object3D>;
}

function isBranchSkippedOrHidden(
  obj: THREE.Object3D,
  root: THREE.Object3D,
  skipObjects?: Set<THREE.Object3D>,
): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (!cur.visible) return true;
    if (skipObjects && skipObjects.has(cur)) return true;
    if (cur === root) break;
    cur = cur.parent;
  }
  return false;
}

export function bakeStaticGroup(
  rootGroup: THREE.Group,
  options: BakeStaticOptions = {},
): THREE.Group {
  const {
    castShadow = false,
    receiveShadow = false,
    keepTransparent = true,
    keepTextured = true,
    forceLambert = false,
    skipObjects,
  } = options;

  rootGroup.updateMatrixWorld(true);
  _bakeInvRoot.copy(rootGroup.matrixWorld).invert();

    const buckets: Record<BakeBucketKey, THREE.BufferGeometry[]> = {
    basic: [],
    basic_double: [],
    matte: [],
    matte_double: [],
    lambert: [],
    lambert_double: [],
    standard: [],
  };
  const replacedMeshes: THREE.Mesh[] = [];

  rootGroup.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (isBranchSkippedOrHidden(obj, rootGroup, skipObjects)) return;
    if (Array.isArray(obj.material) || !obj.material) return;

    const mat = obj.material as THREE.Material;
    const stdMat = mat as Partial<THREE.MeshStandardMaterial>;
    if (keepTransparent && mat.transparent) return;
    if (keepTextured && (stdMat.map || stdMat.emissiveMap)) return;

    const isBasic = mat instanceof THREE.MeshBasicMaterial;
    const isDouble = mat.side === THREE.DoubleSide;
    const em = stdMat.emissive;
    const emI = typeof stdMat.emissiveIntensity === 'number' ? stdMat.emissiveIntensity : 0;
    const metalness = typeof stdMat.metalness === 'number' ? stdMat.metalness : 0;
    const roughness = typeof stdMat.roughness === 'number' ? stdMat.roughness : 1;
    const isBrightGlow = !isBasic && Boolean(em) && emI >= 0.48 && metalness < 0.5;

    let bucketKey: BakeBucketKey;
    if (isBasic || isBrightGlow) {
      bucketKey = isDouble ? 'basic_double' : 'basic';
    } else if (forceLambert) {
      bucketKey = isDouble ? 'lambert_double' : 'lambert';
    } else if (metalness >= 0.32 || roughness <= 0.28) {
      bucketKey = isDouble ? 'matte_double' : 'standard';
    } else {
      bucketKey = isDouble ? 'matte_double' : 'matte';
    }

    const rawGeo = obj.geometry;
    if (!rawGeo) return;
    const geo = rawGeo.index ? rawGeo.toNonIndexed() : rawGeo.clone();
    _bakeRelMat.multiplyMatrices(_bakeInvRoot, obj.matrixWorld);
    geo.applyMatrix4(_bakeRelMat);

    const existingColor = mat.vertexColors ? geo.getAttribute('color') : undefined;
    if (!geo.getAttribute('normal')) {
      geo.computeVertexNormals();
    }
    for (const attrName of Object.keys(geo.attributes)) {
      if (
        attrName !== 'position' &&
        attrName !== 'normal' &&
        !(existingColor && attrName === 'color')
      ) {
        geo.deleteAttribute(attrName);
      }
    }

    const posAttr = geo.getAttribute('position');
    if (!posAttr || posAttr.count === 0) {
      geo.dispose();
      return;
    }

    if (!existingColor) {
      if (stdMat.color) {
        _bakeColor.copy(stdMat.color);
      } else {
        _bakeColor.setHex(0xffffff);
      }
      if (em && emI > 0) {
        const boost = bucketKey.startsWith('basic')
          ? Math.min(1, emI * 0.72)
          : Math.min(0.55, emI * 0.3);
        _bakeColor.r = Math.min(1, _bakeColor.r + em.r * boost);
        _bakeColor.g = Math.min(1, _bakeColor.g + em.g * boost);
        _bakeColor.b = Math.min(1, _bakeColor.b + em.b * boost);
      }

      const vCount = posAttr.count;
      const colors = new Float32Array(vCount * 3);
      for (let i = 0; i < vCount; i++) {
        const o = i * 3;
        colors[o] = _bakeColor.r;
        colors[o + 1] = _bakeColor.g;
        colors[o + 2] = _bakeColor.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    buckets[bucketKey].push(geo);
    replacedMeshes.push(obj);
  });

  if (replacedMeshes.length === 0) {
    return rootGroup;
  }

  for (const mesh of replacedMeshes) {
    mesh.parent?.remove(mesh);
    if (!mesh.userData?.sharedAsset && !mesh.userData?.sharedGeometry) {
      mesh.geometry?.dispose();
    }
    if (!mesh.userData?.sharedAsset && !mesh.userData?.sharedMaterial) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material?.dispose();
      }
    }
  }

  // Prune empty non-skipped groups left behind after mesh removal
  const pruneEmpty = (parent: THREE.Object3D) => {
    for (let i = parent.children.length - 1; i >= 0; i--) {
      const child = parent.children[i];
      if (child instanceof THREE.Group && !(skipObjects && skipObjects.has(child))) {
        pruneEmpty(child);
        if (child.children.length === 0) {
          parent.remove(child);
        }
      }
    }
  };
  pruneEmpty(rootGroup);

  const matMap: Record<BakeBucketKey, THREE.Material> = {
    basic: SHARED_BASIC_VC,
    basic_double: SHARED_BASIC_VC_DOUBLE,
    matte: SHARED_MATTE_VC,
    matte_double: SHARED_MATTE_VC_DOUBLE,
    lambert: SHARED_LAMBERT_VC,
    lambert_double: SHARED_LAMBERT_VC_DOUBLE,
    standard: SHARED_STANDARD_VC,
  };

  (Object.keys(buckets) as BakeBucketKey[]).forEach((key) => {
    const geos = buckets[key];
    if (geos.length === 0) return;
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) return;

    const mesh = new THREE.Mesh(merged, matMap[key]);
    mesh.userData.sharedMaterial = true;
    const isBasic = key.startsWith('basic');
    mesh.castShadow = castShadow && !isBasic;
    mesh.receiveShadow = receiveShadow && !isBasic;
    rootGroup.add(mesh);
  });

  return rootGroup;
}

export interface CockroachRig {
  root: THREE.Group;
  rollPivot: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftAntenna: THREE.Mesh;
  rightAntenna: THREE.Mesh;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  jetpackGroup: THREE.Group;
  leftJetFlame: THREE.Mesh;
  rightJetFlame: THREE.Mesh;
  leftNozzleTip: THREE.Object3D;
  rightNozzleTip: THREE.Object3D;
  headlampMesh: THREE.Mesh;
  shieldSphere: THREE.Mesh;
}

export interface JetpackAssembly {
  group: THREE.Group;
  leftFlame: THREE.Mesh;
  rightFlame: THREE.Mesh;
  leftNozzleTip: THREE.Object3D;
  rightNozzleTip: THREE.Object3D;
}

/**
 * Subway Surfers tarzı çift silindirli, yakıt göstergeli ve fosfor plazma nozullu 3D Jetpack
 */
export function createJetpackAssembly(withHarness: boolean): JetpackAssembly {
  const group = new THREE.Group();

  const tankMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.2,
    metalness: 0.42,
  });
  const cyanTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.45,
  });
  const orangeCapMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 0.25,
    roughness: 0.28,
    metalness: 0.3,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.38,
    metalness: 0.78,
  });
  const phosphorCoreMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
  });

  // Central spine housing & backpack plate
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.62, 0.16), darkSteelMat);
  spine.position.set(0, 0.04, 0);
  spine.castShadow = true;
  group.add(spine);

  const coreStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.42, 0.04),
    new THREE.MeshBasicMaterial({ color: 0x39ff14 }),
  );
  coreStrip.position.set(0, 0.06, 0.09);
  group.add(coreStrip);

  const hazardBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.1, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 }),
  );
  hazardBar.position.set(0, 0.22, 0.02);
  group.add(hazardBar);

  // Side aerodynamic winglets
  [-1, 1].forEach((side) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.05), cyanTrimMat);
    fin.position.set(side * 0.38, 0.02, 0.04);
    fin.rotation.z = side * -0.35;
    group.add(fin);
  });

  if (withHarness) {
    [-0.22, 0.22].forEach((sx) => {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.036, 8, 16), darkSteelMat);
      strap.rotation.y = Math.PI / 2;
      strap.position.set(sx, 0.14, -0.24);
      group.add(strap);
    });
  }

  let leftFlame!: THREE.Mesh;
  let rightFlame!: THREE.Mesh;
  const leftNozzleTip = new THREE.Object3D();
  const rightNozzleTip = new THREE.Object3D();

  [-1, 1].forEach((side, idx) => {
    const tx = side * 0.22;

    // Main pressurized emerald-green fuel cylinder
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.62, 16), tankMat);
    tank.position.set(tx, 0.04, 0.06);
    tank.castShadow = true;
    group.add(tank);

    // Golden-orange top nose cone dome
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.141, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      orangeCapMat,
    );
    dome.position.set(tx, 0.35, 0.06);
    group.add(dome);

    const tipFinial = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 10), cyanTrimMat);
    tipFinial.position.set(tx, 0.5, 0.06);
    group.add(tipFinial);

    // Golden fuel gauge ring around tank
    const glowBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.147, 0.147, 0.09, 16),
      phosphorCoreMat,
    );
    glowBand.position.set(tx, 0.14, 0.06);
    group.add(glowBand);

    const clampBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.148, 0.148, 0.07, 16),
      darkSteelMat,
    );
    clampBand.position.set(tx, -0.14, 0.06);
    group.add(clampBand);

    // Flared rocket exhaust bell nozzle pointing down (-Y)
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.15, 0.22, 14),
      darkSteelMat,
    );
    nozzle.position.set(tx, -0.35, 0.06);
    group.add(nozzle);

    // Glowing phosphor exit rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 16), phosphorCoreMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(tx, -0.45, 0.06);
    group.add(rim);

    // Fiery orange-red outer flame -> bright gold core (just like Subway Surfers!)
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.62, 12), flameMat);
    flame.rotation.x = Math.PI;
    flame.position.set(tx, -0.74, 0.06);

    const innerCore = new THREE.Mesh(
      new THREE.ConeGeometry(0.065, 0.42, 10),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.96,
        depthWrite: false,
      }),
    );
    innerCore.position.set(0, -0.08, 0);
    flame.add(innerCore);
    group.add(flame);

    const tipAnchor = idx === 0 ? leftNozzleTip : rightNozzleTip;
    tipAnchor.position.set(tx, -0.52, 0.06);
    group.add(tipAnchor);

    if (idx === 0) leftFlame = flame;
    else rightFlame = flame;
  });

  bakeStaticGroup(group, {
    castShadow: withHarness,
    keepTransparent: true,
    skipObjects: new Set<THREE.Object3D>([
      leftFlame,
      rightFlame,
      leftNozzleTip,
      rightNozzleTip,
    ]),
  });

  return { group, leftFlame, rightFlame, leftNozzleTip, rightNozzleTip };
}

/**
 * Yüksek Kaliteli 3D Böcek Karakter Modeli (MeshPhysicalMaterial + organik kabuk & kumaş dokusu + karaktere özel siluetler).
 * Önden (Ana Sayfa & Mağaza) ve arkadan (Koşu kamerası) maksimum görsel netlik ve karakter kişiliği verir.
 */
export function createCockroachModel(
  skin: SkinConfig,
  chitinWingTexture?: THREE.Texture,
  fabricWeaveTexture?: THREE.Texture,
): CockroachRig {
  const root = new THREE.Group();
  const rollPivot = new THREE.Group();
  rollPivot.position.set(0, 0.85, 0);
  root.add(rollPivot);

  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, -0.85, 0);
  rollPivot.add(bodyGroup);

  const isMechanic = skin.id === 'tamirci_kazim';
  const isCurly = skin.id === 'kivircik_riza';
  const isDiva = skin.id === 'diva_bocek';
  const isDuktur = skin.id === 'duktur_bocek';
  const isHahamcan = skin.id === 'hahamcan';

  // --- Physically-Based High-Contrast Materials ---
  const wingMat = new THREE.MeshStandardMaterial({
    map: chitinWingTexture ?? null,
    color: isDiva
      ? 0xf472b6
      : isDuktur
        ? 0xd97706
        : isHahamcan
          ? 0xb45309
          : chitinWingTexture
            ? 0xffffff
            : skin.carapaceColor,
    roughness: isDiva ? 0.16 : 0.22,
    metalness: isDiva ? 0.28 : 0.14,
  });

  const skinFaceMat = new THREE.MeshStandardMaterial({
    color: isMechanic ? 0xa37048 : isHahamcan ? 0xc08a5e : 0xbb8558,
    roughness: 0.48,
    metalness: 0.03,
  });

  const chitinLegMat = new THREE.MeshStandardMaterial({
    color: isDiva ? 0x702448 : 0x6b2f12,
    roughness: 0.24,
    metalness: 0.14,
  });

  const darkChitinMat = new THREE.MeshStandardMaterial({
    color: 0x3b1c0a,
    roughness: 0.3,
    metalness: 0.14,
  });

  const outfitMat = new THREE.MeshStandardMaterial({
    map: fabricWeaveTexture ?? null,
    color: skin.shirtColor,
    roughness: isDiva ? 0.38 : 0.72,
    metalness: isDiva ? 0.14 : 0.03,
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    map: fabricWeaveTexture ?? null,
    color: isMechanic
      ? 0x172b47
      : isDiva
        ? 0x3b0764
        : isDuktur
          ? 0x0284c7
          : isHahamcan
            ? 0x1e293b
            : 0x1e293b,
    roughness: 0.76,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.94,
    roughness: 0.15,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.12,
  });

  // 1. Sculpted LatheGeometry Torso (tailored silhouette per character)
  const torsoPts = isMechanic
    ? [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.35, 0.02),
        new THREE.Vector2(0.37, 0.36),
        new THREE.Vector2(0.42, 0.72),
        new THREE.Vector2(0.31, 0.88),
        new THREE.Vector2(0.17, 0.94),
        new THREE.Vector2(0.0, 0.95),
      ]
    : isDiva
      ? [
          new THREE.Vector2(0.0, 0.04),
          new THREE.Vector2(0.34, 0.06),
          new THREE.Vector2(0.32, 0.32),
          new THREE.Vector2(0.42, 0.68),
          new THREE.Vector2(0.33, 0.86),
          new THREE.Vector2(0.16, 0.91),
          new THREE.Vector2(0.0, 0.93),
        ]
      : [
          new THREE.Vector2(0.0, 0.0),
          new THREE.Vector2(0.39, 0.02),
          new THREE.Vector2(0.48, 0.28),
          new THREE.Vector2(0.45, 0.58),
          new THREE.Vector2(0.36, 0.82),
          new THREE.Vector2(0.18, 0.9),
          new THREE.Vector2(0.0, 0.92),
        ];
  const torsoGeo = new THREE.LatheGeometry(torsoPts, 28);
  torsoGeo.scale(1.04, 1, 0.82);
  const torso = new THREE.Mesh(torsoGeo, outfitMat);
  torso.position.set(0, 0.65, 0);
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Neck ring
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.155, 0.195, 0.14, 16),
    skinFaceMat,
  );
  neck.position.set(0, 1.54, -0.02);
  bodyGroup.add(neck);

  // 2. Character-Specific Outfit Sculpting (Front & Back Distinction!)
  if (isMechanic) {
    // White ribbed undershirt V-neck + wide folded navy coverall collar lapels
    const undershirtMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.72,
    });
    const undershirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.16, 0.3, 14),
      undershirtMat,
    );
    undershirt.position.set(0, 1.44, -0.18);
    undershirt.scale.set(0.84, 1, 0.48);
    bodyGroup.add(undershirt);

    const pocketMat = new THREE.MeshStandardMaterial({
      color: 0x102036,
      roughness: 0.68,
    });

    [-1, 1].forEach((side) => {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.22, 0.052), outfitMat);
      lapel.position.set(side * 0.13, 1.42, -0.27);
      lapel.rotation.z = side * -0.36;
      lapel.rotation.y = side * 0.24;
      bodyGroup.add(lapel);

      // 3D stitched chest utility pocket + flap + brass snap button
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.048), pocketMat);
      pocket.position.set(side * 0.18, 1.18, -0.33);
      pocket.rotation.y = side * -0.16;
      bodyGroup.add(pocket);

      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.156, 0.04, 0.056), outfitMat);
      flap.position.set(side * 0.18, 1.245, -0.338);
      flap.rotation.y = side * -0.16;
      bodyGroup.add(flap);

      const snap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.018, 10), goldMat);
      snap.rotation.x = Math.PI / 2;
      snap.position.set(side * 0.18, 1.24, -0.366);
      bodyGroup.add(snap);
    });

    // Red & Yellow Screwdrivers + Steel Ruler tucked in chest pockets
    const redDriver = new THREE.Mesh(
      new THREE.CylinderGeometry(0.017, 0.014, 0.13, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.28 }),
    );
    redDriver.position.set(-0.2, 1.28, -0.33);
    redDriver.rotation.z = 0.14;
    bodyGroup.add(redDriver);

    const yellowDriver = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.012, 0.11, 8),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 }),
    );
    yellowDriver.position.set(-0.155, 1.275, -0.335);
    yellowDriver.rotation.z = -0.08;
    bodyGroup.add(yellowDriver);

    const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.52, 0.045), chromeMat);
    zipper.position.set(0, 1.1, -0.335);
    bodyGroup.add(zipper);

    // High-visibility cyan reflective safety stripes (front shoulders & back yoke!)
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      roughness: 0.25,
    });
    const backStripe = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.085, 0.09), stripeMat);
    backStripe.position.set(0, 1.32, 0.28);
    bodyGroup.add(backStripe);

    [-1, 1].forEach((side) => {
      const shoulderStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.04, 0.34),
        stripeMat,
      );
      shoulderStripe.position.set(side * 0.25, 1.49, 0.02);
      shoulderStripe.rotation.z = side * -0.18;
      bodyGroup.add(shoulderStripe);
    });

    // Heavy leather utility belt + steel buckle + left tool pouch + right wrench
    const beltMat = new THREE.MeshStandardMaterial({
      color: 0x1c140f,
      roughness: 0.45,
    });
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.1, 24), beltMat);
    belt.scale.set(1.04, 1, 0.84);
    belt.position.set(0, 0.86, 0);
    bodyGroup.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.115, 0.065), chromeMat);
    buckle.position.set(0, 0.86, -0.35);
    bodyGroup.add(buckle);

    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.19, 0.11), beltMat);
    pouch.position.set(-0.4, 0.82, -0.02);
    pouch.rotation.z = -0.1;
    bodyGroup.add(pouch);

    // 3D Chrome Wrench on right hip
    const wrenchGroup = new THREE.Group();
    wrenchGroup.position.set(0.41, 0.82, -0.04);
    wrenchGroup.rotation.z = 0.22;
    const wrenchShaft = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.3, 0.026), chromeMat);
    wrenchShaft.position.y = -0.11;
    wrenchGroup.add(wrenchShaft);
    const wrenchHead = new THREE.Mesh(
      new THREE.TorusGeometry(0.054, 0.019, 8, 14, Math.PI * 1.45),
      chromeMat,
    );
    wrenchHead.rotation.y = Math.PI / 2;
    wrenchHead.rotation.z = Math.PI * 0.25;
    wrenchHead.position.y = 0.04;
    wrenchGroup.add(wrenchHead);
    bodyGroup.add(wrenchGroup);

    // Back tool belt pouch so back view also reads as master mechanic
    const backPouch = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.09), beltMat);
    backPouch.position.set(0, 0.84, 0.35);
    bodyGroup.add(backPouch);
  } else if (isCurly) {
    // Streetwear layered orange tee + white crew collar + folded hood on back + gold chain!
    const whiteTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.68,
    });
    const innerCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.042, 10, 22),
      whiteTrimMat,
    );
    innerCollar.rotation.x = Math.PI / 2.2;
    innerCollar.position.set(0, 1.52, -0.03);
    bodyGroup.add(innerCollar);

    const collarRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.235, 0.052, 10, 22),
      new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.66 }),
    );
    collarRing.rotation.x = Math.PI / 2.25;
    collarRing.position.set(0, 1.48, -0.02);
    bodyGroup.add(collarRing);

    // Folded orange street hood behind neck (visible from behind while running!)
    const foldedHood = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.075, 10, 18, Math.PI * 1.1),
      outfitMat,
    );
    foldedHood.rotation.x = Math.PI / 2.4;
    foldedHood.rotation.z = Math.PI * 0.95;
    foldedHood.position.set(0, 1.47, 0.12);
    bodyGroup.add(foldedHood);

    // Crisp streetwear chest stripe + emblem badge
    const chestStripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.456, 0.464, 0.11, 24, 1, true, Math.PI * 0.65, Math.PI * 0.7),
      whiteTrimMat,
    );
    chestStripe.scale.set(1.04, 1, 0.83);
    chestStripe.position.set(0, 1.18, 0);
    bodyGroup.add(chestStripe);

    const emblem = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.018, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.7 }),
    );
    emblem.position.set(0, 1.24, -0.375);
    bodyGroup.add(emblem);

    // Chunky Gold Street Chain Necklace
    const chain = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.02, 8, 22, Math.PI * 1.05),
      goldMat,
    );
    chain.rotation.x = Math.PI / 2.9;
    chain.rotation.z = -Math.PI * 0.025;
    chain.position.set(0, 1.42, -0.09);
    bodyGroup.add(chain);

    const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), goldMat);
    pendant.scale.set(1, 1.1, 0.45);
    pendant.position.set(0, 1.32, -0.34);
    bodyGroup.add(pendant);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.41, 20, 16), skinFaceMat);
    belly.scale.set(1.02, 0.56, 0.84);
    belly.position.set(0, 0.68, -0.05);
    belly.castShadow = true;
    bodyGroup.add(belly);

    // Segmented belly chitin ridges
    [0.64, 0.74].forEach((ry) => {
      const ridge = new THREE.Mesh(
        new THREE.TorusGeometry(0.34, 0.014, 6, 18, Math.PI * 0.9),
        darkChitinMat,
      );
      ridge.rotation.x = Math.PI / 2;
      ridge.rotation.z = Math.PI * 1.05;
      ridge.position.set(0, ry, -0.08);
      bodyGroup.add(ridge);
    });
  } else if (isDiva) {
    // Glamorous waist-cropped glossy magenta jacket + multi-tuft snow-white faux-fur boa + gold diamond belt!
    const furMat = new THREE.MeshStandardMaterial({
      color: 0xfff5f7,
      roughness: 0.92,
    });

    // Multi-tuft fluffy fur boa wrapping shoulders cleanly (front & back glam look)
    const boaCount = 12;
    for (let i = 0; i < boaCount; i++) {
      const ang = (i / boaCount) * Math.PI * 2;
      const tuft = new THREE.Mesh(
        new THREE.SphereGeometry(0.088 + (i % 2) * 0.015, 10, 8),
        furMat,
      );
      tuft.scale.set(1.15, 0.92, 1.05);
      tuft.position.set(
        Math.cos(ang) * 0.25,
        1.48 + Math.sin(ang * 2) * 0.018,
        Math.sin(ang) * 0.21 - 0.02,
      );
      bodyGroup.add(tuft);
    }

    // Sleek cropped jacket hem trim + gold front zipper
    const hemTrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.37, 0.37, 0.055, 22),
      goldMat,
    );
    hemTrim.scale.set(1.04, 1, 0.84);
    hemTrim.position.set(0, 0.74, 0);
    bodyGroup.add(hemTrim);

    const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.56, 0.04), goldMat);
    zipper.position.set(0, 1.12, -0.35);
    bodyGroup.add(zipper);

    // High-waist gold belt + sparkling cyan faceted diamond gem buckle
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.082, 24), goldMat);
    belt.scale.set(1.04, 1, 0.84);
    belt.position.set(0, 0.86, 0);
    bodyGroup.add(belt);

    const gemBuckle = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.088, 0),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
        metalness: 0.25,
        roughness: 0.06,
      }),
    );
    gemBuckle.position.set(0, 0.86, -0.36);
    bodyGroup.add(gemBuckle);
  } else if (isDuktur) {
    // Crisp white emergency doctor lab coat with flared coat tails + sky-blue scrubs + binaural stethoscope!
    const scrubsMat = new THREE.MeshStandardMaterial({
      map: fabricWeaveTexture ?? null,
      color: 0x0ea5e9,
      roughness: 0.65,
    });
    const scrubs = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.21, 0.5, 16),
      scrubsMat,
    );
    scrubs.scale.set(1.05, 1, 0.76);
    scrubs.position.set(0, 1.24, -0.16);
    bodyGroup.add(scrubs);

    // Flared lower doctor coat-tail panels (back + sides so legs stay free while back clearly reads as a lab coat!)
    const coatBackSkirtMat = outfitMat.clone();
    coatBackSkirtMat.side = THREE.DoubleSide;
    const coatBackSkirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.52, 0.44, 18, 1, true, -Math.PI * 0.42, Math.PI * 0.84),
      coatBackSkirtMat,
    );
    coatBackSkirt.scale.set(1.05, 1, 0.84);
    coatBackSkirt.position.set(0, 0.52, 0.02);
    bodyGroup.add(coatBackSkirt);

    [-1, 1].forEach((side) => {
      const coatSidePanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.4, 0.34),
        outfitMat,
      );
      coatSidePanel.position.set(side * 0.41, 0.54, -0.02);
      coatSidePanel.rotation.z = side * 0.14;
      bodyGroup.add(coatSidePanel);

      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.24, 0.048), outfitMat);
      lapel.position.set(side * 0.14, 1.38, -0.33);
      lapel.rotation.z = side * -0.28;
      bodyGroup.add(lapel);
    });

    // Medical Red Cross Badge + Hospital ID card
    const badgeBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.14, 0.036),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
    );
    badgeBack.position.set(0.2, 1.21, -0.365);
    bodyGroup.add(badgeBack);

    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 });
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.095, 0.044), redMat);
    crossV.position.set(0.2, 1.21, -0.372);
    bodyGroup.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.034, 0.044), redMat);
    crossH.position.set(0.2, 1.21, -0.372);
    bodyGroup.add(crossH);

    // Doctor pocket penlight
    const penlight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, 0.12, 8),
      chromeMat,
    );
    penlight.position.set(-0.2, 1.26, -0.35);
    penlight.rotation.z = 0.1;
    bodyGroup.add(penlight);

    // 3D Binaural Stethoscope draped around neck
    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.38,
    });
    const stethTube = new THREE.Mesh(
      new THREE.TorusGeometry(0.255, 0.026, 8, 22, Math.PI * 1.45),
      rubberMat,
    );
    stethTube.rotation.x = Math.PI / 2.55;
    stethTube.rotation.z = -Math.PI * 0.225;
    stethTube.position.set(0, 1.44, -0.04);
    bodyGroup.add(stethTube);

    const stethDrop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.22, 8),
      rubberMat,
    );
    stethDrop.position.set(0.11, 1.24, -0.355);
    bodyGroup.add(stethDrop);

    const chestPiece = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.032, 16),
      chromeMat,
    );
    chestPiece.rotation.x = Math.PI / 2;
    chestPiece.position.set(0.11, 1.13, -0.37);
    bodyGroup.add(chestPiece);
  } else if (isHahamcan) {
    // Master-Crafted Tailored PINK LONG OVERCOAT (Pembe Uzun Palto) + Raised Collar + Draped Gold Pocket Watch & Dial!
    const deepPinkSatinMat = new THREE.MeshStandardMaterial({
      map: fabricWeaveTexture ?? null,
      color: 0xdb2777,
      roughness: 0.44,
    });
    const roseTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf9a8d4,
      roughness: 0.55,
    });
    const crispShirtMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.58,
    });

    // Inner white dress shirt + tailored burgundy waistcoat visible through front coat opening
    const vest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.2, 0.52, 16),
      new THREE.MeshStandardMaterial({ color: 0x4c1d3d, roughness: 0.62 }),
    );
    vest.scale.set(0.92, 1, 0.58);
    vest.position.set(0, 1.21, -0.18);
    bodyGroup.add(vest);

    const shirtFront = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.15, 0.4, 14),
      crispShirtMat,
    );
    shirtFront.scale.set(0.78, 1, 0.52);
    shirtFront.position.set(0, 1.32, -0.21);
    bodyGroup.add(shirtFront);

    // Continuous Wrap-Around Flared Pink Long Coat Skirt (open front V-slit around -Z so legs stride freely!)
    const coatSkirtPts = [
      new THREE.Vector2(0.58, 0.0),
      new THREE.Vector2(0.55, 0.14),
      new THREE.Vector2(0.5, 0.34),
      new THREE.Vector2(0.44, 0.56),
      new THREE.Vector2(0.41, 0.68),
    ];
    const longCoatGeo = new THREE.LatheGeometry(
      coatSkirtPts,
      30,
      -Math.PI * 0.78,
      Math.PI * 1.56,
    );
    longCoatGeo.scale(1.06, 1, 0.88);
    const coatSkirtMat = outfitMat.clone();
    coatSkirtMat.side = THREE.DoubleSide;
    const deepPinkDoubleMat = deepPinkSatinMat.clone();
    deepPinkDoubleMat.side = THREE.DoubleSide;

    const longCoatSkirt = new THREE.Mesh(longCoatGeo, coatSkirtMat);
    longCoatSkirt.position.set(0, 0.31, 0.01);
    longCoatSkirt.castShadow = true;
    bodyGroup.add(longCoatSkirt);

    // Subtle rose-pink satin lower hem binding around the coat skirt
    const hemTrimGeo = new THREE.LatheGeometry(
      [new THREE.Vector2(0.585, 0.0), new THREE.Vector2(0.572, 0.045)],
      28,
      -Math.PI * 0.78,
      Math.PI * 1.56,
    );
    hemTrimGeo.scale(1.06, 1, 0.88);
    const coatHemTrim = new THREE.Mesh(hemTrimGeo, deepPinkDoubleMat);
    coatHemTrim.position.set(0, 0.31, 0.01);
    bodyGroup.add(coatHemTrim);

    // Raised sculpted high overcoat collar wrapping neck + wide peaked lapels + front coat edges
    const coatCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.29, 0.14, 20, 1, true, -Math.PI * 0.7, Math.PI * 1.4),
      deepPinkDoubleMat,
    );
    coatCollar.position.set(0, 1.53, 0.01);
    bodyGroup.add(coatCollar);

    [-1, 1].forEach((side) => {
      // Sculpted shoulder epaulet & tailored notched lapel
      const epaulet = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.09), deepPinkSatinMat);
      epaulet.position.set(side * 0.28, 1.51, 0.0);
      epaulet.rotation.z = side * -0.24;
      bodyGroup.add(epaulet);

      const lapel = new THREE.Mesh(
        new THREE.BoxGeometry(0.145, 0.36, 0.055),
        deepPinkSatinMat,
      );
      lapel.position.set(side * 0.15, 1.29, -0.345);
      lapel.rotation.z = side * -0.21;
      lapel.rotation.y = side * 0.2;
      bodyGroup.add(lapel);

      // Hip flap pocket on each side of long coat
      const coatPocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.045),
        deepPinkSatinMat,
      );
      coatPocket.position.set(side * 0.28, 0.74, -0.27);
      coatPocket.rotation.y = side * -0.52;
      bodyGroup.add(coatPocket);
    });

    // Double-breasted gleaming gold & rose-trimmed coat buttons down front
    [-0.105, 0.105].forEach((bx) => {
      [1.08, 0.94, 0.72].forEach((by) => {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.022, 12), goldMat);
        btn.rotation.x = Math.PI / 2;
        btn.position.set(bx, by, by < 0.85 ? -0.35 : -0.365);
        bodyGroup.add(btn);
      });
    });

    // Tailored coat waist sash + ornate gold buckle + draped sash tail + back martingale strap
    const beltSash = new THREE.Mesh(
      new THREE.CylinderGeometry(0.455, 0.455, 0.095, 24),
      deepPinkSatinMat,
    );
    beltSash.scale.set(1.04, 1, 0.84);
    beltSash.position.set(0, 0.86, 0);
    bodyGroup.add(beltSash);

    const goldBuckle = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.016, 8, 16), goldMat);
    goldBuckle.position.set(0, 0.86, -0.39);
    bodyGroup.add(goldBuckle);

    const sashTail = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.22, 0.022), roseTrimMat);
    sashTail.position.set(-0.08, 0.73, -0.385);
    sashTail.rotation.z = 0.16;
    bodyGroup.add(sashTail);

    const backMartingale = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.095, 0.065),
      deepPinkSatinMat,
    );
    backMartingale.position.set(0, 0.86, 0.365);
    bodyGroup.add(backMartingale);

    // Ornate Gold Pocket Watch (bezel + ivory dial + hands) & Draped Fob Chain (Altın Köstek)
    const watchChain = new THREE.Mesh(
      new THREE.TorusGeometry(0.145, 0.017, 8, 20, Math.PI),
      goldMat,
    );
    watchChain.rotation.z = Math.PI;
    watchChain.position.set(0.08, 1.08, -0.372);
    bodyGroup.add(watchChain);

    const pocketWatch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.062, 0.028, 18),
      goldMat,
    );
    pocketWatch.rotation.x = Math.PI / 2;
    pocketWatch.position.set(0.22, 1.0, -0.372);
    bodyGroup.add(pocketWatch);

    const watchDial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.03, 16),
      new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.15 }),
    );
    watchDial.rotation.x = Math.PI / 2;
    watchDial.position.set(0.22, 1.0, -0.373);
    bodyGroup.add(watchDial);
  }

  // 3. Realistic Anatomical Cockroach Back (Overlapping Veined Tegmina + Maculated Pronotum + Segmented Abdomen + Cerci!)
  const wingPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.15, 0.04),
    new THREE.Vector2(0.28, 0.22),
    new THREE.Vector2(0.35, 0.56),
    new THREE.Vector2(0.36, 0.92),
    new THREE.Vector2(0.27, 1.18),
    new THREE.Vector2(0.09, 1.32),
    new THREE.Vector2(0.0, 1.35),
  ];
  const wingGeo = new THREE.LatheGeometry(wingPts, 24);
  wingGeo.scale(0.92, 1, 0.34);

  const shellGroup = new THREE.Group();
  shellGroup.position.set(0, 0.36, isHahamcan ? 0.31 : isDuktur ? 0.28 : 0.255);
  shellGroup.rotation.x = 0.13;

  // Slightly overlapping left-over-right leathery forewings (tegmina)
  [-0.105, 0.105].forEach((wx, idx) => {
    const elytron = new THREE.Mesh(wingGeo, wingMat);
    elytron.position.set(wx, 0.08, idx === 0 ? 0.012 : 0.0);
    elytron.rotation.z = idx === 0 ? 0.065 : -0.065;
    elytron.rotation.y = idx === 0 ? -0.18 : 0.18;
    elytron.castShadow = true;
    shellGroup.add(elytron);
  });

  // Translucent honey-amber pronotum rim + dark chestnut twin-blotch center shield
  const pronotumRimMat = new THREE.MeshStandardMaterial({
    color: isDiva ? 0xf9a8d4 : 0xb45309,
    roughness: 0.18,
    metalness: 0.1,
  });
  const pronotum = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 14), pronotumRimMat);
  pronotum.scale.set(1.22, 0.52, 0.72);
  pronotum.position.set(0, 1.28, 0.03);
  pronotum.castShadow = true;
  shellGroup.add(pronotum);

  // Characteristic dark mahogany twin-lobe pronotum blotches (Periplaneta macula!)
  const blotchMat = new THREE.MeshStandardMaterial({
    color: isDiva ? 0x500724 : 0x2c1005,
    roughness: 0.15,
  });
  [-0.095, 0.095].forEach((bx) => {
    const blotch = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), blotchMat);
    blotch.scale.set(1.05, 0.72, 0.58);
    blotch.position.set(bx, 1.29, 0.16);
    shellGroup.add(blotch);
  });

  // Scutellum dark triangular ridge between shoulders & wing base
  const scutellum = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 4), blotchMat);
  scutellum.rotation.x = Math.PI;
  scutellum.scale.set(1.15, 1, 0.45);
  scutellum.position.set(0, 1.13, 0.14);
  shellGroup.add(scutellum);

  // Segmented glossy chitinous abdomen tergites peeking cleanly beneath wing tips + twin rear cerci!
  const tergiteMat = new THREE.MeshStandardMaterial({
    color: isDiva ? 0x831843 : 0x431807,
    roughness: 0.24,
    metalness: 0.12,
  });
  [0, 1, 2, 3].forEach((segIdx) => {
    const segRadius = 0.28 - segIdx * 0.045;
    const tergite = new THREE.Mesh(
      new THREE.CylinderGeometry(segRadius + 0.015, segRadius, 0.075, 16, 1, false, -Math.PI * 0.48, Math.PI * 0.96),
      segIdx % 2 === 0 ? tergiteMat : darkChitinMat,
    );
    tergite.scale.set(1.15, 1, 0.65);
    tergite.position.set(0, 0.26 - segIdx * 0.058, 0.01 - segIdx * 0.014);
    shellGroup.add(tergite);
  });

  // Iconic twin pointed segmented cockroach cerci (rear tail feelers)
  [-1, 1].forEach((side) => {
    const cercus = new THREE.Mesh(
      new THREE.ConeGeometry(0.022, 0.18, 8),
      darkChitinMat,
    );
    cercus.position.set(side * 0.085, 0.02, -0.02);
    cercus.rotation.x = Math.PI * 0.82;
    cercus.rotation.z = side * 0.42;
    shellGroup.add(cercus);
  });

  bodyGroup.add(shellGroup);

  // 4. Extra Articulated Spiny Insect Mid-Legs at Waist (with Tibial Cockroach Bristles!)
  [-1, 1].forEach((side) => {
    const subUpper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.032, 0.24, 8),
      chitinLegMat,
    );
    subUpper.position.set(side * 0.43, 0.88, 0.07);
    subUpper.rotation.z = side * 0.92;
    bodyGroup.add(subUpper);

    const subJoint = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), darkChitinMat);
    subJoint.position.set(side * 0.53, 0.82, 0.03);
    bodyGroup.add(subJoint);

    const subLower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.014, 0.24, 8),
      chitinLegMat,
    );
    subLower.position.set(side * 0.54, 0.71, -0.05);
    subLower.rotation.x = -0.75;
    subLower.rotation.z = side * 0.2;
    bodyGroup.add(subLower);

    // Fine cockroach tibial spines along lower insect leg
    [0.76, 0.71, 0.66].forEach((sy) => {
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.055, 5), darkChitinMat);
      spine.position.set(side * 0.56, sy, -0.03 + (0.76 - sy) * 0.2);
      spine.rotation.z = side * -1.15;
      bodyGroup.add(spine);
    });
  });

  // 5. Sculpted Expressive Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, isMechanic ? 1.8 : 1.75, -0.02);
  bodyGroup.add(headGroup);

  const headPts = isMechanic
    ? [
        new THREE.Vector2(0.0, -0.27),
        new THREE.Vector2(0.24, -0.22),
        new THREE.Vector2(0.295, -0.04),
        new THREE.Vector2(0.3, 0.15),
        new THREE.Vector2(0.22, 0.3),
        new THREE.Vector2(0.0, 0.34),
      ]
    : [
        new THREE.Vector2(0.0, -0.27),
        new THREE.Vector2(0.29, -0.21),
        new THREE.Vector2(0.35, -0.02),
        new THREE.Vector2(0.32, 0.16),
        new THREE.Vector2(0.23, 0.29),
        new THREE.Vector2(0.0, 0.33),
      ];
  const craniumGeo = new THREE.LatheGeometry(headPts, 28);
  craniumGeo.scale(1.04, 1, 0.96);
  const cranium = new THREE.Mesh(craniumGeo, skinFaceMat);
  cranium.castShadow = true;
  headGroup.add(cranium);

  // Subtle sculpted warm cheeks for expressive cartoon depth
  const cheekMat = new THREE.MeshStandardMaterial({
    color: isDiva ? 0xd98078 : 0xc78961,
    roughness: 0.45,
  });
  [-1, 1].forEach((side) => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 8), cheekMat);
    cheek.scale.set(1.15, 0.85, 0.65);
    cheek.position.set(side * 0.19, -0.055, isMechanic ? -0.22 : -0.26);
    headGroup.add(cheek);
  });

  // Expressive Eyes (glossy cornea + colored iris + pupil + dual catchlights + curved brows!)
  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.08,
  });
  const irisMat = new THREE.MeshStandardMaterial({
    color: isDiva ? 0x0284c7 : isDuktur ? 0x0369a1 : isHahamcan ? 0x78350f : 0x57260e,
    roughness: 0.12,
  });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.05 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const browMat = new THREE.MeshStandardMaterial({
    color: isHahamcan ? 0xf8fafc : isDiva ? 0x1e1028 : 0x18181b,
    roughness: isHahamcan ? 0.72 : 0.48,
  });

  const eyeY = 0.06;
  const eyeZ = isMechanic ? -0.245 : -0.295;

  [-0.125, 0.125].forEach((ex, idx) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.104, 16, 14), eyeWhiteMat);
    eye.position.set(ex, eyeY, eyeZ);
    headGroup.add(eye);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 12), irisMat);
    iris.position.set(ex * 0.95, eyeY - 0.004, eyeZ - 0.056);
    headGroup.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), pupilMat);
    pupil.position.set(ex * 0.94, eyeY - 0.004, eyeZ - 0.084);
    headGroup.add(pupil);

    const glintMain = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 8), glintMat);
    glintMain.position.set(ex * 0.94 + 0.022, eyeY + 0.022, eyeZ - 0.097);
    headGroup.add(glintMain);

    const glintSub = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), glintMat);
    glintSub.position.set(ex * 0.94 - 0.018, eyeY - 0.018, eyeZ - 0.095);
    headGroup.add(glintSub);

    const lid = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.108,
        14,
        10,
        0,
        Math.PI * 2,
        0,
        Math.PI * (isMechanic ? 0.46 : isHahamcan ? 0.34 : 0.28),
      ),
      skinFaceMat,
    );
    lid.position.set(ex, eyeY + 0.012, eyeZ);
    lid.rotation.x = -0.25;
    headGroup.add(lid);

    // Sculpted Capsule/Curved Brow (much softer & higher quality than plain cubes)
    const brow = new THREE.Mesh(
      new THREE.CapsuleGeometry(isHahamcan ? 0.028 : 0.022, 0.135, 6, 10),
      browMat,
    );
    brow.position.set(ex, eyeY + 0.138, eyeZ - 0.048);
    brow.rotation.z =
      Math.PI / 2 + (idx === 0 ? (isMechanic ? -0.22 : 0.22) : isMechanic ? 0.22 : -0.22);
    headGroup.add(brow);
  });

  // Nose bridge
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.046, 10, 8), skinFaceMat);
  nose.scale.set(1.1, 0.85, 0.92);
  nose.position.set(0, eyeY - 0.075, eyeZ - 0.038);
  headGroup.add(nose);

  // Expressive Mouth
  const mouth = new THREE.Mesh(
    new THREE.SphereGeometry(0.088, 12, 10),
    new THREE.MeshStandardMaterial({
      color: isDiva ? 0xe11d48 : 0x2a1008,
      roughness: isDiva ? 0.16 : 0.72,
    }),
  );
  mouth.scale.set(isCurly ? 1.45 : 1.32, isDiva ? 0.42 : 0.48, 0.45);
  mouth.position.set(0, -0.135, eyeZ + 0.015);
  headGroup.add(mouth);

  const teeth = new THREE.Mesh(
    new THREE.BoxGeometry(0.125, 0.024, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 }),
  );
  teeth.position.set(0, -0.12, eyeZ - 0.012);
  headGroup.add(teeth);

  // 6. Signature Headgear, Hair, Facial Hair & Eyewear per Character
  if (isMechanic) {
    // Classic Turkish Master Mechanic ("Tamirci Kazım") — thick handlebar mustache, chin stubble, slicked dark hair & brass goggles!
    const stacheMat = new THREE.MeshStandardMaterial({
      color: 0x1c1410,
      roughness: 0.65,
    });
    [-1, 1].forEach((side) => {
      const stache = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.11, 6, 10), stacheMat);
      stache.position.set(side * 0.075, -0.095, eyeZ - 0.045);
      stache.rotation.z = Math.PI / 2 + side * 0.28;
      headGroup.add(stache);
    });

    const chinBeard = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), stacheMat);
    chinBeard.scale.set(1.2, 0.55, 0.65);
    chinBeard.position.set(0, -0.22, eyeZ + 0.04);
    headGroup.add(chinBeard);

    // Subtle mechanic side tusks
    [-0.085, 0.085].forEach((mx) => {
      const tusk = new THREE.Mesh(
        new THREE.ConeGeometry(0.02, 0.12, 8),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.28 }),
      );
      tusk.rotation.x = Math.PI - 0.22;
      tusk.position.set(mx, -0.19, eyeZ - 0.03);
      headGroup.add(tusk);
    });

    // Sleek dark pompadour hair + silver temple streaks
    const hairTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.245, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35 }),
    );
    hairTop.scale.set(1.04, 0.6, 1.18);
    hairTop.position.set(0, 0.28, 0.03);
    headGroup.add(hairTop);

    const goggleStrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.026, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 }),
    );
    goggleStrap.rotation.x = Math.PI / 2 - 0.12;
    goggleStrap.position.set(0, 0.23, 0);
    headGroup.add(goggleStrap);

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.2,
    });
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0369a1,
      emissiveIntensity: 0.22,
      roughness: 0.06,
      metalness: 0.18,
      transparent: true,
      opacity: 0.88,
    });
    [-0.108, 0.108].forEach((gx) => {
      const cup = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.019, 10, 22), brassMat);
      cup.position.set(gx, 0.255, -0.28);
      cup.rotation.x = -0.24;
      headGroup.add(cup);

      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.071, 0.071, 0.022, 18), lensMat);
      glass.rotation.x = Math.PI / 2 - 0.24;
      glass.position.set(gx, 0.255, -0.275);
      headGroup.add(glass);

      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), brassMat);
      rivet.position.set(gx < 0 ? -0.27 : 0.27, 0.22, -0.14);
      headGroup.add(rivet);
    });
    const goggleBridge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.022, 0.022), brassMat);
    goggleBridge.position.set(0, 0.26, -0.285);
    headGroup.add(goggleBridge);
  } else if (isCurly) {
    // Rich Multi-Tone Voluminous Curly Afro Hair ("Kıvırcık Rıza") + Gold Stud Earring!
    const darkCurlMat = new THREE.MeshStandardMaterial({
      color: 0x111116,
      roughness: 0.72,
    });
    const warmCurlMat = new THREE.MeshStandardMaterial({
      color: 0x24150d,
      roughness: 0.68,
    });

    const curls: [number, number, number, number][] = [
      [0, 0.35, 0.02, 0.16],
      [-0.17, 0.32, -0.06, 0.135],
      [0.17, 0.32, -0.06, 0.135],
      [-0.3, 0.21, 0.04, 0.135],
      [0.3, 0.21, 0.04, 0.135],
      [0, 0.32, -0.19, 0.13],
      [-0.14, 0.285, -0.225, 0.12],
      [0.14, 0.285, -0.225, 0.12],
      [-0.27, 0.23, -0.14, 0.115],
      [0.27, 0.23, -0.14, 0.115],
      [0, 0.29, 0.21, 0.145],
      [-0.19, 0.24, 0.2, 0.14],
      [0.19, 0.24, 0.2, 0.14],
      [-0.31, 0.1, 0.16, 0.13],
      [0.31, 0.1, 0.16, 0.13],
      [0, 0.14, 0.28, 0.14],
      [-0.16, 0.1, 0.27, 0.125],
      [0.16, 0.1, 0.27, 0.125],
      [-0.33, -0.02, 0.04, 0.095],
      [0.33, -0.02, 0.04, 0.095],
      [-0.08, 0.42, 0.09, 0.115],
      [0.09, 0.41, 0.08, 0.115],
      [0, 0.38, -0.11, 0.12],
    ];
    curls.forEach(([hx, hy, hz, r], idx) => {
      const curl = new THREE.Mesh(
        new THREE.SphereGeometry(r, 12, 10),
        idx % 3 === 1 ? warmCurlMat : darkCurlMat,
      );
      curl.position.set(hx, hy, hz);
      headGroup.add(curl);
    });

    // Cool neighborhood gold earring stud on left ear side
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), goldMat);
    stud.position.set(-0.34, -0.08, -0.02);
    headGroup.add(stud);
  } else if (isDiva) {
    // Glamorous High-Fashion Diva ("Gözlüklü Diva"): Swept Hair + Bun + Eyelashes + Cat-Eye Designer Sunglasses + 5-Point Jeweled Tiara!
    const divaHairMat = new THREE.MeshStandardMaterial({
      color: 0x240f33,
      roughness: 0.34,
      metalness: 0.14,
    });

    const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.325, 18, 14), divaHairMat);
    hairCrown.scale.set(1.05, 0.64, 1.08);
    hairCrown.position.set(0, 0.18, 0.06);
    headGroup.add(hairCrown);

    [-1, 1].forEach((side) => {
      const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.28, 6, 12), divaHairMat);
      lock.position.set(side * 0.31, 0.01, 0.03);
      lock.rotation.z = side * -0.16;
      headGroup.add(lock);
    });

    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), divaHairMat);
    bun.position.set(0, 0.34, 0.18);
    headGroup.add(bun);

    // Sculpted curled glam eyelashes + cat-eye sunglasses + pearl-gold earrings
    const chicLensMat = new THREE.MeshStandardMaterial({
      color: 0x3b0764,
      roughness: 0.06,
      metalness: 0.25,
      transparent: true,
      opacity: 0.82,
    });
    const pearlMat = new THREE.MeshStandardMaterial({
      color: 0xfff1f2,
      roughness: 0.12,
    });

    [-1, 1].forEach((side) => {
      // Curled eyelash flare
      const lash = new THREE.Mesh(
        new THREE.ConeGeometry(0.018, 0.085, 6),
        new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 }),
      );
      lash.position.set(side * 0.215, eyeY + 0.055, eyeZ - 0.055);
      lash.rotation.z = side * -0.85;
      headGroup.add(lash);

      const lensGroup = new THREE.Group();
      lensGroup.position.set(side * 0.138, eyeY + 0.008, eyeZ - 0.12);
      lensGroup.rotation.y = side * -0.18;
      lensGroup.rotation.z = side * 0.14; // Dramatic cat-eye tilt!

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.106, 0.015, 10, 24), goldMat);
      rim.scale.set(1.18, 0.88, 1);
      lensGroup.add(rim);

      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.104, 0.104, 0.018, 22),
        chicLensMat,
      );
      glass.rotation.x = Math.PI / 2;
      glass.scale.set(1.15, 1, 0.86);
      lensGroup.add(glass);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.02, 0.31), goldMat);
      arm.position.set(side * 0.118, 0.01, 0.155);
      lensGroup.add(arm);

      headGroup.add(lensGroup);

      // Gold hoop + pearl drop earrings
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.011, 8, 16), goldMat);
      hoop.rotation.y = Math.PI / 2;
      hoop.position.set(side * 0.355, -0.09, -0.02);
      headGroup.add(hoop);

      const dropPearl = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), pearlMat);
      dropPearl.position.set(side * 0.355, -0.15, -0.02);
      headGroup.add(dropPearl);
    });

    const bridge = new THREE.Mesh(
      new THREE.TorusGeometry(0.044, 0.012, 8, 12, Math.PI),
      goldMat,
    );
    bridge.position.set(0, eyeY + 0.016, eyeZ - 0.122);
    headGroup.add(bridge);

    // 5-Point Jeweled Golden Tiara Crown
    const tiaraGroup = new THREE.Group();
    tiaraGroup.position.set(0, 0.365, -0.02);

    const tiaraRing = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.019, 8, 24), goldMat);
    tiaraRing.rotation.x = Math.PI / 2 - 0.12;
    tiaraGroup.add(tiaraRing);

    const rubyMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.55,
      roughness: 0.06,
    });

    [-0.13, -0.065, 0, 0.065, 0.13].forEach((tx, idx) => {
      const h = idx === 2 ? 0.165 : idx === 1 || idx === 3 ? 0.115 : 0.08;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.027, h, 4), goldMat);
      spire.position.set(tx, h * 0.5, -0.18 + Math.abs(tx) * 0.45);
      tiaraGroup.add(spire);

      if (idx === 2) {
        const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.036, 0), rubyMat);
        jewel.position.set(0, 0.072, -0.205);
        tiaraGroup.add(jewel);
      } else if (idx === 1 || idx === 3) {
        const pearlTip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), pearlMat);
        pearlTip.position.set(tx, h + 0.008, -0.18 + Math.abs(tx) * 0.45);
        tiaraGroup.add(pearlTip);
      }
    });
    headGroup.add(tiaraGroup);
  } else if (isDuktur) {
    // Emergency Physician ("Acilci Duktur"): Neat parted hair + thin half-rim silver glasses + sky-blue headband + concave chrome surgical head mirror!
    const docHairMat = new THREE.MeshStandardMaterial({
      color: 0x2c1b12,
      roughness: 0.46,
    });
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.305, 16, 12), docHairMat);
    hairCap.scale.set(1.03, 0.58, 1.06);
    hairCap.position.set(0, 0.21, 0.05);
    headGroup.add(hairCap);

    // Smart side hair swoosh
    const hairPart = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.16, 6, 10), docHairMat);
    hairPart.rotation.z = 1.2;
    hairPart.position.set(0.07, 0.29, -0.12);
    headGroup.add(hairPart);

    // Thin silver half-rim doctor spectacles (completely distinct from Diva & Hahamcan!)
    const docGlassMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.05,
      transparent: true,
      opacity: 0.28,
    });
    [-0.125, 0.125].forEach((gx) => {
      const topRim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.014, 0.016), chromeMat);
      topRim.position.set(gx, eyeY + 0.055, eyeZ - 0.105);
      headGroup.add(topRim);

      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.085, 0.008), docGlassMat);
      pane.position.set(gx, eyeY + 0.01, eyeZ - 0.103);
      headGroup.add(pane);
    });
    const silverBridge = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.014, 0.014), chromeMat);
    silverBridge.position.set(0, eyeY + 0.052, eyeZ - 0.105);
    headGroup.add(silverBridge);

    // Sky-blue headband + articulated chrome surgical head mirror
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.325, 0.028, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.35 }),
    );
    band.rotation.x = Math.PI / 2 - 0.08;
    band.position.set(0, 0.2, 0);
    headGroup.add(band);

    const mirrorMount = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.06), chromeMat);
    mirrorMount.position.set(0, 0.22, -0.32);
    headGroup.add(mirrorMount);

    const mirrorDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.115, 0.035, 22),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        metalness: 0.98,
        roughness: 0.04,
      }),
    );
    mirrorDisc.rotation.x = Math.PI / 2 - 0.12;
    mirrorDisc.position.set(0, 0.23, -0.355);
    headGroup.add(mirrorDisc);

    const mirrorHole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.038, 12),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }),
    );
    mirrorHole.rotation.x = Math.PI / 2 - 0.12;
    mirrorHole.position.set(0, 0.23, -0.357);
    headGroup.add(mirrorHole);
  } else if (isHahamcan) {
    // Wise Master ("Hahamcan"): Multi-layered snow-white sculpted beard, curled handlebar mustache, classic sidelocks, round gold-wire glasses & pinched Homburg hat with pink-gold band!
    const beardMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.76,
    });

    const beardCore = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.46, 18), beardMat);
    beardCore.rotation.x = Math.PI - 0.12;
    beardCore.scale.set(1.16, 1, 0.68);
    beardCore.position.set(0, -0.27, -0.21);
    headGroup.add(beardCore);

    // Tiered beard locks + classic curved sage sidelocks + curled handlebar mustache
    const beardTip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), beardMat);
    beardTip.scale.set(0.95, 1.35, 0.7);
    beardTip.position.set(0, -0.39, -0.23);
    headGroup.add(beardTip);

    [-1, 1].forEach((side) => {
      const sideBeard = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), beardMat);
      sideBeard.scale.set(0.88, 1.4, 0.74);
      sideBeard.position.set(side * 0.15, -0.18, -0.2);
      headGroup.add(sideBeard);

      const sidelock = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.036, 0.22, 6, 8),
        beardMat,
      );
      sidelock.position.set(side * 0.31, -0.02, -0.04);
      sidelock.rotation.z = side * 0.12;
      headGroup.add(sidelock);

      const stache = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.12, 6, 10), beardMat);
      stache.position.set(side * 0.08, -0.095, eyeZ - 0.044);
      stache.rotation.z = Math.PI / 2 + side * 0.25;
      headGroup.add(stache);

      const stacheCurl = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 8), beardMat);
      stacheCurl.position.set(side * 0.165, -0.105, eyeZ - 0.03);
      headGroup.add(stacheCurl);
    });

    // Classic Round Gold-Wire Spectacles with glossy glass lenses
    const sageLensMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.06,
      transparent: true,
      opacity: 0.24,
    });
    [-0.125, 0.125].forEach((gx) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.013, 10, 22), goldMat);
      rim.position.set(gx, eyeY, eyeZ - 0.106);
      headGroup.add(rim);

      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.088, 0.088, 0.008, 18),
        sageLensMat,
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(gx, eyeY, eyeZ - 0.105);
      headGroup.add(lens);
    });
    const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.014, 0.014), goldMat);
    noseBridge.position.set(0, eyeY + 0.01, eyeZ - 0.106);
    headGroup.add(noseBridge);

    // Sculpted Master's Homburg Hat with Curved Upturned Brim & Pink-Gold Satin Band
    const hatMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b2e,
      roughness: 0.56,
    });
    const brimPts = [
      new THREE.Vector2(0.28, 0.0),
      new THREE.Vector2(0.42, 0.004),
      new THREE.Vector2(0.51, 0.025),
      new THREE.Vector2(0.525, 0.048),
      new THREE.Vector2(0.505, 0.055),
      new THREE.Vector2(0.41, 0.022),
      new THREE.Vector2(0.28, 0.018),
    ];
    const brim = new THREE.Mesh(new THREE.LatheGeometry(brimPts, 28), hatMat);
    brim.position.set(0, 0.245, 0.01);
    headGroup.add(brim);

    const crownPts = [
      new THREE.Vector2(0.33, 0.0),
      new THREE.Vector2(0.32, 0.14),
      new THREE.Vector2(0.28, 0.27),
      new THREE.Vector2(0.22, 0.3),
      new THREE.Vector2(0.11, 0.275),
      new THREE.Vector2(0.0, 0.27),
    ];
    const crown = new THREE.Mesh(new THREE.LatheGeometry(crownPts, 26), hatMat);
    crown.position.set(0, 0.265, 0.01);
    headGroup.add(crown);

    const pinkHatBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.334, 0.058, 24),
      new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.38 }),
    );
    pinkHatBand.position.set(0, 0.305, 0.01);
    headGroup.add(pinkHatBand);

    const goldHatTrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.336, 0.336, 0.016, 24),
      goldMat,
    );
    goldHatTrim.position.set(0, 0.276, 0.01);
    headGroup.add(goldHatTrim);
  }

  // 7. Long Curved Segmented Antennae with Realistic Scape/Pedicel Sockets & Sensory Tips
  const buildAntenna = (side: number) => {
    const scape = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 8, 8),
      chitinLegMat,
    );
    scape.position.set(side * 0.09, 0.27, -0.05);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.09, 0.27, -0.05),
      new THREE.Vector3(side * 0.29, 0.64, 0.08),
      new THREE.Vector3(side * 0.49, 0.8, 0.34),
    ]);
    const ant = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 16, 0.021, 7, false),
      darkChitinMat,
    );
    ant.add(scape);
    const tipBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 8, 8),
      isDiva ? goldMat : chitinLegMat,
    );
    tipBulb.position.set(side * 0.49, 0.8, 0.34);
    ant.add(tipBulb);
    headGroup.add(ant);
    return ant;
  };
  const leftAntenna = buildAntenna(-1);
  const rightAntenna = buildAntenna(1);

  // 8. Articulated Arms with Character-Specific Sleeves, Cuffs & Realistic Chitin/Gloved Hands
  const gloveMat = isMechanic
    ? new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.68 })
    : isDuktur
      ? new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.32 })
      : isDiva
        ? new THREE.MeshStandardMaterial({ color: 0xbe185d, roughness: 0.4 })
        : chitinLegMat;

  const buildArm = (side: number) => {
    const arm = new THREE.Group();
    arm.position.set(side * (isMechanic ? 0.42 : 0.45), 1.4, 0);

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.128, 12, 10), outfitMat);
    arm.add(shoulder);

    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.112, 0.09, 0.32, 12),
      outfitMat,
    );
    sleeve.position.set(side * 0.03, -0.16, 0);
    sleeve.rotation.z = side * 0.14;
    sleeve.castShadow = true;
    arm.add(sleeve);

    // Character-specific sleeve cuff / wrist detail
    if (isCurly) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.064, 0.07, 12),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 }),
      );
      band.position.set(side * 0.055, -0.43, -0.13);
      band.rotation.x = -0.6;
      arm.add(band);
    } else if (isDiva) {
      const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.015, 8, 16), goldMat);
      bangle.rotation.x = Math.PI / 2 - 0.6;
      bangle.position.set(side * 0.055, -0.42, -0.12);
      arm.add(bangle);
    } else if (isHahamcan) {
      const coatCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.098, 0.102, 0.095, 14),
        new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.48 }),
      );
      coatCuff.position.set(side * 0.055, -0.38, -0.09);
      coatCuff.rotation.x = -0.6;
      arm.add(coatCuff);

      const shirtCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.054, 0.05, 12),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 }),
      );
      shirtCuff.position.set(side * 0.058, -0.44, -0.14);
      shirtCuff.rotation.x = -0.6;
      arm.add(shirtCuff);
    }

    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.048, 0.3, 10),
      isMechanic || isHahamcan || isDuktur ? outfitMat : skinFaceMat,
    );
    forearm.position.set(side * 0.06, -0.39, -0.1);
    forearm.rotation.x = -0.6;
    arm.add(forearm);

    // Sculpted palm + thumb + articulated fingers silhouette
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.074, 10, 10), gloveMat);
    hand.scale.set(0.92, 1.08, 0.85);
    hand.position.set(side * 0.06, -0.5, -0.2);
    arm.add(hand);

    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.045, 4, 6), gloveMat);
    thumb.position.set(side * 0.015, -0.49, -0.25);
    thumb.rotation.x = 0.55;
    arm.add(thumb);

    [-0.022, 0.015].forEach((fx) => {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.045, 4, 6), gloveMat);
      finger.position.set(side * 0.06 + fx, -0.55, -0.22);
      finger.rotation.x = -0.35;
      arm.add(finger);
    });

    bodyGroup.add(arm);
    return arm;
  };
  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // 9. Articulated Legs + Sculpted Character-Specific Footwear grounded at y = 0
  const soleMat = new THREE.MeshStandardMaterial({
    color: isHahamcan ? 0x1c1917 : isMechanic ? 0x0f172a : 0xf8fafc,
    roughness: 0.5,
  });
  const shoeUpperMat = new THREE.MeshStandardMaterial({
    color: isMechanic
      ? 0x78350f
      : isHahamcan
        ? 0x29150b
        : isDuktur
          ? 0xf8fafc
          : isDiva
            ? 0x9d174d
            : skin.accentColor,
    roughness: isHahamcan || isDiva ? 0.2 : 0.38,
    metalness: isDiva ? 0.2 : 0.06,
  });
  const shoeTrimMat = new THREE.MeshStandardMaterial({
    color: isMechanic ? 0x94a3b8 : isDiva ? 0xfbbf24 : isDuktur ? 0x0ea5e9 : 0xf8fafc,
    roughness: isMechanic || isDiva ? 0.22 : 0.4,
    metalness: isMechanic || isDiva ? 0.85 : 0.05,
  });

  const buildLeg = (side: number) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.22, 0.66, 0);

    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.122, 0.094, 0.38, 12),
      pantsMat,
    );
    thigh.position.set(0, -0.18, 0);
    thigh.castShadow = true;
    leg.add(thigh);

    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.058, 0.28, 10),
      isMechanic || isHahamcan ? pantsMat : chitinLegMat,
    );
    shin.position.set(0, -0.44, 0);
    leg.add(shin);

    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), shoeUpperMat);
    shoe.scale.set(0.92, 0.58, 1.54);
    shoe.position.set(0, -0.56, -0.06);
    shoe.castShadow = true;
    leg.add(shoe);

    // Toe-cap / shoe buckle / heel accent for extra crisp silhouette
    const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), shoeTrimMat);
    toeCap.scale.set(0.95, 0.56, 0.85);
    toeCap.position.set(0, -0.57, -0.175);
    leg.add(toeCap);

    if (isHahamcan) {
      const shoeBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.025), goldMat);
      shoeBuckle.position.set(0, -0.515, -0.11);
      leg.add(shoeBuckle);
    } else if (isCurly || isDuktur) {
      const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.05), shoeTrimMat);
      tongue.position.set(0, -0.495, -0.06);
      tongue.rotation.x = -0.35;
      leg.add(tongue);
    }

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.058, 0.33), soleMat);
    sole.position.set(0, -0.625, -0.06);
    leg.add(sole);

    bodyGroup.add(leg);
    return leg;
  };
  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  // 10. Headlamp Mesh (positioned cleanly per headgear so it never clips inside hats/mirrors)
  const headlampMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    }),
  );
  headlampMesh.rotation.x = Math.PI / 2;
  headlampMesh.position.set(
    0,
    isHahamcan ? 0.26 : 0.25,
    isHahamcan ? -0.49 : isDuktur ? -0.38 : -0.35,
  );
  headlampMesh.visible = false;
  headGroup.add(headlampMesh);

  // 11. Twin-Thruster Subway Surfers Jetpack + Legacy Wing Slots
  const flightWingMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x0284c7,
    emissiveIntensity: 0.42,
    transparent: true,
    opacity: 0.78,
    roughness: 0.12,
    metalness: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const flightWingGeo = new THREE.PlaneGeometry(1.18, 0.44);
  flightWingGeo.translate(0.59, 0, 0);

  const leftWing = new THREE.Mesh(flightWingGeo, flightWingMat);
  leftWing.position.set(-0.18, 1.38, 0.24);
  leftWing.rotation.set(0.28, Math.PI + 0.15, -0.18);
  leftWing.visible = false;
  bodyGroup.add(leftWing);

  const rightWing = new THREE.Mesh(flightWingGeo, flightWingMat);
  rightWing.position.set(0.18, 1.38, 0.24);
  rightWing.rotation.set(0.28, -0.15, 0.18);
  rightWing.visible = false;
  bodyGroup.add(rightWing);

  const jetpack = createJetpackAssembly(true);
  jetpack.group.position.set(0, 1.12, 0.48);
  jetpack.group.rotation.x = 0.06;
  jetpack.group.visible = false;
  bodyGroup.add(jetpack.group);

  // 12. Shield Bubble
  const shieldSphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.24, 20, 16),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      depthWrite: false,
    }),
  );
  shieldSphere.position.set(0, 1.15, 0);
  shieldSphere.visible = false;
  root.add(shieldSphere);

  // Batch static sub-parts inside articulated limbs & torso while preserving animations & textured garments
  bakeStaticGroup(headGroup, {
    castShadow: true,
    keepTransparent: true,
    keepTextured: true,
    skipObjects: new Set<THREE.Object3D>([leftAntenna, rightAntenna, headlampMesh]),
  });
  bakeStaticGroup(leftArm, { castShadow: true, keepTextured: true });
  bakeStaticGroup(rightArm, { castShadow: true, keepTextured: true });
  bakeStaticGroup(leftLeg, { castShadow: true, keepTextured: true });
  bakeStaticGroup(rightLeg, { castShadow: true, keepTextured: true });
  bakeStaticGroup(bodyGroup, {
    castShadow: true,
    keepTransparent: true,
    keepTextured: true,
    skipObjects: new Set<THREE.Object3D>([
      headGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      leftWing,
      rightWing,
      jetpack.group,
    ]),
  });

  return {
    root,
    rollPivot,
    bodyGroup,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    leftAntenna,
    rightAntenna,
    leftWing,
    rightWing,
    jetpackGroup: jetpack.group,
    leftJetFlame: jetpack.leftFlame,
    rightJetFlame: jetpack.rightFlame,
    leftNozzleTip: jetpack.leftNozzleTip,
    rightNozzleTip: jetpack.rightNozzleTip,
    headlampMesh,
    shieldSphere,
  };
}

const spectatorCache = new Map<SkinId, THREE.Group>();

export function createSpectatorCockroachModel(
  skin: SkinConfig,
  chitinWingTexture?: THREE.Texture,
  fabricWeaveTexture?: THREE.Texture,
): THREE.Group {
  let template = spectatorCache.get(skin.id);
  if (!template) {
    const rig = createCockroachModel(skin, chitinWingTexture, fabricWeaveTexture);
    rig.headlampMesh.removeFromParent();
    rig.leftWing.removeFromParent();
    rig.rightWing.removeFromParent();
    rig.jetpackGroup.removeFromParent();
    rig.shieldSphere.removeFromParent();
    bakeStaticGroup(rig.root, {
      castShadow: false,
      receiveShadow: false,
      keepTransparent: true,
      keepTextured: true,
    });
    rig.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        obj.userData.sharedAsset = true;
      }
    });
    template = rig.root;
    spectatorCache.set(skin.id, template);
  }
  return template.clone(true);
}

/**
 * Ana Sayfa ve Mağaza Vitrin Platformu (Işıklı 3D Altıgen Podyum)
 */
export function createShowcasePedestal(): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.42, 1.62, 0.24, 6),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.72,
      roughness: 0.28,
    }),
  );
  base.position.y = 0.12;
  base.receiveShadow = true;
  group.add(base);

  const innerDeck = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.16, 0.04, 6),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.5,
      roughness: 0.35,
    }),
  );
  innerDeck.position.y = 0.25;
  innerDeck.receiveShadow = true;
  group.add(innerDeck);

  const glowRing = new THREE.Mesh(
    new THREE.RingGeometry(1.06, 1.24, 6),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
    }),
  );
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.y = 0.275;
  group.add(glowRing);

  const auraCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(1.22, 1.22, 1.55, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.11,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  auraCylinder.position.y = 1.02;
  group.add(auraCylinder);

  return bakeStaticGroup(group, { receiveShadow: true, keepTransparent: true });
}

// --- City Street Obstacles ---

export function createTaxiModel(isOncoming = false): THREE.Group {
  const group = new THREE.Group();
  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.22,
    metalness: 0.32,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.12,
    metalness: 0.8,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.72, 3.6), yellowMat);
  body.position.set(0, 0.62, 0);
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.64, 1.95), yellowMat);
  cabin.position.set(0, 1.28, isOncoming ? 0.1 : -0.1);
  cabin.castShadow = true;
  group.add(cabin);

  const windshields = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.5, 2.02), glassMat);
  windshields.position.set(0, 1.26, isOncoming ? 0.1 : -0.1);
  group.add(windshields);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.2, 0.26),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
    }),
  );
  sign.position.set(0, 1.7, isOncoming ? 0.1 : -0.1);
  group.add(sign);

  const tailZ = isOncoming ? -1.81 : 1.81;
  [-0.68, 0.68].forEach((lx) => {
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.16, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 1.2,
      }),
    );
    tail.position.set(lx, 0.72, tailZ);
    group.add(tail);
  });

  const wheels: THREE.Mesh[] = [];
  [
    [-0.9, 1.05],
    [0.9, 1.05],
    [-0.9, -1.05],
    [0.9, -1.05],
  ].forEach(([wx, wz]) => {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.24, 16),
      tireMat,
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.32, wz);
    group.add(wheel);
    wheels.push(wheel);
  });
  group.userData.wheels = wheels;

  return bakeStaticGroup(group, {
    castShadow: true,
    skipObjects: isOncoming ? new Set<THREE.Object3D>(wheels) : undefined,
  });
}

export function createDumpsterModel(): THREE.Group {
  const group = new THREE.Group();
  const greenMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.45,
    metalness: 0.35,
  });
  const lidMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });

  const bin = new THREE.Mesh(new THREE.BoxGeometry(1.72, 1.25, 1.4), greenMat);
  bin.position.y = 0.78;
  bin.castShadow = true;
  group.add(bin);

  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 1.48), lidMat);
  lid.position.y = 1.46;
  lid.castShadow = true;
  group.add(lid);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.14, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0x854d0e }),
  );
  stripe.position.set(0, 0.95, 0.71);
  group.add(stripe);

  [
    [-0.65, 0.5],
    [0.65, 0.5],
    [-0.65, -0.5],
    [0.65, -0.5],
  ].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10), lidMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.14, wz);
    group.add(w);
  });

  return bakeStaticGroup(group, { castShadow: true, forceLambert: true });
}

export function createConeBarrierModel(): THREE.Group {
  const group = new THREE.Group();
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x94a3b8,
    emissiveIntensity: 0.25,
    roughness: 0.3,
  });

  [-0.58, 0.58].forEach((cx) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.56), orangeMat);
    base.position.set(cx, 0.04, 0);
    group.add(base);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 14), orangeMat);
    cone.position.set(cx, 0.46, 0);
    cone.castShadow = true;
    group.add(cone);

    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 14), whiteMat);
    band.position.set(cx, 0.52, 0);
    group.add(band);
  });

  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.18, 0.12), whiteMat);
  bar.position.set(0, 0.68, 0);
  bar.castShadow = true;
  group.add(bar);

  return bakeStaticGroup(group, { castShadow: true, forceLambert: true });
}

export function createRoadSignHighModel(): THREE.Group {
  const group = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.65,
    roughness: 0.35,
  });
  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0x854d0e,
    emissiveIntensity: 0.2,
    roughness: 0.35,
  });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });

  [-0.95, 0.95].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.5, 10), metalMat);
    post.position.set(px, 1.25, 0);
    post.castShadow = true;
    group.add(post);
  });

  const board = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.65, 0.2), yellowMat);
  board.position.set(0, 1.85, 0);
  board.castShadow = true;
  group.add(board);

  [-0.65, 0, 0.65].forEach((sx) => {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.67, 0.22), redMat);
    stripe.position.set(sx, 1.85, 0);
    group.add(stripe);
  });

  return bakeStaticGroup(group, { castShadow: true });
}

export function createTireModel(): THREE.Group {
  const group = new THREE.Group();
  const spinPivot = new THREE.Group();
  spinPivot.position.y = 0.77;
  group.add(spinPivot);
  group.userData.spinPivot = spinPivot;

  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.8,
    roughness: 0.25,
  });

  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.22, 12, 22), rubberMat);
  torus.castShadow = true;
  spinPivot.add(torus);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.24, 14), rimMat);
  hub.rotation.x = Math.PI / 2;
  spinPivot.add(hub);

  bakeStaticGroup(spinPivot, { castShadow: true });
  return group;
}

export function createPhoneRoachObstacle(
  skin: SkinConfig,
  chitinWingTexture?: THREE.Texture,
  fabricWeaveTexture?: THREE.Texture,
): THREE.Group {
  const rig = createCockroachModel(skin, chitinWingTexture, fabricWeaveTexture);
  rig.headlampMesh.removeFromParent();
  rig.leftWing.removeFromParent();
  rig.rightWing.removeFromParent();
  rig.jetpackGroup.removeFromParent();
  rig.shieldSphere.removeFromParent();

  rig.root.rotation.y = Math.PI;
  rig.headGroup.rotation.x = 0.32;
  rig.leftArm.rotation.x = 0.9;
  rig.rightArm.rotation.x = 0.9;

  const phone = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.46, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.1,
      roughness: 0.2,
    }),
  );
  phone.position.set(0, 1.25, -0.46);
  phone.rotation.x = -0.5;
  rig.bodyGroup.add(phone);

  return bakeStaticGroup(rig.root, {
    castShadow: true,
    keepTransparent: true,
    keepTextured: true,
  });
}

let sharedSimitGeo: THREE.TorusGeometry | null = null;
let sharedSimitMat: THREE.MeshStandardMaterial | null = null;

export function createSimitCoinModel(): THREE.Group {
  if (!sharedSimitGeo) {
    sharedSimitGeo = new THREE.TorusGeometry(0.32, 0.12, 8, 14);
  }
  if (!sharedSimitMat) {
    sharedSimitMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: 0.3,
      metalness: 0.55,
      roughness: 0.28,
    });
  }
  const group = new THREE.Group();
  const simit = new THREE.Mesh(sharedSimitGeo, sharedSimitMat);
  simit.position.y = 0.6;
  simit.userData.sharedAsset = true;
  group.add(simit);
  return group;
}

export function createPowerupModel(type: PowerupType): THREE.Group {
  const group = new THREE.Group();
  const colorMap: Record<PowerupType, number> = {
    magnet: 0xa855f7,
    shield: 0x38bdf8,
    flashlight: 0xfacc15,
    turbo: 0xf97316,
    wings: 0x39ff14,
  };
  const color = colorMap[type];

  if (type === 'wings') {
    // Unmistakable Subway Surfers-style glowing 3D Jetpack pickup + light pillar beacon!
    const beaconBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.85, 4.4, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    beaconBeam.position.y = 2.2;
    group.add(beaconBeam);

    const floorRing = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.88, 24),
      new THREE.MeshBasicMaterial({
        color: 0x39ff14,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      }),
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.06;
    group.add(floorRing);

    const outerHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.065, 10, 26),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.9,
      }),
    );
    outerHalo.position.y = 1.45;
    group.add(outerHalo);

    const innerHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.045, 8, 24),
      new THREE.MeshBasicMaterial({
        color: 0x39ff14,
      }),
    );
    innerHalo.rotation.x = Math.PI / 3;
    innerHalo.position.y = 1.45;
    group.add(innerHalo);

    const jetpackPickup = createJetpackAssembly(false);
    jetpackPickup.group.scale.setScalar(1.42);
    jetpackPickup.group.position.set(0, 1.52, 0);
    jetpackPickup.group.rotation.set(0.28, 0.35, -0.2);
    jetpackPickup.leftFlame.scale.set(0.85, 0.65, 0.85);
    jetpackPickup.rightFlame.scale.set(0.85, 0.65, 0.85);
    group.add(jetpackPickup.group);

    return bakeStaticGroup(group, { keepTransparent: true });
  }

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.06, 8, 22),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    }),
  );
  halo.position.y = 1.15;
  group.add(halo);

  const floorRing = new THREE.Mesh(
    new THREE.RingGeometry(0.46, 0.64, 20),
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    }),
  );
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.y = 0.06;
  group.add(floorRing);

  const coreMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.6,
  });

  if (type === 'magnet') {
    const uShape = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.1, 10, 18, Math.PI),
      coreMat,
    );
    uShape.position.y = 1.15;
    group.add(uShape);
  } else if (type === 'flashlight') {
    const bulb = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.54, 12), coreMat);
    bulb.rotation.z = Math.PI / 4;
    bulb.position.y = 1.15;
    group.add(bulb);
  } else if (type === 'shield') {
    const oct = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), coreMat);
    oct.position.y = 1.15;
    group.add(oct);
  } else {
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.6, 6), coreMat);
    bolt.position.y = 1.15;
    group.add(bolt);
  }

  return bakeStaticGroup(group, { keepTransparent: true });
}

export function createStreetLampModel(): THREE.Group {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.78,
    roughness: 0.3,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.5,
    roughness: 0.35,
  });

  // Fluted cast-iron base pedestal
  const basePedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.24, 0.65, 8),
    poleMat,
  );
  basePedestal.position.y = 0.325;
  group.add(basePedestal);

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.17, 0.14, 8),
    trimMat,
  );
  collar.position.y = 0.68;
  group.add(collar);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.115, 5.65, 8), poleMat);
  pole.position.y = 3.5;
  group.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.1, 0.11), poleMat);
  arm.position.set(0.62, 6.22, 0);
  group.add(arm);

  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.06), poleMat);
  brace.position.set(0.28, 5.95, 0);
  brace.rotation.z = 0.68;
  group.add(brace);

  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.16, 8), poleMat);
  hood.position.set(1.18, 6.14, 0);
  group.add(hood);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfef08a }),
  );
  bulb.position.set(1.18, 5.98, 0);
  group.add(bulb);

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(1.5, 5.2, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.085,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  cone.position.set(1.18, 3.28, 0);
  group.add(cone);

  return bakeStaticGroup(group, { keepTransparent: true });
}

export function createCityTreeModel(): THREE.Group {
  const group = new THREE.Group();

  // Sidewalk stone planter border
  const pitCurb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.66, 0.72, 0.18, 8),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 }),
  );
  pitCurb.position.y = 0.09;
  group.add(pitCurb);

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.54, 0.54, 0.19, 8),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.96 }),
  );
  soil.position.y = 0.095;
  group.add(soil);

  const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 2.35, 8), barkMat);
  trunk.position.y = 1.25;
  trunk.castShadow = true;
  group.add(trunk);

  const darkLeafMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
  const brightLeafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.75 });
  (
    [
      [0, 2.85, 0, 1.05, false],
      [-0.5, 2.4, 0.24, 0.72, false],
      [0.48, 2.45, -0.22, 0.74, true],
      [0.05, 3.35, 0.12, 0.68, true],
    ] as const
  ).forEach(([lx, ly, lz, r, bright]) => {
    const crown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(r, 1),
      bright ? brightLeafMat : darkLeafMat,
    );
    crown.position.set(lx, ly, lz);
    crown.castShadow = true;
    group.add(crown);
  });

  return bakeStaticGroup(group, { castShadow: true });
}

/**
 * Lightweight unbaked Turkish Mahalle building facade extras & sidewalk props.
 * Caller attaches to cityGroup BEFORE bakeStaticGroup() so all opaque meshes merge
 * into 1-2 static draw calls with zero per-frame allocations or dynamic lights.
 */
export function createMahalleSegmentDecor(
  segIndex: number,
  side: -1 | 1,
  height: number,
  awningColorHex: number,
): THREE.Group {
  const group = new THREE.Group();
  const faceX = side * 7.5; // Front face of sidewalk-side building (11.1 - 7.2/2)
  const inward = -side; // Direction pointing toward street center

  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.55,
    roughness: 0.45,
  });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.78 });
  const glassGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const awningMainMat = new THREE.MeshStandardMaterial({
    color: awningColorHex,
    roughness: 0.55,
  });
  const awningStripeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.55,
  });

  // 1. Ground-floor Shopfront Vitrine Display Window + Cornice Trim
  const vitrineFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.45, 7.6), trimMat);
  vitrineFrame.position.set(faceX + inward * 0.08, 1.45, 0);
  group.add(vitrineFrame);

  const vitrineGlass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.05, 7.0), glassGlowMat);
  vitrineGlass.position.set(faceX + inward * 0.14, 1.42, 0);
  group.add(vitrineGlass);

  // Sloped two-tone striped shop awning (above ground vitrine)
  const awningSlope = new THREE.Group();
  awningSlope.position.set(faceX + inward * 0.65, 3.02, 0);
  awningSlope.rotation.z = side * 0.24;
  const awningBody = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.16, 12.8), awningMainMat);
  awningSlope.add(awningBody);
  for (let sz = -5.0; sz <= 5.0; sz += 2.0) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.47, 0.18, 0.82), awningStripeMat);
    stripe.position.z = sz;
    awningSlope.add(stripe);
  }
  const valance = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 12.8), awningMainMat);
  valance.position.set(inward * 0.72, -0.14, 0);
  awningSlope.add(valance);
  group.add(awningSlope);

  // 2. Projecting Upper-Floor Balconies with Wrought-Iron Railings & Flower Boxes
  const balconyHeights = height > 18 ? [6.2, 10.2, 14.2] : [6.2, 10.2];
  const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
  const blossomPalette = [0xf43f5e, 0xfbbf24, 0xec4899, 0xf97316];
  const flowerMat = new THREE.MeshBasicMaterial({
    color: blossomPalette[(segIndex + (side > 0 ? 1 : 0)) % blossomPalette.length],
  });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });

  balconyHeights.forEach((by, bIdx) => {
    const bz = ((segIndex + bIdx) % 2 === 0 ? -3.4 : 3.4) * (side > 0 ? 1 : -1);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.18, 4.2), concreteMat);
    slab.position.set(faceX + inward * 0.55, by, bz);
    group.add(slab);

    const frontRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 4.16), ironMat);
    frontRail.position.set(faceX + inward * 1.08, by + 0.42, bz);
    group.add(frontRail);

    [-2.04, 2.04].forEach((endZ) => {
      const sideRail = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.65, 0.08), ironMat);
      sideRail.position.set(faceX + inward * 0.54, by + 0.42, bz + endZ);
      group.add(sideRail);
    });

    // Flower planter box clipped onto balcony rail
    const planter = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 1.55), terracottaMat);
    planter.position.set(faceX + inward * 1.15, by + 0.72, bz);
    group.add(planter);

    const greenery = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 1.48), leafMat);
    greenery.position.set(faceX + inward * 1.15, by + 0.88, bz);
    group.add(greenery);

    [-0.45, 0, 0.45].forEach((fz) => {
      const bloom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), flowerMat);
      bloom.position.set(faceX + inward * 1.17, by + 0.98, bz + fz);
      group.add(bloom);
    });
  });

  // 3. Stepped Rooftop Cornice, Parapet & Rooftop Silhouette (water tank / chimney / dish)
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.45, 19.6), concreteMat);
  cornice.position.set(side * 11.1, height + 0.2, 0);
  group.add(cornice);

  const parapet = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 19.4), trimMat);
  parapet.position.set(faceX + inward * 0.05, height + 0.72, 0);
  group.add(parapet);

  if ((segIndex + (side > 0 ? 1 : 0)) % 2 === 0) {
    // Classic neighborhood rooftop steel water tank / solar heater silhouette
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.45, 8), concreteMat);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(side * 8.9, height + 1.15, -2.5);
    group.add(tank);
  } else {
    // Brick chimney stack
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.4, 0.85), terracottaMat);
    chimney.position.set(side * 8.8, height + 0.9, 2.5);
    group.add(chimney);
  }

  // 4. Sidewalk Life Props (strictly on sidewalk x = side * 5.6..6.35, zero road overlap!)
  const sidewalkTopY = 0.22;
  const propVariant = (segIndex + (side > 0 ? 1 : 0)) % 3;

  if (propVariant === 0) {
    // Turkish Çay Ocağı low table + 2 stools + glowing çay glass
    const tableX = side * 6.05;
    const tableZ = 2.6;
    const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.58, 6), ironMat);
    tableLeg.position.set(tableX, sidewalkTopY + 0.29, tableZ);
    group.add(tableLeg);

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 8), concreteMat);
    tableTop.position.set(tableX, sidewalkTopY + 0.6, tableZ);
    group.add(tableTop);

    const teaGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.04, 0.14, 6),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 }),
    );
    teaGlass.position.set(tableX, sidewalkTopY + 0.7, tableZ);
    group.add(teaGlass);

    const stoolMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
    [-0.62, 0.62].forEach((dz) => {
      const stool = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.32), stoolMat);
      stool.position.set(tableX, sidewalkTopY + 0.2, tableZ + dz);
      group.add(stool);
    });
  } else if (propVariant === 1) {
    // Bakkal / Manav wooden produce crates (oranges & watermelons)
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 });
    const crateX = side * 6.25;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.48, 1.35), crateMat);
    crate.position.set(crateX, sidewalkTopY + 0.24, -2.6);
    group.add(crate);

    const orangeMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const melonMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 });
    [-0.36, 0, 0.36].forEach((oz, idx) => {
      const fruit = new THREE.Mesh(
        new THREE.DodecahedronGeometry(idx === 1 ? 0.18 : 0.14, 0),
        idx === 1 ? melonMat : orangeMat,
      );
      fruit.position.set(crateX, sidewalkTopY + 0.54, -2.6 + oz);
      group.add(fruit);
    });
  } else {
    // Classic neighborhood sidewalk bollards + red mailbox / fire hydrant
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    [-3.2, 0.8].forEach((bz) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.72, 8), bollardMat);
      post.position.set(side * 4.45, sidewalkTopY + 0.36, bz);
      group.add(post);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.12, 8), stripeMat);
      band.position.set(side * 4.45, sidewalkTopY + 0.58, bz);
      group.add(band);
    });

    const postbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.95, 0.42),
      new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.45 }),
    );
    postbox.position.set(side * 6.2, sidewalkTopY + 0.48, 2.2);
    group.add(postbox);
  }

  return group;
}

export function createBroomModel(): THREE.Group {
  const group = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 4.2, 10),
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 }),
  );
  handle.position.y = 2.6;
  handle.rotation.x = 0.25;
  group.add(handle);

  const headBlock = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.35, 0.55),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 }),
  );
  headBlock.position.set(0, 0.78, -0.45);
  group.add(headBlock);

  const bristles = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.75, 0.65),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.9 }),
  );
  bristles.position.set(0, 0.38, -0.45);
  group.add(bristles);

  return bakeStaticGroup(group, { castShadow: true, forceLambert: true });
}

export function createStreetArchModel(): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.72,
    roughness: 0.32,
  });

  // Left & right truss pillars on sidewalks
  [-4.35, 4.35].forEach((px) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.42, 8.55, 0.42), steelMat);
    col.position.set(px, 4.275, 0);
    group.add(col);
  });

  // High pedestrian overpass span (clears Spring Pad somersault & Jetpack smoothly!)
  const span = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.72, 0.9), steelMat);
  span.position.set(0, 8.55, 0);
  group.add(span);

  // Railing
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(9.4, 0.14, 0.95),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 }),
  );
  rail.position.set(0, 9.05, 0);
  group.add(rail);

  // Glowing traffic signals hanging cleanly above all 3 lanes (bottom at y = 7.47m)
  [-2.6, 0, 2.6].forEach((lx) => {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.72, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }),
    );
    box.position.set(lx, 7.83, 0.25);
    group.add(box);

    const greenLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x22c55e }),
    );
    greenLight.position.set(lx, 7.64, 0.39);
    group.add(greenLight);

    const amberLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
    );
    amberLight.position.set(lx, 7.84, 0.39);
    group.add(amberLight);
  });

  return bakeStaticGroup(group);
}

// --- New Gameplay & Dynamic Environment Models ---

let movingTaxiGlowShared: {
  haloGeo: THREE.BufferGeometry;
  haloMat: THREE.Material;
  poolGeo: THREE.BufferGeometry;
  poolMat: THREE.Material;
} | null = null;

function getMovingTaxiGlowResources() {
  if (movingTaxiGlowShared) return movingTaxiGlowShared;
  const tex = getCaveTrainGlowTexture();
  movingTaxiGlowShared = {
    haloGeo: new THREE.PlaneGeometry(0.74, 0.74),
    haloMat: new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    poolGeo: new THREE.PlaneGeometry(2.15, 5.2),
    poolMat: new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  };
  return movingTaxiGlowShared;
}

export function createMovingTaxiModel(): THREE.Group {
  const group = createTaxiModel(true);
  const wheels = group.userData.wheels as THREE.Mesh[] | undefined;
  const skip = new Set<THREE.Object3D>(wheels ?? []);
  // Approaching traffic headlights facing +Z toward the player!
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfef9c3,
  });
  const glowRes = getMovingTaxiGlowResources();
  const headlightRig = new THREE.Group();
  [-0.65, 0.65].forEach((hx) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.08), beamMat);
    lamp.position.set(hx, 0.66, 1.82);
    group.add(lamp);

    const halo = new THREE.Mesh(glowRes.haloGeo, glowRes.haloMat);
    halo.position.set(hx, 0.66, 1.88);
    halo.userData.sharedGeometry = true;
    halo.userData.sharedMaterial = true;
    headlightRig.add(halo);

    const glowCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 2.5, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    glowCone.rotation.x = -Math.PI / 2 - 0.06;
    glowCone.position.set(hx, 0.44, 3.05);
    headlightRig.add(glowCone);
  });

  const roadPool = new THREE.Mesh(glowRes.poolGeo, glowRes.poolMat);
  roadPool.rotation.x = -Math.PI / 2;
  roadPool.position.set(0, 0.03, 4.35);
  roadPool.userData.sharedGeometry = true;
  roadPool.userData.sharedMaterial = true;
  headlightRig.add(roadPool);

  group.add(headlightRig);
  skip.add(headlightRig);

  const baked = bakeStaticGroup(group, {
    castShadow: true,
    keepTransparent: true,
    skipObjects: skip,
  });
  baked.userData.headlightRig = headlightRig;
  return baked;
}

/**
 * Üstüne çıkılabilen belediye otobüsü + ön (+Z tarafı) eğimli rampa!
 * Lokal Z = +3.8 (yer hizası) -> Z = +1.4 (çatı y = 1.95) -> Z = -3.6 (çatı sonu)
 */
export function createCityBusWithRampModel(): THREE.Group {
  const group = new THREE.Group();
  const busBodyMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.25,
    metalness: 0.28,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.55,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.15,
    metalness: 0.85,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });

  // Main Bus Hull spanning z = -3.6 .. +1.4 (length 5.0m), top at y = 1.95
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.65, 5.0), busBodyMat);
  hull.position.set(0, 1.08, -1.1);
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // Textured grip roof deck at y = 1.95
  const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.1, 4.95), roofMat);
  roofDeck.position.set(0, 1.9, -1.1);
  roofDeck.receiveShadow = true;
  group.add(roofDeck);

  // Side windows
  [-1.085, 1.085].forEach((wx) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.58, 4.4), glassMat);
    win.position.set(wx, 1.38, -1.1);
    group.add(win);
  });

  // Roof AC unit (decorative, low)
  const ac = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 1.2), roofMat);
  ac.position.set(0, 2.0, -2.2);
  group.add(ac);

  // Wheels
  [
    [-1.02, 0.3],
    [1.02, 0.3],
    [-1.02, -2.4],
    [1.02, -2.4],
  ].forEach(([wx, wz]) => {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14),
      tireMat,
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.34, wz);
    group.add(wheel);
  });

  // Sloped Climbable Front Ramp (+Z = +3.8 down on road -> +1.4 at y = 1.95)
  const rampLen = Math.hypot(2.4, 1.95);
  const rampAngle = Math.atan2(1.95, 2.4);
  const rampMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.14, rampLen),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4,
      metalness: 0.2,
    }),
  );
  rampMesh.position.set(0, 1.95 * 0.5 - 0.05, 2.6);
  rampMesh.rotation.x = rampAngle;
  rampMesh.receiveShadow = true;
  group.add(rampMesh);

  // Glowing chevron strips along the ramp so players spot it instantly
  [1.8, 2.5, 3.2].forEach((cz) => {
    const t = (3.8 - cz) / 2.4;
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.06, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xfef08a }),
    );
    strip.position.set(0, t * 1.95 + 0.04, cz);
    strip.rotation.x = rampAngle;
    group.add(strip);
  });

  return bakeStaticGroup(group, { castShadow: true, receiveShadow: true });
}

export function createSpringPadModel(): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.88, 0.98, 0.14, 16),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.6 }),
  );
  base.position.y = 0.07;
  group.add(base);

  const spring = new THREE.Mesh(
    new THREE.TorusGeometry(0.54, 0.09, 8, 20),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    }),
  );
  spring.rotation.x = Math.PI / 2;
  spring.position.y = 0.22;
  group.add(spring);

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.76, 0.76, 0.1, 16),
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.55,
      roughness: 0.25,
    }),
  );
  pad.position.y = 0.3;
  group.add(pad);

  return bakeStaticGroup(group);
}

export function createRecordGateModel(
  recordBannerTexture?: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.55,
    metalness: 0.75,
    roughness: 0.2,
  });
  const glowStripMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  [-4.3, 4.3].forEach((px) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 7.6, 12), goldMat);
    pillar.position.set(px, 3.8, 0);
    group.add(pillar);

    const sideGlow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 6.8, 0.14), glowStripMat);
    sideGlow.position.set(px + (px < 0 ? 0.22 : -0.22), 3.6, 0.16);
    group.add(sideGlow);
  });

  const banner = new THREE.Mesh(new THREE.BoxGeometry(9.2, 1.15, 0.38), goldMat);
  banner.position.set(0, 7.45, 0);
  group.add(banner);

  if (recordBannerTexture) {
    const signFace = new THREE.Mesh(
      new THREE.PlaneGeometry(8.6, 0.96),
      new THREE.MeshBasicMaterial({ map: recordBannerTexture }),
    );
    signFace.position.set(0, 7.45, 0.2);
    group.add(signFace);
  }

  return bakeStaticGroup(group, { keepTextured: true });
}

// --- Biome-Specific Ultra-Distinct 3D Worlds (Road + Flanking Terrain + Scenery) ---

function addLaneStripes(
  group: THREE.Group,
  colorHex: number,
  emissiveIntensity = 0.25,
): void {
  const mat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: emissiveIntensity < 0.3,
    opacity: emissiveIntensity < 0.3 ? 0.55 : 0.85,
  });
  [-1.3, 1.3].forEach((lx) => {
    [-6, 0, 6].forEach((lz) => {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 3.2), mat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(lx, 0.025, lz);
      group.add(dash);
    });
  });
}

/**
 * 2. BÖLGE: YERALTI TOPRAK TÜNELİ
 * Kapalı toprak kubbe tavan, katmanlı toprak duvarlar, sarkan kökler, maden destek kalasları ve kristaller
 */
export function createEarthCavernSegmentProps(
  segIndex: number,
  earthWallTexture: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  const animatedProps: Array<{
    obj: THREE.Object3D;
    kind: 'bob' | 'sway' | 'spin' | 'pulse';
    baseY: number;
    phase: number;
    amp: number;
    speed: number;
  }> = [];
  const skipObjects = new Set<THREE.Object3D>();

  const tunnelShellMat = getEarthTunnelShellMat(earthWallTexture);
  // Untextured earthy rock material so mounds & pillars merge into SHARED_MATTE_VC (0 extra draw calls!)
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x7c5032,
    roughness: 0.94,
  });
  const stalactiteMat = new THREE.MeshStandardMaterial({
    color: 0x5c3d28,
    roughness: 0.9,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.85,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.65,
    roughness: 0.38,
  });

  // 3-lane Subway / Mine Railway Tracks (merged into static segment batch — 0 extra draw calls)
  const ballastMat = new THREE.MeshStandardMaterial({ color: 0x261f1b, roughness: 0.95 });
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.88 });
  const steelRailMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.82,
    roughness: 0.24,
  });
  const railCapMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.88,
    roughness: 0.16,
  });
  [-2.6, 0, 2.6].forEach((laneX) => {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.022, 20), ballastMat);
    bed.position.set(laneX, 0.011, 0);
    group.add(bed);

    for (let s = 0; s < 10; s++) {
      const sz = -9 + s * 2;
      const sleeper = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.044, 0.24), sleeperMat);
      sleeper.position.set(laneX, 0.026, sz);
      group.add(sleeper);
    }

    [-0.54, 0.54].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.068, 20), steelRailMat);
      rail.position.set(laneX + rx, 0.056, 0);
      group.add(rail);

      const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.016, 20), railCapMat);
      railTop.position.set(laneX + rx, 0.094, 0);
      group.add(railTop);
    });
  });

  // High arched subterranean earth dome (clears 12.6m high so Jetpack camera never clips ceiling!)
  const archDome = new THREE.Mesh(
    new THREE.CylinderGeometry(8.8, 8.8, 20, 12, 1, true, -Math.PI * 0.56, Math.PI * 1.12),
    tunnelShellMat,
  );
  archDome.userData.sharedMaterial = true;
  archDome.rotation.x = -Math.PI / 2;
  archDome.position.y = 3.8;
  group.add(archDome);

  const crystalPalette = [
    { color: 0xfbbf24, emissive: 0xd97706 },
    { color: 0x2dd4bf, emissive: 0x0d9488 },
    { color: 0xc084fc, emissive: 0x7e22ce },
    { color: 0xfb7185, emissive: 0xbe123c },
  ];

  const variant = segIndex % 4;

  // Rugged soil ledges, multi-shard crystal clusters, mushrooms, parked rail carts & glowing veins
  [-1, 1].forEach((side, idx) => {
    for (let k = 0; k < 2; k++) {
      const zOff = k === 0 ? -5.5 : 4.6;
      const h = 4.6 + ((segIndex + idx + k) % 4) * 1.15;
      const mound = new THREE.Mesh(new THREE.ConeGeometry(2.1, h, 6), rockMat);
      mound.position.set(side * (6.25 + k * 0.4), h * 0.42, zOff);
      mound.rotation.y = segIndex * 0.6 + k;
      group.add(mound);
    }

    // Stepped stone ledge + 3-shard glowing subterranean crystal cluster
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.65, 2.2), stalactiteMat);
    const cz = (segIndex % 2 === 0 ? 1 : -1) * 3.2;
    ledge.position.set(side * 5.25, 0.32, cz);
    group.add(ledge);

    const cPal = crystalPalette[(segIndex + idx) % crystalPalette.length];
    const crystalMat = new THREE.MeshStandardMaterial({
      color: cPal.color,
      emissive: cPal.emissive,
      emissiveIntensity: 0.95,
      roughness: 0.16,
    });
    const shardSpecs = [
      { dx: 0, dy: 0.95, dz: 0, s: [0.36, 1.45, 0.36], rz: side * 0.18 },
      { dx: -side * 0.32, dy: 0.68, dz: 0.35, s: [0.24, 1.0, 0.24], rz: side * 0.45 },
      { dx: side * 0.28, dy: 0.62, dz: -0.35, s: [0.22, 0.9, 0.22], rz: -side * 0.28 },
    ];
    shardSpecs.forEach((sp) => {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), crystalMat);
      shard.scale.set(sp.s[0], sp.s[1], sp.s[2]);
      shard.position.set(side * 5.15 + sp.dx, 0.55 + sp.dy * 0.5, cz + sp.dz);
      shard.rotation.z = sp.rz;
      group.add(shard);
    });

    // Variation per 4 segments: glowing amber shrine / bioluminescent mushroom grove / supply barrels / crystal geode
    const subVariant = (variant + idx) % 4;
    if (subVariant === 0) {
      // Glowing subterranean ore vein pillar on cave shoulder (old wooden carts removed)
      const shrineRock = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 1.45, 6), rockMat);
      shrineRock.position.set(side * 5.1, 0.72, -cz);
      group.add(shrineRock);

      const amberCore = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshBasicMaterial({ color: 0xfde047 }),
      );
      amberCore.position.set(side * 5.05, 1.68, -cz);
      group.add(amberCore);
    } else if (subVariant === 1) {
      // Tall bioluminescent mushroom cluster
      const mushZ = -cz * 0.9;
      const mushCapMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0x5eead4 : 0xfde047,
      });
      [0, 0.52, -0.42].forEach((mz, mi) => {
        const mStem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.11, 0.52 + mi * 0.14, 6),
          stalactiteMat,
        );
        mStem.position.set(side * 4.95, 0.28 + mi * 0.06, mushZ + mz);
        group.add(mStem);

        const mCap = new THREE.Mesh(
          new THREE.SphereGeometry(0.32 - mi * 0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
          mushCapMat,
        );
        mCap.position.set(side * 4.95, 0.52 + mi * 0.12, mushZ + mz);
        group.add(mCap);
      });
    } else if (subVariant === 2) {
      // Stacked miner supply barrels & glowing lantern post
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.95, 8), woodMat);
      barrel.position.set(side * 4.95, 0.48, -cz);
      group.add(barrel);

      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.05, 6, 10), ironMat);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.set(side * 4.95, 0.68, -cz);
      group.add(hoop);
    } else {
      // Towering crystal geode pillar embedded in the cave flank
      const geodeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 2.2, 6), rockMat);
      geodeBase.position.set(side * 5.25, 1.1, -cz);
      group.add(geodeBase);

      const geodeCore = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.55, 0),
        new THREE.MeshBasicMaterial({ color: 0xc084fc }),
      );
      geodeCore.position.set(side * 5.05, 2.35, -cz);
      group.add(geodeCore);
    }

    // Jagged stalactites hanging cleanly along outer tunnel flanks (outside flight path)
    [-6.2, 6.2].forEach((sz, si) => {
      const stLen = 1.9 + ((segIndex + si + idx) % 2) * 0.7;
      const stalactite = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, stLen, 5),
        stalactiteMat,
      );
      stalactite.rotation.x = Math.PI;
      stalactite.position.set(side * 4.95, 10.9 - stLen * 0.35, sz);
      group.add(stalactite);
    });

    // Gnarled roots hanging down from tunnel ceiling
    const root = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.24, 3.4, 6), woodMat);
    root.position.set(side * 4.2, 10.4, -3.2);
    root.rotation.z = side * 0.28;
    group.add(root);

    // Rustic iron mine pipe along tunnel wall
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 20, 6), ironMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(side * 5.15, 2.35, 0);
    group.add(pipe);

    // Glowing gold/amber ore vein embedded on rock mound
    const oreVein = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshBasicMaterial({ color: (segIndex + idx) % 2 === 0 ? 0xfbbf24 : 0x2dd4bf }),
    );
    oreVein.scale.set(0.65, 1.85, 0.9);
    oreVein.position.set(side * 5.38, 1.85, idx === 0 ? -4.8 : 4.2);
    group.add(oreVein);
  });

  // Tall wooden mine timber support frame with iron gusset plates & swinging hanging lanterns (clears Jetpack camera!)
  [-4.75, 4.75].forEach((px) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.52, 11.0, 0.52), woodMat);
    post.position.set(px, 5.5, 0);
    group.add(post);

    const ironBand = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.26, 0.58), ironMat);
    ironBand.position.set(px, 1.4, 0);
    group.add(ironBand);

    // Side mine wall lantern mounted on post
    const sideArm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.1), ironMat);
    sideArm.position.set(px + (px < 0 ? 0.36 : -0.36), 3.7, 0);
    group.add(sideArm);

    const sideLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.34, 6),
      new THREE.MeshBasicMaterial({ color: variant % 2 === 0 ? 0xfde047 : 0x5eead4 }),
    );
    sideLamp.position.set(px + (px < 0 ? 0.5 : -0.5), 3.52, 0);
    group.add(sideLamp);
  });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.58, 0.58), woodMat);
  beam.position.set(0, 10.95, 0);
  group.add(beam);

  [-3.95, 3.95].forEach((bx) => {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.8, 0.36), woodMat);
    brace.position.set(bx, 10.15, 0);
    brace.rotation.z = bx < 0 ? -0.78 : 0.78;
    group.add(brace);
  });

  const lanternPivot = new THREE.Group();
  lanternPivot.position.set(0, 10.68, 0);
  const lanternCage = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 6), ironMat);
  lanternCage.position.set(0, -0.1, 0);
  lanternPivot.add(lanternCage);
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 8, 8),
    new THREE.MeshBasicMaterial({ color: variant % 2 === 0 ? 0xfef08a : 0x5eead4 }),
  );
  lantern.position.set(0, -0.33, 0);
  lanternPivot.add(lantern);
  group.add(lanternPivot);
  skipObjects.add(lanternPivot);
  animatedProps.push({
    obj: lanternPivot,
    kind: 'sway',
    baseY: 10.68,
    phase: segIndex * 1.1,
    amp: 0.16,
    speed: 2.3,
  });

  const baked = bakeStaticGroup(group, {
    keepTransparent: true,
    keepTextured: true,
    skipObjects,
  });
  baked.userData.animatedProps = animatedProps;
  return baked;
}

/**
 * Yeraltı Tünel Giriş Rampası (20m uzunluk: z=+10'da y=0'dan z=-10'da y=-4.2'ye iner, gizlenen 20m segmente birebir oturur)
 */
export function createTunnelDescentModel(
  earthRoadTexture: THREE.Texture,
  earthWallTexture: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  const rampLength = Math.hypot(20, 4.2);
  const slopeAngle = Math.atan2(4.2, 20);

  const soilSlopeTex = earthRoadTexture.clone();
  soilSlopeTex.needsUpdate = true;
  soilSlopeTex.repeat.set(1, 2.4);

  const earthRamp = new THREE.Mesh(
    new THREE.BoxGeometry(7.8, 0.4, rampLength),
    new THREE.MeshStandardMaterial({ map: soilSlopeTex, roughness: 0.94 }),
  );
  earthRamp.position.set(0, -2.1 - 0.18, 0);
  earthRamp.rotation.x = -slopeAngle;
  earthRamp.receiveShadow = true;
  group.add(earthRamp);

  // Wooden mine steps/sleepers along the descent slope for tactile depth cue
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  for (let s = 0; s < 12; s++) {
    const t = (s + 0.5) / 12;
    const sz = 10 - t * 20;
    const sy = -4.2 * t;
    const sleeper = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.08, 0.34), timberMat);
    sleeper.position.set(0, sy + 0.02, sz);
    sleeper.rotation.x = -slopeAngle;
    group.add(sleeper);
  }

  // Earthen side walls & sloped tunnel canopy enclosing the player underground
  const wallMat = new THREE.MeshStandardMaterial({
    map: earthWallTexture,
    color: 0x9c7354,
    roughness: 0.94,
  });
  [-1, 1].forEach((side) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 14.5, 20.2), wallMat);
    sideWall.position.set(side * 5.7, 2.9, 0);
    group.add(sideWall);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, rampLength), timberMat);
    rail.position.set(side * 4.05, -2.1 + 0.45, 0);
    rail.rotation.x = -slopeAngle;
    group.add(rail);
  });

  // Heavy Tunnel Entrance Portal Headwall at z = +8.6 (raised beam clears Jetpack camera cleanly!)
  [-4.5, 4.5].forEach((px) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 12.0, 0.7), timberMat);
    post.position.set(px, 6.0, 8.6);
    group.add(post);
  });
  const portalHeadwall = new THREE.Mesh(
    new THREE.BoxGeometry(11.6, 4.4, 2.2),
    wallMat,
  );
  portalHeadwall.position.set(0, 14.1, 8.6);
  group.add(portalHeadwall);

  const portalBeam = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.8, 0.85), timberMat);
  portalBeam.position.set(0, 11.9, 8.9);
  group.add(portalBeam);

  [-3.8, 0, 3.8].forEach((lx) => {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
    );
    lamp.position.set(lx, 10.65, 9.0);
    group.add(lamp);
  });

  // Sloped earth roof closing smoothly down toward the underground tunnel ceiling
  const tunnelCeiling = new THREE.Mesh(
    new THREE.CylinderGeometry(8.6, 8.6, 20.2, 12, 1, true, -Math.PI * 0.56, Math.PI * 1.12),
    new THREE.MeshStandardMaterial({
      map: earthWallTexture,
      color: 0x9c7354,
      roughness: 0.94,
      side: THREE.BackSide,
    }),
  );
  tunnelCeiling.rotation.x = -Math.PI / 2 - slopeAngle;
  tunnelCeiling.position.set(0, 1.95, 0);
  group.add(tunnelCeiling);

  return bakeStaticGroup(group, {
    keepTextured: true,
  });
}

/**
 * Yeraltından Çıkış Merdiveni (20m uzunluk: z=+10'da y=-4.2'den z=-10'da y=0'a çıkar, gizlenen 20m segmente birebir oturur)
 */
export function createTunnelStaircaseExitModel(
  earthWallTexture: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();
  const slopeAngle = Math.atan2(4.2, 20);
  const rampLength = Math.hypot(20, 4.2);

  const stepStoneMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.78,
  });
  const stepTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.5,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const wallMat = new THREE.MeshStandardMaterial({
    map: earthWallTexture,
    color: 0x9c7354,
    roughness: 0.94,
  });

  // 20 crisp physical 3D stairs ascending cleanly from -4.2 to 0
  const stepCount = 20;
  for (let i = 0; i < stepCount; i++) {
    const t = (i + 0.5) / stepCount;
    const sz = 10 - t * 20;
    const sy = -4.2 * (1 - t);
    const stepBlock = new THREE.Mesh(
      new THREE.BoxGeometry(7.8, 0.55, 1.12),
      stepStoneMat,
    );
    stepBlock.position.set(0, sy - 0.275, sz);
    group.add(stepBlock);

    const stepEdge = new THREE.Mesh(
      new THREE.BoxGeometry(7.82, 0.08, 0.14),
      stepTrimMat,
    );
    stepEdge.position.set(0, sy - 0.02, sz + 0.5);
    group.add(stepEdge);
  }

  // Flanking earth tunnel exit walls, wooden handrails & glowing blue arctic daylight lamps
  [-1, 1].forEach((side) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 14.5, 20.2), wallMat);
    sideWall.position.set(side * 5.7, 2.9, 0);
    group.add(sideWall);

    const handrail = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.24, rampLength),
      woodMat,
    );
    handrail.position.set(side * 4.02, -2.1 + 1.05, 0);
    handrail.rotation.x = slopeAngle;
    group.add(handrail);

    for (let k = 0; k < 4; k++) {
      const kt = (k + 0.5) / 4;
      const pz = 10 - kt * 20;
      const py = -4.2 * (1 - kt);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.1, 0.26), woodMat);
      post.position.set(side * 4.02, py + 0.55, pz);
      group.add(post);

      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: k >= 2 ? 0x7dd3fc : 0xfef08a }),
      );
      lantern.position.set(side * 4.02, py + 1.25, pz);
      group.add(lantern);
    }
  });

  // Top Exit Arch opening cleanly into the next biome (clears Jetpack camera!)
  [-4.4, 4.4].forEach((px) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.65, 12.0, 0.65), woodMat);
    col.position.set(px, 6.0, -9.0);
    group.add(col);
  });
  const exitBeam = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.72, 0.75), woodMat);
  exitBeam.position.set(0, 11.9, -9.0);
  group.add(exitBeam);

  return bakeStaticGroup(group, {
    keepTextured: true,
  });
}

/**
 * 3. BÖLGE: BUZUL DÜNYASI
 * Parlak buz pisti, kar tepeleri, dev kristal buz dağları, karlı çamlar ve kutup ışıkları
 */
export function createIceWorldSegmentProps(segIndex: number): THREE.Group {
  const group = new THREE.Group();
  const animatedProps: Array<{
    obj: THREE.Object3D;
    kind: 'bob' | 'sway' | 'spin' | 'pulse';
    baseY: number;
    phase: number;
    amp: number;
    speed: number;
  }> = [];
  const skipObjects = new Set<THREE.Object3D>();

  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf0f9ff,
    roughness: 0.82,
  });
  const iceBlockMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.25,
    metalness: 0.12,
  });
  const navyTrimMat = new THREE.MeshStandardMaterial({
    color: 0x0369a1,
    roughness: 0.32,
    metalness: 0.2,
  });
  const spruceMat = new THREE.MeshStandardMaterial({
    color: 0x065f46,
    roughness: 0.88,
  });
  const { glacierMat, auroraGreenMat, auroraCyanMat, auroraVioletMat } = getIceWorldSharedMats();

  addLaneStripes(group, 0x0284c7, 0.48);

  const variant = segIndex % 4;

  [-1, 1].forEach((side, idx) => {
    // Layered snowdrifts flanking track
    const drift = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 6), snowMat);
    drift.scale.set(1.2, 0.42, 2.2);
    drift.position.set(side * 6.4, 0.15, idx === 0 ? 3.5 : -3.5);
    group.add(drift);

    // Towering jagged translucent glacier crystal cluster
    const gHeight = 8.2 + ((segIndex + idx) % 4) * 2.1;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.4, gHeight, 5), glacierMat);
    spire.userData.sharedMaterial = true;
    spire.position.set(side * 7.6, gHeight * 0.44, -2.5);
    spire.rotation.y = segIndex * 0.8 + idx;
    group.add(spire);

    const subSpire = new THREE.Mesh(new THREE.ConeGeometry(1.3, gHeight * 0.58, 5), glacierMat);
    subSpire.userData.sharedMaterial = true;
    subSpire.position.set(side * 6.1, gHeight * 0.25, -0.6);
    subSpire.rotation.z = side * 0.22;
    group.add(subSpire);

    // 4-way rotating hero landmark along the glacier bank
    const subV = (variant + idx) % 4;
    if (subV === 0) {
      // Cozy Arctic Igloo with warm glowing doorway
      const iglooZ = 2.4;
      const iglooX = side * 7.8;
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.85, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
        iceBlockMat,
      );
      dome.position.set(iglooX, 0.1, iglooZ);
      group.add(dome);

      const entry = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.7, 1.25, 8),
        iceBlockMat,
      );
      entry.rotation.z = Math.PI / 2;
      entry.position.set(iglooX - side * 1.45, 0.65, iglooZ);
      group.add(entry);

      const hearthGlow = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.65, 0.65),
        new THREE.MeshBasicMaterial({ color: 0xfdba74 }),
      );
      hearthGlow.position.set(iglooX - side * 2.02, 0.58, iglooZ);
      group.add(hearthGlow);
    } else if (subV === 1) {
      // Polar Lighthouse / Ice Beacon Tower
      const bx = side * 7.4;
      const bz = 2.2;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.15, 3.8, 8), iceBlockMat);
      base.position.set(bx, 1.9, bz);
      group.add(base);

      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.0, 0.8, 8), navyTrimMat);
      stripe.position.set(bx, 2.2, bz);
      group.add(stripe);

      const beaconCore = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.62, 0),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      );
      beaconCore.position.set(bx, 4.35, bz);
      group.add(beaconCore);
    } else if (subV === 2) {
      // Twin Snow-Capped Pines with festive polar lantern
      const treeX = side * 5.2;
      const treeZ = 2.2;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.22, 1.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 }),
      );
      trunk.position.set(treeX, 0.8, treeZ);
      group.add(trunk);

      [1.95, 2.85, 3.68].forEach((py, tier) => {
        const baseR = 1.18 - tier * 0.24;
        const pineLayer = new THREE.Mesh(new THREE.ConeGeometry(baseR, 1.35, 7), spruceMat);
        pineLayer.position.set(treeX, py, treeZ);
        group.add(pineLayer);

        const snowCap = new THREE.Mesh(new THREE.ConeGeometry(baseR * 0.88, 0.72, 7), snowMat);
        snowCap.position.set(treeX, py + 0.36, treeZ);
        group.add(snowCap);
      });
    } else {
      // Frozen Ice Totem & Wooden Expedition Signpost
      const tx = side * 6.9;
      const tz = 2.0;
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), navyTrimMat);
      plinth.position.set(tx, 0.6, tz);
      group.add(plinth);

      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), glacierMat);
      crystal.userData.sharedMaterial = true;
      crystal.scale.set(0.85, 1.9, 0.85);
      crystal.position.set(tx, 2.75, tz);
      group.add(crystal);
    }

    // Background Snow-capped arctic pine tree on every segment
    const treeX = side * 5.15;
    const treeZ = 5.4;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.22, 1.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 }),
    );
    trunk.position.set(treeX, 0.8, treeZ);
    group.add(trunk);

    [1.95, 2.85, 3.68].forEach((py, tier) => {
      const baseR = 1.18 - tier * 0.24;
      const pineLayer = new THREE.Mesh(new THREE.ConeGeometry(baseR, 1.35, 7), spruceMat);
      pineLayer.position.set(treeX, py, treeZ);
      group.add(pineLayer);

      const snowCap = new THREE.Mesh(new THREE.ConeGeometry(baseR * 0.88, 0.72, 7), snowMat);
      snowCap.position.set(treeX, py + 0.36, treeZ);
      group.add(snowCap);
    });

    // Frost-brick ice lantern with bobbing crystal core along track edge
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.9, 0.45), navyTrimMat);
    post.position.set(side * 4.85, 0.95, -6.5);
    group.add(post);

    const frostOrb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35, 0),
      new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x7dd3fc : 0x34d399 }),
    );
    frostOrb.position.set(side * 4.85, 2.35, -6.5);
    group.add(frostOrb);
    skipObjects.add(frostOrb);
    animatedProps.push({
      obj: frostOrb,
      kind: 'spin',
      baseY: 2.35,
      phase: segIndex * 0.7 + idx,
      amp: 0.14,
      speed: 2.2,
    });

    // Crystalline translucent ice shards framing the glacier runway edge
    [-7.2, -1.2, 4.8].forEach((sz, sIdx) => {
      const shardH = 0.72 + ((segIndex + sIdx) % 2) * 0.38;
      const curbShard = new THREE.Mesh(new THREE.ConeGeometry(0.32, shardH, 5), glacierMat);
      curbShard.userData.sharedMaterial = true;
      curbShard.position.set(side * 4.22, shardH * 0.45, sz);
      curbShard.rotation.z = -side * 0.18;
      group.add(curbShard);
    });
  });

  // High overhead glacier bridge OR double-band Aurora Borealis ribbons (apex 14.4m+, clears Jetpack!)
  if (variant === 1 || variant === 3) {
    const auroraGreen = new THREE.Mesh(
      new THREE.TorusGeometry(6.8, 0.28, 8, 24, Math.PI),
      variant === 1 ? auroraGreenMat : auroraCyanMat,
    );
    auroraGreen.userData.sharedMaterial = true;
    auroraGreen.position.set(0, 8.4, 0);
    group.add(auroraGreen);

    const auroraViolet = new THREE.Mesh(
      new THREE.TorusGeometry(7.35, 0.22, 8, 24, Math.PI),
      auroraVioletMat,
    );
    auroraViolet.userData.sharedMaterial = true;
    auroraViolet.position.set(0, 8.6, -1.8);
    group.add(auroraViolet);
  } else if (variant === 2) {
    [-5.5, 5.5].forEach((px) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.75, 14.3, 0.75), iceBlockMat);
      col.position.set(px, 7.15, 0);
      group.add(col);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.55, 0.85), glacierMat);
    bridge.userData.sharedMaterial = true;
    bridge.position.set(0, 14.3, 0);
    group.add(bridge);
  }

  const baked = bakeStaticGroup(group, { keepTransparent: true, skipObjects });
  baked.userData.animatedProps = animatedProps;
  return baked;
}

/**
 * 4. BÖLGE: ATEŞ VE LAV DİYARI
 * Kavrulmuş obsidyen köprü, altıgen bazalt sütunlar, alev kazanları ve yüksek lav kemerleri
 */
export function createFireWorldSegmentProps(segIndex: number): THREE.Group {
  const group = new THREE.Group();
  const animatedProps: Array<{
    obj: THREE.Object3D;
    kind: 'bob' | 'sway' | 'spin' | 'pulse';
    baseY: number;
    phase: number;
    amp: number;
    speed: number;
  }> = [];
  const skipObjects = new Set<THREE.Object3D>();

  const lavaMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
  });
  const yellowFlameMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
  });
  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.34,
    metalness: 0.55,
  });
  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.55,
    metalness: 0.35,
  });

  addLaneStripes(group, 0xfb923c, 0.85);

  const variant = segIndex % 4;

  [-1, 1].forEach((side, idx) => {
    // Hexagonal Giant's Causeway basalt pillars rising from lava river with magma cracks
    for (let b = 0; b < 3; b++) {
      const colH = 2.4 + ((segIndex + idx + b) % 4) * 1.3;
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 1.05, colH, 6),
        b % 2 === 0 ? basaltMat : obsidianMat,
      );
      col.position.set(side * (5.3 + b * 1.05), colH * 0.42 - 0.5, -5.5 + b * 4.5);
      group.add(col);
    }

    // Glowing magma fissure strip embedded along outer bridge skirt
    const fissure = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 12), lavaMat);
    fissure.position.set(side * 4.55, 0.08, idx === 0 ? -2.5 : 2.5);
    group.add(fissure);

    // 4-variant volcanic cliff landmark
    const subV = (variant + idx) % 4;
    if (subV === 0) {
      // Towering volcanic caldera spire with molten lava vein
      const spireH = 9.2 + ((segIndex + idx) % 3) * 2.5;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(2.3, spireH, 5), obsidianMat);
      spire.position.set(side * 8.1, spireH * 0.42, -3.5);
      group.add(spire);

      const vein = new THREE.Mesh(new THREE.BoxGeometry(0.24, spireH * 0.58, 0.24), lavaMat);
      vein.position.set(side * 7.15, spireH * 0.3, -3.5);
      vein.rotation.z = side * 0.24;
      group.add(vein);
    } else if (subV === 1) {
      // Obsidian Lava Waterfall Cliff pouring molten stream into magma river
      const cliff = new THREE.Mesh(new THREE.BoxGeometry(2.6, 8.8, 3.6), basaltMat);
      cliff.position.set(side * 8.6, 4.0, -3.2);
      group.add(cliff);

      const chute = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.6, 1.4), lavaMat);
      chute.position.set(side * 7.25, 3.3, -3.2);
      group.add(chute);

      const splash = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 0.25, 8), yellowFlameMat);
      splash.position.set(side * 7.0, -0.58, -3.2);
      group.add(splash);
    } else if (subV === 2) {
      // Twin Forged Iron Chain-Pillars with Glowing Magma Core
      const tower = new THREE.Mesh(new THREE.BoxGeometry(1.6, 7.2, 1.6), obsidianMat);
      tower.position.set(side * 7.5, 3.6, -2.5);
      group.add(tower);

      const magmaCrystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.95, 0),
        yellowFlameMat,
      );
      magmaCrystal.position.set(side * 7.5, 7.8, -2.5);
      group.add(magmaCrystal);
    } else {
      // Giant Basalt Archway Rib curving over lava river
      const rib = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6.2, 2.2), basaltMat);
      rib.position.set(side * 7.4, 3.1, -3.5);
      rib.rotation.z = side * 0.22;
      group.add(rib);

      const emberCap = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.25, 2.28), lavaMat);
      emberCap.position.set(side * 6.8, 6.0, -3.5);
      emberCap.rotation.z = side * 0.22;
      group.add(emberCap);
    }

    // Iron cauldron brazier with blazing animated flame on obsidian bridge edge
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.62, 1.2, 6), obsidianMat);
    pedestal.position.set(side * 4.85, 0.6, 0);
    group.add(pedestal);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.42, 0.48, 8), basaltMat);
    bowl.position.set(side * 4.85, 1.38, 0);
    group.add(bowl);

    const flameGroup = new THREE.Group();
    flameGroup.position.set(side * 4.85, 1.56, 0);
    const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.15, 6), lavaMat);
    outerFlame.position.y = 0.5;
    flameGroup.add(outerFlame);
    const coreFlame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.82, 6), yellowFlameMat);
    coreFlame.position.y = 0.36;
    flameGroup.add(coreFlame);
    group.add(flameGroup);
    skipObjects.add(flameGroup);
    animatedProps.push({
      obj: flameGroup,
      kind: 'pulse',
      baseY: 1.56,
      phase: segIndex * 0.9 + idx * 1.4,
      amp: 0.22,
      speed: 7.5,
    });

    // Floating cooled obsidian crust islands in flanking magma river
    const islandZ = (segIndex % 2 === 0 ? 3.5 : -3.5) * side;
    const lavaIsland = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.75, 0.35, 6), obsidianMat);
    lavaIsland.position.set(side * 11.4, -0.66, islandZ);
    group.add(lavaIsland);

    const lavaRim = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.98, 0.1, 6), yellowFlameMat);
    lavaRim.position.set(side * 11.4, -0.73, islandZ);
    group.add(lavaRim);
  });

  // High blazing obsidian & magma gateway every 2nd segment (apex 14.4m -> clears Jetpack smoothly!)
  if (segIndex % 2 === 0) {
    [-6.4, 6.4].forEach((px) => {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.95, 8.2, 0.95), obsidianMat);
      pier.position.set(px, 4.1, 0);
      group.add(pier);

      const pierMagma = new THREE.Mesh(new THREE.BoxGeometry(0.22, 7.6, 1.02), lavaMat);
      pierMagma.position.set(px, 4.1, 0);
      group.add(pierMagma);
    });

    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(6.4, 0.42, 8, 20, Math.PI),
      obsidianMat,
    );
    arch.position.set(0, 8.0, 0);
    group.add(arch);

    const magmaRing = new THREE.Mesh(
      new THREE.TorusGeometry(6.15, 0.16, 6, 20, Math.PI),
      lavaMat,
    );
    magmaRing.position.set(0, 8.0, 0);
    group.add(magmaRing);
  }

  const baked = bakeStaticGroup(group, { keepTransparent: true, skipObjects });
  baked.userData.animatedProps = animatedProps;
  return baked;
}

// --- Shared Climbable Ramp Chevron Helper (exact BUS_ROOF_Y = 1.95 slope envelope) ---

function addRampChevrons(group: THREE.Group, chevronColor: number): void {
  const rampAngle = Math.atan2(1.95, 2.4);
  const mat = new THREE.MeshBasicMaterial({ color: chevronColor });
  [1.8, 2.5, 3.2].forEach((cz) => {
    const t = (3.8 - cz) / 2.4;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 0.18), mat);
    strip.position.set(0, t * 1.95 + 0.06, cz);
    strip.rotation.x = rampAngle;
    group.add(strip);
  });
}

export const CAVE_TRAIN_ROOF_Y = 3.45;
export const CAVE_TRAIN_HALF_DEPTH = 7.56;

export function createEarthRampModel(): THREE.Group {
  // Sleek Subway Surfers industrial steel train boarding ramp (z = +3.15 ground toe -> z = -2.20 top at y = 3.45m, flush roof tongue ending at -2.74 against cab brow)
  const group = new THREE.Group();
  const H = CAVE_TRAIN_ROOF_Y;
  const frontZ = 3.15;
  const topZ = -2.2;
  const lipEndZ = -2.74;
  const slopeRun = frontZ - topZ; // 5.35m
  const slopeCenterZ = (frontZ + topZ) * 0.5; // +0.475m
  const slopeLen = Math.hypot(slopeRun, H);
  const slopeAngle = Math.atan2(H, slopeRun);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.72,
    roughness: 0.34,
  });
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.55,
    roughness: 0.44,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  // Angled steel side stringers & rear support posts stopping cleanly at z = -2.28 (clear of cab nose/headlights at -2.50)
  [-1.08, 1.08].forEach((sx) => {
    const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, slopeLen), frameMat);
    stringer.position.set(sx, H * 0.5 - 0.04, slopeCenterZ);
    stringer.rotation.x = slopeAngle;
    group.add(stringer);

    const yellowEdge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, slopeLen + 0.04), hazardMat);
    yellowEdge.position.set(sx, H * 0.5 + 0.12, slopeCenterZ);
    yellowEdge.rotation.x = slopeAngle;
    group.add(yellowEdge);

    const rearPost = new THREE.Mesh(new THREE.BoxGeometry(0.22, H - 0.18, 0.24), frameMat);
    rearPost.position.set(sx, (H - 0.18) * 0.5, topZ + 0.04);
    group.add(rearPost);

    const midPost = new THREE.Mesh(new THREE.BoxGeometry(0.18, H * 0.48, 0.2), frameMat);
    midPost.position.set(sx, H * 0.24, slopeCenterZ);
    group.add(midPost);

    const topBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.26), glowMat);
    topBeacon.position.set(sx, H + 0.16, topZ + 0.04);
    group.add(topBeacon);
  });

  // Cross brace & under-deck industrial rib
  const rearBrace = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.28, 0.24), frameMat);
  rearBrace.position.set(0, H * 0.55, topZ + 0.04);
  group.add(rearBrace);

  // Main brushed steel boarding deck
  const rampDeck = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.16, slopeLen), deckMat);
  rampDeck.position.set(0, H * 0.5 - 0.05, slopeCenterZ);
  rampDeck.rotation.x = slopeAngle;
  group.add(rampDeck);

  // Flush top steel bridge tongue at roof level ending at z = -2.74 to meet the cab roof brow edge-to-edge above the lower bumper
  const lipTotalLen = topZ - lipEndZ + 0.1; // 0.64m (-2.10 .. -2.74)
  const topLip = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.12, lipTotalLen), deckMat);
  topLip.position.set(0, H - 0.05, lipEndZ + lipTotalLen * 0.5);
  group.add(topLip);

  const lipTrim = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.08, 0.1), hazardMat);
  lipTrim.position.set(0, H + 0.01, lipEndZ + 0.05);
  group.add(lipTrim);

  // 4 bright amber directional chevron strips guiding the player smoothly up onto the train roof
  [-1.35, -0.15, 1.05, 2.25].forEach((cz) => {
    const t = (frontZ - cz) / slopeRun;
    const yBase = t * H + 0.04;
    [-0.36, 0.36].forEach((cx, sideIdx) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 0.18), glowMat);
      wing.position.set(cx, yBase, cz);
      wing.rotation.x = slopeAngle;
      wing.rotation.y = sideIdx === 0 ? 0.34 : -0.34;
      group.add(wing);
    });
  });

  return bakeStaticGroup(group, { castShadow: true, receiveShadow: true });
}

export function createIceRampModel(): THREE.Group {
  // Sculpted Glacier Ice-Slide Ramp with frosted snow railings & glowing cyan strips
  const group = new THREE.Group();
  const iceHullMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.28,
    roughness: 0.16,
    metalness: 0.18,
  });
  const snowDeckMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.35 });
  const navyTrimMat = new THREE.MeshStandardMaterial({ color: 0x0c4a6e, roughness: 0.3 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.12, 1.84, 5.0), iceHullMat);
  hull.position.set(0, 0.92, -1.1);
  group.add(hull);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.14, 5.0), snowDeckMat);
  deck.position.set(0, 1.9, -1.1);
  group.add(deck);

  [-1.04, 1.04].forEach((rx) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 5.05), navyTrimMat);
    curb.position.set(rx, 1.98, -1.1);
    group.add(curb);

    const neon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 4.9), glowMat);
    neon.position.set(rx, 2.12, -1.1);
    group.add(neon);
  });

  const rampLen = Math.hypot(2.4, 1.95);
  const rampAngle = Math.atan2(1.95, 2.4);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.18, rampLen), snowDeckMat);
  ramp.position.set(0, 1.95 * 0.5 - 0.04, 2.6);
  ramp.rotation.x = rampAngle;
  group.add(ramp);

  [-0.98, 0.98].forEach((rx) => {
    const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, rampLen), iceHullMat);
    sideRail.position.set(rx, 1.95 * 0.5 + 0.08, 2.6);
    sideRail.rotation.x = rampAngle;
    group.add(sideRail);
  });

  addRampChevrons(group, 0x0284c7);
  return bakeStaticGroup(group, { castShadow: true, receiveShadow: true });
}

export function createLavaRampModel(): THREE.Group {
  // Forged Obsidian & Iron Magma Bridge Ramp with molten glowing side rails
  const group = new THREE.Group();
  const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.42, metalness: 0.45 });
  const ironDeckMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.36, metalness: 0.5 });
  const magmaMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.12, 1.84, 5.0), obsidianMat);
  hull.position.set(0, 0.92, -1.1);
  group.add(hull);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.14, 5.0), ironDeckMat);
  deck.position.set(0, 1.9, -1.1);
  group.add(deck);

  [-1.02, 1.02].forEach((rx) => {
    const channel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 5.05), obsidianMat);
    channel.position.set(rx, 1.98, -1.1);
    group.add(channel);

    const lavaStrip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 4.9), magmaMat);
    lavaStrip.position.set(rx, 2.1, -1.1);
    group.add(lavaStrip);
  });

  const rampLen = Math.hypot(2.4, 1.95);
  const rampAngle = Math.atan2(1.95, 2.4);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.18, rampLen), ironDeckMat);
  ramp.position.set(0, 1.95 * 0.5 - 0.04, 2.6);
  ramp.rotation.x = rampAngle;
  group.add(ramp);

  [-0.98, 0.98].forEach((rx) => {
    const rStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, rampLen), magmaMat);
    rStrip.position.set(rx, 1.95 * 0.5 + 0.06, 2.6);
    rStrip.rotation.x = rampAngle;
    group.add(rStrip);
  });

  addRampChevrons(group, 0xfacc15);
  return bakeStaticGroup(group, { castShadow: true, receiveShadow: true });
}

// --- Biome-Native Obstacles ---

export function createMineCartModel(): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.78 });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.75,
    roughness: 0.32,
  });

  const tub = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.15, 2.2), woodMat);
  tub.position.y = 0.88;
  tub.castShadow = true;
  group.add(tub);

  const rim = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.14, 2.28), ironMat);
  rim.position.y = 1.44;
  group.add(rim);

  const ore = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.65, 0),
    new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xd97706,
      emissiveIntensity: 0.75,
    }),
  );
  ore.position.set(0, 1.5, 0);
  group.add(ore);

  [-0.7, 0.7].forEach((wx) => {
    [-0.75, 0.75].forEach((wz) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 12), ironMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.26, wz);
      group.add(wheel);
    });
  });

  return bakeStaticGroup(group, { castShadow: true, forceLambert: true });
}

export function createMovingMineCartModel(): THREE.Group {
  // Rail locomotive mine cart with front headlamp glow & spinning iron wheels
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.78, roughness: 0.28 });
  const goldMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.72, 1.2, 2.35), bodyMat);
  hull.position.y = 0.92;
  hull.castShadow = true;
  group.add(hull);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.34, 0.32), ironMat);
  bumper.position.set(0, 0.56, 1.24);
  group.add(bumper);

  const lampHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.26, 10), ironMat);
  lampHousing.rotation.x = Math.PI / 2;
  lampHousing.position.set(0, 1.12, 1.18);
  group.add(lampHousing);

  const headlamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), goldMat);
  headlamp.position.set(0, 1.12, 1.3);
  group.add(headlamp);

  const ore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), emberMat);
  ore.position.set(0, 1.52, -0.15);
  group.add(ore);

  const wheels: THREE.Mesh[] = [];
  [-0.76, 0.76].forEach((wx) => {
    [-0.78, 0.78].forEach((wz) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12), ironMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.28, wz);
      group.add(wheel);
      wheels.push(wheel);
    });
  });

  const baked = bakeStaticGroup(group, {
    castShadow: true,
    forceLambert: true,
    skipObjects: new Set<THREE.Object3D>(wheels),
  });
  baked.userData.wheels = wheels;
  return baked;
}

const CAVE_TRAIN_GLB_URL = '/models/yeralti_tren.glb';
const CAVE_CAR_LENGTH = 7.4;
const CAVE_CAR_GAP = 0.32;
const CAVE_TRAIN_WIDTH = 2.42;
const CAVE_TRAIN_HEIGHT = CAVE_TRAIN_ROOF_Y;

let caveTrainTemplate: THREE.Group | null = null;
let caveTrainLoadPromise: Promise<THREE.Group | null> | null = null;
let caveTrainGlowTexture: THREE.CanvasTexture | null = null;
let caveTrainHeadlightShared: {
  lensGeo: THREE.BufferGeometry;
  lensMat: THREE.Material;
  parkedLensMat: THREE.Material;
  haloGeo: THREE.BufferGeometry;
  haloMat: THREE.Material;
  beaconGeo: THREE.BufferGeometry;
  beaconMat: THREE.Material;
  parkedBeaconMat: THREE.Material;
  cornerLampGeo: THREE.BufferGeometry;
  tailGeo: THREE.BufferGeometry;
  tailMat: THREE.Material;
  couplerGeo: THREE.BufferGeometry;
  couplerMat: THREE.Material;
  coneGeo: THREE.BufferGeometry;
  coneMat: THREE.Material;
  poolGeo: THREE.BufferGeometry;
  movingPoolMat: THREE.Material;
  parkedPoolMat: THREE.Material;
} | null = null;

function getCaveTrainGlowTexture(): THREE.CanvasTexture {
  if (caveTrainGlowTexture) return caveTrainGlowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 3, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255, 255, 240, 1)');
    grad.addColorStop(0.28, 'rgba(254, 240, 138, 0.86)');
    grad.addColorStop(0.65, 'rgba(245, 158, 11, 0.32)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  caveTrainGlowTexture = tex;
  return tex;
}

function getCaveTrainHeadlightResources() {
  if (caveTrainHeadlightShared) return caveTrainHeadlightShared;
  const glowTex = getCaveTrainGlowTexture();
  caveTrainHeadlightShared = {
    lensGeo: new THREE.SphereGeometry(0.18, 10, 8),
    lensMat: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    parkedLensMat: new THREE.MeshBasicMaterial({ color: 0xfde047 }),
    haloGeo: new THREE.PlaneGeometry(1.18, 1.18),
    haloMat: new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    beaconGeo: new THREE.BoxGeometry(0.76, 0.2, 0.08),
    beaconMat: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
    parkedBeaconMat: new THREE.MeshBasicMaterial({ color: 0x92400e }),
    cornerLampGeo: new THREE.BoxGeometry(0.18, 0.12, 0.08),
    tailGeo: new THREE.BoxGeometry(0.22, 0.18, 0.08),
    tailMat: new THREE.MeshBasicMaterial({ color: 0xef4444 }),
    couplerGeo: new THREE.BoxGeometry(1.94, 2.52, 0.78),
    couplerMat: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.2,
    }),
    coneGeo: new THREE.ConeGeometry(1.42, 10.6, 14, 1, true),
    coneMat: new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    poolGeo: new THREE.PlaneGeometry(3.2, 11.4),
    movingPoolMat: new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    parkedPoolMat: new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  };
  return caveTrainHeadlightShared;
}

export function isCaveTrainModelReady(): boolean {
  return caveTrainTemplate !== null;
}

export function preloadCaveTrainModel(): Promise<THREE.Group | null> {
  if (caveTrainTemplate) return Promise.resolve(caveTrainTemplate);
  if (caveTrainLoadPromise) return caveTrainLoadPromise;

  const loader = new GLTFLoader();
  caveTrainLoadPromise = new Promise<THREE.Group | null>((resolve) => {
    loader.load(
      CAVE_TRAIN_GLB_URL,
      (gltf) => {
        const raw = gltf.scene;
        const holder = new THREE.Group();
        const scalePivot = new THREE.Group();
        // Raw Meshy train is oriented along local +X; rotate inside scalePivot so non-uniform world sx/sy/sz scale matches Z-aligned dimensions cleanly.
        raw.rotation.y = -Math.PI / 2;
        scalePivot.add(raw);
        holder.add(scalePivot);
        holder.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(holder);
        const size = new THREE.Vector3();
        box.getSize(size);

        const sx = size.x > 0.1 ? CAVE_TRAIN_WIDTH / size.x : 1;
        const sy = size.y > 0.1 ? (CAVE_TRAIN_HEIGHT - 0.065) / size.y : 1;
        const sz = size.z > 0.1 ? CAVE_CAR_LENGTH / size.z : 1;
        scalePivot.scale.set(sx, sy, sz);
        holder.updateMatrixWorld(true);

        const scaledBox = new THREE.Box3().setFromObject(holder);
        const scaledCenter = new THREE.Vector3();
        scaledBox.getCenter(scaledCenter);
        // Sit wheels cleanly atop the steel rail cap (y = 0.065 -> exact roof at CAVE_TRAIN_ROOF_Y)
        scalePivot.position.x -= scaledCenter.x;
        scalePivot.position.z -= scaledCenter.z;
        scalePivot.position.y += 0.065 - scaledBox.min.y;

        holder.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = false;
            obj.receiveShadow = true;
            obj.userData.sharedAsset = true;
            obj.userData.sharedGeometry = true;
            obj.userData.sharedMaterial = true;
          }
        });

        caveTrainTemplate = holder;
        resolve(holder);
      },
      undefined,
      () => {
        caveTrainLoadPromise = null;
        resolve(null);
      },
    );
  });
  return caveTrainLoadPromise;
}

export function createCaveTrainModel(isMoving: boolean): THREE.Group {
  if (!caveTrainTemplate) {
    void preloadCaveTrainModel();
    return new THREE.Group();
  }

  const group = new THREE.Group();
  const hullGroup = new THREE.Group();
  const carOffsetZ = (CAVE_CAR_LENGTH + CAVE_CAR_GAP) * 0.5;
  const frontZ = carOffsetZ + CAVE_CAR_LENGTH * 0.5; // 7.56m

  const frontCar = caveTrainTemplate.clone();
  frontCar.position.z = carOffsetZ;
  const rearCar = caveTrainTemplate.clone();
  rearCar.rotation.y = Math.PI;
  rearCar.position.z = -carOffsetZ;

  [frontCar, rearCar].forEach((car) => {
    car.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.userData.sharedAsset = true;
        obj.userData.sharedGeometry = true;
        obj.userData.sharedMaterial = true;
      }
    });
    hullGroup.add(car);
  });

  const hl = getCaveTrainHeadlightResources();
  const markSharedLight = (mesh: THREE.Mesh) => {
    mesh.userData.sharedGeometry = true;
    mesh.userData.sharedMaterial = true;
    return mesh;
  };

  // Rubber gangway bellows connecting the 2 metro cars cleanly
  const coupler = markSharedLight(new THREE.Mesh(hl.couplerGeo, hl.couplerMat));
  coupler.position.set(0, 1.92, 0);
  hullGroup.add(coupler);

  group.add(hullGroup);
  group.userData.trainHull = hullGroup;

  // Front cab route beacon & corner marker lights aligned to the recessed cab brow
  const beacon = markSharedLight(
    new THREE.Mesh(hl.beaconGeo, isMoving ? hl.beaconMat : hl.parkedBeaconMat),
  );
  beacon.position.set(0, CAVE_TRAIN_HEIGHT - 0.26, frontZ - 0.24);
  group.add(beacon);

  [-0.88, 0.88].forEach((cx) => {
    const corner = markSharedLight(
      new THREE.Mesh(hl.cornerLampGeo, isMoving ? hl.beaconMat : hl.parkedBeaconMat),
    );
    corner.position.set(cx, CAVE_TRAIN_HEIGHT - 0.26, frontZ - 0.26);
    group.add(corner);
  });

  // Twin headlights mounted cleanly on the front cab face + rear red tail lights
  [-0.6, 0.6].forEach((hx) => {
    const lens = markSharedLight(
      new THREE.Mesh(hl.lensGeo, isMoving ? hl.lensMat : hl.parkedLensMat),
    );
    lens.position.set(hx, 1.54, frontZ - 0.14);
    group.add(lens);

    if (isMoving) {
      const halo = markSharedLight(new THREE.Mesh(hl.haloGeo, hl.haloMat));
      halo.position.set(hx, 1.54, frontZ - 0.02);
      group.add(halo);
    }

    const tail = markSharedLight(new THREE.Mesh(hl.tailGeo, hl.tailMat));
    tail.position.set(hx, 1.54, -frontZ + 0.14);
    group.add(tail);
  });

  if (isMoving) {
    const beamRig = new THREE.Group();
    [-0.56, 0.56].forEach((hx) => {
      const cone = markSharedLight(new THREE.Mesh(hl.coneGeo, hl.coneMat));
      cone.rotation.x = -Math.PI / 2 - 0.075;
      cone.position.set(hx, 0.96, frontZ + 5.1);
      beamRig.add(cone);
    });
    const groundPool = markSharedLight(new THREE.Mesh(hl.poolGeo, hl.movingPoolMat));
    groundPool.rotation.x = -Math.PI / 2;
    groundPool.position.set(0, 0.115, frontZ + 5.4);
    beamRig.add(groundPool);
    group.add(beamRig);
    group.userData.headlightRig = beamRig;
  } else {
    const parkedPool = markSharedLight(new THREE.Mesh(hl.poolGeo, hl.parkedPoolMat));
    parkedPool.rotation.x = -Math.PI / 2;
    parkedPool.scale.set(0.75, 0.35, 1);
    parkedPool.position.set(0, 0.115, frontZ + 1.4);
    group.add(parkedPool);
  }

  return group;
}

export function createEarthBoulderModel(): THREE.Group {
  const group = new THREE.Group();
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.88, 1),
    new THREE.MeshStandardMaterial({ color: 0x785233, roughness: 0.9 }),
  );
  rock.position.y = 0.84;
  rock.castShadow = true;
  group.add(rock);

  const moss = new THREE.Mesh(
    new THREE.SphereGeometry(0.54, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 }),
  );
  moss.scale.set(1.2, 0.45, 1.1);
  moss.position.set(0, 1.44, 0);
  group.add(moss);

  const crystalMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  [
    [-0.55, 0.92, 0.5],
    [0.52, 0.78, 0.56],
  ].forEach(([cx, cy, cz], idx) => {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), crystalMat);
    shard.position.set(cx, cy, cz);
    shard.rotation.z = idx === 0 ? 0.4 : -0.45;
    group.add(shard);
  });

  return bakeStaticGroup(group, { castShadow: true, forceLambert: true });
}

export function createCrystalPillarModel(): THREE.Group {
  // Glowing amber & cyan cave crystal cluster on stone pedestal
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.9 });
  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.6,
    roughness: 0.18,
  });
  const cyanMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x0d9488,
    emissiveIntensity: 0.55,
    roughness: 0.16,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.9, 0.5, 7), baseMat);
  base.position.y = 0.25;
  group.add(base);

  const mainShard = new THREE.Mesh(new THREE.ConeGeometry(0.56, 1.48, 5), amberMat);
  mainShard.position.set(0, 1.2, 0);
  group.add(mainShard);

  [-0.42, 0.44].forEach((sx, i) => {
    const side = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.05, 5), cyanMat);
    side.position.set(sx, 0.88, i === 0 ? 0.22 : -0.2);
    side.rotation.z = i === 0 ? 0.22 : -0.22;
    group.add(side);
  });

  return bakeStaticGroup(group, { castShadow: true });
}

export function createRootArchModel(): THREE.Group {
  const group = new THREE.Group();
  const rootMat = new THREE.MeshStandardMaterial({ color: 0x7c4a21, roughness: 0.88 });
  const glowVineMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

  [-0.95, 0.95].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.2, 8), rootMat);
    post.position.set(px, 1.1, 0);
    group.add(post);
  });

  // Crossbar positioned strictly within y = 1.50 .. 2.18 (matches road_sign clearance)
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 2.25, 10), rootMat);
  log.rotation.z = Math.PI / 2;
  log.position.set(0, 1.84, 0);
  group.add(log);

  [-0.55, 0, 0.55].forEach((vx) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.055, 6, 12), glowVineMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(vx, 1.84, 0);
    group.add(ring);
  });

  return bakeStaticGroup(group, { castShadow: true, forceLambert: true });
}

export function createMushroomClusterModel(): THREE.Group {
  const group = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x0d9488,
    emissiveIntensity: 0.5,
    roughness: 0.4,
  });

  [
    [-0.38, 0.65, 0.45],
    [0.36, 0.55, 0.38],
    [0, 0.85, 0.56],
  ].forEach(([mx, mh, r]) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, mh, 8), stemMat);
    stem.position.set(mx, mh * 0.5, 0);
    group.add(stem);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      capMat,
    );
    cap.position.set(mx, mh, 0);
    group.add(cap);
  });

  return bakeStaticGroup(group, { castShadow: true, forceLambert: true });
}

export function createIceWallModel(): THREE.Group {
  const group = new THREE.Group();
  const iceMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.32,
    roughness: 0.12,
    metalness: 0.24,
  });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x0c4a6e, roughness: 0.35 });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.22, 1.38), baseMat);
  plinth.position.y = 0.11;
  group.add(plinth);

  const block = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.34, 1.24), iceMat);
  block.position.y = 0.88;
  block.castShadow = true;
  group.add(block);

  // Spikes capped strictly at y = 1.94 (exact 1:1 hitbox alignment)
  [-0.54, 0, 0.54].forEach((sx, idx) => {
    const h = idx === 1 ? 0.42 : 0.32;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.26, h, 5), iceMat);
    spike.position.set(sx, 1.54 + h * 0.5, 0);
    group.add(spike);
  });

  return bakeStaticGroup(group, { castShadow: true });
}

export function createIceCrystalModel(): THREE.Group {
  const group = new THREE.Group();
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x0c4a6e, roughness: 0.35 });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.48,
    roughness: 0.08,
    metalness: 0.22,
  });

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 0.32, 6), plinthMat);
  plinth.position.y = 0.16;
  group.add(plinth);

  // Crystal apex reaches y = 1.90 cleanly (matches height = 1.88, halfWidth = 0.68)
  const main = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), crystalMat);
  main.scale.set(0.95, 1.28, 0.95);
  main.position.y = 1.03;
  group.add(main);

  return bakeStaticGroup(group, { castShadow: true });
}

export function createMovingIceSledModel(): THREE.Group {
  // Polar jet-sled gliding forward along an ice lane with bright cyan front beacon
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  group.userData.hoverMesh = body;

  const sledMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.22, metalness: 0.25 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x0c4a6e, metalness: 0.7, roughness: 0.25 });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  [-0.66, 0.66].forEach((sx) => {
    const ski = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 2.55), steelMat);
    ski.position.set(sx, 0.08, 0);
    body.add(ski);
  });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.92, 2.15), sledMat);
  hull.position.y = 0.72;
  hull.castShadow = true;
  body.add(hull);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.44, 1.35), trimMat);
  hood.position.set(0, 1.36, -0.15);
  body.add(hood);

  const bumperGlow = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.24, 0.22), lightMat);
  bumperGlow.position.set(0, 0.68, 1.12);
  body.add(bumperGlow);

  bakeStaticGroup(body, { castShadow: true });
  return group;
}

export function createSnowmanBarrierModel(): THREE.Group {
  // Giant Arctic Snowman barricade with top hat, crimson scarf & carrot nose
  const group = new THREE.Group();
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.75 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 });
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
  const noseMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });

  const base = new THREE.Mesh(new THREE.SphereGeometry(0.84, 12, 10), snowMat);
  base.scale.set(1.0, 0.85, 0.92);
  base.position.y = 0.68;
  group.add(base);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.56, 12, 10), snowMat);
  head.position.y = 1.48;
  group.add(head);

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.12, 6, 14), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.14;
  group.add(scarf);

  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.08, 12), hatMat);
  hatBrim.position.y = 1.9;
  group.add(hatBrim);

  const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.36, 12), hatMat);
  hatCrown.position.y = 2.06;
  group.add(hatCrown);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 6), noseMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.5, 0.68);
  group.add(nose);

  return bakeStaticGroup(group, { castShadow: true, forceLambert: true });
}

export function createIcicleArchModel(): THREE.Group {
  const group = new THREE.Group();
  const navyMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.28, metalness: 0.25 });
  const iceMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.35,
    roughness: 0.1,
    metalness: 0.15,
  });

  [-0.95, 0.95].forEach((px) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.2, 6), navyMat);
    col.position.set(px, 1.1, 0);
    group.add(col);
  });

  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.42, 0.36), navyMat);
  beam.position.set(0, 1.98, 0);
  group.add(beam);

  // Icicle tips cleanly terminate at y = 1.46 (>= minY 1.45)
  [-0.6, 0, 0.6].forEach((ix) => {
    const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 5), iceMat);
    icicle.rotation.x = Math.PI;
    icicle.position.set(ix, 1.63, 0);
    group.add(icicle);
  });

  return bakeStaticGroup(group, { castShadow: true });
}

export function createSnowBallModel(): THREE.Group {
  const group = new THREE.Group();
  const spinPivot = new THREE.Group();
  spinPivot.position.y = 0.58;
  group.add(spinPivot);
  group.userData.spinPivot = spinPivot;

  const ball = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.58, 1),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 }),
  );
  ball.castShadow = true;
  spinPivot.add(ball);

  const iceBandMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.38,
    roughness: 0.2,
    metalness: 0.15,
  });
  const deepIceMat = new THREE.MeshStandardMaterial({
    color: 0x0c4a6e,
    roughness: 0.32,
  });
  const iceBand = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.08, 6, 14), iceBandMat);
  iceBand.rotation.y = Math.PI / 2;
  spinPivot.add(iceBand);

  const crossBand = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.06, 6, 14), deepIceMat);
  spinPivot.add(crossBand);

  [
    [0.44, 0.25, 0.22],
    [-0.44, -0.22, -0.24],
    [0, 0.48, -0.25],
    [0, -0.48, 0.25],
  ].forEach(([sx, sy, sz]) => {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), iceBandMat);
    shard.position.set(sx, sy, sz);
    spinPivot.add(shard);
  });

  bakeStaticGroup(spinPivot, { castShadow: true, forceLambert: true });
  return group;
}

export function createLavaRockModel(): THREE.Group {
  const group = new THREE.Group();
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.92, 1),
    new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 }),
  );
  rock.position.y = 0.85;
  group.add(rock);

  const magmaMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.84, 0), magmaMat);
  core.position.y = 0.9;
  group.add(core);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.08, 6, 14), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.78;
  group.add(belt);

  return bakeStaticGroup(group, { castShadow: true, forceLambert: true });
}

export function createFirePillarModel(): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.64, 0.95, 8),
    new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.65 }),
  );
  base.position.y = 0.475;
  group.add(base);

  const emberRim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.54, 0.54, 0.14, 8),
    new THREE.MeshBasicMaterial({ color: 0xf97316 }),
  );
  emberRim.position.y = 0.95;
  group.add(emberRim);

  // Flame tip cleanly reaches y = 1.98 (exact match to height = 1.95, halfWidth = 0.68)
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.52, 1.0, 8),
    new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
  );
  flame.position.y = 1.48;
  group.add(flame);

  return bakeStaticGroup(group, { castShadow: true, forceLambert: true });
}

export function createMovingMagmaCartModel(): THREE.Group {
  // Obsidian volcanic drill cart with molten headlight & spinning iron wheels
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45, metalness: 0.55 });
  const lavaMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x52525b, metalness: 0.8, roughness: 0.3 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.74, 1.24, 2.35), hullMat);
  body.position.y = 0.94;
  body.castShadow = true;
  group.add(body);

  const glowBand = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.24, 2.4), lavaMat);
  glowBand.position.y = 1.05;
  group.add(glowBand);

  const drillCone = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.72, 8), yellowMat);
  drillCone.rotation.x = Math.PI / 2;
  drillCone.position.set(0, 0.85, 1.38);
  group.add(drillCone);

  const wheels: THREE.Mesh[] = [];
  [-0.78, 0.78].forEach((wx) => {
    [-0.78, 0.78].forEach((wz) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12), ironMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.28, wz);
      group.add(wheel);
      wheels.push(wheel);
    });
  });

  const baked = bakeStaticGroup(group, {
    castShadow: true,
    skipObjects: new Set<THREE.Object3D>(wheels),
  });
  baked.userData.wheels = wheels;
  return baked;
}

export function createLavaCauldronModel(): THREE.Group {
  // Giant forged iron caldera cauldron brimming with glowing molten gold magma
  const group = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.65, roughness: 0.4 });
  const lavaMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const crustMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.74, 1.48, 12), ironMat);
  pot.position.y = 0.74;
  pot.castShadow = true;
  group.add(pot);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 8, 16), crustMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.48;
  group.add(rim);

  const magmaPool = new THREE.Mesh(new THREE.SphereGeometry(0.76, 10, 8), lavaMat);
  magmaPool.scale.set(1.0, 0.55, 1.0);
  magmaPool.position.y = 1.46;
  group.add(magmaPool);

  return bakeStaticGroup(group, { castShadow: true });
}

export function createMagmaArchModel(): THREE.Group {
  const group = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.45 });
  const amberMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

  [-0.95, 0.95].forEach((px) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.2, 0.24), ironMat);
    col.position.set(px, 1.1, 0);
    group.add(col);
  });

  // Crossbar strictly within y = 1.50 .. 2.18
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 2.2, 10),
    new THREE.MeshBasicMaterial({ color: 0xf97316 }),
  );
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.84, 0);
  group.add(bar);

  [-0.55, 0, 0.55].forEach((rx) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 12), amberMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(rx, 1.84, 0);
    group.add(ring);
  });

  return bakeStaticGroup(group, { castShadow: true, forceLambert: true });
}

export function createFireBarrelModel(): THREE.Group {
  const group = new THREE.Group();
  const spinPivot = new THREE.Group();
  spinPivot.position.y = 0.58;
  group.add(spinPivot);
  group.userData.spinPivot = spinPivot;

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.56, 1.25, 14),
    new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.42, metalness: 0.45 }),
  );
  barrel.rotation.z = Math.PI / 2;
  spinPivot.add(barrel);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.08, 8, 16),
    new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
  );
  ring.rotation.y = Math.PI / 2;
  spinPivot.add(ring);

  bakeStaticGroup(spinPivot, { castShadow: true });
  return group;
}

/**
 * Gökyüzü Uçuş Koridoru (Üstte ayrı bir sahne hissi: katener direkleri, havai hat telleri ve 3D bulutlar)
 */
export function createSkywaySegmentModel(segIndex: number): THREE.Group {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.65,
    roughness: 0.35,
  });
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x0f172a,
  });
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xbae6fd,
    emissiveIntensity: 0.22,
    roughness: 0.9,
  });

  // High overhead steel catenary crossbar (passes cleanly ABOVE high jetpack camera!)
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.28, 0.32), steelMat);
  crossbar.position.set(0, 16.4, 0);
  group.add(crossbar);

  [-5.6, 5.6].forEach((px) => {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 8.8, 8), steelMat);
    mast.position.set(px, 12.1, 0);
    group.add(mast);
  });

  // 6 sleek longitudinal overhead catenary wires running above the flight corridor
  [-3.2, -2.0, -0.6, 0.6, 2.0, 3.2].forEach((wx) => {
    const insulator = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.24, 8),
      steelMat,
    );
    insulator.position.set(wx, 16.18, 0);
    group.add(insulator);

    const wire = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 20), wireMat);
    wire.position.set(wx, 16.05, 0);
    group.add(wire);
  });

  // Fluffy arcade clouds flanking both sides of the aerial corridor
  [-1, 1].forEach((side, idx) => {
    const cloud = new THREE.Group();
    const cz = idx === 0 ? -4 : 5;
    const cy = 9.0 + ((segIndex + idx) % 3) * 1.1;
    const cx = side * (6.8 + ((segIndex + idx) % 2) * 1.4);

    [
      [0, 0, 0, 1.3],
      [-1.05, -0.18, 0.2, 0.92],
      [1.05, -0.15, -0.2, 0.95],
      [0.2, 0.48, 0.15, 0.85],
    ].forEach(([ox, oy, oz, r]) => {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), cloudMat);
      puff.position.set(ox, oy, oz);
      cloud.add(puff);
    });
    cloud.position.set(cx, cy, cz);
    group.add(cloud);
  });

  return bakeStaticGroup(group, { keepTransparent: true });
}

/**
 * Sahne Sınırı Tematik Geçiş Kemeri (Yolu kapatmadan yeni dünyaya giriş kapısı!)
 */
export function createBiomeTransitionGateModel(
  accentColor: number,
  trimColor: number,
): THREE.Group {
  const group = new THREE.Group();
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.75,
    roughness: 0.25,
  });
  const glowMat = new THREE.MeshBasicMaterial({ color: accentColor });
  const trimMat = new THREE.MeshStandardMaterial({
    color: trimColor,
    emissive: accentColor,
    emissiveIntensity: 0.55,
    roughness: 0.25,
  });
  const dynamicMeshes = new Set<THREE.Object3D>();

  [-4.9, 4.9].forEach((px) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.1), darkMetalMat);
    base.position.set(px, 0.25, 0);
    group.add(base);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 7.8, 12), darkMetalMat);
    pillar.position.set(px, 3.9, 0);
    group.add(pillar);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 6.8, 0.42), glowMat);
    strip.position.set(px, 3.9, 0.14);
    group.add(strip);
    dynamicMeshes.add(strip);
  });

  const archBeam = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.72, 0.68), trimMat);
  archBeam.position.set(0, 7.85, 0);
  group.add(archBeam);
  dynamicMeshes.add(archBeam);

  const neonTop = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.22, 0.74), glowMat);
  neonTop.position.set(0, 7.85, 0);
  group.add(neonTop);
  dynamicMeshes.add(neonTop);

  group.userData.glowMat = glowMat;
  group.userData.trimMat = trimMat;

  return bakeStaticGroup(group, { skipObjects: dynamicMeshes });
}

// --- 5. BÖLGE: DEV MUTFAK TEZGÂHI ---

export function createKitchenSegmentProps(
  segIndex: number,
  kitchenWallMat?: THREE.Material,
): THREE.Group {
  const group = new THREE.Group();
  const animatedProps: Array<{
    obj: THREE.Object3D;
    kind: 'bob' | 'sway' | 'spin' | 'pulse';
    baseY: number;
    phase: number;
    amp: number;
    speed: number;
  }> = [];
  const skipObjects = new Set<THREE.Object3D>();

  const tileWallMat =
    kitchenWallMat ?? new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.35 });
  const cabinetWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 });
  const warmBoardMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.72 });
  const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.52 });
  const cheeseHoleMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.72 });
  const pancakeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65 });
  const syrupMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.18, metalness: 0.1 });
  const redPlasticMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.22,
    metalness: 0.12,
  });
  const mustardMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.24,
    metalness: 0.1,
  });
  const steelCapMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.8,
    roughness: 0.22,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.12,
    metalness: 0.1,
  });
  const mugMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.18,
    metalness: 0.08,
  });
  const coffeeMat = new THREE.MeshStandardMaterial({ color: 0x3e1f0d, roughness: 0.25 });
  const counterTrimMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.48 });
  const ledStripMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const steamMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.36,
    roughness: 0.95,
  });
  const copperPotMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.78,
    roughness: 0.22,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.42,
    roughness: 0.08,
  });

  const variant = segIndex % 4;

  [-1, 1].forEach((side, idx) => {
    const counterLip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 20), counterTrimMat);
    counterLip.position.set(side * 4.08, 0.2, 0);
    group.add(counterLip);

    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.6, 13.0, 19.8), tileWallMat);
    wall.position.set(side * 10.6, 6.5, 0);
    if (kitchenWallMat) wall.userData.sharedMaterial = true;
    group.add(wall);

    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.2, 16.0), cabinetWoodMat);
    cabinet.position.set(side * 9.3, 10.2, 0);
    group.add(cabinet);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 16.4), warmBoardMat);
    trim.position.set(side * 9.2, 8.5, 0);
    group.add(trim);

    const underLed = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 14.5), ledStripMat);
    underLed.position.set(side * 8.35, 8.32, 0);
    group.add(underLed);

    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 8.0), cabinetWoodMat);
    shelf.position.set(side * 9.35, 5.4, 2.0);
    group.add(shelf);
    [0, 1, 2].forEach((ji) => {
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.9, 8),
        ji === 0 ? redPlasticMat : ji === 1 ? mustardMat : steelCapMat,
      );
      jar.position.set(side * 9.15, 5.95, 0.2 + ji * 1.4);
      group.add(jar);
    });

    const subV = (variant + idx) % 4;
    if (subV === 0) {
      // Giant Swiss cheese wedge on wooden serving board
      const board = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.28, 4.2), warmBoardMat);
      board.position.set(side * 6.9, 0.24, -3.5);
      group.add(board);

      const cheese = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 4.0, 3), cheeseMat);
      cheese.position.set(side * 6.9, 2.35, -3.5);
      cheese.rotation.y = side * 0.5;
      group.add(cheese);

      [-0.7, 0.2, 0.95].forEach((hy, hi) => {
        const hole = new THREE.Mesh(
          new THREE.SphereGeometry(0.42 - hi * 0.05, 8, 8),
          cheeseHoleMat,
        );
        hole.position.set(side * 5.75, 2.0 + hy, -3.7 + hi * 0.85);
        group.add(hole);
      });
    } else if (subV === 1) {
      // Twin Giant Squeeze Ketchup & Mustard Bottles
      const kBottle = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 4.8, 12), redPlasticMat);
      kBottle.position.set(side * 6.7, 2.5, -4.4);
      group.add(kBottle);

      const kLabel = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.12, 1.6, 12), plateMat);
      kLabel.position.set(side * 6.7, 2.4, -4.4);
      group.add(kLabel);

      const kNozzle = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.3, 10), plateMat);
      kNozzle.position.set(side * 6.7, 5.5, -4.4);
      group.add(kNozzle);

      const mBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.98, 4.1, 12), mustardMat);
      mBottle.position.set(side * 7.6, 2.15, -1.6);
      group.add(mBottle);

      const mNozzle = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 10), redPlasticMat);
      mNozzle.position.set(side * 7.6, 4.7, -1.6);
      group.add(mNozzle);
    } else if (subV === 2) {
      // Towering Pancake Stack with Butter Pat & Maple Syrup
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.6, 0.34, 14), plateMat);
      dish.position.set(side * 6.9, 0.22, -3.4);
      group.add(dish);

      for (let pk = 0; pk < 5; pk++) {
        const cake = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.68, 0.44, 14), pancakeMat);
        cake.position.set(side * 6.9, 0.62 + pk * 0.48, -3.4);
        group.add(cake);
      }
      const syrupTop = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 0.2, 12), syrupMat);
      syrupTop.position.set(side * 6.9, 2.86, -3.4);
      group.add(syrupTop);

      const butterPat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.38, 0.9), cheeseMat);
      butterPat.position.set(side * 6.9, 3.12, -3.4);
      butterPat.rotation.y = 0.4;
      group.add(butterPat);
    } else {
      // Giant Retro Kitchen Blender with Berry Smoothie & Spinning Lid
      const bx = side * 7.0;
      const bz = -3.4;
      const motorBase = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 1.5, 12), redPlasticMat);
      motorBase.position.set(bx, 0.78, bz);
      group.add(motorBase);

      const pitcher = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 0.92, 2.8, 12), glassMat);
      pitcher.position.set(bx, 2.95, bz);
      group.add(pitcher);

      const smoothie = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 0.84, 1.85, 12), mustardMat);
      smoothie.position.set(bx, 2.52, bz);
      group.add(smoothie);

      const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.26, 1.26, 0.28, 12), steelCapMat);
      lid.position.set(bx, 4.45, bz);
      group.add(lid);
    }

    for (let p = 0; p < 3; p++) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.3, 0.34, 14), plateMat);
      plate.position.set(side * 6.6, 0.25 + p * 0.38, 5.2);
      group.add(plate);
    }

    if ((segIndex + idx) % 2 === 1) {
      const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.85, 2.2, 12), mugMat);
      mugBody.position.set(side * 6.6, 2.45, 5.2);
      group.add(mugBody);

      const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.1, 10), coffeeMat);
      coffee.position.set(side * 6.6, 3.52, 5.2);
      group.add(coffee);

      const mugHandle = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.14, 6, 12), mugMat);
      mugHandle.position.set(side * 5.65, 2.45, 5.2);
      group.add(mugHandle);

      const steamGroup = new THREE.Group();
      steamGroup.position.set(side * 6.6, 4.2, 5.2);
      [0, 1, 2].forEach((sp) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.32 + sp * 0.08, 7, 6), steamMat);
        puff.position.set(side * sp * 0.12, sp * 0.68, -sp * 0.1);
        steamGroup.add(puff);
      });
      group.add(steamGroup);
      skipObjects.add(steamGroup);
      animatedProps.push({
        obj: steamGroup,
        kind: 'bob',
        baseY: 4.2,
        phase: segIndex * 0.8 + idx * 1.5,
        amp: 0.26,
        speed: 2.1,
      });
    } else {
      const cutBoard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.8, 2.4), warmBoardMat);
      cutBoard.position.set(side * 8.6, 2.0, 4.6);
      cutBoard.rotation.z = side * 0.16;
      group.add(cutBoard);

      const shaker = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 2.2, 10), plateMat);
      shaker.position.set(side * 5.55, 1.2, 1.8);
      group.add(shaker);

      const domeCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.66, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
        steelCapMat,
      );
      domeCap.position.set(side * 5.55, 2.3, 1.8);
      group.add(domeCap);
    }

    if (variant === 0 || variant === 2) {
      const rackPost = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 14.3, 8), steelCapMat);
      rackPost.position.set(side * 5.35, 7.15, 0);
      group.add(rackPost);
    }
  });

  // High Overhead Stainless & Copper Pot-Rack Bridge (y = 14.3m -> clears Jetpack cleanly!)
  if (variant === 0 || variant === 2) {
    const rackBeam = new THREE.Mesh(new THREE.BoxGeometry(11.1, 0.36, 0.52), steelCapMat);
    rackBeam.position.set(0, 14.3, 0);
    group.add(rackBeam);

    const rackLight = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.12, 0.38), ledStripMat);
    rackLight.position.set(0, 14.08, 0);
    group.add(rackLight);

    [-4.35, 4.35].forEach((px, pIdx) => {
      const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.15, 6), steelCapMat);
      hook.position.set(px, 13.65, 0);
      group.add(hook);

      const pan = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.48, 0.36, 10),
        pIdx === 0 ? copperPotMat : steelCapMat,
      );
      pan.position.set(px, 12.95, 0);
      group.add(pan);
    });
  }

  const baked = bakeStaticGroup(group, { keepTransparent: true, keepTextured: true, skipObjects });
  baked.userData.animatedProps = animatedProps;
  return baked;
}

// --- 6. BÖLGE: KÖPÜKLÜ BANYO ---

export function createBathSegmentProps(
  segIndex: number,
  bathWallMat?: THREE.Material,
  bathBoardMats?: THREE.Material[],
  bathBoardGeo?: THREE.BufferGeometry,
): THREE.Group {
  const group = new THREE.Group();
  const animatedProps: Array<{
    obj: THREE.Object3D;
    kind: 'bob' | 'sway' | 'spin' | 'pulse';
    baseY: number;
    phase: number;
    amp: number;
    speed: number;
  }> = [];
  const skipObjects = new Set<THREE.Object3D>();

  const wallMat =
    bathWallMat ?? new THREE.MeshStandardMaterial({ color: 0xa5f3fc, roughness: 0.28 });
  const porcelainMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.14,
    metalness: 0.08,
  });
  const dadoMat = new THREE.MeshStandardMaterial({
    color: 0x0e7490,
    roughness: 0.25,
    metalness: 0.12,
  });
  const marbleShelfMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.2,
    metalness: 0.05,
  });
  const foamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 });
  const duckYellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.16,
    metalness: 0.08,
  });
  const duckBeakMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
  const shampooMat = new THREE.MeshStandardMaterial({
    color: segIndex % 2 === 0 ? 0xec4899 : 0x06b6d4,
    roughness: 0.18,
    metalness: 0.12,
  });
  const mintMat = new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.28 });
  const lavenderMat = new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.28 });
  const soapPinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.22 });
  const spongeMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.85 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.88,
    roughness: 0.14,
  });
  const towelMat = new THREE.MeshStandardMaterial({
    color: segIndex % 2 === 0 ? 0xf472b6 : 0x38bdf8,
    roughness: 0.85,
  });
  const towelAltMat = new THREE.MeshStandardMaterial({
    color: segIndex % 2 === 0 ? 0x22d3ee : 0xfde047,
    roughness: 0.85,
  });
  const hotCapMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25 });
  const coldCapMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.25 });
  const vanityGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
  const aquaLedMat = new THREE.MeshBasicMaterial({ color: 0xa5f3fc });
  const { waterStreamMat, curtainAquaMat, curtainPinkMat, bubbleMat } = getBathSharedTransMats();
  const curtainMat = segIndex % 2 === 0 ? curtainAquaMat : curtainPinkMat;

  const baseVariant = segIndex % 4;

  [-1, 1].forEach((side, idx) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.5, 13.4, 19.8), wallMat);
    wall.position.set(side * 10.6, 6.7, 0);
    if (bathWallMat) wall.userData.sharedMaterial = true;
    group.add(wall);

    const dadoRail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 19.8), dadoMat);
    dadoRail.position.set(side * 9.75, 4.85, 0);
    group.add(dadoRail);

    const crownTrim = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 19.8), porcelainMat);
    crownTrim.position.set(side * 9.65, 13.05, 0);
    group.add(crownTrim);

    const tubCurb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.72, 20), porcelainMat);
    tubCurb.position.set(side * 4.12, -0.08, 0);
    group.add(tubCurb);

    if (bathBoardMats && bathBoardMats.length > 0 && bathBoardGeo) {
      const panelMat = bathBoardMats[(segIndex + idx) % bathBoardMats.length];
      const panelFrame = new THREE.Mesh(new THREE.BoxGeometry(4.7, 2.48, 0.22), chromeMat);
      panelFrame.position.set(side * 9.65, 7.65, -2.6);
      panelFrame.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
      group.add(panelFrame);

      const panelMesh = new THREE.Mesh(bathBoardGeo, panelMat);
      panelMesh.position.set(side * 9.52, 7.65, -2.6);
      panelMesh.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
      panelMesh.userData.sharedMaterial = true;
      panelMesh.userData.sharedGeometry = true;
      group.add(panelMesh);

      [-5.35, 0.15].forEach((sz) => {
        const sconceBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.16, 0.22, 8),
          chromeMat,
        );
        sconceBase.rotation.z = Math.PI / 2;
        sconceBase.position.set(side * 9.65, 7.65, sz);
        group.add(sconceBase);

        const sconceGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), vanityGlowMat);
        sconceGlobe.position.set(side * 9.35, 7.65, sz);
        group.add(sconceGlobe);
      });
    }

    const towelBar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.8, 8), chromeMat);
    towelBar.rotation.x = Math.PI / 2;
    towelBar.position.set(side * 9.48, 5.75, 4.6);
    group.add(towelBar);

    [-1.1, 1.1].forEach((tz, tIdx) => {
      const tMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 2.45 - tIdx * 0.25, 1.75),
        tIdx === 0 ? towelMat : towelAltMat,
      );
      tMesh.position.set(side * 9.42, 4.65 - tIdx * 0.12, 4.6 + tz);
      group.add(tMesh);
    });

    for (let f = 0; f < 4; f++) {
      const fz = -7.0 + f * 4.5;
      const fx = side * (5.35 + ((f + idx) % 2) * 0.65);
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1.15, 9, 7), foamMat);
      puff.scale.set(1.25, 0.45, 1.35);
      puff.position.set(fx, -0.15, fz);
      group.add(puff);

      const topPuff = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 6), foamMat);
      topPuff.position.set(fx - side * 0.28, 0.22, fz + 0.35);
      group.add(topPuff);
    }

    // Bobbing mini duckling on side canal (animated prop!)
    const miniDuck = new THREE.Group();
    const mdBody = new THREE.Mesh(new THREE.SphereGeometry(0.46, 8, 7), duckYellowMat);
    mdBody.scale.set(1.0, 0.8, 1.3);
    mdBody.position.y = 0.04;
    miniDuck.add(mdBody);
    const mdHead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), duckYellowMat);
    mdHead.position.set(0, 0.45, 0.22);
    miniDuck.add(mdHead);
    const mdBeak = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 6), duckBeakMat);
    mdBeak.rotation.x = Math.PI / 2;
    mdBeak.position.set(0, 0.42, 0.52);
    miniDuck.add(mdBeak);
    miniDuck.position.set(side * 5.2, -0.14, idx === 0 ? -4.8 : 4.2);
    miniDuck.rotation.y = side === -1 ? 0.65 : -0.65;
    group.add(miniDuck);
    skipObjects.add(miniDuck);
    animatedProps.push({
      obj: miniDuck,
      kind: 'bob',
      baseY: -0.14,
      phase: segIndex * 0.9 + idx * 1.8,
      amp: 0.14,
      speed: 2.8,
    });

    // 4-way rotating hero bathroom landmarks per segment
    const variant = (baseVariant + idx) % 4;
    if (variant === 0) {
      const fx = side * 8.2;
      const fz = -3.4;
      const faucetBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.15, 3.6), porcelainMat);
      faucetBase.position.set(fx, 0.55, fz);
      group.add(faucetBase);

      const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 3.1, 10), chromeMat);
      riser.position.set(fx + side * 0.2, 2.65, fz);
      group.add(riser);

      const swanArc = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.28, 8, 16, Math.PI),
        chromeMat,
      );
      swanArc.position.set(fx - side * 0.95, 4.15, fz);
      group.add(swanArc);

      const spoutRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 6, 12), chromeMat);
      spoutRing.rotation.x = Math.PI / 2;
      spoutRing.position.set(fx - side * 2.1, 4.12, fz);
      group.add(spoutRing);

      [-1.0, 1.0].forEach((tz, ti) => {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.72, 8), chromeMat);
        stem.position.set(fx, 1.48, fz + tz);
        group.add(stem);
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.28, 0.16, 10),
          ti === 0 ? hotCapMat : coldCapMat,
        );
        cap.position.set(fx, 1.88, fz + tz);
        group.add(cap);
      });

      const stream = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.44, 4.25, 10),
        waterStreamMat,
      );
      stream.userData.sharedMaterial = true;
      stream.position.set(fx - side * 2.1, 1.98, fz);
      group.add(stream);

      const splashFoam = new THREE.Mesh(new THREE.SphereGeometry(0.95, 9, 7), foamMat);
      splashFoam.scale.set(1.2, 0.55, 1.2);
      splashFoam.position.set(fx - side * 2.1, -0.05, fz);
      group.add(splashFoam);

      const duck = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 10), duckYellowMat);
      body.scale.set(1.0, 0.82, 1.35);
      body.position.y = 1.25;
      duck.add(body);

      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.88, 6), duckYellowMat);
      tail.rotation.x = -Math.PI * 0.35;
      tail.position.set(0, 1.72, -1.7);
      duck.add(tail);

      [-1, 1].forEach((ws) => {
        const wing = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 6), duckYellowMat);
        wing.scale.set(0.35, 0.72, 1.15);
        wing.position.set(ws * 1.34, 1.35, -0.1);
        duck.add(wing);

        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), eyeMat);
        eye.position.set(ws * 0.5, 2.8, 1.38);
        duck.add(eye);
      });

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.92, 10, 8), duckYellowMat);
      head.position.set(0, 2.6, 0.72);
      duck.add(head);

      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 8), duckBeakMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 2.5, 1.72);
      duck.add(beak);

      duck.position.set(side * 7.25, 0.05, 3.6);
      duck.rotation.y = side === -1 ? 0.52 : -0.52;
      group.add(duck);
    } else if (variant === 1) {
      const vx = side * 7.6;
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.35, 8.6), marbleShelfMat);
      pedestal.position.set(vx, 0.65, 0.4);
      group.add(pedestal);

      const cupZ = -1.8;
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.72, 2.05, 12), porcelainMat);
      cup.position.set(vx, 2.35, cupZ);
      group.add(cup);

      const cupBand = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.8, 0.42, 12), dadoMat);
      cupBand.position.set(vx, 2.45, cupZ);
      group.add(cupBand);

      [-0.28, 0.28].forEach((offset, bi) => {
        const tbGroup = new THREE.Group();
        const handle = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 3.4, 0.16),
          bi === 0 ? soapPinkMat : mintMat,
        );
        handle.position.y = 1.4;
        tbGroup.add(handle);
        const bristles = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.65, 0.34), foamMat);
        bristles.position.set(0, 2.8, 0.16);
        tbGroup.add(bristles);
        tbGroup.position.set(vx + offset * 0.6, 2.25, cupZ + offset);
        tbGroup.rotation.z = side * (bi === 0 ? 0.24 : -0.14);
        tbGroup.rotation.x = bi === 0 ? 0.16 : -0.18;
        group.add(tbGroup);
      });

      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.12, 4.4, 12), shampooMat);
      bottle.position.set(vx, 3.55, 2.8);
      group.add(bottle);

      const labelBand = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.65, 12), foamMat);
      labelBand.position.set(vx, 3.65, 2.8);
      group.add(labelBand);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.65, 8), chromeMat);
      neck.position.set(vx, 6.05, 2.8);
      group.add(neck);

      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.38, 0.32), foamMat);
      pump.position.set(vx - side * 0.25, 6.42, 2.8);
      group.add(pump);

      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.62, 2.6, 10), mintMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(vx - side * 0.55, 1.72, 0.6);
      group.add(tube);

      const tubeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.4, 8), porcelainMat);
      tubeCap.rotation.x = Math.PI / 2;
      tubeCap.position.set(vx - side * 0.55, 1.72, 2.05);
      group.add(tubeCap);
    } else if (variant === 2) {
      const wx = side * 7.8;
      const wz = -2.8;
      const washerBody = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.4, 3.4), porcelainMat);
      washerBody.position.set(wx, 2.2, wz);
      group.add(washerBody);

      const controlStrip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 3.2), lavenderMat);
      controlStrip.position.set(wx - side * 1.54, 3.92, wz);
      group.add(controlStrip);

      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 10), chromeMat);
      dial.rotation.z = Math.PI / 2;
      dial.position.set(wx - side * 1.66, 3.92, wz + 0.9);
      group.add(dial);

      const drumRim = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.2, 8, 18), chromeMat);
      drumRim.rotation.y = Math.PI / 2;
      drumRim.position.set(wx - side * 1.62, 1.98, wz);
      group.add(drumRim);

      const drumSuds = new THREE.Mesh(
        new THREE.CylinderGeometry(0.98, 0.98, 0.16, 14),
        waterStreamMat,
      );
      drumSuds.userData.sharedMaterial = true;
      drumSuds.rotation.z = Math.PI / 2;
      drumSuds.position.set(wx - side * 1.56, 1.98, wz);
      group.add(drumSuds);

      const sponge = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.1, 2.85), spongeMat);
      sponge.position.set(side * 6.55, 0.62, 2.6);
      sponge.rotation.y = side * 0.22;
      group.add(sponge);

      const soapBar1 = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.62, 1.2), soapPinkMat);
      soapBar1.position.set(side * 7.75, 0.35, 5.8);
      group.add(soapBar1);

      const soapBar2 = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.56, 1.05), mintMat);
      soapBar2.position.set(side * 7.75, 0.92, 5.75);
      soapBar2.rotation.y = side * 0.25;
      group.add(soapBar2);
    } else {
      // Variant 3: Porcelain Bubble Tub Basin + Giant Loofah Pouf + Chrome Hairdryer
      const tx = side * 7.7;
      const tz = -1.6;
      const tubBasin = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.6, 2.4, 14), porcelainMat);
      tubBasin.position.set(tx, 1.2, tz);
      group.add(tubBasin);

      const basinSuds = new THREE.Mesh(new THREE.SphereGeometry(1.75, 10, 8), foamMat);
      basinSuds.scale.set(1.0, 0.52, 1.0);
      basinSuds.position.set(tx, 2.35, tz);
      group.add(basinSuds);

      const loofah = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 1), soapPinkMat);
      loofah.position.set(side * 6.8, 1.18, 2.8);
      group.add(loofah);

      const dryerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 2.1, 10), lavenderMat);
      dryerHandle.position.set(tx, 3.6, 3.2);
      dryerHandle.rotation.z = side * 0.22;
      group.add(dryerHandle);

      const dryerBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.42, 2.3, 10), chromeMat);
      dryerBarrel.rotation.z = Math.PI / 2;
      dryerBarrel.position.set(tx - side * 0.35, 4.75, 3.2);
      group.add(dryerBarrel);
    }

    const brushHead = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.35, 2.1), woodMat);
    brushHead.position.set(side * 8.15, 1.15, 6.4);
    brushHead.rotation.z = side * 0.32;
    group.add(brushHead);

    const bristles = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 1.95), foamMat);
    bristles.position.set(side * 7.9, 0.9, 6.4);
    bristles.rotation.z = side * 0.32;
    group.add(bristles);

    // Bobbing iridescent soap bubbles cleanly outside road & flight corridor
    [0, 1, 2].forEach((bi) => {
      const by = 3.6 + ((segIndex + bi) % 4) * 1.25;
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.62 + bi * 0.18, 10, 8),
        bubbleMat,
      );
      bubble.userData.sharedMaterial = true;
      bubble.position.set(
        side * (5.25 + (bi % 2) * 1.35),
        by,
        5.2 - bi * 4.8,
      );
      group.add(bubble);
      if (bi === 1) {
        skipObjects.add(bubble);
        animatedProps.push({
          obj: bubble,
          kind: 'bob',
          baseY: by,
          phase: segIndex * 0.7 + idx * 1.3,
          amp: 0.32,
          speed: 1.9,
        });
      }
    });

    if (baseVariant === 1 || baseVariant === 3) {
      const stanchion = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.18, 14.35, 8),
        chromeMat,
      );
      stanchion.position.set(side * 5.35, 7.18, 6.2);
      group.add(stanchion);

      const curtainDrape = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.72, 4.9, 8, 1, true),
        curtainMat,
      );
      curtainDrape.userData.sharedMaterial = true;
      curtainDrape.position.set(side * 5.0, 11.7, 6.2);
      group.add(curtainDrape);
    }
  });

  if (baseVariant === 1 || baseVariant === 3) {
    const showerRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 11.2, 10),
      chromeMat,
    );
    showerRod.rotation.z = Math.PI / 2;
    showerRod.position.set(0, 14.35, 6.2);
    group.add(showerRod);

    const aquaLightBar = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.14, 0.34), aquaLedMat);
    aquaLightBar.position.set(0, 14.08, 6.2);
    group.add(aquaLightBar);

    [-4.6, -4.1, 4.1, 4.6].forEach((rx) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 6, 12), chromeMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(rx, 14.28, 6.2);
      group.add(ring);
    });
  }

  const baked = bakeStaticGroup(group, { keepTransparent: true, keepTextured: true, skipObjects });
  baked.userData.animatedProps = animatedProps;
  return baked;
}

// --- 7. BÖLGE: ÇILGIN LABORATUVAR ---

export function createLabSegmentProps(
  segIndex: number,
  labBoardMats?: THREE.Material[],
  labBoardGeo?: THREE.BufferGeometry,
): THREE.Group {
  const group = new THREE.Group();
  const animatedProps: Array<{
    obj: THREE.Object3D;
    kind: 'bob' | 'sway' | 'spin' | 'pulse';
    baseY: number;
    phase: number;
    amp: number;
    speed: number;
  }> = [];
  const skipObjects = new Set<THREE.Object3D>();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.72,
    roughness: 0.28,
  });
  const counterMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.45,
    roughness: 0.35,
  });
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.78,
    roughness: 0.24,
  });
  const stopperMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.7,
  });
  const neonGreenMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
  const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
  const neonPinkMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
  const foamGreenMat = new THREE.MeshStandardMaterial({
    color: 0x86efac,
    emissive: 0x22c55e,
    emissiveIntensity: 0.55,
    roughness: 0.45,
  });
  const foamCyanMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.55,
    roughness: 0.45,
  });
  const glassMat = getLabSharedGlassMat();

  const variant = segIndex % 4;

  [-1, 1].forEach((side, idx) => {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 18.6), counterMat);
    bench.position.set(side * 6.8, 0.55, 0);
    group.add(bench);

    const benchRim = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.14, 18.8), steelMat);
    benchRim.position.set(side * 6.8, 1.12, 0);
    group.add(benchRim);

    const liquidPalette = [neonGreenMat, neonCyanMat, neonPinkMat];
    const reagentMat = liquidPalette[(segIndex + idx) % liquidPalette.length];
    const foamMat = (segIndex + idx) % 2 === 0 ? foamGreenMat : foamCyanMat;

    const subV = (variant + idx) % 4;
    if (subV === 0) {
      const fx = side * 6.45;
      const fz = -3.4;

      const glassCone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.54, 1.72, 3.0, 12),
        glassMat,
      );
      glassCone.userData.sharedMaterial = true;
      glassCone.position.set(fx, 2.7, fz);
      group.add(glassCone);

      const glassNeck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.54, 0.54, 1.25, 10),
        glassMat,
      );
      glassNeck.userData.sharedMaterial = true;
      glassNeck.position.set(fx, 4.8, fz);
      group.add(glassNeck);

      const neckLip = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.1, 6, 12), glassMat);
      neckLip.userData.sharedMaterial = true;
      neckLip.rotation.x = Math.PI / 2;
      neckLip.position.set(fx, 5.42, fz);
      group.add(neckLip);

      const liquidCone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.92, 1.56, 1.95, 12),
        reagentMat,
      );
      liquidCone.position.set(fx, 2.18, fz);
      group.add(liquidCone);

      const foamGroup = new THREE.Group();
      foamGroup.position.set(fx, 5.5, fz);
      [
        { dx: 0, dy: 0.05, dz: 0, r: 0.52 },
        { dx: -0.32, dy: -0.12, dz: 0.28, r: 0.36 },
        { dx: 0.35, dy: -0.2, dz: -0.22, r: 0.32 },
        { dx: 0.08, dy: 0.38, dz: 0.06, r: 0.34 },
      ].forEach((b) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(b.r, 8, 6), foamMat);
        puff.position.set(b.dx, b.dy, b.dz);
        foamGroup.add(puff);
      });
      group.add(foamGroup);
      skipObjects.add(foamGroup);
      animatedProps.push({
        obj: foamGroup,
        kind: 'pulse',
        baseY: 5.5,
        phase: segIndex * 0.8 + idx * 1.4,
        amp: 0.16,
        speed: 4.5,
      });
    } else if (subV === 1) {
      const fx = side * 6.55;
      const fz = -3.4;

      const standBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 2.4), steelMat);
      standBase.position.set(fx, 1.28, fz);
      group.add(standBase);

      const ringRod = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.6, 6), steelMat);
      ringRod.position.set(fx + side * 1.0, 3.5, fz);
      group.add(ringRod);

      const glassBulb = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 10), glassMat);
      glassBulb.userData.sharedMaterial = true;
      glassBulb.position.set(fx, 2.85, fz);
      group.add(glassBulb);

      const reagentBulb = new THREE.Mesh(
        new THREE.SphereGeometry(1.32, 10, 8, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.75),
        reagentMat,
      );
      reagentBulb.position.set(fx, 2.8, fz);
      group.add(reagentBulb);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 1.5, 10), glassMat);
      neck.userData.sharedMaterial = true;
      neck.position.set(fx, 4.85, fz);
      group.add(neck);

      const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.48, 8), stopperMat);
      stopper.position.set(fx, 5.65, fz);
      group.add(stopper);
    } else if (subV === 2) {
      // Variant 2: Twin Tesla Coil Generators with Spinning Cyan Plasma Orb
      const tx = side * 6.7;
      const tz = -3.4;
      const coilBase = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 1.2, 10), steelMat);
      coilBase.position.set(tx, 1.75, tz);
      group.add(coilBase);

      const copperCol = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.68, 2.4, 12), copperMat);
      copperCol.position.set(tx, 3.55, tz);
      group.add(copperCol);

      const toroid = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.26, 8, 16), steelMat);
      toroid.rotation.x = Math.PI / 2;
      toroid.position.set(tx, 4.85, tz);
      group.add(toroid);

      const plasmaOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), neonCyanMat);
      plasmaOrb.position.set(tx, 5.65, tz);
      group.add(plasmaOrb);
      skipObjects.add(plasmaOrb);
      animatedProps.push({
        obj: plasmaOrb,
        kind: 'spin',
        baseY: 5.65,
        phase: segIndex * 0.7 + idx,
        amp: 0.16,
        speed: 3.4,
      });
    } else {
      // Variant 3: Giant Compound Lab Microscope inspecting glowing petri sample
      const mx = side * 6.8;
      const mz = -3.4;
      const scopeBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 2.4), steelMat);
      scopeBase.position.set(mx, 1.45, mz);
      group.add(scopeBase);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.8, 0.45), steelMat);
      arm.position.set(mx + side * 0.65, 2.95, mz);
      group.add(arm);

      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 2.4, 10), copperMat);
      tube.position.set(mx - side * 0.15, 3.85, mz);
      tube.rotation.z = side * 0.32;
      group.add(tube);

      const petri = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.18, 12), neonGreenMat);
      petri.position.set(mx - side * 0.2, 2.15, mz);
      group.add(petri);
    }

    const rackZ = 2.6;
    const rackX = side * 5.85;
    const rackFrame = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.15, 3.2), steelMat);
    rackFrame.position.set(rackX, 1.7, rackZ);
    group.add(rackFrame);

    for (let t = 0; t < 4; t++) {
      const tz = rackZ - 1.05 + t * 0.7;
      const tMat = liquidPalette[(segIndex + t + idx) % liquidPalette.length];
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.0, 8), glassMat);
      tube.userData.sharedMaterial = true;
      tube.position.set(rackX, 2.45, tz);
      group.add(tube);

      const tFluid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.8 + (t % 3) * 0.35, 8),
        tMat,
      );
      tFluid.position.set(rackX, 1.95 + (t % 3) * 0.16, tz);
      group.add(tFluid);

      const tFoam = new THREE.Mesh(new THREE.SphereGeometry(0.19, 6, 6), foamMat);
      tFoam.position.set(rackX, 3.45, tz);
      group.add(tFoam);
    }

    const coilPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 4.4, 8), copperMat);
    coilPipe.position.set(side * 7.55, 5.2, -0.6);
    coilPipe.rotation.x = 0.58;
    group.add(coilPipe);

    if (labBoardMats && labBoardMats.length > 0 && labBoardGeo) {
      const boardMat = labBoardMats[(segIndex + idx) % labBoardMats.length];
      const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(4.65, 2.42, 0.2), steelMat);
      boardFrame.position.set(side * 8.15, 5.25, 3.6);
      boardFrame.rotation.y = side === -1 ? Math.PI * 0.4 : -Math.PI * 0.4;
      group.add(boardFrame);

      const boardMesh = new THREE.Mesh(labBoardGeo, boardMat);
      boardMesh.position.set(side * 8.03, 5.25, 3.6);
      boardMesh.rotation.y = side === -1 ? Math.PI * 0.4 : -Math.PI * 0.4;
      boardMesh.userData.sharedMaterial = true;
      boardMesh.userData.sharedGeometry = true;
      group.add(boardMesh);
    }

    const post = new THREE.Mesh(new THREE.BoxGeometry(0.55, 14.2, 0.55), steelMat);
    post.position.set(side * 5.25, 7.1, 6.2);
    group.add(post);
  });

  if (variant === 1 || variant === 3) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(11.1, 0.52, 0.62), steelMat);
    beam.position.set(0, 14.2, 6.2);
    group.add(beam);

    const glowStrip = new THREE.Mesh(
      new THREE.BoxGeometry(9.6, 0.16, 0.66),
      variant === 1 ? neonGreenMat : neonCyanMat,
    );
    glowStrip.position.set(0, 13.92, 6.2);
    group.add(glowStrip);
  }

  const baked = bakeStaticGroup(group, { keepTransparent: true, keepTextured: true, skipObjects });
  baked.userData.animatedProps = animatedProps;
  return baked;
}

// --- 8. BÖLGE: PEYNİR GALAKSİSİ (UZAY) ---

export function createSpaceSegmentProps(segIndex: number): THREE.Group {
  const group = new THREE.Group();
  const animatedProps: Array<{
    obj: THREE.Object3D;
    kind: 'bob' | 'sway' | 'spin' | 'pulse';
    baseY: number;
    phase: number;
    amp: number;
    speed: number;
  }> = [];
  const skipObjects = new Set<THREE.Object3D>();

  const cheeseMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xca8a04,
    emissiveIntensity: 0.28,
    roughness: 0.46,
  });
  const craterMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.72,
  });
  const { ringMat, domeMat } = getSpaceSharedTransMats();
  const cyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.75,
    roughness: 0.25,
  });
  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    metalness: 0.6,
    roughness: 0.2,
  });

  const variant = segIndex % 4;

  [-1, 1].forEach((side, idx) => {
    const px = side * 8.1;
    const py = 3.9 + (idx % 2) * 1.4;
    const pz = -3.5;
    const pRadius = 1.9 + ((segIndex + idx) % 2) * 0.55;

    const planetGroup = new THREE.Group();
    planetGroup.position.set(px, py, pz);
    const planet = new THREE.Mesh(new THREE.DodecahedronGeometry(pRadius, 1), cheeseMat);
    planetGroup.add(planet);

    [
      { dx: -side * 1.25, dy: 0.55, dz: 0.85, r: 0.42 },
      { dx: -side * 1.1, dy: -0.65, dz: -0.6, r: 0.34 },
      { dx: -side * 0.4, dy: 1.2, dz: 1.1, r: 0.3 },
    ].forEach((c) => {
      const crater = new THREE.Mesh(new THREE.SphereGeometry(c.r, 8, 6), craterMat);
      crater.position.set(c.dx, c.dy, c.dz);
      planetGroup.add(crater);
    });
    group.add(planetGroup);
    skipObjects.add(planetGroup);
    animatedProps.push({
      obj: planetGroup,
      kind: 'spin',
      baseY: py,
      phase: segIndex * 0.6 + idx * 1.1,
      amp: 0.18,
      speed: 0.85,
    });

    const subV = (variant + idx) % 4;
    if (subV === 0) {
      const saturnRing = new THREE.Mesh(new THREE.TorusGeometry(pRadius + 1.1, 0.16, 8, 24), ringMat);
      saturnRing.userData.sharedMaterial = true;
      saturnRing.rotation.x = Math.PI / 2.6;
      saturnRing.position.set(px, py, pz);
      group.add(saturnRing);

      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(pRadius + 0.7, 0.08, 6, 20), cyanMat);
      innerRing.rotation.x = Math.PI / 2.6;
      innerRing.position.set(px, py, pz);
      group.add(innerRing);
    } else if (subV === 1) {
      const ufoY = 5.6 + (segIndex % 3) * 0.65;
      const ufoGroup = new THREE.Group();
      ufoGroup.position.set(side * 6.8, ufoY, 2.8);
      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.85, 0.42, 12), hullMat);
      ufoGroup.add(saucer);

      const cockpit = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
        domeMat,
      );
      cockpit.userData.sharedMaterial = true;
      cockpit.position.y = 0.18;
      ufoGroup.add(cockpit);

      const rimGlow = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.09, 6, 16), cyanMat);
      rimGlow.rotation.x = Math.PI / 2;
      ufoGroup.add(rimGlow);
      group.add(ufoGroup);
      skipObjects.add(ufoGroup);
      animatedProps.push({
        obj: ufoGroup,
        kind: 'bob',
        baseY: ufoY,
        phase: segIndex * 1.1 + idx,
        amp: 0.35,
        speed: 2.2,
      });
    } else if (subV === 2) {
      // Orbital Solar Satellite with dish & solar wings
      const satY = 5.2;
      const sat = new THREE.Group();
      sat.position.set(side * 7.1, satY, 2.6);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.4, 8), hullMat);
      sat.add(core);
      const dish = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.45, 10), cyanMat);
      dish.position.y = 0.9;
      sat.add(dish);
      [-1, 1].forEach((ws) => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.95), solarMat);
        wing.position.set(ws * 1.4, 0, 0);
        sat.add(wing);
      });
      group.add(sat);
      skipObjects.add(sat);
      animatedProps.push({
        obj: sat,
        kind: 'spin',
        baseY: satY,
        phase: segIndex * 0.5 + idx,
        amp: 0.2,
        speed: 1.4,
      });
    } else {
      // Twin Cosmic Crystal Nebula Monolith flanking track
      const monolith = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0), ringMat);
      monolith.userData.sharedMaterial = true;
      monolith.scale.set(0.85, 1.9, 0.85);
      monolith.position.set(side * 6.8, 4.4, 2.5);
      group.add(monolith);
      skipObjects.add(monolith);
      animatedProps.push({
        obj: monolith,
        kind: 'bob',
        baseY: 4.4,
        phase: segIndex * 0.9 + idx * 1.6,
        amp: 0.3,
        speed: 2.0,
      });
    }

    const pylon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.26, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x312e81, metalness: 0.6, roughness: 0.3 }),
    );
    pylon.position.set(side * 4.8, 1.1, 4.5);
    group.add(pylon);

    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), cyanMat);
    orb.position.set(side * 4.8, 2.45, 4.5);
    group.add(orb);

    const spaceRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.16, 20),
      new THREE.MeshBasicMaterial({ color: 0x818cf8 }),
    );
    spaceRail.position.set(side * 4.0, 0.06, 0);
    group.add(spaceRail);

    const starCluster = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      idx === 0 ? cyanMat : ringMat,
    );
    if (idx !== 0) starCluster.userData.sharedMaterial = true;
    starCluster.position.set(side * 11.4, 7.6 + (segIndex % 3) * 0.9, idx === 0 ? 5.2 : -5.2);
    group.add(starCluster);
  });

  // High cosmic Warp Gate Ring (apex 14.4m -> clears Jetpack cleanly!)
  if (variant === 0 || variant === 2) {
    const warpRing = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.22, 8, 28, Math.PI), ringMat);
    warpRing.userData.sharedMaterial = true;
    warpRing.position.set(0, 8.0, 0);
    group.add(warpRing);

    const warpInner = new THREE.Mesh(new THREE.TorusGeometry(6.0, 0.1, 6, 24, Math.PI), cyanMat);
    warpInner.position.set(0, 8.0, 0);
    group.add(warpInner);
  }

  const baked = bakeStaticGroup(group, { keepTransparent: true, skipObjects });
  baked.userData.animatedProps = animatedProps;
  return baked;
}

// --- New Climbable Terrain Ramps (exact BUS_ROOF_Y = 1.95 physics) ---

export function createKitchenRampModel(): THREE.Group {
  // Giant Walnut Cutting Board & Swiss Cheese Block Ramp
  const group = new THREE.Group();
  const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.42 });
  const holeMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.72 });
  const woodDeckMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });

  const cheeseBody = new THREE.Mesh(new THREE.BoxGeometry(2.12, 1.84, 5.0), cheeseMat);
  cheeseBody.position.set(0, 0.92, -1.1);
  group.add(cheeseBody);

  // Recessed dark cheese craters along the sides
  [-1.06, 1.06].forEach((sx) => {
    [-2.5, -0.5, 0.7].forEach((sz, idx) => {
      const hole = new THREE.Mesh(new THREE.SphereGeometry(0.28 + (idx % 2) * 0.08, 8, 6), holeMat);
      hole.position.set(sx, 0.8 + (idx % 2) * 0.4, sz);
      group.add(hole);
    });
  });

  const boardTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 5.02), woodDeckMat);
  boardTop.position.set(0, 1.9, -1.1);
  group.add(boardTop);

  const rampLen = Math.hypot(2.4, 1.95);
  const rampAngle = Math.atan2(1.95, 2.4);
  const boardSlope = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.18, rampLen), woodDeckMat);
  boardSlope.position.set(0, 1.95 * 0.5 - 0.04, 2.6);
  boardSlope.rotation.x = rampAngle;
  group.add(boardSlope);

  [-0.98, 0.98].forEach((rx) => {
    const sideRim = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, rampLen), rimMat);
    sideRim.position.set(rx, 1.95 * 0.5 + 0.06, 2.6);
    sideRim.rotation.x = rampAngle;
    group.add(sideRim);
  });

  addRampChevrons(group, 0xdc2626);
  return bakeStaticGroup(group, { castShadow: true, receiveShadow: true });
}

export function createBathRampModel(): THREE.Group {
  // Porcelain Bathtub Slide & Bright Yellow Bath Sponge Ramp with Chrome Rails
  const group = new THREE.Group();
  const porcelainMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.16, metalness: 0.08 });
  const aquaMat = new THREE.MeshStandardMaterial({ color: 0x0891b2, roughness: 0.25 });
  const spongeDeckMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.75 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.88, roughness: 0.14 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.12, 1.84, 5.0), porcelainMat);
  hull.position.set(0, 0.92, -1.1);
  group.add(hull);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.36, 5.04), aquaMat);
  stripe.position.set(0, 0.95, -1.1);
  group.add(stripe);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.14, 5.0), spongeDeckMat);
  deck.position.set(0, 1.9, -1.1);
  group.add(deck);

  [-1.02, 1.02].forEach((rx) => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.9, 8), chromeMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(rx, 2.08, -1.1);
    group.add(rail);
  });

  const rampLen = Math.hypot(2.4, 1.95);
  const rampAngle = Math.atan2(1.95, 2.4);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.18, rampLen), porcelainMat);
  ramp.position.set(0, 1.95 * 0.5 - 0.04, 2.6);
  ramp.rotation.x = rampAngle;
  group.add(ramp);

  addRampChevrons(group, 0x06b6d4);
  return bakeStaticGroup(group, { castShadow: true, receiveShadow: true });
}

export function createLabRampModel(): THREE.Group {
  // Bio-Hazard Steel Containment Ramp with Glowing Neon-Green Reagent Tubes
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.72, roughness: 0.28 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.35 });
  const neonMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.12, 1.84, 5.0), steelMat);
  hull.position.set(0, 0.92, -1.1);
  group.add(hull);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.14, 5.0), deckMat);
  deck.position.set(0, 1.9, -1.1);
  group.add(deck);

  [-1.04, 1.04].forEach((rx) => {
    const vialPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 4.9, 8), neonMat);
    vialPipe.rotation.x = Math.PI / 2;
    vialPipe.position.set(rx, 2.05, -1.1);
    group.add(vialPipe);
  });

  const rampLen = Math.hypot(2.4, 1.95);
  const rampAngle = Math.atan2(1.95, 2.4);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.18, rampLen), steelMat);
  ramp.position.set(0, 1.95 * 0.5 - 0.04, 2.6);
  ramp.rotation.x = rampAngle;
  group.add(ramp);

  [-0.98, 0.98].forEach((rx) => {
    const rTube = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, rampLen), neonMat);
    rTube.position.set(rx, 1.95 * 0.5 + 0.06, 2.6);
    rTube.rotation.x = rampAngle;
    group.add(rTube);
  });

  addRampChevrons(group, 0x4ade80);
  return bakeStaticGroup(group, { castShadow: true, receiveShadow: true });
}

export function createSpaceRampModel(): THREE.Group {
  // Cosmic Shuttle Launchpad & Neon Thruster Bridge Ramp
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x312e81, metalness: 0.65, roughness: 0.25 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x9333ea, roughness: 0.3 });
  const cyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const pinkMat = new THREE.MeshBasicMaterial({ color: 0xe879f9 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.12, 1.84, 5.0), hullMat);
  hull.position.set(0, 0.92, -1.1);
  group.add(hull);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.14, 5.0), deckMat);
  deck.position.set(0, 1.9, -1.1);
  group.add(deck);

  [-1.04, 1.04].forEach((rx) => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 5.0), cyanMat);
    wing.position.set(rx, 2.02, -1.1);
    group.add(wing);

    const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.55, 8), pinkMat);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(rx * 0.65, 1.2, -3.7);
    group.add(thruster);
  });

  const rampLen = Math.hypot(2.4, 1.95);
  const rampAngle = Math.atan2(1.95, 2.4);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.18, rampLen), hullMat);
  ramp.position.set(0, 1.95 * 0.5 - 0.04, 2.6);
  ramp.rotation.x = rampAngle;
  group.add(ramp);

  [-0.98, 0.98].forEach((rx) => {
    const rNeon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, rampLen), pinkMat);
    rNeon.position.set(rx, 1.95 * 0.5 + 0.06, 2.6);
    rNeon.rotation.x = rampAngle;
    group.add(rNeon);
  });

  addRampChevrons(group, 0x38bdf8);
  return bakeStaticGroup(group, { castShadow: true, receiveShadow: true });
}

// --- 16 New Comical Biome-Native Obstacles ---

export function createRollingPinModel(): THREE.Group {
  const group = new THREE.Group();
  const spinPivot = new THREE.Group();
  spinPivot.position.y = 0.6;
  group.add(spinPivot);
  group.userData.spinPivot = spinPivot;

  const woodMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 1.5, 16), woodMat);
  barrel.rotation.z = Math.PI / 2;
  barrel.castShadow = true;
  spinPivot.add(barrel);

  [-0.95, 0.95].forEach((hx) => {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.42, 10), handleMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(hx, 0, 0);
    spinPivot.add(handle);
  });
  bakeStaticGroup(spinPivot, { castShadow: true, forceLambert: true });
  return group;
}

export function createButterBlockModel(): THREE.Group {
  const group = new THREE.Group();
  const dishMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.55 });
  const butterMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    roughness: 0.22,
  });
  const foilMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    metalness: 0.35,
    roughness: 0.28,
  });
  const goldTrimMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

  const dish = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.22, 2.28), dishMat);
  dish.position.y = 0.11;
  group.add(dish);

  const stick = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.16, 2.12), butterMat);
  stick.position.y = 0.8;
  stick.castShadow = true;
  group.add(stick);

  const wrap = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.72, 1.18), foilMat);
  wrap.position.set(0, 0.78, 0.35);
  group.add(wrap);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.14, 1.2), goldTrimMat);
  stripe.position.set(0, 1.12, 0.35);
  group.add(stripe);

  return bakeStaticGroup(group, { castShadow: true });
}

export function createFridgeBlockModel(): THREE.Group {
  // Tall retro mint mini-fridge with chrome handle & freezer split (dev_mutfak heavy blocker)
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.24, metalness: 0.14 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.18 });
  const magnetMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.76, 1.88, 1.56), bodyMat);
  body.position.y = 0.94;
  body.castShadow = true;
  group.add(body);

  const split = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.6), chromeMat);
  split.position.y = 1.28;
  group.add(split);

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.16), chromeMat);
  handle.position.set(-0.62, 0.85, 0.84);
  group.add(handle);

  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.1), magnetMat);
  badge.position.set(0.32, 1.56, 0.8);
  group.add(badge);

  return bakeStaticGroup(group, { castShadow: true });
}

export function createMovingMixerCartModel(): THREE.Group {
  // Rolling stainless kitchen stand-mixer cart with red bumper & spinning wheels
  const group = new THREE.Group();
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.65, roughness: 0.25 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.28 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.78, roughness: 0.25 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.56, 2.3), chassisMat);
  base.position.y = 0.54;
  base.castShadow = true;
  group.add(base);

  const dome = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.85, 1.72), redMat);
  dome.position.set(0, 1.24, -0.15);
  group.add(dome);

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.44, 0.68, 12), steelMat);
  bowl.position.set(0, 1.15, 0.72);
  group.add(bowl);

  const headlight = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.16), lampMat);
  headlight.position.set(0, 0.58, 1.18);
  group.add(headlight);

  const wheels: THREE.Mesh[] = [];
  [-0.76, 0.76].forEach((wx) => {
    [-0.78, 0.78].forEach((wz) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 12), steelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.26, wz);
      group.add(wheel);
      wheels.push(wheel);
    });
  });

  const baked = bakeStaticGroup(group, {
    castShadow: true,
    skipObjects: new Set<THREE.Object3D>(wheels),
  });
  baked.userData.wheels = wheels;
  return baked;
}

export function createToasterArchModel(): THREE.Group {
  const group = new THREE.Group();
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.85,
    roughness: 0.18,
  });
  const toastMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75 });
  const warnMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  [-0.95, 0.95].forEach((px) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 2.2, 10), chromeMat);
    leg.position.set(px, 1.1, 0);
    group.add(leg);
  });

  // Crossbar + toast cleanly capped at y = 2.20 (exact minY = 1.45 .. height = 2.20)
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.48, 0.54), chromeMat);
  body.position.set(0, 1.76, 0);
  group.add(body);

  const strip = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.12, 0.58), warnMat);
  strip.position.set(0, 1.62, 0);
  group.add(strip);

  [-0.45, 0.45].forEach((tx) => {
    const slice = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.26, 0.18), toastMat);
    slice.position.set(tx, 2.08, 0);
    group.add(slice);
  });
  return bakeStaticGroup(group, { castShadow: true });
}

export function createTomatoBallModel(): THREE.Group {
  const group = new THREE.Group();
  const spinPivot = new THREE.Group();
  spinPivot.position.y = 0.6;
  group.add(spinPivot);
  group.userData.spinPivot = spinPivot;

  const redMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.2,
    metalness: 0.08,
  });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.64, 14, 12), redMat);
  body.scale.set(1.1, 0.9, 1.1);
  body.castShadow = true;
  spinPivot.add(body);

  const stem = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.25, 5), stemMat);
  stem.position.y = 0.62;
  spinPivot.add(stem);
  bakeStaticGroup(spinPivot, { castShadow: true });
  return group;
}

export function createGiantSlipperModel(): THREE.Group {
  const group = new THREE.Group();
  const soleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
  const strapMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

  const sole = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.42, 3.0), soleMat);
  sole.position.y = 0.21;
  sole.castShadow = true;
  group.add(sole);

  const footbed = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.18, 2.88), trimMat);
  footbed.position.y = 0.5;
  group.add(footbed);

  const strap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.84, 0.84, 1.24, 14, 1, false, 0, Math.PI),
    strapMat,
  );
  strap.rotation.z = Math.PI / 2;
  strap.rotation.y = Math.PI / 2;
  strap.position.set(0, 0.56, 0.2);
  group.add(strap);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.14, 0.22), stripeMat);
  stripe.position.set(0, 1.38, 0.2);
  group.add(stripe);

  return bakeStaticGroup(group, { castShadow: true, forceLambert: true });
}

export function createMovingDuckTubModel(): THREE.Group {
  // Gliding Porcelain Mini-Tub Racer carrying a giant yellow Rubber Duck
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  group.userData.hoverMesh = body;

  const porcelainMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.08 });
  const duckMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.18 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  const tub = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.86, 2.35), porcelainMat);
  tub.position.y = 0.45;
  tub.castShadow = true;
  body.add(tub);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 0.18), headlightMat);
  bumper.position.set(0, 0.48, 1.2);
  body.add(bumper);

  const dBody = new THREE.Mesh(new THREE.SphereGeometry(0.68, 10, 8), duckMat);
  dBody.scale.set(1.0, 0.8, 1.25);
  dBody.position.set(0, 1.05, -0.05);
  body.add(dBody);

  const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), duckMat);
  dHead.position.set(0, 1.56, 0.35);
  body.add(dHead);

  const dBeak = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.38, 6), beakMat);
  dBeak.rotation.x = Math.PI / 2;
  dBeak.position.set(0, 1.52, 0.78);
  body.add(dBeak);

  bakeStaticGroup(body, { castShadow: true });
  return group;
}

export function createShampooTowerModel(): THREE.Group {
  // Giant trio of colorful shampoo pump bottles on marble caddy (kopuklu_banyo tall blocker)
  const group = new THREE.Group();
  const caddyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.2 });
  const cyanMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2 });
  const mintMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2 });

  const caddy = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.28, 1.48), caddyMat);
  caddy.position.y = 0.14;
  group.add(caddy);

  [
    { x: -0.45, z: 0.15, h: 1.58, r: 0.44, mat: pinkMat },
    { x: 0.45, z: 0.15, h: 1.42, r: 0.42, mat: cyanMat },
    { x: 0, z: -0.28, h: 1.72, r: 0.46, mat: mintMat },
  ].forEach((b) => {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(b.r * 0.92, b.r, b.h - 0.3, 12), b.mat);
    cyl.position.set(b.x, 0.28 + (b.h - 0.3) * 0.5, b.z);
    group.add(cyl);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.22), caddyMat);
    cap.position.set(b.x, b.h + 0.1, b.z);
    group.add(cap);
  });

  return bakeStaticGroup(group, { castShadow: true });
}

export function createSoapBarModel(): THREE.Group {
  const group = new THREE.Group();
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.16 });
  const soapMat = new THREE.MeshStandardMaterial({
    color: 0xec4899,
    roughness: 0.18,
    metalness: 0.08,
  });
  const foamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });

  const dish = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 1.45), dishMat);
  dish.position.y = 0.11;
  group.add(dish);

  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.92, 1.3), soapMat);
  bar.position.y = 0.68;
  bar.castShadow = true;
  group.add(bar);

  // Bubbles cleanly capped at y = 1.34 (exact match to height = 1.34)
  [-0.45, 0.42].forEach((fx, idx) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), foamMat);
    puff.position.set(fx, 1.12, idx === 0 ? 0.18 : -0.18);
    group.add(puff);
  });
  return bakeStaticGroup(group, { castShadow: true });
}

export function createTowelArchModel(): THREE.Group {
  const group = new THREE.Group();
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.88,
    roughness: 0.15,
  });
  const towelMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.85 });
  const trimMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

  [-0.95, 0.95].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 10), chromeMat);
    post.position.set(px, 1.1, 0);
    group.add(post);
  });

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 10), chromeMat);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 2.14, 0);
  group.add(rod);

  // Towel spans y = 1.50 .. 2.12 (matches minY = 1.45 .. height = 2.20)
  const towel = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.62, 0.24), towelMat);
  towel.position.set(0, 1.81, 0);
  group.add(towel);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.12, 0.26), trimMat);
  stripe.position.set(0, 1.56, 0);
  group.add(stripe);

  return bakeStaticGroup(group, { castShadow: true });
}

export function createTpRollModel(): THREE.Group {
  const group = new THREE.Group();
  const spinPivot = new THREE.Group();
  spinPivot.position.y = 0.58;
  group.add(spinPivot);
  group.userData.spinPivot = spinPivot;

  const paperMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.82 });
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });

  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 1.35, 16), paperMat);
  roll.rotation.z = Math.PI / 2;
  roll.castShadow = true;
  spinPivot.add(roll);

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.38, 12), coreMat);
  core.rotation.z = Math.PI / 2;
  spinPivot.add(core);
  bakeStaticGroup(spinPivot, { castShadow: true, forceLambert: true });
  return group;
}

export function createRaidCanModel(): THREE.Group {
  const group = new THREE.Group();
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    metalness: 0.4,
    roughness: 0.22,
  });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45 });
  const neonMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.78, 1.75, 16), redMat);
  can.position.y = 0.88;
  can.castShadow = true;
  group.add(can);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.34, 16), neonMat);
  band.position.y = 1.05;
  group.add(band);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 0.35, 12), blackMat);
  cap.position.y = 1.9;
  group.add(cap);
  return bakeStaticGroup(group, { castShadow: true });
}

export function createBeakerVatModel(): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.25 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xdcfce7,
    transparent: true,
    opacity: 0.56,
    roughness: 0.1,
  });
  const acidMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });

  const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.98, 0.18, 14), steelMat);
  baseRing.position.y = 0.09;
  group.add(baseRing);

  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.92, 1.48, 14), glassMat);
  shell.position.y = 0.88;
  group.add(shell);

  // Fluid & solid top collar fill cleanly up to y = 1.64 so top edge is crisp and unmistakable
  const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.82, 1.32, 14), acidMat);
  fluid.position.y = 0.78;
  group.add(fluid);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.08, 6, 16), steelMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.6;
  group.add(rim);

  return bakeStaticGroup(group, { keepTransparent: true });
}

export function createMovingLabBotModel(): THREE.Group {
  // Hovering bio-hazard lab patrol bot with glowing scanner visor
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  group.userData.hoverMesh = body;

  const hullMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.25 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.12 });
  const greenMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.05, 2.2), hullMat);
  chassis.position.y = 0.78;
  chassis.castShadow = true;
  body.add(chassis);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.64, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    glassMat,
  );
  dome.position.y = 1.3;
  body.add(dome);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.28, 0.22), greenMat);
  visor.position.set(0, 0.82, 1.14);
  body.add(visor);

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.18, 2.26), yellowMat);
  skirt.position.y = 0.28;
  body.add(skirt);

  bakeStaticGroup(body, { castShadow: true });
  return group;
}

export function createBioDrumStackModel(): THREE.Group {
  // Twin hazard-yellow chemical drums with biohazard collars
  const group = new THREE.Group();
  const drumMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.2 });
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });

  const drum1 = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.78, 1.02, 14), drumMat);
  drum1.position.y = 0.51;
  drum1.castShadow = true;
  group.add(drum1);

  const drum2 = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.68, 0.82, 14), drumMat);
  drum2.position.y = 1.44;
  group.add(drum2);

  [0.51, 1.44].forEach((by) => {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.79, 0.79, 0.14, 14), bandMat);
    band.position.y = by;
    group.add(band);
  });

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 12), glowMat);
  cap.position.y = 1.88;
  group.add(cap);

  return bakeStaticGroup(group, { castShadow: true });
}

export function createLaserArchModel(): THREE.Group {
  const group = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.25,
  });
  const laserMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });

  [-0.95, 0.95].forEach((px) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.2, 0.24), metalMat);
    post.position.set(px, 1.1, 0);
    group.add(post);
  });

  // 3 Laser beams cleanly spanning y = 1.54 .. 2.12 (exact minY = 1.45 .. height = 2.20)
  [1.54, 1.83, 2.12].forEach((ly) => {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8), laserMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, ly, 0);
    group.add(beam);
  });
  return bakeStaticGroup(group, { castShadow: true });
}

export function createJellyCubeModel(): THREE.Group {
  const group = new THREE.Group();
  const jellyMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.82,
    roughness: 0.08,
  });

  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.05, 1.15), jellyMat);
  cube.position.y = 0.52;
  cube.castShadow = true;
  group.add(cube);
  return group;
}

export function createUfoSaucerModel(): THREE.Group {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.82,
    roughness: 0.2,
  });
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.45,
    roughness: 0.1,
    metalness: 0.2,
  });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xe879f9 });
  const beamMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.55,
    roughness: 0.1,
  });

  // Solid glowing tractor-beam base down to road y = 0.02 so ground zone is visibly occupied!
  const tractorBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.78, 0.72, 14), beamMat);
  tractorBeam.position.y = 0.36;
  group.add(tractorBeam);

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.18, 0.48, 18), hullMat);
  disc.position.y = 0.95;
  disc.castShadow = true;
  group.add(disc);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    domeMat,
  );
  dome.position.y = 1.16;
  group.add(dome);

  const trim = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.07, 8, 20), ringMat);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.92;
  group.add(trim);
  return bakeStaticGroup(group, { castShadow: true, keepTransparent: true });
}

export function createMovingSpaceRoverModel(): THREE.Group {
  // Cosmic Moon-Buggy Rover with cyan headlights, dish antenna & spinning rover wheels
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.25 });
  const purpleMat = new THREE.MeshStandardMaterial({ color: 0x7e22ce, roughness: 0.35 });
  const cyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.92, 2.3), bodyMat);
  chassis.position.y = 0.78;
  chassis.castShadow = true;
  group.add(chassis);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.46, 1.18), purpleMat);
  cab.position.set(0, 1.44, -0.1);
  group.add(cab);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.24, 0.2), cyanMat);
  visor.position.set(0, 0.85, 1.18);
  group.add(visor);

  const wheels: THREE.Mesh[] = [];
  [-0.78, 0.78].forEach((wx) => {
    [-0.78, 0.78].forEach((wz) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.3, wz);
      group.add(wheel);
      wheels.push(wheel);
    });
  });

  const baked = bakeStaticGroup(group, {
    castShadow: true,
    skipObjects: new Set<THREE.Object3D>(wheels),
  });
  baked.userData.wheels = wheels;
  return baked;
}

export function createCheeseSatelliteModel(): THREE.Group {
  // Orbital Swiss-Cheese Dish Relay & Solar-Panel Beacon (peynir_galaksisi tall blocker)
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x312e81, metalness: 0.65, roughness: 0.3 });
  const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.45 });
  const cyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.7, 10), baseMat);
  plinth.position.y = 0.35;
  group.add(plinth);

  const cheeseCore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 1), cheeseMat);
  cheeseCore.position.y = 1.28;
  group.add(cheeseCore);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.08, 6, 18), cyanMat);
  ring.rotation.x = Math.PI / 2.6;
  ring.position.y = 1.32;
  group.add(ring);

  return bakeStaticGroup(group, { castShadow: true });
}

export function createCheeseAsteroidModel(): THREE.Group {
  const group = new THREE.Group();
  const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.56 });
  const craterMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });

  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 1), cheeseMat);
  rock.position.y = 0.88;
  rock.castShadow = true;
  group.add(rock);

  [
    [0.45, 1.08, 0.54],
    [-0.45, 0.75, 0.6],
  ].forEach(([cx, cy, cz]) => {
    const hole = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), craterMat);
    hole.position.set(cx, cy, cz);
    group.add(hole);
  });
  return bakeStaticGroup(group, { castShadow: true, forceLambert: true });
}

export function createWarpArchModel(): THREE.Group {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x312e81,
    metalness: 0.65,
    roughness: 0.3,
  });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xe879f9 });
  const cyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  [-0.95, 0.95].forEach((px) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.2, 10), hullMat);
    col.position.set(px, 1.1, 0);
    group.add(col);
  });

  // Crossbar strictly within y = 1.54 .. 2.16 (exact minY = 1.45 .. height = 2.20)
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.44, 0.32), glowMat);
  beam.position.set(0, 1.85, 0);
  group.add(beam);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.1, 0.36), cyanMat);
  trim.position.set(0, 1.62, 0);
  group.add(trim);

  return bakeStaticGroup(group, { castShadow: true });
}

export function createSpaceMeteorModel(): THREE.Group {
  const group = new THREE.Group();
  const spinPivot = new THREE.Group();
  spinPivot.position.y = 0.6;
  group.add(spinPivot);
  group.userData.spinPivot = spinPivot;

  const meteorMat = new THREE.MeshStandardMaterial({
    color: 0x9333ea,
    emissive: 0x7e22ce,
    emissiveIntensity: 0.5,
    roughness: 0.55,
  });
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });

  const ball = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58, 1), meteorMat);
  ball.castShadow = true;
  spinPivot.add(ball);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.07, 6, 14), stripeMat);
  ring.rotation.y = Math.PI / 2;
  spinPivot.add(ring);

  bakeStaticGroup(spinPivot, { castShadow: true, forceLambert: true });
  return group;
}

export function disposeModelsModuleSingletons(): void {
  const sharedVertexMats = new Set<THREE.Material>([
    SHARED_BASIC_VC,
    SHARED_BASIC_VC_DOUBLE,
    SHARED_MATTE_VC,
    SHARED_MATTE_VC_DOUBLE,
    SHARED_LAMBERT_VC,
    SHARED_LAMBERT_VC_DOUBLE,
    SHARED_STANDARD_VC,
  ]);

  for (const template of spectatorCache.values()) {
    template.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m && !sharedVertexMats.has(m) && !obj.userData?.sharedMaterial) {
            m.dispose();
          }
        }
      }
    });
  }
  spectatorCache.clear();

  if (sharedSimitGeo) {
    sharedSimitGeo.dispose();
    sharedSimitGeo = null;
  }
  if (sharedSimitMat) {
    sharedSimitMat.dispose();
    sharedSimitMat = null;
  }
  if (caveTrainTemplate) {
    caveTrainTemplate.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m) {
            const std = m as THREE.MeshStandardMaterial;
            std.map?.dispose();
            std.normalMap?.dispose();
            std.roughnessMap?.dispose();
            std.metalnessMap?.dispose();
            m.dispose();
          }
        }
      }
    });
    caveTrainTemplate = null;
    caveTrainLoadPromise = null;
  }
  if (caveTrainHeadlightShared) {
    caveTrainHeadlightShared.lensGeo.dispose();
    caveTrainHeadlightShared.lensMat.dispose();
    caveTrainHeadlightShared.parkedLensMat.dispose();
    caveTrainHeadlightShared.haloGeo.dispose();
    caveTrainHeadlightShared.haloMat.dispose();
    caveTrainHeadlightShared.beaconGeo.dispose();
    caveTrainHeadlightShared.beaconMat.dispose();
    caveTrainHeadlightShared.parkedBeaconMat.dispose();
    caveTrainHeadlightShared.cornerLampGeo.dispose();
    caveTrainHeadlightShared.tailGeo.dispose();
    caveTrainHeadlightShared.tailMat.dispose();
    caveTrainHeadlightShared.couplerGeo.dispose();
    caveTrainHeadlightShared.couplerMat.dispose();
    caveTrainHeadlightShared.coneGeo.dispose();
    caveTrainHeadlightShared.coneMat.dispose();
    caveTrainHeadlightShared.poolGeo.dispose();
    caveTrainHeadlightShared.movingPoolMat.dispose();
    caveTrainHeadlightShared.parkedPoolMat.dispose();
    caveTrainHeadlightShared = null;
  }
  if (caveTrainGlowTexture) {
    caveTrainGlowTexture.dispose();
    caveTrainGlowTexture = null;
  }
  if (sharedEarthShellMat) {
    sharedEarthShellMat.dispose();
    sharedEarthShellMat = null;
    sharedEarthShellTex = null;
  }
  if (sharedIceWorldMats) {
    sharedIceWorldMats.glacierMat.dispose();
    sharedIceWorldMats.auroraGreenMat.dispose();
    sharedIceWorldMats.auroraCyanMat.dispose();
    sharedIceWorldMats.auroraVioletMat.dispose();
    sharedIceWorldMats = null;
  }
  if (sharedBathTransMats) {
    sharedBathTransMats.waterStreamMat.dispose();
    sharedBathTransMats.curtainAquaMat.dispose();
    sharedBathTransMats.curtainPinkMat.dispose();
    sharedBathTransMats.bubbleMat.dispose();
    sharedBathTransMats = null;
  }
  if (sharedLabGlassMat) {
    sharedLabGlassMat.dispose();
    sharedLabGlassMat = null;
  }
  if (sharedSpaceTransMats) {
    sharedSpaceTransMats.ringMat.dispose();
    sharedSpaceTransMats.domeMat.dispose();
    sharedSpaceTransMats = null;
  }
}

