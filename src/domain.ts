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

export type GameStatus = "ready" | "playing" | "recovering" | "wave-cleared" | "game-over";

export type RiskChain = {
  multiplier: number;
  hits: number;
};

export type GameState = {
  bounds: Vector;
  skimmer: Skimmer;
  shots: Shot[];
  comets: Comet[];
  status: GameStatus;
  wave: number;
  lives: number;
  score: number;
  riskChain: RiskChain;
  nextId: number;
  fireCooldown: number;
  recoveryTimer: number;
  waveClearTimer: number;
  elapsed: number;
};

export type GameSnapshot = {
  status: GameStatus;
  wave: number;
  lives: number;
  score: number;
  riskChain: RiskChain;
  skimmer: Skimmer;
  shots: Shot[];
  comets: Comet[];
};
