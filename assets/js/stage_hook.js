import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { getProject, types } from "@theatre/core";

let studioReady;
let studioVisible = false;

// The stage hook is in the shared bundle. Evaluate Studio only when its
// stage mounts, and initialize it immediately after importing it.
function loadStudio() {
  if (!studioReady) {
    studioReady = import("@theatre/studio").then(({ default: studio }) => {
      studio.initialize();
      studio.ui.hide();
      return studio;
    }).catch(error => {
      studioReady = null;
      throw error;
    });
  }
  return studioReady;
}

// ---------------------------------------------------------------------------
// Kinematic Action System
//
// Bones follow the Mixamo naming convention (mixamorig:BoneName).
// Each action is a function that receives (bones, t, params) where
//   bones  = map of short name → THREE.Bone
//   t      = normalized time 0..1 within the action's window
//   params = action-specific parameters (intensity, side, etc.)
//
// Actions store bone rotations as *offsets* from the base animation clip.
// They are applied additively after the mixer updates each frame.
// ---------------------------------------------------------------------------

// Mixamo bone short names → full names
const BONE_MAP = {
  hips:           "mixamorig:Hips",
  spine:          "mixamorig:Spine",
  spine1:         "mixamorig:Spine1",
  spine2:         "mixamorig:Spine2",
  neck:           "mixamorig:Neck",
  head:           "mixamorig:Head",
  leftShoulder:   "mixamorig:LeftShoulder",
  leftArm:        "mixamorig:LeftArm",
  leftForeArm:    "mixamorig:LeftForeArm",
  leftHand:       "mixamorig:LeftHand",
  rightShoulder:  "mixamorig:RightShoulder",
  rightArm:       "mixamorig:RightArm",
  rightForeArm:   "mixamorig:RightForeArm",
  rightHand:      "mixamorig:RightHand",
  leftUpLeg:      "mixamorig:LeftUpLeg",
  leftLeg:        "mixamorig:LeftLeg",
  leftFoot:       "mixamorig:LeftFoot",
  rightUpLeg:     "mixamorig:RightUpLeg",
  rightLeg:       "mixamorig:RightLeg",
  rightFoot:      "mixamorig:RightFoot",
  leftEye:        "mixamorig:LeftEye",
  rightEye:       "mixamorig:RightEye",
};

// Easing helpers
function easeInOut(t) {
  return t * t * (3 - 2 * t);
}

function easeIn(t) {
  return t * t;
}

function easeOut(t) {
  return t * (2 - t);
}

// Blend an euler offset onto a bone, scaled by intensity and blend factor
function addRotation(bone, x, y, z, blend) {
  if (!bone) return;
  bone.rotation.x += x * blend;
  bone.rotation.y += y * blend;
  bone.rotation.z += z * blend;
}

