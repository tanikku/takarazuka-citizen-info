// 防災ガイド：警戒レベル1〜5がSVGではなくHTMLの一覧で、公式資料どおりの名称・区別・注意書きを持つことのテスト
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateGuide } from "./guide-schema.js";
import { guidePage, CATEGORIES } from "../templates.js";

const GUIDE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "guides", "bosai-guide.json");
const raw = fs.readFileSync(GUIDE_PATH, "utf8");
const g = JSON.parse(raw);
const level = g.sections.find((s) => s.id === "level");
const item = level.items[0];
const html = guidePage({ ...g, category: CATEGORIES.find((c) => c.key === g.categoryKey) }, "https://takarazuka-today.jp");

test("警戒レベルの図はSVGではなく、レベル1〜5の5項目と2つのh3・3つの番号付きリストで出る", () => {
  assert.deepEqual(validateGuide(g).errors, []);
  assert.doesNotMatch(item, /<svg/);
  assert.equal((item.match(/<li class="alert-level /g) ?? []).length, 5);
  assert.equal((item.match(/<h3 /g) ?? []).length, 2);
  for (let n = 1; n <= 5; n++) assert.ok(item.includes(`<span class="alert-level-badge">レベル${n}</span>`), `レベル${n}`);
  assert.equal(html.split('<svg viewBox="0 0 380 336"').length - 1, 0);
});

test("番号は1・2、3・4、5に対応し、list-style:none でも支援技術にリストと伝わるよう role=list を付ける", () => {
  assert.equal((item.match(/<ol class="alert-levels-list" role="list"/g) ?? []).length, 3);
  assert.match(item, /<ol class="alert-levels-list" role="list" start="3">/);
  assert.match(item, /<ol class="alert-levels-list" role="list" start="5">/);
  const lists = item.match(/<ol [^>]*>[\s\S]*?<\/ol>/g);
  assert.deepEqual(lists.map((l) => (l.match(/alert-level--(\d)/g) ?? []).map((s) => s.slice(-1)).join("")), ["12", "34", "5"]);
});

test("発表元と発令元を区別する：レベル1・2は気象庁が発表、レベル3〜5は宝塚市が発令", () => {
  const items = item.match(/<li class="alert-level alert-level--\d">[\s\S]*?<\/li>/g);
  const who = (n) => items[n - 1];
  assert.match(who(1), /発表<\/span>気象庁/);
  assert.match(who(2), /発表<\/span>気象庁/);
  for (const n of [3, 4, 5]) assert.match(who(n), /発令<\/span>宝塚市/);
  assert.match(who(1), /早期注意情報（警報級の可能性）/);
  assert.match(who(2), /レベル2注意報/);
  assert.match(who(3), /高齢者等避難/);
  assert.match(who(4), /避難指示/);
  assert.match(who(5), /緊急安全確保/);
});

test("警報の名称は公式どおり「レベル3大雨警報」で、「警戒レベル3大雨警報」の誤りが残らない", () => {
  assert.doesNotMatch(raw, /警戒レベル3大雨警報/);
  assert.match(raw, /「レベル3大雨警報」/);
  assert.match(item, /レベル4危険警報（例：レベル4土砂災害危険警報）/);
  assert.match(item, /レベル5特別警報/);
});

test("レベル4までの避難をレベル4と5の間に示し、レベル5は必ず発令されるとは限らず待たない旨を1回だけ書く", () => {
  const between = item.indexOf("警戒レベル4までに必ず避難してください");
  assert.ok(between > item.indexOf("alert-level--4") && between < item.indexOf("alert-level--5"));
  assert.match(item, /警戒レベル5「緊急安全確保」は、必ず発令されるとは限りません。発令を待たず、危険な場所から警戒レベル4までに避難してください。/);
  assert.equal(item.split("必ず発令されるとは限りません").length - 1, 1, "同じ趣旨の文を重ねない");
  assert.match(item, /必ずしも1から5の順番に出されるとは限らず/);
  assert.match(item, /fdma\.go\.jp\/publication\/hakusho\/r3\/chapter2\/section9\/63867\.html/);
  assert.doesNotMatch(raw, /レベル5が(発令|出)(されたら|たら)/);
});

test("気象庁の情報は市の避難情報を待たず自分で避難を判断するためにも使う、と案内する", () => {
  assert.match(item, /避難情報の発令を待たず、キキクルや河川の水位情報などを使って、ご自身で避難を判断してください/);
});

test("本文の「発令されます」の誤認を避け、改訂日と短い更新履歴が揃っている", () => {
  assert.doesNotMatch(raw, /避難情報は5段階の「警戒レベル」で発令されます/);
  assert.match(level.items[1], /レベル3〜5は宝塚市が避難情報として発令し、レベル1・2は気象庁が防災気象情報として発表します/);
  assert.equal(g.updatedAt, "2026-10-26");
  assert.equal(g.changelog.length, 1);
  assert.equal(g.changelog[0].date, g.updatedAt);
  assert.ok(g.changelog[0].note.length <= 100, "更新履歴を長文化しない");
});
