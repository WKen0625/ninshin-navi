// カレンダー連携（Googleの予定リンクと .ics）。ログインなし・サーバーに送らない。

import { describe, expect, it } from "vitest";
import { eventOfStep, foldLine, googleCalendarUrl, icsOf, nextDay } from "../lib/calendar";

const ev = { uid: "minato.s03.until", title: "【期限】妊婦健診の助成券を受け取る", date: "2026-10-31", details: "期限: 妊娠12週まで\n窓口: 区役所, 保健所", url: "https://www.city.minato.tokyo.jp/x" };

describe("日付", () => {
  it("終日の予定の終わりは翌日（月末・年末またぎも）", () => {
    expect(nextDay("2026-10-31")).toBe("2026-11-01");
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
    expect(nextDay("2028-02-28")).toBe("2028-02-29");
  });
});

describe("Googleカレンダーのリンク", () => {
  it("予定の名前・終日の日付・メモと出典が入る", () => {
    const u = new URL(googleCalendarUrl(ev));
    expect(u.origin + u.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(u.searchParams.get("action")).toBe("TEMPLATE");
    expect(u.searchParams.get("text")).toBe(ev.title);
    expect(u.searchParams.get("dates")).toBe("20261031/20261101");
    expect(u.searchParams.get("details")).toBe(`${ev.details}\n${ev.url}`);
  });
});

describe(".ics", () => {
  it("予定・7日前の通知・UID が入り、改行は CRLF、カンマはエスケープ", () => {
    const ics = icsOf([ev], new Date("2026-10-01T00:00:00Z"));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261031\r\nDTEND;VALUE=DATE:20261101");
    expect(ics).toContain("UID:minato.s03.until@tsugiraku.jp");
    expect(ics).toContain("DTSTAMP:20261001T000000Z");
    expect(ics).toContain("TRIGGER:-P7D");
    expect(ics).toContain("区役所\\, 保健所");
    expect(ics).toContain("\\n窓口");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    // 行は75バイト以内
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it("長い行は文字の途中で切らずに折り返し、つなげると元に戻る", () => {
    const long = "SUMMARY:" + "あ".repeat(60);
    const folded = foldLine(long);
    expect(folded.replaceAll("\r\n ", "")).toBe(long);
    for (const line of folded.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it("通知を 0 日にすると VALARM を付けない", () => {
    expect(icsOf([{ ...ev, remindDaysBefore: 0 }])).not.toContain("VALARM");
  });
});

describe("手続き → 予定", () => {
  const step = { id: "jp.s01", title: "妊娠届を出す", detail: "区役所へ", channel: "区役所", source_url: "https://example.go.jp/a", action_url: null };
  it("期限の日があれば【期限】、推定なら【期限・推定】", () => {
    const e = eventOfStep(step, { from: null, until: { date: "2026-10-20", text: "妊娠12週まで", estimated: false } }, "港区")!;
    expect(e.title).toBe("【期限】妊娠届を出す");
    expect(e.date).toBe("2026-10-20");
    expect(e.details).toContain("期限: 妊娠12週まで");
    expect(e.details).toContain("地域: 港区");
    expect(e.url).toBe(step.source_url);
    expect(eventOfStep(step, { from: null, until: { date: "2026-10-20", text: "", estimated: true } })!.title).toBe("【期限・推定】妊娠届を出す");
  });
  it("期限が無く申請できる日だけなら【申請できる】、通知なし。日付が無ければ null", () => {
    const e = eventOfStep(step, { from: { date: "2026-11-01", text: "出産した日から" }, until: { date: null, text: "決まった日付はない", estimated: false } })!;
    expect(e.title).toBe("【申請できる】妊娠届を出す");
    expect(e.remindDaysBefore).toBe(0);
    expect(eventOfStep(step, { from: { date: null, text: "出産したあと" }, until: null })).toBeNull();
  });
});
