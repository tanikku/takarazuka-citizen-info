// トップページの現地取材写真・ランキング表示可否のテスト（Node標準の node:test を使用）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FIELD_REPORT_PHOTOS, pickFieldReportPhoto, isRankingFresh, RANKING_MAX_AGE_DAYS, FIELD_REPORT_GALLERY, buildFieldReportGallery } from "./home-features.js";
import { indexPage, rankingPage, RANKING_PAGE_NOINDEX, articlePage, guideCharactersPage, photoGalleryPage } from "../templates.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = "https://takarazuka-today.jp";

function home(overrides = {}) {
  return indexPage({
    featuredNews: [],
    todayKey: "2026-10-16",
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

// --- 案内役カード ---

test("TOPには案内役カードが1つあり、紹介ページへのリンクは1件、画像は正式原画を参照する", () => {
  const html = home();
  assert.equal(html.split('class="panel guide-chara-panel"').length - 1, 1);
  assert.equal(html.split('href="/takara-madoka-takara-wan"').length - 1, 1);
  // TOPは正式原画を縮小した軽量版を使い、フルサイズの原画は直接読み込まない
  assert.ok(html.includes('<img src="/characters/takara-madoka-thumb.webp"'));
  assert.ok(html.includes('<img src="/characters/takara-wan-thumb.webp"'));
  assert.ok(!html.includes('"/characters/takara-madoka.webp"'));
  assert.ok(!html.includes('"/characters/takara-wan.webp"'));
  // 「たからワン」の途中で改行しない
  assert.ok(html.includes('<span class="nowrap">たから まどか ＆</span> <span class="nowrap">柴犬のたからワン</span>'));
  assert.ok(html.includes("2人について詳しく見る →"));
});

test("案内役カードはTOP以外のページには出ない", () => {
  const article = articlePage({
    slug: "test-article", title: "テスト", summary: "本文", sourceUrl: "https://www.city.takarazuka.hyogo.jp/",
    sourceName: "宝塚市公式サイト", publishedAt: "2026-10-16", category: "行政・くらし", valueScore: "A",
  }, SITE);
  assert.ok(!article.includes("guide-chara-panel"));
  assert.ok(!rankingPage(null, [], SITE).includes("guide-chara-panel"));
});

test("紹介固定ページは正式原画（フルサイズ）を使い続ける", () => {
  const html = guideCharactersPage(SITE);
  assert.ok(html.includes('<img src="/characters/takara-madoka.webp"'));
  assert.ok(html.includes('<img src="/characters/takara-wan.webp"'));
  assert.ok(!html.includes("-thumb.webp"));
});

test("TOP用の軽量版画像は正式原画の5分の1未満の容量", () => {
  for (const name of ["takara-madoka", "takara-wan"]) {
    const thumb = fs.statSync(path.join(ROOT, "assets", "characters", `${name}-thumb.webp`)).size;
    const full = fs.statSync(path.join(ROOT, "assets", "characters", `${name}.webp`)).size;
    assert.ok(thumb < full / 5, `${name}: ${thumb} >= ${full}/5`);
  }
});

// --- 注目・新着ニュースと記事枠の重複 ---
function fakeArticle(slug, category = "行政・くらし") {
  return { slug, title: `記事${slug}`, summary: "", sourceUrl: "https://example.jp/", sourceName: "宝塚市公式サイト", publishedAt: "2026-10-15", category, valueScore: "A" };
}
function countLinks(html, slug) {
  return html.split(`href="/articles/${slug}"`).length - 1;
}
const picked = (list, kind = "new") => list.map((article) => ({ article, reason: { kind } }));
function panelSlice(html, title) {
  const start = html.indexOf(title);
  const next = html.indexOf('<p class="panel-title">', start + title.length);
  return html.slice(start, next === -1 ? undefined : next);
}

test("ニュース枠は「注目・新着ニュース」1つだけ。旧「トップニュース」「今日の宝塚トピック」は出さない", () => {
  const list = ["a1", "a2", "a3"].map((s) => fakeArticle(s));
  const html = home({ featuredNews: picked(list), publishedArticles: list });
  assert.equal(html.split("注目・新着ニュース").length - 1, 1);
  assert.ok(!html.includes("トップニュース") && !html.includes("今日の宝塚トピック"));
  assert.ok(!html.includes("最新の記事をご紹介します") && !html.includes("本日の新着記事はまだありません"));
});

test("注目枠に出した記事は、市議会情報・新着記事では重ねて出さない（1回だけ）", () => {
  const list = [fakeArticle("a1"), fakeArticle("a2"), fakeArticle("a3"), fakeArticle("g1", "市議会"), fakeArticle("a4"), fakeArticle("a5")];
  const html = home({ featuredNews: picked(list.slice(0, 3)), publishedArticles: list });
  for (const a of list) assert.equal(countLinks(html, a.slug), 1, `${a.slug} の表示回数`);
});

test("注目枠が市議会記事を含む日は、市議会情報に重ねて出さない。足りない分を古い市議会記事で補わない", () => {
  const list = [fakeArticle("g1", "市議会"), fakeArticle("a1"), fakeArticle("g2", "市議会"), fakeArticle("g3", "市議会"), fakeArticle("g4", "市議会")];
  const html = home({ featuredNews: picked([list[0]]), publishedArticles: list, hasGianPage: true });
  assert.equal(countLinks(html, "g1"), 1);
  const corner = html.slice(html.indexOf("shigikai-corner"), html.indexOf("市議会ウォッチ一覧へ"));
  // 最新3件（g1・g2・g3）のうち、注目枠に出た g1 だけが抜ける。g4（4番目に新しい）は繰り上げない
  assert.deepEqual(["g1", "g2", "g3", "g4"].map((s) => countLinks(corner, s)), [0, 1, 1, 0]);
});

test("市議会の日程などの案内は、サイトのお知らせではなく「市議会情報」の枠に出す", () => {
  const list = [fakeArticle("g1", "市議会"), fakeArticle("a1")];
  const gikaiNotices = [{ text: "12月定例会の予定：テスト", href: "/category/shigikai", until: "2099-12-31" }];
  const html = home({ featuredNews: picked([list[1]]), publishedArticles: list, hasGianPage: true, gikaiNotices });
  const corner = html.slice(html.indexOf("shigikai-corner"), html.indexOf("市議会ウォッチ一覧へ"));
  assert.ok(corner.includes("12月定例会の予定：テスト") && corner.includes('href="/category/shigikai"'));
  assert.ok(!panelSlice(html, "注目・新着ニュース").includes("12月定例会の予定"), "注目枠のお知らせには出さない");
  assert.ok(!html.includes("サイトからのお知らせ"), "サイト自体のお知らせが無い日は見出しも出さない");
});

test("新着記事には noindex の記事を出さない", () => {
  const list = ["a1", "a2", "a3", "a4", "a5", "a6"].map((s) => fakeArticle(s));
  list[5].indexing = "noindex";
  const html = home({ featuredNews: picked(list.slice(0, 3)), publishedArticles: list });
  assert.equal(countLinks(html, "a6"), 0);
});

test("noindex の記事が新着候補に混ざっても、新着記事は検索対象の記事だけで埋める", () => {
  const list = Array.from({ length: 16 }, (_, i) => fakeArticle(`n${i}`));
  for (const i of [6, 8, 10]) list[i].indexing = "noindex";
  const html = home({ featuredNews: picked(list.slice(0, 3)), publishedArticles: list });
  const recent = panelSlice(html, "新着記事</p>");
  for (const i of [6, 8, 10]) assert.equal(countLinks(recent, `n${i}`), 0, `n${i}`);
  const shownInRecent = list.filter((a) => countLinks(recent, a.slug) === 1).map((a) => a.slug);
  assert.equal(shownInRecent.length, 10);
  assert.deepEqual(shownInRecent, ["n3", "n4", "n5", "n7", "n9", "n11", "n12", "n13", "n14", "n15"]);
});

test("候補が0件の日は古い記事で埋めず、「新着がない」と言って新着記事への導線を出す", () => {
  const list = ["a1", "a2", "a3"].map((s) => fakeArticle(s));
  const html = home({ featuredNews: [], publishedArticles: list });
  const panel = panelSlice(html, "注目・新着ニュース");
  assert.match(panel, /この1週間に、新しい注目記事はありません/);
  for (const a of list) assert.equal(countLinks(panel, a.slug), 0, "注目枠には出さない");
  assert.match(panel, /href="#recent-articles"/);
  assert.ok(html.includes('id="recent-articles"'));
});

test("注目枠は基準日（ビルド時点の日付）と、各記事が載っている理由のラベルを出す", () => {
  const list = ["a1", "a2"].map((s) => fakeArticle(s));
  const html = home({ featuredNews: [{ article: list[0], reason: { kind: "soon", homeDate: { kind: "開催", date: "2026-10-17" } } }, { article: list[1], reason: { kind: "upcoming", homeDate: { kind: "締切", date: "2026-10-25" } } }], publishedArticles: list });
  const panel = panelSlice(html, "注目・新着ニュース");
  assert.match(panel, /10月16日時点の情報です/);
  assert.match(panel, /<span class="reason-tag">10月17日開催<\/span>/);
  assert.match(panel, /<span class="reason-tag">10月25日締切<\/span>/);
  assert.doesNotMatch(panel, /reason-tag">本日</, "相対表現は使わない（再ビルドまで古い「本日」が残るため）");
});

test("サイトのお知らせはニュースと区別して注目枠の下に小さく出し、リンクを持つ", () => {
  const list = ["a1", "a2"].map((s) => fakeArticle(s));
  const notice = { text: "テストのお知らせ", href: "/category/shigikai/gian", until: "2099-12-31" };
  const html = home({ featuredNews: picked(list), publishedArticles: list, activeNotices: [notice] });
  const panel = panelSlice(html, "注目・新着ニュース");
  assert.ok(panel.includes("サイトからのお知らせ") && panel.includes("テストのお知らせ") && panel.includes('href="/category/shigikai/gian"'));
  assert.ok(panel.indexOf("テストのお知らせ") > panel.indexOf("記事a2"), "お知らせは記事の後ろ");
});

// --- 現地取材フォト（/photo） ---
function loadAllGuides() {
  const dir = path.join(ROOT, "data", "guides");
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}

test("現地取材フォトは撮影を明記したガイドの写真だけで、取材日・横長・実ファイルをそろえる", () => {
  const gallery = buildFieldReportGallery(loadAllGuides());
  assert.equal(gallery.length, FIELD_REPORT_GALLERY.length);
  for (const g of gallery) {
    assert.match(g.reportedOn, /^\d{4}年\d{1,2}月\d{1,2}日$/, g.place);
    assert.ok(g.photos.length >= 2, g.place);
    for (const p of g.photos) {
      assert.ok(fs.existsSync(path.join(ROOT, "assets", p.src)), p.src);
      assert.ok(p.width > p.height, `${p.src} は横長ではない`);
      assert.ok(!p.src.includes("/0010"), `${p.src} はオープンデータの写真`);
      assert.ok(p.caption && p.alt, p.src);
    }
  }
});

test("撮影の明記が無いガイドや存在しない写真は、推測で埋めずにエラーにする", () => {
  const guides = loadAllGuides();
  assert.throws(() => buildFieldReportGallery(guides, [{ guide: "hanshin-keibajo-guide", place: "阪神競馬場", photos: ["/photos/hanshin-keibajo.jpg"] }]));
  assert.throws(() => buildFieldReportGallery(guides, [{ guide: "dahlia-en-guide", place: "宝塚ダリア園", photos: ["/photos/not-found.webp"] }]));
});

test("/photo は場所ごとに取材日・撮影者・ガイドへのリンクを出し、トップのフォトから辿れる", () => {
  const gallery = buildFieldReportGallery(loadAllGuides());
  const html = photoGalleryPage(gallery, SITE);
  for (const g of gallery) {
    assert.ok(html.includes(g.place));
    assert.ok(html.includes(`現地取材：${g.reportedOn}・写真：宝塚Today撮影`));
    assert.ok(html.includes(`href="${g.href}"`));
  }
  assert.ok(html.includes('rel="canonical" href="https://takarazuka-today.jp/photo"'));
  const top = home();
  assert.ok(top.includes('<a class="qa-tile" href="/photo">'));
  assert.ok(top.includes('href="/photo">現地取材フォトをもっと見る'));
});

test("/photo の一覧は縮小版を表示して元画像へリンクし、最初の1枚だけ優先読み込みする", () => {
  const gallery = buildFieldReportGallery(loadAllGuides());
  const html = photoGalleryPage(gallery, SITE);
  const photos = gallery.flatMap((g) => g.photos);
  for (const p of photos) {
    const thumbPath = path.join(ROOT, "assets", p.thumb);
    assert.ok(fs.existsSync(thumbPath), p.thumb);
    assert.ok(fs.statSync(thumbPath).size < fs.statSync(path.join(ROOT, "assets", p.src)).size, `${p.thumb} が元画像より小さくない`);
    assert.ok(html.includes(`<a href="${p.src}"><img src="${p.thumb}"`), p.src);
  }
  const imgs = html.match(/<img src="\/photos\/[^"]+-800w\.webp"[^>]*>/g);
  assert.equal(imgs.length, photos.length);
  assert.ok(imgs[0].includes('fetchpriority="high"') && !imgs[0].includes('loading="lazy"'));
  for (const img of imgs.slice(1)) assert.ok(img.includes('loading="lazy"') && !img.includes("fetchpriority"), img);
});
