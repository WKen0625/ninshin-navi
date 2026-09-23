import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tsugiraku Navi",
  description: "住んでいる区・出産予定日・手元にある紙から、次にやること・分娩予約の締切・実際の負担額がわかります。出典と確認日をすべて表示。広告なし・ログインなし。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-dvh antialiased">
        <Suspense fallback={<div className="mx-auto max-w-xl px-4 pt-5" />}>
          <SiteHeader />
        </Suspense>
        <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
        {/* 設計原則10: 医療的判断を返さない。全画面に添える。 */}
        <footer className="mx-auto max-w-xl space-y-1 px-4 pb-32 pt-6 text-base text-slate-600">
          <p className="notice notice-muted">最終確認は窓口・医療機関へ。</p>
          <nav aria-label="このサイトについて" className="flex flex-wrap gap-x-4">
            <a href="/contact" className="link">コンタクト</a>
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
