import type { Metadata } from "next";
import { MoneyView } from "@/components/MoneyView";

// 入力（端末に保存した状態）が無いと中身が出ない画面なので、検索結果に出さない
export const metadata: Metadata = { title: "お金｜Tsugiraku Navi", robots: { index: false, follow: true } };

export default function MoneyPage() {
  return <MoneyView />;
}
