import type { Metadata } from "next";
import Link from "next/link";
import { listArticles } from "@/lib/articles";
import { loadServiceArea } from "@/lib/service-area";

export const metadata: Metadata = {
  title: "Tsugiraku｜妊娠後の手続きで「次に何をするか」がすぐわかる",
  description: "住んでいる区・出産予定日・手元にある紙から、次にやること・分娩予約の締切・実際の負担額がわかります。すべての金額と期限に出典と確認日。広告なし・ログインなし。",
};

/** トップページで約束すること。飾りではなく、すべて実装されている事実だけを書く */
const PROMISES = [
  {
    title: "すべての金額と期限に、出典と確認日",
    body: "画面に出る数字には、区・都・国の公式ページへのリンクと、いつ確認したかを必ず添えています。出典のない情報は、仕組みのうえで表示できません。",
    icon: "M9 12h6M9 16h6M7 4h7l5 5v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z",
  },
  {
    title: "名前もログインも、要りません",
    body: "入力した内容は、あなたの端末の中にだけ保存します。健診の結果や写真は扱いません。保存するものと取り消し方は、いつでも確認できます。",
    icon: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0M17 8l3-3M17 5l3 3",
  },
  {
    title: "医療の判断はしません",
    body: "手続き・締切・お金の案内に限ります。体調や治療のことは、医療機関へ。画面には常に「最終確認は窓口・医療機関へ」と添えています。",
    icon: "M4 12h4l3-7 4 14 3-7h2",
  },
];

const STEPS = [
  { n: "1", title: "4つ入れる", body: "住んでいる区、出産予定日、無痛分娩や距離の希望、いま手元にある紙。約1分。" },
  { n: "2", title: "次にやることが1つ出る", body: "妊娠届、母子手帳、分娩予約、助成の申請…。いま何をすればよいかを1件だけ強調し、期限と出典を添えます。" },
  { n: "3", title: "病院と締切、お金も", body: "区でお産ができる施設の予約締切の目安と、費用 − 一時金 − 助成 = 実負担の目安。" },
];

export default function Home() {
  const area = loadServiceArea();
  const articles = listArticles("ja").slice(0, 3);
  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <p className="chip-ai">東京都23区に住む妊婦さんとご家族へ</p>
        <h1 className="text-[2.4rem] leading-[1.15] font-bold tracking-tight text-ink sm:text-[2.8rem]">
          妊娠後の手続きで
          <span className="block bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">「次に何をするか」が</span>
          すぐわかる
        </h1>
        <p className="text-lg leading-relaxed text-slate-700">
          役所の手続き、分娩予約の締切、もらえるお金。ばらばらに調べなくても、いまのあなたに必要な「次にやること」を、出典つきで1件ずつ出します。
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/navi" className="btn btn-primary text-lg sm:flex-1">Tsugiraku Naviをはじめる</Link>
          <Link href="/articles" className="btn btn-ghost text-lg sm:flex-1">記事を読む</Link>
        </div>
      </section>

      <section aria-labelledby="promises" className="space-y-4">
        <h2 id="promises" className="h-section">安心して使えるように、守っていること</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PROMISES.map((p) => (
            <li key={p.title} className="card space-y-2">
              <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={p.icon} />
                </svg>
              </span>
              <h3 className="text-lg leading-snug font-bold text-ink">{p.title}</h3>
              <p className="text-base text-slate-700">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how" className="space-y-4">
        <h2 id="how" className="h-section">使い方</h2>
        <ol className="space-y-3">
          {STEPS.map((s) => (
            <li key={s.n} className="card flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-bold text-white">{s.n}</span>
              <div>
                <h3 className="text-lg font-bold text-ink">{s.title}</h3>
                <p className="text-base text-slate-700">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="scope" className="card card-ai space-y-2">
        <h2 id="scope" className="h-section">いま対応している地域</h2>
        <p className="text-base text-slate-700">
          {area.label}（{area.municipalities.length}区）。国・東京都・各区の手続きと、区内でお産ができる施設を載せています。
          ほかの市区町村は準備中です。リクエストは <a href={`mailto:${area.contact}`} className="link-inline">{area.contact}</a> へ。
        </p>
        <p className="text-base text-slate-600">
          施設の予約の実態（電話したときの結果・言われた締切・予約金）は、使う人の任意の記録で少しずつ集めています。集計だけを表示し、「施設の公式の情報ではない」と添えます。
        </p>
      </section>

      {articles.length > 0 ? (
        <section aria-labelledby="articles" className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 id="articles" className="h-section">記事</h2>
            <Link href="/articles" className="link">すべて見る</Link>
          </div>
          <ul className="space-y-3">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link href={`/articles/${a.slug}`} className="card block space-y-1 transition hover:bg-white">
                  <span className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <time dateTime={a.published}>{a.published.replaceAll("-", "/")}</time>
                    {a.pr ? <span className="rounded-md border border-amber-300 bg-amber-50 px-1.5 text-amber-800">PR</span> : null}
                    {a.langs.includes("en") ? <span className="rounded-md border border-slate-300 px-1.5">English</span> : null}
                  </span>
                  <span className="block text-lg leading-snug font-bold text-ink">{a.title}</span>
                  <span className="block text-base text-slate-700">{a.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="operator" className="space-y-2 text-base text-slate-700">
        <h2 id="operator" className="h-section">運営</h2>
        <p>
          Tsugiraku事務局（個人による運営）。制度の情報は、公式ページの変更を週1回自動で見張り、変わっていれば人が確かめてから更新します。
          まちがいを見つけたら、各画面の「まちがいを知らせる」か <a href={`mailto:${area.contact}`} className="link-inline">{area.contact}</a> へ。
        </p>
        <p className="flex flex-wrap gap-x-4">
          <Link href="/terms" className="link">利用規約</Link>
          <Link href="/policy" className="link">プライバシーポリシー</Link>
          <Link href="/privacy" className="link">保存するものと取り消し</Link>
        </p>
      </section>
    </div>
  );
}
