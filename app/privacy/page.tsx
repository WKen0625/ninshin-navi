import type { Metadata } from "next";
import { PrivacyPanel } from "@/components/PrivacyPanel";

export const metadata: Metadata = { title: "記録と同意｜妊娠手続きナビ（仮称）" };

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">記録と同意</h1>

      <section className="space-y-2 text-base">
        <h2 className="text-lg font-bold">このサイトが保存するもの</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>入口で入れた内容（市区町村・出産予定日・希望・手元の紙・完了チェック）は、<strong>この端末の中にだけ</strong>保存します。サーバーには、制度の情報を取るための市区町村コードだけを送ります。</li>
          <li>名前・住所・健診の結果は、聞きませんし保存しません。写真を送る機能もありません。メールアドレスは、メール通知を希望した人の分だけお預かりします。</li>
          <li>「その他（一覧にない紙）」に書いた紙の名前は、一覧に追加する参考として、市区町村コードと一緒に保存します。</li>
        </ul>
      </section>

      <section className="space-y-2 text-base">
        <h2 className="text-lg font-bold">記録（任意の1問）について</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>手続きの完了チェックのあとに、任意で1問だけお聞きすることがあります。答えなくても、サイトは同じように使えます。お礼の品やポイントはありません。</li>
          <li>保存するのは、同意して答えた場合だけです。内容はすべて選択式で、自由に文章を書く欄はありません。</li>
          <li>保存する内容: 施設・予定月（または出産月）・電話した週と結果、または窓口で払った金額の幅など、画面で選んだ項目だけ。分娩方法は、別に同意した場合だけ保存します。</li>
          <li>ほかの人に見せるのは、件数やまん中の値（中央値）などの集計だけです。金額の集計は、同じ施設の記録が3件たまるまで表示しません。</li>
          <li>同じ人の二重回答を防ぐため、この端末を区別する記号を、サーバー側の秘密の値と合わせて暗号化（ハッシュ化）して保存します。記号そのものは保存せず、名前やメールとは結びつきません。</li>
          <li>下のボタンで、いつでも同意を取り消して、この端末から送った記録を消せます。ブラウザのデータを消したり端末を変えたりすると、この端末を区別する記号が失われ、過去の記録を消せなくなります。</li>
        </ul>
      </section>

      <section className="space-y-2 text-base">
        <h2 className="text-lg font-bold">メール通知（希望する人だけ）について</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>登録した人の分だけ、メールアドレスと、期限の計算に必要な入力（市区町村・日付・手元の紙・完了チェック）をサーバーでお預かりします。</li>
          <li>メールは週1回までで、広告は入れません。通知をやめると、預かった内容はすべて消します。</li>
        </ul>
        <a href="/notify" className="inline-flex min-h-11 items-center text-info underline">メール通知の登録・取り消し（いまは準備中の場合があります）</a>
      </section>

      <PrivacyPanel />

      <p className="text-base text-gray-600">
        <a href="/terms" className="text-info underline">利用規約</a>と<a href="/policy" className="text-info underline">プライバシーポリシー</a>は、いまは下書きです。弁護士の確認のあと、正式版に差し替えます。
      </p>
    </div>
  );
}
