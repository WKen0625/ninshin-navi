import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = { title: "プライバシーポリシー（下書き）｜妊娠手続きNavi｜Tsugiraku" };

export default function Page() {
  return <LegalDocument file="privacy" />;
}
