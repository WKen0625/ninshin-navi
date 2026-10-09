// 助成金Navi: 対象の判定と、並べる手続きの選び方。決定的。
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { judgeItems, listBenefitSteps, matchScore, subsidyKey } from "../lib/benefit";
import { checkKey, judgeEligibility } from "../lib/eligibility";
import type { Preferences } from "../lib/family-state";
import { seed } from "../lib/seed";
import { createTestDb, readMoney, readRules, ROOT } from "./helpers/db";

const pref = (over: Partial<Preferences> = {}): Preferences => ({ epidural: "undecided", distance: "any", children: 1, ...over });

describe("対象の判定", () => {
  it("答えから鍵ごとに yes / no / unknown", () => {
    expect(checkKey("insurance_employer", pref({ insurance: "employer" }))).toBe("yes");
    expect(checkKey("insurance_employer", pref({ insurance: "national" }))).toBe("no");
    expect(checkKey("insurance_any", pref({ insurance: "none" }))).toBe("no");
    expect(checkKey("insurance_any", pref())).toBe("unknown");
    expect(checkKey("pension_national", pref({ work: "self_employed" }))).toBe("yes");
    expect(checkKey("pension_national", pref({ work: "not_working" }))).toBe("unknown");
    expect(checkKey("income_under_limit", pref({ income_limit: "over" }))).toBe("no");
    expect(checkKey("multiple", pref({ children: 2 }))).toBe("yes");
    expect(checkKey("single_parent", pref({ single_parent: true }))).toBe("yes");
  });
  it("鍵を全部満たせば対象、1つでも no なら対象外、unknown があれば要確認、鍵が無ければ対象", () => {
    expect(judgeEligibility(["work_employee", "insurance_employer"], pref({ work: "employee", insurance: "employer" })).status).toBe("eligible");
    expect(judgeEligibility(["work_employee", "insurance_employer"], pref({ work: "self_employed", insurance: "employer" })).status).toBe("not_eligible");
    expect(judgeEligibility(["work_employee"], pref()).status).toBe("check");
    expect(judgeEligibility([], pref()).status).toBe("eligible");
    expect(judgeEligibility(null, pref()).status).toBe("eligible");
  });
});

