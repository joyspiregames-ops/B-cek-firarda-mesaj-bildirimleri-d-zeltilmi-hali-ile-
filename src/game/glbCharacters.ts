import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createJetpackAssembly, type JetpackAssembly } from './models';
import { SkinId } from './types';

THREE.Cache.enabled = true;

/**
 * Mixamo / Meshy / Tripo GLB model registry.
 * Add each remaining character's GLB path under /public/models/ here as they are added.
 */
export const CHARACTER_GLB_URLS: Partial<Record<SkinId, string>> = {
  kivircik_riza: '/models/kivircik_riza.glb',
  tamirci_kazim: '/models/tamirci_kazim.glb',
  diva_bocek: '/models/diva_bocek.glb',
  duktur_bocek: '/models/duktur_bocek.glb',
  hahamcan: '/models/hahamcan.glb',
};

const DONOR_LOCOMOTION_SKIN: SkinId = 'diva_bocek';
const DONOR_LOCOMOTION_URL = '/models/donor_locomotion.glb';
const SKINS_NEEDING_DONOR = new Set<SkinId>([
  'kivircik_riza',
  'tamirci_kazim',
  'hahamcan',
]);

export type GlbAnimState =
  | 'idle'
  | 'tap'
  | 'run'
  | 'turbo'
  | 'jump'
  | 'slide'
  | 'dodge_left'
  | 'dodge_right'
  | 'fly'
  | 'fall_back'
  | 'fall_face';

export interface GlbAttachmentMetrics {
  backOffsetZ: number;
  jetpackScale: number;
  headFrontOffsetZ: number;
  headlampOffsetY: number;
}

export interface GlbNormMetrics {
  normScale: number;
  minY: number;
  portraitFocusY: number;
}

export interface LoadedGlbAsset {
  sourceUrl?: string;
  scene: THREE.Group;
  rawAnimations: THREE.AnimationClip[];
  clips: Record<GlbAnimState, THREE.AnimationClip | null>;
  attachmentMetrics?: GlbAttachmentMetrics;
  normMetrics?: GlbNormMetrics;
}

const gltfLoader = new GLTFLoader();
const assetPromiseCache = new Map<string, Promise<LoadedGlbAsset>>();
const assetSyncCache = new Map<string, LoadedGlbAsset>();
const activeGlbAssetRefs = new Map<string, number>();
let donorLocomotionPromise: Promise<LoadedGlbAsset | null> | null = null;
let donorLocomotionSync: LoadedGlbAsset | null = null;

function retainGlbUrl(url: string | undefined): void {
  if (!url) return;
  activeGlbAssetRefs.set(url, (activeGlbAssetRefs.get(url) ?? 0) + 1);
}

function releaseGlbUrl(url: string | undefined): void {
  if (!url) return;
  const next = (activeGlbAssetRefs.get(url) ?? 0) - 1;
  if (next <= 0) {
    activeGlbAssetRefs.delete(url);
  } else {
    activeGlbAssetRefs.set(url, next);
  }
}

function findClipByCandidates(
  animations: THREE.AnimationClip[],
  patterns: RegExp[],
): THREE.AnimationClip | null {
  for (const re of patterns) {
    const found = animations.find((c) => re.test(c.name));
    if (found) return found;
  }
  return null;
}

