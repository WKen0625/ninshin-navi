import type { Metadata } from "next";
import { PrintSheet } from "@/components/PrintSheet";

export const metadata: Metadata = { title: "1枚にして印刷｜Tsugiraku Navi", robots: { index: false } };

export default function PrintPage() {
  return <PrintSheet />;
}
