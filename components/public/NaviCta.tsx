import Link from "next/link";
import type { Ward } from "@/lib/wards";
import { Icon } from "../Icon";

/** 公開ページから Navi へ: 自分の予定日で期限を出す（区を選んだ状態で入口を開く） */
export function NaviCta({ ward }: { ward: Ward | null }) {
  return (
    <section className="card card-hero space-y-3">
      <p className="text-xl font-bold text-ink">{ward ? `${ward.name}で、あなたの予定日から期限を出す` : "あなたの区と予定日から、期限を出す"}</p>
      <p className="text-base text-slate-700">予定日と手元の紙を入れると、いまやることを1件ずつ、期限の日付つきで出します。名前もログインも要りません。約2分です。</p>
      <Link href={ward ? `/navi?region=${ward.code}` : "/navi"} className="btn btn-primary btn-wide">
        <Icon name="next" className="size-6" />
        Tsugiraku Naviで期限を出す
      </Link>
    </section>
  );
}
