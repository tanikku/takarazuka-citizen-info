// トップページのスマホ表示（h1の表示と、ブロックの並べ替え）の最小限のテスト
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { indexPage } from "../templates.js";

const CSS = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "style.css"), "utf8");
const ARGS = { featuredNews: [], todayKey: "2026-10-25", categoryPageKeys: new Set(), publishedArticles: [], ranking: null, weather: null, todayCounts: {}, fieldReportPhoto: null, dateLabel: "2026年10月25日(日)", siteUrl: "https://takarazuka-today.jp" };

test("トップのh1は1つで、メインビジュアルの見出しにある（重複して出さない。正式A案）", () => {
  const html = indexPage(ARGS);
  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
  assert.match(html, /<section class="ah-hero" aria-labelledby="ah-hero-title">[\s\S]*?<h1 class="ah-hero__title" id="ah-hero-title">宝塚の暮らし・地域・<br>まちの話題を、<wbr>やさしく詳しく<\/h1>/);
  assert.ok(!html.includes('class="date-bar"'), "日付の帯は出さない");
});

test("スマホでもh1を隠さない（区切りの縦線だけ隠す）", () => {
  const block = CSS.match(/@media \(max-width: 600px\) \{[\s\S]*?\.site-lead-sep \{[\s\S]*?\}/)?.[0] ?? "";
  assert.match(block, /\.site-lead-sep \{\s*display: none;/);
  assert.doesNotMatch(block, /\.site-lead,\s*\.site-lead-sep/);
});

test("画面の順序とタブ順序を食い違わせる並べ替え（display: contents / main のflex化）は使わない", () => {
  assert.doesNotMatch(CSS, /display: contents/);
  assert.doesNotMatch(CSS, /(^|\n)\s*main\s*\{[^}]*flex/);
});
