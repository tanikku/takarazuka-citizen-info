// indexing.js と、robots noindex の出力（記事・議員ページ）・sitemap除外の単体テスト（Node標準の node:test を使用）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { isArticleIndexable, articleSitemapEntry, indexableSitemapEntries } from "./indexing.js";
import { validateArticle } from "./article-schema.js";
import {
  articlePage,
  categoryPage,
  giinPage,
  giinIndexPage,
  gikaiGuidePage,
  gianResultPage,
  CATEGORIES,
  GIIN_PAGES_NOINDEX,
} from "../templates.js";

const SITE = "https://takarazuka-today.jp";
const NOINDEX_META = '<meta name="robots" content="noindex">';
const robotsCount = (html) => html.split('name="robots"').length - 1;

function article(overrides = {}) {
  return {
    slug: "indexing-test-2026",
    title: "テスト記事のタイトル",
    summary: "テスト用の要約本文です。",
    sourceUrl: "https://www.city.takarazuka.hyogo.jp/example.html",
    sourceName: "宝塚市公式サイト",
    publishedAt: "2026-09-01",
    category: "行政・くらし",
    valueScore: "A",
    ...overrides,
  };
}

const giin = { slug: "test-giin", name: "テスト" };

// --- 検証 ---

test("indexing 未設定・noindex は valid、それ以外は validation error", () => {
  assert.deepEqual(validateArticle(article()).errors, []);
  assert.deepEqual(validateArticle(article({ indexing: "noindex" })).errors, []);
  for (const bad of ["index", "NOINDEX", "nofollow", true, ""]) {
    const { errors } = validateArticle(article({ indexing: bad }));
    assert.equal(errors.length, 1, `indexing: ${JSON.stringify(bad)}`);
    assert.match(errors[0], /^indexing は未設定/);
  }
});

test("indexing は status と独立している（終了記事でも未設定なら index）", () => {
  assert.equal(isArticleIndexable(article({ status: "ended" })), true);
  assert.equal(isArticleIndexable(article({ indexing: "noindex" })), false);
});

// --- 記事ページの robots ---

test("indexing 未設定の記事は robots メタを出さない", () => {
  const html = articlePage(article(), SITE);
  assert.equal(robotsCount(html), 0);
});

test("indexing: noindex の記事は robots noindex を1つだけ出し、canonical は自分自身", () => {
  const html = articlePage(article({ indexing: "noindex" }), SITE);
  assert.ok(html.includes(NOINDEX_META));
  assert.equal(robotsCount(html), 1);
  assert.ok(html.includes(`<link rel="canonical" href="${SITE}/articles/indexing-test-2026">`));
  assert.ok(!/index,\s*follow/.test(html));
});

test("noindex にしても本文は表示される", () => {
  const html = articlePage(article({ indexing: "noindex" }), SITE);
  assert.ok(html.includes('<p class="article-summary">テスト用の要約本文です。</p>'));
});

// --- sitemap ---

test("sitemap：通常記事は掲載、noindex 記事は除外", () => {
  const entries = [article({ slug: "normal" }), article({ slug: "hidden", indexing: "noindex" })].map((a) =>
    articleSitemapEntry(a, SITE)
  );
  assert.deepEqual(
    indexableSitemapEntries(entries).map((e) => e.loc),
    [`${SITE}/articles/normal`]
  );
});

test("sitemap：lastmod は updatedAt、未設定なら publishedAt", () => {
  assert.equal(articleSitemapEntry(article({ updatedAt: "2026-09-05" }), SITE).lastmod, "2026-09-05");
  assert.equal(articleSitemapEntry(article(), SITE).lastmod, "2026-09-01");
});

test("sitemap：記事以外のページも noindex: true なら同じ規則で除外", () => {
  const entries = [{ loc: `${SITE}/a`, lastmod: "2026-10-14" }, { loc: `${SITE}/giin/`, lastmod: "2026-10-14", noindex: true }];
  assert.deepEqual(indexableSitemapEntries(entries).map((e) => e.loc), [`${SITE}/a`]);
});

// --- 議員ページ ---

test("議員ページは noindex 指定になっている", () => {
  assert.equal(GIIN_PAGES_NOINDEX, true);
});

test("/giin/ と議員個別ページは robots noindex を1つだけ出し、canonical は自分自身", () => {
  const index = giinIndexPage([giin], SITE);
  const personal = giinPage(giin, [], SITE);
  for (const [html, canonical] of [[index, `${SITE}/giin/`], [personal, `${SITE}/giin/test-giin`]]) {
    assert.ok(html.includes(NOINDEX_META));
    assert.equal(robotsCount(html), 1);
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
  }
});

test("市議会カテゴリ・市議会ガイド・議案採決一覧・市議会記事には noindex が付かない", () => {
  const shigikai = CATEGORIES.find((c) => c.key === "shigikai");
  const pages = [
    categoryPage(shigikai, [article({ category: "市議会", slug: "gikai-test" })], SITE),
    gikaiGuidePage(SITE),
    gianResultPage([], new Map(), SITE),
    articlePage(article({ category: "市議会", slug: "gikai-test", giin: ["test-giin"] }), SITE, [giin]),
  ];
  for (const html of pages) assert.equal(robotsCount(html), 0);
});
