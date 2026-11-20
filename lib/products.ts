import "server-only";
// 商品の例（content/shop/products.yaml）と出産準備リスト（content/shop/junbi.yaml）。
// 商品はコラムの [[product:<id>]] と、出産準備リストの商品ボックスで使う。おすすめ順ではなく「選ぶときの例」。

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { a8Kind } from "./a8";
import { isIllustKind } from "./illust";

const productSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  item: z.string().min(1),
  name: z.string().min(1),
  asin: z.string().regex(/^[A-Z0-9]{10}$/).nullish(),
  rakuten_keyword: z.string().nullish(),
  /**
   * A8 の広告コード（バナーかテキスト）。A8 の管理画面でコピーしたHTMLを、改変せずにそのまま入れる（A8 の規約）。
   * 形が A8 のものと一致しないと読み込みで止める（lib/a8.ts）。提携が承認された案件だけ
   */
  a8_html: z.string().refine((h) => a8Kind(h) !== null, "a8_html は A8 の広告コードをそのまま入れる（バナーかテキスト）").nullish(),
  /** サービス（銀行・スマホなど）の公式ページ。提携の広告コード（a8_html）が無いあいだは、ここへの普通のリンクを出す（PR の印は付けない） */
  official_url: z.string().url().nullish(),
  /** 箱に出す短い事実（例: 在留カードで申し込める・英語の画面あり）。出典は記事の側に書く */
  note: z.string().nullish(),
  /** 商品の絵の種類（lib/illust.ts）。写真が無いときに箱と比較表に出す */
  illust: z.string().refine(isIllustKind, "illust は lib/illust.ts の種類から選ぶ"),
  /** 比較表（[[compare:...]]）に出す項目。メーカー公表の事実だけ（例: 対象月齢・重さ・洗えるか）。価格は書かない */
  specs: z.record(z.string(), z.string()).nullish(),
});
const productsFile = z.strictObject({ checked_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), products: z.array(productSchema) });

const junbiItem = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  why: z.string().min(1),
  product: z.string().nullish(),
  article: z.string().startsWith("/").nullish(),
  source_url: z.string().url().nullish(),
});
const junbiFile = z.strictObject({
  groups: z.array(z.strictObject({ id: z.string(), title: z.string(), from_week: z.number().int(), to_week: z.number().int(), lead: z.string().nullish(), items: z.array(junbiItem) })),
});

/**
 * 商品の写真（content/shop/product-photos.json）。楽天の公式API（楽天市場商品検索）で取った画像と、その商品へのアフィリエイトリンクだけ。
 * 画像の転載・Amazon の商品ページからのコピーはしない（各規約）。ファイルが無ければ写真なし（絵を出す）。
 */
const photoSchema = z.strictObject({
  src: z.string().regex(/^https:\/\/thumbnail\.image\.rakuten\.co\.jp\/[^\s"'<>]+$/, "写真は楽天の公式APIが返す画像URLだけ"),
  href: z.string().regex(/^https:\/\/hb\.afl\.rakuten\.co\.jp\/[^\s"'<>]+$/, "リンクは楽天アフィリエイトのURLだけ"),
  alt: z.string().min(1),
  shop: z.string().nullish(),
  item_code: z.string().nullish(),
});
const photosFile = z.strictObject({ checked_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), source: z.literal("rakuten-ichiba-item-search"), photos: z.record(z.string(), photoSchema) });

export type ProductPhoto = z.infer<typeof photoSchema>;
export type Product = z.infer<typeof productSchema> & { checked_at: string; photo?: ProductPhoto | null };
export type JunbiGroup = z.infer<typeof junbiFile>["groups"][number];

const dir = () => join(process.cwd(), "content", "shop");

function loadPhotos(): Record<string, ProductPhoto> {
  const file = join(dir(), "product-photos.json");
  if (!existsSync(file)) return {};
  return photosFile.parse(JSON.parse(readFileSync(file, "utf8"))).photos;
}

export function loadProducts(): Map<string, Product> {
  const f = productsFile.parse(parse(readFileSync(join(dir(), "products.yaml"), "utf8")));
  const photos = loadPhotos();
  for (const id of Object.keys(photos)) if (!f.products.some((p) => p.id === id)) throw new Error(`product-photos.json: "${id}" が products.yaml に無い`);
  return new Map(f.products.map((p) => [p.id, { ...p, checked_at: f.checked_at, photo: photos[p.id] ?? null }]));
}

export function loadJunbi(): JunbiGroup[] {
  const f = junbiFile.parse(parse(readFileSync(join(dir(), "junbi.yaml"), "utf8")));
  const products = loadProducts();
  for (const g of f.groups) for (const i of g.items) if (i.product && !products.has(i.product)) throw new Error(`junbi.yaml: ${i.id} の product "${i.product}" が products.yaml に無い`);
  return f.groups;
}
