// 完了チェック後の「任意の1問」: 回答の検査と、集計ビュー・重複防止（本物の schema.sql ＋ migrations）。

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { seed } from "../lib/seed";
import { isSupported, normalizeOptions, validateAnswers, type Survey } from "../lib/surveys";
import { createTestDb, ROOT } from "./helpers/db";

// lib/surveys-server.ts と同じ読み方（server-only のため、テストではここで読む）
type Raw = { surveys: (Omit<Survey, "fields"> & { fields: (Survey["fields"][number] & { options?: unknown[]; option_suffix?: string })[] })[] };
const surveys: Survey[] = (parse(readFileSync(join(ROOT, "data", "surveys.yaml"), "utf8")) as Raw).surveys.map((s) => ({
  ...s,
  fields: s.fields.map(({ option_suffix, options, ...f }) => ({ ...f, ...(options ? { options: normalizeOptions(options, option_suffix) } : {}) })),
}));
const booking = surveys.find((s) => s.id === "booking_result")!;
const cost = surveys.find((s) => s.id === "cost_paid")!;
const facilityIds = ["ncchd", "seijo-kinoshita"];

describe("回答の検査", () => {
  const ok = { facility_id: "ncchd", due_month: "2027-05", contacted_week: 8, result: "booked", told_deadline_week: null, deposit_yen: null, wants_epidural: true };

  it("分娩予約の回答を、表に入れる形にする（月は1日固定）", () => {
    expect(validateAnswers({ survey: booking, answers: ok, facilityIds, consentSensitive: false })).toEqual({
      ok: true,
      listed_facility: true,
      row: { facility_id: "ncchd", due_month: "2027-05-01", contacted_week: 8, result: "booked", told_deadline_week: null, deposit_yen: null, wants_epidural: true },
    });
  });

  it("施設から言われた締切と分娩予約金は、任意。選択肢にある値だけを受け取り、「言われなかった」は null", () => {
    const told = validateAnswers({ survey: booking, answers: { ...ok, told_deadline_week: 12, deposit_yen: 50000 }, facilityIds, consentSensitive: false });
    expect(told).toMatchObject({ ok: true, row: { told_deadline_week: 12, deposit_yen: 50000 } });
    const none = validateAnswers({ survey: booking, answers: { ...ok, told_deadline_week: null, deposit_yen: null }, facilityIds, consentSensitive: false });
    expect(none).toMatchObject({ ok: true, row: { told_deadline_week: null, deposit_yen: null } });
    expect(validateAnswers({ survey: booking, answers: { ...ok, told_deadline_week: 21 }, facilityIds, consentSensitive: false }).ok).toBe(false); // 選択肢に無い週
    expect(validateAnswers({ survey: booking, answers: { ...ok, deposit_yen: 12345 }, facilityIds, consentSensitive: false }).ok).toBe(false);
  });

  it("「21週以上」は 21、「答えない」は null で保存する", () => {
    const r = validateAnswers({ survey: booking, answers: { ...ok, contacted_week: 21, wants_epidural: null }, facilityIds, consentSensitive: false });
    expect(r).toMatchObject({ ok: true, row: { contacted_week: 21, wants_epidural: null } });
  });

  it.each([
    ["選択肢にない週", { ...ok, contacted_week: 3 }],
    ["選択肢にない結果", { ...ok, result: "とても良かった" }],
    ["一覧にない施設id", { ...ok, facility_id: "どこかの病院" }],
    ["月の形が違う", { ...ok, due_month: "2027/05" }],
    ["質問にない項目（自由記述など）", { ...ok, comment: "先生が親切でした" }],
    ["必須の結果が無い", { facility_id: "ncchd", due_month: "2027-05", contacted_week: 8, wants_epidural: null }],
  ])("受け取らない: %s", (_name, answers) => {
    expect(validateAnswers({ survey: booking, answers: answers as never, facilityIds, consentSensitive: false }).ok).toBe(false);
  });

  it("「一覧にない施設」は受け付けるが、保存はしない", () => {
    expect(validateAnswers({ survey: booking, answers: { ...ok, facility_id: null }, facilityIds, consentSensitive: false })).toMatchObject({ ok: true, listed_facility: false });
  });

  it("分娩方法は、任意項目に同意した人の分だけ残す（設計原則5）", () => {
    const answers = { facility_id: "ncchd", birth_month: "2026-09", scheme: "lumpsum", paid_yen: 125000, epidural: false, delivery_type: "cesarean" };
    const without = validateAnswers({ survey: cost, answers, facilityIds, consentSensitive: false });
    const withConsent = validateAnswers({ survey: cost, answers, facilityIds, consentSensitive: true });
    expect(without).toMatchObject({ ok: true, row: { paid_yen: 125000, delivery_type: null } });
    expect(withConsent).toMatchObject({ ok: true, row: { delivery_type: "cesarean" } });
  });

  it("製品の質問（段階4以降）は、まだ受け付けない", () => {
    const products = surveys.find((s) => s.id === "products_used")!;
    expect(isSupported(products)).toBe(false);
    expect(validateAnswers({ survey: products, answers: {}, facilityIds, consentSensitive: false }).ok).toBe(false);
  });

  it("steps.survey_question_id が指す質問は、すべて surveys.yaml にあり、段階1で扱えるものは2つ", () => {
    expect(surveys.filter(isSupported).map((s) => s.id)).toEqual(["booking_result", "cost_paid"]);
  });
});

