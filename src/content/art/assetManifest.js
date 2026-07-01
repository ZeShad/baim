import { externalAnimationV1 } from "./externalAnimationV1.generated.js";

export const assetManifest = {
  baseResolution: { width: 1280, height: 720 },
  productionResolution: { width: 2560, height: 1440 },
  scenes: {
    "scene.chapter1.apartment": {
      background: "assets/chapter1/scenes/apartment/background.png",
      foreground: "assets/chapter1/scenes/apartment/foreground.webp",
      geometry: "assets/chapter1/scenes/apartment/scene.geometry.json"
    },
    "scene.chapter1.village_square": {
      background: "assets/chapter1/scenes/village_square/background.png",
      foreground: "assets/chapter1/scenes/village_square/foreground.webp",
      geometry: "assets/chapter1/scenes/village_square/scene.geometry.json"
    },
    "scene.chapter1.mehana": {
      background: "assets/chapter1/scenes/mehana/background.png",
      foreground: "assets/chapter1/scenes/mehana/foreground.webp",
      geometry: "assets/chapter1/scenes/mehana/scene.geometry.json"
    }
  },
  characters: {
    "npc.bai_mitko": {
      type: "spriteAtlas",
      atlas: "assets/chapter1/characters/bai_mitko/bai_mitko.atlas.json",
      image: "assets/chapter1/characters/bai_mitko/bai_mitko.webp",
      idle: "assets/chapter1/characters/bai_mitko/idle.png",
      idle_south: "assets/chapter1/characters/bai_mitko/idle_south.png",
      idle_east: "assets/chapter1/characters/bai_mitko/idle_east.png",
      idle_north: "assets/chapter1/characters/bai_mitko/idle_north.png",
      ...externalAnimationV1.characterAssets,
      fallback: "debug.bai_mitko"
    }
  },
  items: {
    "item.accordion": {
      icon: "assets/chapter1/items/accordion.png"
    },
    "item.unpaid_bills": {
      icon: "assets/chapter1/items/unpaid_bills.png"
    },
    "item.empty_envelope": {
      icon: "assets/chapter1/items/empty_envelope.png"
    }
  }
};
