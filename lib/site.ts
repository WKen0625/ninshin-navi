// サイトの正規のURL（検索エンジン向けの canonical・サイトマップ・構造化データで使う）。
// 本番は https://www.tsugiraku.jp。NEXT_PUBLIC_SITE_URL があればそれを使う（末尾の / は落とす）。
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !/localhost/.test(process.env.NEXT_PUBLIC_SITE_URL) ? process.env.NEXT_PUBLIC_SITE_URL : "https://www.tsugiraku.jp").replace(/\/$/, "");

/** サイト内のパスを絶対URLにする */
export const absUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * 共有時の画像（app/opengraph-image.png、1200×630）。Next はこのファイルから og:image を出すが、
 * ページが自分の openGraph を定義すると親の画像が消えるので、openGraph を持つページは images: [OG_IMAGE] を明示する
 */
export const OG_IMAGE = { url: "/opengraph-image.png", width: 1200, height: 630, alt: "Tsugiraku｜東京23区の妊娠・出産の手続きナビ" } as const;
