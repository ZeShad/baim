import { Game } from "./engine/Game.js";

const canvas = document.querySelector("#game");
const uiRoot = document.querySelector("#ui-root");
const game = new Game(canvas, uiRoot);

game.start();
