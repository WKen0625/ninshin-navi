import type { Metadata } from "next";
import { MoneyView } from "@/components/MoneyView";

export const metadata: Metadata = { title: "お金｜妊娠手続きNavi｜Tsugiraku" };

export default function MoneyPage() {
  return <MoneyView />;
}
