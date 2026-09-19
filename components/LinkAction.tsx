"use client";

import Link from "next/link";
import { useState } from "react";
import { setNotifyRegistration } from "./useFamilyState";

/** メールのリンク先。リンクを開いただけでは何もせず、ボタンを押したときだけ実行する（メールソフトの自動の下見で誤作動しないように）。 */
export function LinkAction({ purpose, id, sig }: { purpose: "confirm" | "unsubscribe"; id: string; sig: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const confirm = purpose === "confirm";

  async function run() {
    setState("busy");
    const res = await fetch(`/api/notifications/${purpose}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, sig }) }).catch(() => null);
    if (res?.ok) {
      if (!confirm) setNotifyRegistration(null);
      return setState("done");
    }
    setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "うまくいきませんでした。少し待ってからもう一度お試しください。");
    setState("error");
  }

  if (state === "done") {
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-base text-done">
          {confirm ? "登録が完了しました。申請の期限が近いときなどに、週1回までメールでお知らせします。" : "通知をやめました。メールアドレスと、預かっていた内容を消しました。"}
        </p>
        <Link href="/todo" className="inline-flex min-h-11 items-center text-base text-info underline">今週やることを見る</Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {state === "error" ? <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-base text-amber-800">{error}</p> : null}
      <button type="button" onClick={run} disabled={state === "busy"} className="min-h-12 w-full rounded-md bg-blue-700 px-4 py-3 text-lg font-bold text-white disabled:opacity-60">
        {state === "busy" ? "処理しています…" : confirm ? "登録を完了する" : "通知をやめる（登録を消す）"}
      </button>
    </div>
  );
}
