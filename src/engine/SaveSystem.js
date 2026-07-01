import { DEFAULT_SAVE, SAVE_KEY } from "./ids.js";

export class SaveSystem {
  constructor(storage = globalThis.localStorage, key = SAVE_KEY) {
    this.storage = storage;
    this.key = key;
  }

  load() {
    if (!this.storage) return structuredClone(DEFAULT_SAVE);
    const raw = this.storage.getItem(this.key);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    try {
      return { ...structuredClone(DEFAULT_SAVE), ...JSON.parse(raw) };
    } catch {
      return structuredClone(DEFAULT_SAVE);
    }
  }

  save(state) {
    if (!this.storage) return;
    this.storage.setItem(this.key, JSON.stringify(state));
  }

  reset() {
    if (this.storage) this.storage.removeItem(this.key);
    return structuredClone(DEFAULT_SAVE);
  }
}
