"use client";

import type { DocumentDef, Step } from "@/lib/next-actions";
import { Disclosure } from "./Disclosure";
import { SourceLink } from "./SourceLink";

const ISSUER: Record<string, string> = { hospital: "病院・産院でもらう紙", ward: "区役所・保健センターでもらう紙", employer: "勤務先でもらう紙", insurer: "健康保険からの紙", tokyo: "東京都からの紙", national: "国からの紙", other: "そのほか" };
const ORDER = ["hospital", "ward", "employer", "insurer", "tokyo", "national", "other"];

/**
 * 「もらった紙はどれ？」病院で初めての健診（10週ごろ〜）にまとめて渡される紙や、区の袋の中身を、
 * 「何の紙か」「どうするか」「関係する手続き」で見分ける。中身は documents（データ）。選択肢用の紙（まだ紙がない・その他）は出さない。
 */
export function DocumentGuide({ documents, steps, regionCode }: { documents: DocumentDef[]; steps: Step[]; regionCode: string }) {
  const nameOf = new Map(documents.map((d) => [d.id, d.name ?? d.id]));
  const list = documents.filter((d) => d.issued_by || d.description || d.includes.length > 0).filter((d) => !/\.(none_yet|other)$/.test(d.id));
  // 区のファイルにある紙で issued_by が無いものは、区役所・保健センターの紙とみなす
  const issuer = (d: DocumentDef) => d.issued_by ?? (/^\d{5}$/.test(d.region_code ?? "") ? "ward" : "other");
  const groups = ORDER.map((k) => ({ key: k, label: ISSUER[k], docs: list.filter((d) => issuer(d) === k) })).filter((g) => g.docs.length > 0);
  // 区の紙は自分の区のものを先に
  for (const g of groups) g.docs.sort((a, b) => Number(b.region_code === regionCode) - Number(a.region_code === regionCode));
  return (
    <div className="space-y-3">
      <p className="text-base text-gray-700">病院や区でまとめて渡される紙を、名前から探せます。押すと「何の紙か」「どうするか」が出ます。</p>
      {groups.map((g) => (
        <Disclosure key={g.key} summary={`${g.label}（${g.docs.length}）`}>
          <ul className="space-y-2">
            {g.docs.map((d) => {
              const related = steps.filter((s) => s.trigger_document_id === d.id || s.produces_document_id === d.id);
              return (
                <li key={d.id}>
                  <Disclosure summary={d.name ?? d.id} className="bg-white/80">
                    {d.aliases?.length ? <p className="text-gray-600">別の呼び方: {d.aliases.join("、")}</p> : null}
                    {d.description ? <p><span className="font-bold">何の紙か: </span>{d.description}</p> : null}
                    {d.what_to_do ? <p className="notice notice-info"><span className="font-bold">どうするか: </span>{d.what_to_do}</p> : null}
                    {d.includes.length > 0 ? <p className="text-gray-600">中に入っている紙: {d.includes.map((i) => nameOf.get(i) ?? i).join("、")}</p> : null}
                    {related.length > 0 ? (
                      <p className="text-gray-600">関係する手続き: {related.map((s) => s.title).join("／")}</p>
                    ) : null}
                    {d.source_url ? <SourceLink url={d.source_url} verifiedAt={d.verified_at} /> : null}
                  </Disclosure>
                </li>
              );
            })}
          </ul>
        </Disclosure>
      ))}
    </div>
  );
}
