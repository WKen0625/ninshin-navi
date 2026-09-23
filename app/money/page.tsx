import type { Metadata } from "next";
import { MoneyView } from "@/components/MoneyView";

export const metadata: Metadata = { title: "お金｜Tsugiraku Navi" };

export default function MoneyPage() {
  return <MoneyView />;
}
