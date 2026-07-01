export class AssetLoader {
  constructor(manifest) {
    this.manifest = manifest;
    this.images = new Map();
    this.targetAssetVersion = String(Date.now());
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
    image.src = this.cacheSafePath(path);
    image.dataset.loaded = "false";
    image.addEventListener("load", () => {
      image.dataset.loaded = "true";
    });
    image.addEventListener("error", () => {
      image.dataset.loaded = "error";
    });
    this.images.set(path, image);
    return image;
  }

  cacheSafePath(path) {
    if (!path.startsWith("target/")) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}v=${this.targetAssetVersion}`;
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
