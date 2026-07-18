import { moveToward } from "./geometry.js";

const WALK_TARGET_EPSILON = 4;

export class MovementSystem {
  constructor(player) {
    this.player = player;
  }

  walkTo(point, facingPoint = point, path = null, options = {}) {
    const wasWalking = this.player.animation === "walk" && (this.player.target || this.player.walkPart === "start" || this.player.walkPart === "loop" || this.player.walkPart === "short");
    const wasShortWalk = Boolean(this.player.shortWalk) || this.player.walkPart === "short";
    const waypoints = Array.isArray(path) && path.length ? path.map((waypoint) => ({ ...waypoint })) : [{ ...point }];
    while (waypoints.length > 1 && pointDistance(this.player.position, waypoints[0]) <= WALK_TARGET_EPSILON) waypoints.shift();
    const firstPoint = waypoints.shift() || { ...point };
    const finalPoint = waypoints.length ? waypoints.at(-1) : firstPoint;
    const dx = finalPoint.x - this.player.position.x;
    const dy = finalPoint.y - this.player.position.y;
    if (!wasWalking && Math.hypot(dx, dy) <= WALK_TARGET_EPSILON) {
      this.player.target = null;
      this.player.walkPath = [];
      this.player.animation = this.player.speaking ? "talk" : "idle";
      this.player.walkPart = null;
      this.player.shortWalk = false;
      this.player.pendingStop = false;
      this.player.movementStopping = false;
      this.player.stopAnimationStarted = false;
      return;
    }
    this.player.idleHoldFrame = null;
    this.player.idleVariant = null;
    this.player.idleVariantQueue = [];
    this.player.facing = facingFromDelta(firstPoint.x - this.player.position.x, firstPoint.y - this.player.position.y, this.player);
    this.player.target = { ...firstPoint };
    this.player.walkPath = waypoints;
    this.player.animation = "walk";
    const isActiveFullWalk = wasWalking && !wasShortWalk;
    this.player.shortWalk = wasShortWalk || (Boolean(options.shortWalk) && !isActiveFullWalk);
    this.player.pendingStop = false;
    this.player.movementStopping = false;
    this.player.stopAnimationStarted = false;
    this.player.stopAnimationFinished = false;
    const parts = walkPartsForFacing(this.player);
    this.player.walkPart = this.player.shortWalk && parts?.short ? "short" : wasWalking ? "loop" : parts?.start ? "start" : "loop";
    if (!wasWalking && (this.player.walkPart === "start" || this.player.walkPart === "short")) {
      syncAnimatorToWalkPartStart(this.player, parts?.[this.player.walkPart]);
    }
  }

  update(dt) {
    if (this.player.animation === "action") return;
    if (!this.player.target) {
      if (this.player.animation === "walk" && this.player.walkPart === "stop" && !this.player.animator?.isFinished()) {
        this.player.movementStopping = true;
        return;
      }
      if (this.player.animation === "walk" && this.player.walkPart === "stop") {
        this.player.stopAnimationFinished = true;
        this.player.movementStopping = false;
        this.player.pendingStop = false;
        this.player.animation = this.player.speaking ? "talk" : "idle";
        this.player.walkPart = null;
        this.player.shortWalk = false;
        return;
      }
      if (this.player.pendingStop) {
        this.player.animation = "walk";
        this.player.movementStopping = true;
        this.player.stopExitFrame = stopExitFrameForPlayer(this.player);
        beginWalkStop(this.player);
        return;
      }
      this.player.animation = this.player.speaking ? "talk" : "idle";
      this.player.walkPart = null;
      this.player.shortWalk = false;
      return;
    }
    if (this.player.animation === "walk" && this.player.walkPart === "start" && this.player.animator?.isFinished()) {
      this.player.walkPart = "loop";
      return;
    }
    const previous = { ...this.player.position };
    const motionMultiplier = walkMotionMultiplierForFrame(this.player);
    if (motionMultiplier <= 0) return;
    this.player.position = moveToward(this.player.position, this.player.target, this.player.speed * motionMultiplier * dt);
    this.player.facing = facingFromDelta(this.player.position.x - previous.x, this.player.position.y - previous.y, this.player);
    if (this.player.position.x === this.player.target.x && this.player.position.y === this.player.target.y) {
      if (this.player.walkPath?.length) {
        this.player.target = this.player.walkPath.shift();
        return;
      }
      this.player.target = null;
      this.player.walkPath = [];
      const parts = walkPartsForFacing(this.player);
      if (this.player.shortWalk) {
        this.player.animation = this.player.speaking ? "talk" : "idle";
        this.player.walkPart = null;
        this.player.shortWalk = false;
        this.player.idleHoldFrame = null;
      } else if (parts?.stop) {
        requestWalkStop(this.player);
      } else {
        this.player.animation = "idle";
        this.player.walkPart = null;
        this.player.shortWalk = false;
      }
    }
  }
}

function pointDistance(a, b) {
  return Math.hypot((b?.x ?? 0) - (a?.x ?? 0), (b?.y ?? 0) - (a?.y ?? 0));
}

function syncAnimatorToWalkPartStart(player, frame) {
  if (!player.animator || !frame) return;
  const frameCount = Math.max(1, Number(frame.frameCount) || 1);
  const initialFrame = Math.max(0, Math.min(Number(frame.initialFrame) || 0, frameCount - 1));
  const fps = Number(frame.fps) || 1;
  player.animator.frameIndex = initialFrame;
  player.animator.elapsed = initialFrame / fps;
}

