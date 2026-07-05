const EDITOR_SCENES = {
  "scene.chapter1.apartment": {
    walkGeometryPath: "assets_src/chapter1/scenes/apartment/walk-geometry-v1.json",
    objectGeometryPath: "assets_src/chapter1/scenes/apartment/object-geometry-v1.json",
    layerPath: "assets_src/chapter1/scenes/apartment/layers.json"
  }
};

const VERTEX_HIT_RADIUS = 9;
const EDGE_HIT_RADIUS = 8;

export class SceneEditor {
  constructor(game) {
    this.game = game;
    this.mode = "walk";
    this.cell = "c";
    this.status = "Loading editor source...";
    this.panelSide = "left";
    this.walkSource = null;
    this.objectSource = null;
    this.layerSource = null;
    this.rows = [];
    this.selectedObjectId = null;
    this.selectedLayerId = null;
    this.drag = null;
    this.painting = null;
    this.load();
  }

  get config() {
    return EDITOR_SCENES[this.game.currentScene.id] || null;
  }

  get objects() {
    const sceneObjects = [...this.game.currentScene.exits, ...this.game.currentScene.interactables, ...this.game.currentScene.npcs];
    const byId = new Map(sceneObjects.map((object) => [object.id, object]));
    if (!this.objectSource?.objects) return [];
    return this.objectSource.objects.map((entry) => ({
      ...(byId.get(entry.id) || { id: entry.id, kind: entry.id.startsWith("exit.") ? "exit" : "draft" }),
      id: entry.id,
      polygon: entry.polygon
    }));
  }

  get layers() {
    return (this.layerSource?.layers || []).filter((layer) => layer.enabled !== false);
  }

  async load() {
    if (!this.config) {
      this.status = `No editor source configured for ${this.game.currentScene.id}`;
      this.game.renderUi();
      return;
    }
    try {
      const suffix = `?editor=${Date.now()}`;
      const [walkSource, objectSource, layerSource] = await Promise.all([
        fetch(this.config.walkGeometryPath + suffix).then((response) => response.json()),
        fetch(this.config.objectGeometryPath + suffix).then((response) => response.json()),
        fetch(this.config.layerPath + suffix).then((response) => response.json())
      ]);
      this.walkSource = walkSource;
      this.objectSource = objectSource;
      this.layerSource = layerSource;
      this.rows = walkSource.raster.rows.slice();
      this.selectedObjectId = this.objects[0]?.id || null;
      this.selectedLayerId = this.layers[0]?.id || null;
      this.applyToRuntime();
      this.status = "Editor ready";
    } catch (error) {
      this.status = `Editor load failed: ${error.message}`;
    }
    this.game.renderUi();
  }

