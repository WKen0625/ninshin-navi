// 入口の補助: 仮の予定日・担当の目安・共有リンク・「該当しない」の理由・入力し直しの予定
import { describe, expect, it } from "vitest";
import { reentryEvents } from "../lib/calendar";
import { estimateDueDate, isDueDateBasis } from "../lib/due-date";
import { assignStep, markStep, parseState, toFamily, type FamilyState } from "../lib/family-state";
import { nearestStation, type StationRow } from "../lib/geo";
import { decodeShare, encodeShare, shareUrl } from "../lib/share";
import { isNaReason } from "../lib/stuck";
import { suggestWho, whoOf } from "../lib/who";

const base: FamilyState = {
  region_code: "13103", region_name: "東京都港区", due_date: "2027-04-26", confirmation_date: null, birth_date: null,
  preferences: { epidural: "undecided", distance: "any", postal_code: null },
  held_documents: [{ document_id: "jp.none_yet", held_at: "2026-10-01" }], progress: [], consent_survey: false, consent_sensitive: false, surveys_closed: [], stuck: [],
};
const step = { id: "jp.s02", region_code: "JP", phase: "notification", sort_order: 1, title: "妊娠届を出す", detail: null, trigger_document_id: null, produces_document_id: null, channel: "区役所", action_url: null, deadline_base: null, deadline_offset_days: null, deadline_week: null, deadline_note: null, overrides_step_id: null, survey_question_id: null, source_url: "https://example.go.jp", verified_at: "2026-10-01", needs_review: false };

describe("仮の予定日", () => {
  it("最後の生理の開始日 +280日、検査薬の陽性日 +252日", () => {
    expect(estimateDueDate("lmp", "2026-07-20")).toBe("2027-04-26");
    expect(estimateDueDate("test", "2026-08-17")).toBe("2027-04-26");
    expect(isDueDateBasis("lmp")).toBe(true);
    expect(isDueDateBasis("x")).toBe(false);
  });
  it("保存した根拠を読み戻せる。無ければ known", () => {
    const s = parseState(JSON.stringify({ ...base, due_date_basis: "test", due_date_input: "2026-08-17" }))!;
    expect(s.due_date_basis).toBe("test");
    expect(s.due_date_input).toBe("2026-08-17");
    expect(parseState(JSON.stringify(base))!.due_date_basis).toBe("known");
  });
});

describe("流産・死産（loss）", () => {
  it("loss と日付があるときだけ家族の印に loss が付く", () => {
    expect(toFamily({ ...base, loss: true, birth_date: "2026-10-01" }).flags).toContain("loss");
    expect(toFamily({ ...base, loss: true }).flags).not.toContain("loss");
    expect(parseState(JSON.stringify({ ...base, loss: true }))!.loss).toBe(true);
  });
});

describe("担当の目安と付け替え", () => {
  it("体を伴うものは本人、出生届・扶養・児童手当はパートナー向き、ほかはどちらでも", () => {
    expect(suggestWho({ title: "妊婦健診を受ける" })).toBe("mother");
    expect(suggestWho({ title: "出生届を出す" })).toBe("partner");
    expect(suggestWho({ title: "児童手当を申請する" })).toBe("partner");
    expect(suggestWho({ title: "妊娠届を出す" })).toBe("either");
  });
  it("付け替えると assigned になり、null で目安に戻る。読み戻しでも残る", () => {
    const s = assignStep(base, "jp.s02", "partner");
    expect(whoOf(step, s.assignments)).toEqual({ who: "partner", assigned: true });
    expect(whoOf(step, assignStep(s, "jp.s02", null).assignments)).toEqual({ who: "either", assigned: false });
    expect(parseState(JSON.stringify({ ...s, assignments: { ...s.assignments, bad: "x" } }))!.assignments).toEqual({ "jp.s02": "partner" });
  });
});

describe("「該当しない」の理由", () => {
  it("理由つきで終わったものに入り、読み戻しで変な理由は落とす", () => {
    const s = markStep(base, step, "not_applicable", "2026-10-01", "na_not_employee");
    expect(s.progress[0]).toEqual({ step_id: "jp.s02", status: "not_applicable", at: "2026-10-01", reason: "na_not_employee" });
    expect(markStep(base, step, "done", "2026-10-01", "na_other").progress[0]).not.toHaveProperty("reason");
    const back = parseState(JSON.stringify({ ...s, progress: [...s.progress, { step_id: "x", status: "not_applicable", at: "2026-10-01", reason: "nope" }] }))!;
    expect(back.progress[1]).toEqual({ step_id: "x", status: "not_applicable", at: "2026-10-01" });
    expect(isNaReason("na_single")).toBe(true);
    expect(isNaReason("where")).toBe(false);
  });
});

describe("共有リンク", () => {
  it("圧縮して戻すと同じ内容。壊れた文字列は null", async () => {
    const code = await encodeShare(base);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodeShare(code)).toEqual(parseState(JSON.stringify(base)));
    expect(await decodeShare("!!!")).toBeNull();
    expect(shareUrl("https://www.tsugiraku.jp", "abc")).toBe("https://www.tsugiraku.jp/share?d=abc");
  });
});

describe("入力し直しの予定", () => {
  it("出産前は予定日に、出産後は出産日の30日後に。妊娠を終えたときは無し", () => {
    expect(reentryEvents(base).map((e) => [e.date, e.uid])).toEqual([["2027-04-26", "tsugiraku.reentry.birth"]]);
    expect(reentryEvents({ ...base, birth_date: "2027-04-20" }).map((e) => e.date)).toEqual(["2027-05-20"]);
    expect(reentryEvents({ ...base, loss: true, birth_date: "2026-10-01" })).toEqual([]);
  });
});

describe("最寄り駅の目安", () => {
  const stations: StationRow[] = [["赤坂", "千代田線", 35.6726, 139.7366], ["新橋", "山手線", 35.6661, 139.7587]];
  it("直線で最も近い駅と距離（0.1km単位）。位置が無ければ null", () => {
    expect(nearestStation({ lat: 35.6693, lng: 139.7302 }, stations)).toEqual({ name: "赤坂", km: 0.7 });
    expect(nearestStation({ lat: null, lng: null }, stations)).toBeNull();
    expect(nearestStation({ lat: 35.6, lng: 139.7 }, null)).toBeNull();
  });
});
