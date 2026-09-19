-- 妊娠手続きナビ（仮称） データベース定義 v0.1  2026-09-18
-- 方針: 制度データ（regions〜facility_costs_public）は data/ のYAMLから seed で上書き。
--       利用者データ（profiles〜step_progress）は最小限。記録（*_reports）は氏名なし・集計専用。

-- ---------- 制度データ（公開・読み取り専用） ----------

create table regions (
  code         text primary key,   -- 国='JP'、都道府県=2桁、市区町村=5桁（全国地方公共団体コード）
  level        text not null check (level in ('national','prefecture','municipality')),
  name         text not null,
  parent_code  text references regions(code),
  status       text not null default 'skeleton_only'
               check (status in ('skeleton_only','in_progress','verified')),
  verified_at  date
);

-- 書類マスタ（利用者は一覧から選ぶ。該当なしは 'jp.other' → document_suggestions）
create table documents (
  id           text primary key,   -- 例: 'setagaya.hoken_bag'
  region_code  text not null references regions(code),
  name         text not null,
  aliases      text[] not null default '{}',
  includes     text[] not null default '{}',   -- この紙に含まれる紙（documents.id）。例: 保健バッグ → 母子手帳・受診票
  phase        text not null check (phase in ('pre_notification','notification','pregnancy','birth','postpartum')),
  description  text,
  source_url   text,
  verified_at  date
);

-- 手続きステップ（この紙を持っていたら → 次はこうして）
create table steps (
  id                    text primary key,
  region_code           text not null references regions(code),
  phase                 text not null check (phase in ('pre_notification','notification','pregnancy','birth','postpartum')),
  sort_order            int  not null,
  title                 text not null,          -- 次にやること
  detail                text,
  trigger_document_id   text references documents(id),   -- null = 紙がなくても表示
  produces_document_id  text references documents(id),   -- 完了で手に入る紙
  channel               text,                   -- 窓口 / オンライン / 郵送 / 医療機関
  action_url            text,
  deadline_base         text check (deadline_base in
                          ('confirmation_date','notification_date','due_date','birth_date','gestational_week','facility')),
  deadline_offset_days  int,
  deadline_week         int,
  deadline_note         text,
  overrides_step_id     text references steps(id),   -- 上位地域のステップを置き換える
  survey_question_id    text,                   -- 完了直後に出す任意の1問（data/surveys.yaml）
  source_url            text not null,
  verified_at           date not null,
  needs_review          boolean not null default false
);

-- 助成・給付ルール
create table subsidies (
  id                    text primary key,
  region_code           text not null references regions(code),
  name                  text not null,
  kind                  text not null check (kind in ('at_counter','cash_later','recurring','conditional')),
                                                -- at_counter = 窓口の支払いから差し引かれる ／ cash_later = あとから申請して受け取る
                                                -- recurring = 毎月などの継続給付（実負担の計算に入れない）／ conditional = 条件つき・金額が人による・未定（計算に入れない）
  requires              text check (requires in ('epidural')),   -- この希望がある人だけが対象（null = 全員）
  amount_yen            int,                    -- 固定額
  amount_is_upper_limit boolean not null default false,  -- true = amount_yen は上限（「最大◯円」と表示する）
  amount_formula        text,                   -- 例: '50000 * children'
  amount_note           text,                   -- 上限・対象外費用
  conditions            text,
  apply_via             text,
  deadline_base         text,
  deadline_offset_days  int,
  taxable               boolean,
  scheme_applicable     text[] not null default '{lumpsum,new_scheme}',
  source_url            text not null,
  verified_at           date not null,
  needs_review          boolean not null default false
);

-- 分娩施設（出産なび＋施設HP）
create table facilities (
  id                              text primary key,
  region_code                     text not null references regions(code),
  name                            text not null,
  address                         text,
  lat                             double precision,
  lng                             double precision,
  facility_type                   text,          -- 病院 / 診療所 / 助産所
  has_epidural                    boolean,
  epidural_24h                    boolean,
  tokyo_epidural_subsidy_target   boolean,       -- 東京都の対象医療機関一覧で確認
  booking_policy                  text,          -- 施設HPの予約ルールの要約
  booking_deadline_week_official  int,           -- 施設が公表する目安の週数
  booking_source_url              text,          -- 予約ルールの出典（施設HP）。source_url（出産なび）と別に持つ
  scheme                          text not null default 'lumpsum' check (scheme in ('lumpsum','new_scheme','both')),
  birth_navi_url                  text,
  website_url                     text,
  source_url                      text,
  verified_at                     date,
  needs_review                    boolean not null default false
);