function getNormalizedBoneKey(name: string): string {
  return name
    .replace(/^mixamorig[:_]?/i, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function collectBoneMaps(root: THREE.Object3D): {
  byExact: Map<string, THREE.Object3D>;
  byKey: Map<string, THREE.Object3D>;
  worldQuats: Map<THREE.Object3D, THREE.Quaternion>;
} {
  root.updateMatrixWorld(true);
  const byExact = new Map<string, THREE.Object3D>();
  const byKey = new Map<string, THREE.Object3D>();
  const worldQuats = new Map<THREE.Object3D, THREE.Quaternion>();

  root.traverse((obj) => {
    if (obj.name) {
      if (!byExact.has(obj.name)) byExact.set(obj.name, obj);
      const key = getNormalizedBoneKey(obj.name);
      if (key && !byKey.has(key)) byKey.set(key, obj);
    }
    const wq = new THREE.Quaternion();
    obj.getWorldQuaternion(wq);
    worldQuats.set(obj, wq);
  });

  return { byExact, byKey, worldQuats };
}

/**
 * Strips Mixamo horizontal root-motion from Hips.position tracks so the runner stays
 * locked cleanly in its lane while preserving natural vertical bounce (or fall height).
 */
function sanitizeMixamoClip(
  clip: THREE.AnimationClip,
  options: {
    name: string;
    stripHorizontal: boolean;
    clampYOffset?: number;
    preserveRelativeZ?: boolean;
    subclipStartSec?: number;
    subclipEndSec?: number;
  },
): THREE.AnimationClip {
  let working = clip.clone();
  if (
    typeof options.subclipStartSec === 'number' &&
    typeof options.subclipEndSec === 'number'
  ) {
    const fps = 30;
    const startFrame = Math.max(0, Math.round(options.subclipStartSec * fps));
    const endFrame = Math.max(
      startFrame + 2,
      Math.round(options.subclipEndSec * fps),
    );
    working = THREE.AnimationUtils.subclip(
      working,
      options.name,
      startFrame,
      endFrame,
      fps,
    );
  } else {
    working.name = options.name;
  }

  for (const track of working.tracks) {
    if (!/hips\.position$/i.test(track.name)) continue;
    const vals = track.values;
    if (vals.length < 3) continue;

    const y0 = vals[1];
    const z0 = vals[2];

    for (let i = 0; i < vals.length; i += 3) {
      if (options.stripHorizontal) {
        vals[i] = 0;
        if (options.preserveRelativeZ) {
          vals[i + 2] = THREE.MathUtils.clamp(vals[i + 2] - z0, -0.85, 0.85);
        } else {
          vals[i + 2] = 0;
        }
      }
      if (typeof options.clampYOffset === 'number') {
        vals[i + 1] = THREE.MathUtils.lerp(vals[i + 1], y0, options.clampYOffset);
      }
    }
  }

  working.optimize();
  return working;
}

/**
 * Retargets a Mixamo AnimationClip from a donor character (e.g. diva_bocek) onto
 * any target character skeleton (e.g. Tripo Mixamo export with rotated Hips rest pose)
 * via world-space rest-pose quaternion delta mapping.
 */
function retargetClipToTarget(
  srcClip: THREE.AnimationClip,
  srcScene: THREE.Group,
  dstScene: THREE.Group,
  options: {
    name: string;
    clampYOffset?: number;
    preserveRelativeZ?: boolean;
    subclipStartSec?: number;
    subclipEndSec?: number;
    boneSwingDamping?: Partial<Record<string, number>>;
  },
): THREE.AnimationClip | null {
  let working = srcClip.clone();
  if (
    typeof options.subclipStartSec === 'number' &&
    typeof options.subclipEndSec === 'number'
  ) {
    const fps = 30;
    const startFrame = Math.max(0, Math.round(options.subclipStartSec * fps));
    const endFrame = Math.max(
      startFrame + 2,
      Math.round(options.subclipEndSec * fps),
    );
    working = THREE.AnimationUtils.subclip(
      working,
      options.name,
      startFrame,
      endFrame,
      fps,
    );
  } else {
    working.name = options.name;
  }

  const srcMaps = collectBoneMaps(srcScene);
  const dstMaps = collectBoneMaps(dstScene);

  const srcHips = srcMaps.byKey.get('hips');
  const dstHips = dstMaps.byKey.get('hips');
  if (!srcHips || !dstHips) return null;

  const srcHipWorld = new THREE.Vector3();
  const dstHipWorld = new THREE.Vector3();
  srcHips.getWorldPosition(srcHipWorld);
  dstHips.getWorldPosition(dstHipWorld);
  const hipRatio = THREE.MathUtils.clamp(
    dstHipWorld.y / Math.max(0.1, srcHipWorld.y),
    0.2,
    4.5,
  );

  const qLocalSrc = new THREE.Quaternion();
  const qWorldDelta = new THREE.Quaternion();
  const qDst = new THREE.Quaternion();
  const invDP = new THREE.Quaternion();
  const invSB = new THREE.Quaternion();
  const tmpDelta = new THREE.Vector3();
  const identQ = new THREE.Quaternion();

  const outTracks: THREE.KeyframeTrack[] = [];

  for (const track of working.tracks) {
    const dotIdx = track.name.lastIndexOf('.');
    const nodeName = dotIdx >= 0 ? track.name.slice(0, dotIdx) : track.name;
    const prop = dotIdx >= 0 ? track.name.slice(dotIdx + 1) : '';

    const srcNode =
      srcMaps.byExact.get(nodeName) ??
      srcMaps.byKey.get(getNormalizedBoneKey(nodeName));
    if (!srcNode) continue;

    const boneKey = getNormalizedBoneKey(srcNode.name);
    const dstNode = dstMaps.byKey.get(boneKey);
    if (!dstNode) continue;

    const qSP =
      (srcNode.parent && srcMaps.worldQuats.get(srcNode.parent)) || identQ;
    const qSB = srcMaps.worldQuats.get(srcNode) || identQ;
    const qDP =
      (dstNode.parent && dstMaps.worldQuats.get(dstNode.parent)) || identQ;
    const qDB = dstMaps.worldQuats.get(dstNode) || identQ;

    invDP.copy(qDP).invert();
    invSB.copy(qSB).invert();

    if (
      track instanceof THREE.QuaternionKeyframeTrack &&
      prop === 'quaternion'
    ) {
      const srcVals = track.values;
      const dstVals = new Float32Array(srcVals.length);
      const damp = options.boneSwingDamping?.[boneKey];

      if (typeof damp === 'number' && damp >= 0 && damp < 1 && srcVals.length >= 8) {
        const frameCount = srcVals.length / 4;
        const deltas: THREE.Quaternion[] = new Array(frameCount);
        let sumX = 0;
        let sumY = 0;
        let sumZ = 0;
        let sumW = 0;

        for (let f = 0; f < frameCount; f++) {
          const i = f * 4;
          qLocalSrc.set(srcVals[i], srcVals[i + 1], srcVals[i + 2], srcVals[i + 3]);
          const qd = new THREE.Quaternion().copy(qSP).multiply(qLocalSrc).multiply(invSB);
          if (f > 0 && qd.dot(deltas[0]) < 0) {
            qd.set(-qd.x, -qd.y, -qd.z, -qd.w);
          }
          deltas[f] = qd;
          sumX += qd.x;
          sumY += qd.y;
          sumZ += qd.z;
          sumW += qd.w;
        }

        const qMean = new THREE.Quaternion(sumX, sumY, sumZ, sumW).normalize();
        for (let f = 0; f < frameCount; f++) {
          const i = f * 4;
          qWorldDelta.copy(qMean).slerp(deltas[f], damp);
          qDst.copy(invDP).multiply(qWorldDelta).multiply(qDB);
          dstVals[i] = qDst.x;
          dstVals[i + 1] = qDst.y;
          dstVals[i + 2] = qDst.z;
          dstVals[i + 3] = qDst.w;
        }
      } else {
        for (let i = 0; i < srcVals.length; i += 4) {
          qLocalSrc.set(srcVals[i], srcVals[i + 1], srcVals[i + 2], srcVals[i + 3]);
          qWorldDelta.copy(qSP).multiply(qLocalSrc).multiply(invSB);
          qDst.copy(invDP).multiply(qWorldDelta).multiply(qDB);
          dstVals[i] = qDst.x;
          dstVals[i + 1] = qDst.y;
          dstVals[i + 2] = qDst.z;
          dstVals[i + 3] = qDst.w;
        }
      }
      outTracks.push(
        new THREE.QuaternionKeyframeTrack(
          `${dstNode.name}.quaternion`,
          track.times.slice(),
          dstVals,
        ),
      );
    } else if (
      track instanceof THREE.VectorKeyframeTrack &&
      prop === 'position' &&
      boneKey === 'hips'
    ) {
      const srcVals = track.values;
      const dstVals = new Float32Array(srcVals.length);
      const y0 = srcVals.length >= 2 ? srcVals[1] : srcNode.position.y;
      const z0 = srcVals.length >= 3 ? srcVals[2] : srcNode.position.z;

      for (let i = 0; i < srcVals.length; i += 3) {
        let dy = (srcVals[i + 1] - srcNode.position.y) * hipRatio;
        if (typeof options.clampYOffset === 'number') {
          const dy0 = (y0 - srcNode.position.y) * hipRatio;
          dy = THREE.MathUtils.lerp(dy, dy0, options.clampYOffset);
        }
        const dz = options.preserveRelativeZ
          ? THREE.MathUtils.clamp((srcVals[i + 2] - z0) * hipRatio, -0.85, 0.85)
          : 0;

        tmpDelta.set(0, dy, dz).applyQuaternion(invDP);
        dstVals[i] = dstNode.position.x + tmpDelta.x;
        dstVals[i + 1] = dstNode.position.y + tmpDelta.y;
        dstVals[i + 2] = dstNode.position.z + tmpDelta.z;
      }
      outTracks.push(
        new THREE.VectorKeyframeTrack(
          `${dstNode.name}.position`,
          track.times.slice(),
          dstVals,
        ),
      );
    }
  }

  if (outTracks.length === 0) return null;
  const retargeted = new THREE.AnimationClip(options.name, working.duration, outTracks);
  retargeted.optimize();
  return retargeted;
}

/**
 * Synthesizes a full-body athletic Subway Surfers sidestep + flowing crossover
 * AnimationClip (`dodge_left` / `dodge_right`) tailored to each GLB's rest skeleton:
 * - Head & neck counter-rotate to stay steady facing forward (-Z) down the track
 * - Hips & spine crouch/lean/twist smoothly into the target lane
 * - Arms stay tucked at waist height in tight runner guard (zero T-pose flare)
 * - Lead leg drives wide into the target lane; trailing leg sweeps smoothly across behind->into lane
 */
function buildSyntheticDodgeClip(
  rawScene: THREE.Group,
  dir: -1 | 1,
): THREE.AnimationClip | null {
  const clone = rawScene.clone(true);
  const pivot = new THREE.Group();
  // Match GlbCharacterController modelPivot orientation (+X=Right, +Y=Up, -Z=Forward)
  pivot.rotation.y = Math.PI;
  pivot.add(clone);
  pivot.updateMatrixWorld(true);

  const byKey = new Map<string, THREE.Object3D>();
  const restWorldQ = new Map<THREE.Object3D, THREE.Quaternion>();
  const restWorldP = new Map<THREE.Object3D, THREE.Vector3>();
  const restLocalPos = new Map<THREE.Object3D, THREE.Vector3>();

  clone.traverse((obj) => {
    if (!obj.name) return;
    const key = getNormalizedBoneKey(obj.name);
    if (key && !byKey.has(key)) byKey.set(key, obj);
    const wq = new THREE.Quaternion();
    const wp = new THREE.Vector3();
    obj.getWorldQuaternion(wq);
    obj.getWorldPosition(wp);
    restWorldQ.set(obj, wq);
    restWorldP.set(obj, wp);
    restLocalPos.set(obj, obj.position.clone());
  });

  const hips = byKey.get('hips');
  if (!hips) return null;
  const hipHeight = Math.max(0.2, (restWorldP.get(hips)?.y ?? 0.85));
  const times = [0.0, 0.065, 0.145, 0.23, 0.31];
  const d = dir;

  const keyframes = [
    // t=0.000: crisp athletic sprint stance
    {
      hipOffsetY: -0.03 * hipHeight,
      hipOffsetX: 0.0,
      hipLeanZ: -0.04 * d,
      hipYawY: -0.04 * d,
      hipPitchX: 0.07,
      spineLeanZ: -0.04 * d,
      spineYawY: -0.05 * d,
      spinePitchX: 0.09,
      lArmDown: 1.32,
      lArmFwd: 0.32,
      lArmOut: 0.02,
      lElbowFlex: 1.45,
      rArmDown: 1.32,
      rArmFwd: -0.22,
      rArmOut: 0.02,
      rElbowFlex: 1.35,
      leadOut: 0.12 * d,
      leadFwd: 0.24,
      leadKnee: -0.36,
      leadFootPitch: 0.10,
      trailOut: -0.04 * d,
      trailFwd: -0.22,
      trailKnee: -0.38,
      trailFootPitch: 0.12,
    },
    // t=0.065: explosive launch step into target lane
    {
      hipOffsetY: -0.085 * hipHeight,
      hipOffsetX: 0.075 * hipHeight * d,
      hipLeanZ: -0.15 * d,
      hipYawY: -0.15 * d,
      hipPitchX: 0.11,
      spineLeanZ: -0.13 * d,
      spineYawY: -0.15 * d,
      spinePitchX: 0.14,
      lArmDown: 1.30,
      lArmFwd: d > 0 ? 0.52 : -0.32,
      lArmOut: 0.06,
      lElbowFlex: 1.55,
      rArmDown: 1.30,
      rArmFwd: d > 0 ? -0.32 : 0.52,
      rArmOut: 0.06,
      rElbowFlex: 1.55,
      leadOut: 0.62 * d,
      leadFwd: 0.45,
      leadKnee: -0.66,
      leadFootPitch: 0.16,
      trailOut: -0.24 * d,
      trailFwd: -0.46,
      trailKnee: -0.45,
      trailFootPitch: 0.24,
    },
    // t=0.145: flowing crossover sweep — trail leg glides smoothly into new lane
    {
      hipOffsetY: -0.065 * hipHeight,
      hipOffsetX: 0.045 * hipHeight * d,
      hipLeanZ: -0.12 * d,
      hipYawY: -0.09 * d,
      hipPitchX: 0.10,
      spineLeanZ: -0.10 * d,
      spineYawY: -0.10 * d,
      spinePitchX: 0.12,
      lArmDown: 1.32,
      lArmFwd: d > 0 ? 0.24 : -0.18,
      lArmOut: 0.04,
      lElbowFlex: 1.48,
      rArmDown: 1.32,
      rArmFwd: d > 0 ? -0.18 : 0.24,
      rArmOut: 0.04,
      rElbowFlex: 1.48,
      leadOut: 0.26 * d,
      leadFwd: 0.05,
      leadKnee: -0.50,
      leadFootPitch: 0.08,
      trailOut: 0.60 * d,
      trailFwd: 0.24,
      trailKnee: -0.68,
      trailFootPitch: 0.18,
    },
    // t=0.230: crisp follow-through landing in target lane
    {
      hipOffsetY: -0.04 * hipHeight,
      hipOffsetX: 0.0,
      hipLeanZ: -0.03 * d,
      hipYawY: -0.02 * d,
      hipPitchX: 0.08,
      spineLeanZ: -0.03 * d,
      spineYawY: -0.03 * d,
      spinePitchX: 0.09,
      lArmDown: 1.33,
      lArmFwd: -0.22,
      lArmOut: 0.02,
      lElbowFlex: 1.40,
      rArmDown: 1.33,
      rArmFwd: 0.30,
      rArmOut: 0.02,
      rElbowFlex: 1.42,
      leadOut: 0.04 * d,
      leadFwd: -0.26,
      leadKnee: -0.36,
      leadFootPitch: 0.10,
      trailOut: 0.22 * d,
      trailFwd: 0.34,
      trailKnee: -0.44,
      trailFootPitch: 0.10,
    },
    // t=0.310: neutral running posture ready for crossfade into run/turbo
    {
      hipOffsetY: -0.02 * hipHeight,
      hipOffsetX: 0.0,
      hipLeanZ: 0.0,
      hipYawY: 0.0,
      hipPitchX: 0.06,
      spineLeanZ: 0.0,
      spineYawY: 0.0,
      spinePitchX: 0.08,
      lArmDown: 1.33,
      lArmFwd: 0.26,
      lArmOut: 0.02,
      lElbowFlex: 1.38,
      rArmDown: 1.33,
      rArmFwd: -0.22,
      rArmOut: 0.02,
      rElbowFlex: 1.36,
      leadOut: 0.0,
      leadFwd: 0.22,
      leadKnee: -0.32,
      leadFootPitch: 0.08,
      trailOut: 0.0,
      trailFwd: -0.22,
      trailKnee: -0.34,
      trailFootPitch: 0.10,
    },
  ];

  const qTracks = new Map<THREE.Object3D, number[]>();
  const addQTrack = (bone: THREE.Object3D, q: THREE.Quaternion) => {
    let arr = qTracks.get(bone);
    if (!arr) {
      arr = [];
      qTracks.set(bone, arr);
    }
    arr.push(q.x, q.y, q.z, q.w);
  };
  const hipPosVals: number[] = [];
  const qInvParent = new THREE.Quaternion();
  const qLocal = new THREE.Quaternion();
  const identQ = new THREE.Quaternion();
  const eulerTmp = new THREE.Euler();
  const dWorldVec = new THREE.Vector3();
  const hipParentScale = new THREE.Vector3(1, 1, 1);

  const applyWorldRot = (
    bone: THREE.Object3D,
    desiredWorldQ: THREE.Quaternion,
    currentWorldMap: Map<THREE.Object3D, THREE.Quaternion>,
  ) => {
    const parent = bone.parent;
    const parentWorldQ =
      (parent && currentWorldMap.get(parent)) ||
      (parent && restWorldQ.get(parent)) ||
      identQ;
    qInvParent.copy(parentWorldQ).invert();
    qLocal.copy(qInvParent).multiply(desiredWorldQ);
    addQTrack(bone, qLocal);
    currentWorldMap.set(bone, desiredWorldQ.clone());
  };

  for (const kf of keyframes) {
    const curW = new Map<THREE.Object3D, THREE.Quaternion>();

    const hipParentW = (hips.parent && restWorldQ.get(hips.parent)) || identQ;
    const invHipParent = hipParentW.clone().invert();
    hipParentScale.set(1, 1, 1);
    if (hips.parent) hips.parent.getWorldScale(hipParentScale);
    dWorldVec
      .set(kf.hipOffsetX, kf.hipOffsetY, 0)
      .applyQuaternion(invHipParent)
      .divide(hipParentScale);
    const restHipP = restLocalPos.get(hips) ?? hips.position;
    hipPosVals.push(
      restHipP.x + dWorldVec.x,
      restHipP.y + dWorldVec.y,
      restHipP.z + dWorldVec.z,
    );

    const qHipDelta = new THREE.Quaternion().setFromEuler(
      eulerTmp.set(kf.hipPitchX, kf.hipYawY, kf.hipLeanZ, 'YXZ'),
    );
    applyWorldRot(hips, qHipDelta.clone().multiply(restWorldQ.get(hips)!), curW);

    const qSpineUnit = new THREE.Quaternion().setFromEuler(
      eulerTmp.set(kf.spinePitchX * 0.42, kf.spineYawY * 0.42, kf.spineLeanZ * 0.42, 'YXZ'),
    );
    const qSpineAccum = qHipDelta.clone();
    for (const key of ['spine', 'spine1', 'spine2']) {
      const sb = byKey.get(key);
      if (!sb) continue;
      qSpineAccum.premultiply(qSpineUnit);
      applyWorldRot(sb, qSpineAccum.clone().multiply(restWorldQ.get(sb)!), curW);
    }

    // Neck & Head stay steady facing straight forward down the track
    const neck = byKey.get('neck');
    const head = byKey.get('head');
    if (neck) {
      applyWorldRot(
        neck,
        new THREE.Quaternion()
          .setFromEuler(eulerTmp.set(0.03, 0, 0, 'YXZ'))
          .multiply(restWorldQ.get(neck)!),
        curW,
      );
    }
    if (head) {
      applyWorldRot(
        head,
        new THREE.Quaternion()
          .setFromEuler(eulerTmp.set(0.02, 0, 0, 'YXZ'))
          .multiply(restWorldQ.get(head)!),
        curW,
      );
    }

    const lShoulder = byKey.get('leftshoulder');
    const rShoulder = byKey.get('rightshoulder');
    if (lShoulder) {
      applyWorldRot(
        lShoulder,
        qSpineAccum.clone().multiply(restWorldQ.get(lShoulder)!),
        curW,
      );
    }
    if (rShoulder) {
      applyWorldRot(
        rShoulder,
        qSpineAccum.clone().multiply(restWorldQ.get(rShoulder)!),
        curW,
      );
    }

    const lArm = byKey.get('leftarm');
    const lFore = byKey.get('leftforearm');
    const rArm = byKey.get('rightarm');
    const rFore = byKey.get('rightforearm');
    if (lArm) {
      applyWorldRot(
        lArm,
        new THREE.Quaternion()
          .setFromEuler(eulerTmp.set(kf.lArmFwd, 0.08, kf.lArmDown - kf.lArmOut, 'XYZ'))
          .multiply(restWorldQ.get(lArm)!),
        curW,
      );
    }
    if (lFore) {
      applyWorldRot(
        lFore,
        new THREE.Quaternion()
          .setFromEuler(
            eulerTmp.set(
              kf.lArmFwd + kf.lElbowFlex,
              0.14,
              kf.lArmDown - kf.lArmOut,
              'XYZ',
            ),
          )
          .multiply(restWorldQ.get(lFore)!),
        curW,
      );
    }
    if (rArm) {
      applyWorldRot(
        rArm,
        new THREE.Quaternion()
          .setFromEuler(
            eulerTmp.set(kf.rArmFwd, -0.08, -(kf.rArmDown - kf.rArmOut), 'XYZ'),
          )
          .multiply(restWorldQ.get(rArm)!),
        curW,
      );
    }
    if (rFore) {
      applyWorldRot(
        rFore,
        new THREE.Quaternion()
          .setFromEuler(
            eulerTmp.set(
              kf.rArmFwd + kf.rElbowFlex,
              -0.14,
              -(kf.rArmDown - kf.rArmOut),
              'XYZ',
            ),
          )
          .multiply(restWorldQ.get(rFore)!),
        curW,
      );
    }

    const lSpec =
      d > 0
        ? { out: kf.trailOut, fwd: kf.trailFwd, knee: kf.trailKnee, foot: kf.trailFootPitch }
        : { out: kf.leadOut, fwd: kf.leadFwd, knee: kf.leadKnee, foot: kf.leadFootPitch };
    const rSpec =
      d > 0
        ? { out: kf.leadOut, fwd: kf.leadFwd, knee: kf.leadKnee, foot: kf.leadFootPitch }
        : { out: kf.trailOut, fwd: kf.trailFwd, knee: kf.trailKnee, foot: kf.trailFootPitch };

    const lUpLeg = byKey.get('leftupleg');
    const lLeg = byKey.get('leftleg');
    const lFoot = byKey.get('leftfoot');
    const qLUp = new THREE.Quaternion().setFromEuler(
      eulerTmp.set(lSpec.fwd, 0, lSpec.out, 'ZXY'),
    );
    if (lUpLeg) applyWorldRot(lUpLeg, qLUp.clone().multiply(restWorldQ.get(lUpLeg)!), curW);
    if (lLeg) {
      const qLLeg = qLUp
        .clone()
        .multiply(new THREE.Quaternion().setFromEuler(eulerTmp.set(lSpec.knee, 0, 0, 'XYZ')));
      applyWorldRot(lLeg, qLLeg.clone().multiply(restWorldQ.get(lLeg)!), curW);
      if (lFoot) {
        applyWorldRot(
          lFoot,
          qLLeg
            .clone()
            .multiply(
              new THREE.Quaternion().setFromEuler(eulerTmp.set(lSpec.foot, 0, 0, 'XYZ')),
            )
            .multiply(restWorldQ.get(lFoot)!),
          curW,
        );
      }
    }

    const rUpLeg = byKey.get('rightupleg');
    const rLeg = byKey.get('rightleg');
    const rFoot = byKey.get('rightfoot');
    const qRUp = new THREE.Quaternion().setFromEuler(
      eulerTmp.set(rSpec.fwd, 0, rSpec.out, 'ZXY'),
    );
    if (rUpLeg) applyWorldRot(rUpLeg, qRUp.clone().multiply(restWorldQ.get(rUpLeg)!), curW);
    if (rLeg) {
      const qRLeg = qRUp
        .clone()
        .multiply(new THREE.Quaternion().setFromEuler(eulerTmp.set(rSpec.knee, 0, 0, 'XYZ')));
      applyWorldRot(rLeg, qRLeg.clone().multiply(restWorldQ.get(rLeg)!), curW);
      if (rFoot) {
        applyWorldRot(
          rFoot,
          qRLeg
            .clone()
            .multiply(
              new THREE.Quaternion().setFromEuler(eulerTmp.set(rSpec.foot, 0, 0, 'XYZ')),
            )
            .multiply(restWorldQ.get(rFoot)!),
          curW,
        );
      }
    }
  }

  const tracks: THREE.KeyframeTrack[] = [
    new THREE.VectorKeyframeTrack(`${hips.name}.position`, times, hipPosVals),
  ];
  for (const [bone, vals] of qTracks.entries()) {
    tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, vals));
  }
  return new THREE.AnimationClip(
    dir > 0 ? 'dodge_right' : 'dodge_left',
    times[times.length - 1],
    tracks,
  );
}

