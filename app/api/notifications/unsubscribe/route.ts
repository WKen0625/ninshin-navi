import { NextResponse } from "next/server";
import { notifyServer, verifyLink } from "@/lib/notify/server";

// POST: メールの「通知をやめる」リンク先のボタン、またはメールソフトのワンクリック配信停止（List-Unsubscribe-Post）から呼ぶ。
// id と署名は、ボタンからは本文（JSON）、ワンクリックからはURLで届く。行ごと消す。
export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = (await request.clone().json().catch(() => null)) as { id?: unknown; sig?: unknown } | null;
  const id = body?.id ?? url.searchParams.get("id");
  const sig = body?.sig ?? url.searchParams.get("sig");
  const s = notifyServer();
  if (!s) return NextResponse.json({ error: "通知はまだ準備中です" }, { status: 503 });
  if (!verifyLink("unsubscribe", id, sig, s.linkSecret)) return NextResponse.json({ error: "リンクが正しくありません" }, { status: 400 });
  const { error } = await s.db.from("notification_subscriptions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "消せませんでした" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
