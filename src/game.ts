import type { Comet, CometTier, GameSnapshot, GameState, InputState, Shot, Vector } from "./domain";

const TURN_SPEED = Math.PI * 2.2;
const THRUST_ACCELERATION = 420;
const DAMPING_PER_SECOND = 0.985;
const SHOT_SPEED = 520;
const SHOT_TTL = 1.35;
const FIRE_COOLDOWN = 0.18;

const TIER_RADIUS: Record<CometTier, number> = {
  large: 52,
  medium: 32,
  small: 18
};

const TIER_CHILDREN: Partial<Record<CometTier, CometTier>> = {
  large: "medium",
  medium: "small"
};

export const defaultInput: InputState = {
  turnLeft: false,
  turnRight: false,
  thrust: false,
  fire: false
};

export function createInitialState(bounds: Vector = { x: 960, y: 640 }): GameState {
  return {
    bounds,
    skimmer: {
      position: { x: bounds.x / 2, y: bounds.y / 2 },
      velocity: { x: 0, y: 0 },
      angle: -Math.PI / 2,
      radius: 16
    },
    shots: [],
    comets: [
      createComet(1, "large", { x: bounds.x * 0.2, y: bounds.y * 0.25 }, { x: 54, y: 34 }),
      createComet(2, "large", { x: bounds.x * 0.78, y: bounds.y * 0.68 }, { x: -42, y: -28 })
    ],
    status: "ready",
    nextId: 3,
    fireCooldown: 0,
    elapsed: 0
  };
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
  next.status = next.status === "ready" ? "playing" : next.status;
  next.elapsed += dt;
  next.fireCooldown = Math.max(0, next.fireCooldown - dt);

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
    next.fireCooldown = FIRE_COOLDOWN;
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

  resolveShotHits(next);
  if (next.comets.length === 0) {
    next.status = "wave-cleared";
  }

  return next;
}

export function snapshot(state: GameState): GameSnapshot {
  return {
    status: state.status,
    skimmer: { ...state.skimmer, position: { ...state.skimmer.position }, velocity: { ...state.skimmer.velocity } },
    shots: state.shots.map((shot) => ({ ...shot, position: { ...shot.position }, velocity: { ...shot.velocity } })),
    comets: state.comets.map((comet) => ({
      ...comet,
      position: { ...comet.position },
      velocity: { ...comet.velocity }
    }))
  };
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
    ttl: SHOT_TTL,
    radius: 3
  };
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
    spawnedComets.push(...splitComet(state, hit, shot));
  }

  state.shots = remainingShots;
  state.comets = [...remainingComets, ...spawnedComets];
}

function splitComet(state: GameState, comet: Comet, shot: Shot): Comet[] {
  const childTier = TIER_CHILDREN[comet.tier];
  if (!childTier) {
    return [];
  }

  const baseAngle = Math.atan2(comet.velocity.y, comet.velocity.x) || Math.atan2(shot.velocity.y, shot.velocity.x);
  const speed = Math.max(90, Math.hypot(comet.velocity.x, comet.velocity.y) * 1.12);
  return [-0.72, 0.72].map((offset) => {
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
    nextId: state.nextId,
    fireCooldown: state.fireCooldown,
    elapsed: state.elapsed
  };
}

function distance(a: Vector, b: Vector): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
