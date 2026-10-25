// A8.net の広告コード（バナー・テキスト）。A8 は「コードの改変・広告素材の改変」を禁止しているので、
// 受け取ったHTMLをそのまま保存し、そのまま描画する。描画の前に、A8 が出す形と完全に一致するかを確かめる
// （手で書いたHTMLや、別のサイトへのリンクが紛れ込まないように）。

const LINK = String.raw`https://px\.a8\.net/svt/ejp\?a8mat=[A-Za-z0-9+]+`;
const PIXEL = String.raw`<img border="0" width="1" height="1" src="https://www\d*\.a8\.net/0\.gif\?a8mat=[A-Za-z0-9+]+" alt="">`;
const BANNER_IMG = String.raw`<img border="0" width="\d{1,4}" height="\d{1,4}" alt="" src="https://www\d*\.a8\.net/svt/bgt\?aid=\d+&wid=\d+&eno=\d+&mid=[a-z0-9]+&mc=\d+">`;

/** バナー: <a href="(A8のリンク)" rel="nofollow"><img …バナー…></a><img …1×1の計測…> */
const BANNER_RE = new RegExp(String.raw`^<a href="${LINK}" rel="nofollow">\s*${BANNER_IMG}</a>\s*${PIXEL}$`);
/** テキスト: <a href="(A8のリンク)" rel="nofollow">文字</a><img …1×1の計測…>（文字に < > は入らない） */
const TEXT_RE = new RegExp(String.raw`^<a href="${LINK}" rel="nofollow">[^<>]{1,120}</a>\s*${PIXEL}$`);

export type A8Kind = "banner" | "text";

export function a8Kind(html: string): A8Kind | null {
  const h = html.trim();
  if (BANNER_RE.test(h)) return "banner";
  if (TEXT_RE.test(h)) return "text";
  return null;
}

/** 広告コードの中のリンク先（テスト・記事の検査用） */
export function a8Href(html: string): string | null {
  return /href="(https:\/\/px\.a8\.net\/svt\/ejp\?a8mat=[A-Za-z0-9+]+)"/.exec(html)?.[1] ?? null;
}
