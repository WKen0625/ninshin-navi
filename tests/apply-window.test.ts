// 申請期間（いつから申請できて、いつまでか）と、窓口の分別。

import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { applyWindowOf, fromText, spanText, untilText } from "../lib/apply-window";
import { classifyApplyTo } from "../lib/apply-to";
import { expandHeldDocuments, type Family } from "../lib/next-actions";
import { seed } from "../lib/seed";
import { createTestDb, readRules, ROOT } from "./helpers/db";

let rules: Awaited<ReturnType<typeof readRules>>;
beforeAll(async () => {
  const { db } = await createTestDb();
  await seed(db, join(ROOT, "data"));
  rules = await readRules(db);
});

const family = (over: Partial<Family> = {}): Family => ({
  region_code: "13103", due_date: "2026-09-08", confirmation_date: "2026-02-20", birth_date: "2026-09-04",
  held_documents: [{ document_id: "jp.heartbeat_confirmed", held_at: "2026-02-20" }, { document_id: "minato.hoken_bag", held_at: "2026-03-01" }],
  completed_step_ids: [], not_applicable_step_ids: [], ...over,
});
const step = (id: string) => rules.steps.find((s) => s.id === id)!;
const win = (id: string, f = family()) => applyWindowOf(step(id), { ...f, held_documents: expandHeldDocuments(f.held_documents, rules.documents) }, rules.documents);

describe("文章", () => {
  it("日数を「1年」「2か月」「14日」にする", () => {
    expect(spanText(365)).toBe("1年");
    expect(spanText(730)).toBe("2年");
    expect(spanText(59)).toBe("2か月");
    expect(spanText(182)).toBe("6か月");
    expect(spanText(56)).toBe("8週間");
    expect(spanText(13)).toBe("13日");
  });
  it("期限と申請できる日の文章", () => {
    expect(untilText({ deadline_base: "birth_date", deadline_offset_days: 365 })).toBe("出産した日の翌日から起算して1年以内");
    expect(untilText({ deadline_base: "gestational_week", deadline_offset_days: null, deadline_week: 32 })).toBe("妊娠32週まで");
    expect(fromText({ deadline_base: null, deadline_offset_days: null, apply_from_base: "due_date", apply_from_offset_days: -56 })).toBe("出産予定日の8週間前から");
    expect(fromText({ deadline_base: null, deadline_offset_days: null, apply_from_base: "birth_date", apply_from_offset_days: 28 })).toBe("出産した日の4週間後から");
  });
});

describe("申請期間（本物のデータ）", () => {
  it("都の無痛分娩助成: 出産した日から申請でき、期限は出産日の翌日から起算して1年以内（厳守）", () => {
    const w = win("tokyo.s02");
    expect(w.from).toEqual({ date: "2026-09-04", text: "出産した日から（無痛分娩で出産したあと）" });
    expect(w.until).toEqual({ date: "2027-09-04", text: "出産日の翌日から起算して1年以内（厳守）", estimated: false });
  });
  it("出生届: 出産した日から、出生日＋13日まで", () => {
    const w = win("jp.s07");
    expect(w.from?.date).toBe("2026-09-04");
    expect(w.until?.date).toBe("2026-09-17");
  });
  it("支援給付の2回目（予定日の8週間前から2年）: 出産予定日の8週間前から申請できる", () => {
    const s = rules.steps.find((x) => x.deadline_base === "due_date" && x.deadline_offset_days === 674);
    expect(s).toBeDefined();
    const w = win(s!.id);
    expect(w.from?.date).toBe("2026-07-14"); // 予定日 9/8 − 56日
    expect(w.until?.date).toBe("2028-07-13");
  });
  it("申請できる日がデータに無い行は、条件の紙から「◯◯を受け取ったあと」を出す", () => {
    const s = rules.steps.find((x) => !x.apply_from_base && !x.apply_from_note && x.trigger_document_id && rules.documents.find((d) => d.id === x.trigger_document_id)?.source_url);
    if (s) expect(win(s.id).from?.text).toMatch(/^「.+」を受け取ったあと$/);
    // 「まだ紙がない」のような選択肢用の紙（出典なし）からは作らない
    expect(win("jp.s01").from).toBeNull();
  });
  it("すべての手続きと助成の 98% 以上に、申請できる時期がある", () => {
    const rows = rules.steps;
    const has = rows.filter((s) => s.apply_from_base || s.apply_from_note).length;
    expect(has / rows.length).toBeGreaterThan(0.98);
  });
});

describe("窓口の分別", () => {
  it("勤務先・東京都・国・医療機関・区役所を言葉で見分ける。並記は両方", () => {
    expect(classifyApplyTo("勤務先")).toEqual(["employer"]);
    expect(classifyApplyTo("勤務先の健康保険 または 市区町村（国民健康保険）")).toEqual(["employer", "ward"]);
    expect(classifyApplyTo("都のページで確認", "13")).toEqual(["tokyo"]);
    expect(classifyApplyTo("オンライン（電子申請）", "13")).toEqual(["tokyo"]);
    expect(classifyApplyTo("東京都内の協力医療機関", "13")).toEqual(["facility"]);
    expect(classifyApplyTo("年金事務所")).toEqual(["national"]);
    expect(classifyApplyTo("医療機関", "JP")).toEqual(["facility"]);
    expect(classifyApplyTo("窓口 / 郵送 / オンライン（マイナポータル）", "13112")).toEqual(["ward"]);
    expect(classifyApplyTo("市区町村の国民年金担当窓口（郵送可）", "JP")).toEqual(["ward"]);
    expect(classifyApplyTo(null, "13112")).toEqual(["ward"]);
  });
  it("本物のデータで、東京都の行は東京都か医療機関、区の行に「東京都」は混ざらない", () => {
    for (const s of rules.steps) {
      const t = classifyApplyTo(s.channel, s.region_code);
      if (s.region_code === "13") expect(t.every((x) => x === "tokyo" || x === "facility")).toBe(true);
      if (/^131/.test(s.region_code)) expect(t).not.toContain("tokyo");
    }
  });
});
