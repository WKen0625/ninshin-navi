// 「わからない」の記録と、分娩予約のアーカイブ。

import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { addBooking, bookingsFor, countBookings, parseArchive, removeBooking, type BookingRecord } from "../lib/archive";
import { clearStep, markStep, markStuck, parseState, toFamily, type FamilyState } from "../lib/family-state";
import type { Step } from "../lib/next-actions";
import { seed } from "../lib/seed";
import { sourceLabel, sourceOwner } from "../lib/source-label";
import { isStuckReason, STUCK_REASONS } from "../lib/stuck";
import { createTestDb, ROOT } from "./helpers/db";

const base: FamilyState = {
  region_code: "13103", region_name: "東京都港区", due_date: "2027-04-26", confirmation_date: null, birth_date: null,
  preferences: { epidural: "yes_24h", distance: "30min", postal_code: "1070052", facility_id: null, children: 1 },
  held_documents: [], progress: [], consent_survey: false, consent_sensitive: false, surveys_closed: [], stuck: [],
};
const step = { id: "jp.s02", produces_document_id: null } as Step;

describe("「わからない」", () => {
  it("理由つきで付く。一覧からは消えない（完了・該当しないとは別）。完了を付けると外れる", () => {
    const s = markStuck(base, "jp.s02", "where", "2026-09-23");
    expect(s.stuck).toEqual([{ step_id: "jp.s02", reason: "where", at: "2026-09-23" }]);
    expect(toFamily(s).completed_step_ids).toEqual([]);
    expect(toFamily(s).not_applicable_step_ids).toEqual([]);
    expect(markStep(s, step, "done", "2026-09-24").stuck).toEqual([]);
    expect(clearStep(s, "jp.s02").stuck).toEqual([]);
    // 押し直すと理由が入れ替わる（2件にならない）
    expect(markStuck(s, "jp.s02", "deadline", "2026-09-25").stuck).toHaveLength(1);
  });

  it("保存した値の検査: 知らない理由・壊れた行は落とす。古い保存（stuck 無し）も読める", () => {
    const raw = JSON.stringify({ ...base, stuck: [{ step_id: "jp.s02", reason: "where", at: "2026-09-23" }, { step_id: "x", reason: "nope", at: "2026-09-23" }, { reason: "other" }] });
    expect(parseState(raw)!.stuck).toEqual([{ step_id: "jp.s02", reason: "where", at: "2026-09-23" }]);
    const { stuck: _s, ...old } = base;
    expect(parseState(JSON.stringify(old))!.stuck).toEqual([]);
    expect(parseState(JSON.stringify(old))!.preferences.epidural).toBe("yes_24h");
    expect(STUCK_REASONS.map((r) => r.value).every(isStuckReason)).toBe(true);
    expect(isStuckReason("nope")).toBe(false);
  });

  it("stuck_reports は公開の鍵で読めず（RLS 有効・ポリシーなし）、集計ビューだけがある。理由は決まった値だけ", async () => {
    const { db } = await createTestDb();
    await seed(db, join(ROOT, "data"));
    const rls = await db.query("select relrowsecurity from pg_class where relname = 'stuck_reports'");
    expect(rls.rows[0].relrowsecurity).toBe(true);
    expect((await db.query("select count(*)::int as n from pg_policies where tablename = 'stuck_reports'")).rows[0].n).toBe(0);
    await db.query("insert into stuck_reports (reporter_hash, region_code, step_id, reason, gestational_week) values ('a', '13103', 'jp.s02', 'where', 9), ('b', '13103', 'jp.s02', 'where', 10), ('c', '13103', 'jp.s02', 'deadline', 8)");
    // 同じ人が押し直したら上書き
    await db.query("insert into stuck_reports (reporter_hash, region_code, step_id, reason) values ('a', '13103', 'jp.s02', 'documents') on conflict (reporter_hash, step_id) do update set reason = excluded.reason");
    const stats = await db.query("select reason, reports::int as reports from v_stuck_stats where step_id = 'jp.s02' and region_code = '13103' order by reason");
    expect(stats.rows).toEqual([{ reason: "deadline", reports: 1 }, { reason: "documents", reports: 1 }, { reason: "where", reports: 1 }]);
    await expect(db.query("insert into stuck_reports (reporter_hash, region_code, step_id, reason) values ('z', '13103', 'jp.s02', 'nope')")).rejects.toThrow();
  });
});

