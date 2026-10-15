import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PNG } from "pngjs";
import sharp from "sharp";
import { externalAnimationV1 } from "../src/content/art/externalAnimationV1.generated.js";
import {
  CLEANED_DIR,
  SELECTION_PATH,
  animationFolders,
  cropFrame,
  ensureDir,
  inspectAnimationFolder,
  readJson,
  readPng,
  robustChromaKeyGreenToAlpha
} from "./external-animation-utils.mjs";

const ROOT = resolve(".");
const OUTPUT_HTML = join(ROOT, "docs", "bai-mitko-animation-catalog.html");
const OUTPUT_PDF = join(ROOT, "docs", "bai-mitko-animation-catalog.pdf");
const METADATA_PATH = join(dirname(SELECTION_PATH), "animation-catalog-metadata.json");
const args = new Set(process.argv.slice(2));

function titleize(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function categoryFor(key, config) {
  if (config.action) return "Action";
  if (key.startsWith("walk_")) return "Walk";
  if (key.startsWith("idle_")) return "Idle";
  if (key.startsWith("talk_")) return "Talk";
  if (key.startsWith("reject_")) return "Reaction";
  return "Other";
}

function fallbackDescription(key, config, category) {
  if (config.action) return `Bai Mitko performs the ${titleize(config.action)} story action.`;
  return `${titleize(key)} is an enabled ${category.toLowerCase()} animation in Bai Mitko's runtime set.`;
}

function contentSource() {
  const root = join(ROOT, "src", "content");
  const chunks = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(js|mjs|json)$/.test(entry.name)) chunks.push(readFileSync(path, "utf8"));
    }
  };
  walk(root);
  return chunks.join("\n");
}

export function usageFor(key, config, category, source, metadata = {}) {
  if (metadata.runtimeUsage === "retained" && config.reviewStatus !== "runtime_review") return { status: "Runtime-ready", usage: "Retained source; not selected by the current automatic controller" };
  if (config.reviewStatus === "runtime_review") return { status: "Runtime review", usage: "Local directional walking candidate; owner gameplay review/publication pending" };
  if (["Walk", "Idle", "Talk", "Reaction"].includes(category)) {
    return { status: "Live", usage: `Character controller - automatic ${category.toLowerCase()} selection` };
  }
  const action = config.action;
  const live = action && new RegExp(`animation\\s*:\\s*[\"']${action}[\"']`).test(source);
  const registration = config.registration;
  const location = registration
    ? [registration.sceneId, registration.sceneObjectId || registration.verb].filter(Boolean).join(" / ")
    : "Not assigned to a scene hotspot";
  return { status: live ? "Live" : "Runtime-ready", usage: live ? location : "Not assigned to a story hotspot" };
}

export function catalogRuntimeTiming(key, frameCount) {
  const runtime = externalAnimationV1.animations[key];
  if (!runtime || runtime.frameCount !== frameCount || !(runtime.fps > 0)) {
    throw new Error(`Catalog/runtime range mismatch: ${key}; rebuild runtime metadata first`);
  }
  return { fps: runtime.fps, duration: frameCount / runtime.fps };
}

async function thumbnail(frame) {
  const encoded = PNG.sync.write(frame);
  const output = await sharp(encoded).resize({ width: 240, height: 260, fit: "contain", background: { r: 246, g: 244, b: 238, alpha: 1 } }).png().toBuffer();
  return `data:image/png;base64,${output.toString("base64")}`;
}

export async function buildCatalogData() {
  const selection = readJson(SELECTION_PATH);
  const metadata = existsSync(METADATA_PATH) ? readJson(METADATA_PATH) : {};
  const folders = new Map(animationFolders().map((folder) => [folder.key, folder]));
  const source = contentSource();
  const entries = [];

  for (const [key, config] of Object.entries(selection.animations || {})) {
    if (!config.use) continue;
    const folder = folders.get(key);
    if (!folder) throw new Error(`Catalog cannot find unpacked animation: ${key}`);
    const info = inspectAnimationFolder(folder);
    if (!info.sheetImage || !info.frames.length) throw new Error(`Catalog cannot inspect animation: ${key}`);
    const cleaned = join(CLEANED_DIR, `${key}.png`);
    const usingCleanedSheet = existsSync(cleaned);
    const sheet = readPng(usingCleanedSheet ? cleaned : info.sheetImage);
    const frameStart = Math.max(0, Number(config.frameStart || 0));
    const frameEndTrim = Math.max(0, Number(config.frameEndTrim || 0));
    const explicitCount = Number.isFinite(Number(config.frameCount)) ? Math.max(1, Number(config.frameCount)) : null;
    const frames = explicitCount
      ? info.frames.slice(frameStart, frameStart + explicitCount)
      : info.frames.slice(frameStart, frameEndTrim ? -frameEndTrim : undefined);
    const indexes = [...new Set([0, Math.floor((frames.length - 1) / 2), frames.length - 1])];
    const images = await Promise.all(indexes.map((index) => {
      const cropped = cropFrame(sheet, frames[index]);
      const prepared = usingCleanedSheet ? cropped : robustChromaKeyGreenToAlpha(cropped, config.chromaKey || {}).png;
      return thumbnail(prepared);
    }));
    const category = categoryFor(key, config);
    const authored = metadata[key] || {};
    const usage = usageFor(key, config, category, source, authored);
    const { fps, duration } = catalogRuntimeTiming(key, frames.length);
    entries.push({
      id: key,
      label: authored.label || titleize(key),
      description: authored.description || config.description || fallbackDescription(key, config, category),
      needsDescriptionReview: !authored.description && !config.description,
      category,
      status: usage.status,
      usage: usage.usage,
      frameCount: frames.length,
      fps: Number(fps.toFixed(2)),
      duration,
      loop: Boolean(config.loop),
      source: config.source || "Unknown source ZIP",
      directions: config.facing === "north" ? "North source / back view" : config.facing === "south" ? "South source / front view" : selection.mirrors && Object.values(selection.mirrors).some((value) => value.includes(key)) ? "East source + mirrored west" : "East source",
      images
    });
  }
  return entries;
}

