// 紙の絵の形: 名前と中身から決める
import { describe, expect, it } from "vitest";
import { paperVariantOf } from "../lib/paper";

describe("紙の形", () => {
  it("袋・手帳・券・証・通知・記入する紙・紙", () => {
    expect(paperVariantOf({ id: "minato.hoken_bag", name: "母と子の保健バッグ", includes: ["a"] })).toBe("bag");
    expect(paperVariantOf({ id: "jp.boshi_techo", name: "母子健康手帳" })).toBe("booklet");
    expect(paperVariantOf({ id: "jp.kenshin_ticket", name: "妊婦健康診査の受診票（補助券）" })).toBe("ticket");
    expect(paperVariantOf({ id: "x", name: "乳幼児医療証" })).toBe("card");
    expect(paperVariantOf({ id: "x", name: "児童手当の認定通知書" })).toBe("envelope");
    expect(paperVariantOf({ id: "x", name: "直接支払制度の合意書" })).toBe("form");
    expect(paperVariantOf({ id: "x", name: "分娩予約の案内" })).toBe("envelope");
    expect(paperVariantOf({ id: "x", name: "入院のしおり" })).toBe("booklet");
    expect(paperVariantOf({ id: "x", name: "ただの紙" })).toBe("sheet");
  });
});
