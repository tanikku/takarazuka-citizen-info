// 防犯ガイド冒頭の連絡先カード（guide.contactCards）と、スマホで積む表（guide.visual）のテスト
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
const CARD = { icon: "alert", tag: "緊急", number: "110", use: "用途", detail: "説明" };

function guide(extra = {}) {
  return {
    categoryKey: "bohan",
    slug: "cards-test",
    title: "テスト",
    cardSummary: "テスト",
    lead: "テスト用です。",
    updatedAt: "2026-10-24",
    toc: [{ id: "t", label: "表" }],
    sections: [{ id: "t", heading: "表", items: [{ table: { headers: ["a", "b", "c"], rows: [["1", "2", "3"]] } }] }],
    faq: [],
    relatedLinks: [],
    sourceUrl: "https://example.com/",
    sourceLabel: "テスト",
    category: CATEGORIES.find((c) => c.key === "bohan"),
    ...extra,
  };
}

test("contactCards は1〜3枚、全項目が空でない文字列で、icon は許可された名前だけ", () => {
  assert.deepEqual(validateGuide(guide({ contactCards: { heading: "見出し", cards: [CARD] } })).errors, []);
  assert.ok(validateGuide(guide({ contactCards: { heading: "見出し", cards: [] } })).errors.length > 0);
  assert.ok(validateGuide(guide({ contactCards: { heading: "見出し", cards: [CARD, CARD, CARD, CARD] } })).errors.length > 0);
  assert.ok(validateGuide(guide({ contactCards: { heading: "見出し", cards: [{ ...CARD, number: "" }] } })).errors.length > 0);
  assert.ok(validateGuide(guide({ contactCards: { heading: "見出し", cards: [{ ...CARD, icon: "nothing" }] } })).errors.length > 0);
  assert.ok(validateGuide(guide({ visual: "yes" })).errors.length > 0);
});

test("contactCards と visual を持つガイドだけ、カードと積む表が出る", () => {
  const html = guidePage(guide({ visual: true, contactCards: { heading: "見出し", cards: [CARD] } }), SITE);
  assert.match(html, /class="contact-cards"/);
  assert.match(html, /<p class="contact-card-number">110<\/p>/);
  assert.match(html, /class="page-content guide-visual"/);
  assert.match(html, /guide-table guide-table--stack/);
  assert.match(html, /<td data-label="b">/);
  const plain = guidePage(guide(), SITE);
  assert.doesNotMatch(plain, /contact-cards|guide-visual|guide-table--stack|data-label/);
});

test("防犯ガイドは 110・#9110・188 の3枚で、電話リンクは付けない", () => {
  const g = JSON.parse(fs.readFileSync(path.join(GUIDES_DIR, "bohan-guide.json"), "utf8"));
  assert.deepEqual(validateGuide(g).errors, []);
  assert.deepEqual(g.contactCards.cards.map((c) => c.number), ["110", "#9110", "188"]);
  const html = guidePage({ ...g, category: CATEGORIES.find((c) => c.key === g.categoryKey) }, SITE);
  assert.doesNotMatch(html.match(/<section class="contact-cards"[\s\S]*?<\/section>/)[0], /tel:/);
});
