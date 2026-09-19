import { applySeed, type ApplyResult, type Db } from "./apply";
import { loadSeedData, type SeedIssue } from "./load";

export class SeedRejectedError extends Error {
  constructor(public issues: SeedIssue[]) {
    super(`${issues.length}件の問題があるため、投入しませんでした。`);
  }
}

/** 検証に1件でも失敗したら、DBに触らずに SeedRejectedError を投げる。 */
export async function seed(db: Db, dataDir: string): Promise<ApplyResult & { warnings: SeedIssue[] }> {
  const { data, errors, warnings } = loadSeedData(dataDir);
  if (errors.length > 0) throw new SeedRejectedError(errors);
  return { ...(await applySeed(db, data)), warnings };
}

export { loadSeedData } from "./load";
export type { Db } from "./apply";
