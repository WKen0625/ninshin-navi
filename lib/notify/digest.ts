// メール通知の中身を決める純粋関数（設計原則2: 同じ入力なら同じ結果）。
// ROADMAP Week 8: 申請期限の前・完了チェックの催促。メールは週1回まで。

import { addDays, resolveNextActions, URGENT_DAYS, type DocumentDef, type Family, type NextAction, type Region, type Step } from "../next-actions";

/** 通知を希望した人から預かる内容。Family と同じ形（氏名・メール以外の個人情報は無い） */
export type Snapshot = Family;

export const DEADLINE_AHEAD_DAYS = URGENT_DAYS; // 期限の何日前から知らせるか（「今週やること」で先頭に出す基準と同じ）
export const DEADLINE_PAST_DAYS = 14; // 期限を過ぎても何日間は知らせるか
export const NUDGE_AFTER_DAYS = 7; // 完了チェックが何日動かなければ催促するか
export const MAX_NUDGES = 3; // 進みが無いまま催促する回数の上限
const MIN_INTERVAL_MS = 6.5 * 86_400_000; // 週1回まで（週次の実行時刻が少し前後しても飛ばさない）

// 2026-02-31 のような日付は、Date が黙って 3月3日 に直してしまうので、文字列に戻して同じかどうかで確かめる
const isDate = (v: unknown): v is string => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const t = Date.parse(`${v}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
};
const isId = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9_.-]{1,80}$/i.test(v);

/** 端末から届いた内容を検査する。決めた項目以外は受け取らない。 */
export function validateSnapshot(raw: unknown): Snapshot | null {
  if (raw == null || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.region_code !== "string" || !/^\d{5}$/.test(s.region_code) || !isDate(s.due_date)) return null;
  const optionalDate = (v: unknown) => (v == null ? null : isDate(v) ? v : undefined);
  const confirmation_date = optionalDate(s.confirmation_date);
  const birth_date = optionalDate(s.birth_date);
  if (confirmation_date === undefined || birth_date === undefined) return null;

  const held = Array.isArray(s.held_documents) ? s.held_documents : null;
  const done = Array.isArray(s.completed_step_ids) ? s.completed_step_ids : null;
  const na = Array.isArray(s.not_applicable_step_ids) ? s.not_applicable_step_ids : null;
  if (!held || !done || !na || held.length > 200 || done.length > 500 || na.length > 500) return null;
  if (!done.every(isId) || !na.every(isId)) return null;
  const held_documents: Snapshot["held_documents"] = [];
  for (const h of held) {
    const x = h as { document_id?: unknown; held_at?: unknown };
    if (!isId(x?.document_id) || !isDate(x?.held_at)) return null;
    held_documents.push({ document_id: x.document_id, held_at: x.held_at });
  }
  return {
    region_code: s.region_code,
    due_date: s.due_date,
    confirmation_date,
    birth_date,
    held_documents,
    completed_step_ids: done as string[],
    not_applicable_step_ids: na as string[],
  };
}

/** 完了チェックが変わったか（催促の回数を数え直すかどうかの判定） */
export function progressChanged(a: Snapshot, b: Snapshot): boolean {
  const key = (s: Snapshot) => JSON.stringify([[...s.completed_step_ids].sort(), [...s.not_applicable_step_ids].sort()]);
  return key(a) !== key(b);
}

export const normalizeEmail = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
};

export const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}***@${domain}`;
};

export type Digest = {
  gestational_week: number;
  region_name: string;
  after_birth: boolean;
  /** 期限が近い（または少し過ぎた）もの。期限順 */
  deadlines: NextAction[];
  /** 完了チェックの催促（いまやること）。期限の一覧に入っていれば重ねて出さない */
  nudge: NextAction | null;
};

export function buildDigest(input: {
  snapshot: Snapshot;
  today: string;
  /** 最後に完了チェックが変わった日（無ければ登録した日） */
  lastProgressOn: string;
  nudgesSent: number;
  regions: Region[];
  documents: DocumentDef[];
  steps: Step[];
}): Digest | null {
  const { snapshot, today, lastProgressOn, nudgesSent, regions, documents, steps } = input;
  const result = resolveNextActions({ family: snapshot, today, regions, documents, steps });

  const from = addDays(today, -DEADLINE_PAST_DAYS);
  const to = addDays(today, DEADLINE_AHEAD_DAYS);
  const deadlines = result.actions.filter((a) => a.deadline != null && a.deadline >= from && a.deadline <= to);

  const quiet = lastProgressOn <= addDays(today, -NUDGE_AFTER_DAYS);
  const current = result.current;
  const nudge = current && quiet && nudgesSent < MAX_NUDGES && !deadlines.includes(current) ? current : null;

  if (deadlines.length === 0 && !nudge) return null;
  const own = result.regions[0];
  return {
    gestational_week: result.gestational_week,
    region_name: own && own.code === snapshot.region_code ? own.name : "",
    after_birth: snapshot.birth_date != null,
    deadlines,
    nudge,
  };
}

