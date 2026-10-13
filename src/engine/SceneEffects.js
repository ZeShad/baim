// Small procedural effects sit alongside raster layers in the scene depth stack.
// Geometry, color, timing and visibility are authored by content, not scene IDs.
export function streamPoint(points, t) {
  const u = 1 - t;
  return {
    x: u ** 3 * points[0].x + 3 * u ** 2 * t * points[1].x + 3 * u * t ** 2 * points[2].x + t ** 3 * points[3].x,
    y: u ** 3 * points[0].y + 3 * u ** 2 * t * points[1].y + 3 * u * t ** 2 * points[2].y + t ** 3 * points[3].y
  };
}

export function drawSceneEffect(ctx, effect, seconds = 0, part = "complete") {
  if (effect.type !== "waterStream" || effect.points?.length !== 4) return;
  const [start, a, b, end] = effect.points;
  const phase = ((seconds * (effect.speed ?? 0.7)) % 1 + 1) % 1;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = effect.width ?? 3;
  ctx.strokeStyle = effect.color ?? "rgba(115,192,204,0.65)";
  if (part !== "splash") {
    ctx.save();
    if (effect.occlusionPolygons?.length) {
      ctx.beginPath();
      ctx.rect(0, 0, ctx.canvas?.width || 1280, ctx.canvas?.height || 720);
      for (const polygon of effect.occlusionPolygons) {
        ctx.moveTo(polygon[0].x, polygon[0].y);
        for (const point of polygon.slice(1)) ctx.lineTo(point.x, point.y);
        ctx.closePath();
      }
      ctx.clip("evenodd");
    }
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.bezierCurveTo(a.x, a.y, b.x, b.y, end.x, end.y);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = effect.highlight ?? "rgba(229,250,239,0.85)";
    for (let i = 0; i < 5; i++) {
      const t = (phase + i / 5) % 1;
      const p = streamPoint(effect.points, t);
      const q = streamPoint(effect.points, Math.min(1, t + 0.065));
      // Highlights enter/leave gently; no bright dash jumps across the wrap.
      ctx.globalAlpha = Math.sin(Math.PI * t);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (part !== "stream") {
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = effect.highlight ?? "rgba(229,250,239,0.85)";
    for (let i = 0; i < 2; i++) {
      const ripple = (phase + i / 2) % 1;
      const spread = 4 + ripple * (effect.splash?.radiusX ?? 9);
      ctx.globalAlpha = Math.sin(Math.PI * ripple) * 0.45;
      ctx.beginPath();
      ctx.ellipse(end.x, end.y + 2, spread, 1 + ripple * (effect.splash?.radiusY ?? 3), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (effect.splash) {
      const { radiusX, height, droplets } = effect.splash;
      ctx.fillStyle = effect.highlight ?? "rgba(229,250,239,0.85)";
      // Staggered ballistic droplets: small continuous impacts, no random jitter
      // or growing water level. Each birth/landing fades through the loop wrap.
      for (let i = 0; i < droplets; i++) {
        const age = (phase * 2 + i / droplets) % 1;
        const side = Math.sin(i * 2.3999632297);
        const x = end.x + side * radiusX * age;
        const y = end.y - 4 * height * (0.65 + 0.35 * Math.cos(i)) * age * (1 - age);
        ctx.globalAlpha = Math.sin(Math.PI * age) * 0.75;
        ctx.beginPath();
        ctx.ellipse(x, y, 1.1, 1.8, side * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(end.x - 7, end.y + 1);
      ctx.quadraticCurveTo(end.x - 4, end.y - 5, end.x, end.y - 2);
      ctx.quadraticCurveTo(end.x + 5, end.y - 6, end.x + 8, end.y + 1);
      ctx.stroke();
    }
  }
  ctx.restore();
}
