// h1 が無かった5ページ（吹奏楽ガイド・財政ウォッチ・議員の個別ページ・アクセスランキング）に、表示中のページ名を h1 として1つずつ置く（2026-11-19）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { suisougakuGuidePage, zaiseiWatchPage, giinPage, rankingPage, indexPage } from "../templates.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = "https://takarazuka-today.jp";
const readDir = (dir, prefix = "") =>
  fs
    .readdirSync(path.join(ROOT, "data", dir))
    .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", dir, f), "utf8")));
const h1s = (html) => [...html.matchAll(/<h1[ >][\s\S]*?<\/h1>/g)].map((m) => m[0].replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, "").trim());

test("吹奏楽ガイド・財政ウォッチ・議員の個別ページ・ランキングの h1 は、表示中のページ名1つ", () => {
  const years = readDir("events", "suisougaku-").sort((a, b) => b.year - a.year);
  const periods = readDir("zaisei").sort((a, b) => (a.period < b.period ? 1 : -1));
  const ranking = { top: [{ path: "/livecam", title: "武庫川ライブカメラ" }] };
  const cases = [
    [suisougakuGuidePage(years, SITE), "宝塚市 吹奏楽コンクールガイド"],
    [zaiseiWatchPage(periods, SITE), "宝塚市財政ウォッチ"],
    [giinPage({ slug: "test-giin", name: "テスト太郎", kaiha: "x" }, [], SITE), "テスト太郎　議員"],
    [rankingPage(null, [], SITE), "新着記事"],
    [rankingPage(ranking, [], SITE), "人気記事ランキング（30日間）"],
  ];
  for (const [html, title] of cases) assert.deepEqual(h1s(html), [title]);
});

test("ランキングの枠はトップと共通。トップでは h1 にしない（トップの h1 は1つのまま）", () => {
  const ranking = { top: [{ path: "/livecam", title: "武庫川ライブカメラ" }] };
  const home = indexPage({ featuredNews: [], todayKey: "2026-11-19", categoryPageKeys: new Set(), publishedArticles: [], ranking, weather: null, todayCounts: {}, fieldReportPhoto: null, dateLabel: "2026年11月19日(木)", siteUrl: SITE });
  assert.ok(home.includes('<p class="panel-title">') && home.includes("人気記事ランキング（30日間）"));
  assert.equal(h1s(home).length, 1);
});
