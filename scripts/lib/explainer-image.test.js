// 「3〜4ポイント解説」画像（explainerImage）の検証・表示のテスト（Node標準の node:test を使用）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateExplainerImage, availableExplainerImage } from "./explainer-image.js";
import { validateArticle } from "./article-schema.js";
import { articlePage, gianResultPage } from "../templates.js";

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

test("議案採決一覧は開催回に画像があるときだけ、開催回の見出しの直後に出す", () => {
  const session = { sessionName: "テスト定例会", sessionTerm: "2026-09-01〜2026-10-07", bills: [] };
  const withImg = gianResultPage([{ ...session, explainerImage: IMG }], new Map(), SITE);
  assert.ok(withImg.includes('class="explainer-figure"'));
  assert.ok(withImg.indexOf("explainer-figure") > withImg.indexOf("テスト定例会"));
  assert.ok(!gianResultPage([session], new Map(), SITE).includes("explainer-figure"));
});
