"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { decodeShare, encodeShare, shareUrl } from "@/lib/share";
import type { FamilyState } from "@/lib/family-state";
import { Icon, SectionHeading } from "./Icon";
import { useFamilyState } from "./useFamilyState";

const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日`;
};

/**
 * 入力内容をもう1台の端末に写す（パートナーのスマホなど）。ログインなし・サーバーに送らない。
 *  出す側: この端末の入力を QR とリンクにする。
 *  受け取る側: リンク（?d=）を開くと内容を確かめてから、この端末の入力を置き換える。
 */
export function SharePanel() {
  const { state, loaded, save } = useFamilyState();
  const router = useRouter();
  const d = useSearchParams().get("d");
  const [incoming, setIncoming] = useState<FamilyState | null | "broken">(null);
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!d) return;
    decodeShare(d).then((s) => setIncoming(s ?? "broken"));
  }, [d]);

  useEffect(() => {
    if (!state || d) return;
    encodeShare(state).then(async (code) => {
      const u = shareUrl(window.location.origin, code);
      setUrl(u);
      setQr(await QRCode.toDataURL(u, { width: 320, margin: 1, errorCorrectionLevel: "M" }));
    });
  }, [state, d]);

  if (!loaded) return <p className="text-base">読み込み中…</p>;

  // 受け取る側
  if (d) {
    if (incoming === null) return <p className="text-base">読み込み中…</p>;
    if (incoming === "broken") return <p className="notice notice-warn">このリンクは読めませんでした。出した側で、もう一度QRコードを作ってください。</p>;
    return (
      <div className="space-y-5">
        <SectionHeading as="h1" icon="download" tone="green" className="text-[2.2rem]">この内容を取り込む</SectionHeading>
        <div className="card space-y-1 text-base">
          <p><b>{incoming.region_name}</b></p>
          <p>{incoming.birth_date ? `出産日 ${fmt(incoming.birth_date)}` : `予定日 ${fmt(incoming.due_date)}`}</p>
          <p>手元にある紙 {incoming.held_documents.length}件・終わった手続き {incoming.progress.length}件</p>
        </div>
        {state ? <p className="notice notice-warn">この端末にある入力（{state.region_name}・{state.birth_date ? `出産日 ${fmt(state.birth_date)}` : `予定日 ${fmt(state.due_date)}`}）は置き換わります。</p> : null}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn btn-primary col-span-2" onClick={() => { save(incoming); router.push("/todo"); }}>
            <Icon name="check" className="size-5" />取り込んで「今週やること」を見る
          </button>
          <Link href={state ? "/todo" : "/navi"} className="btn btn-ghost col-span-2">やめる</Link>
        </div>
      </div>
    );
  }

  // 出す側
  if (!state) {
    return (
      <div className="space-y-4">
        <p className="text-base">まだ入力がありません。</p>
        <Link href="/navi" className="link">最初の入力へ</Link>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <SectionHeading as="h1" icon="globe" tone="violet" className="text-[2.2rem]">パートナーの端末にも出す</SectionHeading>
      <p className="text-base text-slate-700">相手のスマホでこのQRコードを読むか、リンクを送ると、同じ「今週やること」が相手の端末にも出ます。ログインは要りません。</p>
      {qr ? (
        <div className="card flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="入力内容を写すためのQRコード" width={320} height={320} className="size-64 rounded-xl" />
          <button
            type="button"
            className="btn btn-ghost btn-wide"
            onClick={async () => {
              try {
                if (navigator.share) await navigator.share({ title: "Tsugiraku Navi", url });
                else {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                }
              } catch {
                /* 取り消し */
              }
            }}
          >
            <Icon name="external" className="size-5" />
            {copied ? "リンクをコピーしました" : "リンクを送る・コピーする"}
          </button>
        </div>
      ) : (
        <p className="text-base">QRコードを作っています…</p>
      )}
      {url ? (
        <details className="text-base text-slate-600">
          <summary className="min-h-11 cursor-pointer">リンクの文字そのもの（コピーできないとき）</summary>
          <p className="break-all rounded-xl bg-slate-100 p-3 select-all" data-share-url>{url}</p>
        </details>
      ) : null}
      <div className="notice notice-info space-y-1">
        <p className="font-bold">知っておいてほしいこと</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>リンクの中に、区・予定日・持っている紙・終わった手続きが入っています。リンクを知っている人は読めるので、送る相手を確かめてください。</li>
          <li>写したあとは、それぞれの端末で別々に進みます（片方で「完了」を押しても、もう片方には反映されません）。ときどき写し直すか、担当を分けて使ってください。</li>
          <li>Tsugirakuのサーバーには送りません。</li>
        </ul>
      </div>
      <Link href="/todo" className="link">今週やることへ戻る</Link>
    </div>
  );
}
