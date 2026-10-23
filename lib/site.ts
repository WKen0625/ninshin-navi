// サイトの正規のURL（検索エンジン向けの canonical・サイトマップ・構造化データで使う）。
// 本番は https://www.tsugiraku.jp。NEXT_PUBLIC_SITE_URL があればそれを使う（末尾の / は落とす）。
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !/localhost/.test(process.env.NEXT_PUBLIC_SITE_URL) ? process.env.NEXT_PUBLIC_SITE_URL : "https://www.tsugiraku.jp").replace(/\/$/, "");

/** サイト内のパスを絶対URLにする */
export const absUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
