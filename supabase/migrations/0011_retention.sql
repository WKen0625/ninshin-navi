-- 保存期間（プライバシーポリシー 8.）: 「その他の紙」の自由記述（4.1）と「まちがいの知らせ」（4.4）は、対応が終わってから2年で消す。
-- 対応が終わった日を持つ列を足す。status が pending/new でなくなったときにサーバー（scripts/feedback.ts）が入れる。
alter table document_suggestions add column resolved_at timestamptz;
alter table feedback add column resolved_at timestamptz;
-- 既に対応済みの行は、作成日を対応日とみなす（それより前に消えることはない）
update document_suggestions set resolved_at = created_at where status <> 'pending' and resolved_at is null;
update feedback set resolved_at = created_at where status <> 'new' and resolved_at is null;

-- 2年を過ぎた行を消す。サーバー（service_role）だけが呼ぶ。返すのは消した件数だけ
create function retention_run() returns table(table_name text, deleted int)
language plpgsql security definer set search_path = public as $$
declare n1 int; n2 int;
begin
  delete from document_suggestions where resolved_at is not null and resolved_at < now() - interval '2 years';
  get diagnostics n1 = row_count;
  delete from feedback where resolved_at is not null and resolved_at < now() - interval '2 years';
  get diagnostics n2 = row_count;
  return query select 'document_suggestions'::text, n1 union all select 'feedback'::text, n2;
end $$;
revoke all on function retention_run() from public, anon, authenticated;
