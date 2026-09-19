import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { overLimit, TOO_MANY } from "@/lib/rate-limit";

// POST /api/feedback … 「この情報のまちがいを知らせる」。ログイン不要・氏名なし。
// 掲示板ではない: ほかの利用者には見せず、人が読んで data/ のYAMLを直す材料にする。
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { region_code?: unknown; target?: unknown; message?: unknown } | null;
  const region = typeof body?.region_code === "string" && /^\d{5}$/.test(body.region_code) ? body.region_code : null;
  const target = typeof body?.target === "string" && /^(steps|subsidies|facilities|documents|screen):[\w.-]{1,80}$/.test(body.target) ? body.target : null;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 500) : "";
  if (!target || message.length < 3) return NextResponse.json({ error: "どこが違うかを、3文字以上で書いてください" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "保存先が未設定" }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false } });
  if (await overLimit(db, request, "feedback")) return NextResponse.json(TOO_MANY, { status: 429 });

  const { error } = await db.from("feedback").insert({ region_code: region, target, message });
  if (error) return NextResponse.json({ error: "送れませんでした" }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
