// 3つのテスト家族（CLAUDE.md §9-5）: 妊娠6週・妊娠20週・出産後2週、いずれも世田谷区。
// 本物の data/ を本物の schema.sql に seed し、表から読んだデータで解決する（画面と同じ経路）。
// data/ を直して期待値が変わったら、このテストの期待値も人が確認して直す。

import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { addDays, resolveNextActions, type Family } from "../lib/next-actions";
import { seed } from "../lib/seed";
import { createTestDb, readRules, ROOT } from "./helpers/db";

const TODAY = "2026-09-18";
const SETAGAYA = "13112";

/** 今日ちょうど妊娠 week 週0日になる出産予定日 */
const dueDateAtWeek = (week: number) => addDays(TODAY, 280 - week * 7);
const held = (...ids: string[]) => ids.map((document_id) => ({ document_id, held_at: "2026-06-01" }));

let rules: Awaited<ReturnType<typeof readRules>>;
beforeAll(async () => {
  const { db } = await createTestDb();
  await seed(db, join(ROOT, "data"));
  rules = await readRules(db);
});

const resolve = (family: Family) => resolveNextActions({ family, today: TODAY, ...rules });
const summary = (family: Family) => resolve(family).actions.map((a) => [a.step.id, a.deadline]);

describe("家族A: 妊娠6週・陽性判定のみ・心拍確認はまだ", () => {
  const family: Family = {
    region_code: SETAGAYA,
    due_date: dueDateAtWeek(6), // 2027-05-14
    confirmation_date: null,
    birth_date: null,
    held_documents: held("jp.none_yet"),
    completed_step_ids: [],
    not_applicable_step_ids: [],
  };

  it("妊娠6週と計算される", () => {
    expect(family.due_date).toBe("2027-05-14");
    expect(resolve(family).gestational_week).toBe(6);
  });

  it("受診 → 都の対象医療機関の確認 → 分娩予約 が先頭に並ぶ", () => {
    expect(summary(family)).toEqual([
      ["jp.s01", null], // 産婦人科で心拍確認
      ["tokyo.s01", null], // 無痛希望なら都の対象医療機関から選ぶ
      ["jp.s02", null], // 分娩予約（期限は施設ごと）
      ["jp.s06b", null], // （会社員など）産休中の社会保険料免除を勤務先に確認。紙が不要なので最初から「このあと」に出る
    ]);
  });

  it("出産前なので、出生届・児童手当など出産後の段階は出ない", () => {
    const phases = resolve(family).actions.map((a) => a.step.phase);
    expect(phases).not.toContain("birth");
    expect(phases).not.toContain("postpartum");
  });

  it("母子手帳が前提のステップは出ない", () => {
    const ids = resolve(family).actions.map((a) => a.step.id);
    for (const id of ["setagaya.s03", "setagaya.s03b", "setagaya.s05", "jp.s04", "jp.s06", "jp.s06c", "setagaya.s06d"]) expect(ids).not.toContain(id);
  });

  it("分娩予約の期限は日付ではなく「施設ごと」の注記", () => {
    const booking = resolve(family).actions.find((a) => a.step.id === "jp.s02")!;
    expect(booking.step.deadline_base).toBe("facility");
    expect(booking.step.deadline_note).toContain("施設ごと");
    expect(booking.step.survey_question_id).toBe("booking_result");
  });

  it("心拍を確認したら、国ではなく世田谷区の妊娠届ステップが出る", () => {
    const next = { ...family, held_documents: held("jp.heartbeat_confirmed"), completed_step_ids: ["jp.s01"] };
    const ids = resolve(next).actions.map((a) => a.step.id);
    expect(ids).toContain("setagaya.s03");
    expect(ids).not.toContain("jp.s03");
  });
});