describe("並べる手続きと助成（港区）", () => {
  let rules: Awaited<ReturnType<typeof readRules>>;
  let money: Awaited<ReturnType<typeof readMoney>>;
  beforeAll(async () => {
    const { db } = await createTestDb();
    await seed(db, join(ROOT, "data"));
    rules = await readRules(db);
    money = await readMoney(db, ["13103", "13", "JP"], "13103");
  });
  const family = { region_code: "13103", due_date: "2027-04-26", confirmation_date: null, birth_date: null, held_documents: [], completed_step_ids: [], not_applicable_step_ids: [] };

  it("申請ガイドが表から読める（jsonb）", () => {
    const lumpsum = money.subsidies.find((s) => s.id === "jp.lumpsum")!;
    expect(lumpsum.apply_guide?.eligibility).toEqual(["insurance_any"]);
    expect(lumpsum.apply_guide?.documents?.[0].from).toBe("hospital");
    const s06c = rules.steps.find((s) => s.id === "jp.s06c")!;
    expect(s06c.apply_guide?.form?.from).toBe("download");
  });
  it("区が上書きした手続きは区の方だけ。お金に関わる題名のものだけ。段階では隠さない", () => {
    const ids = listBenefitSteps({ steps: rules.steps, regions: rules.regions, family }).map((s) => s.id);
    expect(ids).toContain("minato.s05");
    expect(ids).not.toContain("jp.s05");
    expect(ids).toContain("jp.s09"); // 児童手当（産後の手続きも最初から見える）
    expect(ids).toContain("jp.s06f"); // 出産手当金
    expect(ids).toContain("jp.s09d"); // 育児休業給付金
    expect(ids).not.toContain("jp.s01"); // 受診はお金の手続きではない
    expect(ids).not.toContain("jp.l02"); // 流産・死産の手続きは印が無ければ出ない
    expect(ids.some((id) => rules.steps.find((s) => s.id === id)!.requires === "multiple")).toBe(false);
  });
  it("判定: 会社員・勤務先の健保なら出産手当金は対象、自営業なら対象外。ひとり親でなければ児童扶養手当は対象外。条件つきの助成は要確認", () => {
    const steps = listBenefitSteps({ steps: rules.steps, regions: rules.regions, family });
    const byId = (p: Preferences) => new Map(judgeItems({ subsidies: money.subsidies, steps, preferences: p }).map((i) => [i.id, i.status]));
    const emp = byId(pref({ work: "employee", insurance: "employer" }));
    expect(emp.get("jp.s06f")).toBe("eligible");
    expect(emp.get("jp.s06c")).toBe("not_eligible");
    expect(emp.get("jp.jidou_fuyou")).toBe("not_eligible");
    expect(emp.get("minato.kouketsuatsu")).toBe("check");
    expect(emp.get("minato.shussanhi")).toBe("eligible");
    const self = byId(pref({ work: "self_employed", insurance: "national", single_parent: true }));
    expect(self.get("jp.s06f")).toBe("not_eligible");
    expect(self.get("jp.s06c")).toBe("eligible");
    expect(self.get("jp.jidou_fuyou")).toBe("check"); // 所得制限がわからない
    expect(byId(pref())).toBeDefined();
    expect(byId(pref()).get("jp.s06f")).toBe("check");
    // 「妊婦支援給付金（1回目）」の助成と「…を申請する」の手続きは1つにまとまる（手続きの方は出ない）。新しい制度の説明行は出ない
    const all = judgeItems({ subsidies: money.subsidies, steps, preferences: pref() });
    expect(all.some((i) => i.id === "minato.s05")).toBe(false);
    const pair = (id: string) => (all.find((i) => i.id === id) as { step: { id: string } | null }).step?.id;
    expect(pair("minato.shien_kyufu_1")).toBe("minato.s05");
    expect(pair("minato.shien_kyufu_2")).toBe("minato.s08");
    expect(all.some((i) => i.id === "minato.s08")).toBe(false);
    expect(all.some((i) => i.id === "jp.new_scheme")).toBe(false);
    expect(all.some((i) => i.id === "tokyo.s02")).toBe(false);
    expect(all.some((i) => i.id === "jp.s09")).toBe(true); // 児童手当は助成の行が無いので手続きとして出る
  });
});

describe("同じ制度を二重に出さない", () => {
  it("助成の名前の芯（地域名と括弧を落とす）", () => {
    expect(subsidyKey("東京都 無痛分娩費用助成")).toBe("無痛分娩費用助成");
    expect(subsidyKey("港区 出産費用の助成")).toBe("出産費用の助成");
    expect(subsidyKey("妊婦支援給付金（1回目）")).toBe("妊婦支援給付金");
    expect(subsidyKey("018サポート（東京都）")).toBe("018サポート");
  });
  it("1回目・2回目は取り違えない", () => {
    const s05 = { title: "妊婦支援給付金（1回目・5万円）を申請する" };
    const s08 = { title: "妊婦支援給付金（2回目・子ども1人につき5万円）を申請する" };
    expect(matchScore(s05, { name: "妊婦支援給付金（1回目）" })).toBe(2);
    expect(matchScore(s08, { name: "妊婦支援給付金（1回目）" })).toBe(0);
    expect(matchScore(s08, { name: "妊婦支援給付金（2回目）" })).toBe(2);
    expect(matchScore({ title: "東京都の無痛分娩費用助成を申請する（無痛分娩で出産した場合）" }, { name: "東京都 無痛分娩費用助成" })).toBe(1);
    expect(matchScore({ title: "児童手当を申請する" }, { name: "出産育児一時金" })).toBe(0);
  });
});