  createPanel() {
    const panel = document.createElement("section");
    panel.className = "panel scene-editor";
    if (this.panelSide === "right") panel.classList.add("right");
    const objectOptions = this.objects.map((object) => `<option value="${escapeHtml(object.id)}"${object.id === this.selectedObjectId ? " selected" : ""}>${escapeHtml(displayObjectId(object.id))}</option>`).join("");
    const layerOptions = this.layers.map((layer) => `<option value="${escapeHtml(layer.id)}"${layer.id === this.selectedLayerId ? " selected" : ""}>${escapeHtml(displayLayerId(layer.id))}</option>`).join("");
    const selectedLayer = this.selectedLayer();
    panel.innerHTML = `
      <div class="scene-editor-title">Scene Edit Mode</div>
      <label>Tool
        <select data-editor="mode">
          <option value="walk"${this.mode === "walk" ? " selected" : ""}>Walkable raster</option>
          <option value="objects"${this.mode === "objects" ? " selected" : ""}>Object polygons</option>
          <option value="layers"${this.mode === "layers" ? " selected" : ""}>Layer positions</option>
        </select>
      </label>
      ${this.mode === "walk" ? `<label>Walk cell
        <select data-editor="cell">
          ${this.walkCellOptions()}
        </select>
      </label>` : ""}
      ${this.mode === "objects" ? `<label>Object
        <select data-editor="object">${objectOptions}</select>
      </label>` : ""}
      ${this.mode === "layers" ? `<label>Layer
        <select data-editor="layer">${layerOptions}</select>
      </label>
      <label>Z position
        <input data-editor="layer-z" type="number" step="0.1" value="${escapeHtml(selectedLayer?.zIndex ?? 0)}">
      </label>
      <div class="scene-editor-layer-grid">
        ${["left", "top", "right", "bottom"].map((key) => `<label>${key}<input data-editor="layer-field" data-field="${key}" type="number" step="1" value="${escapeHtml(layerFieldValue(selectedLayer, key))}"></label>`).join("")}
      </div>
      <div class="scene-editor-layer-position">${escapeHtml(layerPositionText(selectedLayer))}</div>
      <div class="scene-editor-actions">
        <button type="button" data-editor="layer-nudge" data-dx="-1" data-dy="0">x-1</button>
        <button type="button" data-editor="layer-nudge" data-dx="1" data-dy="0">x+1</button>
        <button type="button" data-editor="layer-nudge" data-dx="0" data-dy="-1">y-1</button>
        <button type="button" data-editor="layer-nudge" data-dx="0" data-dy="1">y+1</button>
      </div>` : ""}
      <div class="scene-editor-actions">
        <button type="button" data-editor="dock">${this.panelSide === "left" ? "Move Right" : "Move Left"}</button>
        <button type="button" data-editor="save">Save JSON</button>
        <button type="button" data-editor="reload">Reload Source</button>
      </div>
      ${this.mode === "objects" ? `<div class="scene-editor-actions">
        <button type="button" data-editor="new-object">New Object</button>
        <button type="button" data-editor="delete-object">Delete Object</button>
      </div>` : ""}
      <div class="scene-editor-help">${this.helpText()}</div>
      <div class="scene-editor-status">${escapeHtml(this.status)}</div>
    `;
    panel.addEventListener("pointerdown", (event) => event.stopPropagation());
    panel.addEventListener("pointermove", (event) => event.stopPropagation());
    panel.addEventListener("pointerup", (event) => event.stopPropagation());
    panel.addEventListener("click", (event) => event.stopPropagation());
    panel.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
    panel.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    panel.querySelector('[data-editor="mode"]').addEventListener("change", (event) => {
      this.mode = event.target.value;
      if (this.mode === "objects" && !this.selectedObjectId) this.selectedObjectId = this.objects[0]?.id || null;
      if (this.mode === "layers" && !this.selectedLayerId) this.selectedLayerId = this.layers[0]?.id || null;
      this.game.renderUi();
    });
    panel.querySelector('[data-editor="cell"]')?.addEventListener("change", (event) => {
      this.cell = event.target.value;
    });
    panel.querySelector('[data-editor="object"]')?.addEventListener("change", (event) => {
      this.selectedObjectId = event.target.value;
      this.game.renderUi();
    });
    panel.querySelector('[data-editor="layer"]')?.addEventListener("change", (event) => {
      this.selectedLayerId = event.target.value;
      this.game.renderUi();
    });
    panel.querySelector('[data-editor="layer-z"]')?.addEventListener("change", (event) => {
      const layer = this.selectedLayer();
      const zIndex = Number(event.target.value);
      if (!layer || !Number.isFinite(zIndex)) return;
      layer.zIndex = zIndex;
      this.applyLayersToRuntime();
      this.game.renderUi();
    });
    panel.querySelectorAll('[data-editor="layer-field"]').forEach((input) => {
      input.addEventListener("change", () => {
        const layer = this.selectedLayer();
        if (!layer) return;
        const field = input.dataset.field;
        if (input.value.trim() === "") delete layer[field];
        else {
          const value = Number(input.value);
          if (Number.isFinite(value)) layer[field] = value;
        }
        this.applyLayersToRuntime();
        this.game.renderUi();
      });
      input.addEventListener("wheel", (event) => this.handleLayerNumberWheel(event, input));
    });
    panel.querySelector('[data-editor="layer-z"]')?.addEventListener("wheel", (event) => this.handleLayerNumberWheel(event, event.currentTarget));
    panel.querySelectorAll('[data-editor="layer-nudge"]').forEach((button) => {
      button.addEventListener("click", () => {
        this.moveSelectedLayer(Number(button.dataset.dx || 0), Number(button.dataset.dy || 0));
        this.game.renderUi();
      });
    });
    panel.querySelector('[data-editor="dock"]').addEventListener("click", () => {
      this.panelSide = this.panelSide === "left" ? "right" : "left";
      this.game.renderUi();
    });
    panel.querySelector('[data-editor="new-object"]')?.addEventListener("click", () => this.createObject());
    panel.querySelector('[data-editor="delete-object"]')?.addEventListener("click", () => this.deleteSelectedObject());
    panel.querySelector('[data-editor="save"]').addEventListener("click", () => this.save());
    panel.querySelector('[data-editor="reload"]').addEventListener("click", () => this.load());
    return panel;
  }

