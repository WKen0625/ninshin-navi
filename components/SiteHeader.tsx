"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { columnsOf, HEADER, homeOf, LANG_NAME, langOf, LANGS } from "@/lib/i18n";

/** 上のタブ: Tsugiraku Navi（アプリ）／負担軽減コラム／コンタクト。どの画面にも出す。タップ領域は 44px 以上 */
const TABS: { key: "navi" | "columns" | "contact"; href: string; match: string[] }[] = [
  { key: "navi", href: "/navi", match: ["/navi", "/todo", "/hospitals", "/money", "/notify", "/privacy"] },
  { key: "columns", href: "/articles", match: ["/articles"] },
  { key: "contact", href: "/contact", match: ["/contact"] },
];

export function SiteHeader() {
  const path = usePathname();
  const lang = langOf(path, useSearchParams().get("lang"));
  const t = HEADER[lang];
  return (
    <header className="mx-auto max-w-xl space-y-3 px-4 pt-5">
      <div className="flex items-center justify-between gap-3">
        <Link href={homeOf(lang)} className="flex items-center gap-2.5" aria-label="Tsugiraku">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-500 text-white shadow-hero">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold text-ink">Tsugiraku</span>
            <span className="block text-sm text-slate-500">{t.tagline}</span>
          </span>
        </Link>
        {/* 言語の切り替え。トップページとコラムだけ（Navi本体は日本語） */}
        <nav aria-label={t.switcher} className="flex flex-wrap justify-end gap-1">
          {LANGS.filter((l) => l !== lang).map((l) => (
            <Link key={l} href={homeOf(l)} hrefLang={l} lang={l} className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white/80 px-2 text-xs font-bold text-slate-700 hover:bg-white">
              {LANG_NAME[l]}
            </Link>
          ))}
        </nav>
      </div>
      <nav aria-label="Tsugiraku" className="flex gap-1 rounded-2xl border border-white/70 bg-white/70 p-1 shadow-card backdrop-blur-md">
        {TABS.map((tab) => {
          const active = tab.match.some((m) => path === m || path.startsWith(`${m}/`));
          const href = tab.key === "columns" ? columnsOf(lang) : tab.href;
          return (
            <Link
              key={tab.key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-xl px-2 text-center text-sm font-bold leading-tight transition sm:text-base ${
                active ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm" : "text-slate-700 hover:bg-white"
              }`}
            >
              {t[tab.key]}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
