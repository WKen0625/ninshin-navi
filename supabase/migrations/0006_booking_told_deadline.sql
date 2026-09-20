-- 利用者の入力で、施設の予約の実態を溜めていく（2026-09-20 の方針）。
-- 電話した結果に加えて、「施設から言われた予約の締切（妊娠◯週まで）」と「分娩予約金」を、選択式で任意に記録できるようにする。
-- 施設HPに締切が書かれていない施設が多いので、ここを利用者の記録で補う。画面に出すのは集計だけ。
alter table booking_reports add column told_deadline_week int;   -- 施設から言われた締切の週。言われなかった・覚えていないは null
alter table booking_reports add column deposit_yen        int;   -- 分娩予約金（幅の代表値）。不明は null

create or replace view v_booking_stats as
select facility_id, due_month,
       count(*)                                        as reports,
       count(*) filter (where result = 'booked')       as booked,
       count(*) filter (where result in ('full','waitlist')) as full_or_wait,
       percentile_cont(0.5) within group (order by contacted_week)
         filter (where result = 'booked')              as median_week_booked,
       count(told_deadline_week)                       as told_reports,
       percentile_cont(0.5) within group (order by told_deadline_week)
         filter (where told_deadline_week is not null) as median_told_deadline_week,
       percentile_cont(0.5) within group (order by deposit_yen)
         filter (where deposit_yen is not null)        as median_deposit_yen
from booking_reports
group by facility_id, due_month;
