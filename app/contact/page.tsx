import type { Metadata } from "next";
import Link from "next/link";
import { FeedbackLink } from "@/components/FeedbackLink";
import { loadServiceArea } from "@/lib/service-area";

export const metadata: Metadata = { title: "コンタクト｜Tsugiraku" };

const SUBJECTS = [
  { label: "対象地域のリクエスト", body: "追加してほしい市区町村: " },
  { label: "情報のまちがい", body: "どの画面の、どの情報が、どう違いましたか: " },
  { label: "取材・提携・その他", body: "" },
];

export default function ContactPage() {
  const area = loadServiceArea();
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="h-page">コンタクト</h1>
        <p className="text-base text-slate-700">運営はTsugiraku事務局（個人）です。返事に数日かかることがあります。</p>
      </header>

      <section className="card space-y-3">
        <h2 className="h-section">メールで連絡する</h2>
        <p className="text-base">
          <a href={`mailto:${area.contact}`} className="link text-lg">{area.contact}</a>
        </p>
        <p className="text-base text-slate-700">用件を選ぶと、件名の入ったメールが開きます。</p>
        <ul className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <li key={s.label}>
              <a href={`mailto:${area.contact}?subject=${encodeURIComponent(s.label)}&body=${encodeURIComponent(s.body)}`} className="btn btn-ghost">{s.label}</a>
            </li>
          ))}
        </ul>
        <p className="notice notice-info">
          メールには、体調・健診の結果・母子手帳の番号など、健康にかかわることを書かないでください。手続きの相談は、お住まいの区の窓口へ。医療の相談は、医療機関へ。
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="h-section">名前を出さずに、まちがいを知らせる</h2>
        <p className="text-base text-slate-700">メールアドレスも要りません。運営だけが読みます。返信はできません。</p>
        <FeedbackLink target="screen:contact" regionCode="" />
      </section>

      <section className="space-y-2 text-base text-slate-700">
        <h2 className="h-section">よくある質問</h2>
        <dl className="space-y-3">
          <div>
            <dt className="font-bold text-ink">情報は誰が確認していますか</dt>
            <dd>公式ページ（区・東京都・国・厚生労働省「出産なび」）を読み、出典と確認日をつけて載せています。公式ページの変更は週1回自動で見張り、変わっていれば人が確かめてから更新します。</dd>
          </div>
          <div>
            <dt className="font-bold text-ink">病院や企業からお金を受け取っていますか</dt>
            <dd>病院からは受け取っていません。病院の画面に広告は置きません。記事に製品の紹介を載せる場合は、先頭に「PR」と明記します。</dd>
          </div>
          <div>
            <dt className="font-bold text-ink">入力した内容はどこに保存されますか</dt>
            <dd>あなたの端末の中です。任意で「記録」に同意した場合だけ、集計のためにサーバーへ保存します。くわしくは<Link href="/privacy" className="link-inline">保存するものと取り消し</Link>へ。</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
