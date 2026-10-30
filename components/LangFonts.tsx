import type { Lang } from "@/lib/i18n";

const HREF = "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Noto+Sans+SC:wght@400;700&family=Noto+Sans+KR:wght@400;700&display=swap";

/**
 * 日本語以外のページ（/en・/zh・/ko・/ru と、コラムの ?lang=）だけで読むウェブフォント。
 * React 19 が <link> を <head> に持ち上げる。日本語ページは端末の書体（globals.css）を使うので読まない。
 * 以前は全ページの layout で読んでいて、約110KB のCSSを待ってから表示していた（Lighthouse で LCP 3.2秒）。
 */
export function LangFonts({ lang }: { lang: Lang }) {
  if (lang === "ja") return null;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={HREF} precedence="default" />
    </>
  );
}
