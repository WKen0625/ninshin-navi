import type { Metadata } from "next";
import { Suspense } from "react";
import { SharePanel } from "@/components/SharePanel";

export const metadata: Metadata = { title: "パートナーの端末にも出す｜Tsugiraku Navi", robots: { index: false } };

export default function SharePage() {
  return (
    <Suspense fallback={<p className="text-base">読み込み中…</p>}>
      <SharePanel />
    </Suspense>
  );
}
