// 記事の節に置く表（sections.items の { table }）のテスト（Node標準の node:test を使用）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { validateArticle } from "./article-schema.js";
import { articlePage } from "../templates.js";

const SITE = "https://takarazuka-today.jp";
const ARTICLE = {
  slug: "test-table-article",
  title: "テスト記事",
  summary: "テスト記事の本文です。",
  sourceUrl: "https://www.city.takarazuka.hyogo.jp/",
  sourceName: "宝塚市公式サイト",
  publishedAt: "2026-11-01",
  category: "教育",
  valueScore: "A",
};
const TABLE = { caption: "テスト表（2026年2月12日時点）", headers: ["学校", "運動部", "吹奏楽"], rows: [["A中", "夏季の後", "発表会の後"], ["B中", "未定", "未定"]] };
const withItems = (items) => ({ ...ARTICLE, sections: [{ heading: "学校別", paragraphs: ["本文"], items }] });

test("items に { table } を置け、文字列・写真との混在も通る", () => {
  assert.deepEqual(validateArticle(withItems([{ table: TABLE }])).errors, []);
  assert.deepEqual(validateArticle(withItems(["前", { table: TABLE }, "後"])).errors, []);
});

test("table の不正（列数・行の列数・文字列でないセル・未知のキー・生HTML）を検出する", () => {
  const errorsOf = (table) => validateArticle(withItems([{ table }])).errors;
  assert.ok(errorsOf({ ...TABLE, headers: ["a", "b", "c", "d"], rows: [["1", "2", "3", "4"]] }).length > 0, "4列は不可");
  assert.ok(errorsOf({ ...TABLE, rows: [["A中", "夏季の後"]] }).length > 0, "行の列数が違う");
  assert.ok(errorsOf({ ...TABLE, rows: [["A中", 1, "x"]] }).length > 0, "文字列でないセルは不可");
  assert.ok(errorsOf({ ...TABLE, extra: 1 }).length > 0, "未知のキーは不可");
  assert.ok(validateArticle(withItems([{ table: TABLE, photo: {} }])).errors.length > 0, "table 以外のキーを持つ要素は不可");
});

test("節の位置に左寄せの表として出し、スマホ用の積み表クラスと見出しの data-label を付ける", () => {
  const html = articlePage(withItems([{ table: TABLE }]), SITE);
  assert.ok(html.includes('<table class="guide-table guide-table--stack"><caption>テスト表（2026年2月12日時点）</caption>'));
  assert.ok(html.includes('<td data-label="運動部">夏季の後</td>'));
  assert.ok(html.indexOf("guide-table") > html.indexOf("<h2>学校別</h2>"), "表は節の中に出る");
  assert.ok(!html.includes("text-align:right"), "右寄せのインラインスタイルを使わない");
});

test("セルはエスケープされ、表のない記事と既存の比較表の出力は変わらない", () => {
  const html = articlePage(withItems([{ table: { headers: ["a", "b"], rows: [["<b>", "x & y"]] } }]), SITE);
  assert.ok(html.includes("&lt;b&gt;") && html.includes("x &amp; y"));
  const plain = articlePage({ ...ARTICLE, comparisonTables: [{ title: "比較", headers: ["項目", "値"], rows: [["a", "1"]] }] }, SITE);
  assert.ok(plain.includes('class="data-table"') && plain.includes("text-align:right"), "comparisonTables は従来どおり");
  assert.ok(!plain.includes("guide-table"));
});