function hasFullLocomotionSuite(animations: THREE.AnimationClip[]): boolean {
  const hasRun = Boolean(findClipByCandidates(animations, [/^running$/i]));
  const hasSlide = Boolean(findClipByCandidates(animations, [/slide/i]));
  const hasKnock = Boolean(findClipByCandidates(animations, [/knock_?down/i]));
  return hasRun && hasSlide && hasKnock;
}

function buildClipMap(
  animations: THREE.AnimationClip[],
  targetScene: THREE.Group,
  donorAsset: LoadedGlbAsset | null,
  skinId?: SkinId,
): Record<GlbAnimState, THREE.AnimationClip | null> {
  const donorAnims = donorAsset?.rawAnimations ?? [];
  const donorScene = donorAsset?.scene ?? null;

  const pickOrRetarget = (
    nativePatterns: RegExp[],
    donorPatterns: RegExp[],
    opts: {
      name: string;
      stripHorizontal: boolean;
      clampYOffset?: number;
      preserveRelativeZ?: boolean;
      subclipStartSec?: number;
      subclipEndSec?: number;
      boneSwingDamping?: Partial<Record<string, number>>;
    },
  ): THREE.AnimationClip | null => {
    const nativeRaw = findClipByCandidates(animations, nativePatterns);
    if (nativeRaw) {
      return sanitizeMixamoClip(nativeRaw, opts);
    }
    if (donorScene && donorAnims.length > 0) {
      const donorRaw = findClipByCandidates(donorAnims, donorPatterns);
      if (donorRaw) {
        return retargetClipToTarget(donorRaw, donorScene, targetScene, opts);
      }
    }
    return null;
  };

  // Prefer character's own dance/idle animation first (e.g. Tripo custom home dance)
  const idleRaw = findClipByCandidates(animations, [
    /listening/i,
    /dans|dance/i,
    /engelden.*kay/i,
    /^idle$/i,
    /standing/i,
    /^kayma$/i,
  ]);
  const tapCandidates = animations.filter((a) => a !== idleRaw);
  const tapRaw =
    findClipByCandidates(tapCandidates, [
      /^kayma$/i,
      /walking/i,
      /^walk$/i,
      /wave/i,
      /taunt/i,
      /engelden.*kay/i,
      /listening/i,
    ]) ?? tapCandidates[0] ?? null;

  // Stabilize wide/short-torso pelvis & lower-back swing on kivircik_riza while keeping identical sprint energy
  const runSwingDamping: Partial<Record<string, number>> | undefined =
    skinId === 'kivircik_riza'
      ? { hips: 0.3, spine: 0.22, spine1: 0.72 }
      : undefined;

  const runClip = pickOrRetarget([/^running$/i], [/^running$/i], {
    name: 'run',
    stripHorizontal: true,
    boneSwingDamping: runSwingDamping,
  }) ??
    pickOrRetarget([/^run$/i, /run(?!_?0?2)/i], [/^running$/i], {
      name: 'run',
      stripHorizontal: true,
      boneSwingDamping: runSwingDamping,
    });

  const turboClip = pickOrRetarget(
    [/run_02/i, /sprint/i, /fast/i],
    [/run_02/i, /^running$/i],
    {
      name: 'turbo',
      stripHorizontal: true,
      boneSwingDamping: runSwingDamping,
    },
  ) ?? runClip;

  const donorJumpRaw = donorAnims.length > 0
    ? findClipByCandidates(donorAnims, [/jump_with_arms/i, /jump/i])
    : null;
  const nativeJumpRaw = findClipByCandidates(animations, [/jump_with_arms/i]);

  let jumpClip: THREE.AnimationClip | null = null;
  if (nativeJumpRaw) {
    jumpClip = sanitizeMixamoClip(nativeJumpRaw, {
      name: 'jump',
      stripHorizontal: true,
      clampYOffset: 0.88,
      ...(nativeJumpRaw.duration > 2.2
        ? { subclipStartSec: 1.15, subclipEndSec: 2.35 }
        : {}),
    });
  } else if (donorScene && donorJumpRaw) {
    jumpClip = retargetClipToTarget(donorJumpRaw, donorScene, targetScene, {
      name: 'jump',
      clampYOffset: 0.88,
      ...(donorJumpRaw.duration > 2.2
        ? { subclipStartSec: 1.15, subclipEndSec: 2.35 }
        : {}),
    });
  } else {
    const fallbackJump = findClipByCandidates(animations, [/jump/i]);
    if (fallbackJump) {
      jumpClip = sanitizeMixamoClip(fallbackJump, {
        name: 'jump',
        stripHorizontal: true,
        clampYOffset: 0.88,
      });
    }
  }

  const slideClip = pickOrRetarget(
    [/slide/i, /roll/i, /dodge/i],
    [/slide_right/i, /slide/i],
    {
      name: 'slide',
      stripHorizontal: true,
    },
  );

  // Trim Knock_Down just before Meshy's final wrap-to-standing keyframe at 2.50s
  const nativeKnockRaw = findClipByCandidates(animations, [/knock_?down/i]);
  let fallBackClip: THREE.AnimationClip | null = null;
  if (nativeKnockRaw) {
    fallBackClip = sanitizeMixamoClip(nativeKnockRaw, {
      name: 'fall_back',
      stripHorizontal: true,
      preserveRelativeZ: true,
      ...(nativeKnockRaw.duration > 2.38
        ? { subclipStartSec: 0, subclipEndSec: 2.32 }
        : {}),
    });
  } else if (donorScene && donorAnims.length > 0) {
    const donorKnock = findClipByCandidates(donorAnims, [/knock_?down/i]);
    if (donorKnock) {
      fallBackClip = retargetClipToTarget(donorKnock, donorScene, targetScene, {
        name: 'fall_back',
        preserveRelativeZ: true,
        ...(donorKnock.duration > 2.38
          ? { subclipStartSec: 0, subclipEndSec: 2.32 }
          : {}),
      });
    }
  }
  if (!fallBackClip) {
    const fallbackFall = findClipByCandidates(animations, [/^fall$/i, /death/i]);
    if (fallbackFall) {
      fallBackClip = sanitizeMixamoClip(fallbackFall, {
        name: 'fall_back',
        stripHorizontal: true,
        preserveRelativeZ: true,
        ...(fallbackFall.duration > 2.5
          ? { subclipStartSec: 0.15, subclipEndSec: 2.35 }
          : {}),
      });
    }
  }

  const fallFaceClip =
    pickOrRetarget(
      [/prone/i, /yüzü.*koyun|yuzu.*koyun/i, /face/i],
      [/prone/i, /knock_?down/i],
      {
        name: 'fall_face',
        stripHorizontal: true,
      },
    ) ?? fallBackClip;

  const idleClip = idleRaw
    ? sanitizeMixamoClip(idleRaw, {
        name: 'idle',
        stripHorizontal: true,
      })
    : runClip;

  const tapClip = tapRaw
    ? sanitizeMixamoClip(tapRaw, {
        name: 'tap',
        stripHorizontal: true,
      })
    : idleClip;

  const dodgeLeftClip = buildSyntheticDodgeClip(targetScene, -1);
  const dodgeRightClip = buildSyntheticDodgeClip(targetScene, 1);

  const flySource = jumpClip || runClip;
  const flyClip = flySource ? flySource.clone() : null;
  if (flyClip) {
    flyClip.name = 'fly';
  }

  return {
    idle: idleClip,
    tap: tapClip,
    run: runClip,
    turbo: turboClip,
    jump: jumpClip,
    slide: slideClip,
    dodge_left: dodgeLeftClip ?? runClip,
    dodge_right: dodgeRightClip ?? runClip,
    fly: flyClip,
    fall_back: fallBackClip,
    fall_face: fallFaceClip,
  };
}

