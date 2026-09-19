-- 変更監視（Week 9）。週1回、出典ページを取りに行き、前回と本文が変わっていたら人の確認待ちにする。
-- 差分を出すために前回の本文を持つ。取得の失敗も記録する。読み書きはサーバー（service_role）だけ（RLS 有効・ポリシーなしのまま）。
alter table source_watch add column content_text          text;   -- 前回の本文（HTMLから取り出した文字。PDFなどは null）
alter table source_watch add column http_status           int;
alter table source_watch add column last_error            text;   -- 取得できなかった理由（次に成功したら消す）
alter table source_watch add column consecutive_failures  int not null default 0;

-- 監視する出典URLの一覧。どの表のどの行が、そのURLをいつ確認したか。
-- "TODO…" など、URLでない出典は含めない。公開してよい情報だけでできている（下の表のRLSにそのまま従う）。
create view v_source_urls with (security_invoker = true) as
  select * from (
    select source_url         as url, 'steps'::text                 as table_name, id          as row_id, title as label, verified_at from steps
    union all
    select source_url,               'subsidies',                                  id,                    name,           verified_at from subsidies
    union all
    select source_url,               'documents',                                  id,                    name,           verified_at from documents
    union all
    select source_url,               'facilities',                                 id,                    name,           verified_at from facilities
    union all
    select booking_source_url,       'facilities',                                 id,                    name,           verified_at from facilities
    union all
    select source_url,               'facility_costs_public',                      facility_id,           facility_id,    verified_at from facility_costs_public
  ) u
  where url ~ '^https?://';
