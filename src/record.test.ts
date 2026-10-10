import { describe, expect, it } from "vitest";
import { defaultLocalRecord, loadLocalRecord, mergeProgress, saveLocalRecord, setMuted } from "./record";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("Local Record", () => {
  it("falls back to the default Local Record when storage is empty or invalid", () => {
    expect(loadLocalRecord(new MemoryStorage())).toEqual(defaultLocalRecord);
    expect(loadLocalRecord({ getItem: () => "not json" })).toEqual(defaultLocalRecord);
  });

  it("persists best score, best Wave, mute, and First Victory state", () => {
    const storage = new MemoryStorage();
    const record = setMuted(mergeProgress(defaultLocalRecord, { score: 1200, wave: 4, firstVictory: true }), true);

    saveLocalRecord(record, storage);

    expect(loadLocalRecord(storage)).toEqual({
      bestScore: 1200,
      bestWave: 4,
      muted: true,
      firstVictory: true
    });
  });

  it("never downgrades saved arcade progress", () => {
    const record = { bestScore: 5000, bestWave: 6, muted: false, firstVictory: false };

    expect(mergeProgress(record, { score: 3000, wave: 2 })).toEqual(record);
  });

  it("marks First Victory after the Wave 8 milestone is complete", () => {
    expect(mergeProgress(defaultLocalRecord, { score: 8000, wave: 8, firstVictory: true }).firstVictory).toBe(true);
  });
});
