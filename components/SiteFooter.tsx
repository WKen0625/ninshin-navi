"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { FOOTER, langOf } from "@/lib/i18n";

/** 画面下の共通部分。言語に合わせた文言と、<html lang> と書体（globals.css の [data-lang]）の切り替え */
export function SiteFooter() {
  const path = usePathname();
  const lang = langOf(path, useSearchParams().get("lang"));
  const t = FOOTER[lang];

  // 言語ごとの書体と、読み上げ・ハイフネーションのために <html lang> を合わせる
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
  }, [lang]);

  return (
    <footer className="mx-auto max-w-xl space-y-1 px-4 pb-32 pt-6 text-base text-slate-600" lang={lang}>
      {/* 設計原則10: 医療的判断を返さない。全画面に添える。 */}
      <p className="notice notice-muted">{t.disclaimer}</p>
      <nav aria-label={t.about} className="flex flex-wrap gap-x-4">
        <Link href="/contact" className="link">{t.contact}</Link>
        <Link href="/privacy" className="link">{t.privacy}</Link>
        <Link href="/terms" className="link">{t.terms}{t.draft}</Link>
        <Link href="/policy" className="link">{t.policy}{t.draft}</Link>
      </nav>
    </footer>
  );
}
