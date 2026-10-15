import { findWalkPath, isWalkable } from "./SceneGeometry.js";

// Lateral customer-side stops; preserve existing furniture and walk masks.
const customerStops = {
  "scene.chapter1.village_square": {
    "npc.journalist": { x: 850, y: 590 },
    "npc.baba_stoyanka": { x: 430, y: 430 }
  },
  "scene.chapter1.municipality": {
    "npc.municipality_colleague": { x: 750, y: 450 },
    "npc.municipality_background_clerk": { x: 670, y: 450 },
    "npc.municipality_security_officer": { x: 510, y: 690 }
  },
  "scene.chapter1.election_booth": {
    "npc.municipality_clerk": { x: 756, y: 532 },
    "npc.journalist": { x: 508, y: 532 }
  }
};

const constrainedStops = {
  "scene.chapter1.mayor_office": { "npc.mayor": { x: 408, y: 564 } },
  "scene.chapter1.village_square": { "hotspot.square.kiosk": { x: 1090, y: 630 } },
  "scene.chapter1.election_booth": {
    "npc.journalist": { x: 228, y: 564 },
    "npc.tony_fridge": { x: 228, y: 564 },
    "npc.baba_stoyanka": { x: 740, y: 564 }
  }
};

export function isCharacterInteraction(target) {
  return target?.kind === "npc" || target?.dialogueSpeaker === true || target?.characterInteraction === true;
}

export function characterInteractionBounds(scene, target, resolveLayerRect = () => null) {
  if (target.interactionBody) return target.interactionBody;
  const aliases = {
    "npc.municipality_clerk": ["layer.municipality.penka_seated", "layer.election.penka"],
    "npc.municipality_security_officer": ["layer.municipality.security_officer"],
    "hotspot.square.old_men_bench": ["layer.square.old_men_chorus"]
  };
  const layer = scene.foregroundLayers?.find(l => l.talkAnimation?.npcId === target.id
    || l.speechAnimation?.npcId === target.id || l.visibleWhenTargetId === target.id
    || aliases[target.id]?.includes(l.id)
    || (target.id === "npc.journalist" && l.id.endsWith(".journalist"))
    || (target.id === "npc.mayor" && l.id.endsWith(".mayor")));
  if (!layer) return target.rect;
  const rendered = resolveLayerRect(layer);
  if (rendered) return rendered;
  const bounds = layer.animation?.registrationBounds || layer.animation?.contentBounds;
  const h = layer.height || target.rect.h;
  const w = layer.width || h * (bounds ? bounds.w / bounds.h : target.rect.w / target.rect.h);
  return { x: layer.left ?? target.rect.x, y: layer.top ?? target.rect.y, w, h };
}

