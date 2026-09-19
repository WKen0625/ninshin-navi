// Week 10「型の検証」: 第2の区（港区 13103）を data/ のYAMLだけで足して、4つの画面の計算が動くか。
// 港区の出産費用助成は「実費（上限81万円）− 一時金」という計算式の助成で、世田谷区（定額5万円）とは型が違う。

import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { listFacilities } from "../lib/facilities";
import { evaluateFormula, formulaError, formulaVariables } from "../lib/formula";
import { calculateMoney, type MoneyFacility } from "../lib/money";
import { addDays, expandHeldDocuments, resolveNextActions, type Family } from "../lib/next-actions";
import { buildDigest } from "../lib/notify/digest";
import { seed } from "../lib/seed";
import { createTestDb, readFacilities, readMoney, readRules, ROOT } from "./helpers/db";

const TODAY = "2026-09-18";
const MINATO = "13103";
let rules: Awaited<ReturnType<typeof readRules>>;
let money: Awaited<ReturnType<typeof readMoney>>;
let facilities: Awaited<ReturnType<typeof readFacilities>>;
beforeAll(async () => {
  const { db } = await createTestDb();
  await seed(db, join(ROOT, "data"));
  rules = await readRules(db);
  money = await readMoney(db, [MINATO, "13", "JP"], MINATO);
  facilities = await readFacilities(db, MINATO);
});

const held = (...ids: string[]) => ids.map((document_id) => ({ document_id, held_at: "2026-06-01" }));
const family = (over: Partial<Family>): Family => ({
  region_code: MINATO,
  due_date: addDays(TODAY, 280 - 6 * 7),
  confirmation_date: null,
  birth_date: null,
  held_documents: held("jp.none_yet"),
  completed_step_ids: [],
  not_applicable_step_ids: [],
  ...over,
});
const ids = (f: Family) => resolveNextActions({ family: f, today: TODAY, ...rules }).actions.map((a) => a.step.id);

describe("計算式（lib/formula.ts）", () => {
  const minato = "min(cost, 810000 + 480000 * (children - 1)) - lumpsum";
  it("港区の出産費用助成: 実費と上限の低いほうから一時金を引く", () => {
    expect(evaluateFormula(minato, { cost: 1487000, children: 1, lumpsum: 500000 })).toBe(310000); // 上限81万円 − 50万円
    expect(evaluateFormula(minato, { cost: 750000, children: 1, lumpsum: 500000 })).toBe(250000); // 実費75万円 − 50万円
    expect(evaluateFormula(minato, { cost: 1487000, children: 2, lumpsum: 1000000 })).toBe(290000); // 双子: 上限129万円 − 100万円
    expect(evaluateFormula(minato, { cost: 450000, children: 1, lumpsum: 500000 })).toBe(0); // 0円未満にはしない
  });
  it("費用がまだ無い（施設を選んでいない）ときは、計算しない", () => {
    expect(evaluateFormula(minato, { cost: null, children: 1, lumpsum: 500000 })).toBeNull();
    expect(formulaVariables(minato).sort()).toEqual(["children", "cost", "lumpsum"]);
  });
  it("これまでの式（人数×定額）もそのまま動く。演算の順序は普通の算数どおり", () => {
    expect(evaluateFormula("50000 * children", { children: 3 })).toBe(150000);
    expect(evaluateFormula("2 + 3 * 4 - max(1, 2)", {})).toBe(12);
  });
  it.each(["50000 * kids", "cost / 2", "min(cost", "alert(1)", "cost; 1", "1 2", ""])("読めない式は seed で拒否できる: %s", (src) => {
    expect(formulaError(src)).not.toBeNull();
  });
});

