import { clamp, pointInRect } from "./geometry.js";

export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isWalkable(scene, point) {
  if (scene.walkMask) return pointInWalkMask(scene.walkMask, point);
  if (!scene.walkPolygons?.length) return point.y < 590;
  return scene.walkPolygons.some((zone) => pointInPolygon(point, zone.points));
}

export function pointInWalkMask(mask, point) {
  const width = Math.max(1, Number(mask.width) || 1);
  const height = Math.max(1, Number(mask.height) || 1);
  const worldWidth = Math.max(1, Number(mask.worldWidth) || 1280);
  const worldHeight = Math.max(1, Number(mask.worldHeight) || 720);
  const x = Math.floor((point.x / worldWidth) * width);
  const y = Math.floor((point.y / worldHeight) * height);
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  const value = mask.rows?.[y]?.[x] || ".";
  const entry = mask.legend?.[value];
  if (entry) return Boolean(entry.walkable);
  return value !== ".";
}

export function nearestWalkablePointOnLine(scene, from, to, step = 4) {
  if (!from || !to) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return isWalkable(scene, from) ? { ...from } : null;
  let best = isWalkable(scene, from) ? { ...from } : null;
  const steps = Math.max(1, Math.ceil(distance / Math.max(1, step)));
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const point = { x: from.x + dx * t, y: from.y + dy * t };
    if (isWalkable(scene, point)) best = point;
  }
  return best;
}

export function nearestWalkablePoint(scene, point) {
  if (!point) return null;
  if (isWalkable(scene, point)) return { ...point };
  if (scene.walkMask?.rows?.length) return nearestWalkablePointInMask(scene.walkMask, point);
  let best = null;
  for (const polygon of scene.walkPolygons || []) {
    for (const candidate of polygon.points || []) {
      const d = Math.hypot(candidate.x - point.x, candidate.y - point.y);
      if (!best || d < best.distance) best = { point: candidate, distance: d };
    }
  }
  return best ? { ...best.point } : null;
}

export function nearestReachableWalkablePoint(scene, from, point) {
  if (!point) return null;
  if (isWalkable(scene, point) && findWalkPath(scene, from, point).length) return { ...point };
  if (!scene?.walkMask?.rows?.length) return nearestWalkablePoint(scene, point);
  const mask = scene.walkMask;
  const start = nearestWalkableCell(mask, from);
  if (!start) return null;
  const target = pointToMaskCell(mask, point);
  const width = Math.max(1, Number(mask.width) || 1);
  const height = Math.max(1, Number(mask.height) || 1);
  const visited = new Set();
  const queue = [target];
  visited.add(cellKey(target));
  while (queue.length) {
    const cell = queue.shift();
    if (isWalkableCell(mask, cell)) {
      const path = findWalkMaskCellPath(mask, start, cell);
      if (path.length) return cellCenter(mask, cell);
    }
    for (const next of allNeighborCells(cell)) {
      if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height) continue;
      const key = cellKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return null;
}

export function findWalkPath(scene, from, to) {
  if (!scene?.walkMask?.rows?.length) return isWalkable(scene, to) ? [{ ...to }] : [];
  const mask = scene.walkMask;
  const start = nearestWalkableCell(mask, from);
  const goal = nearestWalkableCell(mask, to);
  if (!start || !goal) return [];
  const cells = findWalkMaskCellPath(mask, start, goal);
  if (!cells.length) return [];
  const points = cells.map((cell) => cellCenter(mask, cell));
  points[0] = { ...from };
  points[points.length - 1] = { ...to };
  return smoothWalkPath(scene, points);
}

function allNeighborCells(cell) {
  const result = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      result.push({ x: cell.x + dx, y: cell.y + dy });
    }
  }
  return result;
}

export function walkPathDistance(from, path) {
  if (!from || !Array.isArray(path) || !path.length) return 0;
  let total = 0;
  let previous = from;
  for (const point of path) {
    if (!point) continue;
    total += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return total;
}

function findWalkMaskCellPath(mask, start, goal) {
  const open = new Map();
  const closed = new Set();
  const startKey = cellKey(start);
  open.set(startKey, { cell: start, g: 0, f: cellDistance(start, goal), previous: null });
  while (open.size) {
    let currentKey = null;
    let current = null;
    for (const [key, value] of open) {
      if (!current || value.f < current.f) {
        currentKey = key;
        current = value;
      }
    }
    if (!current) break;
    open.delete(currentKey);
    if (current.cell.x === goal.x && current.cell.y === goal.y) return unwindCellPath(current);
    closed.add(currentKey);
    for (const neighbor of walkableNeighbors(mask, current.cell)) {
      const key = cellKey(neighbor);
      if (closed.has(key)) continue;
      const stepCost = cellDistance(current.cell, neighbor);
      const g = current.g + stepCost;
      const existing = open.get(key);
      if (existing && existing.g <= g) continue;
      open.set(key, { cell: neighbor, g, f: g + cellDistance(neighbor, goal), previous: current });
    }
  }
  return [];
}

function unwindCellPath(node) {
  const cells = [];
  let current = node;
  while (current) {
    cells.push(current.cell);
    current = current.previous;
  }
  return cells.reverse();
}

function walkableNeighbors(mask, cell) {
  const result = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const next = { x: cell.x + dx, y: cell.y + dy };
      if (!isWalkableCell(mask, next)) continue;
      if (dx !== 0 && dy !== 0 && (!isWalkableCell(mask, { x: cell.x + dx, y: cell.y }) || !isWalkableCell(mask, { x: cell.x, y: cell.y + dy }))) continue;
      result.push(next);
    }
  }
  return result;
}

