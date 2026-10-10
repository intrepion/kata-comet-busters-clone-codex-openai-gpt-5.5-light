export type LocalRecord = {
  bestScore: number;
  bestWave: number;
  muted: boolean;
  firstVictory: boolean;
};

const STORAGE_KEY = "meteor-breakers:local-record";

export const defaultLocalRecord: LocalRecord = {
  bestScore: 0,
  bestWave: 1,
  muted: false,
  firstVictory: false
};

export function loadLocalRecord(storage: Pick<Storage, "getItem"> = window.localStorage): LocalRecord {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return { ...defaultLocalRecord };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalRecord>;
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

export function saveLocalRecord(record: LocalRecord, storage: Pick<Storage, "setItem"> = window.localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function mergeProgress(record: LocalRecord, progress: { score: number; wave: number; firstVictory?: boolean }): LocalRecord {
  return {
    bestScore: Math.max(record.bestScore, progress.score),
    bestWave: Math.max(record.bestWave, progress.wave),
    muted: record.muted,
    firstVictory: record.firstVictory || Boolean(progress.firstVictory)
  };
}

export function setMuted(record: LocalRecord, muted: boolean): LocalRecord {
  return { ...record, muted };
}
