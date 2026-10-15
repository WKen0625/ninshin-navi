// 紙の「見た目の種類」: 名前と中身から、絵の形を決める（決定的）。病院の束や区の袋を、形で見分けるため。
//  bag = 袋（中に紙が入っている）／ booklet = 手帳・冊子 ／ ticket = 受診票・券（ミシン目つき）／ card = 医療証・保険証（横長のカード）
//  envelope = 通知・案内・はがき ／ form = 申請書・届・同意書（記入欄あり）／ sheet = そのほかの紙

export type PaperVariant = "bag" | "booklet" | "ticket" | "card" | "envelope" | "form" | "sheet";

export function paperVariantOf(d: { id: string; name?: string | null; includes?: string[] }): PaperVariant {
  const n = `${d.name ?? ""} ${d.id}`;
  if ((d.includes?.length ?? 0) > 0 || /バッグ|袋|ファイル|セット/.test(n)) return "bag";
  if (/手帳|冊子|ハンドブック|ガイド|しおり|案内書/.test(n)) return "booklet";
  if (/受診票|補助券|健診券|利用券|乗車券|チケット|クーポン|券/.test(n)) return "ticket";
  if (/医療証|保険証|受給者証|カード|資格確認書/.test(n)) return "card";
  if (/通知|はがき|お知らせ|案内|決定書|証明書|領収書|明細/.test(n)) return "envelope";
  if (/申請書|届|同意書|合意書|請求書|問診票|調書|アンケート|連絡票|様式/.test(n)) return "form";
  return "sheet";
}

export const PAPER_VARIANT_LABEL: Record<PaperVariant, string> = {
  bag: "袋・束", booklet: "手帳・冊子", ticket: "券・受診票", card: "証・カード", envelope: "通知・証明", form: "記入する紙", sheet: "紙",
};
