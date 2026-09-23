import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/Markdown";
import { getArticle, isLang, STAGE_LABEL, type Lang } from "@/lib/articles";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> };

/** アフィリエイトの仕組みごとに、規約が求める文言 */
const PROGRAM_TEXT: Record<Lang, Record<string, string>> = {
  ja: {
    amazon: "Amazonのアソシエイトとして、Tsugirakuは適格販売により収入を得ています。",
    rakuten: "楽天アフィリエイトのリンクを含みます。",
    yahoo: "Yahoo!ショッピングのアフィリエイトリンクを含みます。",
    other: "アフィリエイトサービスのリンクを含みます。",
  },
  en: {
    amazon: "As an Amazon Associate, Tsugiraku earns from qualifying purchases.",
    rakuten: "Contains Rakuten affiliate links.",
    yahoo: "Contains Yahoo! Shopping affiliate links.",
    other: "Contains affiliate links.",
  },
};

const T: Record<Lang, { pr: string; prBody: string; sources: string; checked: string; published: string; updated: string; back: string; other: string; disclaimer: string; navi: string }> = {
  ja: {
    pr: "PR・広告を含みます",
    prBody: "この記事には製品の紹介とアフィリエイトリンクが含まれます。リンク先で購入があると、運営に紹介料が入ることがあります。紹介料の有無で、手続きの案内や病院の情報は変わりません。",
    sources: "出典",
    checked: "確認日",
    published: "公開",
    updated: "更新",
    back: "コラムの一覧へ",
    other: "Read in English",
    disclaimer: "この記事は手続きと準備の案内です。医療の判断はしません。最終確認は窓口・医療機関へ。",
    navi: "あなたの「次にやること」を見る",
  },
  en: {
    pr: "Contains PR / affiliate links",
    prBody: "This article mentions products and contains affiliate links. If you buy through them, Tsugiraku may receive a commission. Commissions never change the procedure guidance or the hospital information we show.",
    sources: "Sources",
    checked: "checked",
    published: "Published",
    updated: "Updated",
    back: "All columns",
    other: "日本語で読む",
    disclaimer: "This article explains paperwork and preparation. It is not medical advice. Please confirm with your ward office or your clinic.",
    navi: "See your next step in the Navi",
  },
};

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { lang: raw } = await searchParams;
  const a = getArticle(slug, isLang(raw) ? raw : "ja");
  return a ? { title: `${a.title}｜Tsugiraku`, description: a.description } : { title: "Tsugiraku" };
}

export default async function ArticlePage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { lang: raw } = await searchParams;
  const lang: Lang = isLang(raw) ? raw : "ja";
  const a = getArticle(slug, lang);
  if (!a) notFound();
  const t = T[lang];
  const otherLang: Lang = lang === "ja" ? "en" : "ja";
  const fmt = (d: string) => d.replaceAll("-", "/");
  return (
    <article className="space-y-6 text-base" lang={lang}>
      <header className="space-y-3">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          <Link href={`/articles${lang === "ja" ? "" : `?lang=${lang}`}`} className="link-inline">{t.back}</Link>
          <span>
            {t.published} <time dateTime={a.published}>{fmt(a.published)}</time>
            {a.updated ? <>・{t.updated} <time dateTime={a.updated}>{fmt(a.updated)}</time></> : null}
          </span>
          {a.langs.includes(otherLang) ? (
            <Link href={`/articles/${a.slug}${otherLang === "ja" ? "" : `?lang=${otherLang}`}`} className="link-inline" hrefLang={otherLang} lang={otherLang}>{t.other}</Link>
          ) : null}
        </p>
        <p><span className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 text-sm text-indigo-800">{STAGE_LABEL[lang][a.stage]}</span></p>
        <h1 className="h-page">{a.title}</h1>
        <p className="text-lg text-slate-700">{a.description}</p>
        {a.pr ? (
          // 設計原則8: PR表記必須。本文より前に、言語ごとに出す（ステマ規制）
          <p className="notice notice-warn">
            <span className="font-bold">{t.pr}</span>
            <span className="block">{t.prBody}</span>
            {a.programs.map((p) => <span key={p} className="block">{PROGRAM_TEXT[lang][p]}</span>)}
          </p>
        ) : null}
      </header>

      <div className="space-y-4">
        <Blocks blocks={a.blocks} skipH1 sponsored={a.pr} />
      </div>

      {a.sources.length > 0 ? (
        <section className="card card-quiet space-y-2">
          <h2 className="h-section">{t.sources}</h2>
          <ul className="space-y-1">
            {a.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="link-inline">{s.label}</a>
                <span className="text-slate-600">・{t.checked} {fmt(s.verified_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="notice notice-muted">{t.disclaimer}</p>
      <Link href="/navi" className="btn btn-primary w-full">{t.navi}</Link>
    </article>
  );
}