// ---------------------------------------------------------------------------
// Action library
//
// Each action: (bones, t, params) → void
//   t is 0..1 over the action's time window
//   params.intensity is 0..1 (default 1)
//   Actions should use addRotation() so they layer on the base clip.
// ---------------------------------------------------------------------------
const ACTIONS = {
  // Wave: raise one arm and oscillate the forearm
  wave(bones, t, params = {}) {
    const intensity = params.intensity ?? 1.0;
    const side = params.side ?? "right";
    const cycles = params.cycles ?? 3;

    const arm = side === "right" ? "rightArm" : "leftArm";
    const foreArm = side === "right" ? "rightForeArm" : "leftForeArm";
    const hand = side === "right" ? "rightHand" : "leftHand";
    const sign = side === "right" ? 1 : -1;

    // Envelope: ease in first 15%, sustain, ease out last 15%
    let envelope = 1;
    if (t < 0.15) envelope = easeIn(t / 0.15);
    else if (t > 0.85) envelope = easeOut((1 - t) / 0.15);
    const blend = intensity * envelope;

    // Raise upper arm out and up
    addRotation(bones[arm], -2.2, 0, -0.8 * sign, blend);
    // Oscillate forearm
    const waveAngle = Math.sin(t * cycles * Math.PI * 2) * 0.4;
    addRotation(bones[foreArm], -0.3, waveAngle, 0, blend);
    // Slight hand tilt
    addRotation(bones[hand], 0, 0, waveAngle * 0.3, blend);
  },

  // Nod: tilt head forward and back
  nod(bones, t, params = {}) {
    const intensity = params.intensity ?? 0.6;
    const cycles = params.cycles ?? 2;
    let envelope = 1;
    if (t < 0.1) envelope = easeIn(t / 0.1);
    else if (t > 0.9) envelope = easeOut((1 - t) / 0.1);
    const blend = intensity * envelope;

    const angle = Math.sin(t * cycles * Math.PI * 2) * 0.25;
    addRotation(bones.head, angle, 0, 0, blend);
    addRotation(bones.neck, angle * 0.3, 0, 0, blend);
  },

  // Shake head side to side
  headShake(bones, t, params = {}) {
    const intensity = params.intensity ?? 0.6;
    const cycles = params.cycles ?? 2;
    let envelope = 1;
    if (t < 0.1) envelope = easeIn(t / 0.1);
    else if (t > 0.9) envelope = easeOut((1 - t) / 0.1);
    const blend = intensity * envelope;

    const angle = Math.sin(t * cycles * Math.PI * 2) * 0.3;
    addRotation(bones.head, 0, angle, 0, blend);
  },

  // Look in a direction (turn head + slight neck)
  lookAround(bones, t, params = {}) {
    const intensity = params.intensity ?? 1.0;
    let envelope = 1;
    if (t < 0.1) envelope = easeIn(t / 0.1);
    else if (t > 0.9) envelope = easeOut((1 - t) / 0.1);
    const blend = intensity * envelope;

    const yaw = Math.sin(t * Math.PI * 2) * 0.5;
    const pitch = Math.sin(t * Math.PI * 1.3) * 0.15;
    addRotation(bones.head, pitch, yaw, 0, blend);
    addRotation(bones.neck, pitch * 0.3, yaw * 0.4, 0, blend);
  },

  // Point with one arm
  point(bones, t, params = {}) {
    const intensity = params.intensity ?? 1.0;
    const side = params.side ?? "right";
    const arm = side === "right" ? "rightArm" : "leftArm";
    const foreArm = side === "right" ? "rightForeArm" : "leftForeArm";
    const hand = side === "right" ? "rightHand" : "leftHand";
    const sign = side === "right" ? 1 : -1;

    let envelope = 1;
    if (t < 0.2) envelope = easeIn(t / 0.2);
    else if (t > 0.8) envelope = easeOut((1 - t) / 0.2);
    const blend = intensity * envelope;

    addRotation(bones[arm], -1.5, 0, -0.5 * sign, blend);
    addRotation(bones[foreArm], -0.3, 0, 0, blend);
    addRotation(bones[hand], -0.1, 0, 0, blend);
  },

  // Raise both arms (celebration / stretch)
  raiseArms(bones, t, params = {}) {
    const intensity = params.intensity ?? 1.0;
    let envelope = 1;
    if (t < 0.2) envelope = easeIn(t / 0.2);
    else if (t > 0.8) envelope = easeOut((1 - t) / 0.2);
    const blend = intensity * envelope;

    addRotation(bones.leftArm, -2.8, 0, 0.3, blend);
    addRotation(bones.rightArm, -2.8, 0, -0.3, blend);
    addRotation(bones.leftForeArm, 0, 0, 0.2, blend);
    addRotation(bones.rightForeArm, 0, 0, -0.2, blend);
  },

  // Lean torso (curiosity, looking at something)
  lean(bones, t, params = {}) {
    const intensity = params.intensity ?? 0.5;
    const direction = params.direction ?? "forward";
    let envelope = 1;
    if (t < 0.15) envelope = easeIn(t / 0.15);
    else if (t > 0.85) envelope = easeOut((1 - t) / 0.15);
    const blend = intensity * envelope;

    const angle = 0.2;
    if (direction === "forward") {
      addRotation(bones.spine1, angle, 0, 0, blend);
      addRotation(bones.spine2, angle * 0.5, 0, 0, blend);
    } else if (direction === "left") {
      addRotation(bones.spine1, 0, 0, angle, blend);
    } else if (direction === "right") {
      addRotation(bones.spine1, 0, 0, -angle, blend);
    } else if (direction === "back") {
      addRotation(bones.spine1, -angle, 0, 0, blend);
    }
  },

  // Hands on hips
  handsOnHips(bones, t, params = {}) {
    const intensity = params.intensity ?? 1.0;
    let envelope = 1;
    if (t < 0.15) envelope = easeIn(t / 0.15);
    else if (t > 0.85) envelope = easeOut((1 - t) / 0.15);
    const blend = intensity * envelope;

    addRotation(bones.leftArm, 0.5, 0, 0.8, blend);
    addRotation(bones.leftForeArm, 0, 1.2, 0, blend);
    addRotation(bones.rightArm, 0.5, 0, -0.8, blend);
    addRotation(bones.rightForeArm, 0, -1.2, 0, blend);
  },

  // Crouch / bend knees
  crouch(bones, t, params = {}) {
    const intensity = params.intensity ?? 0.5;
    let envelope = 1;
    if (t < 0.2) envelope = easeIn(t / 0.2);
    else if (t > 0.8) envelope = easeOut((1 - t) / 0.2);
    const blend = intensity * envelope;

    addRotation(bones.leftUpLeg, 0.4, 0, 0, blend);
    addRotation(bones.rightUpLeg, 0.4, 0, 0, blend);
    addRotation(bones.leftLeg, -0.5, 0, 0, blend);
    addRotation(bones.rightLeg, -0.5, 0, 0, blend);
    addRotation(bones.spine, -0.15, 0, 0, blend);
  },
};

