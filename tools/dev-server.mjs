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
    objectGeometryPath: "assets_src/chapter1/scenes/apartment/object-geometry-v1.json"
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
  if (req.method === "OPTIONS" && url.pathname === "/__editor/save-scene-geometry") {
    res.writeHead(204, editorCorsHeaders());
    res.end();
    return;
  }
  if (req.method === "POST" && url.pathname === "/__editor/save-scene-geometry") {
    handleEditorSave(req, res);
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
      writeKnownJson(config.walkGeometryPath, payload.walkGeometry);
      writeKnownJson(config.objectGeometryPath, payload.objectGeometry);
      runBuild("tools/build-walk-masks.js");
      runBuild("tools/build-scene-object-geometry.js");
      json(res, 200, { ok: true, sceneId: payload.sceneId });
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
