// 新企画「宝塚の実力」の予告バナーと企画紹介ページ：比較結果・未監査の数字・公開日の約束を載せないこと、配置、リンク、アクセシビリティ
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jitsuryokuPage, indexPage, JITSURYOKU_SLUG, JITSURYOKU_TITLE, JITSURYOKU_DESCRIPTION } from "../templates.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = "https://takarazuka-today.jp";
const textOf = (html) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const page = jitsuryokuPage(SITE);
const home = indexPage({
  topArticles: [],
  todayArticles: [],
  categoryPageKeys: new Set(),
  publishedArticles: [],
  ranking: null,
  weather: null,
  todayCounts: {},
  fieldReportPhoto: null,
  dateLabel: "2026年10月29日",
  siteUrl: SITE,
});

test("企画紹介ページ：title・description・canonical・パンくず", () => {
  assert.equal(JITSURYOKU_SLUG, "jitsuryoku");
  assert.match(page, new RegExp(`<title>${JITSURYOKU_TITLE}｜Takarazuka Today</title>`));
  assert.ok(page.includes(`<link rel="canonical" href="${SITE}/jitsuryoku">`));
  assert.ok(page.includes(JITSURYOKU_DESCRIPTION));
  assert.ok(JITSURYOKU_DESCRIPTION.length >= 70 && JITSURYOKU_DESCRIPTION.length <= 160);
  assert.match(page, /"@type":"BreadcrumbList"/);
  assert.equal((page.match(/<h1[ >]/g) ?? []).length, 1);
});

test("企画紹介ページ：目的・5都市・4テーマ・調査ルール・調査中を載せ、薄いページではない", () => {
  const t = textOf(page);
  for (const s of ["企画の目的", "比較する5都市", "調べる4つのテーマ", "調査のルール", "第1弾を公開しました", "調査を続けます"]) assert.ok(t.includes(s), s);
  for (const c of ["伊丹市", "厚木市", "茅ヶ崎市", "流山市", "松本市"]) assert.ok(t.includes(c), c);
  for (const th of ["人口", "産業", "税収", "暮らし"]) assert.ok(t.includes(th), th);
  assert.match(t, /出典・調査年・基準日・単位・集計の範囲/);
  assert.match(t, /数字だけで、街の良し悪しや行政の優劣は決めません/);
  assert.match(t, /企業の売上は、市の税収ではありません/);
  assert.match(t, /順位を付ける企画ではありません/);
  assert.ok(t.length > 900, `本文が短すぎる: ${t.length}`);
});

test("企画紹介ページ：比較結果・数字・順位・公開予定日を載せない", () => {
  const iFooter = page.indexOf("<footer");
  assert.ok(iFooter > 0, "フッターを除いた本文だけを検査する");
  const body = textOf(page.slice(page.indexOf("jitsuryoku-lead"), iFooter));
  // 数字は「5都市」「4つ」「20万人」(伊丹市の説明)・日付(最終更新日・年)以外に出さない
  const stripped = body
    .replace(/最終更新日：2026年10月30日/g, "").replace(/第1弾/g, "")
    .replace(/5都市|5市|4つ|20万人/g, "");
  assert.doesNotMatch(stripped, /\d/, `数字が残っている: ${stripped.match(/.{10}\d.{10}/)?.[0]}`);
  assert.doesNotMatch(body, /第\d位|\d位/);
  assert.doesNotMatch(body, /近日公開|公開予定|(\d+月|年)に公開|来週|来月/);
  assert.doesNotMatch(body, /強み|課題|勝ち|負け/);
});

test("トップページ：バナーは上段の左枠（今日の宝塚トピックがあった場所）に1つだけ。今日の宝塚トピックはトップニュースの下にあり、二重に出ない", () => {
  assert.equal((home.match(/class="jitsuryoku-banner"/g) ?? []).length, 1);
  assert.ok(home.includes(`href="/${JITSURYOKU_SLUG}/zeishu-shigoto"`), "バナーは第1弾へ直接リンクする");
  const iBanner = home.indexOf('class="jitsuryoku-banner"');
  const iTodayRow = home.indexOf('class="today-row"');
  const iTopNews = home.indexOf("トップニュース");
  const iTopic = home.indexOf('id="today-topic"');
  const iSide = home.indexOf('class="today-row-side"');
  assert.ok(iTodayRow > 0 && iBanner > iTodayRow && iBanner < iSide, "上段の左枠（フォト・カテゴリーの列の前）");
  assert.ok(iBanner < iTopNews, "トップニュースより上");
  assert.ok(iTopic > iTopNews, "今日の宝塚トピックはトップニュースの下");
  assert.equal((home.match(/id="today-topic"/g) ?? []).length, 1, "今日の宝塚トピックは1つ（削除も重複もしない）");
});

