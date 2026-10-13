// comparisonTables のリンクセル（{ links: [{ text, href }] }）の検証と描画のテスト
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { validateArticle } from "./article-schema.js";
import { tableCellHtml } from "../templates.js";

function articleWithCell(cell) {
  return {
    slug: "table-cell-test-2026",
    title: "表セルのテスト",
    summary: "表セルのテスト用の要約本文です。",
    sourceUrl: "https://www.city.takarazuka.hyogo.jp/example.html",
    sourceName: "宝塚市公式サイト",
    publishedAt: "2026-10-13",
    category: "文化・観光",
    valueScore: "B",
    comparisonTables: [{ title: "表", headers: ["地区", "資料"], rows: [["地区A", cell]] }],
  };
}

function isValid(article) {
  return validateArticle(article).errors.length === 0;
}

const ROUTE_PDF = "https://www.city.takarazuka.hyogo.jp/_res/example/route.pdf";

test("A: 文字列セルは従来どおりエスケープだけして描画される", () => {
  assert.equal(tableCellHtml("10月16日（金）・17日（土）"), "10月16日（金）・17日（土）");
  assert.equal(tableCellHtml("A&B <b>"), "A&amp;B &lt;b&gt;");
  assert.equal(isValid(articleWithCell("市公式ページに掲載なし")), true);
});

test("B: linksセルは target=_blank・rel=noopener noreferrer 付きの<a>になり、複数リンクは<br>で区切る", () => {
  const html = tableCellHtml({
    links: [
      { text: "ルート図を見る", href: ROUTE_PDF },
      { text: "曳行表を見る", href: "https://www.city.takarazuka.hyogo.jp/_res/example/table.pdf" },
    ],
  });
  assert.equal(
    html,
    `<a class="table-cell-link" href="${ROUTE_PDF}" target="_blank" rel="noopener noreferrer">ルート図を見る</a><br>` +
      `<a class="table-cell-link" href="https://www.city.takarazuka.hyogo.jp/_res/example/table.pdf" target="_blank" rel="noopener noreferrer">曳行表を見る</a>`,
  );
  assert.equal(isValid(articleWithCell({ links: [{ text: "ルート図を見る", href: ROUTE_PDF }] })), true);
});

test("C: link.text 内のHTMLはエスケープされる", () => {
  const html = tableCellHtml({ links: [{ text: "<script>alert(1)</script>", href: ROUTE_PDF }] });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
});

test("D: href が https:// 以外（http:// ・相対URL・data:）は schema で失敗する", () => {
  for (const href of ["http://example.com/route.pdf", "/route.pdf", "route.pdf", "data:text/html,<b>x</b>"]) {
    const result = validateArticle(articleWithCell({ links: [{ text: "ルート図を見る", href }] }));
    assert.ok(result.errors.length > 0, href);
    assert.ok(result.errors.some((e) => e.includes(".href")), href);
  }
});

test("E: javascript: の href は schema で失敗し、描画側でもリンクにしない", () => {
  const cell = { links: [{ text: "ルート図を見る", href: "javascript:alert(1)" }] };
  assert.equal(isValid(articleWithCell(cell)), false);
  const html = tableCellHtml(cell);
  assert.ok(!html.includes("<a"));
  assert.ok(!html.includes("javascript:"));
});

test("F: links が空配列なら schema で失敗する", () => {
  const result = validateArticle(articleWithCell({ links: [] }));
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors.some((e) => e.includes(".links は1件以上")));
});

test("G: link.text が空文字なら schema で失敗する", () => {
  const result = validateArticle(articleWithCell({ links: [{ text: "", href: ROUTE_PDF }] }));
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors.some((e) => e.includes(".text が空")));
});

test("未知のキー・任意HTML文字列キー・オブジェクト以外のセルは schema で失敗する", () => {
  assert.equal(isValid(articleWithCell({ links: [{ text: "a", href: ROUTE_PDF }], html: "<b>x</b>" })), false);
  assert.equal(isValid(articleWithCell({ links: [{ text: "a", href: ROUTE_PDF, target: "_self" }] })), false);
  assert.equal(isValid(articleWithCell(123)), false);
  assert.equal(isValid(articleWithCell(null)), false);
  assert.equal(isValid(articleWithCell(["a"])), false);
});
