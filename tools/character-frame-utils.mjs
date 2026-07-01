import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PNG } from "pngjs";

export function ensureParent(file) {
  mkdirSync(dirname(file), { recursive: true });
}

export function readPng(file) {
  return PNG.sync.read(readFileSync(file));
}

export function writePng(file, png) {
  ensureParent(file);
  writeFileSync(file, PNG.sync.write(png));
}

export function makePng(width, height, fill = [0, 0, 0, 0]) {
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = fill[0];
    png.data[i + 1] = fill[1];
    png.data[i + 2] = fill[2];
    png.data[i + 3] = fill[3];
  }
  return png;
}

export function pixelIndex(png, x, y) {
  return (y * png.width + x) * 4;
}

export function alphaBounds(png, threshold = 8) {
  let minX = png.width;
  let minY = png.height;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[pixelIndex(png, x, y) + 3] > threshold) {
        found = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + 1);
        maxY = Math.max(maxY, y + 1);
      }
    }
  }
  return found ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY } : null;
}

export function unionBounds(bounds) {
  const valid = bounds.filter(Boolean);
  const minX = Math.min(...valid.map((b) => b.x));
  const minY = Math.min(...valid.map((b) => b.y));
  const maxX = Math.max(...valid.map((b) => b.x + b.w));
  const maxY = Math.max(...valid.map((b) => b.y + b.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function blit(target, source, sourceRect, targetRect) {
  for (let y = 0; y < targetRect.h; y += 1) {
    for (let x = 0; x < targetRect.w; x += 1) {
      const sx = sourceRect.x + Math.floor((x / targetRect.w) * sourceRect.w);
      const sy = sourceRect.y + Math.floor((y / targetRect.h) * sourceRect.h);
      const tx = targetRect.x + x;
      const ty = targetRect.y + y;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height) continue;
      const sourceIndex = pixelIndex(source, sx, sy);
      const targetIndex = pixelIndex(target, tx, ty);
      const alpha = source.data[sourceIndex + 3] / 255;
      if (alpha <= 0) continue;
      target.data[targetIndex] = Math.round(source.data[sourceIndex] * alpha + target.data[targetIndex] * (1 - alpha));
      target.data[targetIndex + 1] = Math.round(source.data[sourceIndex + 1] * alpha + target.data[targetIndex + 1] * (1 - alpha));
      target.data[targetIndex + 2] = Math.round(source.data[sourceIndex + 2] * alpha + target.data[targetIndex + 2] * (1 - alpha));
      target.data[targetIndex + 3] = Math.max(target.data[targetIndex + 3], source.data[sourceIndex + 3]);
    }
  }
}

export function drawChecker(target, cell = 16, a = [210, 210, 210, 255], b = [236, 236, 236, 255]) {
  for (let y = 0; y < target.height; y += 1) {
    for (let x = 0; x < target.width; x += 1) {
      const color = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0 ? a : b;
      const index = pixelIndex(target, x, y);
      target.data[index] = color[0];
      target.data[index + 1] = color[1];
      target.data[index + 2] = color[2];
      target.data[index + 3] = color[3];
    }
  }
}

export function fillRect(target, x, y, w, h, rgba) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      if (xx < 0 || yy < 0 || xx >= target.width || yy >= target.height) continue;
      const index = pixelIndex(target, xx, yy);
      target.data[index] = rgba[0];
      target.data[index + 1] = rgba[1];
      target.data[index + 2] = rgba[2];
      target.data[index + 3] = rgba[3];
    }
  }
}

export function drawLabel(target, text, x, y, rgba = [35, 35, 35, 255]) {
  const font = {
    "0": ["111","101","101","101","111"], "1": ["010","110","010","010","111"], "2": ["111","001","111","100","111"],
    "3": ["111","001","111","001","111"], "4": ["101","101","111","001","001"], "5": ["111","100","111","001","111"],
    "6": ["111","100","111","101","111"], "7": ["111","001","010","010","010"], "8": ["111","101","111","101","111"],
    "9": ["111","101","111","001","111"], "A": ["010","101","111","101","101"], "B": ["110","101","110","101","110"],
    "C": ["111","100","100","100","111"], "D": ["110","101","101","101","110"], "E": ["111","100","110","100","111"],
    "F": ["111","100","110","100","100"], "G": ["111","100","101","101","111"], "H": ["101","101","111","101","101"],
    "I": ["111","010","010","010","111"], "J": ["001","001","001","101","111"], "K": ["101","101","110","101","101"],
    "L": ["100","100","100","100","111"], "M": ["101","111","111","101","101"], "N": ["101","111","111","111","101"],
    "O": ["111","101","101","101","111"], "P": ["111","101","111","100","100"], "R": ["110","101","110","101","101"],
    "S": ["111","100","111","001","111"], "T": ["111","010","010","010","010"], "U": ["101","101","101","101","111"],
    "V": ["101","101","101","101","010"], "W": ["101","101","111","111","101"], "Y": ["101","101","010","010","010"],
    " ": ["0","0","0","0","0"], ".": ["0","0","0","0","1"], ",": ["0","0","0","1","1"], "-": ["0","0","111","0","0"], "/": ["001","001","010","100","100"]
  };
  let cursor = x;
  for (const char of text.toUpperCase()) {
    const glyph = font[char] || font[" "];
    glyph.forEach((row, gy) => {
      [...row].forEach((bit, gx) => {
        if (bit === "1") fillRect(target, cursor + gx * 2, y + gy * 2, 2, 2, rgba);
      });
    });
    cursor += 8;
  }
}