export function planCharacterApproach(scene, target, from, visualHeight = 280) {
  if (!isCharacterInteraction(target) || !target.rect) return null;
  const rect = characterInteractionBounds(scene, target), centerX = rect.x + rect.w / 2;
  const heightAt = point => typeof visualHeight === "function" ? visualHeight(point) : visualHeight;
  const authored = target.interactionApproach || customerStops[scene.id]?.[target.id];
  const reachable = point => isWalkable(scene, point) && findWalkPath(scene, from, point).length > 0;
  const makeFallback = () => {
    const fallback = constrainedStops[scene.id]?.[target.id];
    if (!fallback || !reachable(fallback) || !characterStopClear(scene, target, fallback, heightAt, true)) return null;
    return withSideArrival(scene, from, { point: { ...fallback }, facing: fallback.x < centerX ? "east" : "west",
      spatialException: true, customerSide: true });
  };
  if (authored && reachable(authored) && characterStopClear(scene, target, authored, heightAt) && Math.abs(authored.x - centerX) > 4) {
    return withSideArrival(scene, from, { point: { ...authored }, facing: authored.x < centerX ? "east" : "west", customerSide: target.id !== "npc.baba_stoyanka" });
  }
  if (authored) return makeFallback();
  const footY = rect.y + rect.h;
  const candidates = [], mask = scene.walkMask;
  const stepX = mask ? (mask.worldWidth || 1280) / mask.width : 8;
  const stepY = mask ? (mask.worldHeight || 720) / mask.height : 8;
  const band = Math.max(stepY, Math.min(50, heightAt({ x: centerX, y: footY }) * 0.18));
  for (let y = stepY / 2; y < (mask?.worldHeight || 720); y += stepY) {
    if (Math.abs(y - footY) > band) continue;
    for (let x = stepX / 2; x < (mask?.worldWidth || 1280); x += stepX) {
      const gap = x < centerX ? rect.x - x : x - (rect.x + rect.w);
      const clearance = Math.max(24, heightAt({ x, y }) * 0.22);
      // Approved seated Baba addresses the listener on her right.
      if (scene.id === "scene.chapter1.village_square" && target.id === "npc.baba_stoyanka" && x < centerX) continue;
      if (gap < clearance || gap > clearance + 90) continue;
      const point = { x, y };
      if (!isWalkable(scene, point)) continue;
      if (!characterStopClear(scene, target, point, heightAt)) continue;
      candidates.push({ point, facing: x < centerX ? "east" : "west",
        score: Math.abs(y - footY) * 4 + Math.abs(gap - clearance) + Math.hypot(x - from.x, y - from.y) * 0.05 });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  for (const candidate of candidates) {
    if (!reachable(candidate.point)) continue;
    const plan = withSideArrival(scene, from, candidate);
    if (plan) return plan;
  }
  return makeFallback();
}

export function characterStopClear(scene, target, point, heightAt, allowGroupApproach = false) {
  const height = typeof heightAt === "function" ? heightAt(point) : heightAt;
  const radius = Math.max(24, height * 0.22), body = characterInteractionBounds(scene, target);
  const centerX = body.x + body.w / 2;
  // Existing approved poses; future content can declare its own listener side.
  const listenerFacing = target.interactionFacing || (scene.id?.startsWith("scene.chapter1.") ? {
    "npc.baba_stoyanka": "west", "npc.journalist": "east", "npc.mayor": "east",
    "npc.tony_fridge": "east", "npc.mehana_waiter": "east", "npc.municipality_clerk": "east"
  }[target.id] : null);
  if (listenerFacing && (point.x < centerX ? "east" : "west") !== listenerFacing) return false;
  for (const other of scene.npcs || []) {
    if (other.id === target.id) continue;
    const behindCounter = (scene.id === "scene.chapter1.mehana" && ["npc.mehana_waiter", "npc.tony_fridge"].includes(other.id))
      || (scene.id === "scene.chapter1.municipality" && ["npc.municipality_clerk", "npc.municipality_colleague", "npc.municipality_background_clerk"].includes(other.id))
      || (scene.id === "scene.chapter1.election_booth" && other.id === "npc.municipality_clerk");
    if (behindCounter) continue;
    const r = characterInteractionBounds(scene, other);
    if (point.y <= r.y || point.y - height >= r.y + r.h) continue;
    // Do not park over a standing actor's visible body. Counter actors retain
    // their approved foreground-depth treatment instead of becoming obstacles.
    if (point.x + radius > r.x && point.x - radius < r.x + r.w) return false;
    const otherX = r.x + r.w / 2;
    if (!allowGroupApproach && Math.abs(r.y + r.h - point.y) <= Math.min(50, height * 0.18)
      && otherX > Math.min(point.x, centerX) && otherX < Math.max(point.x, centerX)) return false;
  }
  return true;
}

function withSideArrival(scene, from, plan) {
  if (Math.hypot(from.x - plan.point.x, from.y - plan.point.y) <= 4) return { ...plan, path: [] };
  const side = plan.facing === "east" ? -1 : 1;
  if ((from.x - plan.point.x) * side > 0 && from.y === plan.point.y) {
    const direct = findWalkPath(scene, from, plan.point);
    if (direct.length <= 2 && direct.length) return { ...plan, path: direct };
  }
  const runs = Math.hypot(from.x - plan.point.x, from.y - plan.point.y) < 40 ? [8, 16, 24] : [24, 16, 8];
  for (const run of runs) {
    const lead = { x: plan.point.x + (plan.facing === "east" ? -run : run), y: plan.point.y };
    if (!isWalkable(scene, lead)) continue;
    const last = findWalkPath(scene, lead, plan.point);
    if (last.length > 2 || !last.length) continue;
    let path = findWalkPath(scene, from, lead);
    if ((from.x - plan.point.x) * side < 0 || pathPassesStop(from, path, plan.point)) {
      // Enter from a reachable adjacent floor lane rather than walking through
      // the final stop and reversing back over it merely to face the listener.
      path = [];
      for (const offset of [run, -run]) {
        const corner = { x: lead.x, y: lead.y + offset };
        if (!isWalkable(scene, corner)) continue;
        const entry = findWalkPath(scene, from, corner), turn = findWalkPath(scene, corner, lead);
        if (entry.length && turn.length && turn.length <= 2 && !pathPassesStop(from, entry, plan.point)) { path = [...entry, { ...lead }]; break; }
      }
    }
    if (path.length && !pathPassesStop(from, path, plan.point)) return { ...plan, path: [...path, { ...plan.point }] };
  }
  return null;
}

function pathPassesStop(from, path, stop) {
  let previous = from;
  for (const point of path) {
    const dx = point.x - previous.x, dy = point.y - previous.y;
    const t = Math.max(0, Math.min(1, ((stop.x - previous.x) * dx + (stop.y - previous.y) * dy) / (dx * dx + dy * dy || 1)));
    if (Math.hypot(stop.x - previous.x - t * dx, stop.y - previous.y - t * dy) <= 4) return true;
    previous = point;
  }
  return false;
}
