import { NextResponse } from "next/server";
import { notifyServer, verifyLink } from "@/lib/notify/server";

// POST: 確認メールのリンク先の「登録を完了する」ボタンから呼ぶ。
// リンクを開いただけ（GET）では有効にしない。メールソフトの自動の下見で勝手に登録が完了しないようにするため。
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { id?: unknown; sig?: unknown } | null;
  const s = notifyServer();
  if (!s) return NextResponse.json({ error: "通知はまだ準備中です" }, { status: 503 });
  if (!verifyLink("confirm", body?.id, body?.sig, s.linkSecret)) return NextResponse.json({ error: "リンクが正しくありません" }, { status: 400 });

  const found = await s.db.from("notification_subscriptions").select("id, email, status").eq("id", body.id).maybeSingle();
  if (!found.data) return NextResponse.json({ error: "登録が見つかりません（期限切れか、すでに取り消されています）" }, { status: 404 });
  if (found.data.status !== "active") {
    const { error } = await s.db.from("notification_subscriptions").update({ status: "active", confirmed_at: new Date().toISOString() }).eq("id", found.data.id);
    if (error) return NextResponse.json({ error: "登録を完了できませんでした" }, { status: 500 });
    // 同じアドレスの古い登録（別の端末など）は消す。最後に確認した登録だけを残し、同じ人に二重に送らない
    await s.db.from("notification_subscriptions").delete().eq("email", found.data.email).neq("id", found.data.id);
  }
  return NextResponse.json({ ok: true });
}
