import { Game } from "./engine/Game.js";

const app = document.querySelector("#app");
const canvas = document.querySelector("#game");
const uiRoot = document.querySelector("#ui-root");

function syncAppScale() {
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  app?.style.setProperty("--app-scale", String(Math.max(0.01, scale)));
}

syncAppScale();
window.addEventListener("resize", syncAppScale);

const game = new Game(canvas, uiRoot);

if (new URLSearchParams(window.location.search).get("animationFit") === "1") {
  window.__comradeCandidateAnimationFit = { game };
}

game.start();
