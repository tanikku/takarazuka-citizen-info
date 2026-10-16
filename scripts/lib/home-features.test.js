// トップページの現地取材写真・ランキング表示可否のテスト（Node標準の node:test を使用）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FIELD_REPORT_PHOTOS, pickFieldReportPhoto, isRankingFresh, RANKING_MAX_AGE_DAYS } from "./home-features.js";
import { indexPage, rankingPage, RANKING_PAGE_NOINDEX } from "../templates.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = "https://takarazuka-today.jp";

function home(overrides = {}) {
  return indexPage({
    topArticles: [],
    todayArticles: [],
    categoryPageKeys: new Set(),
    publishedArticles: [],
    ranking: null,
    weather: null,
    todayCounts: {},
    fieldReportPhoto: FIELD_REPORT_PHOTOS[0],
    dateLabel: "2026年10月16日(金)",
    siteUrl: SITE,
    ...overrides,
  });
}

// --- 現地取材写真 ---

test("現地取材の写真は宝塚Today撮影の3枚で、リンク先は現地取材を明記したガイドだけ", () => {
  assert.deepEqual(
    FIELD_REPORT_PHOTOS.map((p) => p.href),
    ["/category/kanko/kiyoshikojin-guide", "/category/kanko/nakayamadera-guide", "/category/kanko/aiaipark-guide"]
  );
  for (const p of FIELD_REPORT_PHOTOS) {
    assert.ok(fs.existsSync(path.join(ROOT, "assets", p.src)), p.src);
    const guide = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "guides", `${p.href.split("/").pop()}.json`), "utf8"));
    assert.ok((guide.fieldReport ?? []).some((line) => line.includes("宝塚Todayが現地で撮影")), `${p.href} に現地撮影の明記がない`);
  }
});

test("日替わりで3件を順に回り、同じ日は常に同じ写真", () => {
  assert.equal(pickFieldReportPhoto("2026-10-16"), pickFieldReportPhoto("2026-10-16"));
  const days = ["2026-10-16", "2026-10-17", "2026-10-18"].map((d) => pickFieldReportPhoto(d));
  assert.equal(new Set(days).size, 3);
  assert.equal(pickFieldReportPhoto("2026-10-19"), days[0]);
  assert.equal(pickFieldReportPhoto("2026-10-16", []), null);
});

test("年をまたいでも翌日は次の候補へ進む", () => {
  const next = (p) => FIELD_REPORT_PHOTOS[(FIELD_REPORT_PHOTOS.indexOf(p) + 1) % FIELD_REPORT_PHOTOS.length];
  for (const [today, tomorrow] of [["2026-12-31", "2027-01-01"], ["2028-02-28", "2028-02-29"], ["2028-12-31", "2029-01-01"]]) {
    assert.equal(pickFieldReportPhoto(tomorrow), next(pickFieldReportPhoto(today)), `${today}→${tomorrow}`);
  }
});

test("あいあいパークの日は、場所と撮影日（2026年10月16日）を出してガイドへリンクする", () => {
  const html = home({ fieldReportPhoto: FIELD_REPORT_PHOTOS[2] });
  assert.ok(html.includes('<a class="photo-hero" href="/category/kanko/aiaipark-guide">'));
  assert.ok(html.includes('<span class="photo-hero-title">あいあいパーク</span>'));
  assert.ok(html.includes('<span class="photo-hero-credit">宝塚Today撮影｜2026年10月16日</span>'));
});

