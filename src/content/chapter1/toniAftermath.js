// Owner23October: blackout covers contest; Kiro clears every table bottle/glass.
export const toniContestFade = {
  id: 'toni-contest-blackout', sceneId: 'scene.chapter1.mehana',
  type: 'fade', frames: [], durationMs: 1600, commitAtMs: 450, revealAtMs: 1100,
  requiredAssets: ['tonySleepingIdle', 'tonyDiploma', 'mehanaWaiterTalkingPolishing'],
  completionSpeech: { npcId: 'npc.mehana_waiter', messageKey: 'photoquest.kiro_cleanup' }
};

export function toniContestFadeEffect(outcomeEffect) {
  return {
    ...outcomeEffect,
    sceneSequence: toniContestFade.id,
    requirements: {
      state: { swappedOwnRakiaWithWater: true, tonyVote: false, chapter1Completed: false },
      notFlags: ['tonyPassedOut']
    }
  };
}

export function wireToniAftermathDialogues(dialogues) {
  return dialogues.map(dialogue => {
    if (dialogue.id === 'dialogue.tony_fridge') return { ...dialogue, nodes: { ...dialogue.nodes,
      start: { ...dialogue.nodes.start, choices: dialogue.nodes.start.choices.map(choice =>
        choice.next === 'contest_result' ? { ...choice, closeAfterEffect: true, effect: toniContestFadeEffect(choice.effect) } : choice) }
    } };
    if (dialogue.id === 'dialogue.mehana_waiter') return { ...dialogue, nodes: { ...dialogue.nodes,
      start: { ...dialogue.nodes.start, choices: [
        { textKey: 'photoquest.kiro_cleanup_choice', requirements: { flags: ['tonyPassedOut'] }, next: 'tony_cleanup' },
        ...dialogue.nodes.start.choices
      ] },
      tony_cleanup: { lineKey: 'photoquest.kiro_cleanup', choicesFrom: 'start' }
    } };
    return dialogue;
  });
}
