import type { Metadata } from "next";
import { EntryForm } from "@/components/EntryForm";
import { loadServiceArea } from "@/lib/service-area";

export const metadata: Metadata = {
  title: "Tsugiraku Navi｜区と予定日から、妊娠・出産の手続きの期限を出す",
  description: "東京23区の区・出産予定日・手元の紙を入れると、次にやる手続きを期限の日付つきで1件ずつ出します。名前もログインも要りません。",
  alternates: { canonical: "/navi" },
};

export default function NaviPage() {
  const area = loadServiceArea();
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="chip-ai">5つ入れるだけ</p>
        <h1 className="h-page">
          いまの状況から、
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">次にやること</span>
          を出します
        </h1>
        <p className="text-base text-slate-600">名前やメールアドレスは要りません。約2分です。</p>
      </header>
      <EntryForm area={area} />
    </div>
  );
}
