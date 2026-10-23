import Link from "next/link";
import { DOCUMENT_FROM_LABEL, FORM_FROM_LABEL } from "@/lib/apply-guide";
import { classifyApplyTo } from "@/lib/apply-to";
import { paperVariantOf } from "@/lib/paper";
import { amountText, contactForStep, subsidyForStep, windowText, ym, type PublicModel, type PublicStep } from "@/lib/public-model";
import { absUrl } from "@/lib/site";
import { suggestWho, WHO_LABEL } from "@/lib/who";
import { ApplyToChips } from "../ApplyWindow";
import { ContactBox } from "../ContactBox";
import { Icon, IconTile, SectionHeading, type IconName } from "../Icon";
import { PaperIllustration } from "../PaperIllustration";
import { SourceLink } from "../SourceLink";
import { TARGET_ICON } from "../targetIcon";
import { Breadcrumbs } from "./Breadcrumbs";
import { JsonLd } from "./JsonLd";
import { NaviCta } from "./NaviCta";
import { StepLink } from "./StepLink";

function Fact({ icon, label, children, strong = false }: { icon: IconName; label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} className={`mt-1 size-6 shrink-0 ${strong ? "text-amber-800" : "text-indigo-600"}`} />
      <div className="min-w-0">
        <p className="text-base font-bold text-slate-600">{label}</p>
        <div className={`text-lg ${strong ? "font-bold text-amber-900" : "text-ink"}`}>{children}</div>
      </div>
    </div>
  );
}

type Issuer = "hospital" | "ward" | "employer" | "insurer" | "tokyo" | "national" | "other";

