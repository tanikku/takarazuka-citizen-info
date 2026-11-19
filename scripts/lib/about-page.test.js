// 運営者情報の「現地取材」の紹介（2026-11-19）：挙げたガイド・記事が実在し、現地取材の記録（fieldReport・取材写真）を持つこと
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aboutPage } from "../templates.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const html = aboutPage("https://takarazuka-today.jp");
const para = html.slice(html.indexOf("運営者が現地を訪れて撮影した写真"), html.indexOf("</p>", html.indexOf("運営者が現地を訪れて撮影した写真")));

test("運営者情報で現地取材として挙げた観光ガイドは、どれも fieldReport を持つ", () => {
  const guides = [...para.matchAll(/href="\/category\/kanko\/([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.ok(guides.length > 0);
  for (const slug of guides) {
    const g = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "guides", `${slug}.json`), "utf8"));
    assert.ok(Array.isArray(g.fieldReport) && g.fieldReport.length > 0, slug);
  }
});

test("運営者情報で現地取材として挙げた記事は、どれも宝塚Todayの取材写真（撮影日入り）を記事の写真にしている", () => {
  const articles = [...para.matchAll(/href="\/articles\/([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.ok(articles.length > 0);
  for (const slug of articles) {
    const a = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "articles", `${slug}.json`), "utf8"));
    assert.match(a.ogImage ?? "", /^\/photos\/[a-z0-9-]+-20\d{6}-1200x630\.webp$/, slug);
  }
});
