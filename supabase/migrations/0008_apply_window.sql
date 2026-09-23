-- 申請期間（2026-09-23）: 「いつから申請できて、いつまでに終えるか」を、期限（deadline_*）と並べて持つ。
-- apply_from_* は「申請できるようになる日」。期限と同じ基準（deadline_base の値）と日数のずれで表す。
-- 文章だけの場合（例: 面接のあと）は apply_from_note に書く。画面は「申請できる: ◯◯から／申請期限: ◯月◯日まで（◯◯から1年以内）」と目立たせて出す。
alter table steps
  add column apply_from_base        text check (apply_from_base in ('confirmation_date','notification_date','due_date','birth_date','gestational_week','facility')),
  add column apply_from_offset_days int,
  add column apply_from_week        int,
  add column apply_from_note        text;
alter table subsidies
  add column apply_from_base        text check (apply_from_base in ('confirmation_date','notification_date','due_date','birth_date','gestational_week','facility')),
  add column apply_from_offset_days int,
  add column apply_from_week        int,
  add column apply_from_note        text;
