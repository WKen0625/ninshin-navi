import type { Metadata } from "next";
import { HospitalList } from "@/components/HospitalList";

// 入力（端末に保存した状態）が無いと中身が出ない画面なので、検索結果に出さない
export const metadata: Metadata = { title: "病院と締切｜Tsugiraku Navi", robots: { index: false, follow: true } };

export default function HospitalsPage() {
  return <HospitalList />;
}
