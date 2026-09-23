import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";

export const metadata: Metadata = { title: "プライバシーポリシー（下書き）｜Tsugiraku Navi" };

export default function Page() {
  return <LegalDocument file="privacy" />;
}
