export function pointInRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function moveToward(current, target, maxDistance) {
  const d = distance(current, target);
  if (d <= maxDistance || d === 0) return { ...target };
  const t = maxDistance / d;
  return {
    x: current.x + (target.x - current.x) * t,
    y: current.y + (target.y - current.y) * t
  };
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
