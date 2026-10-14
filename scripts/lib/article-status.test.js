// article-status.js と、その表示（記事ページ・一覧）の単体テスト（Node標準の node:test を使用）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { articleStatusNotice, isListableAsUpcoming, formatJapaneseDate, ARTICLE_STATUSES } from "./article-status.js";
import { validateArticle } from "./article-schema.js";
import { articlePage, categoryPage, eventsPage, CATEGORIES } from "../templates.js";

const SITE = "https://takarazuka-today.jp";

function article(overrides = {}) {
  return {
    slug: "status-test-2026",
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

const kurashi = CATEGORIES.find((c) => c.label === "行政・くらし");

// --- 状態表示の文言 ---

test("status 未設定・active は状態表示なし", () => {
  assert.equal(articleStatusNotice(article()), null);
  assert.equal(articleStatusNotice(article({ status: "active" })), null);
});

test("ended は終了表示（日付なし）", () => {
  const notice = articleStatusNotice(article({ status: "ended" }));
  assert.equal(notice.label, "終了");
  assert.equal(notice.message, "この記事で案内したイベント・実施期間は終了しました。以下は掲載当時の内容です。");
});

test("closed は受付終了表示（日付なし）", () => {
  const notice = articleStatusNotice(article({ status: "closed" }));
  assert.equal(notice.label, "受付終了");
  assert.equal(notice.message, "この記事で案内した募集・申込受付は終了しています。以下は掲載当時の内容です。");
});

test("resolved は復旧・対応終了表示（日付なし）", () => {
  const notice = articleStatusNotice(article({ status: "resolved" }));
  assert.equal(notice.label, "復旧済み");
  assert.equal(notice.message, "この記事の事案は復旧・対応終了しています。以下は掲載当時の内容です。");
});

test("statusDate がある場合は日付つきで表示する", () => {
  assert.equal(
    articleStatusNotice(article({ status: "ended", statusDate: "2026-09-30" })).message,
    "この記事で案内したイベント・実施期間は2026年9月30日に終了しました。以下は掲載当時の内容です。"
  );
  assert.equal(
    articleStatusNotice(article({ status: "closed", statusDate: "2026-07-14" })).message,
    "この記事で案内した募集・申込受付は2026年7月14日に終了しました。以下は掲載当時の内容です。"
  );
  assert.equal(
    articleStatusNotice(article({ status: "resolved", statusDate: "2026-09-03" })).message,
    "この記事の事案は2026年9月3日に復旧・対応終了しました。以下は掲載当時の内容です。"
  );
});

test("formatJapaneseDate はゼロ埋めを外して年月日にする", () => {
  assert.equal(formatJapaneseDate("2026-01-05"), "2026年1月5日");
});

// --- 検証 ---

test("定義済みの status はすべて valid", () => {
  for (const status of ARTICLE_STATUSES) {
    assert.deepEqual(validateArticle(article({ status })).errors, []);
  }
});

test("不正な status は validation error", () => {
  const { errors } = validateArticle(article({ status: "finished" }));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^status は active \/ ended \/ closed \/ resolved のいずれかです/);
});

test("statusDate は実在する YYYY-MM-DD でなければ error", () => {
  assert.equal(validateArticle(article({ status: "ended", statusDate: "2026-09-31" })).errors.length, 1);
  assert.equal(validateArticle(article({ status: "ended", statusDate: "9月30日" })).errors.length, 1);
  assert.deepEqual(validateArticle(article({ status: "ended", statusDate: "2026-09-30" })).errors, []);
});

test("statusDate は status 未設定・active では error", () => {
  assert.match(validateArticle(article({ statusDate: "2026-09-30" })).errors[0], /statusDate は status が/);
  assert.match(validateArticle(article({ status: "active", statusDate: "2026-09-30" })).errors[0], /statusDate は status が/);
});

// --- 記事ページ ---

test("既存記事（status なし）の記事ページは従来どおりで、status: active とも同一", () => {
  const legacy = articlePage(article(), SITE);
  assert.ok(!legacy.includes("article-status"));
  assert.ok(!legacy.includes("status-tag"));
  assert.equal(articlePage(article({ status: "active" }), SITE), legacy);
});

test("終了済み記事はタイトル直後（公開日の次）に状態表示を出す", () => {
  const html = articlePage(article({ status: "ended", statusDate: "2026-09-30" }), SITE);
  const meta = html.indexOf('<p class="article-meta">');
  const box = html.indexOf('<p class="article-status article-status-ended" role="note">');
  const summary = html.indexOf('<p class="article-summary">');
  assert.ok(meta > 0 && box > meta && summary > box, "公開日 → 状態表示 → 本文 の順");
  assert.ok(html.includes("2026年9月30日に終了しました"));
});

test("状態表示は noindex を付けない（インデックス可否は別判断）", () => {
  const html = articlePage(article({ status: "closed" }), SITE);
  assert.ok(!html.includes('name="robots"'));
});

// --- 一覧 ---

test("カテゴリー一覧で状態タグを出し、status なしの記事には出さない", () => {
  const html = categoryPage(kurashi, [article({ slug: "a-ended", status: "ended" }), article({ slug: "b-legacy" })], SITE);
  const ended = html.slice(html.indexOf('href="/articles/a-ended"'), html.indexOf('href="/articles/b-legacy"'));
  const legacy = html.slice(html.indexOf('href="/articles/b-legacy"'));
  assert.ok(ended.includes('<span class="status-tag status-ended">終了</span>'));
  assert.ok(!legacy.split("</a>")[0].includes("status-tag"));
});

test("イベントカレンダーには ended / resolved を載せず、closed と active は載せる", () => {
  assert.equal(isListableAsUpcoming(article()), true);
  assert.equal(isListableAsUpcoming(article({ status: "active" })), true);
  assert.equal(isListableAsUpcoming(article({ status: "closed" })), true);
  assert.equal(isListableAsUpcoming(article({ status: "ended" })), false);
  assert.equal(isListableAsUpcoming(article({ status: "resolved" })), false);
});

test("イベントカレンダーで受付終了の催しに状態タグを出す", () => {
  const occurrence = { article: article({ status: "closed" }), date: "2026-11-07" };
  const html = eventsPage({ todayEvents: [], thisWeekend: [], thisMonth: [occurrence], siteUrl: SITE });
  assert.ok(html.includes('<span class="status-tag status-closed">受付終了</span>テスト記事のタイトル'));
});