describe("分娩予約のアーカイブ（この端末）", () => {
  const fam = { due_date: "2027-04-26", region_code: "13103", region_name: "東京都港区" };
  const rec = (name: string, at: string, sent = true): BookingRecord => ({ at, facility_id: name, facility_name: name, answers: { result: "full" }, summary: "結果: 満枠で断られた", sent });

  it("予約を試した施設を全部残す。同じ施設に2回電話しても上書きしない。妊娠ごと（予定日ごと）にまとめる", () => {
    let a = parseArchive(null);
    a = addBooking(a, fam, rec("sanno", "2026-09-20"));
    a = addBooking(a, fam, rec("sanno", "2026-09-27", false));
    a = addBooking(a, fam, rec("jikei", "2026-09-28"));
    expect(countBookings(a)).toBe(3);
    expect(bookingsFor(a, fam.due_date, "sanno").map((b) => b.at)).toEqual(["2026-09-20", "2026-09-27"]);
    // 次の子: 前の妊娠の記録はそのまま残り、新しい妊娠が先頭
    const next = addBooking(a, { ...fam, due_date: "2029-01-10" }, rec("aiiku", "2028-06-01"));
    expect(next.pregnancies.map((p) => p.due_date)).toEqual(["2029-01-10", "2027-04-26"]);
    expect(countBookings(next)).toBe(4);
    // 消すと、その妊娠の記録が0件になれば妊娠ごと消える
    const removed = removeBooking(next, "2029-01-10", 0);
    expect(removed.pregnancies.map((p) => p.due_date)).toEqual(["2027-04-26"]);
    // 保存 → 読み込みで同じ
    expect(parseArchive(JSON.stringify(next))).toEqual(next);
    expect(parseArchive("{broken")).toEqual({ pregnancies: [] });
  });
});

describe("出典の表記", () => {
  it("URLのホストから「出典・◯◯のページへ飛ぶ」を出す", () => {
    expect(sourceOwner("https://www.city.setagaya.lg.jp/02413/1206.html")).toBe("世田谷区");
    expect(sourceOwner("https://www.city.minato.tokyo.jp/a/b.html")).toBe("港区");
    expect(sourceOwner("https://www.fukushi.metro.tokyo.lg.jp/x")).toBe("東京都");
    expect(sourceOwner("https://birth-navi.mhlw.go.jp/facility/1")).toBe("出産なび（厚生労働省）");
    expect(sourceLabel("https://www.city.setagaya.lg.jp/02413/1206.html")).toBe("出典・世田谷区のページへ飛ぶ");
    expect(sourceLabel("https://www.sannoclc.or.jp/", "出典・施設")).toBe("出典・施設のページへ飛ぶ");
    expect(sourceLabel("TODO")).toBe("出典のページへ飛ぶ");
  });
});

describe("家族の状況で出し分ける手続き（requires）", () => {
  it("双子以上・里帰り・外国籍の親のステップは、印がある家族にだけ出る", async () => {
    const { resolveNextActions } = await import("../lib/next-actions");
    const { flagsOf } = await import("../lib/family-state");
    const { seed } = await import("../lib/seed");
    const { createTestDb, readRules, ROOT } = await import("./helpers/db");
    const { join } = await import("node:path");
    const { db } = await createTestDb();
    await seed(db, join(ROOT, "data"));
    const rules = await readRules(db);
    const base = {
      region_code: "13104", due_date: "2027-01-10", confirmation_date: "2026-06-01", birth_date: null,
      held_documents: [{ document_id: "jp.heartbeat_confirmed", held_at: "2026-06-01" }, { document_id: "shinjuku.hoken_bag", held_at: "2026-06-10" }],
      completed_step_ids: [], not_applicable_step_ids: [],
    };
    const ids = (flags: ReturnType<typeof flagsOf>) => resolveNextActions({ family: { ...base, flags }, today: "2026-09-25", ...rules }).actions.map((a) => a.step.id);
    const plain = ids([]);
    expect(plain).not.toContain("shinjuku.s04m");
    expect(plain).not.toContain("jp.s06e");
    expect(plain.some((id) => rules.steps.find((s) => s.id === id)!.requires === "satogaeri")).toBe(false);
    const twins = ids(flagsOf({ epidural: "undecided", distance: "any", children: 2 }));
    expect(twins).toContain("shinjuku.s04m");
    expect(twins).toContain("jp.s06e");
    // 里帰りの払い戻しは出産後の手続きなので、出産日を入れて確かめる
    const satoFamily = { ...base, birth_date: "2026-09-20", held_documents: [...base.held_documents, { document_id: "shinjuku.kenshin_ticket", held_at: "2026-06-10" }], flags: flagsOf({ epidural: "undecided", distance: "any", satogaeri: true }) };
    const sato = resolveNextActions({ family: satoFamily, today: "2026-09-25", ...rules }).actions.map((a) => a.step.id);
    expect(sato.some((id) => rules.steps.find((s) => s.id === id)!.requires === "satogaeri")).toBe(true);
    expect(resolveNextActions({ family: { ...satoFamily, flags: [] }, today: "2026-09-25", ...rules }).actions.some((a) => a.step.requires === "satogaeri")).toBe(false);
    // 外国籍の親: 出産後に在留資格の取得（出生の日から30日以内）
    const after = resolveNextActions({ family: { ...base, birth_date: "2026-09-20", flags: ["foreign_parent"] }, today: "2026-09-25", ...rules }).actions;
    expect(after.find((a) => a.step.id === "jp.s10")?.deadline).toBe("2026-10-20");
    expect(flagsOf({ epidural: "undecided", distance: "any" })).toEqual([]);
  });
});
