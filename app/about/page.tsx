import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/Icon";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { JsonLd } from "@/components/public/JsonLd";
import { ORGANIZATION } from "@/components/public/SiteJsonLd";
import { loadServiceArea } from "@/lib/service-area";
import { absUrl, OG_IMAGE } from "@/lib/site";

// このサイトについて: 誰が・何を・どう作っているか（運営者情報）。
// 検索エンジンは「誰が書いているか・どう確かめているか」を評価に使うので、トップ・コンタクト・規約に散らばっていた事実を1ページにまとめる。
// 書くのは、ほかのページ（利用規約・コンタクト・トップ・CLAUDE.md の設計原則）にすでにある事実だけ。

const TITLE = "このサイトについて｜運営・情報の作り方・PRの扱い｜Tsugiraku";
const DESCRIPTION = "Tsugirakuは、東京23区の妊娠・出産の手続き（窓口・期限・持ち物・お金）を、区・東京都・国の公式ページをもとに案内するサイトです。運営者、情報の確かめ方、しないこと、製品の紹介（PR）の扱いをまとめました。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { images: [OG_IMAGE], title: TITLE, description: DESCRIPTION, url: "/about" },
};

export default function AboutPage() {
  const area = loadServiceArea();
  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ name: "トップ", href: "/" }, { name: "このサイトについて", href: "/about" }]} />
      <header className="space-y-2">
        <h1 className="h-page">このサイトについて</h1>
        <p className="text-lg text-slate-700">
          Tsugiraku（つぎらく）は、東京23区に住む妊婦さんとご家族のための、妊娠・出産の手続きの案内サイトです。妊娠届から産後の助成まで、「次に何をするか」を、窓口・期限・持ち物・お金とあわせて出します。
        </p>
      </header>

      <section className="card space-y-2">
        <SectionHeading icon="mail" tone="slate">運営者</SectionHeading>
        <p className="text-base">Tsugiraku事務局（個人による運営）。連絡先は <a href={`mailto:${area.contact}`} className="link-inline">{area.contact}</a>（返事に数日かかることがあります）。</p>
        <p className="text-base text-slate-700">対応している地域は{area.label}（{area.municipalities.length}区）です。ほかの市区町村は準備中です。</p>
      </section>

      <section className="space-y-3">
        <SectionHeading icon="document">情報の作り方</SectionHeading>
        <ul className="list-disc space-y-2 pl-6 text-base">
          <li>手続きの窓口・期限・持ち物・金額は、区・東京都・国（こども家庭庁・厚生労働省など）の公式ページを読んで載せています。画面に出る数字には、出典へのリンクと「いつ確認したか」を必ず添えます。出典のない数字は、仕組みのうえで表示できません。</li>
          <li>公式ページの変更は週1回、自動で見張っています。変わっていれば、人が公式ページを読み直してから更新します。確認中のものには「確認中」と表示します。</li>
          <li>コラム（読みもの）は、制度の数字に出典と確認日を添えます。英語版がある記事は、日本語版と同じ数字と出典を使います。</li>
          <li>入力した内容（区・出産予定日・持っている紙）は、あなたの端末の中にだけ保存します。名前もログインも要りません。くわしくは<Link href="/privacy" className="link-inline">保存するものと取り消し</Link>へ。</li>
        </ul>
      </section>

      <section className="space-y-3">
        <SectionHeading icon="shield" tone="green">しないこと</SectionHeading>
        <ul className="list-disc space-y-2 pl-6 text-base">
          <li>医療の判断はしません。体調・受診のタイミング・薬やサプリの効果は書きません。手続き・締切・お金の案内に限り、画面には常に「最終確認は窓口・医療機関へ」と添えています。</li>
          <li>病院のおすすめやランキングはしません。施設の並びは、公表されている予約締切の週が早い順だけです。病院の画面に広告や製品は置きません。</li>
          <li>病院や企業から、情報の掲載の対価を受け取っていません。</li>
        </ul>
      </section>

      <section className="space-y-3">
        <SectionHeading icon="bag" tone="amber">製品の紹介（PR）の扱い</SectionHeading>
        <ul className="list-disc space-y-2 pl-6 text-base">
          <li>製品やサービスの紹介は、コラムと出産準備リストにだけ載せ、本文より前に「PR」と明記します。</li>
          <li>紹介のリンクには、アフィリエイト（Amazonアソシエイト・楽天アフィリエイト・A8.netなど）を使うことがあります。リンク先で購入や申し込みがあると、運営に紹介料が入ることがあります。使っている仕組みは、記事の最後に明記します。</li>
          <li>紹介料の有無で、手続きの案内や病院の情報は変わりません。製品は「選ぶときの例」として載せ、おすすめ順や効果の比較はしません。価格と在庫はリンク先で確かめてください。</li>
        </ul>
      </section>

      <section className="card card-quiet space-y-2">
        <SectionHeading icon="phone" tone="blue">まちがいを見つけたら</SectionHeading>
        <p className="text-base">各画面の「まちがいを知らせる」（名前もメールアドレスも要りません）か、<Link href="/contact" className="link-inline">コンタクト</Link>から知らせてください。確かめたうえで直します。</p>
      </section>

      <section className="space-y-2 text-base text-slate-700" lang="en">
        <h2 className="h-section">About this site (English)</h2>
        <p>
          Tsugiraku is a guide to pregnancy and childbirth paperwork for families living in Tokyo&apos;s 23 wards: what to do next, where, by when, what to bring, and the money involved. Every figure links to its official source (ward, Tokyo or national government) with the date we checked it. We do not give medical advice and do not rank hospitals. Product mentions appear only in columns and the birth-prep checklist, marked &ldquo;PR&rdquo;, and may use affiliate links; they never change the paperwork guidance. The site is run by the Tsugiraku office (an individual). Contact: <a href={`mailto:${area.contact}`} className="link-inline">{area.contact}</a>. <Link href="/en" className="link-inline">English guide</Link>
        </p>
      </section>

      <p className="flex flex-wrap gap-x-4 text-base">
        <Link href="/terms" className="link">利用規約</Link>
        <Link href="/policy" className="link">プライバシーポリシー</Link>
        <Link href="/privacy" className="link">保存するものと取り消し</Link>
        <Link href="/contact" className="link">コンタクト</Link>
      </p>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "このサイトについて",
          url: absUrl("/about"),
          inLanguage: "ja",
          description: DESCRIPTION,
          mainEntity: ORGANIZATION,
        }}
      />
    </div>
  );
}
