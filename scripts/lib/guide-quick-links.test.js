// 行政手続きガイド冒頭の目的別カード（guide.quickLinks）のテスト
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateGuide } from "./guide-schema.js";
import { guidePage, CATEGORIES } from "../templates.js";

const SITE = "https://takarazuka-today.jp";
const GUIDES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "guides");
const LINK = { icon: "building", tag: "引っ越す", title: "転入・転出", desc: "説明", href: "#a" };

function guide(extra = {}) {
  return {
    categoryKey: "kurashi",
    slug: "quick-test",
    title: "テスト",
    cardSummary: "テスト",
    lead: "テスト用です。",
    updatedAt: "2026-10-24",
    toc: [{ id: "a", label: "節A" }],
    sections: [{ id: "a", heading: "節A", items: ["本文"] }],
    faq: [],
    relatedLinks: [],
    sourceUrl: "https://example.com/",
    sourceLabel: "テスト",
    category: CATEGORIES.find((c) => c.key === "kurashi"),
    ...extra,
  };
}

test("quickLinks は1〜3件、全項目が空でない文字列で、icon は許可された名前、href は同じページの節だけ", () => {
  assert.deepEqual(validateGuide(guide({ quickLinks: { heading: "見出し", links: [LINK] } })).errors, []);
  assert.ok(validateGuide(guide({ quickLinks: { heading: "見出し", links: [] } })).errors.length > 0);
  assert.ok(validateGuide(guide({ quickLinks: { heading: "見出し", links: [LINK, LINK, LINK, LINK] } })).errors.length > 0);
  assert.ok(validateGuide(guide({ quickLinks: { heading: "見出し", links: [{ ...LINK, title: "" }] } })).errors.length > 0);
  assert.ok(validateGuide(guide({ quickLinks: { heading: "見出し", links: [{ ...LINK, icon: "nothing" }] } })).errors.length > 0);
  assert.ok(validateGuide(guide({ quickLinks: { heading: "見出し", links: [{ ...LINK, href: "#missing" }] } })).errors.length > 0);
  assert.ok(validateGuide(guide({ quickLinks: { heading: "見出し", links: [{ ...LINK, href: "https://example.com/" }] } })).errors.length > 0);
});

test("quickLinks を持つガイドだけカードが出て、HTMLはエスケープされる", () => {
  const html = guidePage(guide({ quickLinks: { heading: "見出し", links: [{ ...LINK, tag: "<b>x</b>" }] } }), SITE);
  assert.match(html, /<nav class="contact-cards quick-links"/);
  assert.match(html, /<a class="quick-link" href="#a">/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.doesNotMatch(guidePage(guide(), SITE), /quick-link/);
});

test("行政手続きガイドは 転入・転出 / 証明書 / マイナンバーカード の3枚で、リンク先の節が実在する", () => {
  const g = JSON.parse(fs.readFileSync(path.join(GUIDES_DIR, "gyousei-tetsuzuki-guide.json"), "utf8"));
  assert.deepEqual(validateGuide(g).errors, []);
  assert.deepEqual(g.quickLinks.links.map((l) => l.href), ["#tennyu", "#shomei", "#mynumber"]);
  const html = guidePage({ ...g, category: CATEGORIES.find((c) => c.key === g.categoryKey) }, SITE);
  for (const l of g.quickLinks.links) assert.match(html, new RegExp(`<section class="guide-section" id="${l.href.slice(1)}">`));
  assert.ok(g.toc.length >= 7, "既存の目次は維持する");
});

test("子育てガイドは 妊娠・母子健康手帳 / 児童手当 / 保育園 の3枚で、リンク先の節が実在し、目次9項目を維持する", () => {
  const g = JSON.parse(fs.readFileSync(path.join(GUIDES_DIR, "kosodate-guide.json"), "utf8"));
  assert.deepEqual(validateGuide(g).errors, []);
  assert.deepEqual(g.quickLinks.links.map((l) => l.href), ["#boshitecho", "#teate", "#hoiku"]);
  const html = guidePage({ ...g, category: CATEGORIES.find((c) => c.key === g.categoryKey) }, SITE);
  for (const l of g.quickLinks.links) assert.match(html, new RegExp(`<section class="guide-section" id="${l.href.slice(1)}">`));
  assert.equal(g.toc.length, 9);
});

test("引っ越しチェックリストはSVGではなくHTMLのリスト（7項目・2分類・注意書き）で、原文を維持する", () => {
  const g = JSON.parse(fs.readFileSync(path.join(GUIDES_DIR, "gyousei-tetsuzuki-guide.json"), "utf8"));
  const item = g.sections.find((s) => s.id === "hikkoshi-checklist").items[0];
  assert.doesNotMatch(item, /<svg/);
  assert.equal((item.match(/<li>/g) ?? []).length, 7);
  assert.equal((item.match(/<h3 /g) ?? []).length, 2);
  for (const t of ["ほぼすべての方が確認", "該当する方のみ", "水道", "使用開始・中止の届出（お客さまセンター）", "電気・ガス", "契約事業者へ直接連絡", "郵便物の転送", "日本郵便「e転居」で1年間無料転送", "国民健康保険・国民年金", "加入届等が必要な場合があります", "介護保険", "40歳以上の方など、住所変更が必要な場合", "児童手当・転校手続き", "お子さんがいる場合", "そのほか", "飼い犬の登録、軽自動車・バイクの住所変更等", "世帯状況により必要な手続きは異なります。詳細は各担当窓口にご確認ください"]) {
    assert.ok(item.includes(t), t);
  }
});
