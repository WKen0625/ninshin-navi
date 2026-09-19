import { NextResponse } from "next/server";
import { runSourceWatch } from "@/lib/source-watch/server";

// 週1回（vercel.json の crons）。出典ページを取りに行き、前回から変わっていたら人の確認待ちにする。
// Vercel は Authorization: Bearer $CRON_SECRET を付けて呼ぶ。?dry=1 なら何も書き込まない。
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET が未設定" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const dryRun = new URL(request.url).searchParams.get("dry") === "1";
  const { items, ...counts } = await runSourceWatch({ dryRun });
  return NextResponse.json({ ...counts, items: items.map(({ url, outcome }) => ({ url, outcome })) });
}