describe("家族B: 妊娠20週・保健バッグ受取済み・ネウボラ面接まで完了", () => {
  const family: Family = {
    region_code: SETAGAYA,
    due_date: dueDateAtWeek(20), // 2027-02-05
    confirmation_date: "2026-06-19", // 妊娠7週で心拍確認
    birth_date: null,
    // 母子手帳・受診票は選ばず、保健バッグだけを選ぶ（中身は documents.includes で補われる）
    held_documents: held("jp.heartbeat_confirmed", "setagaya.hoken_bag", "setagaya.shien_kyufu_annai_1"),
    completed_step_ids: ["jp.s01", "jp.s02", "tokyo.s01", "setagaya.s03", "setagaya.s03b"],
    not_applicable_step_ids: ["jp.s06c", "setagaya.s06d"], // 会社員なので、国民年金・国保の免除は該当しない
  };

  it("妊娠20週と計算される", () => {
    expect(family.due_date).toBe("2027-02-05");
    expect(resolve(family).gestational_week).toBe(20);
  });

  it("期限が30日より先のものは先頭に出さず、手続きの流れの順（sort_order）で並ぶ", () => {
    expect(summary(family)).toEqual([
      ["jp.s04", null], // 妊婦健診
      ["setagaya.s05", "2028-06-18"], // 支援給付1回目（心拍確認日 2026-06-19 ＋ 730日。ずっと先なので流れの順）
      ["setagaya.s05b", "2026-11-13"], // 8か月時アンケート（LMP 2026-05-01 ＋ 28週。56日先）
      ["setagaya.s05c", null], // 産前の歯科健診（受診券は保健バッグの中）
      ["jp.s06", null], // 直接支払制度の書類（施設ごと）
      ["jp.s06b", null], // 産休中の健康保険・厚生年金の免除（会社員など）
    ]);
    expect(resolve(family).actions.every((a) => a.reason === "flow")).toBe(true);
    expect(resolve(family).current!.step.id).toBe("jp.s04");
  });

  it("8か月時アンケートは、期限の30日前になると先頭（Next Action）に上がる", () => {
    const at = (today: string) => resolveNextActions({ family, today, ...rules }).current!;
    expect(at("2026-10-13").step.id).toBe("jp.s04"); // 31日前
    expect(at("2026-10-14")).toMatchObject({ step: { id: "setagaya.s05b" }, reason: "deadline_soon", deadline: "2026-11-13" }); // 30日前
    expect(at("2026-11-14")).toMatchObject({ step: { id: "setagaya.s05b" }, reason: "overdue" }); // 期限の翌日
  });

  it("保健バッグだけを選んでも、中の母子手帳・受診票が条件のステップが出る", () => {
    const ids = resolve(family).actions.map((a) => a.step.id);
    for (const id of ["jp.s04", "jp.s06", "setagaya.s05c"]) expect(ids).toContain(id);
  });

  it("「自分は該当しない」を付けたステップは出ない。外せばまた出る", () => {
    const ids = resolve(family).actions.map((a) => a.step.id);
    expect(ids).not.toContain("jp.s06c");
    expect(ids).not.toContain("setagaya.s06d");
    const undone = resolve({ ...family, not_applicable_step_ids: [] }).actions.map((a) => a.step.id);
    expect(undone).toContain("jp.s06c");
    expect(undone).toContain("setagaya.s06d");
  });

  it("領収書を先に持っていても、出生日を入れるまで出産後の助成申請は出ない", () => {
    const early = { ...family, held_documents: [...family.held_documents, ...held("jp.hospital_receipt")] };
    expect(summary(early)).toEqual(summary(family));
  });

  it("国の jp.s05 は、母子手帳を持っていても世田谷区の上書きにより出ない", () => {
    expect(resolve(family).actions.map((a) => a.step.id)).not.toContain("jp.s05");
  });

  it("心拍確認日が未入力なら LMP＋49日 で推定し、推定と印を付ける", () => {
    const a = resolve({ ...family, confirmation_date: null }).actions.find((x) => x.step.id === "setagaya.s05")!;
    expect(a.deadline).toBe("2028-06-18"); // 2026-05-01 ＋ 49日 ＋ 730日
    expect(a.deadline_estimated).toBe(true);
    const b = resolve(family).actions.find((x) => x.step.id === "setagaya.s05")!;
    expect(b.deadline_estimated).toBe(false);
  });
});

