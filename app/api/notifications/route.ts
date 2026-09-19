import { NextResponse } from "next/server";
import { maskEmail, normalizeEmail, progressChanged, renderConfirmMail, validateSnapshot, type Snapshot } from "@/lib/notify/digest";
import { hashToken, isToken, linkFor, mailProviderReady, newDeviceToken, notifyServer, sendMail, todayJst } from "@/lib/notify/server";

// メール通知の登録（希望する人だけ）。ログインなし。端末が持つ合言葉（token）で本人の登録だけを更新・削除できる。

const unavailable = () => NextResponse.json({ error: "通知はまだ準備中です" }, { status: 503 });

// POST: 登録する（確認メールを送る。リンクを開くまでは pending）
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; snapshot?: unknown; agree?: unknown } | null;
  const email = normalizeEmail(body?.email);
  const snapshot = validateSnapshot(body?.snapshot);
  if (!email) return NextResponse.json({ error: "メールアドレスの形が正しくありません" }, { status: 400 });
  if (!snapshot) return NextResponse.json({ error: "入力内容を読み取れません" }, { status: 400 });
  if (body?.agree !== true) return NextResponse.json({ error: "同意がないので登録しません" }, { status: 400 });

  const s = notifyServer();
  const dev = process.env.NODE_ENV !== "production";
  if (!s || (!mailProviderReady() && !dev)) return unavailable();

  // 同じアドレスへ確認メールを連続で送らない（いたずら対策の最低限）
  const recent = await s.db.from("notification_subscriptions").select("id").eq("email", email).eq("status", "pending").gt("created_at", new Date(Date.now() - 2 * 60_000).toISOString());
  if ((recent.data?.length ?? 0) > 0) return NextResponse.json({ error: "確認メールを送ったばかりです。数分待ってからもう一度お試しください" }, { status: 429 });

  const token = newDeviceToken();
  const created = await s.db
    .from("notification_subscriptions")
    .insert({ email, token_hash: hashToken(token), snapshot, last_progress_on: todayJst() })
    .select("id")
    .single();
  if (created.error) return NextResponse.json({ error: "登録できませんでした" }, { status: 500 });

  const confirm = linkFor("confirm", created.data.id, s.linkSecret);
  const sent = await sendMail(email, renderConfirmMail({ confirm }));
  return NextResponse.json(
    // 手元の開発でメールの設定が無いときだけ、確認用のリンクを返す（本番では返さない）
    { token, email: maskEmail(email), mail_sent: sent, ...(dev && !sent ? { dev_confirm_url: confirm } : {}) },
    { status: 201 },
  );
}

// GET: いまの状態（端末の合言葉で確かめる）
export async function GET(request: Request) {
  const token = request.headers.get("x-notify-token");
  if (!isToken(token)) return NextResponse.json({ error: "token が不正" }, { status: 400 });
  const s = notifyServer();
  if (!s) return unavailable();
  const { data } = await s.db.from("notification_subscriptions").select("email, status").eq("token_hash", hashToken(token)).maybeSingle();
  if (!data) return NextResponse.json({ status: "none" });
  return NextResponse.json({ status: data.status, email: maskEmail(data.email) });
}

// PUT: 入力や完了チェックが変わったら、預けている内容を最新にする
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; snapshot?: unknown } | null;
  const snapshot = validateSnapshot(body?.snapshot);
  if (!isToken(body?.token) || !snapshot) return NextResponse.json({ error: "token と snapshot が必要" }, { status: 400 });
  const s = notifyServer();
  if (!s) return unavailable();
  const found = await s.db.from("notification_subscriptions").select("id, snapshot").eq("token_hash", hashToken(body.token)).maybeSingle();
  if (!found.data) return NextResponse.json({ status: "none" }, { status: 404 });
  const changed = progressChanged(found.data.snapshot as Snapshot, snapshot);
  const { error } = await s.db
    .from("notification_subscriptions")
    .update({ snapshot, ...(changed ? { last_progress_on: todayJst(), nudges_sent: 0 } : {}) })
    .eq("id", found.data.id);
  if (error) return NextResponse.json({ error: "更新できませんでした" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE: 通知をやめる（メールアドレスも預けた内容も、行ごと消す）
export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  if (!isToken(body?.token)) return NextResponse.json({ error: "token が不正" }, { status: 400 });
  const s = notifyServer();
  if (!s) return unavailable();
  const { data, error } = await s.db.from("notification_subscriptions").delete().eq("token_hash", hashToken(body.token)).select("id");
  if (error) return NextResponse.json({ error: "消せませんでした" }, { status: 500 });
  return NextResponse.json({ deleted: data.length });
}
