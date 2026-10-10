"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/audio.ts
  var ArcadeAudio = class {
    constructor(muted) {
      __publicField(this, "muted", muted);
      __publicField(this, "context", null);
    }
    setMuted(muted) {
      this.muted = muted;
    }
    blip(kind) {
      if (this.muted) {
        return;
      }
      const context2 = this.getContext();
      if (!context2) {
        return;
      }
      const now = context2.currentTime;
      const oscillator = context2.createOscillator();
      const gain = context2.createGain();
      const frequency = kind === "fire" ? 640 : kind === "hit" ? 220 : kind === "life" ? 120 : 480;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.type = kind === "life" ? "sawtooth" : "triangle";
      gain.gain.setValueAtTime(1e-4, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(1e-4, now + 0.12);
      oscillator.connect(gain);
      gain.connect(context2.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.13);
    }
    getContext() {
      if (typeof window === "undefined") {
        return null;
      }
      if (!this.context) {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContextCtor();
      }
      return this.context;
    }
  };

  // src/game.ts
  var TURN_SPEED = Math.PI * 2.2;
  var THRUST_ACCELERATION = 420;
  var DAMPING_PER_SECOND = 0.985;
  var SHOT_SPEED = 520;
  var SHOT_TTL = 1.35;
  var FIRE_COOLDOWN = 0.18;
  var OVERDRIVE_FIRE_COOLDOWN = 0.07;
  var OVERDRIVE_SECONDS = 4;
  var STARTING_LIVES = 3;
  var RECOVERY_SECONDS = 2;
  var WAVE_CLEAR_SECONDS = 0.9;
  var TIER_RADIUS = {
    core: 74,
    large: 52,
    medium: 32,
    small: 18
  };
  var TIER_SCORE = {
    core: 800,
    large: 100,
    medium: 150,
    small: 225
  };
  var TIER_CHILDREN = {
    core: "large",
    large: "medium",
    medium: "small"
  };
  var defaultInput = {
    turnLeft: false,
    turnRight: false,
    thrust: false,
    fire: false,
    overdrive: false
  };
  function createInitialState(bounds = { x: 960, y: 640 }) {
    const state2 = {
      bounds,
      skimmer: {
        position: { x: bounds.x / 2, y: bounds.y / 2 },
        velocity: { x: 0, y: 0 },
        angle: -Math.PI / 2,
        radius: 16
      },
      shots: [],
      comets: [],
      status: "ready",
      wave: 1,
      waveSeed: 4307,
      lives: STARTING_LIVES,
      score: 0,
      riskChain: { multiplier: 1, hits: 0 },
      overdriveCharge: 0,
      overdriveTimer: 0,
      nearMissIds: [],
      nextId: 1,
      fireCooldown: 0,
      recoveryTimer: 0,
      waveClearTimer: 0,
      elapsed: 0
    };
    state2.comets = createWaveComets(state2, 1);
    return state2;
  }
  function createComet(id, tier, position, velocity) {
    return {
      id,
      tier,
      position: { ...position },
      velocity: { ...velocity },
      radius: TIER_RADIUS[tier]
    };
  }
  function stepGame(state2, input2, dt) {
    const next = cloneState(state2);
    if (next.status === "game-over") {
      return next;
    }
    next.status = next.status === "ready" ? "playing" : next.status;
    next.elapsed += dt;
    next.fireCooldown = Math.max(0, next.fireCooldown - dt);
    next.overdriveTimer = Math.max(0, next.overdriveTimer - dt);
    next.recoveryTimer = Math.max(0, next.recoveryTimer - dt);
    if (next.status === "recovering" && next.recoveryTimer <= 0) {
      next.status = "playing";
    }
    if (next.status === "wave-cleared") {
      next.waveClearTimer = Math.max(0, next.waveClearTimer - dt);
      if (next.waveClearTimer <= 0) {
        beginNextWave(next);
      }
      return next;
    }
    if (input2.turnLeft) {
      next.skimmer.angle -= TURN_SPEED * dt;
    }
    if (input2.turnRight) {
      next.skimmer.angle += TURN_SPEED * dt;
    }
    if (input2.thrust) {
      next.skimmer.velocity.x += Math.cos(next.skimmer.angle) * THRUST_ACCELERATION * dt;
      next.skimmer.velocity.y += Math.sin(next.skimmer.angle) * THRUST_ACCELERATION * dt;
    }
    if (input2.overdrive && next.overdriveCharge >= 100 && next.overdriveTimer <= 0) {
      next.overdriveCharge = 0;
      next.overdriveTimer = OVERDRIVE_SECONDS;
    }
    const damping = Math.pow(DAMPING_PER_SECOND, dt * 60);
    next.skimmer.velocity.x *= damping;
    next.skimmer.velocity.y *= damping;
    next.skimmer.position = wrapPosition(
      {
        x: next.skimmer.position.x + next.skimmer.velocity.x * dt,
        y: next.skimmer.position.y + next.skimmer.velocity.y * dt
      },
      next.bounds
    );
    if (input2.fire && next.fireCooldown <= 0) {
      next.shots.push(createShot(next));
      next.fireCooldown = next.overdriveTimer > 0 ? OVERDRIVE_FIRE_COOLDOWN : FIRE_COOLDOWN;
    }
    next.shots = next.shots.map((shot) => ({
      ...shot,
      ttl: shot.ttl - dt,
      position: wrapPosition(
        {
          x: shot.position.x + shot.velocity.x * dt,
          y: shot.position.y + shot.velocity.y * dt
        },
        next.bounds
      )
    })).filter((shot) => shot.ttl > 0);
    next.comets = next.comets.map((comet) => ({
      ...comet,
      position: wrapPosition(
        {
          x: comet.position.x + comet.velocity.x * dt,
          y: comet.position.y + comet.velocity.y * dt
        },
        next.bounds
      )
    }));
    resolveNearMisses(next);
    resolveShotHits(next);
    resolveSkimmerCollision(next);
    if (next.comets.length === 0 && next.status === "playing") {
      next.status = "wave-cleared";
      next.waveClearTimer = WAVE_CLEAR_SECONDS;
    }
    return next;
  }
  function snapshot(state2) {
    return {
      status: state2.status,
      wave: state2.wave,
      waveSeed: state2.waveSeed,
      lives: state2.lives,
      score: state2.score,
      riskChain: { ...state2.riskChain },
      overdriveCharge: state2.overdriveCharge,
      overdriveTimer: state2.overdriveTimer,
      skimmer: { ...state2.skimmer, position: { ...state2.skimmer.position }, velocity: { ...state2.skimmer.velocity } },
      shots: state2.shots.map((shot) => ({ ...shot, position: { ...shot.position }, velocity: { ...shot.velocity } })),
      comets: state2.comets.map((comet) => ({
        ...comet,
        position: { ...comet.position },
        velocity: { ...comet.velocity }
      }))
    };
  }
  function createWaveComets(state2, wave) {
    if (wave === 8) {
      return [
        createComet(state2.nextId++, "core", { x: state2.bounds.x / 2, y: state2.bounds.y * 0.28 }, { x: 72, y: 38 })
      ];
    }
    const count = Math.min(2 + Math.floor((wave - 1) / 2), 5);
    const speed = 58 + wave * 8;
    const comets = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (state2.waveSeed + wave * 71 + i * 137) % 360 * (Math.PI / 180);
      const unstable = wave >= 5 && i === count - 1;
      const position = {
        x: (state2.bounds.x * (0.18 + i * 0.31) + state2.waveSeed * 0.11 + wave * 43) % (state2.bounds.x - 120) + 60,
        y: (state2.bounds.y * (0.22 + i * 0.27) + state2.waveSeed * 0.07 + wave * 29) % (state2.bounds.y - 120) + 60
      };
      const comet = createComet(state2.nextId++, "large", position, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
      comet.variant = unstable ? "unstable" : void 0;
      comets.push(comet);
    }
    return comets;
  }
  function wrapPosition(position, bounds) {
    return {
      x: (position.x % bounds.x + bounds.x) % bounds.x,
      y: (position.y % bounds.y + bounds.y) % bounds.y
    };
  }
  function createShot(state2) {
    const direction = { x: Math.cos(state2.skimmer.angle), y: Math.sin(state2.skimmer.angle) };
    return {
      id: state2.nextId++,
      position: {
        x: state2.skimmer.position.x + direction.x * (state2.skimmer.radius + 6),
        y: state2.skimmer.position.y + direction.y * (state2.skimmer.radius + 6)
      },
      velocity: {
        x: state2.skimmer.velocity.x + direction.x * SHOT_SPEED,
        y: state2.skimmer.velocity.y + direction.y * SHOT_SPEED
      },
      ttl: state2.overdriveTimer > 0 ? SHOT_TTL + 0.35 : SHOT_TTL,
      radius: state2.overdriveTimer > 0 ? 5 : 3
    };
  }
  function resolveNearMisses(state2) {
    if (state2.recoveryTimer > 0 || state2.status !== "playing" || state2.shots.length > 0 || state2.fireCooldown > 0) {
      return;
    }
    for (const comet of state2.comets) {
      if (state2.nearMissIds.includes(comet.id)) {
        continue;
      }
      const gap = distance(state2.skimmer.position, comet.position) - state2.skimmer.radius - comet.radius;
      if (gap > 0 && gap <= 36) {
        state2.nearMissIds.push(comet.id);
        awardRisk(state2, 25, 10);
      }
    }
  }
  function resolveShotHits(state2) {
    const remainingShots = [];
    const remainingComets = [...state2.comets];
    const spawnedComets = [];
    for (const shot of state2.shots) {
      const hitIndex = remainingComets.findIndex((comet) => distance(shot.position, comet.position) <= shot.radius + comet.radius);
      if (hitIndex === -1) {
        remainingShots.push(shot);
        continue;
      }
      const [hit] = remainingComets.splice(hitIndex, 1);
      awardHitScore(state2, hit.tier);
      spawnedComets.push(...splitComet(state2, hit, shot));
    }
    state2.shots = remainingShots;
    state2.comets = [...remainingComets, ...spawnedComets];
  }
  function awardHitScore(state2, tier) {
    awardRisk(state2, TIER_SCORE[tier], 20);
  }
  function awardRisk(state2, baseScore, overdriveGain) {
    state2.score += Math.round(baseScore * state2.riskChain.multiplier);
    state2.riskChain.hits += 1;
    state2.riskChain.multiplier = Math.min(4, 1 + state2.riskChain.hits * 0.25);
    state2.overdriveCharge = Math.min(100, state2.overdriveCharge + overdriveGain);
  }
  function resolveSkimmerCollision(state2) {
    if (state2.recoveryTimer > 0 || state2.status !== "playing") {
      return;
    }
    const collision = state2.comets.find((comet) => distance(state2.skimmer.position, comet.position) <= state2.skimmer.radius + comet.radius);
    if (!collision) {
      return;
    }
    state2.lives -= 1;
    state2.riskChain = { multiplier: 1, hits: 0 };
    state2.overdriveCharge = 0;
    state2.overdriveTimer = 0;
    state2.nearMissIds = [];
    state2.shots = [];
    state2.skimmer.position = { x: state2.bounds.x / 2, y: state2.bounds.y / 2 };
    state2.skimmer.velocity = { x: 0, y: 0 };
    state2.recoveryTimer = RECOVERY_SECONDS;
    state2.comets = state2.comets.filter((comet) => distance(state2.skimmer.position, comet.position) > state2.skimmer.radius + comet.radius + 24);
    state2.status = state2.lives <= 0 ? "game-over" : "recovering";
  }
  function beginNextWave(state2) {
    state2.wave += 1;
    state2.status = "playing";
    state2.waveClearTimer = 0;
    state2.shots = [];
    state2.nearMissIds = [];
    state2.comets = createWaveComets(state2, state2.wave);
  }
  function splitComet(state2, comet, shot) {
    const childTier = TIER_CHILDREN[comet.tier];
    if (!childTier) {
      return [];
    }
    const baseAngle = Math.atan2(comet.velocity.y, comet.velocity.x) || Math.atan2(shot.velocity.y, shot.velocity.x);
    const speed = Math.max(90, Math.hypot(comet.velocity.x, comet.velocity.y) * 1.12);
    const offsets = comet.tier === "core" ? [-1.05, -0.35, 0.35, 1.05] : comet.variant === "unstable" ? [-0.92, 0, 0.92] : [-0.72, 0.72];
    return offsets.map((offset) => {
      const angle = baseAngle + offset;
      return createComet(
        state2.nextId++,
        childTier,
        { ...comet.position },
        {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        }
      );
    });
  }
  function cloneState(state2) {
    return {
      bounds: { ...state2.bounds },
      skimmer: {
        ...state2.skimmer,
        position: { ...state2.skimmer.position },
        velocity: { ...state2.skimmer.velocity }
      },
      shots: state2.shots.map((shot) => ({ ...shot, position: { ...shot.position }, velocity: { ...shot.velocity } })),
      comets: state2.comets.map((comet) => ({
        ...comet,
        position: { ...comet.position },
        velocity: { ...comet.velocity }
      })),
      status: state2.status,
      wave: state2.wave,
      waveSeed: state2.waveSeed,
      lives: state2.lives,
      score: state2.score,
      riskChain: { ...state2.riskChain },
      overdriveCharge: state2.overdriveCharge,
      overdriveTimer: state2.overdriveTimer,
      nearMissIds: [...state2.nearMissIds],
      nextId: state2.nextId,
      fireCooldown: state2.fireCooldown,
      recoveryTimer: state2.recoveryTimer,
      waveClearTimer: state2.waveClearTimer,
      elapsed: state2.elapsed
    };
  }
  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // src/record.ts
  var STORAGE_KEY = "meteor-breakers:local-record";
  var defaultLocalRecord = {
    bestScore: 0,
    bestWave: 1,
    muted: false,
    firstVictory: false
  };
  function loadLocalRecord(storage = window.localStorage) {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultLocalRecord };
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        bestScore: Number.isFinite(parsed.bestScore) ? Number(parsed.bestScore) : defaultLocalRecord.bestScore,
        bestWave: Number.isFinite(parsed.bestWave) ? Number(parsed.bestWave) : defaultLocalRecord.bestWave,
        muted: typeof parsed.muted === "boolean" ? parsed.muted : defaultLocalRecord.muted,
        firstVictory: typeof parsed.firstVictory === "boolean" ? parsed.firstVictory : defaultLocalRecord.firstVictory
      };
    } catch {
      return { ...defaultLocalRecord };
    }
  }
  function saveLocalRecord(record2, storage = window.localStorage) {
    storage.setItem(STORAGE_KEY, JSON.stringify(record2));
  }
  function mergeProgress(record2, progress) {
    return {
      bestScore: Math.max(record2.bestScore, progress.score),
      bestWave: Math.max(record2.bestWave, progress.wave),
      muted: record2.muted,
      firstVictory: record2.firstVictory || Boolean(progress.firstVictory)
    };
  }
  function setMuted(record2, muted) {
    return { ...record2, muted };
  }

  // src/main.ts
  var app = document.querySelector("#app");
  if (!app) {
    throw new Error("Missing #app");
  }
  app.innerHTML = `
  <main class="shell">
    <section class="hud" aria-label="Meteor Breakers status">
      <div>
        <p class="eyebrow">Meteor Breakers</p>
        <h1>MVP Hangar</h1>
      </div>
      <div class="hud__cluster">
        <span id="status">Ready</span>
        <span id="score">0 pts</span>
        <span id="overdrive">Overdrive 0%</span>
        <span id="lives">3 lives</span>
        <span id="wave">Wave 1</span>
        <span id="comets">2 threats</span>
      </div>
    </section>
    <section class="hangar" aria-label="MVP Hangar">
      <button id="start" type="button">Start</button>
      <button id="restart" type="button">Restart</button>
      <button id="mute" type="button" aria-pressed="false">Mute</button>
      <span id="record">Best 0 pts / Wave 1</span>
      <span id="victory">First Victory pending</span>
    </section>
    <canvas id="game" width="960" height="640" aria-label="Meteor Breakers playfield" tabindex="0"></canvas>
    <section class="controls" aria-label="Controls">
      <span>Left/Right or A/D rotate</span>
      <span>Up/W thrust</span>
      <span>Space fire</span>
      <span>Shift overdrive</span>
    </section>
  </main>
`;
  var canvas = document.querySelector("#game");
  var statusLabel = document.querySelector("#status");
  var scoreLabel = document.querySelector("#score");
  var overdriveLabel = document.querySelector("#overdrive");
  var livesLabel = document.querySelector("#lives");
  var waveLabel = document.querySelector("#wave");
  var cometsLabel = document.querySelector("#comets");
  var startButton = document.querySelector("#start");
  var restartButton = document.querySelector("#restart");
  var muteButton = document.querySelector("#mute");
  var recordLabel = document.querySelector("#record");
  var victoryLabel = document.querySelector("#victory");
  if (!canvas || !statusLabel || !scoreLabel || !overdriveLabel || !livesLabel || !waveLabel || !cometsLabel || !startButton || !restartButton || !muteButton || !recordLabel || !victoryLabel) {
    throw new Error("Missing game surface");
  }
  var context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D is not available");
  }
  var gameCanvas = canvas;
  var ctx = context;
  var statusElement = statusLabel;
  var scoreElement = scoreLabel;
  var overdriveElement = overdriveLabel;
  var livesElement = livesLabel;
  var waveElement = waveLabel;
  var cometsElement = cometsLabel;
  var startElement = startButton;
  var restartElement = restartButton;
  var muteElement = muteButton;
  var recordElement = recordLabel;
  var victoryElement = victoryLabel;
  var state = createInitialState({ x: gameCanvas.width, y: gameCanvas.height });
  var hasStarted = false;
  var record = loadLocalRecord();
  var audio = new ArcadeAudio(record.muted);
  var input = { ...defaultInput };
  var lastTime = performance.now();
  var previousShotCount = state.shots.length;
  var previousScore = state.score;
  var previousLives = state.lives;
  var previousWave = state.wave;
  var keyMap = {
    ArrowLeft: "turnLeft",
    KeyA: "turnLeft",
    ArrowRight: "turnRight",
    KeyD: "turnRight",
    ArrowUp: "thrust",
    KeyW: "thrust",
    Space: "fire",
    ShiftLeft: "overdrive",
    ShiftRight: "overdrive"
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
  startElement.addEventListener("click", () => {
    hasStarted = true;
    state.status = state.status === "ready" ? "playing" : state.status;
    gameCanvas.focus();
    render();
  });
  restartElement.addEventListener("click", () => {
    state = createInitialState({ x: gameCanvas.width, y: gameCanvas.height });
    hasStarted = true;
    gameCanvas.focus();
    render();
  });
  muteElement.addEventListener("click", () => {
    record = setMuted(record, !record.muted);
    audio.setMuted(record.muted);
    saveLocalRecord(record);
    render();
  });
  window.__meteorBreakersTest = {
    getSnapshot: () => snapshot(state),
    reset: () => {
      state = createInitialState({ x: gameCanvas.width, y: gameCanvas.height });
      hasStarted = false;
    },
    loadScenario: (name) => {
      state = createInitialState({ x: gameCanvas.width, y: gameCanvas.height });
      testScenarios[name]();
      hasStarted = false;
      render();
    },
    fireAtThreat: (index = 0) => {
      const target = state.comets[index];
      if (!target) {
        state = stepGame(state, defaultInput, 1);
        handleSideEffects();
        render();
        return;
      }
      target.velocity = { x: 0, y: 0 };
      state.shots = [
        {
          id: state.nextId++,
          position: { ...target.position },
          velocity: { x: 0, y: 0 },
          ttl: 1,
          radius: 5
        }
      ];
      state.fireCooldown = 0;
      state = stepGame(state, defaultInput, 1 / 60);
      handleSideEffects();
      render();
    },
    step: (partialInput, dt = 1 / 60) => {
      state = stepGame(state, { ...defaultInput, ...partialInput }, dt);
      handleSideEffects();
      render();
    }
  };
  var testScenarios = {
    "single-large-shot": () => {
      state.comets = [createComet(100, "large", { x: state.skimmer.position.x, y: state.skimmer.position.y - 70 }, { x: 0, y: 0 })];
      state.nextId = 101;
      state.skimmer.angle = -Math.PI / 2;
    },
    collision: () => {
      state.comets = [createComet(200, "large", { ...state.skimmer.position }, { x: 0, y: 0 })];
      state.nextId = 201;
    },
    "near-miss": () => {
      state.comets = [createComet(300, "large", { x: state.skimmer.position.x + 96, y: state.skimmer.position.y }, { x: 0, y: 0 })];
      state.nextId = 301;
    },
    "overdrive-ready": () => {
      state.overdriveCharge = 100;
    },
    "clear-wave": () => {
      state.comets = [];
      state.status = "wave-cleared";
      state.waveClearTimer = 0.1;
    },
    "first-victory": () => {
      state.wave = 8;
      state.score = 2400;
      state.comets = [];
      state.status = "wave-cleared";
      state.waveClearTimer = 0.1;
    },
    "core-comet": () => {
      state.wave = 8;
      state.score = 2400;
      state.comets = [createComet(800, "core", { x: state.bounds.x / 2, y: state.bounds.y * 0.28 }, { x: 0, y: 0 })];
      state.nextId = 801;
    }
  };
  requestAnimationFrame(tick);
  function tick(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1e3);
    lastTime = now;
    if (hasStarted) {
      state = stepGame(state, input, dt);
      handleSideEffects();
    }
    render();
    requestAnimationFrame(tick);
  }
  function handleSideEffects() {
    if (state.shots.length > previousShotCount) {
      audio.blip("fire");
    }
    if (state.score > previousScore) {
      audio.blip("hit");
    }
    if (state.lives < previousLives) {
      audio.blip("life");
    }
    if (state.wave > previousWave) {
      audio.blip("wave");
    }
    record = mergeProgress(record, {
      score: state.score,
      wave: state.wave,
      firstVictory: state.wave > 8 || state.wave === 8 && state.status === "wave-cleared"
    });
    saveLocalRecord(record);
    previousShotCount = state.shots.length;
    previousScore = state.score;
    previousLives = state.lives;
    previousWave = state.wave;
  }
  function render() {
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
      drawComet(comet.position.x, comet.position.y, comet.radius, comet.tier, comet.variant);
    }
    statusElement.textContent = formatStatus(state.status);
    scoreElement.textContent = `${state.score} pts`;
    overdriveElement.textContent = state.overdriveTimer > 0 ? "Overdrive active" : `Overdrive ${Math.round(state.overdriveCharge)}%`;
    livesElement.textContent = `${state.lives} ${state.lives === 1 ? "life" : "lives"}`;
    waveElement.textContent = `Wave ${state.wave}`;
    cometsElement.textContent = `${state.comets.length} threat${state.comets.length === 1 ? "" : "s"}`;
    recordElement.textContent = `Best ${record.bestScore} pts / Wave ${record.bestWave}`;
    victoryElement.textContent = record.firstVictory ? "First Victory complete" : "First Victory pending";
    muteElement.textContent = record.muted ? "Unmute" : "Mute";
    muteElement.setAttribute("aria-pressed", String(record.muted));
  }
  function formatStatus(status) {
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
  function drawStarfield() {
    ctx.fillStyle = "#070915";
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    ctx.fillStyle = "rgba(229, 245, 255, 0.72)";
    for (let i = 0; i < 72; i += 1) {
      const x = i * 137.5 % gameCanvas.width;
      const y = i * 59.7 % gameCanvas.height;
      ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1, 1);
    }
  }
  function drawSkimmer(current) {
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
  function drawComet(x, y, radius, tier, variant) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = variant === "unstable" ? "#c8ff6e" : tier === "core" ? "#ff6f91" : tier === "large" ? "#f29e6d" : tier === "medium" ? "#ffc76b" : "#f6f1b2";
    ctx.setLineDash(variant === "unstable" ? [6, 5] : []);
    ctx.fillStyle = tier === "core" ? "rgba(255, 111, 145, 0.16)" : "rgba(242, 158, 109, 0.13)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 9; i += 1) {
      const angle = Math.PI * 2 * i / 9;
      const wobble = radius * (0.82 + i * 37 % 19 / 100);
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
})();
