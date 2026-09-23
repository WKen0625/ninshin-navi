import type { Metadata } from "next";
import { NotifyPanel } from "@/components/NotifyPanel";

export const metadata: Metadata = { title: "メールでお知らせ｜Tsugiraku Navi" };

export default function NotifyPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="h-page">メールでお知らせ（希望する人だけ）</h1>
        <p className="text-base">申請の期限が近づいたときと、完了チェックがしばらく無いときに、メールでお知らせします。登録しなくても、サイトは今までどおり使えます。</p>
      </header>

      <section className="space-y-2 text-base">
        <h2 className="h-section">メールの回数</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>多くても週に1回です。お知らせすることが無い週は送りません。</li>
          <li>完了チェックの催促は、進みが無いまま3回送ったら止めます。</li>
          <li>広告や製品の案内は入れません。</li>
        </ul>
      </section>

      <section className="space-y-2 text-base">
        <h2 className="h-section">お預かりするもの</h2>
        <p>期限を計算するために、登録した人の分だけ、次の内容をサーバーでお預かりします。名前や住所は聞きません。</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>メールアドレス</li>
          <li>市区町村、出産予定日、心拍を確認した日、出産した日</li>
          <li>手元にある紙、完了チェック（完了した・該当しない）</li>
        </ul>
        <p>入力や完了チェックを変えると、預かっている内容も自動で新しくなります。通知をやめると、メールアドレスも預かった内容もすべて消します。メールの中のリンクからも、いつでもやめられます。</p>
      </section>

      <NotifyPanel />
    </div>
  );
}
