import type { Metadata } from "next";
import { SubsidyNavi } from "@/components/SubsidyNavi";

// 入力（端末に保存した状態）が無いと中身が出ない画面なので、検索結果に出さない
export const metadata: Metadata = { title: "助成金Navi｜Tsugiraku Navi", robots: { index: false, follow: true } };

export default function SubsidiesPage() {
  return <SubsidyNavi />;
}
