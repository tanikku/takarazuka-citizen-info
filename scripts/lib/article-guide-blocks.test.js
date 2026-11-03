// 記事をガイド型に組むための部品（目的別カード quickLinks・節の id・折りたたみ collapsed・FAQ faq・手順 steps）のテスト
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { validateArticle } from "./article-schema.js";
import { articlePage } from "../templates.js";

const SITE = "https://takarazuka-today.jp";
const ARTICLE = {
  slug: "test-guide-blocks",
  title: "テスト記事",
  summary: "テスト記事の本文です。",
  sourceUrl: "https://www.city.takarazuka.hyogo.jp/",
  sourceName: "宝塚市公式サイト",
  publishedAt: "2026-11-01",
  category: "教育",
  valueScore: "A",
};
const LINK = { icon: "building", tag: "学校から", title: "学校から探す", desc: "説明", href: "#school" };
const SECTIONS = [
  { id: "school", heading: "学校から探す", paragraphs: ["本文"] },
  { id: "apply", heading: "申込", items: [{ steps: [{ title: "探す", text: "ポータルで探す" }, { title: "申し込む", text: "クラブへ直接" }] }] },
  { id: "faq", heading: "よくある質問", faq: [{ q: "校区外でも入れますか？", a: "クラブの条件によります。" }] },
  { id: "past", heading: "過去資料", collapsed: "過去資料を開く", paragraphs: ["2月12日時点の予定"] },
];
const article = (extra = {}) => ({ ...ARTICLE, sections: SECTIONS, quickLinks: { heading: "目的から探す", links: [LINK] }, ...extra });
const errorsOf = (extra) => validateArticle(article(extra)).errors;

test("quickLinks・id・collapsed・faq・steps を持つ記事が通る", () => {
  assert.deepEqual(validateArticle(article()).errors, []);
  assert.deepEqual(errorsOf({ quickLinks: { heading: "目的から探す", links: [LINK, LINK, LINK, LINK] } }), [], "記事は4件まで");
});

test("quickLinks の不正（5件以上・存在しない節・外部URL・未知のアイコン・空の項目・未知のキー）を検出する", () => {
  const q = (links, more = {}) => errorsOf({ quickLinks: { heading: "目的から探す", links, ...more } });
  assert.ok(q([LINK, LINK, LINK, LINK, LINK]).length > 0);
  assert.ok(q([]).length > 0);
  assert.ok(q([{ ...LINK, href: "#missing" }]).length > 0);
  assert.ok(q([{ ...LINK, href: "https://example.com/" }]).length > 0, "カードは同じ記事の節だけを指す");
  assert.ok(q([{ ...LINK, icon: "nothing" }]).length > 0);
  assert.ok(q([{ ...LINK, desc: "" }]).length > 0);
  assert.ok(q([{ ...LINK, extra: "x" }]).length > 0);
  assert.ok(q([LINK], { extra: 1 }).length > 0);
});

test("節の id・collapsed・faq・steps の不正を検出する", () => {
  const withSections = (sections) => validateArticle({ ...ARTICLE, sections }).errors;
  assert.ok(withSections([{ id: "Bad_ID", heading: "a", paragraphs: ["x"] }]).length > 0, "id の形式");
  assert.ok(withSections([{ id: "dup", heading: "a", paragraphs: ["x"] }, { id: "dup", heading: "b", paragraphs: ["y"] }]).length > 0, "id の重複");
  assert.ok(withSections([{ heading: "a", collapsed: "", paragraphs: ["x"] }]).length > 0, "空の折りたたみ見出し");
  assert.ok(withSections([{ heading: "a", faq: [] }]).length > 0, "空の faq");
  assert.ok(withSections([{ heading: "a", faq: [{ q: "質問", a: "" }] }]).length > 0, "答えが空");
  assert.ok(withSections([{ heading: "a", faq: [{ q: "質問", a: "答え", html: "<b>" }] }]).length > 0, "faq の未知のキー");
  assert.ok(withSections([{ heading: "a", items: [{ steps: [{ title: "1つだけ", text: "x" }] }] }]).length > 0, "手順は2段以上");
  assert.ok(withSections([{ heading: "a", items: [{ steps: [{ title: "a", text: "" }, { title: "b", text: "c" }] }] }]).length > 0, "手順の空の本文");
  assert.ok(withSections([{ id: "quick-links-title", heading: "a", paragraphs: ["x"] }]).length > 0, "カード見出しの id と重なる");
  assert.ok(withSections([{ heading: "a", items: [{ steps: [{ title: "a", text: "b" }, { title: "c", text: "d" }], table: {} }] }]).length > 0, "steps と他のキーの混在");
});

