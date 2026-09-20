// 対象地域（東京23区）のすべての区で、3つのテスト家族の「今週やること」と「お金」が計算できるか。
// 区ごとの中身の正しさは人が確かめる（docs/research/）。ここでは、どの区でも壊れないことと、共通の決まりを守っていることを見る。

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { listFacilities } from "../lib/facilities";
import { calculateMoney } from "../lib/money";
import { addDays, expandHeldDocuments, resolveNextActions, type Family } from "../lib/next-actions";
import { seed } from "../lib/seed";
import { createTestDb, readFacilities, readMoney, readRules, ROOT } from "./helpers/db";

const TODAY = "2026-09-18";
const wards = (parse(readFileSync(join(ROOT, "data", "service-area.yaml"), "utf8")) as { municipalities: string[] }).municipalities;

let db: Awaited<ReturnType<typeof createTestDb>>["db"];
let rules: Awaited<ReturnType<typeof readRules>>;
beforeAll(async () => {
  ({ db } = await createTestDb());
  await seed(db, join(ROOT, "data"));
  rules = await readRules(db);
});

const family = (region_code: string, over: Partial<Family>): Family => ({
  region_code, due_date: addDays(TODAY, 238), confirmation_date: null, birth_date: null,
  held_documents: [{ document_id: "jp.none_yet", held_at: TODAY }], completed_step_ids: [], not_applicable_step_ids: [], ...over,
});

describe.each(wards)("区 %s", (code) => {
  const own = () => rules.documents.filter((d) => d.region_code === code);
  const bag = () => own().find((d) => d.includes.length > 0);

  it("区のファイルがあり、国→都→区の階層になる。妊娠届・支援給付1回目・2回目は区のステップが国を上書きする", () => {
    const r = resolveNextActions({ family: family(code, {}), today: TODAY, ...rules });
    expect(r.regions.map((x) => x.code)).toEqual([code, "13", "JP"]);
    const overridden = rules.steps.filter((s) => s.region_code === code).map((s) => s.overrides_step_id);
    for (const id of ["jp.s03", "jp.s05", "jp.s08"]) expect(overridden, id).toContain(id);
  });

  it("妊娠6週: 受診が Next Action。ほかの区のステップは混ざらない", () => {
    const r = resolveNextActions({ family: family(code, {}), today: TODAY, ...rules });
    expect(r.current!.step.id).toBe("jp.s01");
    expect(r.actions.every((a) => ["JP", "13", code].includes(a.step.region_code))).toBe(true);
  });

  it("妊娠20週・区の袋だけを選ぶ: 国の妊婦健診と直接支払制度の書類が出る（袋に国の紙が入っている）", () => {
    expect(bag(), "母子手帳と一緒にもらう袋").toBeDefined();
    const f = family(code, { due_date: addDays(TODAY, 140), held_documents: [{ document_id: bag()!.id, held_at: "2026-07-01" }], completed_step_ids: ["jp.s01", "jp.s02", "tokyo.s01"] });
    const ids = resolveNextActions({ family: f, today: TODAY, ...rules }).actions.map((a) => a.step.id);
    expect(ids).toContain("jp.s04");
    expect(ids).toContain("jp.s06");
    expect(ids).not.toContain("jp.s05"); // 区の支援給付が上書きしている
  });

  it("出産後2週: 出生届が Next Action。お金は、一時金と支援給付が計算に入り、金額はすべて0円以上", async () => {
    const f = family(code, { due_date: "2026-09-08", birth_date: "2026-09-04", held_documents: [{ document_id: bag()!.id, held_at: "2026-03-01" }, { document_id: "jp.hospital_receipt", held_at: "2026-09-10" }] });
    expect(resolveNextActions({ family: f, today: TODAY, ...rules }).current!.step.id).toBe("jp.s07");

    const money = await readMoney(db, [code, "13", "JP"], code);
    const facility = money.facilities.find((x) => x.costs.length > 0) ?? null;
    const r = calculateMoney({ scheme: "lumpsum", facility, subsidies: money.subsidies, family: { ...f, held_documents: expandHeldDocuments(f.held_documents, rules.documents) }, documents: rules.documents, children: 1, wantsEpidural: true });
    expect(r.at_counter.map((l) => l.subsidy.id)).toEqual(["jp.lumpsum"]);
    expect(r.cash_later.filter((l) => l.subsidy.region_code === code).length).toBeGreaterThanOrEqual(2); // 支援給付1回目・2回目
    for (const l of [...r.at_counter, ...r.cash_later]) expect(l.amount_yen ?? 0, l.subsidy.id).toBeGreaterThanOrEqual(0);
    if (facility) expect(r.net_yen).not.toBeNull();
  });

  it("病院と締切: 出産なびの施設が1件以上あり、すべてに出典がある", async () => {
    const facilities = await readFacilities(db, code);
    const items = listFacilities({ facilities, stats: [], family: family(code, {}), today: TODAY, onlyEpidural: false });
    expect(items.length).toBeGreaterThanOrEqual(1);
    for (const i of items) {
      expect(i.facility.source_url, i.facility.id).toMatch(/^https:\/\//);
      expect(i.facility.birth_navi_url, i.facility.id).toMatch(/^https:\/\/birth-navi\.mhlw\.go\.jp\//);
    }
  });

  it("区の行の出典は、すべてその区の公式サイト", () => {
    const hosts = new Set([...own(), ...rules.steps.filter((s) => s.region_code === code)].map((r) => r.source_url).filter(Boolean).map((u) => new URL(u!).host));
    expect(hosts.size).toBe(1);
    expect([...hosts][0]).toMatch(/^www\.city\.[a-z-]+\.(lg\.jp|tokyo\.jp)$/);
  });
});
