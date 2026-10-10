import type { Comet, CometTier, GameSnapshot, GameState, InputState, Shot, Vector } from "./domain";

const TURN_SPEED = Math.PI * 2.2;
const THRUST_ACCELERATION = 420;
const DAMPING_PER_SECOND = 0.985;
const SHOT_SPEED = 520;
const SHOT_TTL = 1.35;
const FIRE_COOLDOWN = 0.18;
const OVERDRIVE_FIRE_COOLDOWN = 0.07;
const OVERDRIVE_SECONDS = 4;
const STARTING_LIVES = 3;
const RECOVERY_SECONDS = 2;
const WAVE_CLEAR_SECONDS = 0.9;

const TIER_RADIUS: Record<CometTier, number> = {
  core: 74,
  large: 52,
  medium: 32,
  small: 18
};

const TIER_SCORE: Record<CometTier, number> = {
  core: 800,
  large: 100,
  medium: 150,
  small: 225
};

const TIER_CHILDREN: Partial<Record<CometTier, CometTier>> = {
  core: "large",
  large: "medium",
  medium: "small"
};

export const defaultInput: InputState = {
  turnLeft: false,
  turnRight: false,
  thrust: false,
  fire: false,
  overdrive: false
};

export function createInitialState(bounds: Vector = { x: 960, y: 640 }): GameState {
  const state: GameState = {
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
  state.comets = createWaveComets(state, 1);
  return state;
}

export function createComet(id: number, tier: CometTier, position: Vector, velocity: Vector): Comet {
  return {
    id,
    tier,
    position: { ...position },
    velocity: { ...velocity },
    radius: TIER_RADIUS[tier]
  };
}

export function stepGame(state: GameState, input: InputState, dt: number): GameState {
  const next = cloneState(state);
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

  if (input.turnLeft) {
    next.skimmer.angle -= TURN_SPEED * dt;
  }
  if (input.turnRight) {
    next.skimmer.angle += TURN_SPEED * dt;
  }
  if (input.thrust) {
    next.skimmer.velocity.x += Math.cos(next.skimmer.angle) * THRUST_ACCELERATION * dt;
    next.skimmer.velocity.y += Math.sin(next.skimmer.angle) * THRUST_ACCELERATION * dt;
  }
  if (input.overdrive && next.overdriveCharge >= 100 && next.overdriveTimer <= 0) {
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

  if (input.fire && next.fireCooldown <= 0) {
    next.shots.push(createShot(next));
    next.fireCooldown = next.overdriveTimer > 0 ? OVERDRIVE_FIRE_COOLDOWN : FIRE_COOLDOWN;
  }

  next.shots = next.shots
    .map((shot) => ({
      ...shot,
      ttl: shot.ttl - dt,
      position: wrapPosition(
        {
          x: shot.position.x + shot.velocity.x * dt,
          y: shot.position.y + shot.velocity.y * dt
        },
        next.bounds
      )
    }))
    .filter((shot) => shot.ttl > 0);

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

export function snapshot(state: GameState): GameSnapshot {
  return {
    status: state.status,
    wave: state.wave,
    waveSeed: state.waveSeed,
    lives: state.lives,
    score: state.score,
    riskChain: { ...state.riskChain },
    overdriveCharge: state.overdriveCharge,
    overdriveTimer: state.overdriveTimer,
    skimmer: { ...state.skimmer, position: { ...state.skimmer.position }, velocity: { ...state.skimmer.velocity } },
    shots: state.shots.map((shot) => ({ ...shot, position: { ...shot.position }, velocity: { ...shot.velocity } })),
    comets: state.comets.map((comet) => ({
      ...comet,
      position: { ...comet.position },
      velocity: { ...comet.velocity }
    }))
  };
}

export function createWaveComets(state: GameState, wave: number): Comet[] {
  if (wave === 8) {
    return [
      createComet(state.nextId++, "core", { x: state.bounds.x / 2, y: state.bounds.y * 0.28 }, { x: 72, y: 38 })
    ];
  }

  const count = Math.min(2 + Math.floor((wave - 1) / 2), 5);
  const speed = 58 + wave * 8;
  const comets: Comet[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = ((state.waveSeed + wave * 71 + i * 137) % 360) * (Math.PI / 180);
    const unstable = wave >= 5 && i === count - 1;
    const position = {
      x: ((state.bounds.x * (0.18 + i * 0.31) + state.waveSeed * 0.11 + wave * 43) % (state.bounds.x - 120)) + 60,
      y: ((state.bounds.y * (0.22 + i * 0.27) + state.waveSeed * 0.07 + wave * 29) % (state.bounds.y - 120)) + 60
    };
    const comet = createComet(state.nextId++, "large", position, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
    comet.variant = unstable ? "unstable" : undefined;
    comets.push(comet);
  }
  return comets;
}

export function wrapPosition(position: Vector, bounds: Vector): Vector {
  return {
    x: ((position.x % bounds.x) + bounds.x) % bounds.x,
    y: ((position.y % bounds.y) + bounds.y) % bounds.y
  };
}

function createShot(state: GameState): Shot {
  const direction = { x: Math.cos(state.skimmer.angle), y: Math.sin(state.skimmer.angle) };
  return {
    id: state.nextId++,
    position: {
      x: state.skimmer.position.x + direction.x * (state.skimmer.radius + 6),
      y: state.skimmer.position.y + direction.y * (state.skimmer.radius + 6)
    },
    velocity: {
      x: state.skimmer.velocity.x + direction.x * SHOT_SPEED,
      y: state.skimmer.velocity.y + direction.y * SHOT_SPEED
    },
    ttl: state.overdriveTimer > 0 ? SHOT_TTL + 0.35 : SHOT_TTL,
    radius: state.overdriveTimer > 0 ? 5 : 3
  };
}

function resolveNearMisses(state: GameState): void {
  if (state.recoveryTimer > 0 || state.status !== "playing" || state.shots.length > 0 || state.fireCooldown > 0) {
    return;
  }
  for (const comet of state.comets) {
    if (state.nearMissIds.includes(comet.id)) {
      continue;
    }
    const gap = distance(state.skimmer.position, comet.position) - state.skimmer.radius - comet.radius;
    if (gap > 0 && gap <= 36) {
      state.nearMissIds.push(comet.id);
      awardRisk(state, 25, 10);
    }
  }
}

function resolveShotHits(state: GameState): void {
  const remainingShots: Shot[] = [];
  const remainingComets: Comet[] = [...state.comets];
  const spawnedComets: Comet[] = [];

  for (const shot of state.shots) {
    const hitIndex = remainingComets.findIndex((comet) => distance(shot.position, comet.position) <= shot.radius + comet.radius);
    if (hitIndex === -1) {
      remainingShots.push(shot);
      continue;
    }

    const [hit] = remainingComets.splice(hitIndex, 1);
    awardHitScore(state, hit.tier);
    spawnedComets.push(...splitComet(state, hit, shot));
  }

  state.shots = remainingShots;
  state.comets = [...remainingComets, ...spawnedComets];
}

function awardHitScore(state: GameState, tier: CometTier): void {
  awardRisk(state, TIER_SCORE[tier], 20);
}

function awardRisk(state: GameState, baseScore: number, overdriveGain: number): void {
  state.score += Math.round(baseScore * state.riskChain.multiplier);
  state.riskChain.hits += 1;
  state.riskChain.multiplier = Math.min(4, 1 + state.riskChain.hits * 0.25);
  state.overdriveCharge = Math.min(100, state.overdriveCharge + overdriveGain);
}

function resolveSkimmerCollision(state: GameState): void {
  if (state.recoveryTimer > 0 || state.status !== "playing") {
    return;
  }

  const collision = state.comets.find((comet) => distance(state.skimmer.position, comet.position) <= state.skimmer.radius + comet.radius);
  if (!collision) {
    return;
  }

  state.lives -= 1;
  state.riskChain = { multiplier: 1, hits: 0 };
  state.overdriveCharge = 0;
  state.overdriveTimer = 0;
  state.nearMissIds = [];
  state.shots = [];
  state.skimmer.position = { x: state.bounds.x / 2, y: state.bounds.y / 2 };
  state.skimmer.velocity = { x: 0, y: 0 };
  state.recoveryTimer = RECOVERY_SECONDS;
  state.comets = state.comets.filter((comet) => distance(state.skimmer.position, comet.position) > state.skimmer.radius + comet.radius + 24);
  state.status = state.lives <= 0 ? "game-over" : "recovering";
}

function beginNextWave(state: GameState): void {
  state.wave += 1;
  state.status = "playing";
  state.waveClearTimer = 0;
  state.shots = [];
  state.nearMissIds = [];
  state.comets = createWaveComets(state, state.wave);
}

function splitComet(state: GameState, comet: Comet, shot: Shot): Comet[] {
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
      state.nextId++,
      childTier,
      { ...comet.position },
      {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      }
    );
  });
}

function cloneState(state: GameState): GameState {
  return {
    bounds: { ...state.bounds },
    skimmer: {
      ...state.skimmer,
      position: { ...state.skimmer.position },
      velocity: { ...state.skimmer.velocity }
    },
    shots: state.shots.map((shot) => ({ ...shot, position: { ...shot.position }, velocity: { ...shot.velocity } })),
    comets: state.comets.map((comet) => ({
      ...comet,
      position: { ...comet.position },
      velocity: { ...comet.velocity }
    })),
    status: state.status,
    wave: state.wave,
    waveSeed: state.waveSeed,
    lives: state.lives,
    score: state.score,
    riskChain: { ...state.riskChain },
    overdriveCharge: state.overdriveCharge,
    overdriveTimer: state.overdriveTimer,
    nearMissIds: [...state.nearMissIds],
    nextId: state.nextId,
    fireCooldown: state.fireCooldown,
    recoveryTimer: state.recoveryTimer,
    waveClearTimer: state.waveClearTimer,
    elapsed: state.elapsed
  };
}

function distance(a: Vector, b: Vector): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