describe("家族C: 出産後2週・領収書あり・赤ちゃん訪問はまだ", () => {
  const family: Family = {
    region_code: SETAGAYA,
    due_date: "2026-09-08",
    confirmation_date: "2026-01-20",
    birth_date: "2026-09-04", // 今日の14日前
    held_documents: held(
      "jp.heartbeat_confirmed",
      "setagaya.hoken_bag",
      "jp.boshi_techo",
      "jp.kenshin_ticket",
      "setagaya.shien_kyufu_annai_1",
      "jp.hospital_receipt",
    ),
    completed_step_ids: [
      "jp.s01", "jp.s02", "tokyo.s01", "setagaya.s03", "setagaya.s03b",
      "jp.s04", "setagaya.s05", "setagaya.s05b", "jp.s06",
      "jp.s06b", "setagaya.s05c",
    ],
    not_applicable_step_ids: ["jp.s06c", "setagaya.s06d"],
  };

  it("期限切れ・期限が近いものが期限順で先頭。そのあとは手続きの流れの順", () => {
    expect(resolve(family).actions.map((a) => [a.step.id, a.deadline, a.reason])).toEqual([
      ["jp.s07", "2026-09-17", "overdue"], // 出生届: 出生日を1日目として14日以内 = 出生日＋13日。昨日が期限
      ["jp.s09", "2026-09-19", "deadline_soon"], // 児童手当: 出生の日の翌日から15日以内
      ["setagaya.s08d", "2026-10-15", "deadline_soon"], // 1か月児健診: 生後41日まで（27日後）
      ["setagaya.s08c", null, "flow"], // 新生児聴覚検査（sort_order 71）
      ["setagaya.s07b", "2027-09-04", "flow"], // 区の出産費助成（出産から1年。まだ先なので流れの順）
      ["tokyo.s02", "2027-09-04", "flow"], // 都の無痛分娩助成
      ["setagaya.s08b", null, "flow"], // 産婦健診
      ["tokyo.s03", null, "flow"], // 都の赤ちゃんファースト＋018サポート
      ["jp.s09b", null, "flow"], // 子どもの健康保険
      ["jp.s09c", null, "flow"], // 育休中の社会保険料免除
    ]);
  });

  it("出産後は、妊娠中にしかできない手続き（妊婦健診・8か月時アンケート）を、未完了でも出さない", () => {
    const notDone = { ...family, completed_step_ids: family.completed_step_ids.filter((id) => !["jp.s04", "setagaya.s05b"].includes(id)) };
    const ids = resolve(notDone).actions.map((a) => a.step.id);
    expect(ids).not.toContain("jp.s04");
    expect(ids).not.toContain("setagaya.s05b");
    expect(resolve(notDone).current!.step.id).toBe("jp.s07");
    // 出産後も申請できるもの（支援給付1回目: 心拍確認日から2年）は、未完了なら残る
    const s05 = { ...family, completed_step_ids: family.completed_step_ids.filter((id) => id !== "setagaya.s05") };
    expect(resolve(s05).actions.map((a) => a.step.id)).toContain("setagaya.s05");
  });

  it("支援給付2回目は、赤ちゃん訪問の案内を受け取ってから出る（国の jp.s08 は出ない）", () => {
    expect(resolve(family).actions.map((a) => a.step.id)).not.toContain("setagaya.s08");
    const after = { ...family, held_documents: [...family.held_documents, ...held("setagaya.akachan_homon_annai")] };
    const a = resolve(after).actions.find((x) => x.step.id === "setagaya.s08")!;
    expect(a.deadline).toBe("2028-07-13"); // 予定日 2026-09-08 ＋ 674日
    expect(resolve(after).actions.map((x) => x.step.id)).not.toContain("jp.s08");
  });

  it("出典が未確定のステップには「確認中」の印が付く", () => {
    const byId = new Map(resolve(family).actions.map((a) => [a.step.id, a]));
    expect(byId.get("jp.s09b")!.needs_review).toBe(true); // 出典が TODO のまま
    expect(byId.get("jp.s07")!.needs_review).toBe(false);
  });

  it("完了チェック後の1問は cost_paid", () => {
    const byId = new Map(resolve(family).actions.map((a) => [a.step.id, a]));
    expect(byId.get("setagaya.s07b")!.step.survey_question_id).toBe("cost_paid");
  });
});

