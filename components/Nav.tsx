"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const ITEMS = [
  { href: "/todo", label: "やること", icon: icon("M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9") },
  { href: "/hospitals", label: "病院", icon: icon("M4 21V7l8-4 8 4v14M9 21v-5h6v5M12 8v4M10 10h4") },
  { href: "/money", label: "お金", icon: icon("M12 3v18M7 7l5 5 5-5M7 13h10M7 17h10") },
  { href: "/", label: "入力", icon: icon("M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4") },
];

/** 画面下に浮かぶタブ。親指の届く位置に置く（スマホ優先）。タップ領域は 44px 以上。 */
export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="画面の切り替え" className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md gap-1 rounded-3xl border border-white/70 bg-white/80 p-1.5 shadow-hero backdrop-blur-xl">
        {ITEMS.map((i) => {
          const active = path === i.href;
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-sm font-medium transition ${
                active ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"
              }`}
            >
              {i.icon}
              <span>{i.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
