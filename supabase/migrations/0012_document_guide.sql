-- 「もらった紙はどれ？」のための列（2026-10-01）。病院でまとめて渡される紙を見分け、何をすればよいかを出す。
alter table documents
  add column issued_by  text check (issued_by in ('ward','hospital','employer','insurer','tokyo','national','other')),  -- 誰が渡す紙か
  add column what_to_do text;   -- この紙を受け取ったらどうするか（手続きの答えは steps。ここは紙の扱い方）
