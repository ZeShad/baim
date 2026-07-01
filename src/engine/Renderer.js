import { clamp } from "./geometry.js";
import { characterHeight } from "./CharacterRenderMath.js";
import { canExitToStop, eastWestFallbackFacing, stopExitFrameForPlayer } from "./MovementSystem.js";
import { externalAnimationV1 } from "../content/art/externalAnimationV1.generated.js";

export function stopRenderOffsetX(frame, frameIndex, mirrored = false) {
  const startOffset = Number(frame?.stopRenderOffsetXStart);
  if (!Number.isFinite(startOffset) || !frame || frame.role !== "stop") return 0;
  const startFrame = Math.max(0, Math.min(Number(frame.initialFrame) || 0, Math.max(0, frame.frameCount - 1)));
  const endFrame = Math.max(startFrame + 1, frame.frameCount - 1);
  const progress = Math.max(0, Math.min(1, (frameIndex - startFrame) / Math.max(1, endFrame - startFrame)));
  if (progress >= 1) return 0;
  const direction = mirrored ? -1 : 1;
  const offset = direction * startOffset * (1 - progress);
  return offset === 0 ? 0 : offset;
}

function usesExternalWalkPose(player, definition) {
  return player?.id === "npc.bai_mitko" && definition?.animationSource === "external_animation_v1";
}

