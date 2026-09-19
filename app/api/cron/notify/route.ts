import { NextResponse } from "next/server";
import { runNotifyJob } from "@/lib/notify/server";

// 週1回（vercel.json の crons）。Vercel は Authorization: Bearer $CRON_SECRET を付けて呼ぶ。
// ?dry=1 なら送らずに件数と文面だけ返す（宛先は伏せ字）。
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET が未設定" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const dryRun = new URL(request.url).searchParams.get("dry") === "1";
  return NextResponse.json(await runNotifyJob({ dryRun }));
}
