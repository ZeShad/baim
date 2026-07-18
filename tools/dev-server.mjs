import { createServer } from "node:http";
import { createReadStream, existsSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = normalize(join(fileURLToPath(new URL("..", import.meta.url))));
const port = Number(process.env.PORT || 5173);
const editorScenes = {
  "scene.chapter1.apartment": {
    walkGeometryPath: "assets_src/chapter1/scenes/apartment/walk-geometry-v1.json",
    objectGeometryPath: "assets_src/chapter1/scenes/apartment/object-geometry-v1.json",
    layerPath: "assets_src/chapter1/scenes/apartment/layers.json",
    actionAnimationPath: "assets_src/characters/bai_mitko/external_animation_v1/external-animation-selection.json"
  }
};

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  if (req.method === "OPTIONS" && ["/__editor/save-scene-geometry", "/__editor/fit-action"].includes(url.pathname)) {
    res.writeHead(204, editorCorsHeaders());
    res.end();
    return;
  }
  if (req.method === "POST" && url.pathname === "/__editor/save-scene-geometry") {
    handleEditorSave(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/__editor/fit-action") {
    handleActionFit(req, res);
    return;
  }
  const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const path = normalize(join(root, requested));

  if (!path.startsWith(root) || !existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": types[extname(path)] || "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable"
  });
  createReadStream(path).pipe(res);
}).listen(port, () => {
  console.log(`Comrade Candidate dev server: http://localhost:${port}`);
});

function handleEditorSave(req, res) {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 2_000_000) req.destroy();
  });
  req.on("end", () => {
    try {
      const payload = JSON.parse(body || "{}");
      const config = editorScenes[payload.sceneId];
      if (!config) throw new Error(`Scene is not editor-configured: ${payload.sceneId}`);
      validateWalkGeometry(payload.walkGeometry);
      validateObjectGeometry(payload.objectGeometry);
      validateLayerSource(payload.layerSource);
      if (payload.actionAnimationSource) validateActionAnimationSource(payload.actionAnimationSource);
      writeKnownJson(config.walkGeometryPath, payload.walkGeometry);
      writeKnownJson(config.objectGeometryPath, payload.objectGeometry);
      writeKnownJson(config.layerPath, payload.layerSource);
      if (payload.actionAnimationSource && config.actionAnimationPath) writeKnownJson(config.actionAnimationPath, payload.actionAnimationSource);
      runBuild("tools/build-walk-masks.js");
      runBuild("tools/build-scene-object-geometry.js");
      runBuild("tools/build-scene-layer-runtime.js");
      if (payload.actionAnimationSource && config.actionAnimationPath) runBuild("tools/build-external-runtime-staging.js");
      json(res, 200, {
        ok: true,
        sceneId: payload.sceneId,
        actionAnimationSaved: Boolean(payload.actionAnimationSource && config.actionAnimationPath)
      });
    } catch (error) {
      json(res, 400, { ok: false, error: error.message });
    }
  });
}

function handleActionFit(req, res) {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    try {
      const payload = JSON.parse(body || "{}");
      const actionId = String(payload.actionId || "");
      if (!/^[a-z0-9_]+$/.test(actionId)) throw new Error("Invalid action animation ID");
      const result = spawnSync(process.execPath, ["tools/register-external-action.mjs", actionId, "--write"], { cwd: root, encoding: "utf8" });
      if (result.status !== 0) throw new Error(result.stderr || result.stdout || "action registration failed");
      runBuild("tools/build-external-runtime-staging.js");
      json(res, 200, { ok: true, report: JSON.parse(result.stdout) });
    } catch (error) {
      json(res, 400, { ok: false, error: error.message });
    }
  });
}

function writeKnownJson(relativePath, value) {
  const target = normalize(join(root, relativePath));
  if (!target.startsWith(root)) throw new Error(`Refusing to write outside project: ${relativePath}`);
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

function runBuild(script) {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${script} failed: ${result.stderr || result.stdout}`);
}

function validateWalkGeometry(value) {
  const raster = value?.raster;
  if (!raster) throw new Error("walkGeometry.raster is required");
  if (!Number.isInteger(raster.width) || !Number.isInteger(raster.height)) throw new Error("walk raster width/height must be integers");
  if (!Array.isArray(raster.rows) || raster.rows.length !== raster.height) throw new Error("walk raster rows height mismatch");
  for (let y = 0; y < raster.rows.length; y += 1) {
    const row = raster.rows[y];
    if (typeof row !== "string" || row.length !== raster.width) throw new Error(`walk raster row ${y} width mismatch`);
  }
}

function validateObjectGeometry(value) {
  if (!Array.isArray(value?.objects)) throw new Error("objectGeometry.objects is required");
  for (const object of value.objects) {
    if (!object.id) throw new Error("object geometry id is required");
    if (!Array.isArray(object.polygon) || object.polygon.length < 3) throw new Error(`${object.id} polygon needs at least 3 points`);
    for (const point of object.polygon) {
      if (!Number.isFinite(Number(point?.x)) || !Number.isFinite(Number(point?.y))) throw new Error(`${object.id} polygon point must have x/y`);
    }
  }
}

function validateLayerSource(value) {
  if (!Array.isArray(value?.layers)) throw new Error("layerSource.layers is required");
  for (const layer of value.layers) {
    if (!layer.id) throw new Error("layer id is required");
    if (layer.enabled !== false && !layer.asset) throw new Error(`${layer.id} asset is required`);
    if (!Number.isFinite(Number(layer.zIndex))) throw new Error(`${layer.id} zIndex must be a number`);
    for (const key of ["top", "left", "right", "bottom", "width", "height"]) {
      if (layer[key] !== undefined && !Number.isFinite(Number(layer[key]))) throw new Error(`${layer.id} ${key} must be a number`);
    }
  }
}

function validateActionAnimationSource(value) {
  if (!value || typeof value !== "object") throw new Error("actionAnimationSource must be an object");
  if (!value.animations || typeof value.animations !== "object") throw new Error("actionAnimationSource.animations is required");
  for (const [key, animation] of Object.entries(value.animations)) {
    if (!animation || typeof animation !== "object") throw new Error(`${key} animation config must be an object`);
    for (const field of ["fps", "scale", "offsetX", "offsetY"]) {
      if (animation[field] !== undefined && !Number.isFinite(Number(animation[field]))) throw new Error(`${key}.${field} must be a number`);
    }
    if (animation.offsets !== undefined) validateAnimationOffsets(key, animation.offsets);
  }
}

function validateAnimationOffsets(key, offsets) {
  if (!Array.isArray(offsets)) throw new Error(`${key}.offsets must be an array`);
  for (let index = 0; index < offsets.length; index += 1) {
    const entry = offsets[index];
    if (entry === null) continue;
    if (Array.isArray(entry)) {
      if (entry.length < 2 || !Number.isFinite(Number(entry[0])) || !Number.isFinite(Number(entry[1]))) {
        throw new Error(`${key}.offsets[${index}] must be [x, y]`);
      }
      continue;
    }
    if (typeof entry === "object" && Number.isFinite(Number(entry.x)) && Number.isFinite(Number(entry.y))) continue;
    throw new Error(`${key}.offsets[${index}] must be null, [x,y], or {x,y}`);
  }
}

function json(res, status, value) {
  res.writeHead(status, {
    ...editorCorsHeaders(),
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(value));
}

function editorCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
