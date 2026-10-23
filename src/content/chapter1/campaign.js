import { pepaMusicRule, pepaPosterRule, pepaDiplomaRule } from './photoQuest.js';
// Stable campaign IDs retained for existing saves.
export const openingLookRules = [
  {
    requirements: { notFlags: ["chapter1OpeningHeard"], state: { chapter1Completed: false } },
    effects: [{ type: "setFlag", key: "chapter1OpeningHeard" }],
    messageKey: "campaign.opening"
  },
  { effects: [], messageKey: "campaign.opening_recap" }
];

export const kioskPaperRule = {
  requirements: { items: ['item.unpaid_bills'], state: { chapter1Completed: false } },
  effects: [], reject: true, messageKey: 'photoquest.bills_not_diploma'
};

export const kioskPamphletRule = {
  requirements: {
    state: { hasFakeDiploma: true, chapter1Completed: false },
    flags: ['legacyPhotoCredentials'],
    notFlags: ["kioskPamphletsIssued", "campaignPosted"]
  },
  effects: [
    { type: "addItem", itemId: "item.campaign_pamphlets" },
    { type: "setFlag", key: "kioskPamphletsIssued" }
  ],
  messageKey: "campaign.kiosk.pamphlets_ready"
};

export const campaignPostedRule = {
  requirements: { flags: ["campaignPosted"] },
  effects: [],
  messageKey: "campaign.poster.posted"
};

export const campaignPosterRules = [
  {
    itemId: "item.campaign_pamphlets",
    requirements: {
      items: ["item.campaign_pamphlets"],
      notFlags: ["campaignPosted"],
      state: { chapter1Completed: false }
    },
    effects: [
      { type: "removeItem", itemId: "item.campaign_pamphlets" },
      { type: "setFlag", key: "campaignPosted" },
      { type: "startQuest", questId: "quest.chapter1.journalist" }
    ],
    messageKey: "campaign.poster.posted_now"
  },
  { itemId: "item.campaign_pamphlets", ...campaignPostedRule }
];

export const campaignDialogues = [{
  id: "dialogue.penka_kiosk",
  npcId: "hotspot.square.kiosk",
  nodes: {
    start: {
      lineKey: "photoquest.pepa_start",
      choices: [
        { textKey: "campaign.kiosk.choice.requirements", next: "requirements" },
        {
          textKey: "photoquest.play",
          requirements: pepaMusicRule.requirements,
          effect: pepaMusicRule
        },
        {
          textKey: 'photoquest.make_poster', requirements: pepaPosterRule.requirements, effect: pepaPosterRule
        },
        {
          textKey: 'photoquest.make_diploma', requirements: pepaDiplomaRule.requirements, effect: pepaDiplomaRule
        },
        {
          textKey: "campaign.kiosk.choice.pamphlets",
          requirements: kioskPamphletRule.requirements,
          effect: kioskPamphletRule
        },
        {
          textKey: "campaign.kiosk.choice.next",
          requirements: { flags: ["kioskPamphletsIssued"], notFlags: ["campaignPosted"] },
          next: "posters"
        },
        {
          textKey: "campaign.kiosk.choice.posted",
          requirements: { flags: ["campaignPosted"] },
          next: "posted"
        },
        { textKey: "campaign.kiosk.choice.leave" }
      ]
    },
    requirements: { lineKey: "photoquest.pepa_requirements", choicesFrom: "start" },
    posters: { lineKey: "campaign.kiosk.posters", choicesFrom: "start" },
    posted: { lineKey: "campaign.kiosk.posted", choicesFrom: "start" }
  }
}];
