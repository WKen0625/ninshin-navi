import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = { title: "利用規約（下書き）｜Tsugiraku Navi" };

export default function Page() {
  return <LegalDocument file="terms" />;
}
