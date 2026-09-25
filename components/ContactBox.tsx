"use client";

import { useState } from "react";
import type { Contact } from "@/lib/next-actions";
import { SourceLink } from "./SourceLink";

const tel = (phone: string) => `tel:${phone.replace(/^0/, "+81-").replace("#", "%23")}`;

function ContactLine({ c }: { c: Contact }) {
  return (
    <span className="block">
      <span className="font-bold">{c.name}</span>
      {c.phone ? (
        <a href={tel(c.phone)} className="ml-2 inline-flex min-h-11 items-center font-bold text-info underline decoration-blue-300 underline-offset-4">☎ {c.phone}</a>
      ) : null}
      {c.hours ? <span className="block text-slate-600">{c.hours}</span> : null}
      {c.topics ? <span className="block text-slate-600">聞けること: {c.topics}</span> : null}
      {c.note ? <span className="block text-slate-600">{c.note}</span> : null}
      {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" className="link">窓口のページ</a> : null}
    </span>
  );
}

/** ステップの「困ったらここへ」。指定が無ければ、区の代表の窓口（fallback）を出す */
export function ContactBox({ contact, fallback }: { contact: Contact | null; fallback: Contact[] }) {
  const list = contact ? [contact] : fallback;
  if (list.length === 0) return null;
  return (
    <div className="notice notice-info space-y-1">
      <p className="font-bold">困ったら、ここに聞く</p>
      {list.map((c) => <ContactLine key={c.id} c={c} />)}
    </div>
  );
}

/** 画面の「困ったら、ここに聞く」一覧。区の窓口 → 東京都 → 国（夜間・休日の電話相談）の順 */
export function ContactList({ contacts, regionCode, regionName }: { contacts: Contact[]; regionCode: string; regionName: string }) {
  const [open, setOpen] = useState(false);
  const own = contacts.filter((c) => c.region_code === regionCode);
  const upper = contacts.filter((c) => c.region_code !== regionCode);
  const shown = open ? [...own, ...upper] : [...own.slice(0, 3), ...upper.filter((c) => /#8000|#7119|ほっとライン/.test(`${c.phone}${c.name}`)).slice(0, 2)];
  return (
    <div className="space-y-3">
      <p className="text-base text-gray-700">
        手続きのことは{regionName || "区"}の窓口へ。夜間・休日の体調のことは電話相談へ。番号を押すと電話がかかります。
      </p>
      <ul className="space-y-2">
        {shown.map((c) => (
          <li key={c.id} className="card card-quiet space-y-1 text-base">
            <ContactLine c={c} />
            <SourceLink url={c.source_url} verifiedAt={c.verified_at} needsReview={c.needs_review} />
          </li>
        ))}
      </ul>
      {own.length + upper.length > shown.length || open ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn btn-ghost">
          {open ? "少なく表示する" : `すべての窓口を見る（${contacts.length}件）`}
        </button>
      ) : null}
    </div>
  );
}
