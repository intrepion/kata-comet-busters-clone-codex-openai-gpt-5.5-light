export type Vector = {
  x: number;
  y: number;
};

export type CometTier = "large" | "medium" | "small";

export type Skimmer = {
  position: Vector;
  velocity: Vector;
  angle: number;
  radius: number;
};

export type Shot = {
  id: number;
  position: Vector;
  velocity: Vector;
  ttl: number;
  radius: number;
};

export type Comet = {
  id: number;
  tier: CometTier;
  position: Vector;
  velocity: Vector;
  radius: number;
};

export type InputState = {
  turnLeft: boolean;
  turnRight: boolean;
  thrust: boolean;
  fire: boolean;
};

export type GameStatus = "ready" | "playing" | "wave-cleared";

export type GameState = {
  bounds: Vector;
  skimmer: Skimmer;
  shots: Shot[];
  comets: Comet[];
  status: GameStatus;
  nextId: number;
  fireCooldown: number;
  elapsed: number;
};

export type GameSnapshot = {
  status: GameStatus;
  skimmer: Skimmer;
  shots: Shot[];
  comets: Comet[];
};