/**
 * Removes leaked thigh/leg skinning weights from Kıvırcık Rıza's rigid rear
 * abdomen/carapace shell (z < -0.02, y in 0.14..0.48) and transfers them cleanly
 * to Hips/Spine so alternating leg swings never ripple his rear shell.
 */
function stabilizeKivircikShellWeights(scene: THREE.Group): void {
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.SkinnedMesh) || !obj.skeleton) return;
    const geom = obj.geometry;
    const pos = geom.getAttribute('position');
    const skinIdx = geom.getAttribute('skinIndex');
    const skinWt = geom.getAttribute('skinWeight');
    if (!pos || !skinIdx || !skinWt) return;

    const bones = obj.skeleton.bones;
    let hipsIdx = -1;
    let spineIdx = -1;
    const legIndices = new Set<number>();

    for (let b = 0; b < bones.length; b++) {
      const name = bones[b]?.name ?? '';
      if (/hips$/i.test(name)) hipsIdx = b;
      else if (/spine$/i.test(name)) spineIdx = b;
      else if (/upleg$|leg$|foot|toe/i.test(name)) legIndices.add(b);
    }
    if (hipsIdx < 0 || legIndices.size === 0) return;

    const idxArr = [0, 0, 0, 0];
    const wtArr = [0, 0, 0, 0];
    let modified = false;

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const zFactor = THREE.MathUtils.smoothstep(-z, 0.02, 0.055);
      if (zFactor <= 0.001) continue;
      const yLow = THREE.MathUtils.smoothstep(y, 0.14, 0.17);
      const yHigh = 1 - THREE.MathUtils.smoothstep(y, 0.44, 0.48);
      const shellFactor = zFactor * yLow * yHigh;
      if (shellFactor <= 0.001) continue;

      idxArr[0] = skinIdx.getX(i);
      idxArr[1] = skinIdx.getY(i);
      idxArr[2] = skinIdx.getZ(i);
      idxArr[3] = skinIdx.getW(i);

      wtArr[0] = skinWt.getX(i);
      wtArr[1] = skinWt.getY(i);
      wtArr[2] = skinWt.getZ(i);
      wtArr[3] = skinWt.getW(i);

      let removed = 0;
      let anchorSlot = -1;
      for (let k = 0; k < 4; k++) {
        if (idxArr[k] === hipsIdx) anchorSlot = k;
        else if (anchorSlot < 0 && idxArr[k] === spineIdx) anchorSlot = k;
      }

      for (let k = 0; k < 4; k++) {
        if (legIndices.has(idxArr[k]) && wtArr[k] > 0) {
          const delta = wtArr[k] * shellFactor;
          wtArr[k] -= delta;
          removed += delta;
        }
      }

      if (removed <= 0.0005) continue;

      if (anchorSlot >= 0) {
        wtArr[anchorSlot] += removed;
      } else {
        // Fallback: reuse lowest-weight slot for Hips
        let minK = 0;
        for (let k = 1; k < 4; k++) {
          if (wtArr[k] < wtArr[minK]) minK = k;
        }
        idxArr[minK] = hipsIdx;
        wtArr[minK] = removed;
        skinIdx.setXYZW(i, idxArr[0], idxArr[1], idxArr[2], idxArr[3]);
      }

      const sum = wtArr[0] + wtArr[1] + wtArr[2] + wtArr[3];
      if (sum > 0.0001) {
        const inv = 1 / sum;
        skinWt.setXYZW(i, wtArr[0] * inv, wtArr[1] * inv, wtArr[2] * inv, wtArr[3] * inv);
        modified = true;
      }
    }

    if (modified) {
      skinIdx.needsUpdate = true;
      skinWt.needsUpdate = true;
    }
  });
}

