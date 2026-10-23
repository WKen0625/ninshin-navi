import type { MetadataRoute } from "next";
import { absUrl, SITE_URL } from "@/lib/site";

// robots.txt。API だけ読まない。入力が要る画面は各ページの noindex で検索結果から外す（ここで止めると noindex を読めないため）。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: absUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
