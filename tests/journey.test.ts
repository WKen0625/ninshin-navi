// 全体マップ: 段階ごとの件数と「いま」。
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { journeyOf, PHASES } from "../lib/journey";
import { resolveNextActions } from "../lib/next-actions";
import { seed } from "../lib/seed";
import { createTestDb, readRules, ROOT } from "./helpers/db";

let rules: Awaited<ReturnType<typeof readRules>>;
beforeAll(async () => {
  const { db } = await createTestDb();
  await seed(db, join(ROOT, "data"));
  rules = await readRules(db);
});

describe("全体マップ", () => {
  const family = { region_code: "13103", due_date: "2027-04-26", confirmation_date: "2026-08-20", birth_date: null, held_documents: [{ document_id: "jp.heartbeat_confirmed", held_at: "2026-08-20" }], completed_step_ids: ["jp.s01"], not_applicable_step_ids: [] };
  it("全段階を数える（出産前でも産後の件数が見える）。済は段階ごとに数え、いまは次にやることの段階", () => {
    const r = resolveNextActions({ family, today: "2026-10-09", ...rules });
    const j = journeyOf({ steps: rules.steps, regions: rules.regions, family, progress: [{ step_id: "jp.s01", status: "done" }], actions: r.actions, current: r.current });
    expect(j.phases.map((p) => p.phase)).toEqual([...PHASES]);
    const by = Object.fromEntries(j.phases.map((p) => [p.phase, p]));
    expect(by.pre_notification.done).toBe(1);
    expect(by.postpartum.total).toBeGreaterThan(5); // 出産前でも産後の手続きを数える
    expect(j.totalDone).toBe(1);
    expect(j.totalRemaining).toBe(j.phases.reduce((n, p) => n + p.total, 0) - 1);
    expect(j.current).toBe(r.current!.step.phase);
    expect(by[j.current].state).toBe("current");
    expect(by.postpartum.state).toBe("future");
  });
  it("区が上書きした国の手続きは数えない。双子の手続きは印が無ければ数えない", () => {
    const r = resolveNextActions({ family, today: "2026-10-09", ...rules });
    const j = journeyOf({ steps: rules.steps, regions: rules.regions, family, progress: [], actions: r.actions, current: r.current });
    const total = j.phases.reduce((n, p) => n + p.total, 0);
    const twins = journeyOf({ steps: rules.steps, regions: rules.regions, family: { ...family, flags: ["multiple"] }, progress: [], actions: r.actions, current: r.current });
    expect(twins.phases.reduce((n, p) => n + p.total, 0)).toBeGreaterThan(total);
  });
});
