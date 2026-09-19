// 助成額の計算式（subsidies.amount_formula）を安全に計算する小さな電卓。eval は使わない。
// 設計原則1: 「定額」「人数×定額」「費用から一時金を引いた残り（上限あり）」のような地域ごとの違いを、コードではなくデータで書けるようにする。
//
// 書けるもの: 数字、+ - *、かっこ、min(a, b, …)、max(a, b, …)、次の変数
//   children … おなかの赤ちゃんの人数
//   cost     … 出産にかかる費用（出産なびの値。施設を選んでいないときは無い）
//   lumpsum  … 窓口で差し引かれる額の合計（出産育児一時金など）

export const FORMULA_VARIABLES = ["children", "cost", "lumpsum"] as const;
export type FormulaVars = Partial<Record<(typeof FORMULA_VARIABLES)[number], number | null>>;

type Node = { t: "num"; v: number } | { t: "var"; name: string } | { t: "op"; op: "+" | "-" | "*"; a: Node; b: Node } | { t: "call"; fn: "min" | "max"; args: Node[] };

function tokenize(src: string): string[] {
  const tokens = src.match(/\d+(?:\.\d+)?|[A-Za-z_]+|[-+*(),]|\S/g) ?? [];
  const bad = tokens.find((t) => !/^(\d+(?:\.\d+)?|[A-Za-z_]+|[-+*(),])$/.test(t));
  if (bad) throw new Error(`使えない文字: ${bad}`);
  return tokens;
}

export function parseFormula(src: string): Node {
  const tokens = tokenize(src);
  let i = 0;
  const peek = () => tokens[i];
  const take = (expected?: string) => {
    const t = tokens[i++];
    if (t === undefined || (expected && t !== expected)) throw new Error(`式が途中で終わっているか、${expected ?? "値"} がありません`);
    return t;
  };
  const sum = (): Node => {
    let node = product();
    while (peek() === "+" || peek() === "-") node = { t: "op", op: take() as "+" | "-", a: node, b: product() };
    return node;
  };
  const product = (): Node => {
    let node = atom();
    while (peek() === "*") {
      take();
      node = { t: "op", op: "*", a: node, b: atom() };
    }
    return node;
  };
  const atom = (): Node => {
    const t = take();
    if (/^\d/.test(t)) return { t: "num", v: Number(t) };
    if (t === "(") {
      const node = sum();
      take(")");
      return node;
    }
    if (t === "min" || t === "max") {
      take("(");
      const args = [sum()];
      while (peek() === ",") {
        take();
        args.push(sum());
      }
      take(")");
      return { t: "call", fn: t, args };
    }
    if ((FORMULA_VARIABLES as readonly string[]).includes(t)) return { t: "var", name: t };
    throw new Error(`使えない名前: ${t}`);
  };
  const node = sum();
  if (i < tokens.length) throw new Error(`余分な文字: ${tokens[i]}`);
  return node;
}

/** 式が正しく書けているか（seed で検査する）。問題なければ null */
export function formulaError(src: string): string | null {
  try {
    parseFormula(src);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

/** 式で使っている変数 */
export function formulaVariables(src: string): string[] {
  const out = new Set<string>();
  const walk = (n: Node) => {
    if (n.t === "var") out.add(n.name);
    else if (n.t === "op") [n.a, n.b].forEach(walk);
    else if (n.t === "call") n.args.forEach(walk);
  };
  walk(parseFormula(src));
  return [...out];
}

/** 計算する。必要な変数がまだ無い（施設を選んでいない等）ときは null。結果は0円未満にしない。 */
export function evaluateFormula(src: string, vars: FormulaVars): number | null {
  const run = (n: Node): number | null => {
    if (n.t === "num") return n.v;
    if (n.t === "var") return vars[n.name as keyof FormulaVars] ?? null;
    if (n.t === "op") {
      const a = run(n.a);
      const b = run(n.b);
      if (a == null || b == null) return null;
      return n.op === "+" ? a + b : n.op === "-" ? a - b : a * b;
    }
    const args = n.args.map(run);
    if (args.some((x) => x == null)) return null;
    return n.fn === "min" ? Math.min(...(args as number[])) : Math.max(...(args as number[]));
  };
  const value = run(parseFormula(src));
  return value == null ? null : Math.max(0, Math.round(value));
}