function configureGlbScene(scene: THREE.Group, skinId?: SkinId): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      // Disable self-shadowing on high-poly skinned meshes to prevent mobile GPU cost & shadow acne
      obj.receiveShadow = false;
      obj.frustumCulled = false;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m) continue;
        const std = m as THREE.MeshStandardMaterial;
        if (std.map) {
          std.map.colorSpace = THREE.SRGBColorSpace;
        }
        if (typeof std.envMapIntensity === 'number') {
          std.envMapIntensity = 0.85;
        }
      }
    }
  });
  if (skinId === 'kivircik_riza') {
    stabilizeKivircikShellWeights(scene);
  }
}

export function getCachedCharacterGlb(skinId: SkinId): LoadedGlbAsset | null {
  const url = CHARACTER_GLB_URLS[skinId];
  if (!url) return null;
  return assetSyncCache.get(url) ?? null;
}

function disposeGlbSceneResources(scene: THREE.Group): void {
  const disposedTextures = new Set<THREE.Texture>();
  const disposeMaterial = (mat: THREE.Material | null | undefined) => {
    if (!mat) return;
    const record = mat as unknown as Record<string, unknown>;
    for (const key of [
      'map',
      'normalMap',
      'roughnessMap',
      'metalnessMap',
      'emissiveMap',
      'aoMap',
      'alphaMap',
      'bumpMap',
    ]) {
      const tex = record[key];
      if (tex instanceof THREE.Texture && !disposedTextures.has(tex)) {
        disposedTextures.add(tex);
        tex.dispose();
      }
    }
    mat.dispose();
  };

  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => disposeMaterial(m));
      } else {
        disposeMaterial(obj.material);
      }
    }
  });
}

export function evictUnusedCharacterGlbs(keepSkinIds: SkinId[]): void {
  const keepUrls = new Set<string>();
  for (const id of keepSkinIds) {
    const url = CHARACTER_GLB_URLS[id];
    if (url) keepUrls.add(url);
  }
  for (const [url, asset] of Array.from(assetSyncCache.entries())) {
    if (keepUrls.has(url)) continue;
    if ((activeGlbAssetRefs.get(url) ?? 0) > 0) continue;
    assetSyncCache.delete(url);
    assetPromiseCache.delete(url);
    THREE.Cache.remove(url);
    disposeGlbSceneResources(asset.scene);
  }
}

export function disposeAllCachedGlbAssets(): void {
  for (const [url, asset] of Array.from(assetSyncCache.entries())) {
    assetSyncCache.delete(url);
    assetPromiseCache.delete(url);
    THREE.Cache.remove(url);
    disposeGlbSceneResources(asset.scene);
  }
  if (donorLocomotionSync) {
    disposeGlbSceneResources(donorLocomotionSync.scene);
    donorLocomotionSync = null;
  }
  donorLocomotionPromise = null;
  THREE.Cache.remove(DONOR_LOCOMOTION_URL);
  for (const [url, chaser] of Array.from(chaserSyncCache.entries())) {
    chaserSyncCache.delete(url);
    chaserPromiseCache.delete(url);
    THREE.Cache.remove(url);
    disposeGlbSceneResources(chaser.scene);
  }
  activeGlbAssetRefs.clear();
}

function preloadDonorLocomotion(): Promise<LoadedGlbAsset | null> {
  if (donorLocomotionSync) return Promise.resolve(donorLocomotionSync);
  if (!donorLocomotionPromise) {
    donorLocomotionPromise = gltfLoader
      .loadAsync(DONOR_LOCOMOTION_URL)
      .then((gltf: GLTF) => {
        THREE.Cache.remove(DONOR_LOCOMOTION_URL);
        const donor: LoadedGlbAsset = {
          scene: gltf.scene,
          rawAnimations: gltf.animations,
          clips: {
            idle: null,
            tap: null,
            run: null,
            turbo: null,
            jump: null,
            slide: null,
            dodge_left: null,
            dodge_right: null,
            fly: null,
            fall_back: null,
            fall_face: null,
          },
        };
        donorLocomotionSync = donor;
        return donor;
      })
      .catch(() => {
        THREE.Cache.remove(DONOR_LOCOMOTION_URL);
        donorLocomotionPromise = null;
        return preloadCharacterGlb(DONOR_LOCOMOTION_SKIN).catch(() => null);
      });
  }
  return donorLocomotionPromise;
}

export function preloadCharacterGlb(skinId: SkinId): Promise<LoadedGlbAsset | null> {
  const url = CHARACTER_GLB_URLS[skinId];
  if (!url) return Promise.resolve(null);

  const cached = assetSyncCache.get(url);
  if (cached) return Promise.resolve(cached);

  let pending = assetPromiseCache.get(url);
  if (!pending) {
    // Start lightweight meshless locomotion donor in parallel so there is zero waterfall delay
    const parallelDonorPromise = SKINS_NEEDING_DONOR.has(skinId)
      ? preloadDonorLocomotion()
      : null;

    pending = gltfLoader
      .loadAsync(url)
      .then(async (gltf: GLTF) => {
        THREE.Cache.remove(url);
        configureGlbScene(gltf.scene, skinId);

        let donorAsset: LoadedGlbAsset | null = null;
        if (
          skinId !== DONOR_LOCOMOTION_SKIN &&
          !hasFullLocomotionSuite(gltf.animations)
        ) {
          try {
            donorAsset = await (parallelDonorPromise ?? preloadDonorLocomotion());
          } catch {
            donorAsset = null;
          }
        }

        const loaded: LoadedGlbAsset = {
          sourceUrl: url,
          scene: gltf.scene,
          rawAnimations: gltf.animations,
          clips: buildClipMap(gltf.animations, gltf.scene, donorAsset, skinId),
        };
        assetSyncCache.set(url, loaded);
        return loaded;
      })
      .catch((err) => {
        THREE.Cache.remove(url);
        assetPromiseCache.delete(url);
        throw err;
      });
    assetPromiseCache.set(url, pending);
  }

  return pending;
}

export class GlbCharacterController {
  public readonly root = new THREE.Group();
  public readonly rollPivot = new THREE.Group();
  public readonly modelPivot = new THREE.Group();
  public readonly jetpack: JetpackAssembly;
  public readonly headlampMesh: THREE.Mesh;
  public readonly shieldSphere: THREE.Mesh;
  public readonly portraitFocusY: number;

  private readonly assetUrl: string | undefined;
  private readonly clonedRoot: THREE.Group;
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<GlbAnimState, THREE.AnimationAction>();
  private readonly neckBone: THREE.Object3D | null = null;
  private readonly headBone: THREE.Object3D | null = null;
  private readonly neckPitchAxis = new THREE.Vector3(1, 0, 0);
  private readonly headPitchAxis = new THREE.Vector3(1, 0, 0);
  private readonly tmpPitchQ = new THREE.Quaternion();
  private flyHeadBlend = 0;
  private currentState: GlbAnimState | null = null;
  private currentAction: THREE.AnimationAction | null = null;
  private tapElapsed = 0;
  private disposed = false;

