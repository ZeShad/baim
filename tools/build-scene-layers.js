import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PNG } from "pngjs";
import sharp from "sharp";

const SPECS = [
  "assets_src/chapter1/scenes/apartment/layers.json"
];

for (const specPath of SPECS) {
  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  for (const layer of spec.layers || []) {
    if (!layer.enabled) continue;
    mkdirSync(dirname(layer.output), { recursive: true });
    const mask = await sharp(layer.approvedMask)
      .resize(layer.width, layer.height, { fit: "fill" })
      .removeAlpha()
      .grayscale()
      .raw()
      .toBuffer();
    const source = await sharp(layer.source)
      .resize(layer.width, layer.height, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer();
    const png = new PNG({ width: layer.width, height: layer.height });
    for (let index = 0; index < layer.width * layer.height; index += 1) {
      png.data[index * 4] = source[index * 3];
      png.data[index * 4 + 1] = source[index * 3 + 1];
      png.data[index * 4 + 2] = source[index * 3 + 2];
      png.data[index * 4 + 3] = mask[index];
    }
    writeFileSync(layer.output, PNG.sync.write(png));
    console.log(JSON.stringify({ id: layer.id, zIndex: layer.zIndex, output: layer.output, mask: layer.approvedMask }));
  }
}