function smoothWalkPath(scene, points) {
  if (points.length <= 2) return points;
  const smoothed = [points[0]];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let next = points.length - 1;
    while (next > anchor + 1 && !lineIsWalkable(scene, points[anchor], points[next])) next -= 1;
    smoothed.push(points[next]);
    anchor = next;
  }
  return smoothed;
}

function lineIsWalkable(scene, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 8));
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    if (!isWalkable(scene, { x: from.x + dx * t, y: from.y + dy * t })) return false;
  }
  return true;
}

function nearestWalkableCell(mask, point) {
  const cell = pointToMaskCell(mask, point);
  if (isWalkableCell(mask, cell)) return cell;
  const width = Math.max(1, Number(mask.width) || 1);
  const height = Math.max(1, Number(mask.height) || 1);
  let best = null;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const candidate = { x, y };
      if (!isWalkableCell(mask, candidate)) continue;
      const distance = cellDistance(cell, candidate);
      if (!best || distance < best.distance) best = { cell: candidate, distance };
    }
  }
  return best?.cell || null;
}

function pointToMaskCell(mask, point) {
  const width = Math.max(1, Number(mask.width) || 1);
  const height = Math.max(1, Number(mask.height) || 1);
  const worldWidth = Math.max(1, Number(mask.worldWidth) || 1280);
  const worldHeight = Math.max(1, Number(mask.worldHeight) || 720);
  return {
    x: clamp(Math.floor(((point?.x ?? 0) / worldWidth) * width), 0, width - 1),
    y: clamp(Math.floor(((point?.y ?? 0) / worldHeight) * height), 0, height - 1)
  };
}

function cellCenter(mask, cell) {
  const worldWidth = Math.max(1, Number(mask.worldWidth) || 1280);
  const worldHeight = Math.max(1, Number(mask.worldHeight) || 720);
  return {
    x: (cell.x + 0.5) * (worldWidth / Math.max(1, Number(mask.width) || 1)),
    y: (cell.y + 0.5) * (worldHeight / Math.max(1, Number(mask.height) || 1))
  };
}

function isWalkableCell(mask, cell) {
  const width = Math.max(1, Number(mask.width) || 1);
  const height = Math.max(1, Number(mask.height) || 1);
  if (cell.x < 0 || cell.y < 0 || cell.x >= width || cell.y >= height) return false;
  const value = mask.rows?.[cell.y]?.[cell.x] || ".";
  const entry = mask.legend?.[value];
  return entry ? Boolean(entry.walkable) : value !== ".";
}

function cellKey(cell) {
  return `${cell.x},${cell.y}`;
}

function cellDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestWalkablePointInMask(mask, point) {
  const width = Math.max(1, Number(mask.width) || 1);
  const height = Math.max(1, Number(mask.height) || 1);
  const worldWidth = Math.max(1, Number(mask.worldWidth) || 1280);
  const worldHeight = Math.max(1, Number(mask.worldHeight) || 720);
  const cellWidth = worldWidth / width;
  const cellHeight = worldHeight / height;
  let best = null;
  for (let y = 0; y < height; y += 1) {
    const row = mask.rows[y] || "";
    for (let x = 0; x < width; x += 1) {
      const value = row[x] || ".";
      const entry = mask.legend?.[value];
      const walkable = entry ? Boolean(entry.walkable) : value !== ".";
      if (!walkable) continue;
      const candidate = {
        x: (x + 0.5) * cellWidth,
        y: (y + 0.5) * cellHeight
      };
      const d = Math.hypot(candidate.x - point.x, candidate.y - point.y);
      if (!best || d < best.distance) best = { point: candidate, distance: d };
    }
  }
  return best?.point || null;
}

export function sceneScale(scene, point) {
  const zone = scene.perspectiveScale;
  if (!zone) return 1;
  const t = clamp((point.y - zone.horizonY) / Math.max(1, zone.bottomY - zone.horizonY), 0, 1);
  return zone.far + t * (zone.near - zone.far);
}

export function findTargetAt(scene, point, targetAvailable = () => true) {
  const targets = [...scene.npcs, ...scene.interactables, ...scene.exits];
  return targets.find((target) => {
    if (!targetAvailable(target)) return false;
    if (target.polygon) return pointInPolygon(point, target.polygon);
    return pointInRect(point, target.rect);
  });
}
