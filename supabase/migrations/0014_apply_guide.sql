-- 助成金Navi（2026-10-09）: 「自分は対象か・どこに・何を出すか・用紙はどこでもらうか」を選択式で出すための構造化データ。
-- steps（申請の手続き）と subsidies（助成）の両方に、同じ形の jsonb を持たせる。形は lib/apply-guide.ts の ApplyGuide。
--   eligibility: 対象の条件の印の配列（lib/eligibility.ts の鍵。全部満たせば対象）
--   submit_to / online_url / by_mail: 提出先（短い名前）・電子申請のURL・郵送の可否
--   documents: 提出する書類の配列 [{ name, from, url?, note? }]（from = hospital|ward|employer|insurer|self|download|mailed）
--   form: 用紙の入手先 { from: window|download|mailed|hospital|employer|online|none, url?, note? }
--   how_to: 手順の短い文章
alter table steps add column apply_guide jsonb;
-- ひとり親向けの助成（児童扶養手当など）は、その人にだけ出す
alter table subsidies drop constraint if exists subsidies_requires_check;
alter table subsidies add constraint subsidies_requires_check check (requires in ('epidural','single_parent'));
alter table subsidies add column apply_guide jsonb;