const sampleArticle = (slug, category, title) => ({ slug, title, summary: "", category, publishedAt: "2026-10-30", sourceName: "宝塚市公式サイト", valueScore: "A" });
const homeWith = (todayArticles) =>
  indexPage({ topArticles: [], todayArticles, categoryPageKeys: new Set(), publishedArticles: todayArticles, ranking: null, weather: null, todayCounts: {}, fieldReportPhoto: null, dateLabel: "2026年10月30日", siteUrl: SITE });

test("今日の宝塚トピック：記事の選択は変えない。防災カテゴリの記事もトピックに残り（除外しない）、1回だけ表示し、防災専用の枠は作らない", () => {
  const bosai = sampleArticle("bosai-sample", "防災", "防災のテスト記事");
  const other = sampleArticle("kurashi-sample", "行政・くらし", "くらしのテスト記事");
  const h = homeWith([bosai, other]);
  assert.equal((h.match(/防災のテスト記事/g) ?? []).length, 1, "防災記事は1回だけ");
  assert.equal((h.match(/くらしのテスト記事/g) ?? []).length, 1);
  assert.ok(!h.includes("bosai-priority"), "防災・緊急情報の専用枠は作らない");
  const iTopic = h.indexOf('id="today-topic"');
  assert.ok(iTopic > h.indexOf("トップニュース"), "今日の宝塚トピックはトップニュースの下");
  assert.ok(h.indexOf("防災のテスト記事") > iTopic && h.indexOf("くらしのテスト記事") > iTopic, "当日の記事は両方とも今日の宝塚トピックの中");
  assert.ok(h.indexOf("防災のテスト記事") < h.indexOf("くらしのテスト記事") || h.indexOf("くらしのテスト記事") < h.indexOf("防災のテスト記事"));
});

test("今日の宝塚トピック：当日の記事が無い日は従来どおり最新記事を出し、ID（#today-topic）を維持する", () => {
  const h = indexPage({ topArticles: [sampleArticle("latest-sample", "行政・くらし", "最新のテスト記事")], todayArticles: [], categoryPageKeys: new Set(), publishedArticles: [], ranking: null, weather: null, todayCounts: {}, fieldReportPhoto: null, dateLabel: "2026年10月30日", siteUrl: SITE });
  assert.equal((h.match(/id="today-topic"/g) ?? []).length, 1);
  assert.match(h, /本日の新着記事はまだありません。最新の記事をご紹介します/);
  assert.ok(h.indexOf('class="jitsuryoku-banner"') < h.indexOf('id="today-topic"'));
});

test("バナー：コピーはHTMLの文字、画像は文字なしのイメージ1枚で、イメージである旨を明示し、公開日・結論を先取りする文言を出さない", () => {
  const start = home.indexOf('<section class="jitsuryoku-banner"');
  const b = home.slice(start, home.indexOf("</section>", start));
  const t = textOf(b);
  for (const s of ["第1弾公開", "宝塚の実力", "宝塚を、知っているつもりだった。", "同じくらいの規模の街と比べたら、何が見える？", "人口・税収・産業・暮らし。5都市と比較する独自調査。", "※AI生成イメージ（実際の景観とは異なります）", "第1弾を読む"]) {
    assert.ok(t.replace(/\s/g, "").includes(s.replace(/\s/g, "")), s);
  }
  assert.match(b, /<img src="\/img\/jitsuryoku-visual\.webp" alt="" width="962" height="724"/);
  assert.equal((b.match(/<img /g) ?? []).length, 1, "画像は1枚だけ");
  assert.doesNotMatch(b, /<picture|<source|jitsuryoku-banner(-sp)?\.webp/, "文字入りの全体画像・スマホ別画像は使わない");
  assert.doesNotMatch(t, /近日公開|公開予定|強み|課題|\d月\d+日/);
  assert.equal((b.match(/href="\/jitsuryoku\/zeishu-shigoto"/g) ?? []).length, 1);
});

test("バナー画像：公開対象は文字なしの画像1枚だけ（文字入りの全体画像は assets/ にも build にも無い）", () => {
  const p = path.join(ROOT, "assets", "jitsuryoku-visual.webp");
  assert.ok(fs.existsSync(p));
  assert.ok(fs.statSync(p).size < 400 * 1024, "画像が大きすぎる");
  const jitsu = fs.readdirSync(path.join(ROOT, "assets")).filter((f) => f.startsWith("jitsuryoku-"));
  assert.deepEqual(jitsu, ["jitsuryoku-visual.webp"]);
  const build = fs.readFileSync(path.join(ROOT, "scripts", "build.js"), "utf8");
  assert.doesNotMatch(build, /jitsuryoku-banner/);
});

test("sitemap の lastmod は固定値（ビルド日ではない）", () => {
  const build = fs.readFileSync(path.join(ROOT, "scripts", "build.js"), "utf8");
  assert.match(build, /\$\{SITE_URL\}\/\$\{JITSURYOKU_SLUG\}`, lastmod: "2026-10-30"/);
});