describe("保存と集計（本物のスキーマ）", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];
  beforeAll(async () => {
    ({ db } = await createTestDb());
    await seed(db, join(ROOT, "data"));
  });

  const insertBooking = (hash: string, week: number, result: string, facility = "ncchd") =>
    db.query(
      `insert into booking_reports (facility_id, due_month, contacted_week, result, reporter_hash) values ($1, '2027-05-01', $2, $3, $4)
       on conflict (reporter_hash, facility_id, due_month) do update set contacted_week = excluded.contacted_week, result = excluded.result`,
      [facility, week, result, hash],
    );

  it("同じ人が同じ施設・予定月に答え直すと、増えずに上書きされる。別の施設なら別の記録", async () => {
    await insertBooking("a", 9, "full");
    await insertBooking("a", 8, "booked");
    await insertBooking("a", 7, "booked", "seijo-kinoshita");
    await insertBooking("b", 10, "booked");
    await insertBooking("c", 12, "waitlist");
    const { rows } = await db.query("select count(*)::int as n from booking_reports");
    expect(rows[0].n).toBe(4);
  });

  it("集計ビューは、予定月×施設ごとの件数と「予約できた人が電話した週」の中央値を返す", async () => {
    const { rows } = await db.query("select reports::int, booked::int, full_or_wait::int, median_week_booked::float from v_booking_stats where facility_id = 'ncchd'");
    expect(rows).toEqual([{ reports: 3, booked: 2, full_or_wait: 1, median_week_booked: 9 }]);
  });

  it("施設から言われた締切は、記録した人の数と中央値が集計に出る（言われなかった人は数えない）", async () => {
    await db.query("update booking_reports set told_deadline_week = 12, deposit_yen = 50000 where reporter_hash = 'a' and facility_id = 'ncchd'");
    await db.query("update booking_reports set told_deadline_week = 16, deposit_yen = 100000 where reporter_hash = 'b'");
    const { rows } = await db.query("select reports::int, told_reports::int, median_told_deadline_week::float, median_deposit_yen::int from v_booking_stats where facility_id = 'ncchd'");
    expect(rows).toEqual([{ reports: 3, told_reports: 2, median_told_deadline_week: 14, median_deposit_yen: 75000 }]);
  });

  it("金額の集計は、帯の中点の中央値になる", async () => {
    for (const [hash, yen] of [["a", 75000], ["b", 125000], ["c", 350000]] as const) {
      await db.query(
        "insert into cost_reports (facility_id, birth_month, scheme, paid_yen, epidural, reporter_hash) values ('ncchd', '2026-09-01', 'lumpsum', $1, false, $2)",
        [yen, hash],
      );
    }
    const { rows } = await db.query("select reports::int, median_paid_yen::int from v_cost_stats where facility_id = 'ncchd'");
    expect(rows).toEqual([{ reports: 3, median_paid_yen: 125000 }]);
  });

  it("同意を取り消すと、その人の記録だけが消える", async () => {
    await db.query("delete from booking_reports where reporter_hash = 'a'");
    const { rows } = await db.query("select reporter_hash from booking_reports order by 1");
    expect(rows.map((r) => r.reporter_hash)).toEqual(["b", "c"]);
  });
});
