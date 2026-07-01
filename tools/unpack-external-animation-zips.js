import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  INPUT_DIR,
  UNPACKED_DIR,
  ensureExternalAnimationDirs,
  unpackZip,
  readJson,
  SELECTION_PATH,
  writeJson,
  REPORTS_DIR
} from "./external-animation-utils.mjs";

ensureExternalAnimationDirs();

const report = [];
const selection = readJson(SELECTION_PATH);
for (const [key, config] of Object.entries(selection.animations || {})) {
  if (!config.use) continue;
  const fileName = config.source;
  const zipPath = join(INPUT_DIR, fileName);
  if (!existsSync(zipPath)) {
    report.push({ key, zip: zipPath, outputDir: join(UNPACKED_DIR, key), missing: true, entries: 0, files: [] });
    continue;
  }
  const outputDir = join(UNPACKED_DIR, key);
  const entries = unpackZip(zipPath, outputDir);
  report.push({ key, zip: zipPath, outputDir, entries: entries.length, files: entries.map((entry) => entry.name) });
}

writeJson(join(REPORTS_DIR, "unpack-report.json"), report);
console.log(JSON.stringify(report.map(({ key, outputDir, entries }) => ({ key, outputDir, entries })), null, 2));
