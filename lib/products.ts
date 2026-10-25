import "server-only";
// 商品の例（content/shop/products.yaml）と出産準備リスト（content/shop/junbi.yaml）。
// 商品はコラムの [[product:<id>]] と、出産準備リストの商品ボックスで使う。おすすめ順ではなく「選ぶときの例」。

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

const productSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  item: z.string().min(1),
  name: z.string().min(1),
  asin: z.string().regex(/^[A-Z0-9]{10}$/).nullish(),
  rakuten_keyword: z.string().nullish(),
  a8_url: z.string().url().nullish(),
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

export type Product = z.infer<typeof productSchema> & { checked_at: string };
export type JunbiGroup = z.infer<typeof junbiFile>["groups"][number];

const dir = () => join(process.cwd(), "content", "shop");

export function loadProducts(): Map<string, Product> {
  const f = productsFile.parse(parse(readFileSync(join(dir(), "products.yaml"), "utf8")));
  return new Map(f.products.map((p) => [p.id, { ...p, checked_at: f.checked_at }]));
}

export function loadJunbi(): JunbiGroup[] {
  const f = junbiFile.parse(parse(readFileSync(join(dir(), "junbi.yaml"), "utf8")));
  const products = loadProducts();
  for (const g of f.groups) for (const i of g.items) if (i.product && !products.has(i.product)) throw new Error(`junbi.yaml: ${i.id} の product "${i.product}" が products.yaml に無い`);
  return f.groups;
}
