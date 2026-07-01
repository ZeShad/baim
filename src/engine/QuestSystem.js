export class QuestSystem {
  constructor(questsById, state) {
    this.questsById = questsById;
    this.state = state;
  }

  activate(questId) {
    if (!this.state.activeQuests.includes(questId) && !this.state.completedQuests.includes(questId)) {
      this.state.activeQuests.push(questId);
    }
  }

  complete(questId) {
    this.state.activeQuests = this.state.activeQuests.filter((id) => id !== questId);
    if (!this.state.completedQuests.includes(questId)) this.state.completedQuests.push(questId);
  }

  active() {
    return this.state.activeQuests.map((id) => this.questsById[id]).filter(Boolean);
  }
}
