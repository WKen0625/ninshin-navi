-- 記録（アンケートの回答）の重複を防ぐ。同じ人（reporter_hash）が同じ施設・同じ予定月に答え直したら上書きする。
-- reporter_hash = sha256(端末ごとのランダムID + サーバー側の秘密値)。ログイン不要・氏名なし。
-- 書き込みはサーバー（service_role）だけが行う。公開の鍵では読めない・書けない（policies.sql のまま）。
create unique index booking_reports_one_per_facility_month on booking_reports (reporter_hash, facility_id, due_month);
create unique index cost_reports_one_per_birth             on cost_reports    (reporter_hash, birth_month);