  constructor(asset: LoadedGlbAsset, options?: { withEffects?: boolean }) {
    const withEffects = options?.withEffects ?? true;
    this.assetUrl = asset.sourceUrl;
    retainGlbUrl(this.assetUrl);

    this.rollPivot.position.set(0, 0.85, 0);
    this.root.add(this.rollPivot);

    const cloned = SkeletonUtils.clone(asset.scene) as THREE.Group;
    this.clonedRoot = cloned;
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.userData.glbCachedAsset = true;
      }
    });

    // Normalize ground & scale by 90th-percentile crown height (1.67m, matching kivircik_riza)
    // so characters with tall antennae/hats match kivircik_riza's body size across Menu & Game
    cloned.updateMatrixWorld(true);
    let normScale: number;
    let normMinY: number;
    if (asset.normMetrics) {
      ({ normScale, minY: normMinY, portraitFocusY: this.portraitFocusY } = asset.normMetrics);
    } else {
      const box = new THREE.Box3().setFromObject(cloned);
      const size = box.getSize(new THREE.Vector3());
      normMinY = box.min.y;
      const sampleYs: number[] = [];
      const vTmp = new THREE.Vector3();
      cloned.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const posAttr = obj.geometry.attributes.position;
          if (!posAttr) return;
          const step = Math.max(1, Math.floor(posAttr.count / 2000));
          for (let i = 0; i < posAttr.count; i += step) {
            vTmp.fromBufferAttribute(posAttr, i).applyMatrix4(obj.matrixWorld);
            sampleYs.push(vTmp.y);
          }
        }
      });
      if (sampleYs.length >= 20) {
        sampleYs.sort((a, b) => a - b);
        const sMinY = sampleYs[0];
        const sP90Y = sampleYs[Math.min(sampleYs.length - 1, Math.floor(sampleYs.length * 0.9))];
        const crownSpan = sP90Y - sMinY;
        if (crownSpan > 0.1) {
          normMinY = sMinY;
          normScale = 1.67 / crownSpan;
        } else {
          normScale = 1.88 / (size.y > 0.1 ? size.y : 1.9);
        }
      } else {
        normScale = 1.88 / (size.y > 0.1 ? size.y : 1.9);
      }
      this.portraitFocusY = 1.49;
      asset.normMetrics = {
        normScale,
        minY: normMinY,
        portraitFocusY: this.portraitFocusY,
      };
    }

    cloned.scale.setScalar(normScale);
    cloned.position.set(0, -normMinY * normScale, 0);
    cloned.updateMatrixWorld(true);

    // Mixamo models face +Z; rotate modelPivot by PI so root rotation=0 runs toward -Z
    // and root rotation=PI (Menu) faces +Z toward the camera.
    this.modelPivot.position.set(0, -0.85, 0);
    this.modelPivot.rotation.y = Math.PI;
    this.modelPivot.add(cloned);
    this.rollPivot.add(this.modelPivot);
    this.root.updateMatrixWorld(true);

    this.mixer = new THREE.AnimationMixer(cloned);

    (Object.keys(asset.clips) as GlbAnimState[]).forEach((state) => {
      const clip = asset.clips[state];
      if (!clip) return;
      const action = this.mixer.clipAction(clip);
      if (
        state === 'jump' ||
        state === 'slide' ||
        state === 'dodge_left' ||
        state === 'dodge_right' ||
        state === 'fall_back' ||
        state === 'fall_face'
      ) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
      }
      this.actions.set(state, action);
    });

    // Find Mixamo bones for Jetpack & Headlamp attachments
    let spineBone: THREE.Object3D | null = null;
    let neckBone: THREE.Object3D | null = null;
    let headBone: THREE.Object3D | null = null;
    cloned.traverse((obj) => {
      if (!spineBone && /Spine2$/i.test(obj.name)) spineBone = obj;
      else if (!spineBone && /Spine1$/i.test(obj.name)) spineBone = obj;
      if (!neckBone && /Neck$/i.test(obj.name)) neckBone = obj;
      if (!headBone && /Head$/i.test(obj.name)) headBone = obj;
    });

    this.neckBone = neckBone;
    this.headBone = headBone;
    if (neckBone) {
      const nq = new THREE.Quaternion();
      (neckBone as THREE.Object3D).getWorldQuaternion(nq);
      this.neckPitchAxis.set(1, 0, 0).applyQuaternion(nq.invert()).normalize();
    }
    if (headBone) {
      const hq = new THREE.Quaternion();
      (headBone as THREE.Object3D).getWorldQuaternion(hq);
      this.headPitchAxis.set(1, 0, 0).applyQuaternion(hq.invert()).normalize();
    }

    let backOffsetZ: number;
    let jetpackScale: number;
    let headFrontOffsetZ: number;
    let headlampOffsetY: number;

    if (asset.attachmentMetrics) {
      ({ backOffsetZ, jetpackScale, headFrontOffsetZ, headlampOffsetY } =
        asset.attachmentMetrics);
    } else {
      const spineWorldPos = new THREE.Vector3(0, 1.2, 0);
      const headWorldPos = new THREE.Vector3(0, 1.4, 0);
      if (spineBone) (spineBone as THREE.Object3D).getWorldPosition(spineWorldPos);
      if (headBone) (headBone as THREE.Object3D).getWorldPosition(headWorldPos);

      // Measure actual upper-back & forehead mesh surfaces once per LoadedGlbAsset and cache
      let torsoBackZ = spineWorldPos.z + 0.12;
      let torsoMinX = -0.22;
      let torsoMaxX = 0.22;
      let headFrontZ = headWorldPos.z - 0.16;
      let headTopY = headWorldPos.y + 0.28;
      let foundTorsoVerts = false;
      let foundHeadVerts = false;

      const skinnedVert = new THREE.Vector3();
      cloned.traverse((obj) => {
        if (obj instanceof THREE.SkinnedMesh) {
          const posAttr = obj.geometry.attributes.position;
          if (!posAttr) return;
          const step = posAttr.count > 4000 ? 2 : 1;
          for (let i = 0; i < posAttr.count; i += step) {
            skinnedVert.fromBufferAttribute(posAttr, i);
            obj.applyBoneTransform(i, skinnedVert);
            skinnedVert.applyMatrix4(obj.matrixWorld);

            if (
              Math.abs(skinnedVert.y - spineWorldPos.y) <= 0.14 &&
              Math.abs(skinnedVert.x) <= 0.26
            ) {
              if (!foundTorsoVerts) {
                torsoBackZ = skinnedVert.z;
                torsoMinX = skinnedVert.x;
                torsoMaxX = skinnedVert.x;
                foundTorsoVerts = true;
              } else {
                if (skinnedVert.z > torsoBackZ) torsoBackZ = skinnedVert.z;
                if (skinnedVert.x < torsoMinX) torsoMinX = skinnedVert.x;
                if (skinnedVert.x > torsoMaxX) torsoMaxX = skinnedVert.x;
              }
            }

            if (skinnedVert.y >= headWorldPos.y && Math.abs(skinnedVert.x) <= 0.2) {
              if (!foundHeadVerts) {
                headFrontZ = skinnedVert.z;
                headTopY = skinnedVert.y;
                foundHeadVerts = true;
              } else {
                if (skinnedVert.z < headFrontZ) headFrontZ = skinnedVert.z;
                if (skinnedVert.y > headTopY) headTopY = skinnedVert.y;
              }
            }
          }
        }
      });

      const torsoWidth = foundTorsoVerts ? Math.max(0.32, torsoMaxX - torsoMinX) : 0.45;
      backOffsetZ = THREE.MathUtils.clamp(torsoBackZ - spineWorldPos.z, 0.08, 0.24);
      jetpackScale = THREE.MathUtils.clamp(torsoWidth * 1.88, 0.78, 0.96);
      headFrontOffsetZ = THREE.MathUtils.clamp(
        headWorldPos.z - headFrontZ,
        0.09,
        0.24,
      );
      headlampOffsetY = THREE.MathUtils.clamp(
        (headTopY - headWorldPos.y) * 0.56,
        0.11,
        0.20,
      );
      asset.attachmentMetrics = {
        backOffsetZ,
        jetpackScale,
        headFrontOffsetZ,
        headlampOffsetY,
      };
    }

    const attachAlignedToBone = (
      bone: THREE.Object3D,
      child: THREE.Object3D,
      offsetRootMeters: THREE.Vector3,
      eulerRootSpace: THREE.Euler,
      desiredWorldScale: number,
    ) => {
      const boneWorldQ = new THREE.Quaternion();
      const boneWorldScale = new THREE.Vector3();
      bone.getWorldQuaternion(boneWorldQ);
      bone.getWorldScale(boneWorldScale);
      const invBoneQ = boneWorldQ.clone().invert();
      const avgScale =
        (boneWorldScale.x + boneWorldScale.y + boneWorldScale.z) / 3 || normScale;

      child.position
        .copy(offsetRootMeters)
        .divideScalar(avgScale)
        .applyQuaternion(invBoneQ);
      child.quaternion
        .copy(invBoneQ)
        .multiply(new THREE.Quaternion().setFromEuler(eulerRootSpace));
      child.scale.setScalar(desiredWorldScale / avgScale);
      bone.add(child);
    };

    this.jetpack = createJetpackAssembly(withEffects);
    this.jetpack.group.visible = false;
    if (spineBone) {
      // In root space: +Z is the character's back, -Z is chest/front, -Y is nozzle down
      attachAlignedToBone(
        spineBone,
        this.jetpack.group,
        new THREE.Vector3(0, 0.02, backOffsetZ + 0.072 * jetpackScale),
        new THREE.Euler(0.06, 0, 0),
        jetpackScale,
      );
    } else {
      this.jetpack.group.position.set(0, 1.15, 0.24);
      this.jetpack.group.rotation.set(0.06, 0, 0);
      this.jetpack.group.scale.setScalar(jetpackScale);
      this.rollPivot.add(this.jetpack.group);
    }

    this.headlampMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.095, 0.11, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfacc15,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      }),
    );
    this.headlampMesh.visible = false;
    if (headBone) {
      // -Z in root space is the forehead facing forward along the track
      attachAlignedToBone(
        headBone,
        this.headlampMesh,
        new THREE.Vector3(0, headlampOffsetY, -(headFrontOffsetZ + 0.015)),
        new THREE.Euler(-Math.PI / 2, 0, 0),
        1.0,
      );
    } else {
      this.headlampMesh.rotation.x = -Math.PI / 2;
      this.headlampMesh.position.set(0, 0.87, -0.18);
      this.rollPivot.add(this.headlampMesh);
    }

    this.shieldSphere = new THREE.Mesh(
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
    this.shieldSphere.position.set(0, 1.05, 0);
    this.shieldSphere.visible = false;
    this.root.add(this.shieldSphere);

    this.setState('idle', 0);
  }

  public getState(): GlbAnimState | null {
    return this.currentState;
  }

  public setState(
    state: GlbAnimState,
    fadeDuration = 0.14,
    timeScale = 1,
    forceRestart = false,
  ): void {
    const nextAction = this.actions.get(state) ?? this.actions.get('run') ?? null;
    if (!nextAction) return;

    if (this.currentState === state && !forceRestart) {
      nextAction.timeScale = timeScale;
      return;
    }

    const prevAction = this.currentAction;
    this.currentState = state;
    this.currentAction = nextAction;
    if (state === 'tap') {
      this.tapElapsed = 0;
    }

    nextAction.enabled = true;
    if (state === 'slide') {
      const clipDur = nextAction.getClip().duration || 0.72;
      nextAction.timeScale = Math.max(1, clipDur / 0.72);
    } else {
      nextAction.timeScale = timeScale;
    }

    if (
      state === 'jump' ||
      state === 'slide' ||
      state === 'dodge_left' ||
      state === 'dodge_right' ||
      state === 'fall_back' ||
      state === 'fall_face' ||
      forceRestart
    ) {
      nextAction.reset();
    } else if (state === 'fly') {
      nextAction.reset();
      const dur = nextAction.getClip().duration;
      nextAction.time = dur * 0.26;
      nextAction.timeScale = 0;
    }

    if (prevAction && prevAction !== nextAction && fadeDuration > 0) {
      nextAction.play();
      prevAction.crossFadeTo(nextAction, fadeDuration, false);
    } else {
      if (prevAction && prevAction !== nextAction) {
        prevAction.stop();
      }
      nextAction.setEffectiveWeight(1);
      nextAction.play();
    }
  }

  public update(dt: number): void {
    if (this.currentState === 'tap') {
      this.tapElapsed += dt;
      if (this.tapElapsed >= 1.25) {
        this.setState('idle', 0.25, 1);
      }
    } else if (this.currentState === 'fly' && this.currentAction) {
      const dur = this.currentAction.getClip().duration || 1.1;
      // Subtle heroic hover breath inside the peak mid-air spread-arms window
      this.currentAction.time =
        dur * (0.26 + Math.sin(performance.now() * 0.0055) * 0.025);
    }
    this.mixer.update(dt);

    const targetFlyBlend = this.currentState === 'fly' ? 1 : 0;
    this.flyHeadBlend = THREE.MathUtils.damp(this.flyHeadBlend, targetFlyBlend, 12, dt);
    if (this.flyHeadBlend > 0.002) {
      if (this.neckBone) {
        this.tmpPitchQ.setFromAxisAngle(this.neckPitchAxis, 0.33 * this.flyHeadBlend);
        this.neckBone.quaternion.multiply(this.tmpPitchQ);
      }
      if (this.headBone) {
        this.tmpPitchQ.setFromAxisAngle(this.headPitchAxis, 0.65 * this.flyHeadBlend);
        this.headBone.quaternion.multiply(this.tmpPitchQ);
      }
    }
  }

  public markContextRestored(): void {
    const refreshedTextures = new Set<THREE.Texture>();
    this.root.traverse((obj) => {
      if (obj instanceof THREE.SkinnedMesh && obj.skeleton?.boneTexture) {
        obj.skeleton.boneTexture.needsUpdate = true;
      }
      if (obj instanceof THREE.Mesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          if (!mat) continue;
          const record = mat as unknown as Record<string, unknown>;
          for (const key of [
            'map',
            'normalMap',
            'roughnessMap',
            'metalnessMap',
            'emissiveMap',
            'aoMap',
            'alphaMap',
            'bumpMap',
          ]) {
            const tex = record[key];
            if (tex instanceof THREE.Texture && !refreshedTextures.has(tex)) {
              refreshedTextures.add(tex);
              tex.needsUpdate = true;
            }
          }
          mat.needsUpdate = true;
        }
      }
    });
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.clonedRoot);
    this.actions.clear();
    this.root.traverse((obj) => {
      if (obj instanceof THREE.SkinnedMesh) {
        obj.skeleton?.dispose();
      }
      if (obj instanceof THREE.Mesh) {
        if (obj.userData?.glbCachedAsset || obj.userData?.sharedAsset) return;
        if (!obj.userData?.sharedGeometry) {
          obj.geometry?.dispose();
        }
        if (!obj.userData?.sharedMaterial) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      }
    });
    releaseGlbUrl(this.assetUrl);
  }
}

