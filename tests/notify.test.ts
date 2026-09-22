// メール通知: 3つのテスト家族（世田谷区）で、何を・いつ送るかが正しいか。
// 本物の data/ を seed し、表から読んだ制度データで組み立てる。

import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { addDays } from "../lib/next-actions";
import { buildDigest, canSendNow, maskEmail, normalizeEmail, progressChanged, renderConfirmMail, renderDigestMail, validateSnapshot, type Snapshot } from "../lib/notify/digest";
import { seed } from "../lib/seed";
import { createTestDb, readRules, ROOT } from "./helpers/db";

const TODAY = "2026-09-18";
let rules: Awaited<ReturnType<typeof readRules>>;
beforeAll(async () => {
  const { db } = await createTestDb();
  await seed(db, join(ROOT, "data"));
  rules = await readRules(db);
});

const held = (...ids: string[]) => ids.map((document_id) => ({ document_id, held_at: "2026-06-01" }));
const snapshot = (over: Partial<Snapshot>): Snapshot => ({
  region_code: "13112",
  due_date: addDays(TODAY, 280 - 6 * 7),
  confirmation_date: null,
  birth_date: null,
  held_documents: held("jp.none_yet"),
  completed_step_ids: [],
  not_applicable_step_ids: [],
  ...over,
});
const digest = (s: Snapshot, opts: { today?: string; lastProgressOn?: string; nudgesSent?: number } = {}) =>
  buildDigest({ snapshot: s, today: opts.today ?? TODAY, lastProgressOn: opts.lastProgressOn ?? TODAY, nudgesSent: opts.nudgesSent ?? 0, ...rules });

const week20 = snapshot({
  due_date: addDays(TODAY, 280 - 20 * 7),
  confirmation_date: "2026-06-19",
  held_documents: held("jp.heartbeat_confirmed", "setagaya.hoken_bag", "setagaya.shien_kyufu_annai_1"),
  completed_step_ids: ["jp.s01", "jp.s02", "tokyo.s01", "setagaya.s03", "setagaya.s03b"],
  not_applicable_step_ids: ["jp.s06c", "setagaya.s06d"],
});
const born = snapshot({
  due_date: "2026-09-08",
  confirmation_date: "2026-01-20",
  birth_date: "2026-09-04",
  held_documents: held("jp.heartbeat_confirmed", "setagaya.hoken_bag", "setagaya.shien_kyufu_annai_1", "jp.hospital_receipt"),
  completed_step_ids: ["jp.s01", "jp.s02", "tokyo.s01", "setagaya.s03", "setagaya.s03b", "jp.s04", "setagaya.s05", "setagaya.s05b", "jp.s06", "jp.s06b", "setagaya.s05c"],
  not_applicable_step_ids: ["jp.s06c", "setagaya.s06d"],
});

describe("何を送るか", () => {
  it("妊娠6週・登録したばかり: 期限の近いものも催促も無いので、送らない", () => {
    expect(digest(snapshot({}))).toBeNull();
  });

  it("妊娠6週・7日間チェックが動いていない: 「いまやること」（受診）を催促する", () => {
    const d = digest(snapshot({}), { lastProgressOn: addDays(TODAY, -7) })!;
    expect(d.deadlines).toEqual([]);
    expect(d.nudge!.step.id).toBe("jp.s01");
    expect(d).toMatchObject({ gestational_week: 6, region_name: "世田谷区", after_birth: false });
  });

  it("催促は、進みが無いまま3回送ったら止める", () => {
    expect(digest(snapshot({}), { lastProgressOn: addDays(TODAY, -30), nudgesSent: 2 })).not.toBeNull();
    expect(digest(snapshot({}), { lastProgressOn: addDays(TODAY, -30), nudgesSent: 3 })).toBeNull();
  });

  it("妊娠20週: 近い期限が無いので送らない。期限の30日前になったら知らせる（1か月児健診の例）", () => {
    expect(digest(week20)).toBeNull();
    // 出産後の家族: 1か月児健診の期限は 2026-10-15。31日前はまだ入れず、30日前から入る
    const ids = (today: string) => digest(born, { today, lastProgressOn: today })?.deadlines.map((a) => a.step.id) ?? [];
    expect(ids("2026-09-14")).not.toContain("setagaya.s08d");
    expect(ids("2026-09-15")).toContain("setagaya.s08d");
  });

  it("出産後2週: 出生届（期限切れ1日）・児童手当（明日）・1か月児健診（27日後）を期限順に。1年先の助成申請はまだ入れない", () => {
    const d = digest(born)!;
    expect(d.deadlines.map((a) => [a.step.id, a.deadline])).toEqual([
      ["jp.s07", "2026-09-17"],
      ["jp.s09", "2026-09-19"],
      ["setagaya.s08d", "2026-10-15"],
    ]);
    expect(d.after_birth).toBe(true);
  });

  it("期限を15日以上過ぎたものは、もう知らせない。完了チェックを付けたものも出ない", () => {
    const ids = (s: Snapshot, today: string) => digest(s, { today, lastProgressOn: today })?.deadlines.map((a) => a.step.id) ?? [];
    expect(ids(born, "2026-10-01")).toContain("jp.s07"); // 14日過ぎ
    expect(ids(born, "2026-10-02")).not.toContain("jp.s07"); // 15日過ぎ
    expect(ids({ ...born, completed_step_ids: [...born.completed_step_ids, "jp.s07"] }, TODAY)).not.toContain("jp.s07");
  });

  it("「いまやること」が期限の一覧に入っているときは、催促として重ねて出さない", () => {
    const d = digest(born, { lastProgressOn: addDays(TODAY, -10) })!;
    expect(d.deadlines[0].step.id).toBe("jp.s07");
    expect(d.nudge).toBeNull();
  });

  it("未登録の市区町村でも、国＋都府県の手続きで通知できる（設計原則4）", () => {
    const d = digest({ ...born, region_code: "13201", held_documents: [], completed_step_ids: ["jp.s01", "jp.s02", "tokyo.s01", "jp.s06b"], not_applicable_step_ids: [] })!;
    expect(d.deadlines.map((a) => a.step.id)).toEqual(["jp.s07", "jp.s09"]);
    expect(d.region_name).toBe("");
  });
});

