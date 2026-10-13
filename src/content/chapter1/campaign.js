// Additive campaign foundation. Later milestones connect posting to registration.
export const openingLookRules = [
  {
    requirements: { notFlags: ["chapter1OpeningHeard"], state: { chapter1Completed: false } },
    effects: [{ type: "setFlag", key: "chapter1OpeningHeard" }],
    messageKey: "campaign.opening"
  },
  { effects: [], messageKey: "campaign.opening_recap" }
];

export const kioskPaperRule = {
  requirements: { items: ["item.unpaid_bills"], state: { hasFakeDiploma: false, chapter1Completed: false } },
  effects: [
    { type: "removeItem", itemId: "item.unpaid_bills" },
    { type: "setState", key: "hasUnpaidBills", value: true },
    { type: "addItem", itemId: "item.fake_diploma" },
    { type: "setState", key: "hasFakeDiploma", value: true },
    { type: "addItem", itemId: "item.campaign_pamphlets" },
    { type: "setFlag", key: "kioskPamphletsIssued" },
    { type: "adjustState", key: "suspicion", amount: 4 }
  ],
  messageKey: "campaign.kiosk.papers_ready"
};

export const kioskPamphletRule = {
  requirements: {
    state: { hasFakeDiploma: true, chapter1Completed: false },
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
      lineKey: "campaign.kiosk.start",
      choices: [
        { textKey: "campaign.kiosk.choice.requirements", next: "requirements" },
        {
          textKey: "campaign.kiosk.choice.give_bills",
          requirements: kioskPaperRule.requirements,
          effect: kioskPaperRule
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
    requirements: { lineKey: "campaign.kiosk.requirements", choicesFrom: "start" },
    posters: { lineKey: "campaign.kiosk.posters", choicesFrom: "start" },
    posted: { lineKey: "campaign.kiosk.posted", choicesFrom: "start" }
  }
}];
