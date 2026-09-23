import type { Metadata } from "next";
import Link from "next/link";
import { listArticles } from "@/lib/articles";
import { loadServiceArea } from "@/lib/service-area";

export const metadata: Metadata = {
  title: "Tsugiraku｜Know your next step in pregnancy paperwork in Tokyo",
  description: "Enter your ward, due date and the papers you hold; get your next step, hospital booking deadlines and your estimated out-of-pocket cost. Every figure with its official source and check date. No ads on hospital pages, no login.",
  alternates: { canonical: "/en", languages: { ja: "/", en: "/en" } },
};

const PROMISES = [
  { title: "Every figure has a source and a check date", body: "Each number links to the official page of your ward, Tokyo or the national government, with the date we last checked it. Anything without a source cannot be published — the system refuses it." },
  { title: "No name, no login", body: "What you enter stays in your own browser. We never handle check-up results or photos. You can see what is stored, and erase it, at any time." },
  { title: "No medical advice", body: "We cover paperwork, deadlines and money only. For anything about your health, talk to your clinic. Every screen says so." },
];

const STEPS = [
  { n: "1", title: "Enter four things", body: "Your ward, your due date, your preferences (epidural, distance) and the papers you already hold. About a minute." },
  { n: "2", title: "See one next step", body: "Pregnancy notification, handbook, hospital booking, subsidies… We highlight the single thing to do now, with its deadline and source." },
  { n: "3", title: "Hospitals, deadlines and money", body: "Where you can give birth in your ward, their published booking deadlines, and fee − lump sum − subsidies = your estimated cost." },
];

export default function HomeEn() {
  const area = loadServiceArea();
  const articles = listArticles("en").slice(0, 3);
  return (
    <div className="space-y-10" lang="en">
      <section className="space-y-5">
        <p className="chip-ai">For families expecting a baby in Tokyo's 23 wards</p>
        <h1 className="text-[2.4rem] leading-[1.15] font-bold tracking-tight text-ink sm:text-[2.8rem]">
          Pregnancy paperwork in Tokyo:
          <span className="block bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">know your next step.</span>
        </h1>
        <p className="text-lg leading-relaxed text-slate-700">
          Ward office forms, hospital booking deadlines, the money you can claim. Instead of searching everything separately, Tsugiraku shows the one thing you need to do now, with its official source.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/navi" className="btn btn-primary text-lg sm:flex-1">Open Tsugiraku Navi (Japanese)</Link>
          <Link href="/articles?lang=en" className="btn btn-ghost text-lg sm:flex-1">Read the columns in English</Link>
        </div>
        <p className="notice notice-info">
          The Navi itself is in Japanese for now. The English columns explain what it does and the paperwork you will meet, so you can use it with a translation tool or a Japanese-speaking partner. English screens are planned.
        </p>
      </section>

      <section aria-labelledby="promises" className="space-y-4">
        <h2 id="promises" className="h-section">What we promise</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PROMISES.map((p) => (
            <li key={p.title} className="card space-y-2">
              <h3 className="text-lg leading-snug font-bold text-ink">{p.title}</h3>
              <p className="text-base text-slate-700">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how" className="space-y-4">
        <h2 id="how" className="h-section">How it works</h2>
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
        <h2 id="scope" className="h-section">Coverage</h2>
        <p className="text-base text-slate-700">
          The 23 wards of Tokyo ({area.municipalities.length} wards): national, Tokyo and ward procedures, plus every facility in each ward where you can give birth. Other municipalities are not covered yet — requests to <a href={`mailto:${area.contact}`} className="link-inline">{area.contact}</a>.
        </p>
      </section>

      {articles.length > 0 ? (
        <section aria-labelledby="columns" className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 id="columns" className="h-section">Columns</h2>
            <Link href="/articles?lang=en" className="link">All columns</Link>
          </div>
          <ul className="space-y-3">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link href={`/articles/${a.slug}?lang=en`} className="card block space-y-1 transition hover:bg-white">
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
        <h2 id="operator" className="h-section">Who runs this</h2>
        <p>
          Tsugiraku Office (an individual operator). We watch every official page we cite once a week; when one changes, a person reads it before we update anything. Found a mistake? Use “report an error” on any screen, or write to <a href={`mailto:${area.contact}`} className="link-inline">{area.contact}</a>.
        </p>
        <p className="flex flex-wrap gap-x-4">
          <Link href="/terms" className="link">Terms (Japanese)</Link>
          <Link href="/policy" className="link">Privacy policy (Japanese)</Link>
        </p>
      </section>
    </div>
  );
}
