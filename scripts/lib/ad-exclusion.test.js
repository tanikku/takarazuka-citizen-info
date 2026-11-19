// 広告の除外（2026-11-19）：noindex にした講演会の2記事は広告コードを出さない。ほかの記事の広告設定は変えない
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { articlePage } from "../templates.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = "https://takarazuka-today.jp";
const load = (slug) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "articles", `${slug}.json`), "utf8"));

test("講演会の2記事は noindex のまま、広告コードを出さない（canonical は自分自身）", () => {
  for (const slug of ["kokoro-kyoiku-kouenkai-2026", "toriyama-makoto-akutagawasho-2026"]) {
    const html = articlePage(load(slug), SITE);
    assert.ok(html.includes('<meta name="robots" content="noindex">'), slug);
    assert.ok(!html.includes("adsbygoogle"), slug);
    assert.ok(html.includes(`<link rel="canonical" href="${SITE}/articles/${slug}">`), slug);
  }
});

test("除外していない記事は、これまでどおり広告コードを出す", () => {
  const html = articlePage(load("dahlia-en-2026aki"), SITE);
  assert.ok(html.includes("adsbygoogle.js?client=ca-pub-1166196957838822"));
});
