// 手塚治虫記念館ガイド：長期休館と入館料改定の記載が、市の公式案内（ID 4000466）の日付・金額と食い違わないこと
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateGuide } from "./guide-schema.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const g = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "guides", "tezuka-museum-guide.json"), "utf8"));
const section = g.sections.find((s) => s.id === "kyukan");
const text = JSON.stringify(section);

test("長期休館の節が目次の先頭にあり、スキーマ（表）が有効", () => {
  assert.equal(g.toc[0].id, "kyukan");
  assert.ok(section);
  assert.deepEqual(validateGuide(g).errors, []);
});

test("休館期間（2026年12月1日〜2027年3月4日）・理由・改定日（2027年3月1日）が公式案内のとおり", () => {
  assert.ok(text.includes("2026年12月1日（火）から2027年3月4日（木）まで"));
  assert.ok(text.includes("エレベーターの更新工事と館内整備"));
  assert.ok(text.includes("2027年3月1日"));
  assert.ok(text.includes("3月1日は、休館期間中"));
});

test("入館料の表は、現行（2027年2月28日まで）と改定後（2027年3月1日から）を分け、大人だけが変わる", () => {
  const table = section.items.find((i) => i && i.table).table;
  assert.deepEqual(table.headers, ["区分", "現行（2027年2月28日まで）", "改定後（2027年3月1日から）"]);
  assert.deepEqual(table.rows[0], ["大人", "700円／560円", "900円／720円"]);
  assert.match(table.rows[1][2], /変更なし/);
  assert.match(table.rows[2][2], /変更なし/);
});

test("公式の確認先（重要なお知らせ・開館時間と入館料・開館日カレンダー）へのリンクがある", () => {
  for (const id of ["4000466", "4000015", "4000024"]) assert.ok(text.includes(`/tezuka/4000018/${id}.html`), id);
});
