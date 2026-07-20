import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const actionKey = process.argv[2] || "opens_window";
const baseUrl = process.env.GAME_URL || "http://localhost:5173";
const outputDir = join("target", "external_animation_v1", "registration", actionKey, "browser-frames");
mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto(`${baseUrl}/?edit=1&scene=scene.chapter1.apartment&characterVariant=external_animation_v1&animationFit=1`, { waitUntil: "networkidle" });
await page.waitForFunction(() => {
  const game = window.__comradeCandidateAnimationFit?.game;
  return game?.inputBound && game?.sceneEditor?.actionAnimationSource;
});
const info = await page.evaluate((requestedActionKey) => {
  const game = window.__comradeCandidateAnimationFit.game;
  const editor = game.sceneEditor;
  editor.mode = "actions";
  editor.selectedActionId = requestedActionKey;
  editor.executeSelectedAction();
  game.paused = true;
  game.menuOpen = false;
  game.debugSceneGeometry = false;
  game.debugAnimation = false;
  game.uiRoot.style.display = "none";
  game.renderer.draw();
  return {
    frameCount: game.player.actionAnimation.frameCount,
    actorPosition: { ...game.player.position },
    scale: game.player.actionAnimation.scale,
    offsetX: game.player.actionAnimation.offsetX,
    offsetY: game.player.actionAnimation.offsetY
  };
}, actionKey);
const canvas = page.locator("#game");
for (let frameIndex = 0; frameIndex < info.frameCount; frameIndex += 1) {
  await page.evaluate((index) => {
    const game = window.__comradeCandidateAnimationFit.game;
    game.player.animator.frameIndex = index;
    if (index < game.player.actionAnimation.frameCount - 1) game.updateActionSequence();
    game.renderer.draw();
  }, frameIndex);
  await canvas.screenshot({ path: join(outputDir, `frame-${String(frameIndex).padStart(3, "0")}.png`) });
}
const transition = await page.evaluate(() => {
  const game = window.__comradeCandidateAnimationFit.game;
  game.completeInteractionActionSequence();
  game.renderer.draw();
  return {
    animation: game.player.animation,
    frameIndex: game.player.animator.frameIndex,
    slot: game.player.speechAnimation?.slot || game.player.idleHoldFrame?.slot || null
  };
});
await canvas.screenshot({ path: join(outputDir, "transition-after-action.png") });
writeFileSync(join(outputDir, "report.json"), `${JSON.stringify({ actionKey, ...info, frames: info.frameCount, transition }, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify({ actionKey, ...info, transition, outputDir }, null, 2));
