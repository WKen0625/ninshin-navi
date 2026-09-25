import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listArticles } from "@/lib/articles";
import { articleOf, columnsOf, ENGLISH_HINT, FOREIGN_LANGS, HOME, isLang, type Lang } from "@/lib/i18n";
import { loadServiceArea } from "@/lib/service-area";

type Params = { params: Promise<{ lang: string }> };

// 日本語以外のトップページ（/en /zh /ko /ru）。文言は lib/i18n.ts の HOME
export function generateStaticParams() {
  return FOREIGN_LANGS.map((lang) => ({ lang }));
}
export const dynamicParams = false;

const TITLE: Record<Exclude<Lang, "ja">, { title: string; description: string }> = {
  en: { title: "Tsugiraku｜Know your next step in pregnancy paperwork in Tokyo", description: "Enter your ward, due date and the papers you hold; get your next step, hospital booking deadlines and your estimated out-of-pocket cost. Every figure with its official source and check date." },
  zh: { title: "Tsugiraku｜东京的怀孕・分娩手续，马上知道下一步", description: "输入居住的区、预产期和手头的文件，即可得到下一步、分娩预约截止日和自付估算。每个数字都附官方出处和核对日期。" },
  ko: { title: "Tsugiraku｜도쿄의 임신·출산 절차, 다음 할 일을 바로", description: "사는 구·출산 예정일·갖고 있는 서류를 입력하면 다음 할 일, 분만 예약 마감, 실제 부담 추정이 나옵니다. 모든 숫자에 공식 출처와 확인일." },
  ru: { title: "Tsugiraku｜Документы при беременности в Токио: следующий шаг", description: "Введите район, дату родов и имеющиеся документы — получите следующий шаг, сроки записи в роддом и ориентировочную доплату. Каждая цифра с официальным источником и датой проверки." },
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang) || lang === "ja") return {};
  return { ...TITLE[lang], alternates: { canonical: `/${lang}`, languages: { ja: "/", en: "/en", zh: "/zh", ko: "/ko", ru: "/ru" } } };
}

export default async function HomeIntl({ params }: Params) {
  const { lang } = await params;
  if (!isLang(lang) || lang === "ja") notFound();
  const t = HOME[lang];
  const area = loadServiceArea();
  const articles = listArticles(lang).slice(0, 3);
  return (
    <div className="space-y-10" lang={lang}>
      <section className="space-y-5">
        <p className="chip-ai">{t.chip}</p>
        <h1 className="text-[2.2rem] leading-[1.15] font-bold tracking-tight text-ink sm:text-[2.6rem]">
          {t.h1a}
          <span className="block bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">{t.h1b}</span>
        </h1>
        <p className="text-lg leading-relaxed text-slate-700">{t.lead}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/navi" className="btn btn-primary text-lg sm:flex-1">{t.navi}</Link>
          <Link href={columnsOf(lang)} className="btn btn-ghost text-lg sm:flex-1">{t.columns}</Link>
        </div>
        <p className="notice notice-info">{t.naviNote}</p>
        {ENGLISH_HINT[lang] ? (
          <p className="text-base">
            <Link href="/en" hrefLang="en" className="link">{ENGLISH_HINT[lang]}</Link>
          </p>
        ) : null}
      </section>

      <section aria-labelledby="promises" className="space-y-4">
        <h2 id="promises" className="h-section">{t.promises}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {t.promise.map((p) => (
            <li key={p.title} className="card space-y-2">
              <h3 className="text-lg leading-snug font-bold text-ink">{p.title}</h3>
              <p className="text-base text-slate-700">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how" className="space-y-4">
        <h2 id="how" className="h-section">{t.how}</h2>
        <ol className="space-y-3">
          {t.steps.map((s, i) => (
            <li key={s.title} className="card flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-bold text-white">{i + 1}</span>
              <div>
                <h3 className="text-lg font-bold text-ink">{s.title}</h3>
                <p className="text-base text-slate-700">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="scope" className="card card-ai space-y-2">
        <h2 id="scope" className="h-section">{t.coverage}</h2>
        <p className="text-base text-slate-700">{t.coverageBody(area.municipalities.length, area.contact)}</p>
      </section>

      {articles.length > 0 ? (
        <section aria-labelledby="columns" className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 id="columns" className="h-section">{t.columnsTitle}</h2>
            <Link href={columnsOf(lang)} className="link">{t.allColumns}</Link>
          </div>
          <ul className="space-y-3">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link href={articleOf(a.slug, lang)} className="card block space-y-1 transition hover:bg-white">
                  <span className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <time dateTime={a.published}>{a.published.replaceAll("-", "/")}</time>
                    {a.pr ? <span className="rounded-md border border-amber-300 bg-amber-50 px-1.5 text-amber-800">PR</span> : null}
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
        <h2 id="operator" className="h-section">{t.operator}</h2>
        <p>{t.operatorBody(area.contact)}</p>
        <p className="flex flex-wrap gap-x-4">
          <Link href="/terms" className="link">{t.terms}</Link>
          <Link href="/policy" className="link">{t.policy}</Link>
        </p>
      </section>
    </div>
  );
}
