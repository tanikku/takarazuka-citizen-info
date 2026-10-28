// 財政ウォッチの lastmod：資料の公告日（publishedDate）とページの更新日（pageUpdatedAt）を分ける
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zaiseiLastmod } from "./zaisei-lastmod.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "zaisei", f), "utf8"));

test("pageUpdatedAt があれば最新期のそれを使い、なければ publishedDate を使う", () => {
  assert.equal(zaiseiLastmod([{ publishedDate: "2026-06-30" }]), "2026-06-30");
  assert.equal(zaiseiLastmod([{ publishedDate: "2026-06-30", pageUpdatedAt: "2026-10-29" }, { publishedDate: "2025-11-28" }]), "2026-10-29");
});

test("古い期の pageUpdatedAt は使わない（次の公表期を追加すると、その期の publishedDate に戻る）", () => {
  const next = { publishedDate: "2026-12-01" };
  const old = { publishedDate: "2026-06-30", pageUpdatedAt: "2026-10-29" };
  assert.equal(zaiseiLastmod([next, old]), "2026-12-01");
});

test("形式が不正な pageUpdatedAt と、公告日より前の pageUpdatedAt は拒否する", () => {
  assert.throws(() => zaiseiLastmod([{ publishedDate: "2026-06-30", pageUpdatedAt: "2026/10/29" }]));
  assert.throws(() => zaiseiLastmod([{ publishedDate: "2026-06-30", pageUpdatedAt: "2026-06-01" }]));
  assert.equal(zaiseiLastmod([]), undefined);
});

test("実データ：公告日は r7-12=2025-11-28・r8-06=2026-06-30 のまま、ページ更新日は別フィールドで持つ", () => {
  const r712 = load("r7-12.json");
  const r806 = load("r8-06.json");
  assert.equal(r712.publishedDate, "2025-11-28");
  assert.equal(r806.publishedDate, "2026-06-30");
  assert.equal(r712.pageUpdatedAt, undefined);
  assert.equal(zaiseiLastmod([r806, r712]), r806.pageUpdatedAt);
  assert.ok(r806.pageUpdatedAt >= r806.publishedDate);
});
