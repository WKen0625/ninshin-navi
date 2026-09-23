import type { Metadata } from "next";
import { LinkAction } from "@/components/LinkAction";

export const metadata: Metadata = { title: "メール通知をやめる｜Tsugiraku Navi", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string; sig?: string }> }) {
  const { id, sig } = await searchParams;
  return (
    <div className="space-y-6">
      <h1 className="h-page">メール通知をやめる</h1>
      {id && sig ? (
        <>
          <p className="text-base">下のボタンを押すと、通知を止めて、メールアドレスと預かっていた内容を消します。</p>
          <LinkAction purpose="unsubscribe" id={id} sig={sig} />
        </>
      ) : (
        <p className="notice notice-warn">リンクが正しくありません。メールの中のリンクを、もう一度開いてください。</p>
      )}
    </div>
  );
}
