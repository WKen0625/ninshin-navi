-- 2026-10-01
-- (1) 流産・死産で妊娠を終えた家族のための手続き（steps.requires = 'loss'）。該当する家族にはこれだけを出す。
alter table steps drop constraint if exists steps_requires_check;
alter table steps add constraint steps_requires_check check (requires in ('multiple','satogaeri','foreign_parent','loss'));

-- (2) 「自分は該当しない」の理由も集める（「わからない」と同じ表に、kind で区別）。
--     本当に該当しないのか不安な人の判断材料と、案内の直しの材料にする。個人情報は持たない（0007 と同じ）。
alter table stuck_reports add column kind text not null default 'stuck' check (kind in ('stuck','not_applicable'));
alter table stuck_reports drop constraint if exists stuck_reports_reason_check;
alter table stuck_reports add constraint stuck_reports_reason_check check (
  reason in ('where','documents','deadline','eligibility','wording','other',
             'na_not_employee','na_single','na_already','na_not_eligible','na_unsure','na_other')
);
drop view if exists v_stuck_stats;
create view v_stuck_stats as
select step_id, region_code, kind, reason, count(*) as reports
from stuck_reports
group by step_id, region_code, kind, reason;
grant select on v_stuck_stats to anon, authenticated;
