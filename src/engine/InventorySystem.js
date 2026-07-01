export class InventorySystem {
  constructor(itemsById, state) {
    this.itemsById = itemsById;
    this.state = state;
  }

  has(itemId) {
    return this.state.inventory.includes(itemId);
  }

  add(itemId) {
    if (!this.has(itemId)) this.state.inventory.push(itemId);
  }

  remove(itemId) {
    this.state.inventory = this.state.inventory.filter((id) => id !== itemId);
  }

  list() {
    return this.state.inventory.map((id) => this.itemsById[id]).filter(Boolean);
  }
}
