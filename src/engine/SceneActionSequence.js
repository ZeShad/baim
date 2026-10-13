// Transient scene performance; never serialized or allowed to replay after cancellation.
export class SceneActionSequence {
  constructor() { this.reset(); }
  reset() { this.state = null; }
  get active() { return Boolean(this.state); }
  start(sceneId, definition, available = () => true) {
    if (this.active || sceneId !== definition.sceneId) return false;
    this.state = { definition, sceneId, elapsedMs: 0, phase: 'playing' };
    if (!definition.frames.every(available)) this.state.phase = 'received';
    return true;
  }
  update(sceneId, deltaMs, { paused = false, canceled = false, available = () => true } = {}) {
    const state = this.state;
    if (!state) return;
    if (canceled || sceneId !== state.sceneId) { this.reset(); return; }
    if (paused || state.phase !== 'playing') return;
    state.elapsedMs += Math.max(0, deltaMs || 0);
    if (state.elapsedMs >= state.definition.durationMs || !state.definition.frames.every(available)) state.phase = 'received';
  }
  fadeOpacity(sceneId) {
    const s = this.state;
    if (!s || s.sceneId !== sceneId || s.definition.type !== 'fade') return 0;
    const d = s.definition, t = s.elapsedMs;
    if (t < d.commitAtMs) return Math.min(1, t / d.commitAtMs);
    if (t <= d.revealAtMs) return 1;
    return Math.max(0, (d.durationMs - t) / (d.durationMs - d.revealAtMs));
  }
  presentation(sceneId, layerId) {
    const s = this.state;
    if (!s || s.phase !== 'playing' || s.sceneId !== sceneId || s.definition.layerId !== layerId) return null;
    let elapsed = s.elapsedMs;
    for (const frame of s.definition.frames) {
      if (elapsed < frame.durationMs) return frame;
      elapsed -= frame.durationMs;
    }
    return null;
  }
}