/** 手続き1件の公開ページ（区の手続き・23区共通の手続きの両方） */
export function PublicStepView({ p, m }: { p: PublicStep; m: PublicModel }) {
  const { step, ward } = p;
  const data = m.data;
  const place = ward ? ward.name : "東京23区";
  const targets = classifyApplyTo(step.channel, step.region_code);
  const mark = TARGET_ICON[targets[0] ?? "ward"];
  const win = windowText(step, data.documents);
  const subsidy = subsidyForStep(step, ward?.code ?? null, data);
  const contact = contactForStep(step, ward?.code ?? null, data);
  const guide = step.apply_guide ?? subsidy?.apply_guide ?? null;
  // 実際に受け取る紙だけ（「心拍を確認した」のような入口の選択肢は出さない）
  const papers = data.documents
    .filter((d) => d.id === step.trigger_document_id || d.id === step.produces_document_id)
    .filter((d) => d.issued_by || d.what_to_do || d.includes.length > 0);
  const siblings = (ward ? m.chainOf(ward.code) : m.sharedSteps).filter((x) => x.step.phase === step.phase && x.step.id !== step.id && x.step.requires !== "loss").slice(0, 8);
  const otherWards = p.topic ? m.wards.flatMap((w) => (m.wardSteps.get(w.code) ?? []).filter((x) => x.topic?.slug === p.topic!.slug && w.code !== ward?.code).slice(0, 1)) : [];
  const overriding = ward ? [] : m.wards.flatMap((w) => (m.wardSteps.get(w.code) ?? []).filter((x) => x.step.overrides_step_id === step.id));
  const compare = p.topic ? m.compare.find((c) => c.topic.slug === p.topic!.slug) : null;
  const amount = subsidy ? (amountText(subsidy) ?? subsidy.amount_note) : null;
  const crumbs = [
    { name: "トップ", href: "/" },
    { name: "東京23区の手続き", href: "/tokyo" },
    ...(ward ? [{ name: ward.name, href: `/tokyo/${ward.slug}` }] : [{ name: "23区共通", href: "/tokyo#common" }]),
    { name: p.topic?.label ?? step.title, href: p.url },
  ];

  return (
    <article className="space-y-7">
      <Breadcrumbs items={crumbs} />
      <header className="space-y-3">
        <p className="chip-ai">{ward ? `東京都${ward.name}の手続き` : "東京23区共通（国・東京都の制度）"}</p>
        <h1 className="flex items-start gap-3 text-[1.9rem] leading-tight font-bold text-ink">
          <IconTile name={mark.icon} tone={mark.tone} size="size-14" />
          <span>{step.title}</span>
        </h1>
        <p className="text-lg text-slate-700">
          {place}{ward ? "" : "のどの区でも同じ"}の手続きです。いつから・いつまでに・どこで・何を持って行くかを、{ward ? "区" : "国・東京都"}の公式ページをもとにまとめました（{ym(step.verified_at)}に確認）。
        </p>
        {step.needs_review ? <p className="notice notice-warn">出典のページに変更があり、内容を確認中です。窓口や公式ページで最新の情報を確かめてください。</p> : null}
      </header>

      <section aria-label="要点" className="card space-y-4">
        <Fact icon="building" label="どこで（窓口）">
          <ApplyToChips targets={targets} />
          {step.channel ? <span className="mt-1 block text-base">{step.channel}</span> : null}
        </Fact>
        {win.from ? <Fact icon="calendar" label="いつから">{win.from}</Fact> : null}
        {win.until ? <Fact icon="clock" label="いつまで（期限）" strong>{win.until}</Fact> : null}
        {amount ? <Fact icon="money" label="金額">{amount}</Fact> : null}
        <Fact icon="heart" label="誰が行く（目安）">{WHO_LABEL[suggestWho(step)]}<span className="block text-base text-slate-600">代理や郵送の可否は窓口で確認してください。</span></Fact>
        {step.action_url ? (
          <a href={step.action_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-wide">
            <Icon name="external" className="size-5" />
            公式の手続きページを開く
          </a>
        ) : null}
      </section>

      {step.detail ? (
        <section className="space-y-2">
          <SectionHeading icon="document">やり方</SectionHeading>
          <p className="text-base leading-relaxed whitespace-pre-line">{step.detail}</p>
        </section>
      ) : null}

      {guide?.documents?.length || guide?.form || guide?.how_to ? (
        <section className="space-y-2">
          <SectionHeading icon="pen">出す書類・用紙</SectionHeading>
          {guide.documents?.length ? (
            <ul className="space-y-1">
              {guide.documents.map((d) => (
                <li key={d.name} className="flex flex-wrap items-start gap-2 text-base">
                  <span className="rounded-md border border-slate-300 bg-slate-50 px-1.5 font-bold text-slate-700">{DOCUMENT_FROM_LABEL[d.from]}</span>
                  <span>{d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="link-inline">{d.name}</a> : d.name}{d.note ? <span className="block text-slate-600">{d.note}</span> : null}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {guide.form ? (
            <p className="text-base"><span className="font-bold">用紙: </span>{guide.form.url ? <a href={guide.form.url} target="_blank" rel="noopener noreferrer" className="link-inline">{FORM_FROM_LABEL[guide.form.from]}</a> : FORM_FROM_LABEL[guide.form.from]}{guide.form.note ? `（${guide.form.note}）` : ""}</p>
          ) : null}
          {guide.how_to ? <p className="text-base whitespace-pre-line">{guide.how_to.replaceAll("  ", "\n")}</p> : null}
        </section>
      ) : null}

      {papers.length > 0 ? (
        <section className="space-y-2">
          <SectionHeading icon="document">関係する紙</SectionHeading>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {papers.map((d) => {
              const issuer = (d.issued_by ?? (/^\d{5}$/.test(d.region_code ?? "") ? "ward" : "other")) as Issuer;
              return (
                <li key={d.id} className="card card-quiet flex flex-col items-center gap-1 p-3 text-center">
                  <PaperIllustration variant={paperVariantOf(d)} issuer={issuer} />
                  <span className="text-base leading-snug font-bold text-ink">{d.name}</span>
                  {d.what_to_do ? <span className="text-sm text-slate-600">{d.what_to_do}</span> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {subsidy && (subsidy.conditions || subsidy.amount_note) ? (
        <section className="space-y-2">
          <SectionHeading icon="money" tone="green">お金の条件</SectionHeading>
          {subsidy.conditions ? <p className="text-base"><span className="font-bold">対象: </span>{subsidy.conditions}</p> : null}
          {subsidy.amount_note ? <p className="text-base"><span className="font-bold">金額: </span>{subsidy.amount_note}</p> : null}
          <SourceLink url={subsidy.source_url} verifiedAt={subsidy.verified_at} needsReview={subsidy.needs_review} />
        </section>
      ) : null}

      <section className="space-y-2">
        <SectionHeading icon="phone" tone="blue">困ったら、ここに聞く</SectionHeading>
        {contact ? <ContactBox contact={contact} fallback={[]} heading={false} /> : <p className="text-base">住んでいる区の子育て・母子保健の窓口に聞いてください。<Link href="/tokyo" className="link-inline">区ごとの手続き一覧</Link>から、区の問い合わせ先を確かめられます。</p>}
      </section>

      <NaviCta ward={ward} />

      <section className="space-y-1">
        <p className="text-base font-bold text-ink">出典と確認日</p>
        <SourceLink url={step.source_url} verifiedAt={step.verified_at} needsReview={step.needs_review} />
      </section>

      {siblings.length > 0 ? (
        <section className="space-y-2">
          <SectionHeading icon="calendar" tone="violet">同じ時期のほかの手続き（{place}）</SectionHeading>
          <ul className="space-y-2">{siblings.map((x) => <StepLink key={x.url} p={x} documents={data.documents} />)}</ul>
          {ward ? <Link href={`/tokyo/${ward.slug}`} className="link">{ward.name}の手続きをすべて見る</Link> : null}
        </section>
      ) : null}

      {otherWards.length > 0 && p.topic ? (
        <section className="space-y-2">
          <SectionHeading icon="pin" tone="sky">ほかの区の「{p.topic.label}」</SectionHeading>
          <ul className="flex flex-wrap gap-2">
            {otherWards.map((x) => (
              <li key={x.url}><Link href={x.url} className="inline-flex min-h-11 items-center rounded-xl border-2 border-slate-200 bg-white px-3 text-base font-bold text-ink hover:border-indigo-300">{x.ward!.name}</Link></li>
            ))}
          </ul>
          {compare ? <Link href={`/tokyo/compare/${compare.topic.slug}`} className="link">23区の「{compare.topic.label}」を比べる</Link> : null}
        </section>
      ) : null}

      {overriding.length > 0 ? (
        <section className="space-y-2">
          <SectionHeading icon="building" tone="blue">区の決まりで手続きが違う区</SectionHeading>
          <ul className="flex flex-wrap gap-2">
            {overriding.map((x) => (
              <li key={x.url}><Link href={x.url} className="inline-flex min-h-11 items-center rounded-xl border-2 border-slate-200 bg-white px-3 text-base font-bold text-ink hover:border-indigo-300">{x.ward!.name}</Link></li>
            ))}
          </ul>
        </section>
      ) : null}

      {!ward ? (
        <section className="space-y-2">
          <SectionHeading icon="pin" tone="sky">区ごとの手続き一覧</SectionHeading>
          <ul className="flex flex-wrap gap-2">
            {m.wards.map((w) => (
              <li key={w.code}><Link href={`/tokyo/${w.slug}`} className="inline-flex min-h-11 items-center rounded-xl border-2 border-slate-200 bg-white px-3 text-base font-bold text-ink hover:border-indigo-300">{w.name}</Link></li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="notice notice-muted">この案内は手続きの説明です。医療の判断はしません。最終確認は窓口・医療機関へ。</p>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: step.title,
          url: absUrl(p.url),
          inLanguage: "ja",
          dateModified: step.verified_at,
          isBasedOn: step.source_url,
          about: {
            "@type": "GovernmentService",
            name: step.title,
            areaServed: ward ? `東京都${ward.name}` : "東京都23区",
            ...(ward ? { provider: { "@type": "GovernmentOrganization", name: `東京都${ward.name}` } } : {}),
          },
        }}
      />
    </article>
  );
}