  walkCellOptions() {
    const legend = this.walkSource?.legend || this.game.currentScene.walkMask?.legend || {};
    return Object.entries(legend)
      .filter(([key, entry]) => key !== "." && entry?.walkable)
      .map(([key, entry]) => `<option value="${escapeHtml(key)}"${key === this.cell ? " selected" : ""}>${escapeHtml(key)} ${escapeHtml(entry.role || "")}</option>`)
      .join("");
  }

  helpText() {
    if (this.mode === "walk") return "Left drag paints walk cells. Right drag erases cells. Rows are saved as strings.";
    if (this.mode === "layers") return "Drag the selected layer. Use the nudge buttons for exact one-pixel placement. Z: lower is more front.";
    return "Left drag moves vertices. Left click an edge inserts a vertex. Left click elsewhere appends. Right click a vertex removes it.";
  }

  handlePointerDown(event, point) {
    if (!this.config || event.button > 2) return false;
    if (this.mode === "walk") return this.handleWalkPointerDown(event, point);
    if (this.mode === "layers") return this.handleLayerPointerDown(event, point);
    return this.handleObjectPointerDown(event, point);
  }

  handlePointerMove(event, point) {
    if (this.painting) {
      this.paintCell(point, this.painting.cell);
      return true;
    }
    if (this.drag?.kind === "layer") {
      const dx = point.x - this.drag.last.x;
      const dy = point.y - this.drag.last.y;
      this.moveSelectedLayer(dx, dy, false);
      this.drag.last = point;
      return true;
    }
    if (this.drag) {
      const polygon = this.selectedPolygon();
      if (polygon?.[this.drag.index]) {
        polygon[this.drag.index] = roundPoint(point);
        this.syncSelectedPolygonToRuntime();
      }
      return true;
    }
    return false;
  }

  handlePointerUp() {
    this.painting = null;
    this.drag = null;
  }

  handleWalkPointerDown(event, point) {
    const cell = event.button === 2 ? "." : this.cell;
    this.painting = { cell };
    this.paintCell(point, cell);
    return true;
  }

  handleObjectPointerDown(event, point) {
    const polygon = this.ensureSelectedPolygon();
    if (!polygon) return true;
    const vertex = nearestVertex(polygon, point);
    if (event.button === 2) {
      if (vertex && polygon.length > 3) {
        polygon.splice(vertex.index, 1);
        this.syncSelectedPolygonToRuntime();
      }
      return true;
    }
    if (vertex) {
      this.drag = { index: vertex.index };
      return true;
    }
    const edge = nearestEdge(polygon, point);
    if (edge && edge.distance <= EDGE_HIT_RADIUS) {
      polygon.splice(edge.index + 1, 0, roundPoint(point));
      this.drag = { index: edge.index + 1 };
      this.syncSelectedPolygonToRuntime();
      return true;
    }
    polygon.push(roundPoint(point));
    this.drag = { index: polygon.length - 1 };
    this.syncSelectedPolygonToRuntime();
    return true;
  }

  handleLayerPointerDown(event, point) {
    if (event.button === 2) return true;
    if (!this.selectedLayer() && this.layers.length) this.selectedLayerId = this.layers[0].id;
    this.drag = { kind: "layer", last: point };
    return true;
  }

  paintCell(point, value) {
    const mask = this.game.currentScene.walkMask;
    const width = this.walkSource?.raster?.width || mask.width;
    const height = this.walkSource?.raster?.height || mask.height;
    const x = Math.floor((point.x / mask.worldWidth) * width);
    const y = Math.floor((point.y / mask.worldHeight) * height);
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const row = this.rows[y] || ".".repeat(width);
    this.rows[y] = row.slice(0, x) + value + row.slice(x + 1);
    this.applyWalkRowsToRuntime();
  }