test("あいあいパークガイドは現地取材日と、駅から歩いた所要時間を実測として書く", () => {
  const guide = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "guides", "aiaipark-guide.json"), "utf8"));
  const text = JSON.stringify(guide);
  assert.ok(guide.fieldReport.includes("現地取材：2026年10月16日"));
  assert.equal(guide.cardPhoto, "/photos/aiaipark-exterior-20261016-1200x630.webp");
  assert.ok(text.includes("宝塚Today編集部が2026年10月16日に阪急山本駅南口から実際に歩いたところ、あいあいパークまでは約5分でした。"));
  assert.ok(text.includes("信号待ちや歩く速度によって所要時間は変わります。"));
  assert.ok(!/(?<!約)徒歩5分/.test(text), "「徒歩5分」と断定しない");
  // 駐車場は公式アクセスページの現行案内（合計135台・2026年10月1日からの料金）に揃える
  assert.ok(text.includes("135台"));
  assert.ok(text.includes("2026年10月1日から"));
  for (const old of ["65台", "75台", "140台"]) assert.ok(!text.includes(old), old);
  // 2026-10-16 に直した歴史記述を残す
  assert.ok(text.includes("平安期に始まり"));
  assert.ok(text.includes("2000年4月にオープン"));
  for (const item of guide.sections.flatMap((s) => s.items)) {
    if (item.photo) assert.ok(fs.existsSync(path.join(ROOT, "assets", item.photo.src)), item.photo.src);
  }
});

test("トップの写真欄は現地取材バッジ・場所・撮影者と撮影日を出し、旧クレジットは出さない", () => {
  const html = home();
  assert.ok(html.includes('<a class="photo-hero" href="/category/kanko/kiyoshikojin-guide">'));
  assert.ok(html.includes('<span class="season-tag">現地取材</span>'));
  assert.ok(html.includes('<span class="photo-hero-title">清荒神清澄寺・山門</span>'));
  assert.ok(html.includes('<span class="photo-hero-credit">宝塚Today撮影｜2026年10月3日</span>'));
  assert.ok(!html.includes("今日の宝塚フォト"));
  assert.ok(!html.includes("写真提供：宝塚市オープンデータ（CC BY 4.0）"));
});

// --- ランキング ---

test(`ランキングは生成から${RANKING_MAX_AGE_DAYS}日以内だけ使う`, () => {
  assert.equal(isRankingFresh({ generatedAt: "2026-10-10T12:00:00.000Z" }, "2026-10-16"), true);
  assert.equal(isRankingFresh({ generatedAt: "2026-07-22T12:18:24.236Z" }, "2026-10-16"), false);
  assert.equal(isRankingFresh({}, "2026-10-16"), false);
  assert.equal(isRankingFresh({ generatedAt: "not a date" }, "2026-10-16"), false);
  assert.equal(isRankingFresh(null, "2026-10-16"), false);
});

test("/ranking/ は noindex（robots は1つだけ）で canonical は自分自身", () => {
  assert.equal(RANKING_PAGE_NOINDEX, true);
  const html = rankingPage(null, [], SITE);
  assert.equal(html.split('name="robots"').length - 1, 1);
  assert.ok(html.includes('<meta name="robots" content="noindex">'));
  assert.ok(html.includes(`<link rel="canonical" href="${SITE}/ranking/">`));
});

test("/ranking/ は最新ランキングが無いとき新着記事で代替し、その理由を事実どおりに書く", () => {
  const html = rankingPage(null, [], SITE);
  assert.ok(html.includes("※最新のアクセスランキングを表示できないため、新着記事を表示しています"));
  assert.ok(!html.includes("アクセスデータが蓄積されると"));
});

test("/ranking/ の title・説明文・パンくずは実際の表示内容（新着かランキングか）に合わせる", () => {
  const recent = rankingPage(null, [], SITE);
  assert.ok(recent.includes("<title>新着記事｜Takarazuka Today</title>"));
  assert.ok(recent.includes('content="Takarazuka Todayの新着記事をまとめてご案内します。"'));
  assert.ok(recent.includes('&gt; 新着記事</nav>'));
  assert.ok(!recent.includes("人気記事ランキング"));

  const ranked = rankingPage({ top: [{ path: "/livecam", title: "武庫川ライブカメラ" }] }, [], SITE);
  assert.ok(ranked.includes("<title>人気記事ランキング｜Takarazuka Today</title>"));
  assert.ok(ranked.includes("過去30日間のアクセスデータをもとに紹介します。"));
});

test("トップはランキングが無い（古い）日はランキング欄を出さない", () => {
  assert.ok(!home({ ranking: null }).includes("人気記事ランキング"));
  const ranking = { top: [{ path: "/livecam", title: "武庫川ライブカメラ" }] };
  assert.ok(home({ ranking }).includes("人気記事ランキング（30日間）"));
});
