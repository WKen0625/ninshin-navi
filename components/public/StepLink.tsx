import Link from "next/link";
import { APPLY_TO_LABEL, classifyApplyTo } from "@/lib/apply-to";
import type { DocumentDef } from "@/lib/next-actions";
import { windowText, type PublicStep } from "@/lib/public-model";
import { Icon, IconTile } from "../Icon";
import { TARGET_ICON } from "../targetIcon";

/** 手続き1件へのリンク（窓口の絵・題名・期限の1行） */
export function StepLink({ p, documents }: { p: PublicStep; documents: DocumentDef[] }) {
  const targets = classifyApplyTo(p.step.channel, p.step.region_code);
  const mark = TARGET_ICON[targets[0] ?? "ward"];
  const w = windowText(p.step, documents);
  const when = w.until ? `期限: ${w.until}` : w.from ? `時期: ${w.from}` : "";
  return (
    <li>
      <Link href={p.url} className="card card-quiet flex items-start gap-3 transition hover:border-indigo-300">
        <IconTile name={mark.icon} tone={mark.tone} size="size-10" />
        <span className="min-w-0 flex-1">
          <span className="block text-lg leading-snug font-bold text-ink">{p.step.title}</span>
          <span className="block text-base text-slate-600">
            {targets.map((t) => APPLY_TO_LABEL[t]).join("・")}
            {p.ward ? "" : "・23区共通"}
            {when ? `・${when}` : ""}
          </span>
        </span>
        <Icon name="next" className="mt-2 size-5 shrink-0 text-indigo-500" />
      </Link>
    </li>
  );
}