  selectedPolygon() {
    return this.objectEntry(this.selectedObjectId)?.polygon || null;
  }

  ensureSelectedPolygon() {
    const object = this.objects.find((candidate) => candidate.id === this.selectedObjectId);
    if (!object) return null;
    let entry = this.objectEntry(object.id);
    if (!entry) {
      entry = {
        id: object.id,
        polygon: object.polygon?.map(roundPoint) || rectToPolygon(object.rect)
      };
      this.objectSource.objects.push(entry);
    }
    if (!Array.isArray(entry.polygon) || entry.polygon.length < 3) entry.polygon = object.polygon?.map(roundPoint) || rectToPolygon(object.rect);
    return entry.polygon;
  }

  objectEntry(id) {
    return this.objectSource?.objects?.find((object) => object.id === id) || null;
  }

  syncSelectedPolygonToRuntime() {
    const entry = this.objectEntry(this.selectedObjectId);
    const object = this.runtimeObject(this.selectedObjectId);
    if (entry?.polygon && object) object.polygon = entry.polygon.map(roundPoint);
  }

  applyToRuntime() {
    this.applyWalkRowsToRuntime();
    for (const entry of this.objectSource?.objects || []) {
      const object = this.runtimeObject(entry.id);
      if (object && entry.polygon?.length) object.polygon = entry.polygon.map(roundPoint);
    }
    this.applyLayersToRuntime();
  }

  runtimeObject(id) {
    return [...this.game.currentScene.exits, ...this.game.currentScene.interactables, ...this.game.currentScene.npcs].find((object) => object.id === id) || null;
  }

  createObject() {
    if (!this.objectSource) return;
    const raw = prompt("Object code, for example dirty_wall or exit.to_square");
    const id = normalizeObjectCode(raw);
    if (!id) return;
    if (this.objectEntry(id) || this.objects.some((object) => object.id === id)) {
      this.status = `Object already exists: ${displayObjectId(id)}`;
      this.game.renderUi();
      return;
    }
    const center = this.editorViewportCenter();
    this.objectSource.objects.push({
      id,
      polygon: [
        { x: center.x - 50, y: center.y - 40 },
        { x: center.x + 50, y: center.y - 40 },
        { x: center.x + 50, y: center.y + 40 },
        { x: center.x - 50, y: center.y + 40 }
      ].map(roundPoint)
    });
    this.selectedObjectId = id;
    this.mode = "objects";
    this.status = `Created draft object ${displayObjectId(id)}. Move vertices, then Save JSON.`;
    this.game.renderUi();
  }

  async deleteSelectedObject() {
    if (!this.objectSource || !this.selectedObjectId) return;
    const label = displayObjectId(this.selectedObjectId);
    if (!confirm(`Delete object geometry "${label}" from source JSON?`)) return;
    this.objectSource.objects = this.objectSource.objects.filter((object) => object.id !== this.selectedObjectId);
    const runtimeObject = [...this.game.currentScene.exits, ...this.game.currentScene.interactables, ...this.game.currentScene.npcs].find((object) => object.id === this.selectedObjectId);
    if (runtimeObject) delete runtimeObject.polygon;
    this.selectedObjectId = this.objectSource.objects[0]?.id || null;
    this.status = `Deleted ${label}; saving...`;
    this.game.renderUi();
    await this.save();
  }

  editorViewportCenter() {
    return { x: 640, y: 360 };
  }

  applyWalkRowsToRuntime() {
    if (this.game.currentScene.walkMask) this.game.currentScene.walkMask.rows = this.rows.slice();
  }

  selectedLayer() {
    return this.layers.find((layer) => layer.id === this.selectedLayerId) || null;
  }

  moveSelectedLayer(dx, dy, snap = true) {
    const layer = this.selectedLayer();
    if (!layer) return;
    moveLayerAxis(layer, "left", "right", dx);
    moveLayerAxis(layer, "top", "bottom", dy);
    if (snap) {
      for (const key of ["top", "left", "right", "bottom"]) {
        if (Number.isFinite(Number(layer[key]))) layer[key] = Math.round(Number(layer[key]));
      }
    }
    this.applyLayersToRuntime();
  }

