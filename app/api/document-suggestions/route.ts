import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/document-suggestions … 「その他（一覧にない紙）」の自由記述を保存する（設計原則6）。
// ログイン不要・氏名なし。保存するのは地域コードと紙の名前だけ。人がレビューしてマスタに追加する。
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { region_code?: unknown; free_text?: unknown } | null;
  const region = typeof body?.region_code === "string" && /^\d{5}$/.test(body.region_code) ? body.region_code : null;
  const text = typeof body?.free_text === "string" ? body.free_text.trim().slice(0, 200) : "";
  if (!region || !text) return NextResponse.json({ error: "region_code と free_text が必要" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "保存先が未設定" }, { status: 503 });

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await db.from("document_suggestions").insert({ region_code: region, free_text: text });
  if (error) return NextResponse.json({ error: "保存できませんでした" }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
