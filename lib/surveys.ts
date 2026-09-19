// 完了チェック直後の「任意の1問」（設計原則7）。質問の中身は data/surveys.yaml が正で、コードは型ごとの扱いだけを持つ。
// ここは純粋関数だけ（ブラウザでもサーバーでも使う）。YAMLの読み込みは lib/surveys-server.ts。

export type SurveyOption = { value: string | number | boolean | null; label: string };

export type SurveyField = {
  key: string;
  label: string;
  type: "select_facility" | "month" | "select" | "select_band" | "multi_select_product";
  options?: SurveyOption[];
  default_from?: string;
  /** 'profiles.consent_sensitive' = 任意項目への同意がある人にだけ出す */
  requires?: string;
};

export type Survey = {
  id: string;
  title: string;
  reward_text: string;
  target_table: "booking_reports" | "cost_reports" | "product_reports";
  fields: SurveyField[];
};

/** 段階1で扱う記録。製品（product_reports）は段階4以降 */
export const SUPPORTED_TABLES = ["booking_reports", "cost_reports"] as const;
export const isSupported = (s: Survey) => (SUPPORTED_TABLES as readonly string[]).includes(s.target_table);

/** YAMLの options は 8 のような値だけでも { value, label } でも書ける。 */
export function normalizeOptions(raw: unknown[], suffix = ""): SurveyOption[] {
  return raw.map((o) =>
    o != null && typeof o === "object" && "value" in o
      ? { value: (o as SurveyOption).value, label: String((o as SurveyOption).label) }
      : { value: o as SurveyOption["value"], label: `${o}${suffix}` },
  );
}

export type Answers = Record<string, string | number | boolean | null>;

export type ValidationResult =
  | { ok: true; row: Record<string, string | number | boolean | null>; listed_facility: boolean }
  | { ok: false; error: string };

/** 回答を質問の定義と突き合わせる。定義にない項目・選択肢にない値は受け取らない（自由記述なし）。 */
export function validateAnswers(input: {
  survey: Survey;
  answers: Answers;
  facilityIds: string[];
  consentSensitive: boolean;
}): ValidationResult {
  const { survey, answers, facilityIds, consentSensitive } = input;
  if (!isSupported(survey)) return { ok: false, error: "この質問はまだ受け付けていません" };

  const known = new Set(survey.fields.map((f) => f.key));
  for (const key of Object.keys(answers)) if (!known.has(key)) return { ok: false, error: `質問にない項目: ${key}` };

  const row: Record<string, string | number | boolean | null> = {};
  let listed_facility = true;

  for (const field of survey.fields) {
    const value = answers[field.key];
    // 同意が必要な任意項目は、同意がなければ値を捨てる
    if (field.requires === "profiles.consent_sensitive" && !consentSensitive) {
      row[field.key] = null;
      continue;
    }
    switch (field.type) {
      case "select_facility":
        if (value == null || value === "") listed_facility = false; // 「一覧にない」
        else if (typeof value !== "string" || !facilityIds.includes(value)) return { ok: false, error: "施設が一覧にありません" };
        row[field.key] = listed_facility ? (value as string) : null;
        break;
      case "month":
        if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return { ok: false, error: `${field.label}は YYYY-MM で` };
        row[field.key] = `${value}-01`; // 月は1日固定で保存する
        break;
      case "select":
      case "select_band": {
        const options = field.options ?? [];
        const hit = options.find((o) => o.value === (value ?? null));
        if (!hit) return { ok: false, error: `${field.label}を選んでください` };
        row[field.key] = hit.value;
        break;
      }
      default:
        return { ok: false, error: `未対応の項目: ${field.key}` };
    }
  }

  // 「答えない」（null）を選べない必須の列
  const required = survey.target_table === "booking_reports" ? ["due_month", "contacted_week", "result"] : ["birth_month", "scheme", "paid_yen"];
  for (const key of required) if (row[key] == null) return { ok: false, error: `${key} が必要です` };

  return { ok: true, row, listed_facility };
}
