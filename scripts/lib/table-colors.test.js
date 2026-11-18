// 表の見出しの色（2026-11-18）：サイトに無い色変数（--color-*）の代わりの固定色がダークモードの明るい文字と重なり、
// 見出しが読めなかった。表はサイト共通の --bg / --border を使い、文字色 --text とのコントラストをライト・ダークの両方で確保する
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { articlePage, gikaiGuidePage, suisougakuGuidePage, livecamPage } from "../templates.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = "https://takarazuka-today.jp";
const css = fs.readFileSync(path.join(ROOT, "assets", "style.css"), "utf8");

function tokens(selector) {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}

function contrast(a, b) {
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// 背景色を直接指定している見出し行（CSSのクラスで色を決める表は対象外）
const theads = (html) => [...html.matchAll(/<thead><tr style=[\s\S]*?<\/thead>/g)].map((m) => m[0]);

test("ページを作るスクリプト・CSS・JSに、サイトで定義していない色変数（--color-*）を使わない", () => {
  const files = [
    ...fs.readdirSync(path.join(ROOT, "scripts")).filter((f) => f.endsWith(".js")).map((f) => path.join("scripts", f)),
    ...fs.readdirSync(path.join(ROOT, "scripts", "lib")).filter((f) => f.endsWith(".js") && !f.endsWith(".test.js")).map((f) => path.join("scripts", "lib", f)),
    ...fs.readdirSync(path.join(ROOT, "assets")).filter((f) => /\.(js|css)$/.test(f)).map((f) => path.join("assets", f)),
  ];
  assert.ok(files.includes(path.join("scripts", "build-area.js")) && files.includes(path.join("scripts", "templates.js")));
  for (const f of files) assert.ok(!fs.readFileSync(path.join(ROOT, f), "utf8").includes("var(--color-"), f);
  for (const name of ["bg", "border", "text"]) assert.ok(new RegExp(`--${name}:`).test(css), `--${name} がCSSで定義されている`);
});

test("表の見出し：文字色（--text）と背景（--bg）のコントラストがライト・ダークとも4.5以上", () => {
  for (const [mode, t] of [["light", tokens(":root")], ["dark", tokens('html[data-theme="dark"]')]]) {
    assert.ok(t.text && t.bg, mode);
    assert.ok(contrast(t.text, t.bg) >= 4.5, `${mode}: ${t.text} / ${t.bg}`);
  }
});

test("記事・市議会ガイド・吹奏楽ガイド・ライブカメラの代表的な表は、見出しの背景にサイト共通の色を使う", () => {
  const article = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "articles", "3kan-osanpo-rally-2026.json"), "utf8"));
  assert.ok(Array.isArray(article.comparisonTables) && article.comparisonTables.length > 0);
  const years = fs
    .readdirSync(path.join(ROOT, "data", "events"))
    .filter((f) => f.startsWith("suisougaku-") && f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "events", f), "utf8")))
    .sort((a, b) => b.year - a.year);
  const pages = {
    article: articlePage(article, SITE),
    gikaiGuide: gikaiGuidePage(SITE),
    suisougaku: suisougakuGuidePage(years, SITE),
    livecam: livecamPage(SITE),
  };
  for (const [name, html] of Object.entries(pages)) {
    const heads = theads(html);
    assert.ok(heads.length > 0, `${name}: 表がある`);
    for (const h of heads) {
      assert.ok(h.includes('<tr style="background:var(--bg);">'), `${name}: 見出しの背景は --bg`);
      assert.ok(!h.includes("#f5f5f5") && !h.includes("--color-"), `${name}: 固定の明るい色を使わない`);
      assert.ok(!/<th[^>]*\scolor:/.test(h), `${name}: 見出しの文字色はページの --text を引き継ぐ`);
    }
  }
  // 表の文言はデータのまま（色だけの変更）
  for (const t of article.comparisonTables) for (const head of t.headers) assert.ok(pages.article.includes(`>${head}</th>`), head);
});
