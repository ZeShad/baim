import { paperCue } from "./audio.js";
import { electionWalkGeometry } from "./walkMasks.generated.js";
import { sceneLayerGeometry } from "./sceneLayers.generated.js";

const flag = key => ({ type: "setFlag", key });
const unfinished = { chapter1Completed: false };
export const electionEntryRequirements = {
  flags: ["candidateRegistrationStamped", "ballotBoxRecovered"],
  state: { journalistInterviewCompleted: true, chapter1Completed: false }
};
export const electionReadyRequirements = {
  ...electionEntryRequirements,
  flags: [...electionEntryRequirements.flags, "electionCredentialsAnswered", "electionEvidenceAnswered", "electionContainerAnswered"],
  state: { ...electionEntryRequirements.state, ballotBoxDelivered: true }
};
export const deliverBoxRule = {
  itemId: "item.ballot_box",
  requirements: { ...electionEntryRequirements, items: ["item.ballot_box"], state: { ...electionEntryRequirements.state, ballotBoxDelivered: false } },
  effects: [{ type: "removeItem", itemId: "item.ballot_box" }, { type: "setState", key: "ballotBoxDelivered", value: true }],
  soundCue: paperCue, messageKey: "election.delivered"
};
const objections = [
  ["credentials", "electionCredentialsAnswered"],
  ["evidence", "electionEvidenceAnswered"],
  ["container", "electionContainerAnswered"]
];
const leave = { textKey: "election.leave" };
export const electionDialogue = {
  id: "dialogue.chapter1.election", npcId: "npc.mayor",
  nodes: {
    start: {
      lineKey: "election.start",
      lineRules: [
        { requirements: electionReadyRequirements, lineKey: "election.ready" },
        { requirements: { state: { ballotBoxDelivered: false } }, lineKey: "election.need_box" }
      ],
      choices: [
        { textKey: "election.deliver", requirements: deliverBoxRule.requirements, effect: deliverBoxRule, next: "start" },
        ...objections.map(([name, key]) => ({
          textKey: `election.ask.${name}`,
          requirements: { ...electionEntryRequirements, notFlags: [key], state: { ...electionEntryRequirements.state, ballotBoxDelivered: true } },
          next: name
        })),
        { textKey: "election.count", requirements: electionReadyRequirements,
          effect: { endingTrigger: { groupId: "ending.chapter1", requirements: electionReadyRequirements, confirmKey: "ui.election.commit_confirm", cancelledMessageKey: "msg.election.deferred" } } },
        leave
      ]
    },
    ...Object.fromEntries(objections.map(([name, key]) => [name, {
      lineKey: `election.objection.${name}`,
      choices: [{ textKey: `election.answer.${name}`, requirements: { ...electionEntryRequirements, state: { ...electionEntryRequirements.state, ballotBoxDelivered: true } },
        effect: { effects: [flag(key)] }, next: `${name}_accepted` }, leave]
    }])),
    ...Object.fromEntries(objections.map(([name]) => [`${name}_accepted`, {
      lineKey: `election.accepted.${name}`,
      npcId: name === "evidence" ? "npc.journalist" : name === "container" ? "npc.municipality_clerk" : "npc.mayor",
      choices: [{ textKey: "election.continue", next: "start" }]
    }]))
  }
};

export const electionStages = [
  { id: "stage.main.archive", titleKey: "election.quest.archive", requirements: { notFlags: ["ballotBoxRecovered"] } },
  { id: "stage.main.interview", titleKey: "election.quest.interview", requirements: { state: { journalistInterviewCompleted: false } } },
  { id: "stage.main.deliver", titleKey: "election.quest.deliver", requirements: { state: { ballotBoxDelivered: false } } },
  ...objections.map(([name, key]) => ({ id: `stage.main.objection_${name}`, titleKey: `election.quest.${name}`, requirements: { notFlags: [key] } })),
  { id: "stage.main.vote", titleKey: "election.quest.vote", requirements: { state: unfinished } }
];

