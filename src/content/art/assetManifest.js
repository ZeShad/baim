import { externalAnimationV1 } from "./externalAnimationV1.generated.js";

export const assetManifest = {
  baseResolution: { width: 1280, height: 720 },
  runtimeSceneResolution: { width: 1280, height: 720 },
  scenes: {
    "scene.chapter1.apartment": {
      background: "assets/chapter1/scenes/apartment/background.png",
      foreground: "assets/chapter1/scenes/apartment/foreground.webp",
      foregroundTable: "assets/chapter1/scenes/apartment/foreground-table.png",
      billsOnTable: "assets/chapter1/scenes/apartment/bills-on-table.png",
      windowOpen: "assets/chapter1/scenes/apartment/window-open.png",
      windowOpenBack: "assets/chapter1/scenes/apartment/window-open-0.png",
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
      type: "externalAnimation",
      ...externalAnimationV1.characterAssets
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