test("カードと手順の文字もエスケープし、カードは押せる大きさの1つのリンク・アイコンは読み上げ対象外", () => {
  const evil = { ...LINK, tag: "<t>", title: "a & b", desc: '"<script>' };
  const html = articlePage(
    article({
      quickLinks: { heading: "<h>", links: [evil] },
      sections: [{ id: "school", heading: "a", items: [{ steps: [{ title: "<b>1", text: "x & y" }, { title: "2", text: "<img>" }] }] }],
    }),
    SITE,
  );
  assert.ok(html.includes("&lt;t&gt;") && html.includes("a &amp; b") && html.includes("&quot;&lt;script&gt;") && html.includes("&lt;h&gt;"));
  assert.ok(html.includes('<p class="article-step-title">&lt;b&gt;1</p>') && html.includes("x &amp; y") && html.includes("&lt;img&gt;"));
  assert.ok(!html.includes('"<script>') && !html.includes("<img>"), "入力の生タグは出力しない");
  const nav = html.slice(html.indexOf('<nav class="contact-cards quick-links'), html.indexOf("</nav>", html.indexOf("quick-links")));
  assert.ok(nav.includes('aria-labelledby="quick-links-title"') && nav.includes('<h2 id="quick-links-title">'), "ナビの名前を見出しから取る");
  assert.ok(nav.includes('aria-hidden="true"'), "装飾アイコンは読み上げない");
});

test("実際のZUKAッチャ記事：カードの行き先がすべて存在し、外部リンクは https のみ", async () => {
  const { readFileSync } = await import("node:fs");
  const a = JSON.parse(readFileSync(new URL("../../data/articles/bukatsu-chiiki-tenkai-guide-2026.json", import.meta.url), "utf8"));
  assert.deepEqual(validateArticle(a).errors, []);
  const html = articlePage(a, SITE);
  for (const l of a.quickLinks.links) assert.ok(html.includes(`id="${l.href.slice(1)}"`), l.href);
  const hrefs = [...html.matchAll(/class="table-cell-link" href="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length > 0 && hrefs.every((h) => h.startsWith("https://")));
  assert.equal((html.match(/<details class="article-collapse">/g) ?? []).length, 2, "古い資料と全種目の一覧は折りたたむ");
  assert.ok(!/<details class="article-collapse" open/.test(html), "最初は閉じている");
});

test("カード・節の id・手順・FAQ・折りたたみを描画し、すべてエスケープする", () => {
  const html = articlePage(article(), SITE);
  assert.ok(html.includes('<nav class="contact-cards quick-links" aria-labelledby="quick-links-title">'));
  assert.ok(html.includes('<a class="quick-link" href="#school">'));
  assert.ok(html.includes('<section class="article-section" id="school">'));
  assert.ok(html.indexOf("quick-links") < html.indexOf("article-summary"), "カードは要約より前（記事の上部）");
  const withPoints = articlePage(article({ keyPointsTitle: "ポイント", keyPoints: ["要点"] }), SITE);
  assert.ok(withPoints.indexOf("quick-links") < withPoints.indexOf("ポイント"), "スマホでも最初に見えるよう、要点より前に出す");
  assert.ok(html.includes('<ol class="article-steps">') && html.includes('<p class="article-step-title">探す</p>'));
  assert.ok(html.includes('<p class="faq-q">Q. 校区外でも入れますか？</p>'));
  assert.ok(html.includes('<details class="article-collapse"><summary>過去資料を開く</summary>'));
  assert.ok(html.indexOf("<h2>過去資料</h2>") < html.indexOf("article-collapse"), "見出しは折りたたみの外に出す");
  const four = articlePage(article({ quickLinks: { heading: "目的から探す", links: [LINK, LINK, LINK, LINK] } }), SITE);
  assert.ok(four.includes("quick-links quick-links--four"), "4件のときは2列用のクラスを付ける");
  const esc = articlePage(article({ sections: [{ id: "school", heading: "a", faq: [{ q: "<i>", a: "x & <b>" }], collapsed: "<s>" }] }), SITE);
  assert.ok(esc.includes("Q. &lt;i&gt;") && esc.includes("x &amp; &lt;b&gt;") && esc.includes("<summary>&lt;s&gt;</summary>"));
});

test("新しい項目を持たない記事の出力は変わらない（id 属性・カード・折りたたみを出さない）", () => {
  const html = articlePage({ ...ARTICLE, sections: [{ heading: "節", paragraphs: ["本文"] }] }, SITE);
  assert.ok(html.includes('<section class="article-section">\n<h2>節</h2>'));
  assert.ok(!html.includes("quick-links") && !html.includes("article-collapse") && !html.includes("article-steps"));
});
