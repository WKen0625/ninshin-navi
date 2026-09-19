-- 行レベルセキュリティのポリシー。schema.sql 末尾の方針の実装。schema.sql の後に適用する。

-- ---------- 制度データ: 全員読み取り可、書き込みは service_role のみ ----------
-- RLS を有効にしないと anon キーで書き込めてしまうため、ここで有効化する。
-- service_role / postgres は RLS を迂回するので、書き込みポリシーは作らない。
alter table regions               enable row level security;
alter table documents             enable row level security;
alter table steps                 enable row level security;
alter table subsidies             enable row level security;
alter table facilities            enable row level security;
alter table facility_costs_public enable row level security;
alter table products              enable row level security;
alter table source_watch          enable row level security;  -- ポリシーなし = service_role のみ

create policy "public read" on regions               for select to anon, authenticated using (true);
create policy "public read" on documents             for select to anon, authenticated using (true);
create policy "public read" on steps                 for select to anon, authenticated using (true);
create policy "public read" on subsidies             for select to anon, authenticated using (true);
create policy "public read" on facilities            for select to anon, authenticated using (true);
create policy "public read" on facility_costs_public for select to anon, authenticated using (true);
create policy "public read" on products              for select to anon, authenticated using (true);

-- ---------- 利用者データ: 本人のみ読み書き ----------
create policy "own profile" on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "own held documents" on held_documents for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own step progress" on step_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 「その他」の自由記述: 本人 insert のみ。読み取りは管理者（service_role）。
create policy "insert own suggestion" on document_suggestions for insert to authenticated
  with check (user_id = auth.uid());

-- ---------- 記録: insert のみ（consent_survey=true が条件）。select ポリシーなし ----------
create policy "insert with consent" on booking_reports for insert to authenticated
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.consent_survey));

-- delivery_type は consent_sensitive=true の場合のみ
create policy "insert with consent" on cost_reports for insert to authenticated
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.consent_survey
            and (cost_reports.delivery_type is null or p.consent_sensitive))
  );

create policy "insert with consent" on product_reports for insert to authenticated
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.consent_survey));

-- ---------- 集計ビュー: 画面はこれだけを読む ----------
-- ビューは所有者権限で実行される（security_invoker=false）ので、*_reports に select ポリシーが無くても集計は読める。
grant select on v_booking_stats, v_cost_stats to anon, authenticated;