export function requestWalkStop(player) {
  const parts = walkPartsForFacing(player);
  if (!parts?.stop) {
    player.target = null;
    player.walkPath = [];
    player.animation = player.speaking ? "talk" : "idle";
    player.walkPart = null;
    player.shortWalk = false;
    player.pendingStop = false;
    return;
  }
  player.target = null;
  player.walkPath = [];
  player.animation = "walk";
  player.shortWalk = false;
  player.walkPart = player.walkPart === "start" ? "start" : "loop";
  player.pendingStop = true;
  player.movementStopping = true;
  player.stopAnimationStarted = false;
  player.stopAnimationFinished = false;
  player.stopExitFrame = stopExitFrameForPlayer(player);
  beginWalkStop(player);
}

export function beginWalkStop(player) {
  player.animation = "walk";
  player.walkPart = "stop";
  player.pendingStop = false;
  player.movementStopping = true;
  player.stopAnimationStarted = true;
  player.stopAnimationFinished = false;
  player.canExitToStop = false;
}

export function canExitToStop(player) {
  if (!player.pendingStop || player.animation !== "walk" || player.walkPart !== "loop") return false;
  const parts = walkPartsForFacing(player);
  const loop = parts?.loop;
  if (!loop?.frameCount) return true;
  const frameIndex = ((player.animator?.frameIndex ?? 0) % loop.frameCount + loop.frameCount) % loop.frameCount;
  return frameIndex === stopExitFrameForPlayer(player);
}

export function stopExitFrameForPlayer(player) {
  const parts = walkPartsForFacing(player);
  const loop = parts?.loop;
  const configured = Number(loop?.stopExitFrame ?? parts?.stopExitFrame ?? 0);
  const frameCount = Math.max(1, Number(loop?.frameCount) || 1);
  return Number.isFinite(configured) ? ((Math.trunc(configured) % frameCount) + frameCount) % frameCount : 0;
}

export function walkPartsForFacing(player) {
  const facing = eastWestFallbackFacing(player.facing);
  return facing ? player.walkPartsByFacing?.[facing] : null;
}

export function eastWestFallbackFacing(facing) {
  if (facing === "east" || facing === "north_east" || facing === "south_east") return "east";
  if (facing === "west" || facing === "north_west" || facing === "south_west") return "west";
  return null;
}

export function walkMotionMultiplierForFrame(player) {
  const facing = player.facing || "south";
  const fallbackFacing = eastWestFallbackFacing(facing) || {
    south_east: "south",
    south_west: "south",
    north_east: "north",
    north_west: "north"
  }[facing] || facing;
  const movementStartFrame = player.walkMovementStartFrameByFacing?.[fallbackFacing] || 0;
  const index = player.animator?.frameIndex ?? 0;
  if (player.animation === "walk" && index < movementStartFrame) return 0;
  const part = player.walkPart || "loop";
  const multipliers = player.walkMotionMultipliersByFacing?.[fallbackFacing]?.[part] || player.walkMotionMultipliersByFacing?.[fallbackFacing] || player.walkMotionMultipliers;
  if (!Array.isArray(multipliers) || !multipliers.length || player.animation !== "walk") return 1;
  return motionMultiplierAtFrame(multipliers, index, 0);
}

export function motionMultiplierAtFrame(multipliers, frameIndex, missingFrameFallback = 1) {
  if (!Array.isArray(multipliers) || !multipliers.length) return missingFrameFallback;
  const index = ((Math.trunc(Number(frameIndex) || 0) % multipliers.length) + multipliers.length) % multipliers.length;
  const value = Number(multipliers[index]);
  return Number.isFinite(value) && value >= 0 ? value : missingFrameFallback;
}

export function facingFromDelta(dx, dy, player) {
  const fallback = player.facing || "south";
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return fallback;
  const bias = player.verticalDirectionBias || 1;
  const adjustedDy = dy * bias;
  const degrees = (Math.atan2(adjustedDy, dx) * 180) / Math.PI;
  let facing;
  if (degrees >= -22.5 && degrees < 22.5) facing = "east";
  else if (degrees >= 22.5 && degrees < 67.5) facing = "south_east";
  else if (degrees >= 67.5 && degrees < 112.5) facing = "south";
  else if (degrees >= 112.5 && degrees < 157.5) facing = "south_west";
  else if (degrees >= 157.5 || degrees < -157.5) facing = "west";
  else if (degrees >= -157.5 && degrees < -112.5) facing = "north_west";
  else if (degrees >= -112.5 && degrees < -67.5) facing = "north";
  else facing = "north_east";

  if (Math.abs(dy) >= Math.abs(dx) * 0.35) {
    if (dy > 0 && facing === "east") facing = "south_east";
    if (dy < 0 && facing === "east") facing = "north_east";
    if (dy > 0 && facing === "west") facing = "south_west";
    if (dy < 0 && facing === "west") facing = "north_west";
  }
  if (hasEastWestWalkOnly(player)) {
    if (dx > 0.01) facing = "east";
    else if (dx < -0.01) facing = "west";
    else facing = eastWestFallbackFacing(player.facing) || "east";
  }
  player.facingDebug = { dx, dy, adjustedDx: dx, adjustedDy, angle: degrees, selectedFacing: facing };
  return facing;
}

export function hasEastWestWalkOnly(player) {
  const parts = player.walkPartsByFacing || {};
  return Boolean(parts.east && parts.west && !parts.north && !parts.south);
}