export const CHASER_GLB_URL = '/models/saplakci_kadin.glb';

export type ChaserAnimState = 'idle' | 'run' | 'angry' | 'jump';

export interface LoadedChaserAsset {
  scene: THREE.Group;
  clips: Record<ChaserAnimState, THREE.AnimationClip | null>;
}

const chaserPromiseCache = new Map<string, Promise<LoadedChaserAsset>>();
const chaserSyncCache = new Map<string, LoadedChaserAsset>();

function buildChaserClipMap(
  animations: THREE.AnimationClip[],
): Record<ChaserAnimState, THREE.AnimationClip | null> {
  const idleRaw = findClipByCandidates(animations, [/^idle$/i, /standing/i]);
  const runRaw = findClipByCandidates(animations, [/^run$/i, /running/i, /walk/i]);
  const angryRaw = findClipByCandidates(animations, [
    /angry/i,
    /taunt/i,
    /roar/i,
    /^idle$/i,
  ]);
  const jumpRaw = findClipByCandidates(animations, [/jump/i]);

  const idleClip = idleRaw
    ? sanitizeMixamoClip(idleRaw, { name: 'chaser_idle', stripHorizontal: true })
    : null;
  const runClip = runRaw
    ? sanitizeMixamoClip(runRaw, { name: 'chaser_run', stripHorizontal: true })
    : idleClip;
  const angryClip = angryRaw
    ? sanitizeMixamoClip(angryRaw, { name: 'chaser_angry', stripHorizontal: true })
    : idleClip ?? runClip;
  const jumpClip = jumpRaw
    ? sanitizeMixamoClip(jumpRaw, {
        name: 'chaser_jump',
        stripHorizontal: true,
        clampYOffset: 0.85,
      })
    : runClip;

  return {
    idle: idleClip,
    run: runClip,
    angry: angryClip,
    jump: jumpClip,
  };
}

export function getCachedChaserGlb(): LoadedChaserAsset | null {
  return chaserSyncCache.get(CHASER_GLB_URL) ?? null;
}

export function preloadChaserGlb(): Promise<LoadedChaserAsset> {
  const cached = chaserSyncCache.get(CHASER_GLB_URL);
  if (cached) return Promise.resolve(cached);

  let pending = chaserPromiseCache.get(CHASER_GLB_URL);
  if (!pending) {
    pending = gltfLoader
      .loadAsync(CHASER_GLB_URL)
      .then((gltf: GLTF) => {
        THREE.Cache.remove(CHASER_GLB_URL);
        configureGlbScene(gltf.scene);
        const loaded: LoadedChaserAsset = {
          scene: gltf.scene,
          clips: buildChaserClipMap(gltf.animations),
        };
        chaserSyncCache.set(CHASER_GLB_URL, loaded);
        return loaded;
      })
      .catch((err) => {
        THREE.Cache.remove(CHASER_GLB_URL);
        chaserPromiseCache.delete(CHASER_GLB_URL);
        throw err;
      });
    chaserPromiseCache.set(CHASER_GLB_URL, pending);
  }
  return pending;
}

export class GlbChaserController {
  public readonly root = new THREE.Group();
  public readonly modelPivot = new THREE.Group();

  private readonly clonedRoot: THREE.Group;
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<ChaserAnimState, THREE.AnimationAction>();
  private currentState: ChaserAnimState | null = null;
  private currentAction: THREE.AnimationAction | null = null;

  private readonly spineBone: THREE.Object3D | null = null;
  private readonly rightArmBone: THREE.Object3D | null = null;
  private readonly rightForeArmBone: THREE.Object3D | null = null;

  private readonly spineYawAxis = new THREE.Vector3(0, 1, 0);
  private readonly spinePitchAxis = new THREE.Vector3(1, 0, 0);
  private readonly rightArmRestWorldQ = new THREE.Quaternion();
  private readonly rightArmRestDir = new THREE.Vector3(1, 0, 0);
  private readonly rightForeArmRestWorldQ = new THREE.Quaternion();
  private readonly rightForeArmRestDir = new THREE.Vector3(1, 0, 0);

  private readonly tmpVecA = new THREE.Vector3();
  private readonly tmpVecB = new THREE.Vector3();
  private readonly tmpArmDir = new THREE.Vector3();
  private readonly tmpForeDir = new THREE.Vector3();
  private readonly tmpWindArm = new THREE.Vector3(0.36, 0.94, 0.16);
  private readonly tmpWindFore = new THREE.Vector3(0.06, 0.96, -0.2);
  private readonly tmpStrikeArm = new THREE.Vector3();
  private readonly tmpStrikeFore = new THREE.Vector3();
  private readonly tmpQuatA = new THREE.Quaternion();
  private readonly tmpQuatB = new THREE.Quaternion();
  private readonly tmpQuatC = new THREE.Quaternion();

  private slapActive = false;
  private slapElapsed = 0;
  private slapAimX = -1;
  private disposed = false;

