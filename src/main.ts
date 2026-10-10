import "./styles.css";
import type { GameState, InputState } from "./domain";
import { createComet, createInitialState, defaultInput, snapshot, stepGame } from "./game";

declare global {
  interface Window {
    __meteorBreakersTest?: {
      getSnapshot: () => ReturnType<typeof snapshot>;
      reset: () => void;
      loadScenario: (name: "single-large-shot" | "collision" | "clear-wave") => void;
      step: (input: Partial<InputState>, dt?: number) => void;
    };
  }
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing #app");
}

app.innerHTML = `
  <main class="shell">
    <section class="hud" aria-label="Meteor Breakers status">
      <div>
        <p class="eyebrow">Meteor Breakers</p>
        <h1>Flight Test</h1>
      </div>
      <div class="hud__cluster">
        <span id="status">Ready</span>
        <span id="score">0 pts</span>
        <span id="lives">3 lives</span>
        <span id="wave">Wave 1</span>
        <span id="comets">2 threats</span>
      </div>
    </section>
    <canvas id="game" width="960" height="640" aria-label="Meteor Breakers playfield"></canvas>
    <section class="controls" aria-label="Controls">
      <span>Left/Right or A/D rotate</span>
      <span>Up/W thrust</span>
      <span>Space fire</span>
    </section>
  </main>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#game");
const statusLabel = document.querySelector<HTMLSpanElement>("#status");
const scoreLabel = document.querySelector<HTMLSpanElement>("#score");
const livesLabel = document.querySelector<HTMLSpanElement>("#lives");
const waveLabel = document.querySelector<HTMLSpanElement>("#wave");
const cometsLabel = document.querySelector<HTMLSpanElement>("#comets");
if (!canvas || !statusLabel || !scoreLabel || !livesLabel || !waveLabel || !cometsLabel) {
  throw new Error("Missing game surface");
}

const context = canvas.getContext("2d");
if (!context) {
  throw new Error("Canvas 2D is not available");
}
const gameCanvas = canvas;
const ctx = context;
const statusElement = statusLabel;
const scoreElement = scoreLabel;
const livesElement = livesLabel;
const waveElement = waveLabel;
const cometsElement = cometsLabel;

let state = createInitialState({ x: gameCanvas.width, y: gameCanvas.height });
const input: InputState = { ...defaultInput };
let lastTime = performance.now();

const keyMap: Record<string, keyof InputState> = {
  ArrowLeft: "turnLeft",
  KeyA: "turnLeft",
  ArrowRight: "turnRight",
  KeyD: "turnRight",
  ArrowUp: "thrust",
  KeyW: "thrust",
  Space: "fire"
};

window.addEventListener("keydown", (event) => {
  const mapped = keyMap[event.code];
  if (mapped) {
    event.preventDefault();
    input[mapped] = true;
  }
});

window.addEventListener("keyup", (event) => {
  const mapped = keyMap[event.code];
  if (mapped) {
    event.preventDefault();
    input[mapped] = false;
  }
});

window.__meteorBreakersTest = {
  getSnapshot: () => snapshot(state),
  reset: () => {
    state = createInitialState({ x: gameCanvas.width, y: gameCanvas.height });
  },
  loadScenario: (name) => {
    state = createInitialState({ x: gameCanvas.width, y: gameCanvas.height });
    if (name === "single-large-shot") {
      state.comets = [createComet(100, "large", { x: state.skimmer.position.x, y: state.skimmer.position.y - 70 }, { x: 0, y: 0 })];
      state.nextId = 101;
      state.skimmer.angle = -Math.PI / 2;
    }
    if (name === "collision") {
      state.comets = [createComet(200, "large", { ...state.skimmer.position }, { x: 0, y: 0 })];
      state.nextId = 201;
    }
    if (name === "clear-wave") {
      state.comets = [];
      state.status = "wave-cleared";
      state.waveClearTimer = 0.1;
    }
    render();
  },
  step: (partialInput, dt = 1 / 60) => {
    state = stepGame(state, { ...defaultInput, ...partialInput }, dt);
    render();
  }
};

requestAnimationFrame(tick);

function tick(now: number): void {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  state = stepGame(state, input, dt);
  render();
  requestAnimationFrame(tick);
}

function render(): void {
  ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  drawStarfield();
  drawSkimmer(state);
  for (const shot of state.shots) {
    ctx.fillStyle = "#f7f0a8";
    ctx.beginPath();
    ctx.arc(shot.position.x, shot.position.y, shot.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const comet of state.comets) {
    drawComet(comet.position.x, comet.position.y, comet.radius, comet.tier);
  }
  statusElement.textContent = formatStatus(state.status);
  scoreElement.textContent = `${state.score} pts`;
  livesElement.textContent = `${state.lives} ${state.lives === 1 ? "life" : "lives"}`;
  waveElement.textContent = `Wave ${state.wave}`;
  cometsElement.textContent = `${state.comets.length} threat${state.comets.length === 1 ? "" : "s"}`;
}

function formatStatus(status: GameState["status"]): string {
  if (status === "wave-cleared") {
    return "Wave cleared";
  }
  if (status === "recovering") {
    return "Recovering";
  }
  if (status === "game-over") {
    return "Game over";
  }
  return status === "playing" ? "Playing" : "Ready";
}

function drawStarfield(): void {
  ctx.fillStyle = "#070915";
  ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
  ctx.fillStyle = "rgba(229, 245, 255, 0.72)";
  for (let i = 0; i < 72; i += 1) {
    const x = (i * 137.5) % gameCanvas.width;
    const y = (i * 59.7) % gameCanvas.height;
    ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1, 1);
  }
}

function drawSkimmer(current: GameState): void {
  const { position, angle } = current.skimmer;
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(angle);
  ctx.strokeStyle = "#8fe7ff";
  ctx.fillStyle = "rgba(143, 231, 255, 0.14)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-14, -12);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-14, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (input.thrust) {
    ctx.strokeStyle = "#ffcf6e";
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(-28, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawComet(x: number, y: number, radius: number, tier: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = tier === "large" ? "#f29e6d" : tier === "medium" ? "#ffc76b" : "#f6f1b2";
  ctx.fillStyle = "rgba(242, 158, 109, 0.13)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 9; i += 1) {
    const angle = (Math.PI * 2 * i) / 9;
    const wobble = radius * (0.82 + ((i * 37) % 19) / 100);
    const xPoint = Math.cos(angle) * wobble;
    const yPoint = Math.sin(angle) * wobble;
    if (i === 0) {
      ctx.moveTo(xPoint, yPoint);
    } else {
      ctx.lineTo(xPoint, yPoint);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