describe("いつ送るか（週1回まで）", () => {
  const now = new Date("2026-09-21T00:00:00Z");
  it("初回は送れる。前回から6日半たっていなければ送らない", () => {
    expect(canSendNow(null, now)).toBe(true);
    expect(canSendNow("2026-09-14T00:00:05Z", now)).toBe(true); // 先週の cron（数秒のずれ）
    expect(canSendNow("2026-09-16T00:00:00Z", now)).toBe(false);
  });
});

describe("メールの文面", () => {
  const links = { todo: "https://example.jp/todo", unsubscribe: "https://example.jp/notify/unsubscribe?id=x&sig=y" };

  it("件名に件数。各項目に期限・出典・確認日。末尾に「最終確認は窓口・医療機関へ」と通知をやめるリンク（設計原則3・10）", () => {
    const mail = renderDigestMail(digest(born)!, TODAY, links);
    expect(mail.subject).toBe("【妊娠手続きNavi】期限が近い手続きが3件あります");
    expect(mail.text).toContain("世田谷区・出産後");
    expect(mail.text).toContain("・出生届を出す\n　期限: 2026年9月17日（1日過ぎています。早めに窓口へ相談してください）");
    expect(mail.text).toContain("　期限: 2026年9月19日（あと1日）");
    expect(mail.text).toContain("出典: https://laws.e-gov.go.jp/law/322AC0000000224（確認日 2026/09/19）");
    expect(mail.text).toContain("最終確認は窓口・医療機関へ。");
    expect(mail.text).toContain(`通知をやめる（登録を消す）: ${links.unsubscribe}`);
    expect(mail.html).toContain('<a href="https://example.jp/todo">');
  });

  it("推定の期限には「推定」と書く。催促だけのメールは件名が変わる", () => {
    const d = digest({ ...week20, confirmation_date: null }, { today: "2028-06-01", lastProgressOn: "2028-06-01" })!;
    expect(renderDigestMail(d, "2028-06-01", links).text).toContain("（推定）");
    const nudge = renderDigestMail(digest(snapshot({}), { lastProgressOn: addDays(TODAY, -7) })!, TODAY, links);
    expect(nudge.subject).toBe("【妊娠手続きNavi】いまやることの確認");
    expect(nudge.text).toContain("■ いまやること（まだ完了チェックがありません）");
  });

  it("広告・製品の案内を含まない（設計原則8）", () => {
    const text = renderDigestMail(digest(born)!, TODAY, links).text + renderConfirmMail({ confirm: "https://example.jp/c" }).text;
    for (const word of ["PR", "広告", "おすすめ", "購入", "クーポン"]) expect(text).not.toContain(word);
  });
});

describe("受け取る内容の検査", () => {
  it("決めた項目だけを受け取る（名前やメモが混ざっていても捨てる）", () => {
    const s = validateSnapshot({ ...born, name: "山田花子", memo: "切迫気味", preferences: { epidural: "yes" } });
    expect(s).toEqual(born);
  });

  it.each([
    ["市区町村コードが5桁でない", { ...born, region_code: "世田谷区" }],
    ["予定日の形が違う", { ...born, due_date: "2026/09/08" }],
    ["存在しない日付", { ...born, birth_date: "2026-02-31" }],
    ["紙のidが変", { ...born, held_documents: [{ document_id: "<script>", held_at: "2026-06-01" }] }],
    ["完了チェックが配列でない", { ...born, completed_step_ids: "jp.s01" }],
    ["中身が無い", null],
  ])("受け取らない: %s", (_name, raw) => {
    expect(validateSnapshot(raw)).toBeNull();
  });

  it("メールアドレスは小文字にそろえ、形が変なら受け取らない。画面には伏せ字で出す", () => {
    expect(normalizeEmail("  Ken@Example.JP ")).toBe("ken@example.jp");
    for (const bad of ["ken", "ken@", "ken@example", "a b@example.jp", 123, null]) expect(normalizeEmail(bad)).toBeNull();
    expect(maskEmail("ken@example.jp")).toBe("k***@example.jp");
  });

  it("完了チェックが変わったときだけ、催促の回数を数え直す（紙や日付の変更では数え直さない）", () => {
    expect(progressChanged(born, { ...born, held_documents: [] })).toBe(false);
    expect(progressChanged(born, { ...born, completed_step_ids: [...born.completed_step_ids].reverse() })).toBe(false);
    expect(progressChanged(born, { ...born, completed_step_ids: [...born.completed_step_ids, "jp.s07"] })).toBe(true);
    expect(progressChanged(born, { ...born, not_applicable_step_ids: [] })).toBe(true);
  });
});

describe("表の守り（本物のスキーマ）", () => {
  it("notification_subscriptions は RLS が有効で、ポリシーが無い（公開の鍵では一切さわれない）", async () => {
    const { db } = await createTestDb();
    const rls = await db.query("select relrowsecurity from pg_class where relname = 'notification_subscriptions'");
    const policies = await db.query("select count(*)::int as n from pg_policies where tablename = 'notification_subscriptions'");
    expect(rls.rows[0].relrowsecurity).toBe(true);
    expect(policies.rows[0].n).toBe(0);
  });
});
