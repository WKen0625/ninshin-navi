-- 実際の家族での試用に向けた仕上げ（Week 11–12）。どちらの表も、読み書きはサーバー（service_role）だけ。

-- 1. 投稿の回数制限。IPアドレスそのものは保存しない（サーバー側の秘密値と合わせたハッシュだけ）。1日たった行は消す。
create table rate_limits (
  key           text not null,          -- 例: 'reports:<IPのハッシュ>'
  window_start  timestamptz not null,   -- 1時間ごとの区切り
  count         int not null default 0,
  primary key (key, window_start)
);
alter table rate_limits enable row level security;

create function rate_limit_hit(p_key text, p_window timestamptz) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from rate_limits where window_start < now() - interval '1 day';
  insert into rate_limits (key, window_start, count) values (p_key, p_window, 1)
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count into n;
  return n;
end $$;
revoke all on function rate_limit_hit(text, timestamptz) from public, anon, authenticated;

-- 2. 「この情報のまちがいを知らせる」。掲示板ではない（ほかの利用者には見せない）。人が読んで data/ のYAMLを直す。
create table feedback (
  id           bigserial primary key,
  region_code  text,
  target       text not null,           -- 例: 'steps:setagaya.s03' / 'facilities:ncchd' / 'screen:money'
  message      text not null,
  status       text not null default 'new' check (status in ('new','done','dismissed')),
  created_at   timestamptz not null default now()
);
alter table feedback enable row level security;
