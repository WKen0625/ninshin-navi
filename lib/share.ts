// 入力内容を、もう1台の端末（パートナーのスマホなど）に写すための「リンク／QRコード」。ログインなし・サーバーに送らない。
// JSON → deflate → base64url を URL の ?d= に入れる。受け取った側は、確認してから自分の端末の入力を置き換える。
// 注意: リンクを知っている人は内容を読める。画面でそう伝える。

import { parseState, type FamilyState } from "./family-state";

const toB64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeShare(state: FamilyState): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(state));
  return toB64url(await pipe(json, new CompressionStream("deflate-raw")));
}

/** 壊れていれば null */
export async function decodeShare(d: string): Promise<FamilyState | null> {
  try {
    const bytes = await pipe(fromB64url(d), new DecompressionStream("deflate-raw"));
    return parseState(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export const shareUrl = (origin: string, d: string) => `${origin}/share?d=${d}`;
