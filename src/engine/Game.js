import { DialogueSystem } from "./DialogueSystem.js";
import { InventorySystem } from "./InventorySystem.js";
import { Localization } from "./Localization.js";
import { eastWestFallbackFacing, facingFromDelta, motionMultiplierAtFrame, MovementSystem } from "./MovementSystem.js";
import { QuestSystem } from "./QuestSystem.js";
import { Renderer } from "./Renderer.js";
import { SaveSystem } from "./SaveSystem.js";
import { SceneEditor } from "./SceneEditor.js";
import { AnimationPlayer } from "./AnimationPlayer.js";
import { AssetLoader } from "./AssetLoader.js";
import { characterHeight } from "./CharacterRenderMath.js";
import { DEFAULT_SAVE, LANGUAGES, VERBS } from "./ids.js";
import { findTargetAt, findWalkPath, isWalkable, nearestReachableWalkablePoint, nearestWalkablePoint, walkPathDistance } from "./SceneGeometry.js";
import { distance } from "./geometry.js";
import { strings } from "../content/localization/index.js";
import { chapter1 } from "../content/chapter1/index.js";
import { characterDefinitions } from "../content/art/characters.js";
import { assetManifest } from "../content/art/assetManifest.js";
import { externalAnimationV1 } from "../content/art/externalAnimationV1.generated.js";