// ---------------------------------------------------------------------------
// Step animation definitions
// Each step: base clip, position from/to, facing, and a list of
// overlaid kinematic actions with time windows.
// ---------------------------------------------------------------------------
const STEP_ANIMS = [
  {
    // Step 1: Arrive — walk in from the right
    clip: "walk",
    from: { x: 18, z: 2 },
    to: { x: 8, z: 1 },
    faceAngle: Math.PI,
    actions: [],
  },
  {
    // Step 2: Enter building — walk toward the door, wave on arrival
    clip: "walk",
    from: { x: 8, z: 1 },
    to: { x: 1, z: -2 },
    faceAngle: Math.PI * 0.75,
    actions: [
      { name: "wave", start: 0.6, end: 1.0, params: { side: "right", cycles: 3, intensity: 0.9 } },
    ],
  },
  {
    // Step 3: Approach desk — walk inside, look around when arriving
    clip: "walk",
    from: { x: 1, z: -2 },
    to: { x: -3, z: -4 },
    faceAngle: Math.PI * 0.6,
    endClip: "idle",
    endClipFraction: 0.3,
    actions: [
      { name: "lookAround", start: 0.5, end: 1.0, params: { intensity: 0.8 } },
      { name: "lean", start: 0.7, end: 1.0, params: { direction: "forward", intensity: 0.4 } },
    ],
  },
  {
    // Step 4: Sit down — idle, nod to greet
    clip: "idle",
    from: { x: -3, z: -4 },
    to: { x: -3, z: -4 },
    faceAngle: Math.PI * 0.5,
    actions: [
      { name: "nod", start: 0.2, end: 0.6, params: { cycles: 2, intensity: 0.7 } },
      { name: "handsOnHips", start: 0.0, end: 1.0, params: { intensity: 0.5 } },
    ],
  },
];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const StageCanvas = {
  mounted() {
    this.isDestroyed = false;
    this.model = null;
    this.mixer = null;
    this.actions = {};
    this.currentAction = null;
    this.clock = new THREE.Clock();
    this.bones = {}; // short name → THREE.Bone

    requestAnimationFrame(() => {
      this.initScene();
      this.loadCharacter();
      this.initTheatre().catch(error => {
        console.error("Theatre project could not be initialized.", error);
      });
      this.animate();
    });

    this.handleEvent("seek_to_step", ({ step_id }) => {
      this.seekToStep(step_id);
    });

    this.handleEvent("play_sequence", () => {
      this.isPlaying = true;
      this.lastTimestamp = performance.now() / 1000;
    });

    this.handleEvent("pause_sequence", () => {
      this.isPlaying = false;
    });

    this.handleEvent("toggle_studio", () => {
      this.toggleStudio();
    });
  },

  initScene() {
    const width = this.el.clientWidth || 800;
    const height = this.el.clientHeight || 600;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 40, 120);

    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500);
    this.camera.position.set(10, 6, 12);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.el.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(2, 1, -1);

    // Lighting
    const hemi = new THREE.HemisphereLight(0xbbbbff, 0x444466, 1.0);
    hemi.position.set(0, 20, 0);
    this.scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(10, 15, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    this.scene.add(dirLight);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({
        color: 0x2a2a3e,
        roughness: 0.9,
        metalness: 0.1,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(100, 50, 0x3a3a5e, 0x2a2a4e);
    grid.position.y = 0.01;
    this.scene.add(grid);

    // Building (translucent)
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(10, 4, 8),
      new THREE.MeshStandardMaterial({
        color: 0x3a3a5e,
        roughness: 0.8,
        metalness: 0.1,
        transparent: true,
        opacity: 0.25,
      }),
    );
    building.position.set(-2, 2, -4);
    building.receiveShadow = true;
    this.scene.add(building);

    // Desk
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.7 }),
    );
    desk.position.set(-3, 0.4, -4.8);
    desk.castShadow = true;
    this.scene.add(desk);

    // Chair
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.08, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x555577 }),
    );
    seat.position.set(-3, 0.5, -3.8);
    this.scene.add(seat);

    // Resize
    this._onResize = () => {
      const w = this.el.clientWidth || 800;
      const h = this.el.clientHeight || 600;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener("resize", this._onResize);

    // Playback state
    this.sequenceTime = 0;
    this.isPlaying = false;
    this.lastTimestamp = null;
    this.stepsData = JSON.parse(this.el.dataset.steps || "[]");
    this.prevStepIndex = -1;
  },

  loadCharacter() {
    const loader = new GLTFLoader();

    loader.load("/models/Xbot.glb", (gltf) => {
      this.model = gltf.scene;
      this.model.scale.setScalar(1);
      this.model.position.set(18, 0, 2);
      this.scene.add(this.model);

      // Enable shadows
      this.model.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      // Build bone lookup: short name → bone reference
      this.bones = {};
      for (const [shortName, fullName] of Object.entries(BONE_MAP)) {
        const bone = this.model.getObjectByName(fullName);
        if (bone) {
          this.bones[shortName] = bone;
        }
      }
      console.log("Mapped bones:", Object.keys(this.bones).join(", "));

      // Skeleton helper (hidden by default, toggle via Studio)
      this.skeletonHelper = new THREE.SkeletonHelper(this.model);
      this.skeletonHelper.visible = false;
      this.scene.add(this.skeletonHelper);

      // Animation mixer
      this.mixer = new THREE.AnimationMixer(this.model);

      // Store animation clips by name
      for (const clip of gltf.animations) {
        const action = this.mixer.clipAction(clip);
        this.clipActions[clip.name] = action;

        if (clip.name === "idle") {
          action.setEffectiveWeight(1);
          action.play();
          this.currentClipAction = action;
        } else {
          action.setEffectiveWeight(0);
          action.play();
        }
      }

      console.log(
        "Loaded Xbot clips:",
        Object.keys(this.clipActions).join(", "),
      );

      this.updateCharacter(this.sequenceTime);
    });

    // Separate from hook.actions (LiveView events) — these are AnimationActions
    this.clipActions = {};
    this.currentClipAction = null;
  },

  crossFadeTo(clipName, duration = 0.35) {
    const nextAction = this.clipActions[clipName];
    if (!nextAction || nextAction === this.currentClipAction) return;

    if (this.currentClipAction) {
      this.currentClipAction.fadeOut(duration);
    }

    nextAction.reset().setEffectiveWeight(1).fadeIn(duration).play();
    this.currentClipAction = nextAction;
  },

  async initTheatre() {
    // Theatre requires Studio when creating a project without saved state.
    await loadStudio();
    if (this.isDestroyed) return;
    this.project = getProject("Stage Scene");
    this.sheet = this.project.sheet("Main");

    this.theatreObj = this.sheet.object("Character", {
      x: types.number(18, { range: [-30, 30] }),
      z: types.number(2, { range: [-30, 30] }),
      rotationY: types.number(0, { range: [-Math.PI, Math.PI] }),
    });
  },

  seekToStep(stepId) {
    const step = this.stepsData.find((s) => s.id === stepId);
    if (!step) return;
    this.sequenceTime = step.time;
    this.prevStepIndex = -1;
    this.updateCharacter(this.sequenceTime);
  },

  // -----------------------------------------------------------------------
  // Core update: position, base clip crossfade, then kinematic overlays
  // -----------------------------------------------------------------------
  updateCharacter(time) {
    if (!this.model) return;

    const steps = this.stepsData;
    if (steps.length === 0) return;

    // Find current step
    let stepIndex = 0;
    for (let i = 0; i < steps.length; i++) {
      if (time >= steps[i].time) stepIndex = i;
    }

    const currentStep = steps[stepIndex];
    const anim = STEP_ANIMS[Math.min(stepIndex, STEP_ANIMS.length - 1)];
    const elapsed = time - currentStep.time;
    let t =
      currentStep.duration > 0
        ? Math.min(1, elapsed / currentStep.duration)
        : 1;

    const tSmooth = easeInOut(t);

    // Position interpolation
    this.model.position.x =
      anim.from.x + (anim.to.x - anim.from.x) * tSmooth;
    this.model.position.z =
      anim.from.z + (anim.to.z - anim.from.z) * tSmooth;

    // Facing
    this.model.rotation.y = anim.faceAngle;

    // Base clip crossfade
    let targetClip = anim.clip;
    if (anim.endClip && anim.endClipFraction && t > 1 - anim.endClipFraction) {
      targetClip = anim.endClip;
    }

    if (stepIndex !== this.prevStepIndex) {
      this.crossFadeTo(targetClip);
      this.prevStepIndex = stepIndex;
      this._lastClip = targetClip;
    } else if (targetClip !== this._lastClip) {
      this.crossFadeTo(targetClip);
      this._lastClip = targetClip;
    }

    // Store step-local t for kinematic overlay (applied after mixer.update)
    this._currentStepT = t;
    this._currentStepAnim = anim;
    this._globalTime = time;
  },

  // Apply kinematic actions on top of the base animation clip
  applyKinematicOverlays() {
    const anim = this._currentStepAnim;
    if (!anim || !anim.actions || anim.actions.length === 0) return;
    if (Object.keys(this.bones).length === 0) return;

    const t = this._currentStepT;

    for (const actionDef of anim.actions) {
      const actionFn = ACTIONS[actionDef.name];
      if (!actionFn) continue;

      // Is the current step-local t within this action's window?
      if (t < actionDef.start || t > actionDef.end) continue;

      // Normalize t within the action window
      const actionT =
        (t - actionDef.start) / (actionDef.end - actionDef.start);

      actionFn(this.bones, actionT, actionDef.params || {});
    }
  },

  async toggleStudio() {
    if (this.studioLoading) return;
    this.studioLoading = true;
    try {
      const studio = await loadStudio();
      if (this.isDestroyed) return;
      if (studioVisible) {
        studio.ui.hide();
      } else {
        studio.ui.restore();
      }
      studioVisible = !studioVisible;
    } catch (error) {
      console.error("Theatre Studio could not be loaded.", error);
    } finally {
      this.studioLoading = false;
    }
  },

  animate() {
    if (this.isDestroyed) return;
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const now = performance.now() / 1000;

    // Advance sequence time when playing
    if (this.isPlaying && this.lastTimestamp) {
      const dt = now - this.lastTimestamp;
      this.sequenceTime += dt;
      this.updateCharacter(this.sequenceTime);

      const steps = this.stepsData;
      const lastStep = steps[steps.length - 1];
      if (lastStep && this.sequenceTime >= lastStep.time + lastStep.duration) {
        this.isPlaying = false;
        this.pushEvent("pause", {});
      }
    }
    this.lastTimestamp = now;

    // 1. Tick the mixer (applies base clip skeletal animation)
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // 2. Layer kinematic actions on top of the base pose
    this.applyKinematicOverlays();

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  },

  destroyed() {
    this.isDestroyed = true;
    window.removeEventListener("resize", this._onResize);
    if (this.controls) this.controls.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement?.parentNode) {
        this.renderer.domElement.parentNode.removeChild(
          this.renderer.domElement,
        );
      }
    }
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material));
        }
      });
      this.scene.clear();
    }
  },
};