create table facility_costs_public (           -- 出産なび掲載の費用（一時金差引前）。平均値と中央値の両方を持つ
  facility_id           text references facilities(id),
  as_of                 date,                   -- 集計期間の末日
  period                text,                   -- 集計期間の表記（例: 2025年4月〜2025年9月）
  total_avg_yen         int,                    -- 分娩・出産にかかる費用の総額
  total_median_yen      int,                    -- 件数の少ない施設は中央値が公表されない（null）
  basic_avg_yen         int,                    -- 基本的な分娩費用（室料差額・産科医療補償制度の掛金・その他を除く）
  basic_median_yen      int,
  room_diff_avg_yen     int,
  room_diff_median_yen  int,
  stay_days_avg         numeric,
  stay_days_median      numeric,
  source_url            text not null,
  verified_at           date not null,
  primary key (facility_id, as_of)
);

create table products (
  id             text primary key,
  name           text not null,
  category       text,
  affiliate_url  text,
  pr_disclosure  boolean not null default true
);

-- ---------- 利用者データ（最小限） ----------

create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  region_code        text references regions(code),
  due_date           date,
  confirmation_date  date,                       -- 心拍確認日（任意。無ければ推定）
  birth_date         date,                       -- 出産後に入力
  preferences        jsonb not null default '{}',-- 無痛希望・距離など
  consent_survey     boolean not null default false,
  consent_sensitive  boolean not null default false,  -- 分娩方法など任意項目の同意
  created_at         timestamptz not null default now()
);

create table held_documents (
  user_id      uuid references profiles(id) on delete cascade,
  document_id  text references documents(id),
  held_at      timestamptz not null default now(),
  primary key (user_id, document_id)
);

create table document_suggestions (             -- 「その他」の自由記述
  id           bigserial primary key,
  user_id      uuid references profiles(id) on delete set null,
  region_code  text,
  free_text    text not null,
  status       text not null default 'pending' check (status in ('pending','added','rejected')),
  created_at   timestamptz not null default now()
);

create table step_progress (
  user_id       uuid references profiles(id) on delete cascade,
  step_id       text references steps(id),
  status        text not null default 'done' check (status in ('done','not_applicable')),  -- not_applicable =「自分は該当しない」
  completed_at  timestamptz not null default now(),
  primary key (user_id, step_id)
);

-- ---------- 記録（集計専用。reporter_hash = sha256(user_id + サーバー側の秘密値)） ----------

create table booking_reports (
  id              bigserial primary key,
  facility_id     text references facilities(id),
  due_month       date not null,                 -- 予定月（1日固定）
  contacted_week  int  not null,
  result          text not null check (result in ('booked','full','waitlist','declined_highrisk')),
  wants_epidural  boolean,
  reporter_hash   text not null,
  created_at      timestamptz not null default now()
);

create table cost_reports (
  id             bigserial primary key,
  facility_id    text references facilities(id),
  birth_month    date not null,
  scheme         text not null check (scheme in ('lumpsum','new_scheme')),
  paid_yen       int  not null,                  -- 病院窓口で払った額（一時金差引後）
  epidural       boolean,
  delivery_type  text,                           -- consent_sensitive=true の場合のみ
  reporter_hash  text not null,
  created_at     timestamptz not null default now()
);

create table product_reports (
  id             bigserial primary key,
  product_id     text references products(id),
  phase          text,
  reporter_hash  text not null,
  created_at     timestamptz not null default now()
);

-- ---------- 変更監視 ----------

create table source_watch (
  url              text primary key,
  content_hash     text,
  last_checked_at  timestamptz,
  changed_at       timestamptz,
  needs_review     boolean not null default false,
  diff_summary     text                          -- Claude Haiku の要約（参考情報。承認は人）
);

-- ---------- 集計ビュー（画面はこれだけを読む） ----------

create view v_booking_stats as
select facility_id, due_month,
       count(*)                                        as reports,
       count(*) filter (where result = 'booked')       as booked,
       count(*) filter (where result in ('full','waitlist')) as full_or_wait,
       percentile_cont(0.5) within group (order by contacted_week)
         filter (where result = 'booked')              as median_week_booked
from booking_reports
group by facility_id, due_month;

create view v_cost_stats as
select facility_id, scheme, epidural,
       count(*) as reports,
       percentile_cont(0.5) within group (order by paid_yen) as median_paid_yen
from cost_reports
group by facility_id, scheme, epidural;

-- ---------- 行レベルセキュリティ（RLS） ----------
-- 制度データ: 全員読み取り可、書き込みは service_role のみ
-- profiles / held_documents / step_progress: 本人のみ読み書き
-- *_reports: 本人は insert のみ（consent_survey=true が条件）。読み取りは集計ビュー経由のみ
-- document_suggestions: 本人 insert のみ、読み取りは管理者
alter table profiles            enable row level security;
alter table held_documents      enable row level security;
alter table step_progress       enable row level security;
alter table booking_reports     enable row level security;
alter table cost_reports        enable row level security;
alter table product_reports     enable row level security;
alter table document_suggestions enable row level security;
-- 具体的なポリシーは Claude Code が上記方針どおりに実装すること
