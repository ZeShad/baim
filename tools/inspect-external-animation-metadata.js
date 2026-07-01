import { join } from "node:path";
import {
  REPORTS_DIR,
  animationFolders,
  ensureExternalAnimationDirs,
  inspectAnimationFolder,
  readJson,
  SELECTION_PATH,
  writeJson
} from "./external-animation-utils.mjs";

ensureExternalAnimationDirs();

const selection = readJson(SELECTION_PATH);
const selected = new Set(Object.entries(selection.animations || {}).filter(([, config]) => config.use).map(([key]) => key));
const report = animationFolders().filter((folder) => selected.has(folder.key)).map(inspectAnimationFolder);
writeJson(join(REPORTS_DIR, "metadata-inspection-report.json"), report);
console.log(JSON.stringify(report.map((item) => ({
  key: item.key,
  metadataFile: item.metadataFile,
  metadataUsable: item.metadataUsable,
  parseMode: item.parseMode,
  sheet: `${item.sheetWidth}x${item.sheetHeight}`,
  frameCount: item.frameCount,
  frame: `${item.frameWidth}x${item.frameHeight}`,
  alpha: item.alpha
})), null, 2));
