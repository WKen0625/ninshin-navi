import { NextResponse } from "next/server";
import { mailProviderReady, notifyServer } from "@/lib/notify/server";

// GET … メール通知を受け付けられる状態か（メール送信の設定が済んでいるか）。画面が、準備中のあいだは入口を出さないために使う。
export const dynamic = "force-dynamic";

export async function GET() {
  const dev = process.env.NODE_ENV !== "production";
  return NextResponse.json({ available: notifyServer() != null && (mailProviderReady() || dev) });
}
