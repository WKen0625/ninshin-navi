// カレンダー連携: ログインなしでできる2通り。
//  1) Googleカレンダーの「予定を作る」リンク（1件ずつ。押すと本人のGoogleカレンダーに予定の下書きが開く）
//  2) .ics ファイル（まとめて。Google・iPhone・Outlook どれでも読み込める。期限の7日前に通知の印をつける）
// どちらも、こちらのサーバーには何も送らない。本人の端末からカレンダーへ直接渡す（設計原則: 名前もログインも要らない）。

import type { ApplyWindow } from "./apply-window";

export type CalendarEvent = {
  /** 予定の名前 */
  title: string;
  /** 終日の予定。YYYY-MM-DD */
  date: string;
  /** 予定のメモ（やり方・窓口・出典） */
  details?: string;
  /** 出典や手続きのページ */
  url?: string;
  /** 何日前に知らせるか（.ics の VALARM）。省略は7日前 */
  remindDaysBefore?: number;
  /** 同じ予定を二度入れないための印（step.id など） */
  uid: string;
};

const compact = (d: string) => d.replaceAll("-", "");

/** 翌日（終日の予定は終わりの日を「次の日」で表す決まり） */
export function nextDay(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day + 1)).toISOString().slice(0, 10);
}

/** Googleカレンダーに予定を作るリンク（終日）。本人がボタンを押して保存するまで、何も登録されない */
export function googleCalendarUrl(e: CalendarEvent): string {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${compact(e.date)}/${compact(nextDay(e.date))}`,
    details: [e.details, e.url].filter(Boolean).join("\n"),
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** .ics の文字の決まり: 改行は \n、カンマとセミコロンとバックスラッシュは \ でエスケープ */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\;");

/** 1行は75バイトまで。超えたら「改行＋空白」で折り返す（文字の途中で切らない） */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // 2行目からは先頭の空白が1バイト
    if (bytes + n > limit) {
      out.push(cur);
      cur = ch;
      bytes = n;
    } else {
      cur += ch;
      bytes += n;
    }
  }
  out.push(cur);
  return out.join("\r\n ");
}

/** まとめて読み込める .ics。stamp は決定的なテスト用（省略は今） */
export function icsOf(events: CalendarEvent[], stamp = new Date()): string {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tsugiraku//Navi//JA", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Tsugiraku Navi"];
  for (const e of events) {
    const days = e.remindDaysBefore ?? 7;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${esc(e.uid)}@tsugiraku.jp`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${compact(e.date)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(e.date))}`,
      `SUMMARY:${esc(e.title)}`,
    );
    if (e.details) lines.push(`DESCRIPTION:${esc(e.details)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (days > 0) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, `TRIGGER:-P${days}D`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/**
 * 手続き1件をカレンダーの予定にする。期限の日があれば「【期限】題名」、無ければ申請できる日があれば「【申請できる】題名」。どちらも無ければ null。
 */
export function eventOfStep(
  step: { id: string; title: string; detail: string | null; channel: string | null; source_url: string; action_url?: string | null },
  window: ApplyWindow,
  regionName?: string,
): CalendarEvent | null {
  const memo = [step.detail, step.channel ? `窓口: ${step.channel}` : null, regionName ? `地域: ${regionName}` : null, "Tsugiraku Navi（最終確認は窓口へ）"].filter(Boolean).join("\n");
  if (window.until?.date) {
    return {
      uid: `${step.id}.until`,
      title: `【期限${window.until.estimated ? "・推定" : ""}】${step.title}`,
      date: window.until.date,
      details: [window.until.text ? `期限: ${window.until.text}` : null, memo].filter(Boolean).join("\n"),
      url: step.action_url ?? step.source_url,
      remindDaysBefore: 7,
    };
  }
  if (window.from?.date) {
    return {
      uid: `${step.id}.from`,
      title: `【申請できる】${step.title}`,
      date: window.from.date,
      details: [window.from.text ? `申請可能な時期: ${window.from.text}` : null, memo].filter(Boolean).join("\n"),
      url: step.action_url ?? step.source_url,
      remindDaysBefore: 0,
    };
  }
  return null;
}

/**
 * 「入力を直す」時期の予定（使い続ける動機）。出産予定日に「出産したら出産日を入れる」、出産後30日に「届いた紙を足す」。
 * 妊娠を終えた（loss）ときは出さない。
 */
export function reentryEvents(state: { due_date: string; birth_date: string | null; loss?: boolean }, origin = "https://www.tsugiraku.jp"): CalendarEvent[] {
  if (state.loss) return [];
  const url = `${origin}/navi`;
  if (!state.birth_date) {
    return [{ uid: "tsugiraku.reentry.birth", title: "【Tsugiraku】出産したら「入力を直す」で出産日を入れる", date: state.due_date, details: "出産日を入れると、出生届・児童手当・医療証など産後の手続きと期限が出ます。予定日より早く生まれたら、そのときに。", url, remindDaysBefore: 0 }];
  }
  return [{ uid: "tsugiraku.reentry.papers", title: "【Tsugiraku】届いた紙を「入力を直す」で足す", date: nextDays(state.birth_date, 30), details: "出生届のあとに届く紙（医療証・児童手当の通知など）を足すと、次の手続きが出ます。", url, remindDaysBefore: 0 }];
}

function nextDays(d: string, n: number): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10);
}

/** ブラウザで .ics を保存させる（端末の中だけで完結） */
export function downloadIcs(ics: string, filename = "tsugiraku-navi.ics") {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
