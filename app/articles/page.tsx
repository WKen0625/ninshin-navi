import type { Metadata } from "next";
import Link from "next/link";
import { isLang, isStage, listArticles, STAGE_LABEL, STAGES, type Lang, type Stage } from "@/lib/articles";

export const metadata: Metadata = { title: "負担軽減コラム｜Tsugiraku" };

const T: Record<Lang, { title: string; lead: string; pr: string; other: string; none: string; switch_: string }> = {
  ja: {
    title: "負担軽減コラム",
    lead: "妊娠・出産の手続きと準備の負担を軽くするための読みものです。周期（妊娠初期・中期・後期・出産・産後）で絞れます。制度の数字には出典と確認日を添え、製品を紹介するコラムは先頭に「PR」と明記します。",
    pr: "PR",
    other: "English",
    none: "コラムはまだありません。",
    switch_: "English columns",
  },
  en: {
    title: "Columns",
    lead: "Practical columns to lighten the load of pregnancy and childbirth paperwork in Tokyo, filterable by stage. Every figure links to its official source with the date we checked it. Columns that mention products are marked “PR” at the top.",
    pr: "PR",
    other: "日本語",
    none: "No columns yet.",
    switch_: "日本語のコラム",
  },
};

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ lang?: string; stage?: string }> }) {
  const { lang: raw, stage: rawStage } = await searchParams;
  const lang: Lang = isLang(raw) ? raw : "ja";
  const stage: Stage = isStage(rawStage) ? rawStage : "all";
  const t = T[lang];
  const articles = listArticles(lang, stage);
  const otherLang: Lang = lang === "ja" ? "en" : "ja";
  const href = (s: Stage, l: Lang = lang) => `/articles?${new URLSearchParams({ ...(l === "ja" ? {} : { lang: l }), ...(s === "all" ? {} : { stage: s }) }).toString()}`.replace(/\?$/, "");
  return (
    <div className="space-y-6" lang={lang}>
      <header className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="h-page">{t.title}</h1>
          <Link href={href(stage, otherLang)} className="link" hrefLang={otherLang} lang={otherLang}>{t.switch_}</Link>
        </div>
        <p className="text-base text-slate-700">{t.lead}</p>
      </header>
      <nav aria-label={lang === "ja" ? "周期で絞る" : "Filter by stage"} className="flex flex-wrap gap-1 rounded-2xl border border-white/70 bg-white/70 p-1">
        {STAGES.map((s) => (
          <Link
            key={s}
            href={href(s)}
            aria-current={s === stage ? "page" : undefined}
            className={`min-h-11 flex-1 rounded-xl px-2 py-2 text-center text-sm font-bold leading-tight whitespace-nowrap ${s === stage ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm" : "text-slate-700 hover:bg-white"}`}
          >
            {s === "all" ? (lang === "ja" ? "すべて" : "All") : STAGE_LABEL[lang][s]}
          </Link>
        ))}
      </nav>
      {articles.length === 0 ? (
        <p className="notice notice-muted">{t.none}</p>
      ) : (
        <ul className="space-y-3">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link href={`/articles/${a.slug}${lang === "ja" ? "" : `?lang=${lang}`}`} className="card block space-y-1 transition hover:bg-white">
                <span className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <time dateTime={a.published}>{a.published.replaceAll("-", "/")}</time>
                  <span className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 text-indigo-800">{STAGE_LABEL[lang][a.stage]}</span>
                  {a.pr ? <span className="rounded-md border border-amber-300 bg-amber-50 px-1.5 text-amber-800">{t.pr}</span> : null}
                  {a.langs.includes(otherLang) ? <span className="rounded-md border border-slate-300 px-1.5" lang={otherLang}>{t.other}</span> : null}
                </span>
                <span className="block text-lg leading-snug font-bold text-ink">{a.title}</span>
                <span className="block text-base text-slate-700">{a.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
