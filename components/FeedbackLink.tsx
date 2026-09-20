"use client";

import { useState } from "react";

/** 「この情報のまちがいを知らせる」。掲示板ではなく、運営にだけ届く。名前や連絡先は聞かない。 */
export function FeedbackLink({ target, regionCode }: { target: string; regionCode: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError("");
    const res = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ region_code: regionCode, target, message }) }).catch(() => null);
    if (res?.ok) return setState("done");
    setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "送れませんでした。少し待ってからもう一度お試しください。");
    setState("idle");
  }

  if (state === "done") return <p role="status" className="text-base text-done">ありがとうございます。確認して直します。</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center text-base text-slate-500 underline decoration-slate-300 underline-offset-4">
        この情報のまちがいを知らせる
      </button>
    );
  }
  return (
    <form onSubmit={send} className="card space-y-2">
      <label className="block text-base">
        どこが、どう違いましたか（500文字まで）
        <textarea required minLength={3} maxLength={500} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="field" />
      </label>
      <p className="text-base text-gray-600">運営だけが読みます。名前・連絡先・体調のことは書かないでください。返信はできません。</p>
      {error ? <p role="alert" className="notice notice-warn">{error}</p> : null}
      <div className="flex gap-3">
        <button type="submit" disabled={state === "busy"} className="btn btn-primary">送る</button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">やめる</button>
      </div>
    </form>
  );
}
