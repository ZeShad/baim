const RASTER_ASSET_PATTERN = /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i;

export function imageAssetPaths(assetGroup) {
  return [...new Set(Object.values(assetGroup || {})
    .filter((value) => typeof value === "string" && RASTER_ASSET_PATTERN.test(value)))];
}

export class AssetLoader {
  constructor(manifest) {
    this.manifest = manifest;
    this.images = new Map();
    this.imageReady = new Map();
  }

  getSceneImage(sceneId, layer) {
    const path = this.getSceneAssetPath(sceneId, layer);
    return this.getImage(path);
  }

  getCharacterImage(characterId, slot) {
    const path = this.manifest.characters[characterId]?.[slot];
    return this.getImage(path);
  }

  getCharacterAssetPath(characterId, slot) {
    return this.manifest.characters[characterId]?.[slot] || null;
  }

  getItemImage(itemId) {
    const path = this.manifest.items?.[itemId]?.icon;
    return this.getImage(path);
  }

  getImage(path) {
    if (!path) return null;
    if (this.images.has(path)) return this.images.get(path);

    const image = new Image();
    image.dataset.loaded = "false";
    const ready = new Promise((resolve) => {
      image.addEventListener("load", async () => {
        try {
          if (typeof image.decode === "function") await image.decode();
          image.dataset.loaded = "true";
        } catch {
          image.dataset.loaded = image.naturalWidth > 0 ? "true" : "error";
        }
        resolve(image);
      }, { once: true });
      image.addEventListener("error", () => {
        image.dataset.loaded = "error";
        resolve(image);
      }, { once: true });
    });
    this.images.set(path, image);
    this.imageReady.set(path, ready);
    image.src = path;
    return image;
  }

  preload(paths) {
    const uniquePaths = [...new Set((paths || []).filter(Boolean))];
    return Promise.all(uniquePaths.map((path) => {
      this.getImage(path);
      return this.imageReady.get(path);
    }));
  }

  preloadCharacterAssets(characterId) {
    return this.preload(imageAssetPaths(this.manifest.characters?.[characterId]));
  }

  preloadAllCharacterAssets() {
    return this.preload(Object.values(this.manifest.characters || {})
      .flatMap((characterAssets) => imageAssetPaths(characterAssets)));
  }

  preloadAllItemAssets() {
    return this.preload(Object.values(this.manifest.items || {})
      .flatMap((itemAssets) => imageAssetPaths(itemAssets)));
  }

  preloadSceneAssets(sceneId) {
    return this.preload(imageAssetPaths(this.manifest.scenes?.[sceneId]));
  }

  getSceneAssetPath(sceneId, layer) {
    return this.manifest.scenes[sceneId]?.[layer] || null;
  }

  getImageStatus(image) {
    return image?.dataset.loaded || "missing";
  }

  isLoaded(image) {
    return image?.dataset.loaded === "true";
  }
}
