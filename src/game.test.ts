import { describe, expect, it } from "vitest";
import { createComet, createInitialState, defaultInput, stepGame, wrapPosition } from "./game";

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
});
