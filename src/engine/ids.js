export const LANGUAGES = ["bg", "en"];

export const VERBS = {
  LOOK: "look",
  TALK: "talk",
  USE: "use",
  TAKE: "take"
};

export const SAVE_KEY = "comrade-candidate.save.v1";

export const DEFAULT_SAVE = {
  currentChapter: 1,
  chapter1Completed: false,
  currentSceneId: "scene.chapter1.apartment",
  language: "bg",
  influence: 0,
  suspicion: 0,
  publicMood: 50,
  inventory: ["item.accordion", "item.unpaid_bills", "item.empty_envelope"],
  hasFakeDiploma: false,
  hasSunflowerOil: false,
  hasRakia: false,
  hasGlassOfWater: false,
  hasBallotBox: false,
  hasMunicipalityStamp: false,
  babaStoyankaVote: false,
  tonyVote: false,
  journalistSuspicionLevel: "low",
  mayorDefeated: false,
  wonMunicipalSeat: false,
  tonyFavorOwed: false,
  babaTrust: "neutral",
  drankOilBeforeTonyChallenge: false,
  swappedOwnRakiaWithWater: false,
  triedToSwapTonysRakia: false,
  completedQuests: [],
  activeQuests: [
    "quest.chapter1.main",
    "quest.chapter1.fake_diploma",
    "quest.chapter1.tony_vote"
  ],
  flags: {},
  chapter1Choices: {}
};
