// 入口 → 完了チェック → 次の1件、の流れ（One by One）を、画面と同じ関数でたどる。

import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { clearStep, markStep, parseState, setSelectedDocuments, toFamily, type FamilyState } from "../lib/family-state";
import { addDays, resolveNextActions } from "../lib/next-actions";
import { seed } from "../lib/seed";
import { createTestDb, readRules, ROOT } from "./helpers/db";

const TODAY = "2026-09-19";

let rules: Awaited<ReturnType<typeof readRules>>;
beforeAll(async () => {
  const { db } = await createTestDb();
  await seed(db, join(ROOT, "data"));
  rules = await readRules(db);
});

const start: FamilyState = {
  region_code: "13112",
  region_name: "東京都世田谷区",
  due_date: addDays(TODAY, 280 - 6 * 7),
  confirmation_date: null,
  birth_date: null,
  preferences: { epidural: "undecided", distance: "any", postal_code: null, facility_id: null, children: 1 },
  held_documents: [{ document_id: "jp.none_yet", held_at: TODAY }],
  progress: [],
  consent_survey: false,
  consent_sensitive: false,
  surveys_closed: [],
  stuck: [],
};
const current = (s: FamilyState) => resolveNextActions({ family: toFamily(s), today: TODAY, ...rules }).current?.step;
const stepOf = (id: string) => rules.steps.find((s) => s.id === id)!;

describe("完了チェックで次へ進む", () => {
  it("受診を完了すると「心拍確認」が手に入り、世田谷区の妊娠届が出る", () => {
    expect(current(start)!.id).toBe("jp.s01");
    const next = markStep(start, stepOf("jp.s01"), "done", TODAY);
    expect(next.held_documents).toContainEqual({ document_id: "jp.heartbeat_confirmed", held_at: TODAY, from_step: "jp.s01" });
    const ids = resolveNextActions({ family: toFamily(next), today: TODAY, ...rules }).actions.map((a) => a.step.id);
    expect(ids).toContain("setagaya.s03");
    expect(ids).not.toContain("jp.s01");
  });

  it("妊娠届を完了すると保健バッグが手に入り、中の受診票が条件のステップまで出る", () => {
    let s = markStep(start, stepOf("jp.s01"), "done", TODAY);
    s = markStep(s, stepOf("setagaya.s03"), "done", TODAY);
    const ids = resolveNextActions({ family: toFamily(s), today: TODAY, ...rules }).actions.map((a) => a.step.id);
    for (const id of ["setagaya.s03b", "jp.s04", "setagaya.s05c"]) expect(ids).toContain(id);
  });

  it("チェックを外すと、そのチェックで手に入れた紙も外れる（自分で選んだ紙は残る）", () => {
    const done = markStep(start, stepOf("jp.s01"), "done", TODAY);
    const undone = clearStep(done, "jp.s01");
    expect(undone).toEqual(start);
  });

  it("「該当しない」では紙は手に入らない。付け直しもできる", () => {
    const na = markStep(start, stepOf("jp.s01"), "not_applicable", TODAY);
    expect(na.held_documents).toEqual(start.held_documents);
    expect(toFamily(na).not_applicable_step_ids).toEqual(["jp.s01"]);
    const done = markStep(na, stepOf("jp.s01"), "done", TODAY);
    expect(done.progress).toEqual([{ step_id: "jp.s01", status: "done", at: TODAY }]);
  });
});

describe("入口で選んだ紙の入れ替え", () => {
  it("選び直しても、完了チェックで手に入れた紙と、前から選んでいた紙の受取日は保つ", () => {
    const done = markStep(start, stepOf("jp.s01"), "done", "2026-09-10");
    const later = setSelectedDocuments(done, ["jp.none_yet", "setagaya.hoken_bag"], TODAY);
    expect(later.held_documents).toEqual([
      { document_id: "jp.none_yet", held_at: TODAY },
      { document_id: "setagaya.hoken_bag", held_at: TODAY },
      { document_id: "jp.heartbeat_confirmed", held_at: "2026-09-10", from_step: "jp.s01" },
    ]);
  });
});

describe("保存した状態の読み込み", () => {
  it("正しい値はそのまま戻る", () => {
    expect(parseState(JSON.stringify(start))).toEqual(start);
  });
  it("壊れた値・市区町村や予定日が無い値は null（入口からやり直し）", () => {
    expect(parseState(null)).toBeNull();
    expect(parseState("{")).toBeNull();
    expect(parseState(JSON.stringify({ ...start, due_date: "2027/05/14" }))).toBeNull();
    expect(parseState(JSON.stringify({ ...start, region_code: "世田谷" }))).toBeNull();
  });
});