  applyLayersToRuntime() {
    if (!this.layerSource) return;
    this.game.currentScene.foregroundLayers = this.layers.map(runtimeLayerFromSource);
  }

  handleLayerNumberWheel(event, input) {
    if (document.activeElement !== input) input.focus();
    event.preventDefault();
    event.stopPropagation();
    const steps = event.ctrlKey ? 10 : 1;
    if (event.deltaY < 0) input.stepUp(steps);
    else input.stepDown(steps);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async save() {
    if (!this.config || !this.walkSource || !this.objectSource || !this.layerSource) return;
    this.walkSource.raster.rows = this.rows.slice();
    this.objectSource.objects = this.objectSource.objects.map((object) => ({
      id: object.id,
      polygon: (object.polygon || []).map(roundPoint)
    }));
    this.layerSource.layers = this.layerSource.layers.map(cleanLayerSource);
    this.status = "Saving...";
    this.game.renderUi();
    try {
      const response = await fetch("/__editor/save-scene-geometry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: this.game.currentScene.id,
          walkGeometry: this.walkSource,
          objectGeometry: this.objectSource,
          layerSource: this.layerSource
        })
      });
      const text = await response.text();
      let result = null;
      try {
        result = JSON.parse(text);
      } catch {
        if (response.status === 404) {
          throw new Error("editor save endpoint not found on this running server; restart the dev server so tools/dev-server.mjs is the process on this port");
        }
        throw new Error(text || "save failed with non-JSON response");
      }
      if (!response.ok) throw new Error(result.error || "save failed");
      this.status = `Saved ${result.sceneId}`;
    } catch (error) {
      this.status = `Save failed: ${error.message}`;
    }
    this.game.renderUi();
  }

  draw(ctx) {
    if (!this.config) return;
    if (this.mode === "walk") this.drawWalkGrid(ctx);
    if (this.mode === "objects") this.drawObjectPolygons(ctx);
    if (this.mode === "layers") this.drawLayerBounds(ctx);
  }

  drawWalkGrid(ctx) {
    const mask = this.game.currentScene.walkMask;
    if (!mask) return;
    const width = this.walkSource?.raster?.width || mask.width;
    const height = this.walkSource?.raster?.height || mask.height;
    const cellWidth = mask.worldWidth / width;
    const cellHeight = mask.worldHeight / height;
    const legend = this.walkSource?.legend || mask.legend || {};
    ctx.save();
    for (let y = 0; y < height; y += 1) {
      const row = this.rows[y] || "";
      for (let x = 0; x < width; x += 1) {
        const value = row[x] || ".";
        if (value === ".") continue;
        ctx.fillStyle = legend[value]?.debugFill || "rgba(91, 214, 120, 0.2)";
        ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
      }
    }
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * cellWidth, 0);
      ctx.lineTo(x * cellWidth, mask.worldHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellHeight);
      ctx.lineTo(mask.worldWidth, y * cellHeight);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawObjectPolygons(ctx) {
    const object = this.objects.find((candidate) => candidate.id === this.selectedObjectId);
    if (!object && this.objects.length) {
      this.selectedObjectId = this.objects[0].id;
      return;
    }
    if (!object) return;
    const polygon = this.objectEntry(object.id)?.polygon || object.polygon;
    if (!polygon?.length) return;
    ctx.save();
    ctx.beginPath();
    polygon.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 216, 87, 0.18)";
    ctx.strokeStyle = "rgba(255, 216, 87, 0.95)";
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();
    for (const point of polygon) {
      ctx.fillStyle = "#111";
      ctx.strokeStyle = "#ffd857";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawLayerBounds(ctx) {
    const layer = this.selectedLayer();
    if (!layer && this.layers.length) {
      this.selectedLayerId = this.layers[0].id;
      return;
    }
    if (!layer) return;
    const runtimeLayer = runtimeLayerFromSource(layer);
    const image = this.game.assets.getSceneImage(this.game.currentScene.id, runtimeLayer.asset);
    const rect = this.game.renderer.sceneLayerRect(runtimeLayer, image);
    ctx.save();
    ctx.fillStyle = "rgba(96, 219, 255, 0.12)";
    ctx.strokeStyle = "rgba(96, 219, 255, 0.95)";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(rect.x, Math.max(0, rect.y - 26), Math.min(520, Math.max(260, rect.width)), 26);
    ctx.fillStyle = "#d9f7ff";
    ctx.font = "20px sans-serif";
    ctx.fillText(`${displayLayerId(layer.id)} z:${Number(layer.zIndex).toFixed(1)} ${layerPositionText(layer)}`, rect.x + 8, Math.max(22, rect.y - 7));
    ctx.restore();
  }
}

