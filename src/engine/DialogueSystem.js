export class DialogueSystem {
  constructor(dialoguesById, localization, onChoice) {
    this.dialoguesById = dialoguesById;
    this.localization = localization;
    this.onChoice = onChoice;
    this.current = null;
  }

  start(dialogueId) {
    this.current = { id: dialogueId, nodeId: "start" };
  }

  close() {
    this.current = null;
  }

  getNode() {
    if (!this.current) return null;
    return this.dialoguesById[this.current.id]?.nodes[this.current.nodeId] || null;
  }

  choose(choice) {
    if (choice.effect) this.onChoice?.(choice.effect);
    if (choice.next) this.current.nodeId = choice.next;
    else this.close();
  }
}
