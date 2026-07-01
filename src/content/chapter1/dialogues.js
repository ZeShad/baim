export const dialogues = [
  {
    id: "dialogue.tony_fridge",
    npcId: "npc.tony_fridge",
    nodes: {
      start: {
        lineKey: "dialogue.tony.start",
        choices: [
          { textKey: "dialogue.tony.choice.challenge", next: "challenge" },
          { textKey: "dialogue.tony.choice.politics", next: "politics" },
          { textKey: "dialogue.tony.choice.leave" }
        ]
      },
      politics: {
        lineKey: "dialogue.tony.politics",
        choices: [{ textKey: "dialogue.common.back", next: "start" }]
      },
      challenge: {
        lineKey: "dialogue.tony.challenge",
        choices: [
          { textKey: "dialogue.tony.choice.accept", effect: "tonyChallengeStarted" },
          { textKey: "dialogue.tony.choice.refuse", effect: "tonyChallengeRefused" }
        ]
      }
    }
  },
  {
    id: "dialogue.baba_stoyanka",
    npcId: "npc.baba_stoyanka",
    nodes: {
      start: {
        lineKey: "dialogue.baba.start",
        choices: [
          { textKey: "dialogue.baba.choice.tradition", next: "tradition" },
          { textKey: "dialogue.baba.choice.promise", next: "promise" },
          { textKey: "dialogue.baba.choice.leave" }
        ]
      },
      tradition: {
        lineKey: "dialogue.baba.tradition",
        choices: [{ textKey: "dialogue.common.back", next: "start" }]
      },
      promise: {
        lineKey: "dialogue.baba.promise",
        choices: [{ textKey: "dialogue.common.back", next: "start" }]
      }
    }
  }
];
