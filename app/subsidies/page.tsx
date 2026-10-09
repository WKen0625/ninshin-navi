import type { Metadata } from "next";
import { SubsidyNavi } from "@/components/SubsidyNavi";

export const metadata: Metadata = { title: "助成金Navi｜Tsugiraku Navi" };

export default function SubsidiesPage() {
  return <SubsidyNavi />;
}
