import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { overLimit, TOO_MANY } from "@/lib/rate-limit";
import { isStuckReason } from "@/lib/stuck";
import { isDeviceId, reporterHash } from "@/lib/surveys-server";

// POST /api/stuck … 「わからない」の記録。ログイン不要・氏名なし。同じ人が同じステップで押し直したら上書き。
// 返すのは、同じ区・同じステップの集計だけ（答えた人の得になるように）。
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { device_id?: unknown; region_code?: unknown; step_id?: unknown; reason?: unknown; gestational_week?: unknown; consent?: unknown } | null;
  if (body?.consent !== true) return NextResponse.json({ error: "同意がないので保存しません" }, { status: 400 });
  if (!isDeviceId(body.device_id)) return NextResponse.json({ error: "device_id が不正" }, { status: 400 });
  const region = typeof body.region_code === "string" && /^\d{5}$/.test(body.region_code) ? body.region_code : null;
  const stepId = typeof body.step_id === "string" && /^[\w.-]{1,80}$/.test(body.step_id) ? body.step_id : null;
  const week = Number.isInteger(body.gestational_week) && (body.gestational_week as number) >= 0 && (body.gestational_week as number) <= 45 ? (body.gestational_week as number) : null;
  if (!region || !stepId || !isStuckReason(body.reason)) return NextResponse.json({ error: "入力が足りません" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.REPORTER_HASH_SECRET;
  if (!url || !key || !secret) return NextResponse.json({ error: "保存先が未設定" }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false } });
  if (await overLimit(db, request, "stuck")) return NextResponse.json(TOO_MANY, { status: 429 });

  const { error } = await db
    .from("stuck_reports")
    .upsert({ reporter_hash: reporterHash(body.device_id, secret), region_code: region, step_id: stepId, reason: body.reason, gestational_week: week }, { onConflict: "reporter_hash,step_id" });
  if (error) return NextResponse.json({ error: "送れませんでした" }, { status: 500 });

  const stats = await db.from("v_stuck_stats").select("reason, reports").eq("step_id", stepId).eq("region_code", region);
  return NextResponse.json({ ok: true, stats: stats.data ?? [] }, { status: 201 });
}
