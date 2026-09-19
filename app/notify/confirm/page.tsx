import type { Metadata } from "next";
import { LinkAction } from "@/components/LinkAction";

export const metadata: Metadata = { title: "メール通知の登録を完了する｜妊娠手続きナビ（仮称）", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string; sig?: string }> }) {
  const { id, sig } = await searchParams;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">メール通知の登録を完了する</h1>
      {id && sig ? (
        <>
          <p className="text-base">下のボタンを押すと、通知が始まります。心当たりがなければ、何もせずにこの画面を閉じてください。</p>
          <LinkAction purpose="confirm" id={id} sig={sig} />
        </>
      ) : (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-base text-amber-800">リンクが正しくありません。メールの中のリンクを、もう一度開いてください。</p>
      )}
    </div>
  );
}
