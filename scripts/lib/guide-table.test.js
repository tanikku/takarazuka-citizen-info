// ガイドの表（sections[].items の { table }）の検証と描画のテスト（Node標準の node:test を使用）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateGuide, validateGuides } from "./guide-schema.js";
import { guidePage, CATEGORIES } from "../templates.js";

const SITE = "https://takarazuka-today.jp";
const GUIDES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "guides");

function guideWithTable(table) {
  return {
    categoryKey: "kurashi",
    slug: "table-test-guide",
    title: "表のテスト",
    cardSummary: "表のテスト",
    lead: "表のテスト用のガイドです。",
    updatedAt: "2026-10-14",
    toc: [{ id: "t", label: "表" }],
    sections: [{ id: "t", heading: "表", items: [{ table }] }],
    faq: [],
    relatedLinks: [],
    sourceUrl: "https://www.city.takarazuka.hyogo.jp/example.html",
    sourceLabel: "宝塚市公式サイト",
    category: CATEGORIES.find((c) => c.key === "kurashi"),
  };
}

const errorsOf = (table) => validateGuide(guideWithTable(table)).errors;
const validTable = { headers: ["区分", "主な例"], rows: [["燃やすごみ", "台所ごみ"]] };

// --- 検証 ---

test("2列・3列の文字列セルの表は valid", () => {
  assert.deepEqual(errorsOf(validTable), []);
  assert.deepEqual(errorsOf({ caption: "早見表", headers: ["A", "B", "C"], rows: [["1", "2", "3"]] }), []);
});

test("列数は2〜3列に限る", () => {
  assert.equal(errorsOf({ headers: ["A"], rows: [["1"]] }).length, 1);
  assert.equal(errorsOf({ headers: ["A", "B", "C", "D"], rows: [["1", "2", "3", "4"]] }).length, 1);
});

test("行のセル数が headers と一致しないと error", () => {
  const errors = errorsOf({ headers: ["A", "B"], rows: [["1"], ["1", "2", "3"]] });
  assert.equal(errors.length, 2);
  assert.match(errors[0], /列数\(1\)が headers\(2\)と一致しません/);
});

test("rows が空・配列でない、行が配列でないと error", () => {
  assert.equal(errorsOf({ headers: ["A", "B"], rows: [] }).length, 1);
  assert.equal(errorsOf({ headers: ["A", "B"], rows: "x" }).length, 1);
  assert.equal(errorsOf({ headers: ["A", "B"], rows: ["1, 2"] }).length, 1);
});

test("不正なセル型（数値・null・配列・任意キーのオブジェクト）は error", () => {
  for (const cell of [1, null, ["x"], { html: "<b>x</b>" }]) {
    assert.ok(errorsOf({ headers: ["A", "B"], rows: [["x", cell]] }).length >= 1, JSON.stringify(cell));
  }
});

test("リンクセルは https:// だけを許可する", () => {
  const link = (href) => errorsOf({ headers: ["A", "B"], rows: [["x", { links: [{ text: "公式", href }] }]] });
  assert.deepEqual(link("https://www.city.takarazuka.hyogo.jp/x.html"), []);
  for (const href of ["javascript:alert(1)", "data:text/html,x", "http://example.com", "/category/kurashi", "//example.com"]) {
    assert.equal(link(href).length, 1, href);
  }
});

test("表と項目の未知のキーは error", () => {
  assert.equal(errorsOf({ ...validTable, html: "<table>" }).length, 1);
  const guide = guideWithTable(validTable);
  guide.sections[0].items = [{ table: validTable, extra: true }];
  assert.equal(validateGuide(guide).errors.length, 1);
});

// --- 描画 ---

test("文字列セルはエスケープして描画し、先頭列は行見出しになる", () => {
  const html = guidePage(guideWithTable({ caption: "A&B", headers: ["区分", "例"], rows: [["<b>燃やす</b>", "台所ごみ & 紙くず"]] }), SITE);
  assert.ok(html.includes('<table class="guide-table"><caption>A&amp;B</caption>'));
  assert.ok(html.includes('<th scope="col">区分</th><th scope="col">例</th>'));
  assert.ok(html.includes('<tr><th scope="row">&lt;b&gt;燃やす&lt;/b&gt;</th><td>台所ごみ &amp; 紙くず</td></tr>'));
  assert.ok(!html.includes("<b>燃やす</b>"));
});

test("リンクセルは記事の表と同じ tableCellHtml で描画される", () => {
  const html = guidePage(
    guideWithTable({ headers: ["A", "B"], rows: [["x", { links: [{ text: "公式", href: "https://www.city.takarazuka.hyogo.jp/x.html" }] }]] }),
    SITE
  );
  assert.ok(html.includes('<a class="table-cell-link" href="https://www.city.takarazuka.hyogo.jp/x.html" target="_blank" rel="noopener noreferrer">公式</a>'));
});

// --- 既存ガイドへの回帰 ---

test("data/guides の全ガイドが検証を通る", () => {
  const guides = fs
    .readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(GUIDES_DIR, f), "utf8")));
  assert.ok(guides.length > 0);
  assert.deepEqual(validateGuides(guides).errors, []);
});

test("表を持たないガイドの描画に表のHTMLは出ない", () => {
  const guide = guideWithTable(validTable);
  guide.sections[0].items = ["文字列の項目"];
  const html = guidePage(guide, SITE);
  assert.ok(!html.includes("guide-table"));
  assert.ok(html.includes('<div class="rule-card">文字列の項目</div>'));
});
