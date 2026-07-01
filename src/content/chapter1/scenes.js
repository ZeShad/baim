export const scenes = [
  {
    id: "scene.chapter1.apartment",
    titleKey: "scene.chapter1.apartment.title",
    palette: { sky: "#4d6f86", wall: "#735f49", floor: "#2f2a23" },
    movementSpeed: 70,
    playerStart: { x: 650, y: 520 },
    walkPolygons: [
      {
        id: "walk.chapter1.apartment.main",
        points: [
          { x: 250, y: 435 },
          { x: 1015, y: 430 },
          { x: 1165, y: 585 },
          { x: 95, y: 585 }
        ]
      }
    ],
    depthZones: [{ id: "depth.apartment.main", yMin: 420, yMax: 590, scaleMin: 0.78, scaleMax: 1.1 }],
    anchors: {
      door: { x: 1115, y: 500 },
      mirror: { x: 690, y: 420 },
      table: { x: 415, y: 510 },
      baiMitkoSpawn: { x: 650, y: 520 }
    },
    exits: [
      {
        id: "exit.apartment.to_square",
        kind: "exit",
        nameKey: "exit.to_village_square",
        rect: { x: 1085, y: 135, w: 150, h: 380 },
        targetSceneId: "scene.chapter1.village_square",
        targetPosition: { x: 220, y: 505 }
      }
    ],
    interactables: [
      {
        id: "hotspot.apartment.wallpaper",
        kind: "hotspot",
        nameKey: "hotspot.wallpaper.name",
        rect: { x: 25, y: 35, w: 410, h: 245 },
        lookKey: "look.apartment.wallpaper"
      },
      {
        id: "hotspot.apartment.accordion",
        kind: "hotspot",
        nameKey: "item.accordion.name",
        rect: { x: 1120, y: 375, w: 150, h: 190 },
        lookKey: "look.apartment.accordion"
      },
      {
        id: "hotspot.apartment.unpaid_bills",
        kind: "hotspot",
        nameKey: "item.unpaid_bills.name",
        rect: { x: 265, y: 375, w: 245, h: 95 },
        lookKey: "item.unpaid_bills.desc"
      },
      {
        id: "hotspot.apartment.mirror",
        kind: "hotspot",
        nameKey: "hotspot.mirror.name",
        rect: { x: 640, y: 155, w: 140, h: 220 },
        lookKey: "look.apartment.mirror"
      },
      {
        id: "hotspot.apartment.tv",
        kind: "hotspot",
        nameKey: "hotspot.tv.name",
        rect: { x: 0, y: 285, w: 125, h: 160 },
        lookKey: "look.apartment.tv"
      },
      {
        id: "hotspot.apartment.wardrobe",
        kind: "hotspot",
        nameKey: "hotspot.wardrobe.name",
        rect: { x: 805, y: 105, w: 240, h: 410 },
        lookKey: "look.apartment.wardrobe"
      },
      {
        id: "hotspot.apartment.table",
        kind: "hotspot",
        nameKey: "hotspot.table.name",
        rect: { x: 225, y: 385, w: 280, h: 175 },
        lookKey: "look.apartment.table"
      },
      {
        id: "hotspot.apartment.campaign_poster",
        kind: "hotspot",
        nameKey: "hotspot.campaign_poster.name",
        rect: { x: 500, y: 160, w: 150, h: 155 },
        lookKey: "look.apartment.poster"
      }
    ],
    npcs: []
  },
  {
    id: "scene.chapter1.village_square",
    titleKey: "scene.chapter1.village_square.title",
    palette: { sky: "#829aa1", wall: "#8a7657", floor: "#48443a" },
    movementSpeed: 80,
    playerStart: { x: 300, y: 540 },
    walkPolygons: [
      {
        id: "walk.chapter1.square.main",
        points: [
          { x: 65, y: 455 },
          { x: 375, y: 420 },
          { x: 705, y: 418 },
          { x: 1095, y: 470 },
          { x: 1215, y: 585 },
          { x: 80, y: 585 }
        ]
      }
    ],
    depthZones: [{ id: "depth.square.main", yMin: 415, yMax: 590, scaleMin: 0.7, scaleMax: 1.1 }],
    anchors: {
      baiMitkoSpawn: { x: 300, y: 540 },
      babaBench: { x: 520, y: 455 },
      journalist: { x: 1085, y: 510 },
      oldMenChorus: { x: 565, y: 450 },
      fountain: { x: 650, y: 500 },
      mehanaDoor: { x: 120, y: 465 },
      municipalityDoor: { x: 965, y: 450 }
    },
    exits: [
      {
        id: "exit.square.to_apartment",
        kind: "exit",
        nameKey: "exit.to_apartment",
        rect: { x: 10, y: 485, w: 190, h: 100 },
        targetSceneId: "scene.chapter1.apartment",
        targetPosition: { x: 1060, y: 505 }
      },
      {
        id: "exit.square.to_mehana",
        kind: "exit",
        nameKey: "exit.to_mehana",
        rect: { x: 0, y: 120, w: 235, h: 345 },
        targetSceneId: "scene.chapter1.mehana",
        targetPosition: { x: 220, y: 505 }
      },
      {
        id: "exit.square.to_municipality",
        kind: "exit",
        nameKey: "exit.to_municipality",
        rect: { x: 900, y: 165, w: 230, h: 285 },
        targetSceneId: "scene.chapter1.municipality",
        targetPosition: { x: 220, y: 505 }
      }
    ],
    interactables: [
      {
        id: "hotspot.square.poster_board",
        kind: "hotspot",
        nameKey: "hotspot.poster_board.name",
        rect: { x: 1080, y: 245, w: 140, h: 235 },
        lookKey: "look.square.poster_board"
      },
      {
        id: "hotspot.square.fountain",
        kind: "hotspot",
        nameKey: "hotspot.fountain.name",
        rect: { x: 405, y: 225, w: 360, h: 300 },
        lookKey: "look.square.fountain"
      },
      {
        id: "hotspot.square.kiosk",
        kind: "hotspot",
        nameKey: "hotspot.kiosk.name",
        rect: { x: 1010, y: 185, w: 245, h: 370 },
        lookKey: "look.square.kiosk"
      },
      {
        id: "hotspot.square.statue",
        kind: "hotspot",
        nameKey: "hotspot.statue.name",
        rect: { x: 575, y: 190, w: 185, h: 245 },
        lookKey: "look.square.statue"
      },
      {
        id: "hotspot.square.old_men_bench",
        kind: "hotspot",
        nameKey: "hotspot.old_men_bench.name",
        rect: { x: 480, y: 365, w: 150, h: 70 },
        lookKey: "look.square.old_men_bench"
      },
      {
        id: "hotspot.square.election_notice",
        kind: "hotspot",
        nameKey: "hotspot.election_notice.name",
        rect: { x: 520, y: 315, w: 120, h: 80 },
        lookKey: "look.square.election_notice"
      }
    ],
    npcs: [
      {
        id: "npc.baba_stoyanka",
        kind: "npc",
        nameKey: "npc.baba_stoyanka.name",
        rect: { x: 480, y: 345, w: 70, h: 115 },
        dialogueId: "dialogue.baba_stoyanka",
        lookKey: "look.npc.baba_stoyanka"
      }
    ]
  },
  {
    id: "scene.chapter1.mehana",
    titleKey: "scene.chapter1.mehana.title",
    palette: { sky: "#4a3327", wall: "#7a5538", floor: "#32251d" },
    movementSpeed: 75,
    playerStart: { x: 220, y: 505 },
    walkPolygons: [
      {
        id: "walk.chapter1.mehana.main",
        points: [
          { x: 105, y: 430 },
          { x: 1100, y: 430 },
          { x: 1180, y: 575 },
          { x: 65, y: 585 }
        ]
      }
    ],
    depthZones: [{ id: "depth.mehana.main", yMin: 415, yMax: 590, scaleMin: 0.8, scaleMax: 1.12 }],
    anchors: {
      tonyTable: { x: 900, y: 505 },
      bar: { x: 620, y: 500 },
      exit: { x: 170, y: 505 }
    },
    exits: [
      {
        id: "exit.mehana.to_square",
        kind: "exit",
        nameKey: "exit.to_village_square",
        rect: { x: 30, y: 320, w: 120, h: 190 },
        targetSceneId: "scene.chapter1.village_square",
        targetPosition: { x: 930, y: 505 }
      }
    ],
    interactables: [
      {
        id: "hotspot.mehana.oil",
        kind: "hotspot",
        nameKey: "item.sunflower_oil.name",
        rect: { x: 540, y: 405, w: 70, h: 70 },
        lookKey: "look.mehana.oil",
        takeItemId: "item.sunflower_oil",
        flagOnTake: "hasSunflowerOil"
      },
      {
        id: "hotspot.mehana.water_jug",
        kind: "hotspot",
        nameKey: "hotspot.water_jug.name",
        rect: { x: 710, y: 370, w: 90, h: 105 },
        lookKey: "look.mehana.water_jug",
        takeItemId: "item.glass_of_water",
        flagOnTake: "hasGlassOfWater"
      }
    ],
    npcs: [
      {
        id: "npc.tony_fridge",
        kind: "npc",
        nameKey: "npc.tony_fridge.name",
        rect: { x: 930, y: 305, w: 115, h: 180 },
        dialogueId: "dialogue.tony_fridge",
        lookKey: "look.npc.tony_fridge"
      }
    ]
  }
];
