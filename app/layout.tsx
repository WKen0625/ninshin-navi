import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";
import { HeaderView, SiteHeader } from "@/components/SiteHeader";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Tsugiraku Navi",
  openGraph: { siteName: "Tsugiraku", locale: "ja_JP", type: "website" },
  // 共有時の画像は app/opengraph-image.png（全ページ共通。Next がこのファイルから og:image / twitter:image を出す）
  twitter: { card: "summary_large_image" },
  // 検索結果での見せ方の上限を広げる（大きな画像のプレビュー・長い抜粋）。入力が無いと中身が出ない画面は、各ページの robots: { index: false } がこれを丸ごと上書きする
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  // Google Search Console の確認（HTMLタグの方法を使うとき）。値は公開してよいもの
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } } : {}),
  description: "住んでいる区・出産予定日・手元にある紙から、次にやること・分娩予約の締切・実際の負担額がわかります。出典と確認日をすべて表示。ログインなし。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      {/* ウェブフォントは日本語以外のページだけ（components/LangFonts.tsx）。日本語ページは端末の書体で、外部CSSを待たずに表示する */}
      <body className="min-h-dvh antialiased">
        {/* fallback は本物と同じ高さの日本語の上部（CLS を防ぐ）。?lang= を読む本物に、読み込み後に置き換わる */}
        <Suspense fallback={<HeaderView lang="ja" path="" />}>
          <SiteHeader />
        </Suspense>
        <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
        <Suspense fallback={<div className="pb-32" />}>
          <SiteFooter />
        </Suspense>
        <Nav />
      </body>
    </html>
  );
}
