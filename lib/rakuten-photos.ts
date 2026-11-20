// 楽天市場商品検索API（2026年の新API: openapi.rakuten.co.jp）の結果から、商品ボックスの写真を選ぶ（scripts/rakuten-photos.ts が使う）。
// 写真は API が返す画像URL（thumbnail.image.rakuten.co.jp）と、その商品へのアフィリエイトリンク（hb.afl.rakuten.co.jp）だけを使う。
// 選んだ候補は人が目で確かめてから content/shop/product-photos.json に残す（違う商品の写真を載せないため）。

export type RakutenItem = { itemName: string; itemCode: string; shopName: string; reviewCount: number; imageUrl: string | null; affiliateUrl: string | null };

type Img = string | { imageUrl?: string };
type RawItem = { itemName?: string; itemCode?: string; shopName?: string; reviewCount?: number; mediumImageUrls?: Img[]; smallImageUrls?: Img[]; affiliateUrl?: string; itemUrl?: string };

/** API の応答（formatVersion=2 は Items が商品そのもの、1 は { Item: … } で包まれる）を同じ形にする */
export function itemsOf(json: unknown): RakutenItem[] {
  const items = (json as { Items?: unknown[] })?.Items ?? [];
  return items.map((x) => {
    const it = ((x as { Item?: RawItem }).Item ?? x) as RawItem;
    const first = (it.mediumImageUrls ?? it.smallImageUrls ?? [])[0];
    const url = typeof first === "string" ? first : first?.imageUrl ?? null;
    return {
      itemName: it.itemName ?? "",
      itemCode: it.itemCode ?? "",
      shopName: it.shopName ?? "",
      reviewCount: Number(it.reviewCount ?? 0),
      imageUrl: url ? biggerImage(url) : null,
      affiliateUrl: it.affiliateUrl && /^https:\/\/hb\.afl\.rakuten\.co\.jp\//.test(it.affiliateUrl) ? it.affiliateUrl : null,
    };
  });
}

/** 画像の大きさの指定（?_ex=128x128）を 300x300 にする。thumbnail.image.rakuten.co.jp 以外は使わない */
export function biggerImage(url: string): string | null {
  if (!/^https?:\/\/thumbnail\.image\.rakuten\.co\.jp\//.test(url)) return null;
  const u = new URL(url.replace(/^http:/, "https:"));
  u.searchParams.set("_ex", "300x300");
  return u.toString();
}

const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");

/**
 * 検索語のすべての語を商品名に含み、画像とアフィリエイトリンクがあるもののうち、レビューの多いものを選ぶ。
 * 無ければ null（無理に選ばない。絵のままにする）。
 */
export function pickItem(keyword: string, items: RakutenItem[]): RakutenItem | null {
  const words = keyword.split(/\s+/).filter(Boolean).map(norm);
  const ok = items.filter((it) => it.imageUrl && it.affiliateUrl && words.every((w) => norm(it.itemName).includes(w)));
  return ok.sort((a, b) => b.reviewCount - a.reviewCount)[0] ?? null;
}
