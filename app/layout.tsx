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
        <Nav />
        <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
        {/* 設計原則10: 医療的判断を返さない。全画面に添える。 */}
        <footer className="mx-auto max-w-xl px-4 pb-8 text-base text-gray-600">
          <p>最終確認は窓口・医療機関へ。</p>
          <nav aria-label="このサイトについて" className="flex flex-wrap gap-x-4">
            <a href="/privacy" className="inline-flex min-h-11 items-center text-info underline">記録と同意（保存するもの・取り消し）</a>
            <a href="/terms" className="inline-flex min-h-11 items-center text-info underline">利用規約（下書き）</a>
            <a href="/policy" className="inline-flex min-h-11 items-center text-info underline">プライバシーポリシー（下書き）</a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
