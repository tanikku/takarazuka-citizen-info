// style.css のキャッシュバスター（内容由来のバージョン付きURL）のテスト（Node標準の node:test を使用）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contentVersion } from "./asset-version.js";
import { layout, STYLESHEET_HREF } from "../templates.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("バージョンは内容から決まり、同じ内容なら同じ・内容が変われば別の値になる", () => {
  assert.match(contentVersion("a{color:red}"), /^[0-9a-f]{10}$/);
  assert.equal(contentVersion("a{color:red}"), contentVersion("a{color:red}"));
  assert.notEqual(contentVersion("a{color:red}"), contentVersion("a{color:blue}"));
});

test("stylesheet の URL は /css/style.css?v=<assets/style.css の内容から決まる値>", () => {
  const version = contentVersion(fs.readFileSync(path.join(ROOT, "assets", "style.css")));
  assert.equal(STYLESHEET_HREF, `/css/style.css?v=${version}`);
});

test("共通レイアウトはバージョン付きの stylesheet を読み込み、バージョンなしの参照は残さない", () => {
  const html = layout({ title: "t", description: "d", bodyHtml: "", canonicalUrl: "https://takarazuka-today.jp/" });
  assert.ok(html.includes(`<link rel="stylesheet" href="${STYLESHEET_HREF}">`));
  assert.match(html, /href="\/css\/style\.css\?v=[0-9a-f]{10}"/);
  assert.ok(!html.includes('href="/css/style.css"'));
});
