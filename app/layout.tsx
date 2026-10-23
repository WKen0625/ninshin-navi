import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Tsugiraku Navi",
  openGraph: { siteName: "Tsugiraku", locale: "ja_JP", type: "website" },
  twitter: { card: "summary" },
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Noto+Sans+SC:wght@400;700&family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-dvh antialiased">
        <Suspense fallback={<div className="mx-auto max-w-2xl px-4 pt-5" />}>
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
