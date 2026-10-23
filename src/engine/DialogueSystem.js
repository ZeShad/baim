export class DialogueSystem {
  constructor(dialoguesById, localization, onChoice) {
    this.dialoguesById = dialoguesById;
    this.localization = localization;
    this.onChoice = onChoice;
    this.current = null;
    this.entry = null;
  }

  start(dialogueId) {
    this.current = { id: dialogueId, nodeId: "start" };
    this.enterNode("start");
  }

  close() {
    this.current = null;
    this.entry = null;
  }

  enterNode(nodeId) {
    this.current.nodeId = nodeId;
    // A fresh object identifies an actual entry, including intentional re-entry
    // into the same node. UI refreshes and language changes keep its identity.
    this.entry = { session: this.current, nodeId, reactionId: this.getNode()?.reactionId || null };
  }

  getNode() {
    if (!this.current) return null;
    return this.dialoguesById[this.current.id]?.nodes[this.current.nodeId] || null;
  }

  choose(choice) {
    if (!this.current || !choice) return false;
    if (choice.effect && this.onChoice?.(choice.effect) === false) return false;
    if (choice.closeAfterEffect) { this.close(); return true; }
    if (choice.next) this.enterNode(choice.next);
    else this.close();
    return true;
  }
}