export function stableExternalVisualBounds(definition) {
  const bounds = [];
  for (const parts of Object.values(definition?.animations?.walk?.parts || {})) {
    for (const frame of Object.values(parts || {})) {
      if (frame?.role === "loop") continue;
      const isFullFrame = (bound) => bound && frame?.frameWidth && frame?.frameHeight
        && bound.w >= frame.frameWidth * 0.98 && bound.h >= frame.frameHeight * 0.98;
      if (frame?.contentBounds && !isFullFrame(frame.contentBounds)) bounds.push(frame.contentBounds);
      if (Array.isArray(frame?.sourceFrameContentBounds)) bounds.push(...frame.sourceFrameContentBounds.filter((bound) => !isFullFrame(bound)));
    }
  }
  if (!bounds.length) return null;
  return {
    w: Math.max(...bounds.map((bound) => bound.w || 0)),
    h: Math.max(...bounds.map((bound) => bound.h || 0)),
    baselineY: Math.max(...bounds.map((bound) => (bound.y || 0) + (bound.h || 0))) - 40
  };
}

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.game = game;
    this.lastArtLogByScene = new Map();
    this.stripValidationLog = new Map();
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((clientY - rect.top) / rect.height) * this.canvas.height
    };
  }

  draw() {
    const { ctx } = this;
    if (this.game.simpleAnimTest) {
      this.drawSimpleAnimTest();
      return;
    }
    if (this.game.animLab) {
      this.drawAnimLab();
      return;
    }
    const scene = this.game.currentScene;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const hasRealBackground = this.drawBackground(scene);
    if (this.game.debugSceneGeometry || !hasRealBackground) this.drawSceneGeometry(scene);
    this.drawActors([this.game.player]);
    this.drawHud();
  }

  drawSimpleAnimTest() {
    const { ctx } = this;
    const state = this.game.simpleAnim;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "#d7d2c8";
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let y = 0; y < 720; y += 32) {
      for (let x = 0; x < 1280; x += 32) {
        if ((x / 32 + y / 32) % 2 === 0) ctx.fillRect(x, y, 32, 32);
      }
    }
    ctx.strokeStyle = "#736a5e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(80, state.baselineY);
    ctx.lineTo(1200, state.baselineY);
    ctx.stroke();

    const frame = this.game.simpleCurrentFrame();
    const mirrored = state.direction === "west";
    const slot = frame?.slot || "external_walk_east_start";
    const image = this.game.assets.getCharacterImage("npc.bai_mitko", slot);
    const warnings = [];
    if (!image) warnings.push(`missing asset slot: ${slot}`);
    let drawInfo = { drawX: 0, drawY: 0, sourceRect: null, baselineY: "n/a", anchor: "n/a" };

    if (image) {
      if (frame) {
        const frameIndex = state.frameIndex % Math.max(1, frame.frameCount);
        const bounds = this.frameContentBounds(frame, frameIndex);
        const scale = 500 / frame.frameHeight;
        const width = frame.frameWidth * scale;
        const height = frame.frameHeight * scale;
        const renderOffsetX = stopRenderOffsetX(frame, frameIndex, mirrored);
        const drawX = state.x + renderOffsetX - width * (frame.anchorX ?? frame.anchor?.x ?? 0.5);
        const drawY = state.baselineY - (frame.baselineY || frame.frameHeight) * scale;
        const shadowWidth = (frame.contentBounds?.w || bounds.w) * scale;
        this.drawSimpleShadow(state.x, state.baselineY, shadowWidth);
        this.drawFrameImage(image, frameIndex, frame, bounds, drawX, drawY, width, height, mirrored);
        const sourceRect = this.frameSourceRect(frame, frameIndex, bounds);
        drawInfo = {
          drawX,
          drawY,
          sourceRect,
          baselineY: frame.baselineY,
          anchor: `${frame.anchorX ?? frame.anchor?.x ?? 0.5},${frame.anchorY ?? frame.anchor?.y ?? 1}`,
          width,
          height,
          renderOffsetX
        };
        if (state.showOverlays) this.drawSimpleOverlays(drawX, drawY, width, height, state.baselineY, sourceRect);
      } else {
        const height = 500;
        const width = height * (image.naturalWidth / image.naturalHeight);
        const drawX = state.x - width * 0.5;
        const drawY = state.baselineY - height;
        this.drawSimpleShadow(state.x, state.baselineY, width * 0.55);
        if (mirrored) {
          ctx.save();
          ctx.translate(drawX + width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(image, 0, drawY, width, height);
          ctx.restore();
        } else {
          ctx.drawImage(image, drawX, drawY, width, height);
        }
        drawInfo = { drawX, drawY, sourceRect: null, baselineY: "idle", anchor: "0.5,1", width, height };
        if (state.showOverlays) this.drawSimpleOverlays(drawX, drawY, width, height, state.baselineY, null);
      }
    }

    state.debug = { drawInfo, warnings };
    this.drawSimpleDebug(frame, slot, mirrored, drawInfo, warnings);
  }

  static resolveIdleWalkFrameForDefinition(player, definition, facing) {
    return Renderer.resolveExternalWalkStartFrameForDefinition(player, definition, facing);
  }

  static resolveExternalWalkStartFrameForDefinition(player, definition, facing) {
    const walk = definition.animations.walk;
    const partsByFacing = player.walkPartsByFacing || walk.parts || {};
    if (walk.type === "phasedStrip" && Object.keys(partsByFacing).length) {
      const direction = eastWestFallbackFacing(facing) || "east";
      const frame = partsByFacing?.[direction]?.start || partsByFacing?.east?.start;
      if (!frame?.slot) return null;
      return { facing, frameIndex: 0, frame: Renderer.holdFrameFromWalkStart(frame), slot: frame.slot, mirrored: Boolean(frame.mirrored) };
    }
    return null;
  }

  static holdFrameFromWalkStart(frame) {
    if (!frame?.sourceFrameRects?.[0]) return frame;
    return {
      ...frame,
      role: "hold",
      loop: false,
      frameCount: 1,
      initialFrame: 0,
      frameStart: 0,
      frameEndTrim: 0,
      frameRects: [frame.sourceFrameRects[0]],
      frameContentBounds: frame.sourceFrameContentBounds?.[0] ? [frame.sourceFrameContentBounds[0]] : undefined,
      contentBounds: frame.sourceFrameContentBounds?.[0] || frame.contentBounds,
      movementSpeedMultipliers: [0],
      stopRenderOffsetXStart: 0
    };
  }

  drawSimpleShadow(x, y, width) {
    const { ctx } = this;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y + 4, Math.max(40, width * 0.3), 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSimpleOverlays(drawX, drawY, width, height, baselineY, sourceRect) {
    const { ctx } = this;
    ctx.strokeStyle = "rgba(210, 50, 50, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(drawX, drawY, width, height);
    ctx.strokeStyle = "rgba(40, 105, 220, 0.9)";
    ctx.beginPath();
    ctx.moveTo(drawX - 30, baselineY);
    ctx.lineTo(drawX + width + 30, baselineY);
    ctx.stroke();
    if (sourceRect) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(drawX, drawY - 18, 150, 16);
      ctx.fillStyle = "#fff";
      ctx.font = "12px Arial";
      ctx.fillText(`src ${sourceRect.x},${sourceRect.y}`, drawX + 4, drawY - 6);
    }
  }

  drawSimpleDebug(frame, slot, mirrored, drawInfo, warnings) {
    const { ctx } = this;
    const state = this.game.simpleAnim;
    const sourceRect = drawInfo.sourceRect ? `${drawInfo.sourceRect.x},${drawInfo.sourceRect.y},${drawInfo.sourceRect.w},${drawInfo.sourceRect.h}` : "static";
    const lines = [
      `mode: ${state.mode}`,
      `direction: ${state.direction}`,
      `x: ${state.x.toFixed(1)}`,
      `moving: ${state.moving}`,
      `animation key: ${this.game.simpleCurrentKey()}`,
      `frame: ${state.frameIndex}/${frame?.frameCount || 1}`,
      `fps: ${this.game.simpleAnimFps(frame)}`,
      `elapsed: ${state.elapsed.toFixed(2)}`,
      `move multiplier: ${(state.lastMoveMultiplier || 0).toFixed(3)}`,
      `dx/frame: ${(state.lastMoveDx || 0).toFixed(3)}`,
      `pendingStop: ${Boolean(state.pendingStop)}`,
      `stopExitFrame: ${this.game.normalizedSimpleStopExitFrame()}`,
      `canExitToStop: ${Boolean(state.canExitToStop)}`,
      `loop: ${frame ? Boolean(frame.loop) : false}`,
      `mirrored: ${mirrored}`,
      `render offset x: ${(drawInfo.renderOffsetX || 0).toFixed(1)}`,
      `draw: ${drawInfo.drawX.toFixed(1)},${drawInfo.drawY.toFixed(1)}`,
      `baselineY: ${drawInfo.baselineY}`,
      `anchor: ${drawInfo.anchor}`,
      `source rect: ${sourceRect}`,
      `slot: ${slot}`
    ];
    if (state.pendingStop) lines.push(`Stop requested, waiting for loop exit frame ${this.game.normalizedSimpleStopExitFrame()}.`);
    ctx.fillStyle = "rgba(20, 18, 14, 0.78)";
    ctx.fillRect(6, 6, 430, 406 + warnings.length * 18);
    ctx.fillStyle = "#f5ead5";
    ctx.font = "14px Consolas, monospace";
    lines.forEach((line, index) => ctx.fillText(line, 18, 30 + index * 18));
    if (warnings.length) {
      ctx.fillStyle = "#ff6c5d";
      warnings.forEach((warning, index) => ctx.fillText(`warning: ${warning}`, 18, 422 + index * 18));
    }
  }

  drawBackground(scene) {
    const { ctx } = this;
    const path = this.game.assets.getSceneAssetPath(scene.id, "background");
    const background = this.game.assets.getSceneImage(scene.id, "background");
    if (this.game.assets.isLoaded(background)) {
      this.logArtStatus(scene.id, path, "loaded", false);
      ctx.drawImage(background, 0, 0, 1280, 720);
      return true;
    }

    const status = this.game.assets.getImageStatus(background);
    this.logArtStatus(scene.id, path, status, true);

    const gradient = ctx.createLinearGradient(0, 0, 0, 720);
    gradient.addColorStop(0, scene.palette.sky);
    gradient.addColorStop(0.55, scene.palette.wall);
    gradient.addColorStop(1, scene.palette.floor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);

    ctx.fillStyle = "rgba(20, 18, 14, 0.5)";
    ctx.fillRect(0, 520, 1280, 200);
    ctx.fillStyle = "#efe0bd";
    ctx.font = "700 32px Arial";
    ctx.fillText(this.game.t(scene.titleKey), 36, 54);
    ctx.font = "18px Arial";
    ctx.fillText("Painted background placeholder: replace with 1280x720 or 2560x1440 art", 36, 84);
    return false;
  }

  logArtStatus(sceneId, path, status, usingPlaceholder) {
    if (!this.game.debugSceneGeometry) return;
    const key = `${path || "missing"}:${status}:${usingPlaceholder}`;
    if (this.lastArtLogByScene.get(sceneId) === key) return;
    this.lastArtLogByScene.set(sceneId, key);

    if (status === "true" || status === "loaded") {
      console.info(`[art] ${sceneId} background: loaded ${path}`);
      return;
    }
    if (status === "error") {
      console.warn(`[art] ${sceneId} background: missing ${path} -> using placeholder`);
      return;
    }
    if (!path) {
      console.warn(`[art] ${sceneId} background: missing manifest path -> using placeholder`);
      return;
    }
    console.info(`[art] ${sceneId} background: loading ${path} -> using placeholder`);
  }

  drawSceneGeometry(scene) {
    const { ctx } = this;
    ctx.save();
    for (const zone of scene.depthZones || []) {
      ctx.fillStyle = "rgba(102, 180, 255, 0.08)";
      ctx.fillRect(0, zone.yMin, 1280, zone.yMax - zone.yMin);
      ctx.strokeStyle = "rgba(102, 180, 255, 0.4)";
      ctx.strokeRect(0, zone.yMin, 1280, zone.yMax - zone.yMin);
    }
    for (const polygon of scene.walkPolygons || []) {
      ctx.beginPath();
      polygon.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(91, 214, 120, 0.12)";
      ctx.fill();
      ctx.strokeStyle = "rgba(91, 214, 120, 0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    for (const hotspot of [...scene.exits, ...scene.interactables, ...scene.npcs]) {
      const rect = hotspot.rect;
      ctx.strokeStyle = hotspot.kind === "exit" ? "rgba(114, 188, 255, 0.85)" : "rgba(255, 214, 102, 0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(rect.x, rect.y - 24, Math.max(110, rect.w), 22);
      ctx.fillStyle = "#fff3cf";
      ctx.font = "14px Arial";
      ctx.fillText(this.game.t(hotspot.nameKey), rect.x + 6, rect.y - 8);
    }
    for (const [name, point] of Object.entries(scene.anchors || {})) {
      ctx.fillStyle = "rgba(255, 89, 89, 0.95)";
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff3cf";
      ctx.font = "12px Arial";
      ctx.fillText(name, point.x + 8, point.y - 8);
    }
    ctx.restore();
  }

  drawActors(actors) {
    for (const actor of [...actors].sort((a, b) => a.position.y - b.position.y)) {
      this.drawPlayer(actor);
    }
  }

  drawPlayer(actor = this.game.player) {
    const { ctx } = this;
    const p = actor;
    const definition = this.game.player.animator.definition;
    const spriteInfo = this.resolveCharacterSprite(p, definition);
    const sprite = spriteInfo.image;
    const walkBob = p.animation === "walk" ? Math.sin(p.animationTime * 16) * 5 : 0;
    if (!sprite) return;
    const height = characterHeight(definition, this.game.currentScene, p.position);
    const preserveFrameLayout = Boolean(spriteInfo.frame?.usesOriginalLudoLayout || spriteInfo.frame?.frameRects?.length);
    const boundsForSize = spriteInfo.frame?.contentBounds || null;
    const sourceWidth = preserveFrameLayout && spriteInfo.frame ? spriteInfo.frame.frameWidth : boundsForSize?.w || spriteInfo.frame?.frameWidth || sprite.width;
    const sourceHeight = preserveFrameLayout && spriteInfo.frame ? spriteInfo.frame.frameHeight : boundsForSize?.h || spriteInfo.frame?.frameHeight || sprite.height;
    const stableBounds = preserveFrameLayout && usesExternalWalkPose(p, definition) ? stableExternalVisualBounds(definition) : null;
    const visualHeight = stableBounds?.h || (preserveFrameLayout ? sourceHeight : boundsForSize?.h || sourceHeight);
    const scale = height / visualHeight;
    const width = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const anchor = spriteInfo.frame?.anchor || definition.render.anchor;
    const useRealWalk = p.animation === "walk" && spriteInfo.frame;
    const verticalOffset = useRealWalk ? 0 : walkBob;
    const frameIndex = spriteInfo.frame
      ? Number.isInteger(spriteInfo.staticFrameIndex) ? spriteInfo.staticFrameIndex : this.game.player.animator.frameIndex % spriteInfo.frame.frameCount
      : 0;
    const renderOffsetX = stopRenderOffsetX(spriteInfo.frame, frameIndex, spriteInfo.mirrored);
    const drawX = p.position.x + renderOffsetX - width * anchor.x;
    const baselineOffset = preserveFrameLayout && spriteInfo.frame
      ? stableBounds?.baselineY || spriteInfo.frame.baselineY || sourceHeight
      : spriteInfo.frame?.baselineY && boundsForSize ? spriteInfo.frame.baselineY - boundsForSize.y : sourceHeight * anchor.y;
    const drawY = p.position.y - baselineOffset * scale + verticalOffset;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
    ctx.beginPath();
    const shadowWidth = (stableBounds?.w || boundsForSize?.w || sourceWidth) * scale;
    ctx.ellipse(p.position.x, p.position.y + 2, shadowWidth * 0.3, Math.max(6, height * 0.035), 0, 0, Math.PI * 2);
    ctx.fill();
    if (spriteInfo.frame) {
      if (p.animation === "walk") {
        p.lastWalkFrame = {
          facing: p.facing,
          frameIndex,
          frame: spriteInfo.frame,
          slot: spriteInfo.slot,
          mirrored: Boolean(spriteInfo.mirrored)
        };
      }
      const bounds = preserveFrameLayout
        ? { x: 0, y: 0, w: spriteInfo.frame.frameWidth, h: spriteInfo.frame.frameHeight }
        : this.frameContentBounds(spriteInfo.frame, frameIndex);
      this.drawFrameImage(sprite, frameIndex, spriteInfo.frame, bounds, drawX, drawY, width, drawHeight, spriteInfo.mirrored);
    } else if (spriteInfo.mirrored) {
      ctx.save();
      ctx.translate(drawX + width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, drawY, width, drawHeight);
      ctx.restore();
    } else {
      ctx.drawImage(sprite, drawX, drawY, width, drawHeight);
    }
    if (this.game.debugSceneGeometry || this.game.debugAnimation) this.drawCharacterDebug(p, drawX, drawY, width, drawHeight, visualHeight, spriteInfo.slot, spriteInfo.frame, spriteInfo.mirrored, renderOffsetX);
    ctx.restore();
  }

  resolveCharacterSprite(player, definition) {
    const animation = definition.animations[player.animation] || definition.animations.idle;
    const facing = player.facing || definition.render.defaultFacing;
    if (usesExternalWalkPose(player, definition) && player.animation !== "walk") {
      const frameInfo = this.resolveExternalWalkStartFrame(player, definition, facing);
      if (frameInfo?.slot) {
        const image = this.game.assets.getCharacterImage(player.id, frameInfo.slot);
        return { image, slot: frameInfo.slot, frame: frameInfo.frame, mirrored: Boolean(frameInfo.mirrored), staticFrameIndex: frameInfo.frameIndex };
      }
      return { image: null, slot: frameInfo?.slot || "external_walk_east_start" };
    }
    if (player.animation === "idle") {
      const frameInfo = this.resolveIdleWalkFrame(player, definition, facing);
      if (frameInfo?.slot) {
        const image = this.game.assets.getCharacterImage(player.id, frameInfo.slot);
        return { image, slot: frameInfo.slot, frame: frameInfo.frame, mirrored: Boolean(frameInfo.mirrored), staticFrameIndex: frameInfo.frameIndex };
      }
    }
    if (animation?.type === "phasedStrip" && Object.keys(player.walkPartsByFacing || {}).length) {
      const frame = this.resolveWalkPartFrame(player, definition, facing);
      if (frame?.slot) {
        const strip = this.game.assets.getCharacterImage(player.id, frame.slot);
        return { image: strip, slot: frame.slot, frame, mirrored: Boolean(frame.mirrored) };
      }
    } else if (animation?.type === "strip") {
      const frame = this.resolveStripFrame(animation, facing);
      if (frame?.slot) {
        const strip = this.game.assets.getCharacterImage(player.id, frame.slot);
        return { image: strip, slot: frame.slot, frame, mirrored: Boolean(frame.mirrored) };
      }
    } else {
      const preferredSlot = animation?.directions?.[facing];
      const preferredInfo = this.resolveDirectionalImage(preferredSlot);
      const preferred = this.game.assets.getCharacterImage(player.id, preferredInfo?.slot);
      if (preferredInfo?.slot) return { image: preferred, slot: preferredInfo.slot, mirrored: preferredInfo.mirrored };
    }

    const idleSlot = this.resolveIdleSlot(definition, facing);
    const idle = this.game.assets.getCharacterImage(player.id, idleSlot?.slot);
    if (idleSlot?.slot) return { image: idle, slot: idleSlot.slot, mirrored: idleSlot.mirrored };

    const fallback = this.game.assets.getCharacterImage(player.id, "idle");
    return { image: fallback, slot: "idle" };
  }

  resolveIdleWalkFrame(player, definition, facing) {
    const externalIdle = Renderer.resolveIdleWalkFrameForDefinition(player, definition, facing);
    if (externalIdle) return externalIdle;
    const walk = definition.animations.walk;
    const frame = walk.type === "phasedStrip" && Object.keys(player.walkPartsByFacing || {}).length
      ? this.resolveWalkPartFrame({ ...player, walkPart: "start" }, definition, facing) || this.resolveWalkPartFrame({ ...player, walkPart: "start" }, definition, "east")
      : this.resolveStripFrame(walk, facing) || this.resolveStripFrame(walk, definition.render.defaultFacing) || this.resolveStripFrame(walk, "east");
    if (!frame?.slot) return null;
    const frameIndex = Math.min(0, Math.max(0, frame.frameCount - 1));
    return { facing, frameIndex, frame, slot: frame.slot, mirrored: Boolean(frame.mirrored) };
  }

  resolveExternalWalkStartFrame(player, definition, facing) {
    return Renderer.resolveExternalWalkStartFrameForDefinition(player, definition, facing);
  }

  resolveWalkPartFrame(player, definition, facing) {
    const direction = eastWestFallbackFacing(facing);
    if (!direction) return null;
    const part = player.walkPart || "loop";
    const frame = definition.animations.walk.parts?.[direction]?.[part] || definition.animations.walk.parts?.[direction]?.loop;
    if (!frame?.slot) return null;
    return { ...frame, loop: Boolean(frame.loop), resolvedFrom: `${direction}.${part}`, mirrored: Boolean(frame.mirrored) };
  }

  resolveStripFrame(animation, facing) {
    const frame = animation.directions?.[facing];
    if (!frame) return null;
    if (frame.slot) return { ...frame, fps: frame.fps || animation.fps, loop: animation.loop, resolvedFrom: facing, mirrored: Boolean(frame.mirrored) };
    if (frame.fallback) {
      const fallback = this.resolveStripFrame(animation, frame.fallback);
      return fallback ? { ...fallback, requestedFacing: facing } : null;
    }
    return null;
  }

  resolveIdleSlot(definition, facing) {
    const directions = definition.animations.idle.directions;
    if (directions[facing]) return this.resolveDirectionalImage(directions[facing]);
    const fallbackFacing = {
      south_east: "east",
      north_east: "east",
      south_west: "west",
      north_west: "west"
    }[facing] || definition.render.defaultFacing;
    return this.resolveDirectionalImage(directions[fallbackFacing] || directions[definition.render.defaultFacing]);
  }

  resolveDirectionalImage(entry) {
    if (!entry) return null;
    if (typeof entry === "string") return { slot: entry, mirrored: false };
    if (entry.slot) return { slot: entry.slot, mirrored: Boolean(entry.mirrored) };
    return null;
  }

  drawFrameImage(image, frameIndex, frame, bounds, drawX, drawY, width, height, mirrored = false) {
    const { ctx } = this;
    const sourceRect = this.frameSourceRect(frame, frameIndex, bounds);
    if (mirrored) {
      ctx.save();
      ctx.translate(drawX + width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(
        image,
        sourceRect.x,
        sourceRect.y,
        sourceRect.w,
        sourceRect.h,
        0,
        drawY,
        width,
        height
      );
      ctx.restore();
      return;
    }
    ctx.drawImage(
      image,
      sourceRect.x,
      sourceRect.y,
      sourceRect.w,
      sourceRect.h,
      drawX,
      drawY,
      width,
      height
    );
  }

  frameSourceRect(frame, frameIndex, bounds = null) {
    const rect = frame.frameRects?.[frameIndex];
    if (rect) {
      const b = bounds || { x: 0, y: 0, w: rect.w, h: rect.h };
      return { x: rect.x + b.x, y: rect.y + b.y, w: b.w, h: b.h };
    }
    const b = bounds || frame.contentBounds || { x: 0, y: 0, w: frame.frameWidth, h: frame.frameHeight };
    return { x: frameIndex * frame.frameWidth + b.x, y: b.y, w: b.w, h: b.h };
  }

  frameContentBounds(frame, frameIndex) {
    if (frame.frameRects?.[frameIndex]) return { x: 0, y: 0, w: frame.frameRects[frameIndex].w, h: frame.frameRects[frameIndex].h };
    return frame.contentBounds || { x: 0, y: 0, w: frame.frameWidth, h: frame.frameHeight };
  }

  drawCharacterDebug(player, drawX, drawY, width, height, sourceHeight, slot, frame, mirrored = false, renderOffsetX = 0) {
    const { ctx } = this;
    ctx.strokeStyle = "rgba(255, 80, 80, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(drawX, drawY, width, height);
    ctx.fillStyle = "rgba(255, 40, 40, 0.95)";
    ctx.beginPath();
    ctx.arc(player.position.x, player.position.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff3cf";
    ctx.font = "12px Arial";
    const renderedHeight = height.toFixed(1);
    const scale = (height / sourceHeight).toFixed(3);
    const frameIndex = frame ? this.game.player.animator.frameIndex : 0;
    const fallback = frame?.resolvedFrom && frame.resolvedFrom !== player.facing ? `->${frame.resolvedFrom}` : "";
    const debugRect = frame ? this.frameSourceRect(frame, frameIndex, this.frameContentBounds(frame, frameIndex)) : null;
    const sourceRect = debugRect ? `${debugRect.x},${debugRect.y},${debugRect.w},${debugRect.h}` : "static";
    const animator = this.game.player.animator;
    const frameCount = frame?.frameCount || 1;
    const fps = animator.fpsOverride || frame?.fps || "n/a";
    const elapsed = animator.elapsed?.toFixed ? animator.elapsed.toFixed(2) : "0.00";
    const reset = animator.resetThisTick ? animator.resetReason || "yes" : "no";
    const pendingStop = Boolean(player.pendingStop);
    const stopExitFrame = stopExitFrameForPlayer(player);
    const canExit = canExitToStop(player);
    ctx.fillText(`${this.game.currentScene.id} key:${animator.currentKey} prev:${animator.previousKey || "n/a"}`, drawX, drawY - 86);
    ctx.fillText(`${player.animation}:${player.walkPart || "idle"}/${player.facing}${fallback}/${slot} mirrored:${mirrored} frame:${frameIndex}/${frameCount} fps:${fps}`, drawX, drawY - 73);
    ctx.fillText(`elapsed:${elapsed} loop:${frame ? Boolean(frame.loop) : "n/a"} finished:${animator.isFinished()} reset:${reset}`, drawX, drawY - 60);
    ctx.fillText(`pendingStop:${pendingStop} stopExitFrame:${stopExitFrame} canExitToStop:${canExit} stopping:${Boolean(player.movementStopping)} mirrored:${mirrored}`, drawX, drawY - 47);
    ctx.fillText(`moving:${Boolean(player.target)} stopStarted:${Boolean(player.stopAnimationStarted)} stopFinished:${Boolean(player.stopAnimationFinished)}`, drawX, drawY - 34);
    ctx.fillText(`feet:${Math.round(player.position.x)},${Math.round(player.position.y)} h:${renderedHeight} scale:${scale} baseline:${frame?.baselineY || "n/a"} offsetX:${renderOffsetX.toFixed(1)}`, drawX, drawY - 21);
    ctx.fillText(`src:${sourceRect}`, drawX, drawY - 8);
    if (player.facingDebug) {
      const d = player.facingDebug;
      ctx.fillText(`dx:${d.dx.toFixed(1)} dy:${d.dy.toFixed(1)} adj:${d.adjustedDx.toFixed(1)},${d.adjustedDy.toFixed(1)} angle:${d.angle.toFixed(1)}`, drawX, drawY - 99);
    }
  }

  validateStrip(characterId, slot, image, frame) {
    const path = this.game.assets.getCharacterAssetPath(characterId, slot);
    const expectedWidth = frame.frameWidth * frame.frameCount;
    const duplicateLoopCheckWidth = frame.frameWidth * (frame.frameCount + 1);
    const key = `${characterId}:${slot}`;
    const usesRects = Array.isArray(frame.frameRects) && frame.frameRects.length >= frame.frameCount;
    const valid = usesRects
      ? frame.frameRects.slice(0, frame.frameCount).every((rect) => rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= image.naturalWidth && rect.y + rect.h <= image.naturalHeight)
      : image.naturalWidth === expectedWidth && image.naturalHeight === frame.frameHeight && frame.frameCount > 1;
    const expected = usesRects ? `${image.naturalWidth}x${image.naturalHeight} rects:${frame.frameRects.length}` : `${expectedWidth}x${frame.frameHeight}`;
    const logKey = `${valid}:${image.naturalWidth}x${image.naturalHeight}:${expected}`;
    if (this.stripValidationLog.get(key) !== logKey && (this.game.debugSceneGeometry || this.game.animLab)) {
      this.stripValidationLog.set(key, logKey);
      if (valid) {
        console.info(`[anim] ${characterId} ${slot} loaded ${usesRects ? "sheet" : "strip"} src=${path} natural=${image.naturalWidth}x${image.naturalHeight} frame=${frame.frameWidth}x${frame.frameHeight} count=${frame.frameCount} fps=${frame.fps}`);
      } else if (image.naturalWidth === duplicateLoopCheckWidth && image.naturalHeight === frame.frameHeight) {
        console.warn(`[anim] ${characterId} ${slot} appears to include duplicate loop-check frame. Runtime should use ${frame.frameCount} frames or playback must skip the duplicate. src=${path}`);
      } else {
        console.warn(`[anim] ${characterId} ${slot} invalid: expected ${expected} but got ${image.naturalWidth}x${image.naturalHeight}`);
      }
    }
    return valid;
  }

  drawAnimLab() {
    const { ctx } = this;
    const definition = this.game.player.animator.definition;
    const characterId = this.game.player.id;
    ctx.fillStyle = "#2a2824";
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = "#efe5d2";
    ctx.font = "700 24px Arial";
    ctx.fillText("Bai Mitko Animation Lab", 28, 36);
    ctx.font = "14px Arial";
    ctx.fillText("External Animation v1 - east start/loop/stop only. West mirrors east. North/south deferred.", 28, 58);

    const entries = this.externalAnimLabEntries();

    entries.forEach((entry, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 28 + col * 310;
      const y = 88 + row * 205;
      this.drawAnimLabEntry(characterId, entry, x, y);
    });
  }

  externalAnimLabEntries() {
    const entries = [];
    for (const direction of ["east", "west"]) {
      const parts = externalAnimationV1.walkParts?.[direction] || {};
      for (const part of ["start", "loop", "stop"]) {
        if (parts[part]) entries.push({ key: `external walk_${direction}_${part}${direction === "west" ? " mirrored" : ""}`, type: "walk", frame: parts[part] });
      }
    }
    return entries;
  }

  drawAnimLabEntry(characterId, entry, x, y) {
    const { ctx } = this;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(x, y, 286, 196);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.strokeRect(x, y, 286, 196);
    ctx.fillStyle = "#f4ead8";
    ctx.font = "700 14px Arial";
    ctx.fillText(entry.key, x + 10, y + 20);

    if (entry.type === "walk") {
      const frame = { ...entry.frame, fps: entry.frame.fps || this.game.player.animator.definition.animations.walk.fps };
      const image = this.game.assets.getCharacterImage(characterId, frame.slot);
      const loaded = this.game.assets.isLoaded(image);
      const valid = loaded && this.validateStrip(characterId, frame.slot, image, frame);
      const frameIndex = valid ? this.animLabFrameIndex(frame) : 0;
      ctx.font = "12px Arial";
      ctx.fillText(`${loaded ? "loaded" : "missing"} ${image?.naturalWidth || 0}x${image?.naturalHeight || 0}`, x + 10, y + 40);
      ctx.fillText(`frame ${frame.frameWidth}x${frame.frameHeight} count ${frame.frameCount} fps ${frame.fps} loop ${frame.loop}`, x + 10, y + 56);
      const bounds = this.frameContentBounds(frame, frameIndex);
      const rect = this.frameSourceRect(frame, frameIndex, bounds);
      const sourceRect = `${rect.x},${rect.y},${rect.w},${rect.h}`;
      const duplicateWidth = frame.frameWidth * (frame.frameCount + 1);
      const warnings = [];
      if (loaded && !frame.frameRects && image.naturalWidth !== frame.frameWidth * frame.frameCount) warnings.push(image.naturalWidth === duplicateWidth ? "extra duplicate frame" : "size mismatch");
      if (!frame.frameRects) warnings.push("missing frameRects");
      if (bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.w > frame.frameWidth || bounds.y + bounds.h > frame.frameHeight) warnings.push("content clips");
      ctx.fillText(`index ${frameIndex} loop ${frame.loopStartFrame || 0} move ${frame.movementStartFrame || 0} baseline ${frame.baselineY}`, x + 10, y + 72);
      ctx.fillText(`src ${sourceRect}`, x + 10, y + 88);
      ctx.fillText(`bounds ${bounds.x},${bounds.y},${bounds.w},${bounds.h}`, x + 10, y + 104);
      if (warnings.length) {
        ctx.fillStyle = "#ffb36b";
        ctx.fillText(`warn: ${warnings.join(", ")}`, x + 10, y + 122);
        ctx.fillStyle = "#f4ead8";
      }
      if (valid) {
        const h = 76;
        const w = h * (bounds.w / bounds.h);
        const drawX = x + 143 - w / 2;
        const drawY = y + 184 - h;
        this.drawFrameImage(image, frameIndex, frame, bounds, drawX, drawY, w, h, Boolean(frame.mirrored));
        ctx.strokeStyle = "rgba(100, 170, 255, 0.9)";
        ctx.strokeRect(drawX, drawY, w, h);
        const baselineInBounds = frame.baselineY - bounds.y;
        const baselineY = drawY + (baselineInBounds / bounds.h) * h;
        ctx.strokeStyle = "rgba(255, 70, 70, 0.95)";
        ctx.beginPath();
        ctx.moveTo(x + 54, baselineY);
        ctx.lineTo(x + 232, baselineY);
        ctx.stroke();
      }
      return;
    }

    ctx.font = "12px Arial";
    ctx.fillText("no animation entry", x + 10, y + 40);
  }

  animLabFrameIndex(frame) {
    const frameCount = frame.frameCount || 1;
    const next = Math.floor(this.game.player.animationTime * (frame.fps || 8));
    const loopStartFrame = Math.max(0, Math.min(frame.loopStartFrame || 0, frameCount - 1));
    if (next < frameCount) return next;
    const loopLength = Math.max(1, frameCount - loopStartFrame);
    return loopStartFrame + ((next - loopStartFrame) % loopLength);
  }

  drawHud() {
    const { ctx } = this;
    const state = this.game.state;
    ctx.fillStyle = "rgba(23, 20, 16, 0.92)";
    ctx.fillRect(0, 600, 1280, 120);
    this.drawMeter(28, 620, this.game.t("ui.meter.influence"), state.influence, "#69b6ff");
    this.drawMeter(28, 650, this.game.t("ui.meter.suspicion"), state.suspicion, "#e36767");
    this.drawMeter(28, 680, this.game.t("ui.meter.public_mood"), state.publicMood, "#8ccf73");

    ctx.fillStyle = "#f2e5cf";
    ctx.font = "16px Arial";
    ctx.fillText(`${this.game.t("ui.verb")}: ${this.game.t(`verb.${this.game.selectedVerb}`)}`, 360, 632);
    ctx.fillText(this.game.message, 360, 662);

    let x = 760;
    ctx.font = "14px Arial";
    for (const item of this.game.inventory.list()) {
      ctx.fillStyle = "rgba(239, 224, 189, 0.12)";
      ctx.fillRect(x, 620, 104, 70);
      ctx.strokeStyle = "#967d52";
      ctx.strokeRect(x, 620, 104, 70);
      const icon = this.game.assets.getItemImage(item.id);
      if (this.game.assets.isLoaded(icon)) {
        const max = 38;
        const ratio = Math.min(max / icon.width, max / icon.height);
        const w = icon.width * ratio;
        const h = icon.height * ratio;
        ctx.drawImage(icon, x + 52 - w / 2, 624, w, h);
      }
      ctx.fillStyle = "#f4e8d0";
      wrapText(ctx, this.game.t(item.nameKey), x + 8, 670, 88, 14);
      x += 116;
    }
  }

  drawMeter(x, y, label, value, color) {
    const { ctx } = this;
    ctx.fillStyle = "#f2e5cf";
    ctx.font = "14px Arial";
    ctx.fillText(label, x, y + 14);
    ctx.fillStyle = "#3a3026";
    ctx.fillRect(x + 150, y, 150, 16);
    ctx.fillStyle = color;
    ctx.fillRect(x + 150, y, clamp(value, 0, 100) * 1.5, 16);
    ctx.strokeStyle = "#9e8a67";
    ctx.strokeRect(x + 150, y, 150, 16);
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}