describe("今週やること（港区）", () => {
  it("妊娠6週: 国と都の骨格はそのまま。世田谷区のステップは1つも混ざらない", () => {
    expect(ids(family({}))).toEqual(["jp.s01", "tokyo.s01", "jp.s02", "jp.s06b"]);
  });

  it("心拍確認後は、国の妊娠届ではなく港区の妊娠届が出る", () => {
    const list = ids(family({ held_documents: held("jp.heartbeat_confirmed"), completed_step_ids: ["jp.s01"] }));
    expect(list).toContain("minato.s03");
    expect(list).not.toContain("jp.s03");
  });

  it("妊娠20週・港区の保健バッグだけを選ぶ: プレママ面談、妊婦健診、歯科健診、直接支払制度の書類が出る。国の支援給付は港区の上書きで出ない", () => {
    const f = family({
      due_date: addDays(TODAY, 140),
      confirmation_date: "2026-06-19",
      held_documents: held("jp.heartbeat_confirmed", "minato.hoken_bag"),
      completed_step_ids: ["jp.s01", "jp.s02", "tokyo.s01", "minato.s03"],
    });
    const list = ids(f);
    for (const id of ["minato.s03b", "jp.s04", "minato.s05c", "jp.s06"]) expect(list).toContain(id);
    expect(list).not.toContain("jp.s05");
    expect(list.some((id) => id.startsWith("setagaya."))).toBe(false);
    // プレママ面談は「出産後は受けられない」ので、期限は出産予定日
    const mendan = resolveNextActions({ family: f, today: TODAY, ...rules }).actions.find((a) => a.step.id === "minato.s03b")!;
    expect(mendan.deadline).toBe(f.due_date);
  });

  it("出産後2週: 出生届 → 児童手当 → 港区の出産費用助成と都の無痛分娩助成（出産から1年）", () => {
    const f = family({
      due_date: "2026-09-08",
      birth_date: "2026-09-04",
      held_documents: held("jp.heartbeat_confirmed", "minato.hoken_bag", "minato.shien_kyufu_shinsei_1", "jp.hospital_receipt"),
      completed_step_ids: ["jp.s01", "jp.s02", "tokyo.s01", "minato.s03", "minato.s03b", "jp.s04", "minato.s05", "minato.s05c", "jp.s06", "jp.s06b"],
      not_applicable_step_ids: ["jp.s06c"],
    });
    const actions = resolveNextActions({ family: f, today: TODAY, ...rules }).actions.map((a) => [a.step.id, a.deadline]);
    expect(actions.slice(0, 4)).toEqual([
      ["jp.s07", "2026-09-17"],
      ["jp.s09", "2026-09-19"],
      ["minato.s07b", "2027-09-04"],
      ["tokyo.s02", "2027-09-04"],
    ]);
    // メール通知も、コードを変えずに港区の内容になる
    const digest = buildDigest({ snapshot: f, today: TODAY, lastProgressOn: TODAY, nudgesSent: 0, ...rules })!;
    expect(digest.region_name).toBe("港区");
    expect(digest.deadlines.map((a) => a.step.id)).toEqual(["jp.s07", "jp.s09"]);
  });

  it("港区も verified ではないので「確認中」を表示する", () => {
    const r = resolveNextActions({ family: family({}), today: TODAY, ...rules });
    expect(r.regions.map((x) => x.code)).toEqual(["13103", "13", "JP"]);
    expect(r.region_unverified).toBe(true);
  });
});

describe("お金（港区）", () => {
  const calc = (f: MoneyFacility | null, children = 1) => {
    const fam = family({ due_date: addDays(TODAY, 140), confirmation_date: "2026-06-19" });
    return calculateMoney({
      scheme: "lumpsum", facility: f, subsidies: money.subsidies,
      family: { ...fam, held_documents: expandHeldDocuments(fam.held_documents, rules.documents) },
      documents: rules.documents, children, wantsEpidural: false,
    });
  };
  const facility = (id: string) => money.facilities.find((f) => f.id === id)!;
  const line = (r: ReturnType<typeof calc>, id: string) => r.cash_later.find((l) => l.subsidy.id === id)!;

  it("山王病院（中央値148.7万円）: 助成は上限の31万円。実負担の目安は 148.7 − 50 − (31 + 5 + 5) = 57.7万円", () => {
    const r = calc(facility("sanno-hospital"));
    expect(r.cost!.yen).toBe(1487000);
    expect(r.pay_at_counter_yen).toBe(987000);
    expect(line(r, "minato.shussanhi").amount_yen).toBe(310000);
    expect(r.cash_later_total_yen).toBe(410000);
    expect(r.net_yen).toBe(577000);
  });

  it("済生会中央病院（中央値75万円）: 助成は実費−一時金の25万円。実負担の目安は −10万円（受け取るほうが多い）", () => {
    const r = calc(facility("saiseikai-chuo"));
    expect(line(r, "minato.shussanhi").amount_yen).toBe(250000);
    expect(r.net_yen).toBe(750000 - 500000 - 350000);
  });

  it("施設を選ぶ前は、出産費用助成は「施設を選ぶと計算します」になり、合計には入れない", () => {
    const r = calc(null);
    expect(line(r, "minato.shussanhi")).toMatchObject({ amount_yen: null, needs_facility: true });
    expect(r.cash_later_total_yen).toBe(100000);
  });

  it("世田谷区の助成は混ざらない", () => {
    const all = calc(facility("aiiku-hospital"));
    expect([...all.at_counter, ...all.cash_later, ...all.not_counted].map((l) => l.subsidy.id).some((id) => id.startsWith("setagaya."))).toBe(false);
  });
});

describe("病院と締切（港区）", () => {
  it("出産なびの6施設が出る。予約の締切週は未確認なので、すべて「電話で確認」になる", () => {
    const items = listFacilities({ facilities, stats: [], family: family({}), today: TODAY, onlyEpidural: false });
    expect(items).toHaveLength(6);
    expect(items.every((i) => i.status === "unknown")).toBe(true);
    expect(items.every((i) => i.facility.tokyo_epidural_subsidy_target === true)).toBe(true);
  });
});
