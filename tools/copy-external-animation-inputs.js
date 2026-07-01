import { copyKnownInputZips, writeJson, REPORTS_DIR } from "./external-animation-utils.mjs";
import { join } from "node:path";

const result = copyKnownInputZips();
writeJson(join(REPORTS_DIR, "input-copy-report.json"), result);
console.log(JSON.stringify(result, null, 2));
