// スマホのパンくず・目次リンクの押せる範囲を広げるCSSの最小限のテスト
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CSS = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "style.css"), "utf8");
const lastMobileBlock = CSS.match(/@media \(max-width: 600px\) \{\s*\.breadcrumb a \{[\s\S]*?\n\}/)?.[0] ?? "";
const breadcrumbRule = lastMobileBlock.match(/\.breadcrumb a \{[^}]*\}/)?.[0] ?? "";

test("パンくずは padding と同量の負のマージンで、行の高さを増やさず押せる範囲だけ広げる", () => {
  assert.match(breadcrumbRule, /display: inline-block;/);
  assert.match(breadcrumbRule, /padding: 4px 6px;/);
  assert.match(breadcrumbRule, /margin: -4px -6px;/);
});

test("広げた当たり判定を、区切り文字や次の行の文字に奪われないよう position と z-index を付ける", () => {
  assert.match(breadcrumbRule, /position: relative;/);
  assert.match(breadcrumbRule, /z-index: 1;/);
});

test("目次リンクは行全体を押せるブロックにし、フォーカスと hover を同じ背景で示す", () => {
  assert.match(lastMobileBlock, /\.toc li a \{\s*display: block;/);
  assert.match(lastMobileBlock, /\.toc li a:hover,\s*\.toc li a:focus-visible \{\s*background: var\(--accent-soft\);/);
});

test("この変更はスマホ幅（600px以下）の規則の中だけにある", () => {
  assert.doesNotMatch(CSS.replace(lastMobileBlock, ""), /\.toc li a \{\s*display: block/);
  assert.doesNotMatch(CSS.replace(lastMobileBlock, ""), /\.breadcrumb a \{[^}]*z-index: 1/);
});
