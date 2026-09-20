"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toFamily } from "@/lib/family-state";
import { getNotifyRegistration, setNotifyRegistration, useFamilyState, useNotifyAvailable, type NotifyRegistration } from "./useFamilyState";

const field = "block min-h-11 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-base";

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
      <p className="rounded-md border border-blue-200 bg-blue-50 p-4 text-base text-info">
        メールでのお知らせは、いま準備中です。始まったら、この画面から登録できるようになります。期限は「次にやること」の画面でいつでも確認できます。
      </p>
    );
  }
  if (!state) {
    return (
      <div className="space-y-4">
        <p className="text-base">先に、市区町村と出産予定日を入れてください。</p>
        <Link href="/" className="inline-flex min-h-11 items-center text-base text-info underline">最初の入力へ</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {message ? <p role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-base text-done">{message}</p> : null}
      {devUrl ? (
        <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-base text-info">
          （開発中の表示）メール送信が未設定のため、確認リンクをここに出しています:{" "}
          <a href={devUrl} className="break-all underline">{devUrl}</a>
        </p>
      ) : null}

      {reg ? (
        <section className="space-y-3 rounded-lg border border-gray-300 p-4">
          <h2 className="text-lg font-bold">いまの登録</h2>
          <p className="text-base">
            {reg.email}：
            {status === "active" ? <span className="font-bold text-done">通知を受け取る設定になっています</span> : status === "pending" ? <span className="font-bold text-amber-800">確認メールのリンクがまだ開かれていません</span> : "確認中…"}
          </p>
          <button type="button" disabled={busy} onClick={unsubscribe} className="min-h-11 rounded-md border border-gray-400 bg-white px-4 py-2 text-base disabled:opacity-60">
            通知をやめる（登録を消す）
          </button>
        </section>
      ) : (
        <form onSubmit={subscribe} className="space-y-4 rounded-lg border border-gray-300 p-4">
          <label className="block text-base">
            メールアドレス
            <input type="email" required autoComplete="email" inputMode="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="flex min-h-11 items-start gap-3 text-base">
            <input type="checkbox" className="mt-1 size-6 shrink-0" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>同意して登録する（上の「お預かりするもの」を読みました）</span>
          </label>
          {error ? <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-base text-amber-800">{error}</p> : null}
          <button type="submit" disabled={busy} className="min-h-12 w-full rounded-md bg-blue-700 px-4 py-3 text-lg font-bold text-white disabled:opacity-60">
            {busy ? "送っています…" : "確認メールを送る"}
          </button>
        </form>
      )}
      {reg && error ? <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-base text-amber-800">{error}</p> : null}
    </div>
  );
}
