// 記事冒頭の要点カード（keyPoints / keyPointsTitle）のテスト（Node標準の node:test を使用）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { validateArticle } from "./article-schema.js";
import { articlePage } from "../templates.js";

const SITE = "https://takarazuka-today.jp";
const ARTICLE = {
  slug: "test-keypoints",
  title: "テスト記事",
  summary: "テスト記事の本文です。",
  sourceUrl: "https://www.city.takarazuka.hyogo.jp/",
  sourceName: "宝塚市公式サイト",
  publishedAt: "2026-10-24",
  category: "防犯",
  valueScore: "A",
};

test("keyPoints は空でない文字列1〜5件、keyPointsTitle は keyPoints とセットで1〜30字", () => {
  assert.deepEqual(validateArticle({ ...ARTICLE, keyPoints: ["a", "b", "c"], keyPointsTitle: "まず確認" }).errors, []);
  assert.ok(validateArticle({ ...ARTICLE, keyPoints: [] }).errors.length > 0);
  assert.ok(validateArticle({ ...ARTICLE, keyPoints: ["a", ""] }).errors.length > 0);
  assert.ok(validateArticle({ ...ARTICLE, keyPoints: ["1", "2", "3", "4", "5", "6"] }).errors.length > 0);
  assert.ok(validateArticle({ ...ARTICLE, keyPointsTitle: "見出しだけ" }).errors.length > 0);
  assert.ok(validateArticle({ ...ARTICLE, keyPoints: ["a"], keyPointsTitle: "x".repeat(31) }).errors.length > 0);
});

test("市議会以外の記事は keyPointsTitle を指定したときだけ要点カードを出し、HTMLはエスケープする", () => {
  const shown = articlePage({ ...ARTICLE, keyPoints: ["<b>要点</b>"], keyPointsTitle: "まず、この3つだけ確認" }, SITE);
  assert.match(shown, /class="point-box point-box-plain"/);
  assert.match(shown, /まず、この3つだけ確認/);
  assert.match(shown, /&lt;b&gt;要点&lt;\/b&gt;/);
  const hidden = articlePage({ ...ARTICLE, keyPoints: ["要点"] }, SITE);
  assert.doesNotMatch(hidden, /point-box/);
});

test("市議会記事の要点カードは従来の見出しのまま", () => {
  const html = articlePage({ ...ARTICLE, category: "市議会", keyPoints: ["要点"] }, SITE);
  assert.match(html, /<div class="point-box">/);
  assert.match(html, /今回のポイント（市民生活への影響）/);
});

test("keyPointsTitle を使う記事は 要点 → 要約 → 図解 の順、従来の記事は 図解 → 要点 → 要約 の順", () => {
  const img = { src: "/photos/x.webp", width: 100, height: 100, alt: "図の内容が分かる説明文です。あいうえお", caption: "図の説明" };
  const idx = (html, s) => html.indexOf(s);
  const plain = articlePage({ ...ARTICLE, keyPoints: ["要点"], keyPointsTitle: "まず確認", explainerImage: img }, SITE);
  assert.ok(idx(plain, "point-box") < idx(plain, "article-summary") && idx(plain, "article-summary") < idx(plain, "explainer-figure"));
  const legacy = articlePage({ ...ARTICLE, category: "市議会", keyPoints: ["要点"], explainerImage: { ...img, caption: undefined } }, SITE);
  assert.ok(idx(legacy, "explainer-figure") < idx(legacy, "point-box") && idx(legacy, "point-box") < idx(legacy, "article-summary"));
});