  constructor(asset: LoadedChaserAsset, targetHeight = 2.22) {
    const cloned = SkeletonUtils.clone(asset.scene) as THREE.Group;
    this.clonedRoot = cloned;
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.userData.glbCachedAsset = true;
      }
    });

    // Normalize ground & scale to imposing chaser height (2.22m vs 1.88m runner)
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const height = size.y > 0.1 ? size.y : 1.85;
    const normScale = targetHeight / height;
    cloned.scale.setScalar(normScale);
    cloned.position.set(0, -box.min.y * normScale, 0);
    cloned.updateMatrixWorld(true);

    // Face -Z (toward the runner ahead along the track)
    this.modelPivot.rotation.y = Math.PI;
    this.modelPivot.add(cloned);
    this.root.add(this.modelPivot);
    this.root.updateMatrixWorld(true);

    this.mixer = new THREE.AnimationMixer(cloned);
    (Object.keys(asset.clips) as ChaserAnimState[]).forEach((state) => {
      const clip = asset.clips[state];
      if (!clip) return;
      const action = this.mixer.clipAction(clip);
      if (state === 'jump') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
      }
      this.actions.set(state, action);
    });

    let spineBone: THREE.Object3D | null = null;
    let rightArmBone: THREE.Object3D | null = null;
    let rightForeArmBone: THREE.Object3D | null = null;
    cloned.traverse((obj) => {
      if (!spineBone && /Spine2$/i.test(obj.name)) spineBone = obj;
      else if (!spineBone && /Spine1$/i.test(obj.name)) spineBone = obj;
      if (!rightArmBone && /RightArm$/i.test(obj.name)) rightArmBone = obj;
      if (!rightForeArmBone && /RightForeArm$/i.test(obj.name)) rightForeArmBone = obj;
    });
    this.spineBone = spineBone;
    this.rightArmBone = rightArmBone;
    this.rightForeArmBone = rightForeArmBone;

    if (spineBone) {
      const sq = new THREE.Quaternion();
      (spineBone as THREE.Object3D).getWorldQuaternion(sq);
      const invSq = sq.invert();
      this.spineYawAxis.set(0, 1, 0).applyQuaternion(invSq).normalize();
      this.spinePitchAxis.set(1, 0, 0).applyQuaternion(invSq).normalize();
    }
    if (rightArmBone) {
      (rightArmBone as THREE.Object3D).getWorldQuaternion(this.rightArmRestWorldQ);
      this.rightArmRestDir
        .set(0, 1, 0)
        .applyQuaternion(this.rightArmRestWorldQ)
        .normalize();
    }
    if (rightForeArmBone) {
      (rightForeArmBone as THREE.Object3D).getWorldQuaternion(
        this.rightForeArmRestWorldQ,
      );
      this.rightForeArmRestDir
        .set(0, 1, 0)
        .applyQuaternion(this.rightForeArmRestWorldQ)
        .normalize();
    }

    this.setState('run', 0, 1);
  }

  public getState(): ChaserAnimState | null {
    return this.currentState;
  }

  public setState(
    state: ChaserAnimState,
    fadeDuration = 0.14,
    timeScale = 1,
    forceRestart = false,
  ): void {
    const nextAction = this.actions.get(state) ?? this.actions.get('run') ?? null;
    if (!nextAction) return;

    if (this.currentState === state && !forceRestart) {
      nextAction.timeScale = timeScale;
      return;
    }

    const prevAction = this.currentAction;
    this.currentState = state;
    this.currentAction = nextAction;
    nextAction.enabled = true;
    nextAction.timeScale = timeScale;

    if (state === 'jump' || forceRestart) {
      nextAction.reset();
    }

    if (prevAction && prevAction !== nextAction && fadeDuration > 0) {
      nextAction.play();
      prevAction.crossFadeTo(nextAction, fadeDuration, false);
    } else {
      if (prevAction && prevAction !== nextAction) {
        prevAction.stop();
      }
      nextAction.setEffectiveWeight(1);
      nextAction.play();
    }
  }

  public triggerSlap(aimX = -1): void {
    this.slapActive = true;
    this.slapElapsed = 0;
    this.slapAimX = aimX >= 0 ? 1 : -1;
    this.setState('angry', 0.16, 1.08, true);
  }

  public resetSlap(): void {
    this.slapActive = false;
    this.slapElapsed = 0;
  }

  private applyRootSpaceArmAim(
    bone: THREE.Object3D,
    restWorldQ: THREE.Quaternion,
    restDir: THREE.Vector3,
    desiredDirRoot: THREE.Vector3,
    weight: number,
  ): void {
    if (!bone.parent || weight <= 0.002) return;
    // Convert root-space direction into world space using this.root.quaternion
    this.tmpVecA.copy(desiredDirRoot).normalize().applyQuaternion(this.root.quaternion);
    this.tmpQuatA.setFromUnitVectors(
      this.tmpVecB.copy(restDir).applyQuaternion(this.root.quaternion).normalize(),
      this.tmpVecA,
    );
    this.tmpQuatB.copy(this.root.quaternion).multiply(restWorldQ);
    this.tmpQuatB.premultiply(this.tmpQuatA);
    bone.parent.getWorldQuaternion(this.tmpQuatC);
    this.tmpQuatC.invert().multiply(this.tmpQuatB);
    bone.quaternion.slerp(this.tmpQuatC, THREE.MathUtils.clamp(weight, 0, 1));
  }

  public update(dt: number): void {
    this.mixer.update(dt);

    if (!this.slapActive) return;

    this.slapElapsed += dt;
    const totalDur = 0.96;
    if (this.slapElapsed >= totalDur) {
      this.slapActive = false;
      return;
    }

    const t = this.slapElapsed;
    const windEnd = 0.34;
    const holdEnd = 0.43;
    const strikeEnd = 0.55;
    const smooth = (x: number) => {
      const c = THREE.MathUtils.clamp(x, 0, 1);
      return c * c * (3 - 2 * c);
    };

    let slapWeight = 1;
    let spineYaw = 0;
    let spinePitch = 0;
    const armDir = this.tmpArmDir;
    const foreDir = this.tmpForeDir;
    const windArm = this.tmpWindArm;
    const windFore = this.tmpWindFore;
    const strikeArm = this.tmpStrikeArm.set(this.slapAimX * 0.32, -0.14, -0.96);
    const strikeFore = this.tmpStrikeFore.set(this.slapAimX * 0.42, -0.3, -0.92);

    if (t < windEnd) {
      const p = smooth(t / windEnd);
      slapWeight = p;
      armDir.set(0.45, -0.55, -0.25).lerp(windArm, p);
      foreDir.set(0.35, -0.5, -0.35).lerp(windFore, p);
      spineYaw = -0.44 * p;
      spinePitch = -0.2 * p;
    } else if (t < holdEnd) {
      slapWeight = 1;
      armDir.copy(windArm);
      foreDir.copy(windFore);
      spineYaw = -0.44;
      spinePitch = -0.2;
    } else if (t < strikeEnd) {
      const p = smooth((t - holdEnd) / (strikeEnd - holdEnd));
      slapWeight = 1;
      armDir.copy(windArm).lerp(strikeArm, p);
      foreDir.copy(windFore).lerp(strikeFore, p);
      spineYaw = THREE.MathUtils.lerp(-0.44, 0.44 * -this.slapAimX, p);
      spinePitch = THREE.MathUtils.lerp(-0.2, 0.36, p);
    } else {
      const p = smooth((t - strikeEnd) / (totalDur - strikeEnd));
      slapWeight = 1 - p;
      armDir.copy(strikeArm);
      foreDir.copy(strikeFore);
      spineYaw = THREE.MathUtils.lerp(0.44 * -this.slapAimX, 0, p);
      spinePitch = THREE.MathUtils.lerp(0.36, 0, p);
    }

    if (this.spineBone) {
      this.tmpQuatA.setFromAxisAngle(this.spineYawAxis, spineYaw);
      this.spineBone.quaternion.multiply(this.tmpQuatA);
      this.tmpQuatA.setFromAxisAngle(this.spinePitchAxis, spinePitch);
      this.spineBone.quaternion.multiply(this.tmpQuatA);
    }

    this.root.updateMatrixWorld(true);
    if (this.rightArmBone) {
      this.applyRootSpaceArmAim(
        this.rightArmBone,
        this.rightArmRestWorldQ,
        this.rightArmRestDir,
        armDir,
        slapWeight,
      );
      this.rightArmBone.updateMatrixWorld(true);
    }
    if (this.rightForeArmBone) {
      this.applyRootSpaceArmAim(
        this.rightForeArmBone,
        this.rightForeArmRestWorldQ,
        this.rightForeArmRestDir,
        foreDir,
        slapWeight,
      );
    }
  }

  public markContextRestored(): void {
    const refreshedTextures = new Set<THREE.Texture>();
    this.root.traverse((obj) => {
      if (obj instanceof THREE.SkinnedMesh && obj.skeleton?.boneTexture) {
        obj.skeleton.boneTexture.needsUpdate = true;
      }
      if (obj instanceof THREE.Mesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          if (!mat) continue;
          const record = mat as unknown as Record<string, unknown>;
          for (const key of [
            'map',
            'normalMap',
            'roughnessMap',
            'metalnessMap',
            'emissiveMap',
            'aoMap',
            'alphaMap',
            'bumpMap',
          ]) {
            const tex = record[key];
            if (tex instanceof THREE.Texture && !refreshedTextures.has(tex)) {
              refreshedTextures.add(tex);
              tex.needsUpdate = true;
            }
          }
          mat.needsUpdate = true;
        }
      }
    });
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.clonedRoot);
    this.actions.clear();
    this.root.traverse((obj) => {
      if (obj instanceof THREE.SkinnedMesh) {
        obj.skeleton?.dispose();
      }
      if (obj instanceof THREE.Mesh) {
        if (obj.userData?.glbCachedAsset || obj.userData?.sharedAsset) return;
        if (!obj.userData?.sharedGeometry) {
          obj.geometry?.dispose();
        }
        if (!obj.userData?.sharedMaterial) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      }
    });
  }
}

