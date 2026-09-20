// 「病院と締切」の並べ方と締切の計算。決定的（設計原則2）。
// 設計原則10: おすすめ順や評価は付けない。並びは「施設が公表している締切週が早い順」だけ。
// 設計原則8: この画面のデータに広告・製品を混ぜない。

import { addDays, gestationalWeek, lmpOf, type Family } from "./next-actions";

export type Facility = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  facility_type: string | null;
  has_epidural: boolean | null;
  epidural_24h: boolean | null;
  tokyo_epidural_subsidy_target: boolean | null;
  booking_policy: string | null;
  booking_deadline_week_official: number | null;
  booking_source_url: string | null;
  scheme: "lumpsum" | "new_scheme" | "both";
  birth_navi_url: string | null;
  website_url: string | null;
  source_url: string;
  verified_at: string;
  needs_review: boolean;
  /** 出産なびの費用（総額）。中央値が無ければ平均値 */
  cost: { yen: number; basis: "median" | "average"; period: string | null } | null;
};

/** 記録の集計（v_booking_stats）。予定月ごと */
export type BookingStat = {
  facility_id: string;
  due_month: string;
  reports: number;
  booked: number;
  full_or_wait: number;
  median_week_booked: number | null;
  /** 施設から言われた締切を記録した人の数と、その中央値（妊娠◯週まで） */
  told_reports?: number;
  median_told_deadline_week?: number | null;
  median_deposit_yen?: number | null;
};

export type FacilityItem = {
  facility: Facility;
  /** 施設が公表する締切週（妊娠◯週まで）を、この家族の日付に直したもの */
  deadline: string | null;
  /** 締切週まであと何週か（今週が締切週なら 0、過ぎていれば負） */
  weeks_left: number | null;
  status: "open" | "this_week" | "passed" | "unknown" | "after_birth";
  /** この家族の予定月の記録 */
  stat: BookingStat | null;
};

export function listFacilities(input: {
  facilities: Facility[];
  stats: BookingStat[];
  family: Family;
  today: string;
  /** true なら、無痛分娩ができると確認できた施設だけにする */
  onlyEpidural: boolean;
}): FacilityItem[] {
  const { facilities, stats, family, today, onlyEpidural } = input;
  const week = gestationalWeek(family.due_date, today);
  const dueMonth = `${family.due_date.slice(0, 7)}-01`;

  return facilities
    .filter((f) => !onlyEpidural || f.has_epidural === true)
    .map((facility): FacilityItem => {
      const official = facility.booking_deadline_week_official;
      const stat = stats.find((s) => s.facility_id === facility.id && s.due_month.slice(0, 10) === dueMonth) ?? null;
      if (family.birth_date) return { facility, deadline: null, weeks_left: null, status: "after_birth", stat };
      if (official == null) return { facility, deadline: null, weeks_left: null, status: "unknown", stat };
      const weeks_left = official - week;
      return {
        facility,
        // 「妊娠◯週まで」= ◯週0日
        deadline: addDays(lmpOf(family.due_date), official * 7),
        weeks_left,
        status: weeks_left < 0 ? "passed" : weeks_left === 0 ? "this_week" : "open",
        stat,
      };
    })
    .sort((a, b) => {
      const wa = a.facility.booking_deadline_week_official;
      const wb = b.facility.booking_deadline_week_official;
      if (wa !== wb) {
        if (wa == null) return 1;
        if (wb == null) return -1;
        return wa - wb;
      }
      return a.facility.name.localeCompare(b.facility.name, "ja") || (a.facility.id < b.facility.id ? -1 : 1);
    });
}
