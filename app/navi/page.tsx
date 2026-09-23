import type { Metadata } from "next";
import { EntryForm } from "@/components/EntryForm";
import { loadServiceArea } from "@/lib/service-area";

export const metadata: Metadata = { title: "入力｜Tsugiraku Navi" };

export default function NaviPage() {
  const area = loadServiceArea();
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="chip-ai">4つ入れるだけ</p>
        <h1 className="h-page">
          いまの状況から、
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">次にやること</span>
          を出します
        </h1>
        <p className="text-base text-slate-600">住んでいる区・出産予定日・手元にある紙から、手続きの順番、分娩予約の締切、お金の目安がわかります。名前やメールアドレスは要りません。</p>
      </header>
      <EntryForm area={area} />
    </div>
  );
}
