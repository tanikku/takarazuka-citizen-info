// 市営住宅 下期募集記事の「受付終了」（2026-11-21に、管理センターと市の案内で11月20日までの募集期間・延長の案内が無いことを確認）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { articlePage, adsAllowedFor } from "../templates.js";
import { validateArticle } from "./article-schema.js";
import { articleSitemapEntry, isArticleIndexable } from "./indexing.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = "https://takarazuka-today.jp";
const a = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "articles", "shiei-jutaku-boshu-r8-shimoki.json"), "utf8"));
const html = articlePage(a, SITE);
const text = html.replace(/<[^>]+>/g, "");

test("記事データの検証（スキーマ）に通る", () => {
  assert.deepEqual(validateArticle(a, {}).errors, []);
});

test("状態は既存の「受付終了」で、11月20日に終了したと表示する", () => {
  assert.equal(a.status, "closed");
  assert.equal(a.statusDate, "2026-11-20");
  assert.ok(html.includes('<span class="status-tag status-closed">受付終了</span>'));
  assert.ok(text.includes("2026年11月20日に終了しました"));
  assert.ok(a.title.includes("11月20日で受付終了"));
  assert.ok(a.updatedAt >= "2026-11-21", "更新日は終了を確認した日（11月21日以降）");
});

test("再受付は補欠者だけが対象で、一般向けの再募集と書かない", () => {
  assert.ok(a.title.includes("補欠者だけが対象の再受付"));
  assert.ok(a.summary.includes("申し込めるのは公開抽選で補欠者になった人だけ"));
  assert.ok(a.summary.includes("一般向けの再募集ではありません"));
  assert.ok(!/再募集(します|しています|を行います)/.test(text));
  assert.ok(text.includes("本申込みのときの受付票が必要"));
  assert.ok(text.includes("11月28日（土）〜30日（月）"));
});

test("受付中と読める現在形の案内を残さない", () => {
  assert.ok(!a.summary.includes("募集しています"));
  assert.ok(!text.includes("受付は11月20日まで続くため"));
});

test("イベントカレンダーに再受付の日を足さない。SEO・広告の扱いは変えない", () => {
  assert.deepEqual(a.eventDates, ["2026-11-09"]);
  assert.ok(isArticleIndexable(a));
  assert.ok(!html.includes('name="robots"'));
  assert.ok(html.includes(`<link rel="canonical" href="${SITE}/articles/${a.slug}">`));
  assert.equal(articleSitemapEntry(a, SITE).lastmod, a.updatedAt);
  assert.equal(adsAllowedFor({ category: a.category, pathname: `/articles/${a.slug}` }), true);
});
