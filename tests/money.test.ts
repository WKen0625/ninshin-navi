// 「お金」: 出産なびの費用 − 一時金 − 都府県・市区町村の助成 = 実負担（3つのテスト家族、世田谷区）。
// 本物の data/ を seed し、表から読んだ値で計算する。data/ を直して金額が変わったら、期待値も人が確認して直す。

import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { calculateMoney, schemesOf, type MoneyFacility } from "../lib/money";
import { addDays, expandHeldDocuments, type Family } from "../lib/next-actions";
import { seed } from "../lib/seed";
import { createTestDb, readMoney, readRules, ROOT } from "./helpers/db";

const TODAY = "2026-09-18";

let rules: Awaited<ReturnType<typeof readRules>>;
let money: Awaited<ReturnType<typeof readMoney>>;
let skeleton: Awaited<ReturnType<typeof readMoney>>;
beforeAll(async () => {
  const { db } = await createTestDb();
  await seed(db, join(ROOT, "data"));
  rules = await readRules(db);
  money = await readMoney(db, ["13112", "13", "JP"], "13112");
  skeleton = await readMoney(db, ["13", "JP"], "13104"); // 未登録の新宿区
});

const family = (over: Partial<Family>): Family => ({
  region_code: "13112",
  due_date: addDays(TODAY, 280 - 20 * 7), // 妊娠20週
  confirmation_date: "2026-06-19",
  birth_date: null,
  held_documents: [],
  completed_step_ids: [],
  not_applicable_step_ids: [],
  ...over,
});
const facility = (id: string) => money.facilities.find((f) => f.id === id)!;
const calc = (f: MoneyFacility | null, opts: { children?: number; wantsEpidural?: boolean; family?: Family; data?: typeof money } = {}) => {
  const fam = opts.family ?? family({});
  return calculateMoney({
    scheme: "lumpsum",
    facility: f,
    subsidies: (opts.data ?? money).subsidies,
    family: { ...fam, held_documents: expandHeldDocuments(fam.held_documents, rules.documents) },
    documents: rules.documents,
    children: opts.children ?? 1,
    wantsEpidural: opts.wantsEpidural ?? false,
  });
};
const ids = (lines: { subsidy: { id: string } }[]) => lines.map((l) => l.subsidy.id);

describe("妊娠20週・成育医療研究センター・無痛分娩は希望しない", () => {
  it("費用は出産なびの中央値。一時金50万円を引いた額が窓口で払う目安", () => {
    const r = calc(facility("ncchd"));
    expect(r.cost).toMatchObject({ yen: 976000, basis: "median" });
    expect(r.cost!.source.period).toBe("2025年4月〜2025年9月");
    expect(ids(r.at_counter)).toEqual(["jp.lumpsum"]);
    expect(r.pay_at_counter_yen).toBe(476000);
  });

  it("あとから受け取る: 出産費助成5万＋支援給付1回目5万＋2回目5万×1人 = 15万円。実負担の目安は32.6万円", () => {
    const r = calc(facility("ncchd"));
    expect(ids(r.cash_later)).toEqual(["setagaya.shien_kyufu_1", "setagaya.shien_kyufu_2", "setagaya.shussanhi"]);
    expect(r.cash_later_total_yen).toBe(150000);
    expect(r.net_yen).toBe(326000);
  });

  it("毎月の給付（018サポート）と条件つきの助成は一覧に出すが、計算には入れない", () => {
    const r = calc(facility("ncchd"));
    expect(ids(r.not_counted)).toEqual(["setagaya.kouketsuatsu", "tokyo.018support", "tokyo.babyfirst"]);
  });

  it("申請期限: 支援給付1回目は心拍確認日から2年、2回目は予定日＋674日。出産費助成は出産日が未入力なので日付なし", () => {
    const byId = new Map(calc(facility("ncchd")).cash_later.map((l) => [l.subsidy.id, l]));
    expect(byId.get("setagaya.shien_kyufu_1")!.deadline).toBe("2028-06-18");
    expect(byId.get("setagaya.shien_kyufu_2")!.deadline).toBe(addDays(family({}).due_date, 674));
    expect(byId.get("setagaya.shussanhi")!.deadline).toBeNull();
  });

  it("双子なら、一時金は50万円×2人。支援給付2回目は10万円", () => {
    const r = calc(facility("ncchd"), { children: 2 });
    expect(r.at_counter[0].amount_yen).toBe(1000000);
    expect(r.pay_at_counter_yen).toBe(0); // 費用97.6万円 < 一時金100万円（差額は医療保険から受け取れる、と一時金の行に書いてある）
    expect(r.cash_later.find((l) => l.subsidy.id === "setagaya.shien_kyufu_2")!.amount_yen).toBe(100000);
    expect(r.cash_later_total_yen).toBe(200000);
  });
});

