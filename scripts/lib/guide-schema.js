// ガイドデータ（data/guides/*.json）の検証。build.js が読み込み直後に呼ぶ。
//
// 方針：
// - 現時点で検証するのは表（sections[].items の { table } 項目）だけ。
//   既存ガイドの文字列項目・小見出し・写真の書き方には手を入れない。
// - 表は任意HTMLを持てない構造化データなので、ここで形を厳格に確かめる。
import { validateGuideTable } from "./table.js";

export function validateGuide(guide) {
  const errors = [];
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
