"use client";

import { useState } from "react";
import { forgetDeviceId, getDeviceId, getNotifyRegistration, setNotifyRegistration, useFamilyState } from "./useFamilyState";

const button = "btn btn-ghost";

export function PrivacyPanel() {
  const { state, loaded, save } = useFamilyState();
  const [message, setMessage] = useState("");

  async function withdraw() {
    const deviceId = getDeviceId(false);
    if (deviceId) {
      const res = await fetch("/api/reports", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ device_id: deviceId }) }).catch(() => null);
      if (!res?.ok) return setMessage("消せませんでした。少し待ってからもう一度押してください。");
      const { deleted } = (await res.json()) as { deleted: number };
      forgetDeviceId();
      setMessage(`同意を取り消し、この端末から送った記録を${deleted}件消しました。`);
    } else {
      setMessage("同意を取り消しました。この端末から送った記録はありません。");
    }
    if (state) save({ ...state, consent_survey: false, consent_sensitive: false });
  }

  async function eraseAll() {
    // メール通知を登録していれば、サーバーで預かっている内容も一緒に消す
    const reg = getNotifyRegistration();
    if (reg) {
      const res = await fetch("/api/notifications", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: reg.token }) }).catch(() => null);
      if (!res?.ok) return setMessage("メール通知の登録を消せませんでした。少し待ってからもう一度押してください。");
      setNotifyRegistration(null);
    }
    save(null);
    setMessage(reg ? "この端末の入力と、メール通知の登録を消しました。" : "この端末に保存していた入力を消しました。");
  }

  if (!loaded) return <p className="text-base">読み込み中…</p>;
  return (
    <section className="space-y-4">
      <h2 className="h-section">いまの状態</h2>
      <ul className="list-disc space-y-1 pl-6 text-base">
        <li>この端末への入力の保存: {state ? "あり" : "なし"}</li>
        <li>記録（アンケート）への同意: {state?.consent_survey ? "同意している" : "同意していない"}</li>
        <li>分娩方法など任意項目への同意: {state?.consent_sensitive ? "同意している" : "同意していない"}</li>
      </ul>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={button} onClick={withdraw}>同意を取り消して、送った記録を消す</button>
        <button type="button" className={button} onClick={eraseAll}>この端末の入力をすべて消す</button>
      </div>
      {message ? <p role="status" className="notice notice-done">{message}</p> : null}
    </section>
  );
}
