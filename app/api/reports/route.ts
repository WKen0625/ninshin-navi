import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAnswers, type Answers } from "@/lib/surveys";
import { isDeviceId, loadSurveys, reporterHash } from "@/lib/surveys-server";

// 記録（アンケートの回答）。ログイン不要・氏名なし・選択式のみ（設計原則5・7）。
// 保存は同意（consent）がある場合だけ。書き込みはサーバー（service_role）からだけ行い、画面は集計ビューだけを読む。

const COST_MIN_REPORTS = 3; // 金額の中央値は、3件たまるまで出さない（1〜2件だと個人の金額がそのまま見えるため）

function server() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.REPORTER_HASH_SECRET;
  if (!url || !key || !secret) return null;
  return { db: createClient(url, key, { auth: { persistSession: false } }), secret };
}

type Body = { survey_id?: unknown; device_id?: unknown; region_code?: unknown; consent?: unknown; consent_sensitive?: unknown; answers?: unknown };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  const survey = loadSurveys().find((s) => s.id === body?.survey_id);
  if (!survey) return NextResponse.json({ error: "質問が見つかりません" }, { status: 400 });
  if (body?.consent !== true) return NextResponse.json({ error: "同意がないので保存しません" }, { status: 400 });
  if (!isDeviceId(body.device_id)) return NextResponse.json({ error: "device_id が不正" }, { status: 400 });
  const region = typeof body.region_code === "string" && /^\d{5}$/.test(body.region_code) ? body.region_code : null;
  if (!region || body.answers == null || typeof body.answers !== "object") return NextResponse.json({ error: "region_code と answers が必要" }, { status: 400 });

  const s = server();
  if (!s) return NextResponse.json({ error: "保存先が未設定" }, { status: 503 });

  const facilities = await s.db.from("facilities").select("id").eq("region_code", region);
  if (facilities.error) return NextResponse.json({ error: "保存できませんでした" }, { status: 500 });
  const facilityIds = facilities.data.map((f) => f.id as string);

  const checked = validateAnswers({ survey, answers: body.answers as Answers, facilityIds, consentSensitive: body.consent_sensitive === true });
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  // 一覧にない施設は、集計のしようがないので保存しない
  if (checked.listed_facility) {
    const row = { ...checked.row, reporter_hash: reporterHash(body.device_id, s.secret) };
    const onConflict = survey.target_table === "booking_reports" ? "reporter_hash,facility_id,due_month" : "reporter_hash,birth_month";
    const { error } = await s.db.from(survey.target_table).upsert(row, { onConflict });
    if (error) return NextResponse.json({ error: "保存できませんでした" }, { status: 500 });
  }

  // 答えた人に、同じ地域の集計を返す（答えることが本人の得になる）
  if (survey.target_table === "booking_reports") {
    const stats = await s.db.from("v_booking_stats").select("*").in("facility_id", facilityIds).eq("due_month", checked.row.due_month as string);
    return NextResponse.json({ saved: checked.listed_facility, kind: "booking", stats: stats.data ?? [] }, { status: 201 });
  }
  const stats = await s.db.from("v_cost_stats").select("*").in("facility_id", facilityIds).eq("scheme", checked.row.scheme as string).gte("reports", COST_MIN_REPORTS);
  return NextResponse.json({ saved: checked.listed_facility, kind: "cost", min_reports: COST_MIN_REPORTS, stats: stats.data ?? [] }, { status: 201 });
}

// DELETE /api/reports … 同意を取り消したとき、この端末から送った記録をすべて消す。
export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { device_id?: unknown } | null;
  if (!isDeviceId(body?.device_id)) return NextResponse.json({ error: "device_id が不正" }, { status: 400 });
  const s = server();
  if (!s) return NextResponse.json({ error: "保存先が未設定" }, { status: 503 });
  const hash = reporterHash(body.device_id, s.secret);
  let deleted = 0;
  for (const table of ["booking_reports", "cost_reports", "product_reports"]) {
    const { data, error } = await s.db.from(table).delete().eq("reporter_hash", hash).select("id");
    if (error) return NextResponse.json({ error: "消せませんでした" }, { status: 500 });
    deleted += data.length;
  }
  return NextResponse.json({ deleted });
}
