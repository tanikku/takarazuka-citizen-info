// 記事の関連ガイド（relatedGuides）のテスト（Node標準の node:test を使用）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { validateArticle } from "./article-schema.js";
import { articlePage } from "../templates.js";

const SITE = "https://takarazuka-today.jp";
const ARTICLE = {
  slug: "test-guide-link",
  title: "テスト記事",
  summary: "テスト記事の本文です。",
  sourceUrl: "https://www.city.takarazuka.hyogo.jp/",
  sourceName: "宝塚市公式サイト",
  publishedAt: "2026-10-17",
  category: "文化・観光",
  valueScore: "A",
};

test("relatedGuides はサイト内ガイドのパスだけを最大3件まで受け付ける", () => {
  assert.deepEqual(validateArticle({ ...ARTICLE, relatedGuides: ["/category/kanko/dahlia-en-guide"] }).errors, []);
  assert.ok(validateArticle({ ...ARTICLE, relatedGuides: [] }).errors.length > 0);
  assert.ok(validateArticle({ ...ARTICLE, relatedGuides: ["https://example.com/"] }).errors.length > 0);
  assert.ok(validateArticle({ ...ARTICLE, relatedGuides: ["/articles/foo"] }).errors.length > 0);
  assert.ok(validateArticle({ ...ARTICLE, relatedGuides: ["/category/kanko/a", "/category/kanko/a"] }).errors.length > 0);
  assert.ok(validateArticle({ ...ARTICLE, relatedGuides: ["/category/kanko/a", "/category/kanko/b", "/category/kanko/c", "/category/kanko/d"] }).errors.length > 0);
});

test("関連ガイドは「あなたへのおすすめ」と同じカードで、押せるリンクとして出す", () => {
  const html = articlePage({ ...ARTICLE, relatedGuides: ["/category/kanko/dahlia-en-guide"] }, SITE);
  assert.ok(html.includes("関連ガイド</p>"));
  assert.ok(html.includes('<a class="guide-card" href="/category/kanko/dahlia-en-guide">'));
  assert.ok(html.includes('<div class="label">宝塚ダリア園ガイド</div>'));
});

test("relatedGuides のない記事には関連ガイド欄を出さない", () => {
  assert.ok(!articlePage(ARTICLE, SITE).includes("関連ガイド</p>"));
});

test("recommendations.json に無いリンク先はビルドを止める", () => {
  assert.throws(() => articlePage({ ...ARTICLE, relatedGuides: ["/category/kanko/no-such-guide"] }, SITE), /recommendations\.json/);
});