const verbs = [VERBS.LOOK, VERBS.TALK, VERBS.USE, VERBS.TAKE];
const CHARACTER_DISTANCE_SPEED_MULTIPLIER = 1.5625;
const IDLE_VARIANT_DELAY_MIN = 1;
const IDLE_VARIANT_DELAY_MAX = 3;
const IDLE_VARIANT_COMBO_PROBABILITY = 0.35;
const IDLE_VARIANT_FOLLOWUP_IDLE5_PROBABILITY = 0.7;
const TARGET_INTERACTION_DISTANCE = 100;
const TARGET_APPROACH_FEET_CANCEL_DISTANCE = 80;
const TARGET_HAND_TO_FEET_X = 90;
const TARGET_HAND_TO_FEET_Y = 155;
const TARGET_REACH_ORIGIN_HEIGHT_RATIO = 0.58;
const TARGET_REACH_ORIGIN_SIDE_RATIO = 0.14;
export const SHORT_WALK_PATH_DISTANCE = 400;
const TALK_SINGLE_WORD_MAX_CHARS = 18;
const TALK_LONG_SENTENCE_MIN_CHARS = 72;
const SPEECH_BUBBLE_MAX_WIDTH_PX = 350;
const SPEECH_BUBBLE_VIEWPORT_MARGIN_X_PX = 20;
const SPEECH_BUBBLE_MAX_HEIGHT_PX = 200;
const SPEECH_BUBBLE_MAX_HEIGHT_VIEWPORT_RATIO = 0.6;
const SPEECH_BUBBLE_WEST_OFFSET_X_FULL_SIZE = 40;
const SPEECH_BUBBLE_WEST_OFFSET_Y_FULL_SIZE = -75;
const SPEECH_BUBBLE_WEST_TAIL_END_FROM_RIGHT_PX = 72;
const SPEECH_BUBBLE_TAIL_END_FROM_BOTTOM_PX = 26;
const SPEECH_BUBBLE_FADE_SECONDS = 0.3;
const SPEECH_BUBBLE_MIN_VISIBLE_SECONDS = 1.4;
const SPEECH_BUBBLE_MAX_VISIBLE_SECONDS = 6;
const SPEECH_BUBBLE_CHARS_PER_SECOND = 18;

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;
    this.saveSystem = new SaveSystem();
    this.state = this.saveSystem.load();
    this.localization = new Localization(strings, this.state.language);
    this.content = buildContentIndex(chapter1);
    this.debugSceneGeometry = this.readDebugGeometrySetting();
    this.animLab = this.readBooleanParam("animLab");
    this.simpleAnimTest = this.readBooleanParam("simpleAnimTest");
    this.editMode = this.readBooleanParam("edit");
    this.debugAnimation = this.readBooleanParam("debugAnimation");
    this.characterVariant = this.readCharacterVariant();
    this.characterDefinitions = characterDefinitions;
    this.assets = new AssetLoader(assetManifest);
    this.devHome = this.shouldShowDevHome();
    this.walkSpeedMultiplier = this.readNumberParam("walkSpeed", 1);
    this.selectedVerb = VERBS.LOOK;
    this.message = this.t("ui.hint");
    this.speechBubble = null;
    this.pendingSpeechBubble = null;
    this.speechBubbleSequence = 0;
    this.currentScene = this.resolveInitialScene();
    this.player = {
      id: "npc.bai_mitko",
      position: { ...this.currentScene.playerStart },
      target: null,
      walkPath: [],
      shortWalk: false,
      pendingInteraction: null,
      pendingFacingPoint: null,
      interactionDebug: null,
      speed: this.sceneMovementSpeed(this.currentScene),
      animation: "idle",
      facing: this.characterDefinitions["npc.bai_mitko"].render.defaultFacing,
      verticalDirectionBias: this.characterDefinitions["npc.bai_mitko"].render.verticalDirectionBias,
      animationTime: 0,
      facingDebug: null,
      walkMotionMultipliersByFacing: this.usesExternalCharacterAnimation() ? this.defaultWalkMotionMultipliersByFacing() : {},
      walkMovementStartFrameByFacing: this.defaultWalkMovementStartFrameByFacing(),
      animationFpsByFacing: this.usesExternalCharacterAnimation() ? this.defaultAnimationFpsByFacing() : {},
      walkPartsByFacing: this.usesExternalCharacterAnimation() ? this.defaultWalkPartsByFacing() : {},
      walkPart: null,
      pendingStop: false,
      stopExitFrame: 0,
      canExitToStop: false,
      movementStopping: false,
      stopAnimationStarted: false,
      stopAnimationFinished: false,
      idleVariant: null,
      idleVariantQueue: [],
      idleHoldFrame: null,
      idleVariantTimer: this.randomIdleVariantDelay(),
      actionAnimation: null,
      actionSequence: null,
      speechAnimation: null,
      speaking: false,
      animator: new AnimationPlayer(this.characterDefinitions["npc.bai_mitko"])
    };
    this.simpleAnim = this.createSimpleAnimState();
    if (this.usesExternalCharacterAnimation()) console.info("[characterVariant] using external_animation_v1 east/west only");
    this.inventory = new InventorySystem(this.content.items, this.state);
    this.quests = new QuestSystem(this.content.quests, this.state);
    this.dialogue = new DialogueSystem(this.content.dialogues, this.localization, (effect) => this.applyDialogueEffect(effect));
    this.movement = new MovementSystem(this.player);
    this.renderer = new Renderer(canvas, this);
    this.sceneEditor = this.editMode ? new SceneEditor(this) : null;
    const params = new URLSearchParams(globalThis.location?.search || "");
    this.menuOpen = !this.editMode && !this.simpleAnimTest && !this.animLab && !this.devHome && params.get("play") !== "1" && !params.has("scene") && !params.has("debugGeometry");
    this.paused = false;
    this.lastTime = 0;
    this.inputBound = false;
    this.renderUi();
  }

  t(key, replacements) {
    return this.localization.t(key, replacements);
  }

  async start() {
    await Promise.all([
      this.assets.preloadAllCharacterAssets(),
      this.assets.preloadSceneAssets(this.currentScene.id)
    ]);
    if (!this.inputBound) {
      this.bindInput();
      this.inputBound = true;
    }
    requestAnimationFrame((time) => this.tick(time));
  }

  tick(time) {
    const dt = Math.min(0.05, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;
    if (this.simpleAnimTest) {
      this.updateSimpleAnim(dt);
    } else if (this.animLab) {
      this.player.animationTime += dt;
    } else if (!this.paused && !this.menuOpen && !this.dialogue.current) {
      this.player.animator.beginTick();
      const finishingStopFrame = this.finishingStopFrame();
      this.movement.update(dt);
      if (finishingStopFrame && this.player.animation === "idle") this.setIdleHoldFrame(finishingStopFrame.frame, finishingStopFrame.frameIndex);
      this.resolvePendingFacingPoint();
      this.resolvePendingInteraction();
      this.updateIdleVariants(dt);
      this.player.animationTime += dt;
      this.player.animator.fpsOverride = this.currentAnimationFps();
      this.player.animator.frameCountOverride = this.currentAnimationFrameCount();
      this.player.animator.loopStartFrameOverride = this.currentAnimationLoopStartFrame();
      this.player.animator.initialFrameOverride = this.currentAnimationInitialFrame();
      this.player.animator.loopOverride = this.currentAnimationLoop();
      this.player.animator.pingPongOverride = this.currentAnimationPingPong();
      this.player.animator.play(this.player.animation, this.currentAnimationKey());
      this.player.animator.update(dt);
      this.updateActionSequence();
      this.updateSpeechAnimationHold();
      this.updateSpeechBubble(dt);
    }
    this.renderer.draw();
    requestAnimationFrame((next) => this.tick(next));
  }

  bindInput() {
    this.canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (this.editMode) return;
      this.cycleVerb();
    });
    this.canvas.addEventListener("pointerdown", (event) => {
      if (this.simpleAnimTest) return;
      if (this.editMode) {
        this.sceneEditor?.handlePointerDown(event, this.renderer.screenToWorld(event.clientX, event.clientY));
        return;
      }
      if (event.button !== 0 || this.menuOpen || this.paused || this.dialogue.current) return;
      this.handleWorldClick(this.renderer.screenToWorld(event.clientX, event.clientY));
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.editMode) return;
      this.sceneEditor?.handlePointerMove(event, this.renderer.screenToWorld(event.clientX, event.clientY));
    });
    this.canvas.addEventListener("pointerleave", () => {
      if (this.editMode) this.sceneEditor?.handlePointerLeave();
    });
    window.addEventListener("pointerup", () => {
      if (this.editMode) this.sceneEditor?.handlePointerUp();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.paused = !this.paused;
        this.menuOpen = false;
        this.renderUi();
      }
      if (event.key.toLowerCase() === "v") this.cycleVerb();
      if (event.shiftKey && event.key.toLowerCase() === "g") {
        this.debugSceneGeometry = !this.debugSceneGeometry;
      }
    });
  }

  resolveInitialScene() {
    const params = new URLSearchParams(globalThis.location?.search || "");
    const requestedSceneId = params.get("scene");
    if (requestedSceneId && this.content.scenes[requestedSceneId]) {
      return this.content.scenes[requestedSceneId];
    }
    return this.content.scenes[this.state.currentSceneId] || this.content.scenes[DEFAULT_SAVE.currentSceneId];
  }

  readDebugGeometrySetting() {
    if (this.readBooleanParam("edit")) return true;
    return this.readBooleanParam("debugGeometry");
  }

  defaultWalkMotionMultipliers() {
    return null;
  }

  defaultWalkMotionMultipliersByFacing() {
    const parts = this.defaultWalkPartsByFacing();
    return Object.fromEntries(Object.entries(parts).map(([facing, value]) => [facing, Object.fromEntries(Object.entries(value).filter(([, frame]) => frame?.movementSpeedMultipliers).map(([part, frame]) => [part, frame.movementSpeedMultipliers]))]));
  }

  defaultAnimationFpsByFacing() {
    return Object.fromEntries(Object.entries(this.defaultWalkPartsByFacing()).map(([facing, value]) => [facing, Object.fromEntries(Object.entries(value).filter(([, frame]) => frame?.fps).map(([part, frame]) => [part, frame.fps]))]));
  }

  defaultWalkMovementStartFrameByFacing() {
    return Object.fromEntries(Object.entries(this.characterDefinitions["npc.bai_mitko"].animations.walk.directions).filter(([, frame]) => Number.isInteger(frame?.movementStartFrame)).map(([facing, frame]) => [facing, frame.movementStartFrame]));
  }

  defaultWalkPartsByFacing() {
    return this.characterDefinitions["npc.bai_mitko"].animations.walk.parts || {};
  }

  idleVariantsForFacing(facing = this.player.facing) {
    const fallbackFacing = eastWestFallbackFacing(facing) || "east";
    return externalAnimationV1.idleVariants?.[fallbackFacing] || externalAnimationV1.idleVariants?.east || [];
  }

  currentIdleVariantFrame() {
    if (this.player.animation !== "idle" || !this.player.idleVariant) return null;
    return this.player.idleVariant;
  }

  setIdleHoldFrame(frame, frameIndex = null) {
    if (!frame?.slot) return;
    this.player.idleHoldFrame = {
      frame,
      slot: frame.slot,
      mirrored: Boolean(frame.mirrored),
      frameIndex: Number.isInteger(frameIndex) ? frameIndex : Math.max(0, (frame.frameCount || 1) - 1)
    };
  }

  finishingStopFrame() {
    if (this.player.animation !== "walk" || this.player.walkPart !== "stop" || !this.player.animator?.isFinished()) return null;
    const frame = this.currentAnimationFrame();
    if (!frame?.slot) return null;
    return { frame, frameIndex: Math.max(0, (frame.frameCount || 1) - 1) };
  }

  randomIdleVariantDelay() {
    return IDLE_VARIANT_DELAY_MIN + Math.random() * (IDLE_VARIANT_DELAY_MAX - IDLE_VARIANT_DELAY_MIN);
  }

  updateIdleVariants(dt) {
    if (!this.usesExternalCharacterAnimation()) return;
    if (this.player.animation !== "idle" || this.player.target || this.player.speaking) {
      this.player.idleVariant = null;
      this.player.idleVariantQueue = [];
      this.player.idleVariantTimer = this.randomIdleVariantDelay();
      return;
    }
    if (this.player.idleVariant) {
      if (this.player.animator?.isFinished()) {
        this.setIdleHoldFrame(this.player.idleVariant, Math.max(0, (this.player.idleVariant.frameCount || 1) - 1));
        const nextVariant = this.player.idleVariantQueue?.shift() || null;
        this.player.idleVariant = nextVariant;
        if (!nextVariant) this.player.idleVariantTimer = this.randomIdleVariantDelay();
      }
      return;
    }
    this.player.idleVariantTimer = Math.max(0, Number(this.player.idleVariantTimer || 0) - dt);
    if (this.player.idleVariantTimer > 0) return;
    const variants = this.idleVariantsForFacing();
    if (!variants.length) {
      this.player.idleVariantTimer = this.randomIdleVariantDelay();
      return;
    }
    const sequence = this.randomIdleVariantSequence(variants);
    this.player.idleVariant = sequence.shift() || null;
    this.player.idleVariantQueue = sequence;
  }

  randomIdleVariant(variants, excludedSlot = null) {
    const pool = variants.filter((variant) => variant?.slot && variant.slot !== excludedSlot);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  randomIdleVariantSequence(variants) {
    const first = this.randomIdleVariant(variants);
    if (!first) return [];
    const sequence = [first];
    if (variants.length < 2 || Math.random() >= IDLE_VARIANT_COMBO_PROBABILITY) return sequence;
    const idle5 = variants.find((variant) => variant.slot === "external_idle_east_5");
    const followup = idle5 && idle5.slot !== first.slot && Math.random() < IDLE_VARIANT_FOLLOWUP_IDLE5_PROBABILITY
      ? idle5
      : this.randomIdleVariant(variants, first.slot);
    if (followup) sequence.push(followup);
    return sequence;
  }

  currentSpeechAnimationFrame() {
    return this.player.speechAnimation || null;
  }

  currentActionAnimationFrame() {
    return this.player.actionAnimation || null;
  }

  currentAnimationFps() {
    const action = this.currentActionAnimationFrame();
    if (action) return action.fps;
    const speech = this.currentSpeechAnimationFrame();
    if (speech) return speech.fps;
    const idleVariant = this.currentIdleVariantFrame();
    if (idleVariant) return idleVariant.fps;
    if (this.player.animation !== "walk") return null;
    const frame = this.currentAnimationFrame();
    if (!frame) return null;
    return frame.fps;
  }

  currentAnimationFrame() {
    const facing = this.player.facing || "south";
    const fallbackFacing = eastWestFallbackFacing(facing);
    if (fallbackFacing) {
      const parts = this.player.walkPartsByFacing?.[fallbackFacing];
      const part = this.player.walkPart || "loop";
      return parts?.[part] || parts?.loop || null;
    }
    return this.characterDefinitions["npc.bai_mitko"].animations.walk.directions[fallbackFacing] || null;
  }

  currentAnimationKey() {
    if (this.player.animation === "action") {
      const action = this.currentActionAnimationFrame();
      return `${action?.slot || "action"}:action:${this.player.facing || "east"}`;
    }
    if (this.player.animation === "walk") {
      const facing = eastWestFallbackFacing(this.player.facing) || this.player.facing || "south";
      const part = this.player.walkPart || "loop";
      const frame = this.currentAnimationFrame();
      return `${frame?.slot || "walk"}:${facing}:${part}`;
    }
    if (this.player.animation === "idle") {
      const idleVariant = this.currentIdleVariantFrame();
      if (idleVariant) return `${idleVariant.slot}:idle:${this.player.facing || "east"}`;
      return `idle:${this.player.facing || "south"}`;
    }
    const speech = this.currentSpeechAnimationFrame();
    if (speech) return `${speech.slot}:${this.player.animation}:${this.player.facing || "east"}`;
    return this.player.animation;
  }

  currentAnimationFrameCount() {
    const action = this.currentActionAnimationFrame();
    if (action) return action.frameCount || null;
    const speech = this.currentSpeechAnimationFrame();
    if (speech) return speech.frameCount || null;
    const idleVariant = this.currentIdleVariantFrame();
    if (idleVariant) return idleVariant.frameCount || null;
    if (this.player.animation !== "walk") return null;
    return this.currentAnimationFrame()?.frameCount || null;
  }

  currentAnimationLoopStartFrame() {
    const action = this.currentActionAnimationFrame();
    if (action) return action.loopStartFrame ?? null;
    const speech = this.currentSpeechAnimationFrame();
    if (speech) return speech.loopStartFrame ?? null;
    const idleVariant = this.currentIdleVariantFrame();
    if (idleVariant) return idleVariant.loopStartFrame ?? null;
    if (this.player.animation !== "walk") return null;
    return this.currentAnimationFrame()?.loopStartFrame ?? null;
  }

  currentAnimationInitialFrame() {
    const action = this.currentActionAnimationFrame();
    if (action) return action.initialFrame ?? null;
    const speech = this.currentSpeechAnimationFrame();
    if (speech) return speech.initialFrame ?? null;
    const idleVariant = this.currentIdleVariantFrame();
    if (idleVariant) return idleVariant.initialFrame ?? null;
    if (this.player.animation !== "walk") return null;
    return this.currentAnimationFrame()?.initialFrame ?? null;
  }

  currentAnimationLoop() {
    const action = this.currentActionAnimationFrame();
    if (action) return Boolean(action.loop);
    const speech = this.currentSpeechAnimationFrame();
    if (speech) return Boolean(speech.loop);
    const idleVariant = this.currentIdleVariantFrame();
    if (idleVariant) return Boolean(idleVariant.loop);
    if (this.player.animation !== "walk") return null;
    const frame = this.currentAnimationFrame();
    return frame ? Boolean(frame.loop) : null;
  }

  currentAnimationPingPong() {
    const action = this.currentActionAnimationFrame();
    if (action) return Boolean(action.pingPong);
    const speech = this.currentSpeechAnimationFrame();
    if (speech) return Boolean(speech.pingPong);
    const idleVariant = this.currentIdleVariantFrame();
    if (idleVariant) return Boolean(idleVariant.pingPong);
    return null;
  }

  readBooleanParam(name) {
    const params = new URLSearchParams(globalThis.location?.search || "");
    return params.get(name) === "1";
  }

  readCharacterVariant() {
    const params = new URLSearchParams(globalThis.location?.search || "");
    return params.get("characterVariant") || "external_animation_v1";
  }

  usesExternalCharacterAnimation() {
    return this.characterVariant === "external_animation_v1";
  }

  shouldShowDevHome() {
    const params = new URLSearchParams(globalThis.location?.search || "");
    if (params.get("play") === "1") return false;
    if (params.get("dev") === "0") return false;
    if (params.get("dev") === "1") return true;
    if (params.has("simpleAnimTest") || params.has("animLab") || params.has("edit") || params.has("scene") || params.has("debugGeometry") || params.has("characterVariant")) return false;
    return true;
  }

  readNumberParam(name, fallback) {
    const params = new URLSearchParams(globalThis.location?.search || "");
    const value = Number(params.get(name));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  sceneMovementSpeed(scene) {
    return (scene.movementSpeed || 100) * CHARACTER_DISTANCE_SPEED_MULTIPLIER * this.walkSpeedMultiplier;
  }

  cycleVerb() {
    const index = verbs.indexOf(this.selectedVerb);
    this.selectedVerb = verbs[(index + 1) % verbs.length];
    this.renderUi();
  }

  clearStatusMessage() {
    this.message = "";
    this.pendingSpeechBubble = null;
    if (this.speechBubble) this.hideSpeechBubble(true);
    else if (this.uiRoot) this.renderUi();
  }

  setStatusMessage(message, options = {}) {
    if (this.player.target || this.player.animation === "walk" || this.player.animation === "action") {
      this.hideSpeechBubble(true);
      this.pendingSpeechBubble = message ? { message, options: { ...options } } : null;
      return;
    }
    this.pendingSpeechBubble = null;
    this.message = message;
    this.speechBubble = message
      ? {
          id: `speech-${++this.speechBubbleSequence}`,
          text: message,
          tone: options.reject ? "reject" : "talk",
          metrics: null,
          debug: null,
          elapsed: 0,
          visibleSeconds: this.speechBubbleVisibleSeconds(message),
          phase: "in"
        }
      : null;
    if (this.speechBubble) this.speechBubble.metrics = this.measureSpeechBubble(message);
    this.startSpeechAnimationForMessage(message, options);
    if (this.uiRoot) this.renderUi();
  }

  speechBubbleVisibleSeconds(message) {
    const normalized = String(message || "").trim();
    const punctuationBonus = (normalized.match(/[.!?…]/g)?.length || 0) * 0.18;
    const readingSeconds = normalized.length / SPEECH_BUBBLE_CHARS_PER_SECOND + punctuationBonus;
    return clampNumber(readingSeconds, SPEECH_BUBBLE_MIN_VISIBLE_SECONDS, SPEECH_BUBBLE_MAX_VISIBLE_SECONDS);
  }

  updateSpeechBubble(dt) {
    if (!this.speechBubble && this.pendingSpeechBubble && !this.player.target && this.player.animation === "idle") {
      const pending = this.pendingSpeechBubble;
      this.pendingSpeechBubble = null;
      this.setStatusMessage(pending.message, pending.options);
      return;
    }
    if (!this.speechBubble) return;
    if (this.player.target || this.player.animation === "walk" || this.player.animation === "action") {
      this.hideSpeechBubble(true);
      return;
    }
    this.speechBubble.elapsed += dt;
    if (this.speechBubble.phase === "in" && this.speechBubble.elapsed >= SPEECH_BUBBLE_FADE_SECONDS) {
      this.speechBubble.phase = "visible";
    }
    if (this.speechBubble.phase !== "out" && this.speechBubble.elapsed >= this.speechBubble.visibleSeconds) {
      this.hideSpeechBubble();
    }
    if (this.speechBubble?.phase === "out" && this.speechBubble.elapsed >= this.speechBubble.visibleSeconds + SPEECH_BUBBLE_FADE_SECONDS) {
      this.speechBubble = null;
      this.message = "";
      this.renderUi();
    }
  }

  hideSpeechBubble(immediate = false) {
    if (!this.speechBubble) return;
    if (immediate) {
      this.speechBubble = null;
      this.pendingSpeechBubble = null;
      this.message = "";
      this.player.speaking = false;
      this.player.speechAnimation = null;
      if (!this.player.target && this.player.animation !== "walk") {
        this.player.animation = "idle";
      }
      this.renderUi();
      return;
    }
    if (this.speechBubble.phase !== "out") {
      this.speechBubble.phase = "out";
      this.renderUi();
    }
  }

  startSpeechAnimationForMessage(message, options = {}) {
    if (!this.usesExternalCharacterAnimation() || !message || this.player.target || this.player.animation === "walk" || this.player.animation === "action") return;
    const frame = options.reject ? this.randomRejectAnimation() : this.talkAnimationForMessage(message);
    if (!frame) return;
    this.player.speechAnimation = frame;
    this.player.idleVariant = null;
    this.player.idleVariantQueue = [];
    this.player.speaking = true;
    this.player.animation = frame.role === "reject" ? "reject" : "talk";
    this.player.animator?.play(this.player.animation, `${frame.slot}:${this.player.animation}:${this.player.facing || "east"}`);
  }

  updateSpeechAnimationHold() {
    const frame = this.player.speechAnimation;
    if (!frame || !this.player.animator?.isFinished()) return;
    this.setIdleHoldFrame(frame, Math.max(0, (frame.frameCount || 1) - 1));
    this.player.speechAnimation = null;
    this.player.speaking = false;
    if (!this.player.target) this.player.animation = "idle";
  }

  talkAnimationForMessage(message) {
    const semantic = this.talkSemanticForMessage(message);
    const facing = eastWestFallbackFacing(this.player.facing) || "east";
    const byFacing = externalAnimationV1.talkAnimations?.[facing] || externalAnimationV1.talkAnimations?.east || {};
    const pool = byFacing[semantic] || [];
    return this.randomAnimationFrame(pool);
  }

  talkSemanticForMessage(message) {
    const text = String(message || "").trim();
    const words = text.match(/[\p{L}\p{N}]+/gu) || [];
    const sentenceBreaks = text.match(/[.!?…]+/g) || [];
    const sentenceCount = Math.max(1, sentenceBreaks.length || (text ? 1 : 0));
    if (sentenceCount <= 1 && words.length <= 2 && text.length <= TALK_SINGLE_WORD_MAX_CHARS) return "singleWord";
    if (sentenceCount <= 1 && text.length < TALK_LONG_SENTENCE_MIN_CHARS) return "singleShortSentence";
    return "singleLongSentence";
  }

  randomRejectAnimation() {
    const facing = eastWestFallbackFacing(this.player.facing) || "east";
    const pool = externalAnimationV1.rejectAnimations?.[facing] || externalAnimationV1.rejectAnimations?.east || [];
    return this.randomAnimationFrame(pool);
  }

  randomAnimationFrame(pool) {
    if (!Array.isArray(pool) || !pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  actionSequenceForTarget(target, verb) {
    return target?.actions?.[verb] || null;
  }

  actionAnimationForSequence(sequence) {
    const actionName = sequence?.animation || sequence?.action;
    if (!actionName) return null;
    const facing = eastWestFallbackFacing(sequence.facing || this.player.facing) || "east";
    const byFacing = externalAnimationV1.actionAnimations?.[facing] || externalAnimationV1.actionAnimations?.east || {};
    return this.randomAnimationFrame(byFacing[actionName] || []);
  }

  actionSequenceApproachPoint(sequence) {
    if (sequence?.approach) return { ...sequence.approach };
    if (!sequence?.approachCell) return null;
    const mask = this.currentScene?.walkMask;
    if (!mask) return null;
    const width = Math.max(1, Number(mask.width) || 1);
    const height = Math.max(1, Number(mask.height) || 1);
    const worldWidth = Math.max(1, Number(mask.worldWidth) || 1280);
    const worldHeight = Math.max(1, Number(mask.worldHeight) || 720);
    const x = Math.max(0, Math.min(width - 1, Math.floor(Number(sequence.approachCell.x) || 0)));
    const y = Math.max(0, Math.min(height - 1, Math.floor(Number(sequence.approachCell.y) || 0)));
    return {
      x: (x + 0.5) * (worldWidth / width),
      y: (y + 0.5) * (worldHeight / height)
    };
  }

  startInteractionActionSequence(target, verb, sequence) {
    if (verb === VERBS.TAKE && target.takeItemId && this.inventory.has(target.takeItemId)) {
      this.setStatusMessage(this.t("msg.already_taken"), { reject: true });
      return true;
    }
    if (sequence.facing) this.player.facing = sequence.facing;
    else if (sequence.facingPoint) this.facePoint(sequence.facingPoint);
    const frame = this.actionAnimationForSequence(sequence);
    if (!frame) {
      this.completeInteractionActionSequence({ target, verb, sequence, frame: null });
      return true;
    }
    this.hideSpeechBubble(true);
    this.player.actionSequence = { target, verb, sequence, frame };
    this.player.actionAnimation = frame;
    this.player.speechAnimation = null;
    this.player.speaking = false;
    this.player.idleVariant = null;
    this.player.idleVariantQueue = [];
    this.player.idleHoldFrame = null;
    this.player.animation = "action";
    this.syncAnimatorToAnimationFrame(frame);
    return true;
  }

  updateActionSequence() {
    if (!this.player.actionSequence || this.player.animation !== "action") return;
    if (!this.player.animator?.isFinished()) return;
    this.completeInteractionActionSequence();
  }

  completeInteractionActionSequence(actionSequence = this.player.actionSequence) {
    if (!actionSequence) return;
    const frame = this.player.actionAnimation || actionSequence.frame;
    this.player.actionSequence = null;
    this.player.actionAnimation = null;
    if (frame && actionSequence.sequence?.holdFinalFrame !== false) {
      this.setIdleHoldFrame(frame, Math.max(0, (frame.frameCount || 1) - 1));
    }
    this.player.animation = "idle";
    const flagOnComplete = actionSequence.sequence?.flagOnComplete;
    if (flagOnComplete) {
      this.state.flags ||= {};
      this.state.flags[flagOnComplete] = true;
      this.save();
    }
    if (actionSequence.verb === VERBS.TAKE && actionSequence.target?.takeItemId) {
      this.takeTarget(actionSequence.target, { messageKey: actionSequence.sequence?.messageKey });
      return;
    }
    const messageKey = actionSequence.sequence?.messageKey;
    if (messageKey) this.setStatusMessage(this.t(messageKey));
  }

  syncAnimatorToAnimationFrame(frame) {
    if (!this.player.animator || !frame) return;
    const frameCount = Math.max(1, Number(frame.frameCount) || 1);
    const initialFrame = Math.max(0, Math.min(Number(frame.initialFrame) || 0, frameCount - 1));
    const fps = Number(frame.fps) || 1;
    this.player.animator.frameIndex = initialFrame;
    this.player.animator.elapsed = initialFrame / fps;
  }

  handleWorldClick(point) {
    const target = findTargetAt(this.currentScene, point);
    if (target) {
      this.handleTarget(target, point);
      return;
    }
    this.player.pendingInteraction = null;
    const destination = isWalkable(this.currentScene, point)
      ? point
      : nearestReachableWalkablePoint(this.currentScene, this.player.position, point);
    if (destination) {
      this.facePoint(point);
      this.player.pendingFacingPoint = { ...point };
      this.player.interactionDebug = {
        kind: "move",
        click: { ...point },
        feet: { ...destination }
      };
      this.walkToPoint(destination, point);
      this.clearStatusMessage();
    }
  }

  handleTarget(target, clickPoint = null) {
    if (this.shouldApproachTargetBeforeAction(target, clickPoint)) return;
    this.performTargetAction(target);
  }

  shouldApproachTargetBeforeAction(target, clickPoint = null) {
    if (target.kind === "exit") return false;
    const actionSequence = this.actionSequenceForTarget(target, this.selectedVerb);
    const actionApproach = this.actionSequenceApproachPoint(actionSequence);
    if (actionApproach) {
      const rawApproach = actionApproach;
      const approach = nearestWalkablePoint(this.currentScene, rawApproach)
        || nearestReachableWalkablePoint(this.currentScene, this.player.position, rawApproach);
      const reachPoint = actionSequence.facingPoint || clickPoint || this.targetReachPoint(target, clickPoint) || rawApproach;
      if (actionSequence.facing) this.player.facing = actionSequence.facing;
      else this.facePoint(reachPoint);
      this.player.interactionDebug = {
        kind: "target",
        targetId: target.id,
        click: clickPoint ? { ...clickPoint } : null,
        hand: { ...reachPoint },
        reachOrigin: this.playerReachOriginPoint(),
        distancePoint: { ...reachPoint },
        reachDistance: distance(this.playerReachOriginPoint(), reachPoint),
        feetGoal: rawApproach,
        feet: approach ? { ...approach } : null
      };
      if (!approach || distance(this.player.position, approach) <= TARGET_APPROACH_FEET_CANCEL_DISTANCE) return false;
      this.player.pendingFacingPoint = { ...reachPoint };
      this.player.pendingInteraction = {
        target,
        verb: this.selectedVerb,
        hand: reachPoint,
        approach,
        actionSequence
      };
      this.walkToPoint(approach, reachPoint);
      this.clearStatusMessage();
      return true;
    }
    const reachPoint = this.targetReachPoint(target, clickPoint);
    if (!reachPoint) return false;
    this.facePoint(reachPoint);
    const feetGoal = this.targetFeetApproachPoint(reachPoint);
    const approach = nearestWalkablePoint(this.currentScene, feetGoal) || nearestWalkablePoint(this.currentScene, reachPoint);
    const reachOrigin = this.playerReachOriginPoint();
    const distancePoint = reachPoint;
    const reachDistance = distance(reachOrigin, distancePoint);
    this.player.interactionDebug = {
      kind: "target",
      targetId: target.id,
      click: clickPoint ? { ...clickPoint } : null,
      hand: { ...reachPoint },
      reachOrigin,
      distancePoint: { ...distancePoint },
      reachDistance,
      feetGoal,
      feet: approach ? { ...approach } : null
    };
    if (reachDistance <= TARGET_INTERACTION_DISTANCE) {
      return false;
    }
    if (!approach || distance(this.player.position, approach) <= TARGET_APPROACH_FEET_CANCEL_DISTANCE) {
      return false;
    }
    this.player.pendingFacingPoint = { ...reachPoint };
    this.player.pendingInteraction = {
      target,
      verb: this.selectedVerb,
      hand: reachPoint,
      approach
    };
    this.walkToPoint(approach, reachPoint);
    this.clearStatusMessage();
    return true;
  }

  resolvePendingFacingPoint() {
    const point = this.player.pendingFacingPoint;
    if (!point || this.player.target || this.player.animation === "walk") return;
    this.player.pendingFacingPoint = null;
    this.facePoint(point);
  }

  resolvePendingInteraction() {
    const pending = this.player.pendingInteraction;
    if (!pending || this.player.target || this.player.animation === "walk") return;
    this.player.pendingInteraction = null;
    if (pending.hand) this.facePoint(pending.hand);
    const previousVerb = this.selectedVerb;
    this.selectedVerb = pending.verb;
    this.performTargetAction(pending.target, pending.actionSequence);
    this.selectedVerb = previousVerb;
  }

  targetCenter(target) {
    if (target.rect) return { x: target.rect.x + target.rect.w * 0.5, y: target.rect.y + target.rect.h * 0.5 };
    if (target.polygon?.length) {
      const sum = target.polygon.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
      return { x: sum.x / target.polygon.length, y: sum.y / target.polygon.length };
    }
    return null;
  }

  targetReachPoint(target, clickPoint = null) {
    if (clickPoint) return { ...clickPoint };
    if (target.rect) {
      return {
        x: target.rect.x + target.rect.w * 0.3,
        y: target.rect.y + target.rect.h * 0.5
      };
    }
    return clickPoint || this.targetCenter(target);
  }

  targetFeetApproachPoint(handPoint) {
    const side = this.player.position.x >= handPoint.x ? 1 : -1;
    return {
      x: handPoint.x + side * TARGET_HAND_TO_FEET_X,
      y: handPoint.y + TARGET_HAND_TO_FEET_Y
    };
  }

  playerReachOriginPoint() {
    const definition = this.characterDefinitions?.["npc.bai_mitko"] || characterDefinitions["npc.bai_mitko"];
    const height = characterHeight(definition, this.currentScene, this.player.position);
    const facing = eastWestFallbackFacing(this.player.facing) || this.player.facing || "east";
    const side = facing === "west" ? -1 : 1;
    return {
      x: this.player.position.x + side * height * TARGET_REACH_ORIGIN_SIDE_RATIO,
      y: this.player.position.y - height * TARGET_REACH_ORIGIN_HEIGHT_RATIO
    };
  }

  facePoint(point) {
    if (!point) return;
    this.player.facing = facingFromDelta(point.x - this.player.position.x, point.y - this.player.position.y, this.player);
  }

  walkToPoint(point, facingPoint = point) {
    const path = findWalkPath(this.currentScene, this.player.position, point);
    const route = path.length ? path : [{ ...point }];
    const routeDistance = walkPathDistance(this.player.position, route);
    const shortWalk = routeDistance > 0 && routeDistance <= SHORT_WALK_PATH_DISTANCE;
    this.hideSpeechBubble(true);
    this.player.actionSequence = null;
    this.player.actionAnimation = null;
    this.movement.walkTo(point, facingPoint, route, { shortWalk });
  }

  performTargetAction(target, forcedActionSequence = null) {
    if (target.kind === "exit") {
      this.changeScene(target.targetSceneId, target.targetPosition);
      return;
    }
    const actionSequence = forcedActionSequence || this.actionSequenceForTarget(target, this.selectedVerb);
    if (actionSequence && this.startInteractionActionSequence(target, this.selectedVerb, actionSequence)) return;
    if (this.selectedVerb === VERBS.LOOK) {
      this.setStatusMessage(this.t(target.lookKey || target.nameKey));
      return;
    }
    if (this.selectedVerb === VERBS.TALK) {
      if (target.dialogueId) {
        this.dialogue.start(target.dialogueId);
        this.player.speaking = true;
        this.renderUi();
      } else {
        this.setStatusMessage(this.t("msg.need_talk"), { reject: true });
      }
      return;
    }
    if (this.selectedVerb === VERBS.TAKE && target.takeItemId) {
      this.takeTarget(target);
      return;
    }
    if (this.selectedVerb === VERBS.USE) {
      this.useTarget(target);
      return;
    }
    this.setStatusMessage(this.t("msg.no_use"), { reject: true });
  }

  takeTarget(target, options = {}) {
    if (this.inventory.has(target.takeItemId)) {
      this.setStatusMessage(this.t("msg.already_taken"), { reject: true });
      return;
    }
    this.inventory.add(target.takeItemId);
    if (target.flagOnTake) this.state[target.flagOnTake] = true;
    this.setStatusMessage(this.t(options.messageKey || "msg.taken"));
    this.save();
  }

  useTarget(target) {
    if (target.id === "hotspot.mehana.oil" && this.inventory.has("item.sunflower_oil")) {
      this.state.drankOilBeforeTonyChallenge = true;
      this.setStatusMessage(this.t("msg.oil_used"));
      this.save();
      return;
    }
    if (target.id === "npc.tony_fridge" && this.inventory.has("item.accordion")) {
      this.state.flags.tonyDistracted = true;
      this.setStatusMessage(this.t("msg.accordion_tony"));
      this.save();
      return;
    }
    if (target.id === "hotspot.mehana.water_jug" && this.state.flags.tonyChallengeStarted) {
      if (!this.state.flags.tonyDistracted) {
        this.setStatusMessage(this.t("msg.water_swap_missing"), { reject: true });
        this.state.suspicion += 8;
        this.save();
        return;
      }
      this.state.swappedOwnRakiaWithWater = true;
      this.state.tonyVote = true;
      this.state.tonyFavorOwed = true;
      this.state.influence += 25;
      this.state.suspicion += 10;
      this.state.publicMood += 5;
      this.quests.complete("quest.chapter1.tony_vote");
      this.setStatusMessage(this.t("msg.water_swap_success"));
      this.save();
      return;
    }
    this.setStatusMessage(this.t("msg.no_use"), { reject: true });
  }

  applyDialogueEffect(effect) {
    if (effect === "tonyChallengeStarted") {
      this.state.flags.tonyChallengeStarted = true;
      this.setStatusMessage(this.t("dialogue.tony.challenge"));
    }
    if (effect === "tonyChallengeRefused") {
      this.state.suspicion += 3;
    }
    this.player.speaking = false;
    this.dialogue.close();
    this.save();
    this.renderUi();
  }

  async changeScene(sceneId, position) {
    if (!this.content.scenes[sceneId]) {
      this.message = this.t("msg.scene_not_ready");
      return;
    }
    const sceneLoadToken = Symbol(sceneId);
    this.sceneLoadToken = sceneLoadToken;
    await this.assets.preloadSceneAssets(sceneId);
    if (this.sceneLoadToken !== sceneLoadToken) return;
    this.currentScene = this.content.scenes[sceneId];
    this.state.currentSceneId = sceneId;
    this.player.position = { ...(position || this.currentScene.playerStart) };
    this.player.target = null;
    this.player.walkPath = [];
    this.player.shortWalk = false;
    this.player.pendingInteraction = null;
    this.player.pendingFacingPoint = null;
    this.player.interactionDebug = null;
    this.player.speed = this.sceneMovementSpeed(this.currentScene);
    this.save();
  }

  setLanguage(language) {
    if (!LANGUAGES.includes(language)) return;
    this.state.language = language;
    this.localization.setLanguage(language);
    this.message = this.t("ui.hint");
    this.save();
    this.renderUi();
  }

  save() {
    this.saveSystem.save(this.state);
  }

  reset() {
    this.state = this.saveSystem.reset();
    this.localization.setLanguage(this.state.language);
    this.currentScene = this.content.scenes[this.state.currentSceneId];
    this.inventory = new InventorySystem(this.content.items, this.state);
    this.quests = new QuestSystem(this.content.quests, this.state);
    this.player.position = { ...this.currentScene.playerStart };
    this.player.target = null;
    this.player.walkPath = [];
    this.player.shortWalk = false;
    this.player.pendingInteraction = null;
    this.player.pendingFacingPoint = null;
    this.player.interactionDebug = null;
    this.message = this.t("ui.hint");
    this.menuOpen = true;
    this.paused = false;
    this.renderUi();
  }

  confirmResetAndReload() {
    const confirmed = globalThis.confirm?.(this.t("ui.reset_confirm")) ?? false;
    if (!confirmed) return;
    this.reset();
    globalThis.location?.reload();
  }

  renderUi() {
    if (this.simpleAnimTest) {
      this.renderSimpleAnimControls();
      return;
    }
    if (this.animLab) {
      this.uiRoot.innerHTML = "";
      return;
    }
    const dialogueNode = this.dialogue.getNode();
    this.uiRoot.innerHTML = "";
    if (this.editMode) {
      if (this.sceneEditor) this.uiRoot.appendChild(this.sceneEditor.createPanel());
      return;
    }
    if (this.devHome) this.uiRoot.appendChild(this.createDevHome());
    if (this.menuOpen) this.uiRoot.appendChild(this.createMenu());
    if (this.paused) this.uiRoot.appendChild(this.createPause());
    if (dialogueNode) this.uiRoot.appendChild(this.createDialogue(dialogueNode));
    if (this.speechBubble && !this.menuOpen && !this.paused && !dialogueNode) this.uiRoot.appendChild(this.createSpeechBubble());
    this.uiRoot.appendChild(this.createTopBar());
  }

  createTopBar() {
    const bar = element("div", "top-bar");
    const left = element("div", "top-bar-left");
    const right = element("div", "top-bar-right");
    left.append(
      button(this.t("ui.reset"), () => this.confirmResetAndReload())
    );
    right.append(
      button(this.t("verb.look"), () => (this.selectedVerb = VERBS.LOOK)),
      button(this.t("verb.talk"), () => (this.selectedVerb = VERBS.TALK)),
      button(this.t("verb.use"), () => (this.selectedVerb = VERBS.USE)),
      button(this.t("verb.take"), () => (this.selectedVerb = VERBS.TAKE)),
      button("BG", () => this.setLanguage("bg")),
      button("EN", () => this.setLanguage("en"))
    );
    bar.append(left, right);
    return bar;
  }

  createSpeechBubble() {
    if (!this.speechBubble.metrics) this.speechBubble.metrics = this.measureSpeechBubble(this.speechBubble.text);
    const position = this.speechBubblePosition();
    const bubble = element("div", `speech-bubble tail-${position.tailSide} phase-${this.speechBubble.phase} ${this.speechBubble.tone === "reject" ? "reject" : ""}`);
    bubble.dataset.speechId = this.speechBubble.id;
    if (position.right != null) bubble.style.right = `${position.right}%`;
    else bubble.style.left = `${position.left}%`;
    bubble.style.bottom = `${position.bottom}%`;
    bubble.style.width = `${position.width}px`;
    bubble.style.maxWidth = `${position.maxWidth}px`;
    bubble.style.maxHeight = `${position.maxHeight}px`;
    bubble.innerHTML = `
      <div class="speech-blobs">
        <div class="speech-blob-top"></div>
        <div class="speech-blob-bottom"></div>
        <svg class="speech-tail" viewBox="0 0 132 82" aria-hidden="true" focusable="false">
          <path d="M130 7 C105 10 85 19 68 34 C49 51 31 65 0 82 C19 57 27 38 34 16 C51 26 73 27 96 18 C110 13 121 9 130 7 Z"></path>
        </svg>
        <div class="speech-text"></div>
      </div>
      <div class="speech-speaker">${escapeHtml(this.t("npc.bai_mitko.name"))}</div>
    `;
    bubble.querySelector(".speech-text").textContent = this.speechBubble.text;
    return bubble;
  }

  measureSpeechBubble(text) {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return { width: SPEECH_BUBBLE_MAX_WIDTH_PX, height: 120, maxWidth: SPEECH_BUBBLE_MAX_WIDTH_PX, maxHeight: SPEECH_BUBBLE_MAX_HEIGHT_PX };
    }
    const maxWidth = Math.max(
      120,
      Math.min(SPEECH_BUBBLE_MAX_WIDTH_PX, (window.innerWidth || SPEECH_BUBBLE_MAX_WIDTH_PX) - SPEECH_BUBBLE_VIEWPORT_MARGIN_X_PX)
    );
    const maxHeight = Math.max(
      80,
      Math.min(SPEECH_BUBBLE_MAX_HEIGHT_PX, (window.innerHeight || 720) * SPEECH_BUBBLE_MAX_HEIGHT_VIEWPORT_RATIO)
    );
    if (!this.uiRoot) return { width: maxWidth, height: 120, maxWidth, maxHeight };
    const probe = element("div", "speech-bubble speech-measure tail-right");
    probe.style.width = `${maxWidth}px`;
    probe.style.maxWidth = `${maxWidth}px`;
    probe.style.maxHeight = `${maxHeight}px`;
    probe.innerHTML = `
      <div class="speech-blobs">
        <div class="speech-blob-top"></div>
        <div class="speech-blob-bottom"></div>
        <svg class="speech-tail" viewBox="0 0 132 82" aria-hidden="true" focusable="false">
          <path d="M130 7 C105 10 85 19 68 34 C49 51 31 65 0 82 C19 57 27 38 34 16 C51 26 73 27 96 18 C110 13 121 9 130 7 Z"></path>
        </svg>
        <div class="speech-text"></div>
      </div>
    `;
    probe.querySelector(".speech-text").textContent = text;
    this.uiRoot.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    probe.remove();
    return {
      width: Math.ceil(Math.min(maxWidth, Math.max(1, rect.width))),
      height: Math.ceil(Math.min(maxHeight, Math.max(1, rect.height))),
      maxWidth,
      maxHeight
    };
  }

  speechBubblePosition() {
    const definition = this.characterDefinitions?.["npc.bai_mitko"] || characterDefinitions["npc.bai_mitko"];
    const height = characterHeight(definition, this.currentScene, this.player.position);
    const facing = eastWestFallbackFacing(this.player.facing) || "east";
    const side = facing === "west" ? -1 : 1;
    const mouth = {
      x: this.player.position.x + side * height * 0.18,
      y: this.player.position.y - height * 0.68
    };
    const fullSizeHeight =
      definition.render.sceneHeights?.[this.currentScene.id]?.near || definition.gameHeight || height;
    const renderScale = height / Math.max(1, fullSizeHeight);
    const speechOffsetX = SPEECH_BUBBLE_WEST_OFFSET_X_FULL_SIZE * renderScale * (facing === "west" ? 1 : -1);
    const speechOffsetY = SPEECH_BUBBLE_WEST_OFFSET_Y_FULL_SIZE * renderScale;
    const metrics = this.speechBubble?.metrics || { width: 350, height: 120, maxWidth: SPEECH_BUBBLE_MAX_WIDTH_PX, maxHeight: SPEECH_BUBBLE_MAX_HEIGHT_PX };
    const canvasRect = this.canvas.getBoundingClientRect();
    const cssToWorldX = this.canvas.width / Math.max(1, canvasRect.width || this.canvas.width);
    const cssToWorldY = this.canvas.height / Math.max(1, canvasRect.height || this.canvas.height);
    const bubbleWidthWorld = metrics.width * cssToWorldX;
    const bubbleHeightWorld = metrics.height * cssToWorldY;
    const tailEnd = {
      x: mouth.x + speechOffsetX,
      y: mouth.y + speechOffsetY
    };
    const tailOffsetXWorld = SPEECH_BUBBLE_WEST_TAIL_END_FROM_RIGHT_PX * cssToWorldX;
    const tailOffsetYWorld = SPEECH_BUBBLE_TAIL_END_FROM_BOTTOM_PX * cssToWorldY;
    const bottomWorld = 720 - tailEnd.y + tailOffsetYWorld;
    if (facing === "west") {
      const leftWorld = tailEnd.x - bubbleWidthWorld + tailOffsetXWorld;
      const rightWorld = 1280 - (leftWorld + bubbleWidthWorld);
      const topWorld = 720 - bottomWorld - bubbleHeightWorld;
      this.speechBubble.debug = {
        tailEnd,
        bubbleRect: { x: leftWorld, y: topWorld, w: bubbleWidthWorld, h: bubbleHeightWorld },
        metrics
      };
      return {
        right: (rightWorld / 1280) * 100,
        bottom: (bottomWorld / 720) * 100,
        width: metrics.width,
        maxWidth: metrics.maxWidth,
        maxHeight: metrics.maxHeight,
        tailSide: "right"
      };
    }
    const leftWorld = tailEnd.x - tailOffsetXWorld;
    const topWorld = 720 - bottomWorld - bubbleHeightWorld;
    this.speechBubble.debug = {
      tailEnd,
      bubbleRect: { x: leftWorld, y: topWorld, w: bubbleWidthWorld, h: bubbleHeightWorld },
      metrics
    };
    return {
      left: (leftWorld / 1280) * 100,
      bottom: (bottomWorld / 720) * 100,
      width: metrics.width,
      maxWidth: metrics.maxWidth,
      maxHeight: metrics.maxHeight,
      tailSide: "left"
    };
  }

  createMenu() {
    const menu = element("section", "panel main-menu");
    menu.innerHTML = `<h1>${this.t("game.title")}</h1><p>${this.t("chapter1.title")}</p>`;
    menu.append(
      button(this.t("ui.continue"), () => {
        this.menuOpen = false;
        this.renderUi();
      }),
      button("BG", () => this.setLanguage("bg")),
      button("EN", () => this.setLanguage("en"))
    );
    return menu;
  }

  createDevHome() {
    const panel = element("section", "panel dev-home");
    panel.innerHTML = `
      <h1>Comrade Candidate Dev</h1>
      <p>Internal development links for runtime art and animation testing.</p>
      <a class="play-link" href="./?play=1">Play Animated East/West</a>
      <div class="dev-status-list">
        <div class="dev-status">
          <strong>External Animation v1</strong>
          <span>active Bai Mitko animation import path. East start/loop/short/stop only; west mirrors east. North/south/diagonals deferred.</span>
          <a href="./?animLab=1">Open animLab external section</a>
          <a href="./?simpleAnimTest=1">Open simple animation test</a>
          <a href="./?edit=1&scene=scene.chapter1.apartment">Open scene geometry editor</a>
          <a href="./?play=1">Play with External Animation v1</a>
        </div>
      </div>
      <pre class="dev-command">node tools/unpack-external-animation-zips.js
node tools/inspect-external-animation-metadata.js
node tools/preview-external-animations.js
node tools/build-external-runtime-staging.js</pre>
      <div class="dev-links">
        <a href="./?animLab=1">Animation Lab</a>
        <a href="./?simpleAnimTest=1">Simple Animation Test</a>
        <a href="./?edit=1&scene=scene.chapter1.apartment">Scene Geometry Editor</a>
        <a href="./?play=1">Play External Animation v1</a>
        <a href="./target/external_animation_v1/previews/walk_east_start.gif">Walk East Start GIF</a>
        <a href="./target/external_animation_v1/previews/walk_east_loop.gif">Walk East Loop GIF</a>
        <a href="./target/external_animation_v1/previews/walk_east_stop.gif">Walk East Stop GIF</a>
        <a href="./target/external_animation_v1/previews/walk_east_full_sequence.gif">Full East Sequence GIF</a>
        <a href="./target/external_animation_v1/previews/walk_west_FULL_MIRRORED_FROM_EAST.gif">Mirrored West Sequence GIF</a>
        <a href="./target/external_animation_v1/reports/runtime-staging-report.json">Runtime Staging Report</a>
        <a href="./target/external_animation_v1/reports/metadata-inspection-report.json">Metadata Report</a>
        <a href="./docs/bai-mitko-external-animation-v1-benchmark.md">External Animation Benchmark</a>
      </div>
    `;
    return panel;
  }

  createSimpleAnimState() {
    return {
      x: 180,
      baselineY: 550,
      direction: "east",
      mode: "idle",
      moving: false,
      elapsed: 0,
      frameIndex: 0,
      speed: 60,
      fpsOverride: 0,
      background: "checker",
      showOverlays: this.readSimpleAnimOverlaySetting(),
      pendingStop: false,
      stopExitFrame: this.readSimpleStopExitFrame(),
      canExitToStop: false,
      sequence: null,
      debug: {},
      warnings: []
    };
  }

  readSimpleAnimOverlaySetting() {
    try {
      const value = localStorage.getItem("baimitko.simpleAnim.showOverlays");
      return value === "1";
    } catch {
      return false;
    }
  }

  writeSimpleAnimOverlaySetting(value) {
    try {
      localStorage.setItem("baimitko.simpleAnim.showOverlays", value ? "1" : "0");
    } catch {
      // localStorage is optional in test and privacy-restricted browser contexts.
    }
  }

  readSimpleStopExitFrame() {
    const params = new URLSearchParams(globalThis.location?.search || "");
    const value = Number(params.get("stopExitFrame"));
    if (Number.isInteger(value) && value >= 0) return value;
    return externalAnimationV1.walkParts?.east?.loop?.stopExitFrame ?? 0;
  }

  normalizedSimpleStopExitFrame(frame = this.simpleWalkPart("loop")) {
    const frameCount = Math.max(1, Number(frame?.frameCount) || 1);
    const value = Number(this.simpleAnim.stopExitFrame);
    if (!Number.isFinite(value)) return 0;
    return ((Math.trunc(value) % frameCount) + frameCount) % frameCount;
  }

  simpleWalkPart(part) {
    return externalAnimationV1.walkParts?.east?.[part] || null;
  }

  simpleIdleFrame() {
    const start = this.simpleWalkPart("start");
    return Renderer.holdFrameFromWalkStart(start);
  }

  simpleActionFrame(key) {
    const frame = externalAnimationV1.animations?.[key];
    return frame ? { ...frame, slot: `external_${key}` } : null;
  }

  simpleCurrentFrame() {
    if (this.simpleAnim.mode === "start") return this.simpleWalkPart("start");
    if (this.simpleAnim.mode === "loop") return this.simpleWalkPart("loop");
    if (this.simpleAnim.mode === "short") return this.simpleWalkPart("short");
    if (this.simpleAnim.mode === "stop") return this.simpleWalkPart("stop");
    if (this.simpleAnim.mode === "idle") return this.simpleIdleFrame();
    if (this.simpleAnim.mode?.startsWith("talk_") || this.simpleAnim.mode?.startsWith("reject_")) return this.simpleActionFrame(this.simpleAnim.mode);
    return null;
  }

  simpleCurrentKey() {
    const frame = this.simpleCurrentFrame();
    if (frame?.slot) return `${frame.slot}:${this.simpleAnim.direction}:${this.simpleAnim.mode}`;
    return `external_walk_east_start:${this.simpleAnim.direction}:${this.simpleAnim.mode}`;
  }

  setSimpleAnimMode(mode, options = {}) {
    this.simpleAnim.mode = mode;
    if (options.direction) this.simpleAnim.direction = options.direction;
    if (typeof options.moving === "boolean") this.simpleAnim.moving = options.moving;
    this.simpleAnim.sequence = options.sequence || null;
    const frame = this.simpleCurrentFrame();
    const fps = this.simpleAnimFps(frame);
    const initialFrame = options.reset === false ? this.simpleAnim.frameIndex : frame?.initialFrame ?? 0;
    this.simpleAnim.frameIndex = initialFrame;
    this.simpleAnim.elapsed = initialFrame / Math.max(1, fps);
    this.simpleAnim.canExitToStop = false;
  }

  resetSimpleAnim() {
    this.simpleAnim.x = this.createSimpleAnimState().x;
    this.renderUi();
  }

  startSimpleWalk(direction) {
    this.simpleAnim.pendingStop = false;
    this.simpleAnim.canExitToStop = false;
    if (this.simpleAnim.moving && (this.simpleAnim.mode === "start" || this.simpleAnim.mode === "loop")) {
      this.simpleAnim.direction = direction;
      this.simpleAnim.sequence = null;
      if (this.simpleAnim.mode === "start") this.setSimpleAnimMode("loop", { direction, moving: true, reset: false });
      return;
    }
    const start = this.simpleWalkPart("start");
    this.setSimpleAnimMode(start ? "start" : "loop", { direction, moving: true });
  }

  stopSimpleWalk() {
    const stop = this.simpleWalkPart("stop");
    if (!stop || this.simpleAnim.mode === "idle") {
      this.setSimpleAnimMode("idle", { moving: false });
      return;
    }
    if (this.simpleAnim.mode === "stop") return;
    this.simpleAnim.pendingStop = false;
    this.simpleAnim.canExitToStop = false;
    this.simpleAnim.moving = false;
    this.simpleAnim.sequence = null;
    this.simpleAnim.lastMoveMultiplier = 0;
    this.simpleAnim.lastMoveDx = 0;
    this.setSimpleAnimMode("stop", { direction: this.simpleAnim.direction, moving: false });
  }

  playSimplePart(part) {
    this.simpleAnim.pendingStop = false;
    this.simpleAnim.canExitToStop = false;
    this.setSimpleAnimMode(part, { direction: "east", moving: false });
  }

  playSimpleFullSequence(direction) {
    this.simpleAnim.direction = direction;
    this.simpleAnim.moving = false;
    this.simpleAnim.pendingStop = false;
    this.simpleAnim.canExitToStop = false;
    this.simpleAnim.sequence = {
      steps: [
        { mode: "idle", duration: 0.45 },
        { mode: "start" },
        { mode: "loop", loops: 3 },
        { mode: "stop" },
        { mode: "idle", duration: 0.45 }
      ],
      index: 0,
      loopFramesRemaining: 0
    };
    this.startSimpleSequenceStep();
  }

  startSimpleSequenceStep() {
    const sequence = this.simpleAnim.sequence;
    if (!sequence) return;
    const step = sequence.steps[sequence.index];
    if (!step) {
      this.setSimpleAnimMode("idle", { moving: false, direction: this.simpleAnim.direction });
      return;
    }
    this.simpleAnim.mode = step.mode;
    this.simpleAnim.moving = false;
    const frame = this.simpleCurrentFrame();
    const fps = this.simpleAnimFps(frame);
    const initialFrame = frame?.initialFrame ?? 0;
    this.simpleAnim.elapsed = initialFrame / Math.max(1, fps);
    this.simpleAnim.frameIndex = initialFrame;
    if (step.mode === "loop") {
      sequence.loopFramesRemaining = (frame?.frameCount || 1) * (step.loops || 1);
    }
  }

  advanceSimpleSequence() {
    const sequence = this.simpleAnim.sequence;
    if (!sequence) return;
    sequence.index += 1;
    this.startSimpleSequenceStep();
  }

  simpleAnimFps(frame) {
    return Number(this.simpleAnim.fpsOverride) > 0 ? Number(this.simpleAnim.fpsOverride) : frame?.fps || 16;
  }

  updateSimpleAnim(dt) {
    const state = this.simpleAnim;
    const frame = this.simpleCurrentFrame();
    const fps = this.simpleAnimFps(frame);
    let finished = false;
    if (frame) {
      state.elapsed += dt;
      const rawIndex = Math.floor(state.elapsed * fps);
      if (frame.loop) {
        state.frameIndex = rawIndex % Math.max(1, frame.frameCount);
      } else {
        state.frameIndex = Math.min(rawIndex, frame.frameCount - 1);
        finished = rawIndex >= frame.frameCount;
      }
    } else {
      state.elapsed += dt;
      state.frameIndex = 0;
    }

    if (state.moving) {
      if (state.mode === "start" && finished) {
        state.lastMoveMultiplier = 0;
        state.lastMoveDx = 0;
        this.setSimpleAnimMode("loop", { direction: state.direction, moving: true });
        return;
      }
      const activeFrame = this.simpleCurrentFrame();
      const multiplier = motionMultiplierAtFrame(activeFrame?.movementSpeedMultipliers, state.frameIndex, 1);
      if (multiplier <= 0) {
        state.lastMoveMultiplier = multiplier;
        state.lastMoveDx = 0;
        return;
      }
      const direction = state.direction === "west" ? -1 : 1;
      const dx = direction * state.speed * multiplier * dt;
      state.lastMoveMultiplier = multiplier;
      state.lastMoveDx = dx;
      state.x += dx;
      state.x = Math.max(180, Math.min(1100, state.x));
    } else {
      state.lastMoveMultiplier = 0;
      state.lastMoveDx = 0;
    }
    if (!state.moving && state.mode === "stop" && finished) {
      this.setSimpleAnimMode("idle", { direction: state.direction, moving: false });
    }

    if (state.sequence) this.updateSimpleSequence(finished, frame, dt);
  }

  updateSimpleSequence(finished, frame, dt) {
    const sequence = this.simpleAnim.sequence;
    const step = sequence.steps[sequence.index];
    if (!step) return;
    if (step.duration && this.simpleAnim.elapsed >= step.duration) {
      this.advanceSimpleSequence();
      return;
    }
    if (step.mode === "loop" && frame) {
      sequence.loopFramesRemaining -= dt * this.simpleAnimFps(frame);
      if (sequence.loopFramesRemaining <= 0) this.advanceSimpleSequence();
      return;
    }
    if (frame && !frame.loop && finished) this.advanceSimpleSequence();
  }

  renderSimpleAnimControls() {
    const start = this.simpleWalkPart("start");
    const loop = this.simpleWalkPart("loop");
    const short = this.simpleWalkPart("short");
    const stop = this.simpleWalkPart("stop");
    const talkShort = this.simpleActionFrame("talk_east_short_1");
    const talkLong1 = this.simpleActionFrame("talk_east_long_1");
    const talkLong2 = this.simpleActionFrame("talk_east_long_2");
    const reject = this.simpleActionFrame("reject_east_1");
    this.uiRoot.innerHTML = "";
    const panel = element("section", "simple-anim-controls");
    panel.innerHTML = `
      <div class="simple-anim-row">
        <button data-action="reset">Reset</button>
        <button data-action="idle-east">Idle East</button>
        <button data-action="walk-right" ${loop ? "" : "disabled"}>Walk Right</button>
        <button data-action="walk-left" ${loop ? "" : "disabled"}>Walk Left</button>
        <button data-action="stop" ${stop ? "" : "disabled"}>Stop</button>
      </div>
      <div class="simple-anim-row">
        <button data-action="start" ${start ? "" : "disabled"}>Play East Start</button>
        <button data-action="loop" ${loop ? "" : "disabled"}>Play East Loop</button>
        <button data-action="short" ${short ? "" : "disabled"}>Play East Short</button>
        <button data-action="stop-part" ${stop ? "" : "disabled"}>Play East Stop</button>
        <button data-action="full-east" ${start && loop && stop ? "" : "disabled"}>Play Full East Sequence</button>
        <button data-action="full-west" ${start && loop && stop ? "" : "disabled"}>Play Full West Sequence</button>
      </div>
      <div class="simple-anim-row">
        <button data-action="talk_east_short_1" ${talkShort ? "" : "disabled"}>Talk Short 1</button>
        <button data-action="talk_east_long_1" ${talkLong1 ? "" : "disabled"}>Talk Long 1</button>
        <button data-action="talk_east_long_2" ${talkLong2 ? "" : "disabled"}>Talk Long 2</button>
        <button data-action="reject_east_1" ${reject ? "" : "disabled"}>Reject 1</button>
      </div>
      <div class="simple-anim-row">
        <button data-action="clear-cache">Clear Cache + Reload</button>
      </div>
      <div class="simple-anim-row">
        <button data-bg="checker">Checker</button>
        <button data-bg="light">Light</button>
        <button data-bg="gray">Gray</button>
        <button data-bg="dark">Dark</button>
        <button data-bg="green">Green</button>
      </div>
      <label>movement speed <input data-control="speed" type="range" min="0" max="220" step="1" value="${this.simpleAnim.speed}"> <span>${this.simpleAnim.speed}px/s</span></label>
      <label>fps override <input data-control="fps" type="range" min="0" max="20" step="1" value="${this.simpleAnim.fpsOverride}"> <span>${this.simpleAnim.fpsOverride || "16 default"}</span></label>
      <label>stop exit frame <input data-control="stop-exit-frame" type="number" min="0" step="1" value="${this.simpleAnim.stopExitFrame}"> <span>${this.normalizedSimpleStopExitFrame(loop)}</span></label>
      <label><input data-control="overlays" type="checkbox" ${this.simpleAnim.showOverlays ? "checked" : ""}> show bounds/baseline overlays</label>
    `;
    panel.addEventListener("click", (event) => {
      const action = event.target?.dataset?.action;
      const background = event.target?.dataset?.bg;
      if (background) {
        this.simpleAnim.background = background;
        this.renderUi();
        return;
      }
      if (!action) return;
      if (action === "reset") this.resetSimpleAnim();
      if (action === "idle-east") this.setSimpleAnimMode("idle", { direction: "east", moving: false });
      if (action === "walk-right") this.startSimpleWalk("east");
      if (action === "walk-left") this.startSimpleWalk("west");
      if (action === "stop") this.stopSimpleWalk();
      if (action === "start") this.playSimplePart("start");
      if (action === "loop") this.playSimplePart("loop");
      if (action === "stop-part") this.playSimplePart("stop");
      if (action.startsWith("talk_") || action.startsWith("reject_")) this.playSimplePart(action);
      if (action === "full-east") this.playSimpleFullSequence("east");
      if (action === "full-west") this.playSimpleFullSequence("west");
      if (action === "clear-cache") {
        this.clearBrowserCachesAndReload();
        return;
      }
      this.renderUi();
    });
    panel.addEventListener("input", (event) => {
      const control = event.target?.dataset?.control;
      if (control === "speed") this.simpleAnim.speed = Number(event.target.value);
      if (control === "fps") this.simpleAnim.fpsOverride = Number(event.target.value);
      if (control === "stop-exit-frame") this.simpleAnim.stopExitFrame = Number(event.target.value);
      if (control === "overlays") {
        this.simpleAnim.showOverlays = event.target.checked;
        this.writeSimpleAnimOverlaySetting(this.simpleAnim.showOverlays);
      }
      this.renderUi();
    });
    this.uiRoot.appendChild(panel);
  }

  async clearBrowserCachesAndReload() {
    try {
      if (globalThis.caches?.keys) {
        const keys = await globalThis.caches.keys();
        await Promise.all(keys.map((key) => globalThis.caches.delete(key)));
      }
      globalThis.localStorage?.clear();
      globalThis.sessionStorage?.clear();
    } catch (error) {
      console.warn("[simpleAnim] cache clear failed; reloading anyway", error);
    } finally {
      globalThis.location?.reload();
    }
  }

  createPause() {
    const pause = element("section", "panel pause-menu");
    pause.innerHTML = `<h2>${this.t("ui.pause")}</h2>`;
    pause.append(
      button(this.t("ui.resume"), () => {
        this.paused = false;
        this.renderUi();
      }),
      button(this.t("ui.save"), () => {
        this.save();
        this.message = this.t("msg.scene_saved");
      }),
      button(this.t("ui.reset"), () => this.reset()),
      button("BG", () => this.setLanguage("bg")),
      button("EN", () => this.setLanguage("en"))
    );
    const quests = element("div", "quest-list");
    quests.innerHTML = `<h3>${this.t("ui.quests")}</h3>`;
    for (const quest of this.quests.active()) {
      const p = document.createElement("p");
      p.textContent = this.t(quest.titleKey);
      quests.appendChild(p);
    }
    pause.appendChild(quests);
    return pause;
  }

  createDialogue(node) {
    const panel = element("section", "dialogue-panel");
    const line = document.createElement("p");
    line.textContent = this.t(node.lineKey);
    panel.appendChild(line);
    for (const choice of node.choices || []) {
      panel.appendChild(button(this.t(choice.textKey), () => this.dialogue.choose(choice) || this.renderUi()));
    }
    return panel;
  }
}

function buildContentIndex(chapter) {
  return {
    scenes: Object.fromEntries(chapter.scenes.map((scene) => [scene.id, scene])),
    items: Object.fromEntries(chapter.items.map((item) => [item.id, item])),
    quests: Object.fromEntries(chapter.quests.map((quest) => [quest.id, quest])),
    dialogues: Object.fromEntries(chapter.dialogues.map((dialogue) => [dialogue.id, dialogue]))
  };
}

function element(tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function button(label, onClick) {
  const node = document.createElement("button");
  node.type = "button";
  node.textContent = label;
  node.addEventListener("click", onClick);
  return node;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
