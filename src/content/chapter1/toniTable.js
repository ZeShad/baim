// Owner-marked right-hand table. Existing contest flags remain the save contract.
// c01 motion/placement accepted23October; Kiro clears props during the blackout.
import { toniSleepAnimation } from '../art/toniSleep.generated.js';
export const toniDiplomaRect = { x: 960, y: 457, w: 98, h: 37 };
const awake = { notFlags: ['tonyPassedOut'] };
const contestant = { flags: ['tonyChallengeStarted'] };
export const toniTableLayers = [
  { id: 'layer.mehana.tony_diploma', asset: 'tonyDiploma', left: 965, top: 462, width: 88, height: 27, zIndex: 9, hiddenWhenFlag: 'tonyDiplomaTaken' },
  { id: 'layer.mehana.tony_rakia_half', asset: 'tonyRakiaHalf', left: 1012, top: 415, height: 67, zIndex: 8, requirements: awake },
  { id: 'layer.mehana.tony_glass_half', asset: 'contestGlassHalf', left: 947, top: 437, height: 30, zIndex: 8, requirements: awake },
  { id: 'layer.mehana.mitko_water_bottle', asset: 'contestWaterBottle', left: 810, top: 407, height: 68, zIndex: 8, requirements: { ...contestant, state: { swappedOwnRakiaWithWater: false } } },
  { id: 'layer.mehana.mitko_empty_bottle', asset: 'contestEmptyBottle', left: 810, top: 407, height: 68, zIndex: 8, requirements: { ...contestant, state: { swappedOwnRakiaWithWater: true } } },
  { id: 'layer.mehana.mitko_glass_empty', asset: 'contestGlassEmpty', left: 862, top: 424, height: 30, zIndex: 8, requirements: { ...contestant, state: { swappedOwnRakiaWithWater: false } } },
  { id: 'layer.mehana.mitko_glass_water', asset: 'contestGlassWater', left: 862, top: 424, height: 30, zIndex: 8, requirements: { ...contestant, notFlags: ['tonyPassedOut'], state: { swappedOwnRakiaWithWater: true } } },
];
export function stageToniTable(scenes) {
  return scenes.map(scene => {
    if (scene.id !== 'scene.chapter1.mehana') return scene;
    const old = new Set(['layer.mehana.tony_diploma', 'layer.mehana.mitko_competition_glass', 'layer.mehana.tony_competition_glass']);
    const rects = {
      'hotspot.mehana.bai_mitko_rakia_glass': { x: 858, y: 425, w: 36, h: 39 },
      'hotspot.mehana.tony_rakia_glass': { x: 942, y: 438, w: 36, h: 35 },
      'hotspot.mehana.tony_diploma': toniDiplomaRect
    };
    const retained=scene.foregroundLayers.filter(l => !old.has(l.id)).map(layer => layer.id === 'layer.mehana.tony_fridge_seated'
      ? { ...layer, stateAnimation: { flag: 'tonyPassedOut', animation: toniSleepAnimation } } : layer);
    return { ...scene, foregroundLayers: [...retained, ...toniTableLayers.map(layer => layer.id === 'layer.mehana.tony_diploma'
      ? layer : { ...layer, hiddenWhenFlag: 'tonyPassedOut' })],
      interactables: scene.interactables.map(target => {
        const r = rects[target.id]; if (!r) return target;
        const polygon = [{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];
        return { ...target, rect: { ...r }, polygon,
          ...(target.id.endsWith('bai_mitko_rakia_glass') ? { interactionApproach: { x: 740, y: 580 }, interactionApproachExact: true } : {}) };
      }) };
  });
}
