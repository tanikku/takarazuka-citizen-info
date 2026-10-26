// 財政ウォッチの主要指標グラフ（HTML/CSSの棒）：注意書き2文の完全表示、4指標・数値、棒の割合（従来のSVGと同じ計算）、フローとストックの区別
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zaiseiWatchPage } from "../templates.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const periods = fs
  .readdirSync(path.join(ROOT, "data", "zaisei"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "zaisei", f), "utf8")))
  .sort((a, b) => (a.period < b.period ? 1 : -1));
const html = zaiseiWatchPage(periods, "https://takarazuka-today.jp");
const chart = html.match(/<div class="zaisei-chart">[\s\S]*?<\/ul><\/div><p class="zaisei-chart-caption">/)?.[0] ?? "";
const groups = chart.match(/<div class="zaisei-chart-group [\s\S]*?<\/ul><\/div>/g) ?? [];

const FLOW = "1年間に動くお金の規模を示す指標です。一般会計予算総額と市税収入（予算）を並べています";
const STOCK = "ある時点での市債と基金の残高です。性質の異なる指標のため、単純な差額で財政状況を判断することはできません";
const byKey = (key) => periods[0].indicators.find((i) => i.key === key);
const oku = (yen) => `${(yen / 1e8).toLocaleString("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}億円`;
// 従来のSVGの計算：幅 = max(4, 値/グループ最大値 × 165)、外枠は165。割合にすると幅/165×100
const oldPercent = (v, max) => Math.round((Math.max(4, (v / max) * 165) / 165) * 10000) / 100;

test("グラフはSVGではなくHTMLで、フロー・ストックの2グループ（各2指標）に分かれる", () => {
  assert.ok(chart.length > 0);
  assert.doesNotMatch(chart, /<svg/);
  assert.equal(groups.length, 2);
  assert.match(groups[0], /zaisei-chart-group--flow/);
  assert.match(groups[1], /zaisei-chart-group--stock/);
  for (const g of groups) assert.equal((g.match(/<li class="zaisei-chart-item">/g) ?? []).length, 2);
});

test("注意書き2文が、各グループの見出しのすぐ下に、原文のまま1か所ずつ出る", () => {
  assert.match(groups[0], new RegExp(`<p class="zaisei-chart-title"[^>]*>① 年間の規模（フロー）</p><p class="zaisei-chart-note">${FLOW}</p>`));
  assert.match(groups[1], new RegExp(`<p class="zaisei-chart-title"[^>]*>② 現在の残高（ストック）</p><p class="zaisei-chart-note">${STOCK}</p>`));
  assert.equal(html.split(FLOW).length - 1, 1);
  assert.equal(html.split(STOCK).length - 1, 1);
  assert.match(groups[0], /role="group" aria-labelledby="zaisei-chart-flow"/);
  assert.match(groups[1], /role="group" aria-labelledby="zaisei-chart-stock"/);
});

test("4指標の名称と数値（億円表記）が文字で出て、棒は装飾（aria-hidden）", () => {
  const expected = [
    [groups[0], "general-account-budget"],
    [groups[0], "tax-revenue"],
    [groups[1], "bond-balance"],
    [groups[1], "fund-balance"],
  ];
  for (const [g, key] of expected) {
    const ind = byKey(key);
    assert.ok(g.includes(`<span class="zaisei-chart-name">${ind.label}</span><span class="zaisei-chart-value">${oku(ind.value)}</span>`), key);
  }
  assert.equal((chart.match(/class="zaisei-chart-bar" aria-hidden="true"/g) ?? []).length, 4);
});

test("棒の割合は従来のSVGと同じ計算（グループごとの最大値を基準、最小は4/165）で、フローとストックの最大値は別々", () => {
  const widths = (g) => [...g.matchAll(/class="zaisei-chart-fill" style="width:([\d.]+)%"/g)].map((m) => Number(m[1]));
  const flow = [byKey("general-account-budget").value, byKey("tax-revenue").value];
  const stock = [byKey("bond-balance").value, byKey("fund-balance").value];
  assert.deepEqual(widths(groups[0]), flow.map((v) => oldPercent(v, Math.max(...flow))));
  assert.deepEqual(widths(groups[1]), stock.map((v) => oldPercent(v, Math.max(...stock))));
  assert.equal(widths(groups[0])[0], 100);
  assert.equal(widths(groups[1])[0], 100);
});

test("極端な値：最小幅は4/165（約2.42%）、最大値が0なら棒は描かない（幅0%）", () => {
  const small = JSON.parse(JSON.stringify(periods[0]));
  small.indicators.find((i) => i.key === "tax-revenue").value = 1;
  const h1 = zaiseiWatchPage([small], "https://takarazuka-today.jp");
  assert.match(h1, /style="width:2\.42%"/);
  const zero = JSON.parse(JSON.stringify(periods[0]));
  for (const k of ["bond-balance", "fund-balance"]) zero.indicators.find((i) => i.key === k).value = 0;
  const h2 = zaiseiWatchPage([zero], "https://takarazuka-today.jp");
  const stockG = h2.match(/<div class="zaisei-chart-group zaisei-chart-group--stock"[\s\S]*?<\/ul><\/div>/)[0];
  assert.deepEqual([...stockG.matchAll(/style="width:([\d.]+)%"/g)].map((m) => m[1]), ["0", "0"]);
});
