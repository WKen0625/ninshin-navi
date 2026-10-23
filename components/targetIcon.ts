import type { ApplyTo } from "@/lib/apply-to";
import type { IconName, Tone } from "./Icon";

/** 窓口の種類を絵で見せる: 区役所＝建物（青）／東京都＝柱の建物（紫）／国＝日の丸（灰）／勤務先・健康保険＝かばん（緑）／医療機関＝病院（空色）。
 *  サーバーの部品からも使えるように、"use client" の無いファイルに置く */
export const TARGET_ICON: Record<ApplyTo, { icon: IconName; tone: Tone }> = {
  ward: { icon: "building", tone: "blue" },
  tokyo: { icon: "tower", tone: "violet" },
  national: { icon: "japan", tone: "slate" },
  employer: { icon: "briefcase", tone: "green" },
  facility: { icon: "hospital", tone: "sky" },
};
