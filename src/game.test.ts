import { describe, expect, it } from "vitest";
import { createComet, createInitialState, createWaveComets, defaultInput, stepGame, wrapPosition } from "./game";

describe("Meteor Breakers flight and fragmentation", () => {
  it("wraps positions across every playfield edge", () => {
    expect(wrapPosition({ x: -4, y: 645 }, { x: 960, y: 640 })).toEqual({ x: 956, y: 5 });
    expect(wrapPosition({ x: 964, y: -5 }, { x: 960, y: 640 })).toEqual({ x: 4, y: 635 });
  });

  it("accelerates the Skimmer through Hybrid Flight thrust", () => {
    const state = createInitialState({ x: 960, y: 640 });
    const next = stepGame(state, { ...defaultInput, thrust: true }, 0.5);

    expect(next.skimmer.position.y).toBeLessThan(state.skimmer.position.y);
    expect(next.skimmer.velocity.y).toBeLessThan(-120);
  });

  it("fires wrapping shots from the Skimmer heading", () => {
    const state = createInitialState({ x: 960, y: 640 });
    const next = stepGame(state, { ...defaultInput, fire: true }, 1 / 60);

    expect(next.shots).toHaveLength(1);
    expect(next.shots[0].velocity.y).toBeLessThan(-500);
  });

  it("splits a Large Comet into two Medium Shards when shot", () => {
    const state = createInitialState({ x: 960, y: 640 });
    state.comets = [createComet(10, "large", { x: 480, y: 250 }, { x: 40, y: 0 })];
    state.skimmer.position = { x: 480, y: 320 };
    state.skimmer.angle = -Math.PI / 2;
    state.nextId = 11;

    const fired = stepGame(state, { ...defaultInput, fire: true }, 1 / 60);
    const hit = stepGame(fired, defaultInput, 0.1);

    expect(hit.comets.map((comet) => comet.tier)).toEqual(["medium", "medium"]);
    expect(hit.shots).toHaveLength(0);
    expect(hit.score).toBe(100);
    expect(hit.riskChain.multiplier).toBe(1.25);
  });

  it("resets the Risk Chain and starts a Recovery Window after collision", () => {
    const state = createInitialState({ x: 960, y: 640 });
    state.score = 500;
    state.riskChain = { multiplier: 2, hits: 4 };
    state.comets = [createComet(20, "large", { x: 480, y: 320 }, { x: 0, y: 0 })];
    state.skimmer.position = { x: 480, y: 320 };

    const next = stepGame(state, defaultInput, 1 / 60);

    expect(next.lives).toBe(2);
    expect(next.status).toBe("recovering");
    expect(next.riskChain).toEqual({ multiplier: 1, hits: 0 });
    expect(next.recoveryTimer).toBeGreaterThan(1.9);
  });

  it("advances to the next deterministic Wave after clearing all hazards", () => {
    const state = createInitialState({ x: 960, y: 640 });
    state.comets = [];
    state.status = "wave-cleared";
    state.waveClearTimer = 0.1;
    const next = stepGame(state, defaultInput, 0.2);

    expect(next.wave).toBe(2);
    expect(next.status).toBe("playing");
    expect(next.comets.every((comet) => comet.tier === "large")).toBe(true);
    expect(next.comets.length).toBeGreaterThan(0);
  });

  it("uses a Core Comet setpiece for Wave 8", () => {
    const state = createInitialState({ x: 960, y: 640 });
    state.wave = 7;
    state.comets = [];
    state.status = "wave-cleared";
    state.waveClearTimer = 0.1;

    const next = stepGame(state, defaultInput, 0.2);

    expect(next.wave).toBe(8);
    expect(next.comets.map((comet) => comet.tier)).toEqual(["core"]);
  });

  it("adds Unstable Comet variants to later deterministic Waves", () => {
    const state = createInitialState({ x: 960, y: 640 });
    const wave = createInitialState({ x: 960, y: 640 });
    wave.wave = 4;
    wave.comets = [];
    wave.status = "wave-cleared";
    wave.waveClearTimer = 0.1;

    const next = stepGame(wave, defaultInput, 0.2);

    expect(state.comets.some((comet) => comet.variant === "unstable")).toBe(false);
    expect(next.wave).toBe(5);
    expect(next.comets.some((comet) => comet.variant === "unstable")).toBe(true);
  });

  it("uses an explicit Wave Seed for reproducible layouts", () => {
    const first = createInitialState({ x: 960, y: 640 });
    const second = createInitialState({ x: 960, y: 640 });
    second.waveSeed = first.waveSeed + 1;
    second.comets = createWaveComets(second, 1);

    expect(first.waveSeed).toBe(4307);
    expect(createInitialState({ x: 960, y: 640 }).comets).toEqual(first.comets);
    expect(second.comets).not.toEqual(first.comets);
  });

  it("rewards Near-Misses and charges Overdrive", () => {
    const state = createInitialState({ x: 960, y: 640 });
    state.comets = [createComet(40, "large", { x: state.skimmer.position.x + 96, y: state.skimmer.position.y }, { x: 0, y: 0 })];

    const next = stepGame(state, defaultInput, 1 / 60);

    expect(next.score).toBe(25);
    expect(next.riskChain.multiplier).toBe(1.25);
    expect(next.overdriveCharge).toBe(10);
  });

  it("activates Overdrive as a rapid-fire offensive state", () => {
    const state = createInitialState({ x: 960, y: 640 });
    state.overdriveCharge = 100;

    const active = stepGame(state, { ...defaultInput, overdrive: true }, 1 / 60);
    const fired = stepGame(active, { ...defaultInput, fire: true }, 1 / 60);

    expect(fired.overdriveCharge).toBe(0);
    expect(fired.overdriveTimer).toBeGreaterThan(3.9);
    expect(fired.shots[0].radius).toBe(5);
    expect(fired.fireCooldown).toBeLessThan(0.1);
  });
});
