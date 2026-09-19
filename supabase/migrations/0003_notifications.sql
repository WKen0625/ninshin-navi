-- メール通知（希望する人だけ）。ログインは使わない。
-- 期限を計算するために、通知を希望した人の分だけ入力内容（snapshot）を預かる。氏名は持たない。
-- 書き込み・読み取りはサーバー（service_role）だけ。RLS を有効にしてポリシーを作らない = 公開の鍵では一切さわれない。
create table notification_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  token_hash         text not null unique,       -- 端末が持つ合言葉の sha256（合言葉そのものは保存しない）
  status             text not null default 'pending' check (status in ('pending','active')),
                                                 -- pending = 確認メールのリンクをまだ開いていない。やめたときは行ごと消す
  snapshot           jsonb not null,             -- 市区町村・予定日・心拍確認日・出産日・手元の紙・完了チェック（lib/notify/digest.ts の Snapshot）
  last_progress_on   date,                       -- 最後に完了チェックが変わった日
  nudges_sent        int  not null default 0,    -- 進みが無いまま送った催促の回数（3回で止める）
  last_sent_at       timestamptz,                -- 週1回までの判定に使う
  confirmed_at       timestamptz,
  created_at         timestamptz not null default now()
);
create index notification_subscriptions_email on notification_subscriptions (lower(email));
alter table notification_subscriptions enable row level security;
