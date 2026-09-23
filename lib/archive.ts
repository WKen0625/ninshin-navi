// 分娩予約の記録のアーカイブ。予約を試した施設を、この端末の中にすべて残す（ログイン不要）。
// 家族の状態（ninshin-navi:v1）とは別の鍵に置くので、「入力を直す」や次の妊娠で入力し直しても消えない。
// 妊娠ごと（出産予定日ごと）にまとめる。次の子のときは、前の妊娠の記録がそのまま読める。
// サーバーに送るかどうかは記録のたびの同意で決める（sent）。ここは純粋関数だけ。localStorage の読み書きは components/useFamilyState.ts。

export const ARCHIVE_KEY = "ninshin-navi:archive";

export type BookingRecord = {
  /** 記録した日 */
  at: string;
  facility_id: string | null;
  facility_name: string;
  /** 回答（アンケートの key → 値）。表示用の要約も持つ */
  answers: Record<string, string | number | null>;
  summary: string;
  /** 同意して運営に送ったか */
  sent: boolean;
};

export type Pregnancy = {
  due_date: string;
  region_code: string;
  region_name: string;
  bookings: BookingRecord[];
};

export type Archive = { pregnancies: Pregnancy[] };

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function parseArchive(raw: string | null): Archive {
  if (!raw) return { pregnancies: [] };
  try {
    const a = JSON.parse(raw) as Partial<Archive>;
    const pregnancies = (Array.isArray(a.pregnancies) ? a.pregnancies : [])
      .filter((p) => isDate(p?.due_date) && typeof p?.region_code === "string")
      .map((p) => ({
        due_date: p.due_date,
        region_code: p.region_code,
        region_name: typeof p.region_name === "string" ? p.region_name : "",
        bookings: (Array.isArray(p.bookings) ? p.bookings : [])
          .filter((b) => isDate(b?.at) && typeof b?.facility_name === "string")
          .map((b) => ({
            at: b.at,
            facility_id: typeof b.facility_id === "string" ? b.facility_id : null,
            facility_name: b.facility_name,
            answers: b.answers && typeof b.answers === "object" ? b.answers : {},
            summary: typeof b.summary === "string" ? b.summary : "",
            sent: b.sent === true,
          })),
      }));
    return { pregnancies };
  } catch {
    return { pregnancies: [] };
  }
}

/** 記録を1件足す。同じ予定日の妊娠が無ければ作る。同じ施設に何度電話しても、全部残す（上書きしない） */
export function addBooking(archive: Archive, family: { due_date: string; region_code: string; region_name: string }, record: BookingRecord): Archive {
  const rest = archive.pregnancies.filter((p) => p.due_date !== family.due_date);
  const cur = archive.pregnancies.find((p) => p.due_date === family.due_date) ?? { ...family, bookings: [] };
  const updated = { ...cur, region_code: family.region_code, region_name: family.region_name, bookings: [...cur.bookings, record] };
  // 予定日の新しい順
  return { pregnancies: [updated, ...rest].sort((a, b) => (a.due_date < b.due_date ? 1 : -1)) };
}

export function removeBooking(archive: Archive, dueDate: string, index: number): Archive {
  return {
    pregnancies: archive.pregnancies
      .map((p) => (p.due_date === dueDate ? { ...p, bookings: p.bookings.filter((_, i) => i !== index) } : p))
      .filter((p) => p.bookings.length > 0),
  };
}

/** いまの妊娠（予定日）の、施設ごとの記録 */
export function bookingsFor(archive: Archive, dueDate: string, facilityId: string): BookingRecord[] {
  return archive.pregnancies.find((p) => p.due_date === dueDate)?.bookings.filter((b) => b.facility_id === facilityId) ?? [];
}

export const countBookings = (archive: Archive) => archive.pregnancies.reduce((n, p) => n + p.bookings.length, 0);
