// 表（記事の comparisonTables・ガイドの table 項目）の検証を1か所にまとめる。
// セルの仕様（文字列、またはリンクだけを持つ { links: [{ text, href }] }）は記事とガイドで共通で、
// 描画も templates.js の tableCellHtml を共有する。任意HTMLはどちらでも受け付けない。

export function isNonEmptyString(v) {
  return typeof v === "string" && v.trim() !== "";
}

export function isHttpsUrl(v) {
  if (!isNonEmptyString(v) || !v.startsWith("https://")) return false;
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

// 表セルは文字列が基本。リンクを置く場合のみ { links: [{ text, href }] } を許可する（任意HTMLは受け付けない）。
// 未知のキーを拒否し、href は https:// のURLに限定する（javascript: / data: / http: / 相対URL を防ぐ）
export function validateTableCell(cell, at, errors) {
  if (typeof cell === "string") return;
  if (!cell || typeof cell !== "object" || Array.isArray(cell)) {
    errors.push(`${at} は文字列または { links: [...] } である必要があります`);
    return;
  }
  const extraKeys = Object.keys(cell).filter((k) => k !== "links");
  if (extraKeys.length > 0) errors.push(`${at} に未対応のキーがあります: ${extraKeys.join(", ")}`);
  if (!Array.isArray(cell.links) || cell.links.length === 0) {
    errors.push(`${at}.links は1件以上の配列である必要があります`);
    return;
  }
  cell.links.forEach((link, i) => {
    const lat = `${at}.links[${i}]`;
    if (!link || typeof link !== "object" || Array.isArray(link)) {
      errors.push(`${lat} はオブジェクトである必要があります`);
      return;
    }
    const linkExtra = Object.keys(link).filter((k) => k !== "text" && k !== "href");
    if (linkExtra.length > 0) errors.push(`${lat} に未対応のキーがあります: ${linkExtra.join(", ")}`);
    if (!isNonEmptyString(link.text)) errors.push(`${lat}.text が空です`);
    if (!isHttpsUrl(link.href)) errors.push(`${lat}.href が https:// の有効なURLではありません: ${link.href}`);
  });
}

// ガイドの表はスマホで読める幅に収めるため2〜3列に限る（記事の比較表は数値列が多く、この制限を持たない）
export const GUIDE_TABLE_MIN_COLUMNS = 2;
export const GUIDE_TABLE_MAX_COLUMNS = 3;
const GUIDE_TABLE_KEYS = new Set(["caption", "headers", "rows"]);

/**
 * ガイドの { table: { caption?, headers, rows } } を検証する。
 * @param {unknown} table
 * @param {string} at エラーメッセージの位置表示
 * @param {string[]} errors
 */
export function validateGuideTable(table, at, errors) {
  if (!table || typeof table !== "object" || Array.isArray(table)) {
    errors.push(`${at} はオブジェクトである必要があります`);
    return;
  }
  const extraKeys = Object.keys(table).filter((k) => !GUIDE_TABLE_KEYS.has(k));
  if (extraKeys.length > 0) errors.push(`${at} に未対応のキーがあります: ${extraKeys.join(", ")}`);
  if (table.caption !== undefined && !isNonEmptyString(table.caption)) {
    errors.push(`${at}.caption が空、または文字列ではありません`);
  }

  const { headers, rows } = table;
  if (!Array.isArray(headers) || headers.length < GUIDE_TABLE_MIN_COLUMNS || headers.length > GUIDE_TABLE_MAX_COLUMNS) {
    errors.push(`${at}.headers は${GUIDE_TABLE_MIN_COLUMNS}〜${GUIDE_TABLE_MAX_COLUMNS}列の配列である必要があります`);
    return;
  }
  headers.forEach((h, i) => {
    if (!isNonEmptyString(h)) errors.push(`${at}.headers[${i}] が空、または文字列ではありません`);
  });
  if (!Array.isArray(rows) || rows.length === 0) {
    errors.push(`${at}.rows は1行以上の配列である必要があります`);
    return;
  }
  rows.forEach((row, j) => {
    if (!Array.isArray(row)) {
      errors.push(`${at}.rows[${j}] が配列ではありません`);
      return;
    }
    if (row.length !== headers.length) {
      errors.push(`${at}.rows[${j}] の列数(${row.length})が headers(${headers.length})と一致しません`);
    }
    row.forEach((cell, k) => validateTableCell(cell, `${at}.rows[${j}][${k}]`, errors));
  });
}
