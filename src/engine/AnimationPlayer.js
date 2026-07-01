export class AnimationPlayer {
  constructor(definition) {
    this.definition = definition;
    this.name = "idle";
    this.currentKey = "idle";
    this.previousKey = null;
    this.elapsed = 0;
    this.frameIndex = 0;
    this.fpsOverride = null;
    this.frameCountOverride = null;
    this.loopStartFrameOverride = null;
    this.initialFrameOverride = null;
    this.loopOverride = null;
    this.resetThisTick = false;
    this.resetReason = null;
  }

  beginTick() {
    this.resetThisTick = false;
    this.resetReason = null;
  }

  play(name, key = name) {
    if (this.name === name && this.currentKey === key) return;
    this.previousKey = this.currentKey;
    this.name = name;
    this.currentKey = key;
    this.resetPlayback(`key:${key}`);
  }

  resetPlayback(reason = "manual") {
    const animation = this.definition.animations[this.name] || this.definition.animations.idle;
    const frameCount = this.frameCountOverride || animation.frameCount || animation.frames?.length || 1;
    const fps = this.fpsOverride || animation.fps || 1;
    const initialFrame = Math.max(0, Math.min(this.initialFrameOverride ?? 0, frameCount - 1));
    this.elapsed = initialFrame / fps;
    this.frameIndex = initialFrame;
    this.resetThisTick = true;
    this.resetReason = reason;
  }

  update(dt) {
    const animation = this.definition.animations[this.name] || this.definition.animations.idle;
    if (animation?.type === "strip" || animation?.type === "phasedStrip") {
      const frameCount = this.frameCountOverride || animation.frameCount || 1;
      if (frameCount <= 1) return;
      this.elapsed += dt;
      const fps = this.fpsOverride || animation.fps;
      const next = Math.floor(this.elapsed * fps);
      const loopStartFrame = Math.max(0, Math.min(this.loopStartFrameOverride || animation.loopStartFrame || 0, frameCount - 1));
      const loop = this.loopOverride ?? animation.loop;
      if (loop) {
        if (next < frameCount) this.frameIndex = next;
        else {
          const loopLength = Math.max(1, frameCount - loopStartFrame);
          this.frameIndex = loopStartFrame + ((next - loopStartFrame) % loopLength);
        }
      } else {
        this.frameIndex = Math.min(next, frameCount - 1);
      }
      return;
    }
    if (!animation?.frames || animation.frames.length <= 1) return;
    this.elapsed += dt;
    const fps = this.fpsOverride || animation.fps;
    const next = Math.floor(this.elapsed * fps);
    if (animation.loop) this.frameIndex = next % animation.frames.length;
    else this.frameIndex = Math.min(next, animation.frames.length - 1);
  }

  frame() {
    const animation = this.definition.animations[this.name] || this.definition.animations.idle;
    return animation?.frames?.[this.frameIndex] || null;
  }

  isFinished() {
    const animation = this.definition.animations[this.name] || this.definition.animations.idle;
    const frameCount = this.frameCountOverride || animation.frameCount || animation.frames?.length || 1;
    const fps = this.fpsOverride || animation.fps || 1;
    const loop = this.loopOverride ?? animation.loop;
    if (!loop && (animation?.type === "strip" || animation?.type === "phasedStrip") && this.frameIndex >= frameCount - 1) return true;
    return !loop && this.elapsed * fps >= frameCount;
  }
}
