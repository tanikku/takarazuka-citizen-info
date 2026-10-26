// 財政ウォッチのグラフ注意書き：SVGの外のHTML段落として完全に出し、SVG内に重複して残さない
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
const svg = html.match(/<svg viewBox[\s\S]*?<\/svg>/)?.[0] ?? "";
const notes = html.match(/<div class="zaisei-chart-notes">[\s\S]*?<\/div>/)?.[0] ?? "";

const FLOW = "1年間に動くお金の規模を示す指標です。一般会計予算総額と市税収入（予算）を並べています";
const STOCK = "ある時点での市債と基金の残高です。性質の異なる指標のため、単純な差額で財政状況を判断することはできません";

test("注意書き2文が、SVGの外のHTML段落に、完全な文言で出る", () => {
  assert.ok(svg.length > 0 && notes.length > 0);
  assert.match(notes, new RegExp(`<strong>① 年間の規模（フロー）</strong><br>${FLOW}</p>`));
  assert.match(notes, new RegExp(`<strong>② 現在の残高（ストック）</strong><br>${STOCK}</p>`));
  assert.ok(html.indexOf("</svg>") < html.indexOf("zaisei-chart-notes"), "注意書きはSVGの後ろ");
});

test("SVGの中には注意書きを残さず、グラフの見出しと4指標の棒・数値は維持する", () => {
  assert.ok(!svg.includes("1年間に動くお金"));
  assert.ok(!svg.includes("単純な差額"));
  assert.equal((svg.match(/<text /g) ?? []).length, 10);
  assert.equal((svg.match(/<rect /g) ?? []).length, 8);
  for (const t of ["① 年間の規模（フロー）", "② 現在の残高（ストック）", "億円"]) assert.ok(svg.includes(t), t);
});

test("注意書きの文言は、このページのHTMLに1か所ずつだけある（二重に出さない）", () => {
  assert.equal(html.split(FLOW).length - 1, 1);
  assert.equal(html.split(STOCK).length - 1, 1);
});
