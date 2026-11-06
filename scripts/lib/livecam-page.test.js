// 武庫川ライブカメラ（/livecam）の用語・避難FAQ・カメラ一覧のテスト
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { indexPage, livecamPage } from "../templates.js";

const SITE = "https://takarazuka-today.jp";
const html = livecamPage(SITE);
const home = indexPage({ featuredNews: [], todayKey: "2026-11-04", categoryPageKeys: new Set(), publishedArticles: [], ranking: null, weather: null, todayCounts: {}, fieldReportPhoto: null, dateLabel: "2026年11月4日(水)", siteUrl: SITE });
const TAKEDAO_URL = "https://camera.hyogo.kasenkanshi.info/takarazuka/river_detail/takedao.html";

function cameraRows(page) {
  const start = page.indexOf(page === html ? "武庫川ライブカメラ一覧" : "宝塚市内のライブカメラ");
  const rows = [...page.slice(start).matchAll(/<a class="headline-row" href="(https:[^"]+)"[^>]*>\s*<div class="headline-thumb">([\s\S]*?)<\/div>\s*<div>\s*<p class="headline-title">([^<]*)<\/p>\s*<p class="headline-meta">([^<]*)<\/p>/g)];
  return rows.slice(0, 3).map((m) => ({ href: m[1], thumb: m[2], title: m[3], meta: m[4] }));
}

function faqLd() {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  return blocks.flat().find((b) => b["@type"] === "FAQPage");
}

test("水位の用語は宝塚市公式の「氾濫注意水位」にそろえ、「警戒水位」を使わない", () => {
  assert.ok(!html.includes("警戒水位"));
  assert.ok(html.includes(">氾濫注意水位</th>"));
  assert.ok(html.includes("氾濫注意水位4.90m・避難判断水位5.90m・氾濫危険水位8.70m"));
});

test("避難FAQは警戒レベル3・4の行動を分け、レベル5を待たず、水位だけで決まらないことを書く", () => {
  const a = faqLd().mainEntity.find((q) => q.name === "どのタイミングで避難を判断すればよいですか？").acceptedAnswer.text;
  assert.ok(a.includes("警戒レベル3（高齢者等避難）") && a.includes("自主的な避難"));
  assert.ok(a.includes("危険な場所にいる人は全員避難"));
  assert.ok(a.includes("レベル5を待たず"));
  assert.ok(a.includes("避難情報は水位だけで決まるものではありません"));
});

test("FAQの構造化データは表示本文と一致する", () => {
  const shown = [...html.matchAll(/<p class="faq-q">[\s\S]*?<\/svg>([^<]*)<\/p>\s*<div class="faq-a">([\s\S]*?)<\/div>/g)].map((m) => ({
    q: m[1].trim(),
    a: m[2].replace(/<[^>]+>/g, ""),
  }));
  const ld = faqLd().mainEntity.map((q) => ({ q: q.name, a: q.acceptedAnswer.text }));
  assert.ok(ld.length > 0);
  assert.deepEqual(shown, ld);
});

test("カメラ一覧に過去の風景写真を出さない（現在の映像と誤認されないよう、アイコンで表示する）", () => {
  const list = html.slice(html.indexOf("武庫川ライブカメラ一覧"), html.indexOf("武庫川 水位基準"));
  assert.ok(list.includes('<div class="headline-thumb"><svg'));
  assert.ok(!list.includes("<img"));
});

test("武田尾のカメラは県の武庫川武田尾局へ案内し、別地点だった国交省のカメラURLを使わない", () => {
  const takedao = cameraRows(html)[0];
  assert.equal(takedao.href, TAKEDAO_URL);
  assert.equal(takedao.title, "武庫川武田尾局（兵庫県河川監視カメラ）");
  assert.equal(takedao.meta, "宝塚市玉瀬・武庫川武田尾局。静止画は約5分間隔で取得。水位情報も確認できます");
  assert.ok(!html.includes("scamId=222057042") && !home.includes("scamId=222057042"));
});

test("トップと /livecam のカメラ一覧は同じ内容で、どちらも写真ではなくアイコンで表示する", () => {
  const top = cameraRows(home);
  assert.equal(top.length, 3);
  assert.deepEqual(top, cameraRows(html));
  for (const row of top) assert.ok(row.thumb.startsWith("<svg") && !row.thumb.includes("<img"), row.title);
});

test("カメラは定期更新の静止画と分かる表現にし、動画ではないこと・更新されない場合があることを案内する", () => {
  const list = html.slice(html.indexOf("武庫川ライブカメラ一覧"), html.indexOf("武庫川 水位基準"));
  assert.ok(!list.includes("映像"));
  for (const row of cameraRows(html).slice(0, 3)) assert.ok(row.meta.includes("静止画") && row.meta.includes("約5分間隔"), row.title);
  const a = faqLd().mainEntity.find((q) => q.name === "ライブカメラの映像はリアルタイムで見られますか？").acceptedAnswer.text;
  assert.ok(a.includes("完全なリアルタイムの動画ではありません") && a.includes("画像が更新されない"));
});

test("武田尾の水位基準の注記は市と県の水防計画を出典にし、2.71mとの差の原因を説明しない", () => {
  const note = html.slice(html.indexOf("武田尾地点の水位基準について"), html.indexOf("市の表でのとるべき行動は"));
  assert.ok(html.indexOf("</table>") < html.indexOf("武田尾地点の水位基準について"), "表の直下に置く");
  assert.ok(note.includes("氾濫注意水位4.90m・避難判断水位5.90m・氾濫危険水位8.70m"));
  assert.ok(note.includes("https://www.city.takarazuka.hyogo.jp/1013056/1011509/1013062/1020504.html"));
  assert.ok(note.includes("https://web.pref.hyogo.lg.jp/ks12/documents/r08honpen.pdf"));
  assert.ok(note.includes("2.71m") && note.includes("理由は確認できていません"));
});
