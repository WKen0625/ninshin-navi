"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** 上のタブ: Tsugiraku Navi（アプリ）／記事／コンタクト。どの画面にも出す。タップ領域は 44px 以上 */
const TABS = [
  { href: "/navi", label: "Tsugiraku Navi", match: ["/navi", "/todo", "/hospitals", "/money", "/notify", "/privacy"] },
  { href: "/articles", label: "負担軽減コラム", match: ["/articles"] },
  { href: "/contact", label: "コンタクト", match: ["/contact"] },
];

export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="mx-auto max-w-xl space-y-3 px-4 pt-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Tsugiraku トップページへ">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-500 text-white shadow-hero">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold text-ink">Tsugiraku</span>
            <span className="block text-sm text-slate-500">次にやることが、すぐわかる</span>
          </span>
        </Link>
      </div>
      <nav aria-label="サイトの切り替え" className="flex gap-1 rounded-2xl border border-white/70 bg-white/70 p-1 shadow-card backdrop-blur-md">
        {TABS.map((t) => {
          const active = t.match.some((m) => path === m || path.startsWith(`${m}/`));
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-xl px-2 text-center text-sm font-bold leading-tight transition sm:text-base ${
                active ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm" : "text-slate-700 hover:bg-white"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
