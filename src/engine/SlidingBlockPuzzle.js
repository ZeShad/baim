// Grid rules are independent of rendering and chapter content. One legal slide per command.
export const PHOTO_PUZZLE = Object.freeze({
  columns: 4, rows: 5, goal: { id: 'blue', x: 1, y: 3 },
  pieces: [
    { id: 'blue', w: 2, h: 2, x: 1, y: 2, color: 'blue' },
    { id: 'yellow1', w: 1, h: 2, x: 0, y: 1, color: 'yellow' },
    { id: 'yellow2', w: 1, h: 2, x: 3, y: 0, color: 'yellow' },
    { id: 'yellow3', w: 1, h: 2, x: 0, y: 3, color: 'yellow' },
    { id: 'yellow4', w: 1, h: 2, x: 3, y: 3, color: 'yellow' },
    { id: 'yellow5', w: 2, h: 1, x: 1, y: 0, color: 'yellow' },
    { id: 'red1', w: 1, h: 1, x: 1, y: 1, color: 'red' },
    { id: 'red2', w: 1, h: 1, x: 2, y: 1, color: 'red' },
    { id: 'red3', w: 1, h: 1, x: 1, y: 4, color: 'red' },
    { id: 'red4', w: 1, h: 1, x: 2, y: 4, color: 'red' }
  ]
});
export function initialPuzzle(definition = PHOTO_PUZZLE) {
  return { positions: Object.fromEntries(definition.pieces.map(p => [p.id, { x: p.x, y: p.y }])), moves: 0 };
}
export function validPuzzle(state, definition = PHOTO_PUZZLE) {
  if (!state || !Number.isInteger(state.moves) || state.moves < 0) return false;
  const occupied = new Set();
  for (const piece of definition.pieces) {
    const p = state.positions?.[piece.id];
    if (!p || !Number.isInteger(p.x) || !Number.isInteger(p.y) || p.x < 0 || p.y < 0
      || p.x + piece.w > definition.columns || p.y + piece.h > definition.rows) return false;
    for (let y = p.y; y < p.y + piece.h; y++) for (let x = p.x; x < p.x + piece.w; x++) {
      const key = `${x},${y}`; if (occupied.has(key)) return false; occupied.add(key);
    }
  }
  return true;
}
export function movePuzzle(state, id, dx, dy, definition = PHOTO_PUZZLE) {
  if (!validPuzzle(state, definition) || !definition.pieces.some(p => p.id === id)
    || !Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) + Math.abs(dy) !== 1) return null;
  const next = structuredClone(state); next.positions[id].x += dx; next.positions[id].y += dy; next.moves++;
  return validPuzzle(next, definition) ? next : null;
}
export function puzzleSolved(state, definition = PHOTO_PUZZLE) {
  return validPuzzle(state, definition) && state.positions[definition.goal.id].x === definition.goal.x
    && state.positions[definition.goal.id].y === definition.goal.y;
}
export function puzzleHint(state, definition = PHOTO_PUZZLE, maximum = 25000) {
  if (!validPuzzle(state, definition) || puzzleSolved(state, definition)) return null;
  const key = s => definition.pieces.map(p => `${s.positions[p.id].x}${s.positions[p.id].y}`).join('|');
  const queue = [{ state, first: null }], seen = new Set([key(state)]);
  for (let cursor = 0; cursor < queue.length && cursor < maximum; cursor++) {
    const current = queue[cursor];
    for (const piece of definition.pieces) for (const [dx, dy] of [[0,-1],[-1,0],[1,0],[0,1]]) {
      const next = movePuzzle(current.state, piece.id, dx, dy, definition); if (!next) continue;
      const hash = key(next); if (seen.has(hash)) continue; seen.add(hash);
      const first = current.first || { id: piece.id, dx, dy };
      if (puzzleSolved(next, definition)) return first;
      queue.push({ state: next, first });
    }
  }
  return null;
}
