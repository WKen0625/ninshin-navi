import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Noto+Sans+SC:wght@400;700&family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-dvh antialiased">
        <Suspense fallback={<div className="mx-auto max-w-xl px-4 pt-5" />}>
          <SiteHeader />
        </Suspense>
        <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
        <Suspense fallback={<div className="pb-32" />}>
          <SiteFooter />
        </Suspense>
        <Nav />
      </body>
    </html>
  );
}