/** 週1回まで */
export const canSendNow = (lastSentAt: string | null, now: Date) => lastSentAt == null || now.getTime() - Date.parse(lastSentAt) >= MIN_INTERVAL_MS;

const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日`;
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export type Mail = { subject: string; text: string; html: string };

/** メールの文面。すべての項目に出典と確認日を付け、末尾に「最終確認は窓口・医療機関へ」と配信停止の方法を必ず入れる。広告は入れない。 */
export function renderDigestMail(digest: Digest, today: string, links: { todo: string; unsubscribe: string }): Mail {
  const subject =
    digest.deadlines.length > 0
      ? `【妊娠手続きナビ】期限が近い手続きが${digest.deadlines.length}件あります`
      : "【妊娠手続きナビ】いまやることの確認";

  const item = (a: NextAction, withDeadline: boolean) => {
    const lines = [`・${a.step.title}`];
    if (withDeadline && a.deadline) {
      const left = daysBetween(a.deadline, today);
      const when = left > 0 ? `あと${left}日` : left === 0 ? "今日まで" : `${-left}日過ぎています。早めに窓口へ相談してください`;
      lines.push(`　期限: ${fmt(a.deadline)}${a.deadline_estimated ? "（推定）" : ""}（${when}）`);
    }
    if (a.step.deadline_note) lines.push(`　${a.step.deadline_note}`);
    if (a.step.channel) lines.push(`　どこで: ${a.step.channel}`);
    const source = /^https?:\/\//.test(a.step.source_url) ? a.step.source_url : "確認中";
    lines.push(`　出典: ${source}（確認日 ${a.step.verified_at.replaceAll("-", "/")}）${a.needs_review ? "　※内容を確認中" : ""}`);
    return lines.join("\n");
  };

  const head = `${digest.region_name}${digest.region_name ? "・" : ""}${digest.after_birth ? "出産後" : `いま妊娠${digest.gestational_week}週`}`;
  const parts = [head, ""];
  if (digest.deadlines.length > 0) parts.push("■ 期限が近いもの", ...digest.deadlines.map((a) => item(a, true)), "");
  if (digest.nudge) parts.push("■ いまやること（まだ完了チェックがありません）", item(digest.nudge, false), "終わっていたら、サイトで「完了した」を押してください。自分に関係なければ「自分は該当しない」を押すと出なくなります。", "");
  parts.push(`つづきはこちら: ${links.todo}`, "", "――", "最終確認は窓口・医療機関へ。", "このメールは、通知を希望した方に週1回までお送りしています。", `通知をやめる（登録を消す）: ${links.unsubscribe}`);
  const text = parts.join("\n");

  const html = `<div style="font-size:16px;line-height:1.7;color:#1f2937">${escapeHtml(text)
    .replace(/(https?:\/\/[^\s（）]+)/g, '<a href="$1">$1</a>')
    .replace(/\n/g, "<br>")}</div>`;
  return { subject, text, html };
}

export function renderConfirmMail(links: { confirm: string }): Mail {
  const text = [
    "妊娠手続きナビの「メール通知」の登録を受け付けました。",
    "下のリンクを開いて「登録を完了する」を押すと、通知が始まります。",
    "",
    links.confirm,
    "",
    "心当たりがない場合は、このメールを無視してください。7日後に自動で消えます。",
    "――",
    "通知は週1回までです。申請の期限が近いときと、完了チェックがしばらく無いときにお送りします。",
  ].join("\n");
  const html = `<div style="font-size:16px;line-height:1.7;color:#1f2937">${escapeHtml(text)
    .replace(/(https?:\/\/[^\s（）]+)/g, '<a href="$1">$1</a>')
    .replace(/\n/g, "<br>")}</div>`;
  return { subject: "【妊娠手続きナビ】メール通知の登録を完了してください", text, html };
}
