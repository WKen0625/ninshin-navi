-- 「わからない」の記録（2026-09-23）。手続きのどこでつまずくかを集める。
-- 「完了した」「自分は該当しない」に加えて「わからない」を押せる。押した人には理由（選択式）を聞き、集計だけを画面と運営に返す。
-- 個人情報は持たない: ステップid・区・理由・そのときの妊娠週数・reporter_hash（端末のランダムID＋秘密値のハッシュ）だけ。
-- 書き込みはサーバー（service_role）だけ。公開の鍵では読めない（RLS 有効・ポリシーなし）。集計ビューだけを公開する。
create table stuck_reports (
  id               bigserial primary key,
  reporter_hash    text not null,
  region_code      text not null references regions(code),
  step_id          text not null references steps(id),
  reason           text not null check (reason in ('where','documents','deadline','eligibility','wording','other')),
  gestational_week int,
  created_at       timestamptz not null default now(),
  unique (reporter_hash, step_id)   -- 同じ人が同じステップで押し直したら上書き
);
alter table stuck_reports enable row level security;

create view v_stuck_stats as
select step_id, region_code, reason, count(*) as reports
from stuck_reports
group by step_id, region_code, reason;
grant select on v_stuck_stats to anon, authenticated;