describe("全家族に共通", () => {
  const base: Family = {
    region_code: SETAGAYA,
    due_date: dueDateAtWeek(6),
    confirmation_date: null,
    birth_date: null,
    held_documents: held("jp.none_yet"),
    completed_step_ids: [],
    not_applicable_step_ids: [],
  };

  it("すべての行に出典と確認日がある（設計原則3）", () => {
    for (const a of resolve(base).actions) {
      expect(a.step.source_url, a.step.id).toBeTruthy();
      expect(a.step.verified_at, a.step.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("世田谷区は verified ではないので「確認中」を表示する", () => {
    const r = resolve(base);
    expect(r.regions.map((x) => x.code)).toEqual(["13112", "13", "JP"]);
    expect(r.region_unverified).toBe(true);
  });

  it("未登録の市区町村（八王子市 13201）でも、国＋東京都の骨格は出る（設計原則4）", () => {
    const r = resolve({ ...base, region_code: "13201" });
    expect(r.regions.map((x) => x.code)).toEqual(["13", "JP"]);
    expect(r.region_unverified).toBe(true);
    expect(r.actions.map((a) => a.step.id)).toEqual(["jp.s01", "tokyo.s01", "jp.s02", "jp.s06b"]);
  });

  it("未登録の市区町村でも、出産後は国の出産後ステップが出る", () => {
    const r = resolve({ ...base, region_code: "13201", birth_date: "2026-09-04", completed_step_ids: ["jp.s01", "jp.s02", "tokyo.s01", "jp.s06b"] });
    expect(r.actions.map((a) => a.step.id)).toEqual(["jp.s07", "jp.s09", "jp.s08", "tokyo.s03", "jp.s09b", "jp.s09c"]);
  });

  it("未登録の道府県（札幌市 01100）でも、国の骨格は出る", () => {
    const r = resolve({ ...base, region_code: "01100" });
    expect(r.regions.map((x) => x.code)).toEqual(["JP"]);
    expect(r.actions.map((a) => a.step.id)).toEqual(["jp.s01", "jp.s02", "jp.s06b"]);
  });

  it("いまやることは1件だけ。完了すると次の1件に進む（One by One）", () => {
    const first = resolve(base);
    expect(first.current!.step.id).toBe("jp.s01");
    expect(first.upcoming.map((a) => a.step.id)).toEqual(["tokyo.s01", "jp.s02", "jp.s06b"]);

    const second = resolve({ ...base, completed_step_ids: ["jp.s01"] });
    expect(second.current!.step.id).toBe("tokyo.s01");
    expect(second.upcoming.map((a) => a.step.id)).toEqual(["jp.s02", "jp.s06b"]);

    // 「このあと」を先に完了してもよい（順番を強制しない）
    const skipAhead = resolve({ ...base, completed_step_ids: ["jp.s02"] });
    expect(skipAhead.current!.step.id).toBe("jp.s01");

    const done = resolve({ ...base, completed_step_ids: ["jp.s01", "tokyo.s01", "jp.s02", "jp.s06b"] });
    expect(done.current).toBeNull();
    expect(done.upcoming).toEqual([]);
  });

  it("同じ入力なら何度でも同じ結果（決定的）", () => {
    const shuffled = { ...rules, steps: [...rules.steps].reverse() };
    expect(resolveNextActions({ family: base, today: TODAY, ...shuffled })).toEqual(resolve(base));
  });
});
