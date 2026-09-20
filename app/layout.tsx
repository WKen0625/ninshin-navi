import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "妊娠手続きナビ（仮称）",
  description: "住所・出産予定日・手元にある紙から、今週やること・分娩予約の締切・実際の負担額がわかります。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-dvh antialiased">
        <header className="mx-auto flex max-w-xl items-center gap-3 px-4 pt-5">
          <a href="/" className="flex items-center gap-2.5" aria-label="妊娠手続きナビ（仮称） はじめの画面へ">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-500 text-white shadow-hero">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold text-ink">妊娠手続きナビ</span>
              <span className="block text-sm text-slate-500">次にやることが、すぐわかる</span>
            </span>
          </a>
        </header>
        <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
        {/* 設計原則10: 医療的判断を返さない。全画面に添える。 */}
        <footer className="mx-auto max-w-xl space-y-1 px-4 pb-32 text-base text-slate-600">
          <p className="notice notice-muted">最終確認は窓口・医療機関へ。</p>
          <nav aria-label="このサイトについて" className="flex flex-wrap gap-x-4">
            <a href="/privacy" className="link">記録と同意（保存するもの・取り消し）</a>
            <a href="/terms" className="link">利用規約（下書き）</a>
            <a href="/policy" className="link">プライバシーポリシー（下書き）</a>
          </nav>
        </footer>
        <Nav />
      </body>
    </html>
  );
}