export const electionScene = {
  id: "scene.chapter1.election_booth", titleKey: "scene.chapter1.election_booth.title",
  palette: { sky: "#59656a", wall: "#726b5e", floor: "#373934" },
  ambience: { frequency: 100, volume: 0.02 },
  movementSpeed: 90, playerStart: { x: 220, y: 550 },
  ...electionWalkGeometry,
  perspectiveScale: { horizonY: 430, bottomY: 720, far: 1.1, near: 1.55 },
  depthZones: [{ id: "depth.chapter1.election_booth.floor", depth: 0.6,
    characterHeights: { "npc.bai_mitko": 280 }, polygon: [{ x: 0, y: 500 }, { x: 1280, y: 500 }, { x: 1280, y: 720 }, { x: 0, y: 720 }] }],
  anchors: { baiMitkoSpawn: { x: 220, y: 550 }, commissionTable: { x: 880, y: 555 }, exit: { x: 160, y: 540 } },
  foregroundLayers: sceneLayerGeometry["scene.chapter1.election_booth"]?.foregroundLayers || [],
  exits: [{ id: "exit.election_booth.to_square", kind: "exit", nameKey: "exit.to_village_square",
    rect: { x: 20, y: 120, w: 155, h: 380 }, requirements: { state: unfinished },
    targetSceneId: "scene.chapter1.village_square", targetPosition: { x: 300, y: 540 } }],
  interactables: [{
    id: "hotspot.election_booth.commission_table", kind: "hotspot", nameKey: "hotspot.election_booth.commission_table.name",
    rect: { x: 685, y: 330, w: 385, h: 160 }, lookKey: "election.table_look",
    useDialogueId: electionDialogue.id, itemUseRules: [deliverBoxRule,
      { itemId: "item.ballot_box", messageKey: "election.not_ready", reject: true }]
  }],
  npcs: [
    { id: "npc.municipality_clerk", kind: "npc", nameKey: "npc.municipality_clerk.name", rect: { x: 850, y: 180, w: 135, h: 145 },
      dialogueId: electionDialogue.id, lookKey: "election.table_look" },
    { id: "npc.mayor", kind: "npc", nameKey: "office.mayor.name", rect: { x: 1090, y: 248, w: 145, h: 275 },
      dialogueId: electionDialogue.id, lookKey: "election.mayor_look" },
    { id: "npc.journalist", kind: "npc", nameKey: "npc.journalist.name", rect: { x: 570, y: 210, w: 90, h: 280 },
      talkKey: "election.reporter", lookKey: "look.npc.journalist" },
    { id: "npc.baba_stoyanka", kind: "npc", nameKey: "npc.baba_stoyanka.name", rect: { x: 295, y: 317, w: 110, h: 190 },
      requirements: { state: { babaStoyankaVote: true } }, talkKey: "election.baba", lookKey: "election.baba" },
    { id: "npc.tony_fridge", kind: "npc", nameKey: "npc.tony_fridge.name", rect: { x: 420, y: 272, w: 135, h: 235 },
      requirements: { state: { tonyVote: true } }, talkKey: "election.tony", lookKey: "election.tony" }
  ]
};

// Shared results are selected once, then saved with the ending. No live meters
// or later balance changes can rewrite the explanation of a resolved election.
export const electionReportRules = [
  { requirements: { state: { babaStoyankaVote: true } }, textKey: "election.report.baba_yes" },
  { requirements: { state: { babaStoyankaVote: false } }, textKey: "election.report.baba_no" },
  { requirements: { state: { tonyVote: true } }, textKey: "election.report.tony_yes" },
  { requirements: { state: { tonyVote: false } }, textKey: "election.report.tony_no" }
];
export const endingEpilogue = [
  { requirements: { state: { wonMunicipalSeat: true } }, textKey: "election.epilogue.mayor_win" },
  { requirements: { state: { wonMunicipalSeat: false } }, textKey: "election.epilogue.mayor_loss" },
  { requirements: { flags: ["fountainRepaired"] }, textKey: "election.epilogue.water" },
  { requirements: { notFlags: ["fountainRepaired"] }, textKey: "election.epilogue.dry" },
  { textKey: "election.epilogue.creditors" }
];
