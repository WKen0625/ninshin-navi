-- 困ったときの問い合わせ先（2026-09-25）。区のハンドブック・公式ページから、窓口の名前・電話・受付時間を持つ。
-- 各ステップは contact_id で「この手続きのことはここに聞く」を指せる。無ければ画面がその区の代表の窓口を出す。
-- 国（JP）・都（13）にも入れる（#8000 小児救急電話相談、#7119、東京都の妊娠相談ほっとライン など）。
create table contacts (
  id           text primary key,
  region_code  text not null references regions(code),
  name         text not null,
  topics       text,          -- 何を聞ける窓口か
  phone        text,          -- 03-1234-5678 / #8000
  hours        text,          -- 受付時間（文章）
  address      text,
  url          text,
  note         text,
  source_url   text not null,
  verified_at  date not null,
  needs_review boolean not null default false
);
alter table contacts enable row level security;
create policy "public read" on contacts for select to anon, authenticated using (true);
alter table steps add column contact_id text references contacts(id);
