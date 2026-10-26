// 財政ウォッチの主要指標の表：見出しの対応（th scope / role）、スマホ用の data-label、前回データありの模擬ケース、更新履歴の表が変わらないこと
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zaiseiWatchPage } from "../templates.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const real = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "zaisei", "r8-06.json"), "utf8"));
const CSS = fs.readFileSync(path.join(ROOT, "assets", "style.css"), "utf8");
const SITE = "https://takarazuka-today.jp";

// テスト専用のメモリ上の模擬データ（実データは変更しない）
function mockPeriods() {
  const cur = JSON.parse(JSON.stringify(real));
  const prev = JSON.parse(JSON.stringify(real));
  prev.period = "r7-12";
  prev.publishedLabel = "令和7年12月公表";
  prev.coverageLabel = "令和7年度上半期";
  const set = (k, v) => (prev.indicators.find((i) => i.key === k).value = v);
  set("general-account-budget", cur.indicators[0].value - 123456789); // プラス（金額）
  set("tax-revenue", cur.indicators[1].value + 50000000); // マイナス（金額。現行の表記は生の円）
  set("bond-balance", cur.indicators[2].value); // 変動なし
  set("fund-balance", cur.indicators[3].value - 9999999999); // 長い数値
  set("revenue-rate", 92.2); // パーセントのプラス
  set("execution-rate", 92.1); // パーセントのマイナス
  const long = "一般会計予算総額（令和8年度当初予算に補正予算と繰越明許費を含む合計額）"; // 折り返す長い項目名
  cur.indicators[0].label = long;
  prev.indicators[0].label = long;
  return [cur, prev];
}
const tableOf = (html) => html.match(/<table class="zaisei-table zaisei-table--indicators"[\s\S]*?<\/table>/)[0];
const rowsOf = (t) =>
  [
    ...t.matchAll(
      /<tr role="row"><th scope="row" role="rowheader">([^<]*)<\/th><td role="cell" data-label="今回">([^<]*)<\/td><td role="cell" data-label="前回">([^<]*)<\/td><td role="cell" data-label="増減">([^<]*)<\/td><\/tr>/g,
    ),
  ].map((m) => m.slice(1));

test("主要指標の表：caption、列見出し scope=col、行見出し scope=row、7項目、4つの値が列ごとに対応する", () => {
  const t = tableOf(zaiseiWatchPage([real], SITE));
  assert.match(t, /<caption>主要指標の今回・前回・増減<\/caption>/);
  assert.equal((t.match(/<th scope="col" role="columnheader">/g) ?? []).length, 4);
  assert.match(t, /role="table"/);
  const rows = rowsOf(t);
  assert.equal(rows.length, 7);
  assert.deepEqual(rows[0], ["一般会計予算総額", "1,064億7,772万円", "－", "－"]);
  assert.deepEqual(rows[5], ["収入率（一般会計）", "93.4%", "－", "－"]);
  assert.ok(!/display:\s*none/.test(t));
});

test("前回データあり：金額・パーセントの、増加・減少・変動なし・長い数値・長い項目名がすべて4つの値に対応して出る", () => {
  const rows = rowsOf(tableOf(zaiseiWatchPage(mockPeriods(), SITE)));
  assert.equal(rows.length, 7);
  assert.deepEqual(rows[0].slice(1), ["1,064億7,772万円", "1,063億5,426万円", "+1億2,346万円"]);
  assert.deepEqual(rows[1].slice(1), ["368億3,610万円", "368億8,610万円", "-50,000,000円"]);
  assert.deepEqual(rows[2].slice(1), ["678億5,073万円", "678億5,073万円", "変動なし"]);
  assert.deepEqual(rows[3].slice(1), ["497億7,806万円", "397億7,806万円", "+99億10,000万円"]);
  assert.deepEqual(rows[5].slice(1), ["93.4%", "92.2%", "+1.2pt"]);
  assert.deepEqual(rows[6].slice(1), ["91.4%", "92.1%", "-0.7pt"]);
  assert.ok(rows[0][0].length > 30, "長い項目名");
});

test("更新履歴の表は変更しない（専用クラス・role・data-label を持たない）", () => {
  const html = zaiseiWatchPage(mockPeriods(), SITE);
  const hist = html.match(/<table class="zaisei-table">[\s\S]*?<\/table>/g) ?? [];
  assert.equal(hist.length, 1);
  assert.match(hist[0], /<thead><tr><th>公表<\/th><th>対象期間<\/th><th>備考<\/th><\/tr><\/thead>/);
  assert.doesNotMatch(hist[0], /role=|data-label|scope=|<caption/);
  assert.equal((html.match(/zaisei-table--indicators"/g) ?? []).length, 1);
});

test("スマホ用のCSSは主要指標の表（.zaisei-table--indicators）に限定し、共通の .zaisei-table は変えない", () => {
  const block = CSS.match(/@media \(max-width: 600px\) \{\s*\.zaisei-table--indicators thead[\s\S]*?\n\}\r?\n/)?.[0] ?? "";
  assert.ok(block.length > 0);
  assert.doesNotMatch(block.replace(/\.zaisei-table--indicators/g, ""), /\.zaisei-table\b/);
  assert.doesNotMatch(block, /thead \{[^}]*display:\s*none/);
  assert.match(block, /content: attr\(data-label\) " " \/ "";/);
});
