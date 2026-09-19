"use client";

import { useCallback, useEffect, useState } from "react";
import { parseState, STORAGE_KEY, toFamily, type FamilyState } from "@/lib/family-state";

/** この端末のブラウザ内にだけ保存する。loaded が true になるまでは、まだ読み込み中。 */
export function useFamilyState() {
  const [state, setState] = useState<FamilyState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setState(parseState(window.localStorage.getItem(STORAGE_KEY)));
    } catch {
      // プライベートブラウズ等で読めない場合は、保存なしで動かす
    }
    setLoaded(true);

    // 別のタブで入力や完了チェックを変えたら、こちらも最新にする（古い内容で上書きしないため）
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setState(parseState(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback((next: FamilyState | null) => {
    setState(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 保存できなくても、この画面の中では動く
    }
    // メール通知を登録している人だけ、預けている内容を最新にする（登録していなければ何も送らない）
    if (next) syncNotifications(next);
  }, []);

  return { state, loaded, save };
}

const NOTIFY_KEY = "ninshin-navi:notify";

export type NotifyRegistration = { token: string; email: string };

export function getNotifyRegistration(): NotifyRegistration | null {
  try {
    const raw = JSON.parse(window.localStorage.getItem(NOTIFY_KEY) ?? "null") as Partial<NotifyRegistration> | null;
    return raw && typeof raw.token === "string" && typeof raw.email === "string" ? { token: raw.token, email: raw.email } : null;
  } catch {
    return null;
  }
}

export function setNotifyRegistration(value: NotifyRegistration | null) {
  try {
    if (value) window.localStorage.setItem(NOTIFY_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(NOTIFY_KEY);
  } catch {
    // 何もしない
  }
}

function syncNotifications(next: FamilyState) {
  const reg = getNotifyRegistration();
  if (!reg) return;
  fetch("/api/notifications", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: reg.token, snapshot: toFamily(next) }),
  })
    .then((r) => {
      if (r.status === 404) setNotifyRegistration(null); // メールのリンクから通知をやめた場合など
    })
    .catch(() => {});
}

const DEVICE_KEY = "ninshin-navi:device";

/** 記録の重複防止に使う、端末ごとのランダムなID。初めて回答するときに作る。名前やメールとは結びつかない。 */
export function getDeviceId(create: boolean): string | null {
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id && create) {
      id = crypto.randomUUID();
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function forgetDeviceId() {
  try {
    window.localStorage.removeItem(DEVICE_KEY);
  } catch {
    // 何もしない
  }
}

/** 端末の日付（YYYY-MM-DD） */
export function todayLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
