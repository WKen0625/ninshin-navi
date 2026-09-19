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
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center text-base text-gray-600 underline">
        この情報のまちがいを知らせる
      </button>
    );
  }
  return (
    <form onSubmit={send} className="space-y-2 rounded-md border border-gray-300 bg-white p-3">
      <label className="block text-base">
        どこが、どう違いましたか（500文字まで）
        <textarea required minLength={3} maxLength={500} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-400 p-2 text-base" />
      </label>
      <p className="text-base text-gray-600">運営だけが読みます。名前・連絡先・体調のことは書かないでください。返信はできません。</p>
      {error ? <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-2 text-base text-amber-800">{error}</p> : null}
      <div className="flex gap-3">
        <button type="submit" disabled={state === "busy"} className="min-h-11 rounded-md bg-blue-700 px-4 text-base font-bold text-white disabled:opacity-60">送る</button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-md border border-gray-400 bg-white px-4 text-base">やめる</button>
      </div>
    </form>
  );
}
