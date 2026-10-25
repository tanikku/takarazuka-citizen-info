// カテゴリ一覧の見出し階層（h1 / h2）と、記事一覧へ移動するページ内リンクのテスト
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { categoryPage, CATEGORIES } from "../templates.js";

const SITE = "https://takarazuka-today.jp";
const ARTICLE = { slug: "a1", title: "記事1", summary: "要約", publishedAt: "2026-10-24", category: "防犯", sourceName: "宝塚市公式サイト", sourceUrl: "https://www.city.takarazuka.hyogo.jp/", valueScore: "A" };
const GUIDE = (c) => ({ categoryKey: c.key, slug: "g", title: "ガイド", cardSummary: "概要", category: c });
const count = (html, re) => (html.match(re) ?? []).length;

test("全カテゴリで h1 が1つ、記事一覧の h2 に安定した id がある", () => {
  for (const c of CATEGORIES) {
    const html = categoryPage(c, [ARTICLE], SITE);
    assert.equal(count(html, /<h1[ >]/g), 1, `${c.key}: h1`);
    assert.match(html, /<h2 class="panel-title" id="category-articles">/, `${c.key}: h2`);
    assert.ok(html.indexOf("<h1") < html.indexOf("<h2"), `${c.key}: h1 が先`);
  }
});

test("市議会のh1は「市議会ウォッチ」、他は カテゴリ名", () => {
  const sg = categoryPage(CATEGORIES.find((c) => c.key === "shigikai"), [ARTICLE], SITE);
  assert.match(sg, /<h1 class="category-title">[\s\S]*?市議会ウォッチ<\/h1>/);
  const bo = categoryPage(CATEGORIES.find((c) => c.key === "bohan"), [ARTICLE], SITE);
  assert.match(bo, /<h1 class="category-title">[\s\S]*?防犯<\/h1>/);
});

test("ガイドがあるカテゴリだけ、ガイドのh2と記事一覧へのリンクが出る", () => {
  const c = CATEGORIES.find((x) => x.key === "kosodate");
  const withGuide = categoryPage(c, [ARTICLE, ARTICLE], SITE, [GUIDE(c)]);
  assert.match(withGuide, /<h2 class="entry-label">[^<]*のガイド<\/h2>/);
  assert.match(withGuide, /<a href="#category-articles">記事一覧へ移動（2件）↓<\/a>/);
  assert.ok(withGuide.indexOf('id="category-articles"') > withGuide.indexOf('href="#category-articles"'));
  const without = categoryPage(c, [ARTICLE], SITE);
  assert.doesNotMatch(without, /category-jump|entry-label/);
});

test("市議会は案内カードだけなので、記事一覧へのリンクは出さない", () => {
  const html = categoryPage(CATEGORIES.find((c) => c.key === "shigikai"), [ARTICLE], SITE, [], true, true);
  assert.doesNotMatch(html, /category-jump/);
});

test("見出しを足しても CollectionPage と BreadcrumbList の構造化データは維持される", () => {
  const html = categoryPage(CATEGORIES[0], [ARTICLE], SITE);
  assert.match(html, /"@type":\s*"CollectionPage"/);
  assert.match(html, /"@type":\s*"BreadcrumbList"/);
});
