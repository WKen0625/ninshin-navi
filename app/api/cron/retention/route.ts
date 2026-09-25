import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 月1回（vercel.json の crons）。保存期間（2年）を過ぎた「その他の紙」の自由記述と「まちがいの知らせ」を消す。
// Vercel は Authorization: Bearer $CRON_SECRET を付けて呼ぶ。手元では pnpm retention:run。
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET が未設定" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "保存先が未設定" }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("retention_run");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: data });
}
