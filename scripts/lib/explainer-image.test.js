// 「3〜4ポイント解説」画像（explainerImage）の検証・表示のテスト（Node標準の node:test を使用）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateExplainerImage, availableExplainerImage } from "./explainer-image.js";
import { validateArticle } from "./article-schema.js";
import { articlePage, gianResultPage, guideCharactersPage, GUIDE_CHARACTERS_SLUG } from "../templates.js";

const SITE = "https://takarazuka-today.jp";
const IMG = { src: "/photos/test-summary.webp", width: 1200, height: 675, alt: "テスト記事の主な論点を4項目で整理した図です" };
const ARTICLE = {
  slug: "test-article",
  title: "テスト記事",
  summary: "テスト記事の本文です。",
  sourceUrl: "https://www.city.takarazuka.hyogo.jp/",
  sourceName: "宝塚市公式サイト",
  publishedAt: "2026-10-16",
  category: "市議会",
  valueScore: "A",
};

test("正しい explainerImage はエラーにならず、記事schemaでも通る", () => {
  assert.deepEqual(validateExplainerImage(IMG), []);
  assert.deepEqual(validateArticle({ ...ARTICLE, explainerImage: IMG }).errors, []);
});

test("src・サイズ・alt・未知のキーの不正は検出する", () => {
  assert.ok(validateExplainerImage({ ...IMG, src: "/photos/test.png" }).length > 0);
  assert.ok(validateExplainerImage({ ...IMG, src: "https://example.com/a.webp" }).length > 0);
  assert.ok(validateExplainerImage({ ...IMG, width: 0 }).length > 0);
  assert.ok(validateExplainerImage({ ...IMG, alt: "たから まどか" }).length > 0, "キャラクター名だけのaltは不可");
  assert.ok(validateExplainerImage({ ...IMG, caption: "x" }).length > 0);
  assert.ok(validateArticle({ ...ARTICLE, explainerImage: "x" }).errors.length > 0);
});

test("画像ファイルが未配置なら null（表示しない）、配置済みなら画像情報を返す", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "explainer-"));
  assert.equal(availableExplainerImage(IMG, dir), null);
  fs.writeFileSync(path.join(dir, "test-summary.webp"), "");
  assert.equal(availableExplainerImage(IMG, dir), IMG);
  assert.equal(availableExplainerImage(undefined, dir), null);
});

test("記事ページは画像があるときだけ、タイトル・更新日の直後に width/height/alt 付きで出す", () => {
  const withImg = articlePage({ ...ARTICLE, explainerImage: IMG }, SITE);
  assert.ok(withImg.includes('<figure class="explainer-figure"><img src="/photos/test-summary.webp" width="1200" height="675" alt="テスト記事の主な論点を4項目で整理した図です" decoding="async" style="display:block;max-width:100%;height:auto;"></figure>'));
  assert.ok(withImg.indexOf("explainer-figure") > withImg.indexOf('class="article-meta"'));
  assert.ok(withImg.indexOf("explainer-figure") < withImg.indexOf('class="article-summary"'));
  // 本文テキストは画像があっても残す
  assert.ok(withImg.includes("テスト記事の本文です。"));

  const withoutImg = articlePage(ARTICLE, SITE);
  assert.ok(!withoutImg.includes("explainer-figure"));
});

test("古い style.css がキャッシュに残っていても原寸ではみ出さないよう、img に max-width:100% と height:auto を直接持たせる", () => {
  const html = articlePage({ ...ARTICLE, explainerImage: IMG }, SITE);
  const img = html.match(/<figure class="explainer-figure">(<img[^>]*>)/)[1];
  assert.ok(img.includes("max-width:100%"));
  assert.ok(img.includes("height:auto"));
  // CLS対策の width/height は残す
  assert.ok(img.includes('width="1200"') && img.includes('height="675"'));
});

test("解説画像の直下に案内役（たから まどか・たからワン）の紹介を本文テキストで出す", () => {
  const html = articlePage({ ...ARTICLE, explainerImage: IMG }, SITE);
  assert.ok(html.includes('<div class="explainer-guide"><p class="explainer-guide-title">宝塚Todayの案内役'));
  assert.ok(html.includes("「たから まどか」と柴犬の相棒「たからワン」が"));
  // 画像 → 案内役 → ポイント欄・本文 の順
  assert.ok(html.indexOf("explainer-figure") < html.indexOf("explainer-guide"));
  assert.ok(html.indexOf("explainer-guide") < html.indexOf('class="article-summary"'));
});

test("解説画像がないページには案内役の紹介を出さない", () => {
  assert.ok(!articlePage(ARTICLE, SITE).includes("explainer-guide"));
  const session = { sessionName: "テスト定例会", sessionTerm: "2026-09-01〜2026-10-07", bills: [] };
  assert.ok(!gianResultPage([session], new Map(), SITE).includes("explainer-guide"));
});

test("議案採決一覧でも、開催回の画像の直下に案内役の紹介を出す", () => {
  const session = { sessionName: "テスト定例会", sessionTerm: "2026-09-01〜2026-10-07", bills: [], explainerImage: IMG };
  const html = gianResultPage([session], new Map(), SITE);
  assert.ok(html.indexOf("explainer-figure") < html.indexOf("explainer-guide"));
  assert.ok(html.includes("宝塚Todayの案内役"));
});

test("議案採決一覧は開催回に画像があるときだけ、開催回の見出しの直後に出す", () => {
  const session = { sessionName: "テスト定例会", sessionTerm: "2026-09-01〜2026-10-07", bills: [] };
  const withImg = gianResultPage([{ ...session, explainerImage: IMG }], new Map(), SITE);
  assert.ok(withImg.includes('class="explainer-figure"'));
  assert.ok(withImg.indexOf("explainer-figure") > withImg.indexOf("テスト定例会"));
  assert.ok(!gianResultPage([session], new Map(), SITE).includes("explainer-figure"));
});

test("案内ボックスから案内役の紹介ページへリンクする", () => {
  const html = articlePage({ ...ARTICLE, explainerImage: IMG }, SITE);
  assert.ok(html.includes(`<a class="explainer-guide-link" href="/${GUIDE_CHARACTERS_SLUG}">たから まどか・たからワンについて</a>`));
});

test("案内役の紹介ページは正式原画2枚を表示し、解説画像を載せた4ページへリンクする", () => {
  const html = guideCharactersPage(SITE);
  assert.ok(html.includes('<img src="/characters/takara-madoka.webp" width="1122" height="1402"'));
  assert.ok(html.includes('<img src="/characters/takara-wan.webp" width="1122" height="1402"'));
  for (const href of ["/articles/gikai-2026-09-discussion", "/articles/shin-byoin-gikai-2026", "/category/shigikai/gian", "/articles/gikai-iken-kokan-2026-11-08"]) {
    assert.ok(html.includes(`href="${href}"`), href);
  }
  assert.ok(html.includes(`<link rel="canonical" href="${SITE}/${GUIDE_CHARACTERS_SLUG}">`));
  assert.ok(html.includes(`content="${SITE}/photos/takara-madoka-takara-wan-1200x630.webp"`));
  assert.ok(!html.includes('name="robots"'));
});

test("紹介ページで使う画像ファイルが assets に存在する", () => {
  for (const f of ["characters/takara-madoka.webp", "characters/takara-wan.webp", "photos/takara-madoka-takara-wan-1200x630.webp"]) {
    assert.ok(fs.existsSync(new URL(`../../assets/${f}`, import.meta.url)), f);
  }
});
