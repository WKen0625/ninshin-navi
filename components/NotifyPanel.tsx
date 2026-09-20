"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toFamily } from "@/lib/family-state";
import { getNotifyRegistration, setNotifyRegistration, useFamilyState, useNotifyAvailable, type NotifyRegistration } from "./useFamilyState";

const field = "field";

export function NotifyPanel() {
  const { state, loaded } = useFamilyState();
  const [reg, setReg] = useState<NotifyRegistration | null>(null);
  const [status, setStatus] = useState<"none" | "pending" | "active" | "unknown">("none");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devUrl, setDevUrl] = useState("");
  const available = useNotifyAvailable();

  useEffect(() => {
    const r = getNotifyRegistration();
    setReg(r);
    if (!r) return;
    setStatus("unknown");
    fetch("/api/notifications", { headers: { "x-notify-token": r.token } })
      .then((res) => res.json())
      .then((d: { status: "none" | "pending" | "active" }) => {
        setStatus(d.status);
        if (d.status === "none") {
          setNotifyRegistration(null);
          setReg(null);
        }
      })
      .catch(() => setStatus("unknown"));
  }, []);

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!state) return;
    if (!agree) return setError("上の「お預かりするもの」を読んで、よければ「同意して登録する」にチェックを入れてください。");
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, agree: true, snapshot: toFamily(state) }),
      });
      const d = (await res.json()) as { token?: string; email?: string; error?: string; dev_confirm_url?: string };
      if (!res.ok || !d.token || !d.email) return setError(d.error ?? "登録できませんでした。少し待ってからもう一度お試しください。");
      const next = { token: d.token, email: d.email };
      setNotifyRegistration(next);
      setReg(next);
      setStatus("pending");
      setEmail("");
      setDevUrl(d.dev_confirm_url ?? "");
      setMessage(
        d.dev_confirm_url
          ? "登録を受け付けました（開発中のためメールは送っていません。下のリンクから登録を完了できます）。"
          : "確認のメールを送りました。メールの中のリンクを開いて「登録を完了する」を押すと、通知が始まります。",
      );
    } catch {
      setError("登録できませんでした。少し待ってからもう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    if (!reg) return;
    setBusy(true);
    const res = await fetch("/api/notifications", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: reg.token }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError("消せませんでした。少し待ってからもう一度押してください。");
    setNotifyRegistration(null);
    setReg(null);
    setStatus("none");
    setDevUrl("");
    setMessage("通知をやめました。メールアドレスと、預かっていた内容を消しました。");
  }

  if (!loaded || available == null) return <p className="text-base">読み込み中…</p>;
  if (!available && !reg) {
    return (
      <p className="notice notice-info">
        メールでのお知らせは、いま準備中です。始まったら、この画面から登録できるようになります。期限は「次にやること」の画面でいつでも確認できます。
      </p>
    );
  }
  if (!state) {
    return (
      <div className="space-y-4">
        <p className="text-base">先に、市区町村と出産予定日を入れてください。</p>
        <Link href="/" className="link">最初の入力へ</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {message ? <p role="status" className="notice notice-done">{message}</p> : null}
      {devUrl ? (
        <p className="notice notice-info">
          （開発中の表示）メール送信が未設定のため、確認リンクをここに出しています:{" "}
          <a href={devUrl} className="break-all underline">{devUrl}</a>
        </p>
      ) : null}

      {reg ? (
        <section className="card space-y-3">
          <h2 className="h-section">いまの登録</h2>
          <p className="text-base">
            {reg.email}：
            {status === "active" ? <span className="font-bold text-done">通知を受け取る設定になっています</span> : status === "pending" ? <span className="font-bold text-amber-800">確認メールのリンクがまだ開かれていません</span> : "確認中…"}
          </p>
          <button type="button" disabled={busy} onClick={unsubscribe} className="btn btn-ghost">
            通知をやめる（登録を消す）
          </button>
        </section>
      ) : (
        <form onSubmit={subscribe} className="card space-y-4">
          <label className="block text-base">
            メールアドレス
            <input type="email" required autoComplete="email" inputMode="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="flex min-h-11 items-start gap-3 text-base">
            <input type="checkbox" className="check mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>同意して登録する（上の「お預かりするもの」を読みました）</span>
          </label>
          {error ? <p role="alert" className="notice notice-warn">{error}</p> : null}
          <button type="submit" disabled={busy} className="btn btn-primary w-full text-lg">
            {busy ? "送っています…" : "確認メールを送る"}
          </button>
        </form>
      )}
      {reg && error ? <p role="alert" className="notice notice-warn">{error}</p> : null}
    </div>
  );
}
