// 「病院と締切」: 3つのテスト家族（世田谷区）で、施設の公表締切週が正しい日付・状態で出るか。

import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { listFacilities, type BookingStat, type Facility } from "../lib/facilities";
import { addDays, type Family } from "../lib/next-actions";
import { seed } from "../lib/seed";
import { createTestDb, readFacilities, ROOT } from "./helpers/db";

const TODAY = "2026-09-18";
let facilities: Facility[];
beforeAll(async () => {
  const { db } = await createTestDb();
  await seed(db, join(ROOT, "data"));
  facilities = await readFacilities(db, "13112");
});

const family = (week: number, over: Partial<Family> = {}): Family => ({
  region_code: "13112",
  due_date: addDays(TODAY, 280 - week * 7),
  confirmation_date: null,
  birth_date: null,
  held_documents: [],
  completed_step_ids: [],
  not_applicable_step_ids: [],
  ...over,
});
const list = (f: Family, opts: { onlyEpidural?: boolean; stats?: BookingStat[] } = {}) =>
  listFacilities({ facilities, stats: opts.stats ?? [], family: f, today: TODAY, onlyEpidural: opts.onlyEpidural ?? false });

describe("妊娠6週", () => {
  it("12施設すべてが出る。公表の締切週が早い順、公表のない施設はそのあとに名前順", () => {
    const items = list(family(6));
    expect(items).toHaveLength(12);
    expect(items.slice(0, 3).map((i) => [i.facility.id, i.facility.booking_deadline_week_official])).toEqual([
      ["seijo-kinoshita", 13],
      ["ncchd", 16],
      ["shiseikai-daini", 16],
    ]);
    expect(items.slice(3).every((i) => i.status === "unknown" && i.deadline == null)).toBe(true);
  });

  it("成城木下病院は13週0日（あと7週）、成育は16週0日（あと10週）", () => {
    const byId = new Map(list(family(6)).map((i) => [i.facility.id, i]));
    const lmp = addDays(TODAY, -42);
    expect(byId.get("seijo-kinoshita")).toMatchObject({ deadline: addDays(lmp, 13 * 7), weeks_left: 7, status: "open" });
    expect(byId.get("ncchd")).toMatchObject({ deadline: addDays(lmp, 16 * 7), weeks_left: 10, status: "open" });
  });

  it("「無痛分娩ができる施設だけ」にすると、確認できた10施設だけになる（未回答の施設は含めない）", () => {
    const items = list(family(6), { onlyEpidural: true });
    expect(items).toHaveLength(10);
    expect(items.map((i) => i.facility.id)).not.toContain("aoki-sanfujinka");
    expect(items.every((i) => i.facility.has_epidural === true)).toBe(true);
  });
});

describe("締切週の前後", () => {
  it("妊娠13週なら成城木下病院は「今週まで」、16週の施設はあと3週", () => {
    const byId = new Map(list(family(13)).map((i) => [i.facility.id, i]));
    expect(byId.get("seijo-kinoshita")).toMatchObject({ weeks_left: 0, status: "this_week" });
    expect(byId.get("ncchd")).toMatchObject({ weeks_left: 3, status: "open" });
  });

  it("妊娠20週なら、公表の締切週は3施設とも過ぎている（一覧からは消さない）", () => {
    const items = list(family(20));
    expect(items).toHaveLength(12);
    expect(items.filter((i) => i.status === "passed").map((i) => i.facility.id)).toEqual(["seijo-kinoshita", "ncchd", "shiseikai-daini"]);
    expect(items[0].weeks_left).toBe(-7);
  });
});

describe("出産後2週", () => {
  it("締切は出さない", () => {
    const items = list(family(40, { due_date: "2026-09-08", birth_date: "2026-09-04" }));
    expect(items).toHaveLength(12);
    expect(items.every((i) => i.status === "after_birth" && i.deadline == null)).toBe(true);
  });
});

describe("記録の集計と出典", () => {
  it("自分の予定月の記録だけを添える", () => {
    const f = family(6); // 予定日 2027-05-14
    const stats: BookingStat[] = [
      { facility_id: "ncchd", due_month: "2027-05-01", reports: 4, booked: 3, full_or_wait: 1, median_week_booked: 8 },
      { facility_id: "ncchd", due_month: "2027-04-01", reports: 9, booked: 9, full_or_wait: 0, median_week_booked: 10 },
    ];
    const byId = new Map(list(f, { stats }).map((i) => [i.facility.id, i]));
    expect(byId.get("ncchd")!.stat).toMatchObject({ reports: 4, median_week_booked: 8 });
    expect(byId.get("seijo-kinoshita")!.stat).toBeNull();
  });

  it("すべての施設に出典と確認日があり、予約ルールのある施設には予約ルールの出典がある（設計原則3）", () => {
    for (const { facility: f } of list(family(6))) {
      expect(f.source_url, f.id).toMatch(/^https?:\/\//);
      expect(f.verified_at, f.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (f.booking_policy) expect(f.booking_source_url, f.id).toMatch(/^https?:\/\//);
    }
  });

  it("費用は出産なびの中央値（無ければ平均値）", () => {
    const byId = new Map(list(family(6)).map((i) => [i.facility.id, i.facility.cost]));
    expect(byId.get("ncchd")).toMatchObject({ yen: 976000, basis: "median" });
    expect(byId.get("mukaiyachi-josanjo")).toMatchObject({ yen: 515000, basis: "average" });
  });
});
