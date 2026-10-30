import { absUrl, SITE_URL } from "@/lib/site";
import { JsonLd } from "./JsonLd";

/** 運営者（構造化データ）。コラムの author/publisher と、トップ・このサイトについて のページで同じものを使う */
export const ORGANIZATION = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Tsugiraku事務局",
  alternateName: "Tsugiraku",
  url: SITE_URL,
  logo: { "@type": "ImageObject", url: absUrl("/icon.svg") },
} as const;

/** トップページの構造化データ: サイトの名前・言語・運営者。検索エンジンがサイト名を正しく出すため */
export function SiteJsonLd({ lang = "ja" }: { lang?: string }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            name: "Tsugiraku",
            alternateName: "Tsugiraku Navi",
            url: SITE_URL,
            inLanguage: lang,
            description: "東京23区の妊娠・出産の手続き（窓口・期限・持ち物・お金）を、区・東京都・国の公式ページをもとに、出典と確認日つきで案内するサイト。",
            publisher: { "@id": `${SITE_URL}/#organization` },
          },
          ORGANIZATION,
        ],
      }}
    />
  );
}
