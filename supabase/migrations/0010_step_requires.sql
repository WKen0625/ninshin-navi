-- 該当する家族にだけ出すステップ（2026-09-25）: 双子以上／里帰り出産／子が日本国籍にならない（両親とも外国籍など）。
alter table steps add column requires text check (requires in ('multiple','satogaeri','foreign_parent'));
