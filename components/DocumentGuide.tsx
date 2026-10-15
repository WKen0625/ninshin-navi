"use client";

import type { DocumentDef, Step } from "@/lib/next-actions";
import { PAPER_VARIANT_LABEL, paperVariantOf } from "@/lib/paper";
import { Icon, IconTile, type IconName, type Tone } from "./Icon";
import { PaperIllustration } from "./PaperIllustration";
import { SourceLink } from "./SourceLink";

type Issuer = "hospital" | "ward" | "employer" | "insurer" | "tokyo" | "national" | "other";
const ISSUER: Record<Issuer, { label: string; icon: IconName; tone: Tone }> = {
  hospital: { label: "病院・産院でもらう紙", icon: "hospital", tone: "sky" },
  ward: { label: "区役所・保健センターでもらう紙", icon: "building", tone: "blue" },
  employer: { label: "勤務先でもらう紙", icon: "briefcase", tone: "green" },
  insurer: { label: "健康保険からの紙", icon: "shield", tone: "green" },
  tokyo: { label: "東京都からの紙", icon: "tower", tone: "violet" },
  national: { label: "国からの紙", icon: "japan", tone: "slate" },
  other: { label: "そのほか", icon: "document", tone: "slate" },
};
const ORDER: Issuer[] = ["hospital", "ward", "employer", "insurer", "tokyo", "national", "other"];

/**
 * 「もらった紙はどれ？」病院で初めての健診（10週ごろ〜）にまとめて渡される紙や、区の袋の中身を、
 * 紙の絵（形＝種類、帯の色＝発行元）で見分ける。押すと「何の紙か」「どうするか」「関係する手続き」が出る。
 * 中身は documents（データ）。選択肢用の紙（まだ紙がない・その他）は出さない。
 */
export function DocumentGuide({ documents, steps, regionCode }: { documents: DocumentDef[]; steps: Step[]; regionCode: string }) {
  const nameOf = new Map(documents.map((d) => [d.id, d.name ?? d.id]));
  const list = documents.filter((d) => d.issued_by || d.description || d.includes.length > 0).filter((d) => !/\.(none_yet|other)$/.test(d.id));
  // 区のファイルにある紙で issued_by が無いものは、区役所・保健センターの紙とみなす
  const issuer = (d: DocumentDef): Issuer => d.issued_by ?? (/^\d{5}$/.test(d.region_code ?? "") ? "ward" : "other");
  const groups = ORDER.map((k) => ({ key: k, ...ISSUER[k], docs: list.filter((d) => issuer(d) === k) })).filter((g) => g.docs.length > 0);
  for (const g of groups) g.docs.sort((a, b) => Number(b.region_code === regionCode) - Number(a.region_code === regionCode));
  return (
    <div className="space-y-5">
      <p className="text-base text-gray-700">絵の形が紙の種類、帯の色が「誰がくれた紙か」です。押すと「何の紙か」「どうするか」が出ます。</p>
      {groups.map((g) => (
        <section key={g.key} className="space-y-2">
          <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
            <IconTile name={g.icon} tone={g.tone} size="size-9" />
            {g.label}
            <span className="text-base font-normal text-slate-500">{g.docs.length}枚</span>
          </h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {g.docs.map((d) => {
              const related = steps.filter((s) => s.trigger_document_id === d.id || s.produces_document_id === d.id);
              const variant = paperVariantOf(d);
              return (
                <li key={d.id} className="col-span-1">
                  <details className="group h-full rounded-2xl border-2 border-slate-200 bg-white open:col-span-2 open:border-indigo-300">
                    <summary className="flex min-h-11 cursor-pointer list-none flex-col items-center gap-1 p-3 text-center [&::-webkit-details-marker]:hidden">
                      <PaperIllustration variant={variant} issuer={g.key} />
                      <span className="text-base leading-snug font-bold text-ink">{d.name ?? d.id}</span>
                      <span className="text-sm text-slate-500">{PAPER_VARIANT_LABEL[variant]}</span>
                      <span aria-hidden="true" className="mt-1 grid size-7 place-items-center rounded-full bg-indigo-50 text-indigo-600 transition group-open:rotate-180"><Icon name="next" className="size-4 rotate-90" /></span>
                    </summary>
                    <div className="space-y-2 border-t-2 border-slate-100 p-3 text-base">
                      {d.aliases?.length ? <p className="text-gray-600">別の呼び方: {d.aliases.join("、")}</p> : null}
                      {d.description ? <p><span className="font-bold">何の紙か: </span>{d.description}</p> : null}
                      {d.what_to_do ? <p className="notice notice-info"><span className="font-bold">どうするか: </span>{d.what_to_do}</p> : null}
                      {d.includes.length > 0 ? <p className="text-gray-600">中に入っている紙: {d.includes.map((i) => nameOf.get(i) ?? i).join("、")}</p> : null}
                      {related.length > 0 ? <p className="text-gray-600">関係する手続き: {related.map((s) => s.title).join("／")}</p> : null}
                      {d.source_url ? <SourceLink url={d.source_url} verifiedAt={d.verified_at} /> : null}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
