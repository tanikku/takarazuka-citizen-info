// ガイドデータ（data/guides/*.json）の検証。build.js が読み込み直後に呼ぶ。
//
// 方針：
// - 現時点で検証するのは表（sections[].items の { table } 項目）だけ。
//   既存ガイドの文字列項目・小見出し・写真の書き方には手を入れない。
// - 表は任意HTMLを持てない構造化データなので、ここで形を厳格に確かめる。
import { validateGuideTable } from "./table.js";

const CONTACT_CARD_ICONS = ["alert", "shield", "bell"];

// 任意の contactCards（冒頭の連絡先カード）。3枚以内、全項目が空でない文字列
function validateContactCards(c, errors) {
  if (c === undefined) return;
  if (!c || typeof c !== "object" || Array.isArray(c)) return errors.push("contactCards はオブジェクトにしてください");
  if (typeof c.heading !== "string" || !c.heading.trim()) errors.push("contactCards.heading は空でない文字列にしてください");
  if (c.note !== undefined && (typeof c.note !== "string" || !c.note.trim())) errors.push("contactCards.note は空でない文字列にしてください");
  if (!Array.isArray(c.cards) || c.cards.length < 1 || c.cards.length > 3) return errors.push("contactCards.cards は1〜3件にしてください");
  c.cards.forEach((card, i) => {
    for (const k of ["tag", "number", "use", "detail"]) {
      if (typeof card?.[k] !== "string" || !card[k].trim()) errors.push(`contactCards.cards[${i}].${k} は空でない文字列にしてください`);
    }
    if (!CONTACT_CARD_ICONS.includes(card?.icon)) errors.push(`contactCards.cards[${i}].icon は ${CONTACT_CARD_ICONS.join(" / ")} のいずれかにしてください`);
  });
}

const QUICK_LINK_ICONS = ["building", "newspaper", "user"];

// 任意の quickLinks（冒頭の目的別カード）。リンク先は同じページの節（sections[].id）だけ
function validateQuickLinks(q, sectionIds, errors) {
  if (q === undefined) return;
  if (!q || typeof q !== "object" || Array.isArray(q)) return errors.push("quickLinks はオブジェクトにしてください");
  if (typeof q.heading !== "string" || !q.heading.trim()) errors.push("quickLinks.heading は空でない文字列にしてください");
  if (!Array.isArray(q.links) || q.links.length < 1 || q.links.length > 3) return errors.push("quickLinks.links は1〜3件にしてください");
  q.links.forEach((l, i) => {
    for (const k of ["tag", "title", "desc"]) {
      if (typeof l?.[k] !== "string" || !l[k].trim()) errors.push(`quickLinks.links[${i}].${k} は空でない文字列にしてください`);
    }
    if (!QUICK_LINK_ICONS.includes(l?.icon)) errors.push(`quickLinks.links[${i}].icon は ${QUICK_LINK_ICONS.join(" / ")} のいずれかにしてください`);
    if (typeof l?.href !== "string" || !l.href.startsWith("#") || !sectionIds.has(l.href.slice(1))) errors.push(`quickLinks.links[${i}].href は同じページの節（#id）にしてください`);
  });
}

export function validateGuide(guide) {
  const errors = [];
  validateContactCards(guide?.contactCards, errors);
  validateQuickLinks(guide?.quickLinks, new Set((guide?.sections ?? []).map((s) => s?.id)), errors);
  if (guide?.visual !== undefined && typeof guide.visual !== "boolean") errors.push("visual は true / false にしてください");
  (guide?.sections ?? []).forEach((section, i) => {
    (section?.items ?? []).forEach((item, j) => {
      if (!item || typeof item !== "object" || !("table" in item)) return;
      const at = `sections[${i}].items[${j}]`;
      const extraKeys = Object.keys(item).filter((k) => k !== "table");
      if (extraKeys.length > 0) errors.push(`${at} に table 以外のキーがあります: ${extraKeys.join(", ")}`);
      validateGuideTable(item.table, `${at}.table`, errors);
    });
  });
  return { errors };
}

export function validateGuides(guides) {
  const errors = [];
  guides.forEach((guide, i) => {
    const label = typeof guide?.slug === "string" && guide.slug ? guide.slug : `guides[${i}]`;
    validateGuide(guide).errors.forEach((e) => errors.push(`${label}: ${e}`));
  });
  return { errors };
}