function esc(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function renderHtml(entries) {
  const live = entries.filter((entry) => entry.status === "Live").length;
  const categories = [...new Set(entries.map((entry) => entry.category))];
  const cards = entries.map((entry) => `
    <article class="card" data-animation-id="${esc(entry.id)}" data-category="${esc(entry.category)}" data-status="${esc(entry.status)}">
      <div class="media">
        <img class="animated" src="${entry.images[0]}" data-frames="${esc(JSON.stringify(entry.images))}" alt="Animated preview of ${esc(entry.label)}">
        <div class="frames" aria-label="Start, middle, and end frames">${entry.images.map((image, index) => `<figure><img src="${image}" alt="${esc(entry.label)} frame ${index + 1}"><figcaption>${["Start", "Middle", "End"][index] || `Frame ${index + 1}`}</figcaption></figure>`).join("")}</div>
      </div>
      <div class="body">
        <div class="eyebrow"><span class="badge ${entry.status === "Live" ? "live" : "ready"}">${esc(entry.status)}</span><span>${esc(entry.category)}</span></div>
        <h2>${esc(entry.label)}</h2><code>${esc(entry.id)}</code>
        <p class="description">${esc(entry.description)}</p>
        ${entry.needsDescriptionReview ? '<p class="review">Needs visual description review</p>' : ""}
        <dl><div><dt>Frames</dt><dd>${entry.frameCount}</dd></div><div><dt>Rate</dt><dd>${entry.fps} fps</dd></div><div><dt>Duration</dt><dd>${entry.duration.toFixed(2)} s</dd></div><div><dt>Loop</dt><dd>${entry.loop ? "Yes" : "No"}</dd></div></dl>
        <p class="detail"><b>Directions:</b> ${esc(entry.directions)}</p>
        <p class="detail"><b>Used by:</b> ${esc(entry.usage)}</p>
        <p class="detail"><b>Source:</b> <code>${esc(entry.source)}</code></p>
      </div>
    </article>`).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bai Mitko Animation Catalog</title><style>
    :root{--ink:#252237;--muted:#69657b;--paper:#f6f4ee;--panel:#fff;--purple:#6841d9;--blue:#4f9bf5;--green:#17875d;--amber:#a35b00}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 Inter,Segoe UI,sans-serif}header{padding:54px clamp(24px,6vw,92px) 38px;background:linear-gradient(135deg,#17133b,#3f247d 62%,#235c9a);color:white}header h1{margin:0 0 8px;font-size:clamp(34px,6vw,64px);line-height:1}header p{max-width:850px;color:#dcd7f5;font-size:17px}.summary{display:flex;gap:28px;margin-top:25px}.summary strong{display:block;font-size:28px}.summary span{color:#c9c4e2}.controls{position:sticky;top:0;z-index:5;display:flex;gap:10px;flex-wrap:wrap;padding:16px clamp(24px,6vw,92px);background:rgba(246,244,238,.96);border-bottom:1px solid #ddd8cb}.controls button{border:1px solid #c9c2dc;border-radius:999px;background:white;padding:9px 14px;cursor:pointer}.controls button.active{background:var(--purple);color:white;border-color:var(--purple)}main{padding:28px clamp(20px,5vw,76px) 70px}.catalog-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(430px,1fr));gap:22px}.card{display:grid;grid-template-columns:minmax(190px,42%) 1fr;min-height:410px;background:var(--panel);border:1px solid #e2ded3;border-radius:20px;overflow:hidden;box-shadow:0 8px 28px #28203812}.media{background:#efede7;min-height:360px;display:flex;align-items:center;justify-content:center}.animated{width:100%;height:100%;max-height:440px;object-fit:contain}.frames{display:none}.body{padding:24px}.eyebrow{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em}.badge{border-radius:999px;padding:4px 9px;font-weight:700}.badge.live{background:#d8f4e8;color:var(--green)}.badge.ready{background:#fff0d7;color:var(--amber)}h2{margin:14px 0 2px;font-size:26px;line-height:1.1}.body>code{color:var(--purple);font-size:12px}.description{min-height:65px}.review{color:var(--amber);font-weight:700}dl{display:grid;grid-template-columns:repeat(4,1fr);margin:18px 0;border:1px solid #ece8df;border-radius:10px}dl div{padding:8px;border-right:1px solid #ece8df}dl div:last-child{border:0}dt{font-size:10px;color:var(--muted);text-transform:uppercase}dd{margin:1px 0;font-weight:700}.detail{margin:7px 0;font-size:12px;color:var(--muted)}footer{padding:25px;text-align:center;color:var(--muted)}
    @media(max-width:650px){.card{grid-template-columns:1fr}.media{height:330px}.catalog-grid{grid-template-columns:1fr}.summary{gap:14px;flex-wrap:wrap}}
    @media print{body{background:white;font-size:10px}header{padding:18mm 15mm 9mm;background:#24175f!important;-webkit-print-color-adjust:exact}header h1{font-size:30px}.summary{margin-top:12px}.summary strong{font-size:20px}.controls,footer{display:none}main{padding:8mm 10mm}.catalog-grid{display:block}.card{display:grid;grid-template-columns:42% 1fr;min-height:0;height:87mm;margin:0 0 6mm;border-radius:8px;box-shadow:none;break-inside:avoid;page-break-inside:avoid}.animated{display:none}.frames{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm;width:100%;padding:4mm}.frames figure{margin:0;display:flex;flex-direction:column}.frames img{width:100%;height:69mm;object-fit:contain;background:#f6f4ee}.frames figcaption{text-align:center;color:var(--muted)}.body{padding:5mm}.body h2{font-size:18px;margin-top:7px}.description{min-height:0}.detail{font-size:9px}dl{margin:8px 0}.card:nth-child(2n){break-after:page} }
  </style></head><body><header><p class="kicker">BAIM / CHARACTER ART REFERENCE</p><h1>Bai Mitko Animation Catalog</h1><p>Generated from the enabled Ludo animation manifest. East-facing exports are the authored sources; west-facing versions are mirrored by the runtime where listed.</p><div class="summary"><div><strong>${entries.length}</strong><span>enabled sources</span></div><div><strong>${live}</strong><span>used in gameplay</span></div><div><strong>${entries.length-live}</strong><span>runtime-ready</span></div></div></header><nav class="controls"><button class="active" data-filter="all">All</button>${categories.map((category) => `<button data-filter="${esc(category)}">${esc(category)}</button>`).join("")}<button data-filter="Runtime-ready">Runtime-ready only</button></nav><main><div class="catalog-grid">${cards}</div></main><footer>Generated by <code>npm run build:animation-catalog</code>. Do not edit this file by hand.</footer><script>
    const printing=new URLSearchParams(location.search).has('print');if(!printing){document.querySelectorAll('.animated').forEach((img,offset)=>{const frames=JSON.parse(img.dataset.frames);let index=0;setTimeout(()=>setInterval(()=>{index=(index+1)%frames.length;img.src=frames[index]},650),offset*70)});document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(item=>item.classList.remove('active'));button.classList.add('active');const filter=button.dataset.filter;document.querySelectorAll('.card').forEach(card=>card.hidden=filter!=='all'&&card.dataset.category!==filter&&card.dataset.status!==filter)}))}
  </script></body></html>`;
}

async function renderPdf() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${pathToFileURL(OUTPUT_HTML).href}?print=1`, { waitUntil: "networkidle" });
    await page.pdf({ path: OUTPUT_PDF, format: "A4", landscape: true, printBackground: true, margin: { top: "8mm", right: "7mm", bottom: "8mm", left: "7mm" } });
  } finally { await browser.close(); }
}

async function main() {
  const entries = await buildCatalogData();
  const html = renderHtml(entries).replace(/[ \t]+$/gm, "");
  if (args.has("--check")) {
    if (!existsSync(OUTPUT_HTML) || readFileSync(OUTPUT_HTML, "utf8") !== html) {
      console.error("Animation catalog is stale. Run npm run build:animation-catalog.");
      process.exitCode = 1;
    } else console.log(`Animation catalog is current (${entries.length} entries).`);
    return;
  }
  ensureDir(dirname(OUTPUT_HTML));
  writeFileSync(OUTPUT_HTML, html);
  if (!args.has("--html-only")) await renderPdf();
  console.log(`Built animation catalog with ${entries.length} entries.`);
  console.log(OUTPUT_HTML);
  if (!args.has("--html-only")) console.log(OUTPUT_PDF);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
