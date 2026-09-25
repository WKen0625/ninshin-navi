import type { Metadata } from "next";
import Link from "next/link";
import { isLang, isStage, listArticles, STAGE_LABEL, STAGES, type Lang, type Stage } from "@/lib/articles";
import { articleOf, columnsOf, ENGLISH_HINT, LANG_NAME, LANGS, LIST } from "@/lib/i18n";

export const metadata: Metadata = { title: "負担軽減コラム｜Tsugiraku" };

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ lang?: string; stage?: string }> }) {
  const { lang: raw, stage: rawStage } = await searchParams;
  const lang: Lang = isLang(raw) ? raw : "ja";
  const stage: Stage = isStage(rawStage) ? rawStage : "all";
  const t = LIST[lang];
  const articles = listArticles(lang, stage);
  return (
    <div className="space-y-6" lang={lang}>
      <header className="space-y-2">
        <h1 className="h-page">{t.title}</h1>
        <p className="text-base text-slate-700">{t.lead}</p>
        {ENGLISH_HINT[lang] ? <p className="text-base"><Link href={columnsOf("en", stage)} hrefLang="en" className="link">{ENGLISH_HINT[lang]}</Link></p> : null}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
          <span>{t.alsoIn}:</span>
          {LANGS.filter((l) => l !== lang).map((l) => (
            <Link key={l} href={columnsOf(l, stage)} className="link-inline" hrefLang={l} lang={l}>{LANG_NAME[l]}</Link>
          ))}
        </p>
      </header>
      <nav aria-label={t.filter} className="flex flex-wrap gap-1 rounded-2xl border border-white/70 bg-white/70 p-1">
        {STAGES.map((s) => (
          <Link
            key={s}
            href={columnsOf(lang, s)}
            aria-current={s === stage ? "page" : undefined}
            className={`min-h-11 flex-1 rounded-xl px-2 py-2 text-center text-sm font-bold leading-tight whitespace-nowrap ${s === stage ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm" : "text-slate-700 hover:bg-white"}`}
          >
            {s === "all" ? t.all : STAGE_LABEL[lang][s]}
          </Link>
        ))}
      </nav>
      {articles.length === 0 ? (
        <p className="notice notice-muted">{t.none}</p>
      ) : (
        <ul className="space-y-3">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link href={articleOf(a.slug, lang)} className="card block space-y-1 transition hover:bg-white">
                <span className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <time dateTime={a.published}>{a.published.replaceAll("-", "/")}</time>
                  <span className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 text-indigo-800">{STAGE_LABEL[lang][a.stage]}</span>
                  {a.pr ? <span className="rounded-md border border-amber-300 bg-amber-50 px-1.5 text-amber-800">{t.pr}</span> : null}
                  {a.langs.filter((l) => l !== lang).map((l) => <span key={l} className="rounded-md border border-slate-300 px-1.5" lang={l}>{LANG_NAME[l]}</span>)}
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