function rectToPolygon(rect) {
  if (!rect) return [];
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x + rect.w, y: rect.y + rect.h },
    { x: rect.x, y: rect.y + rect.h }
  ];
}

function roundPoint(point) {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

function nearestVertex(polygon, point) {
  let best = null;
  polygon.forEach((vertex, index) => {
    const distance = Math.hypot(vertex.x - point.x, vertex.y - point.y);
    if (distance <= VERTEX_HIT_RADIUS && (!best || distance < best.distance)) best = { index, distance };
  });
  return best;
}

function nearestEdge(polygon, point) {
  let best = null;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    const distance = distanceToSegment(point, a, b);
    if (!best || distance < best.distance) best = { index, distance };
  }
  return best;
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq));
  return Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function displayObjectId(id) {
  const value = String(id || "");
  if (value.startsWith("exit.apartment.")) return `exit.${value.slice("exit.apartment.".length)}`;
  if (value.startsWith("hotspot.apartment.")) return value.slice("hotspot.apartment.".length);
  if (value.startsWith("npc.")) return value.slice("npc.".length);
  return value;
}

function displayLayerId(id) {
  return String(id || "").replace(/^layer\.apartment\./, "");
}

function layerPositionText(layer) {
  if (!layer) return "No layer selected";
  const parts = [];
  for (const key of ["left", "top", "right", "bottom", "width", "height"]) {
    if (Number.isFinite(Number(layer[key]))) parts.push(`${key}:${Number(layer[key]).toFixed(0)}`);
  }
  return parts.length ? parts.join(" ") : "left:0 top:0";
}

function layerFieldValue(layer, key) {
  return Number.isFinite(Number(layer?.[key])) ? Number(layer[key]) : "";
}

function moveLayerAxis(layer, startKey, endKey, delta) {
  const hasStart = Number.isFinite(Number(layer[startKey]));
  const hasEnd = Number.isFinite(Number(layer[endKey]));
  if (hasStart || !hasEnd) layer[startKey] = roundNumber((hasStart ? Number(layer[startKey]) : 0) + delta);
  else layer[endKey] = roundNumber(Number(layer[endKey]) - delta);
}

function runtimeLayerFromSource(layer) {
  const result = {
    id: layer.id,
    asset: layer.asset,
    zIndex: Number(layer.zIndex)
  };
  for (const key of ["top", "left", "right", "bottom", "width", "height"]) {
    if (Number.isFinite(Number(layer[key]))) result[key] = Number(layer[key]);
  }
  if (!Number.isFinite(Number(result.top)) && !Number.isFinite(Number(result.bottom))) result.top = 0;
  if (!Number.isFinite(Number(result.left)) && !Number.isFinite(Number(result.right))) result.left = 0;
  return result;
}

function cleanLayerSource(layer) {
  const result = { ...layer };
  for (const key of ["top", "left", "right", "bottom", "width", "height", "zIndex"]) {
    if (result[key] === "" || result[key] === null) delete result[key];
    else if (Number.isFinite(Number(result[key]))) result[key] = roundNumber(Number(result[key]));
  }
  if (!Number.isFinite(Number(result.zIndex))) result.zIndex = 0;
  if (!Number.isFinite(Number(result.top)) && !Number.isFinite(Number(result.bottom))) result.top = 0;
  if (!Number.isFinite(Number(result.left)) && !Number.isFinite(Number(result.right))) result.left = 0;
  return result;
}

function roundNumber(value) {
  return Math.round(value * 1000) / 1000;
}

function normalizeObjectCode(value) {
  const code = String(value || "").trim();
  if (!code) return "";
  return code
    .toLowerCase()
    .replaceAll(/\s+/g, "_")
    .replaceAll(/[^a-z0-9_.-]/g, "")
    .replaceAll(/\.{2,}/g, ".")
    .replaceAll(/_{2,}/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "");
}
