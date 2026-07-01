import { DialogueSystem } from "./DialogueSystem.js";
import { InventorySystem } from "./InventorySystem.js";
import { Localization } from "./Localization.js";
import { eastWestFallbackFacing, MovementSystem } from "./MovementSystem.js";
import { QuestSystem } from "./QuestSystem.js";
import { Renderer } from "./Renderer.js";
import { SaveSystem } from "./SaveSystem.js";
import { AnimationPlayer } from "./AnimationPlayer.js";
import { AssetLoader } from "./AssetLoader.js";
import { DEFAULT_SAVE, LANGUAGES, VERBS } from "./ids.js";
import { findTargetAt, isWalkable } from "./SceneGeometry.js";
import { strings } from "../content/localization/index.js";
import { chapter1 } from "../content/chapter1/index.js";
import { characterDefinitions } from "../content/art/characters.js";
import { assetManifest } from "../content/art/assetManifest.js";
import { externalAnimationV1 } from "../content/art/externalAnimationV1.generated.js";

const verbs = [VERBS.LOOK, VERBS.TALK, VERBS.USE, VERBS.TAKE];
const CHARACTER_DISTANCE_SPEED_MULTIPLIER = 1.25;

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
    this.debugAnimation = this.readBooleanParam("debugAnimation");
    this.characterVariant = this.readCharacterVariant();
    this.characterDefinitions = characterDefinitions;
    this.assets = new AssetLoader(assetManifest);
    this.devHome = this.shouldShowDevHome();
    this.walkSpeedMultiplier = this.readNumberParam("walkSpeed", 1);
    this.selectedVerb = VERBS.LOOK;
    this.message = this.t("ui.hint");
    this.currentScene = this.resolveInitialScene();
    this.player = {
      id: "npc.bai_mitko",
      position: { ...this.currentScene.playerStart },
      target: null,
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
    const params = new URLSearchParams(globalThis.location?.search || "");
    this.menuOpen = !this.simpleAnimTest && !this.animLab && !this.devHome && params.get("play") !== "1" && !params.has("scene") && !params.has("debugGeometry");
    this.paused = false;
    this.lastTime = 0;
    this.bindInput();
    this.renderUi();
  }

  t(key, replacements) {
    return this.localization.t(key, replacements);
  }

  start() {
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
      this.movement.update(dt);
      this.player.animationTime += dt;
      this.player.animator.fpsOverride = this.currentAnimationFps();
      this.player.animator.frameCountOverride = this.currentAnimationFrameCount();
      this.player.animator.loopStartFrameOverride = this.currentAnimationLoopStartFrame();
      this.player.animator.initialFrameOverride = this.currentAnimationInitialFrame();
      this.player.animator.loopOverride = this.currentAnimationLoop();
      this.player.animator.play(this.player.animation, this.currentAnimationKey());
      this.player.animator.update(dt);
    }
    this.renderer.draw();
    requestAnimationFrame((next) => this.tick(next));
  }

  bindInput() {
    this.canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.cycleVerb();
    });
    this.canvas.addEventListener("pointerdown", (event) => {
      if (this.simpleAnimTest) return;
      if (event.button !== 0 || this.menuOpen || this.paused || this.dialogue.current) return;
      this.handleWorldClick(this.renderer.screenToWorld(event.clientX, event.clientY));
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

  currentAnimationFps() {
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
    if (this.player.animation === "walk") {
      const facing = eastWestFallbackFacing(this.player.facing) || this.player.facing || "south";
      const part = this.player.walkPart || "loop";
      const frame = this.currentAnimationFrame();
      return `${frame?.slot || "walk"}:${facing}:${part}`;
    }
    if (this.player.animation === "idle") return `idle:${this.player.facing || "south"}`;
    return this.player.animation;
  }

  currentAnimationFrameCount() {
    if (this.player.animation !== "walk") return null;
    return this.currentAnimationFrame()?.frameCount || null;
  }

  currentAnimationLoopStartFrame() {
    if (this.player.animation !== "walk") return null;
    return this.currentAnimationFrame()?.loopStartFrame ?? null;
  }

  currentAnimationInitialFrame() {
    if (this.player.animation !== "walk") return null;
    return this.currentAnimationFrame()?.initialFrame ?? null;
  }

  currentAnimationLoop() {
    if (this.player.animation !== "walk") return null;
    const frame = this.currentAnimationFrame();
    return frame ? Boolean(frame.loop) : null;
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
    if (params.has("simpleAnimTest") || params.has("animLab") || params.has("scene") || params.has("debugGeometry") || params.has("characterVariant")) return false;
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

  handleWorldClick(point) {
    const target = findTargetAt(this.currentScene, point);
    if (target) {
      this.handleTarget(target);
      return;
    }
    if (isWalkable(this.currentScene, point)) {
      this.movement.walkTo(point);
      this.message = this.t("msg.walk");
    }
  }

  handleTarget(target) {
    if (target.kind === "exit") {
      this.changeScene(target.targetSceneId, target.targetPosition);
      return;
    }
    if (this.selectedVerb === VERBS.LOOK) {
      this.message = this.t(target.lookKey || target.nameKey);
      return;
    }
    if (this.selectedVerb === VERBS.TALK) {
      if (target.dialogueId) {
        this.dialogue.start(target.dialogueId);
        this.player.speaking = true;
        this.renderUi();
      } else {
        this.message = this.t("msg.need_talk");
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
    this.message = this.t("msg.no_use");
  }

  takeTarget(target) {
    if (this.inventory.has(target.takeItemId)) {
      this.message = this.t("msg.already_taken");
      return;
    }
    this.inventory.add(target.takeItemId);
    if (target.flagOnTake) this.state[target.flagOnTake] = true;
    this.message = this.t("msg.taken");
    this.save();
  }

  useTarget(target) {
    if (target.id === "hotspot.mehana.oil" && this.inventory.has("item.sunflower_oil")) {
      this.state.drankOilBeforeTonyChallenge = true;
      this.message = this.t("msg.oil_used");
      this.save();
      return;
    }
    if (target.id === "npc.tony_fridge" && this.inventory.has("item.accordion")) {
      this.state.flags.tonyDistracted = true;
      this.message = this.t("msg.accordion_tony");
      this.save();
      return;
    }
    if (target.id === "hotspot.mehana.water_jug" && this.state.flags.tonyChallengeStarted) {
      if (!this.state.flags.tonyDistracted) {
        this.message = this.t("msg.water_swap_missing");
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
      this.message = this.t("msg.water_swap_success");
      this.save();
      return;
    }
    this.message = this.t("msg.no_use");
  }

  applyDialogueEffect(effect) {
    if (effect === "tonyChallengeStarted") {
      this.state.flags.tonyChallengeStarted = true;
      this.message = this.t("dialogue.tony.challenge");
    }
    if (effect === "tonyChallengeRefused") {
      this.state.suspicion += 3;
    }
    this.player.speaking = false;
    this.dialogue.close();
    this.save();
    this.renderUi();
  }

  changeScene(sceneId, position) {
    if (!this.content.scenes[sceneId]) {
      this.message = this.t("msg.scene_not_ready");
      return;
    }
    this.currentScene = this.content.scenes[sceneId];
    this.state.currentSceneId = sceneId;
    this.player.position = { ...(position || this.currentScene.playerStart) };
    this.player.target = null;
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
    this.message = this.t("ui.hint");
    this.menuOpen = true;
    this.paused = false;
    this.renderUi();
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
    if (this.devHome) this.uiRoot.appendChild(this.createDevHome());
    if (this.menuOpen) this.uiRoot.appendChild(this.createMenu());
    if (this.paused) this.uiRoot.appendChild(this.createPause());
    if (dialogueNode) this.uiRoot.appendChild(this.createDialogue(dialogueNode));
    this.uiRoot.appendChild(this.createTopBar());
  }

  createTopBar() {
    const bar = element("div", "top-bar");
    bar.append(
      button(this.t("verb.look"), () => (this.selectedVerb = VERBS.LOOK)),
      button(this.t("verb.talk"), () => (this.selectedVerb = VERBS.TALK)),
      button(this.t("verb.use"), () => (this.selectedVerb = VERBS.USE)),
      button(this.t("verb.take"), () => (this.selectedVerb = VERBS.TAKE)),
      button("BG", () => this.setLanguage("bg")),
      button("EN", () => this.setLanguage("en"))
    );
    return bar;
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
          <span>active Bai Mitko animation import path. East start/loop/stop only; west mirrors east. North/south/diagonals deferred.</span>
          <a href="./?animLab=1">Open animLab external section</a>
          <a href="./?simpleAnimTest=1">Open simple animation test</a>
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
      baselineY: 600,
      direction: "east",
      mode: "idle",
      moving: false,
      elapsed: 0,
      frameIndex: 0,
      speed: 60,
      fpsOverride: 0,
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

  simpleCurrentFrame() {
    if (this.simpleAnim.mode === "start") return this.simpleWalkPart("start");
    if (this.simpleAnim.mode === "loop") return this.simpleWalkPart("loop");
    if (this.simpleAnim.mode === "stop") return this.simpleWalkPart("stop");
    if (this.simpleAnim.mode === "idle") return this.simpleIdleFrame();
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
      if (state.mode === "start" && finished) this.setSimpleAnimMode("loop", { direction: state.direction, moving: true });
      const activeFrame = this.simpleCurrentFrame();
      const multipliers = activeFrame?.movementSpeedMultipliers || [];
      const value = Number(multipliers[state.frameIndex % Math.max(1, multipliers.length)]);
      const multiplier = Number.isFinite(value) && value >= 0 ? value : 1;
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
    const stop = this.simpleWalkPart("stop");
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
        <button data-action="stop-part" ${stop ? "" : "disabled"}>Play East Stop</button>
        <button data-action="full-east" ${start && loop && stop ? "" : "disabled"}>Play Full East Sequence</button>
        <button data-action="full-west" ${start && loop && stop ? "" : "disabled"}>Play Full West Sequence</button>
      </div>
      <div class="simple-anim-row">
        <button data-action="clear-cache">Clear Cache + Reload</button>
      </div>
      <label>movement speed <input data-control="speed" type="range" min="0" max="220" step="1" value="${this.simpleAnim.speed}"> <span>${this.simpleAnim.speed}px/s</span></label>
      <label>fps override <input data-control="fps" type="range" min="0" max="20" step="1" value="${this.simpleAnim.fpsOverride}"> <span>${this.simpleAnim.fpsOverride || "16 default"}</span></label>
      <label>stop exit frame <input data-control="stop-exit-frame" type="number" min="0" step="1" value="${this.simpleAnim.stopExitFrame}"> <span>${this.normalizedSimpleStopExitFrame(loop)}</span></label>
      <label><input data-control="overlays" type="checkbox" ${this.simpleAnim.showOverlays ? "checked" : ""}> show bounds/baseline overlays</label>
    `;
    panel.addEventListener("click", (event) => {
      const action = event.target?.dataset?.action;
      if (!action) return;
      if (action === "reset") this.resetSimpleAnim();
      if (action === "idle-east") this.setSimpleAnimMode("idle", { direction: "east", moving: false });
      if (action === "walk-right") this.startSimpleWalk("east");
      if (action === "walk-left") this.startSimpleWalk("west");
      if (action === "stop") this.stopSimpleWalk();
      if (action === "start") this.playSimplePart("start");
      if (action === "loop") this.playSimplePart("loop");
      if (action === "stop-part") this.playSimplePart("stop");
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
