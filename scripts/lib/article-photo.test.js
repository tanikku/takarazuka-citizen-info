// 記事の現地取材写真（sections.items の { photo }）と ogImage のテスト（Node標準の node:test を使用）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { validateArticle } from "./article-schema.js";
import { articlePage } from "../templates.js";

const SITE = "https://takarazuka-today.jp";
const PHOTO = { src: "/photos/test-field-20261017.webp", width: 1600, height: 1200, alt: "テスト用の畑の写真", caption: "畑の様子（テスト）" };
const ARTICLE = {
  slug: "test-photo-article",
  title: "テスト記事",
  summary: "テスト記事の本文です。",
  sourceUrl: "https://www.city.takarazuka.hyogo.jp/",
  sourceName: "宝塚市公式サイト",
  publishedAt: "2026-10-17",
  category: "文化・観光",
  valueScore: "A",
};
const withItems = (items) => ({ ...ARTICLE, sections: [{ heading: "園内の様子", items }] });

test("items に文字列と { photo } を混在でき、ogImage も通る", () => {
  const a = { ...withItems(["一つ目", { photo: PHOTO }, "二つ目"]), ogImage: "/photos/test-field-20261017-1200x630.webp" };
  assert.deepEqual(validateArticle(a).errors, []);
});

test("photo の不正（src・サイズ・alt・caption・未知のキー）と ogImage の不正を検出する", () => {
  const errorsOf = (photo) => validateArticle(withItems([{ photo }])).errors;
  assert.ok(errorsOf({ ...PHOTO, src: "/photos/test.jpg" }).length > 0);
  assert.ok(errorsOf({ ...PHOTO, src: "https://example.com/a.webp" }).length > 0);
  assert.ok(errorsOf({ ...PHOTO, width: 0 }).length > 0);
  assert.ok(errorsOf({ ...PHOTO, alt: "" }).length > 0);
  assert.ok(errorsOf({ ...PHOTO, caption: " " }).length > 0);
  assert.ok(errorsOf({ ...PHOTO, credit: "x" }).length > 0);
  assert.ok(validateArticle(withItems([{ photo: PHOTO, extra: 1 }])).errors.length > 0, "photo 以外のキーを持つ要素は不可");
  assert.ok(validateArticle(withItems([{ html: "<b>x</b>" }])).errors.length > 0, "生HTMLの要素は不可");
  assert.ok(validateArticle({ ...ARTICLE, ogImage: "/img/header-banner.png" }).errors.length > 0);
});

test("写真は箇条書きの間に figure として出し、前後の文字列はそれぞれ箇条書きにまとめる", () => {
  const html = articlePage(withItems(["一つ目", { photo: PHOTO }, "二つ目", "三つ目"]), SITE);
  assert.ok(html.includes('<ul><li>一つ目</li></ul>\n<figure class="guide-photo"><img src="/photos/test-field-20261017.webp" width="1600" height="1200" alt="テスト用の畑の写真" loading="lazy" decoding="async"><figcaption>畑の様子（テスト）</figcaption></figure>\n<ul><li>二つ目</li>\n<li>三つ目</li></ul>'));
});

test("縦長写真には portrait クラスを付け、キャプションと alt はエスケープする", () => {
  const html = articlePage(withItems([{ photo: { ...PHOTO, width: 900, height: 1600, alt: "<a>", caption: "\"x\" & <y>" } }]), SITE);
  assert.ok(html.includes('<figure class="guide-photo guide-photo--portrait">'));
  assert.ok(html.includes('alt="&lt;a&gt;"'));
  assert.ok(html.includes("<figcaption>&quot;x&quot; &amp; &lt;y&gt;</figcaption>"));
});

test("写真のない記事の箇条書きは従来どおり <ul> 1つ", () => {
  const html = articlePage(withItems(["一つ目", "二つ目"]), SITE);
  assert.ok(html.includes("<ul><li>一つ目</li>\n<li>二つ目</li></ul>"));
  assert.ok(!html.includes("guide-photo"));
});

test("ogImage があれば og:image・twitter:image・JSON-LD の image を出し、無ければ出さない", () => {
  const og = "/photos/test-field-20261017-1200x630.webp";
  const html = articlePage({ ...ARTICLE, ogImage: og }, SITE);
  assert.ok(html.includes(`<meta property="og:image" content="${SITE}${og}">`));
  assert.ok(html.includes(`<meta name="twitter:image" content="${SITE}${og}">`));
  assert.ok(html.includes(`"image":"${SITE}${og}"`));
  const plain = articlePage(ARTICLE, SITE);
  assert.ok(!plain.includes('property="og:image"'));
  assert.ok(!plain.includes('"image":'));
});