describe("妊娠6週・無痛分娩を希望", () => {
  const six = family({ due_date: addDays(TODAY, 280 - 6 * 7), confirmation_date: null });

  it("都の無痛分娩助成（最大10万円）が加わる。心拍確認日が未入力なので、支援給付1回目の期限は推定", () => {
    const r = calc(facility("seijo-kinoshita"), { wantsEpidural: true, family: six });
    expect(ids(r.cash_later)).toContain("tokyo.epidural");
    expect(r.cash_later_total_yen).toBe(250000);
    expect(r.net_yen).toBe(932000 - 500000 - 250000);
    expect(r.cash_later.find((l) => l.subsidy.id === "setagaya.shien_kyufu_1")!.deadline_estimated).toBe(true);
  });

  it("都の対象医療機関の一覧に載っていない施設では、無痛分娩助成を数えない", () => {
    expect(facility("aoki-sanfujinka").tokyo_epidural_subsidy_target).toBe(false);
    const r = calc(facility("aoki-sanfujinka"), { wantsEpidural: true, family: six });
    expect(ids(r.cash_later)).not.toContain("tokyo.epidural");
    expect(r.cash_later_total_yen).toBe(150000);
  });

  it("希望しなければ、都の無痛分娩助成は出ない", () => {
    expect(ids(calc(facility("seijo-kinoshita"), { family: six }).cash_later)).not.toContain("tokyo.epidural");
  });
});

describe("出産後2週", () => {
  const born = family({ due_date: "2026-09-08", confirmation_date: "2026-01-20", birth_date: "2026-09-04" });

  it("出産日が入ると、出産費助成と無痛分娩助成の申請期限（出産日から1年）が日付で出る", () => {
    const byId = new Map(calc(facility("kugayama-hospital"), { wantsEpidural: true, family: born }).cash_later.map((l) => [l.subsidy.id, l]));
    expect(byId.get("setagaya.shussanhi")!.deadline).toBe("2027-09-04");
    expect(byId.get("tokyo.epidural")!.deadline).toBe("2027-09-04");
    expect(byId.get("setagaya.shussanhi")!.subsidy.taxable).toBe(true);
  });
});

describe("費用データと制度の扱い", () => {
  it("中央値が公表されていない施設は平均値を使い、そのことがわかる", () => {
    expect(calc(facility("mukaiyachi-josanjo")).cost).toMatchObject({ yen: 515000, basis: "average" });
  });

  it("施設を選ばなくても、助成の一覧と合計は出る（費用と実負担は出さない）", () => {
    const r = calc(null);
    expect(r.cost).toBeNull();
    expect(r.net_yen).toBeNull();
    expect(r.cash_later_total_yen).toBe(150000);
  });

  it("未登録の市区町村でも、国の一時金と都の助成は出る（設計原則4）", () => {
    const r = calc(null, { data: skeleton, wantsEpidural: true, family: family({ region_code: "13104" }) });
    expect(skeleton.facilities).toEqual([]);
    expect(ids(r.at_counter)).toEqual(["jp.lumpsum"]);
    expect(ids(r.cash_later)).toEqual(["tokyo.epidural"]);
  });

  it("新しい制度は金額が未定なので、引き算をしない。一時金も出さない（設計原則9）", () => {
    const r = calculateMoney({
      scheme: "new_scheme", facility: facility("ncchd"), subsidies: money.subsidies, family: family({}),
      documents: rules.documents, children: 1, wantsEpidural: false,
    });
    expect(r.cost).toBeNull();
    expect(r.net_yen).toBeNull();
    expect(ids(r.at_counter)).toEqual([]);
    expect(ids(r.not_counted)).toContain("jp.new_scheme");
  });

  it("施設の scheme が both なら、両方の制度を並べて計算する", () => {
    expect(schemesOf(facility("ncchd"))).toEqual(["lumpsum"]);
    expect(schemesOf({ ...facility("ncchd"), scheme: "both" })).toEqual(["lumpsum", "new_scheme"]);
    expect(schemesOf(null)).toEqual(["lumpsum"]);
  });

  it("すべての行に出典と確認日がある（設計原則3）", () => {
    const r = calc(facility("ncchd"), { wantsEpidural: true });
    for (const l of [...r.at_counter, ...r.cash_later, ...r.not_counted]) {
      expect(l.subsidy.source_url, l.subsidy.id).toMatch(/^https?:\/\//);
      expect(l.subsidy.verified_at, l.subsidy.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(r.cost!.source.source_url).toMatch(/^https:\/\/birth-navi\.mhlw\.go\.jp\//);
  });
});
