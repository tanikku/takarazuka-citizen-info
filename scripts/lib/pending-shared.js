// data/pending/ 関連スクリプト（fetch-*.js / reject-pending.js）が共有する処理。
// 「人間が一度却下した候補を翌日以降も再取得しない」ための判定をここに集約する。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, "..", "..");
export const PENDING_DIR = path.join(ROOT, "data", "pending");
export const REJECTED_PATH = path.join(ROOT, "data", "rejected.json");

// 前後空白の除去・末尾スラッシュの除去のみを行う。
// アンカー(#)やクエリパラメータは除去しない（同一ページ内の別告知を指す場合があり、
// 誤って別ページを同一視するリスクがあるため）。
export function normalizeUrl(url) {
  if (!url) return url;
  let u = url.trim();
  if (u.length > 1 && u.endsWith("/")) u = u.slice(0, -1);
  return u;
}

function readRejectedFile() {
  if (!fs.existsSync(REJECTED_PATH)) {
    return { _comment: [], entries: [] };
  }
  const data = JSON.parse(fs.readFileSync(REJECTED_PATH, "utf-8"));
  if (!Array.isArray(data.entries)) data.entries = [];
  return data;
}

export function loadRejectedUrlSet() {
  const data = readRejectedFile();
  const now = Date.now();
  const urls = new Set();
  for (const entry of data.entries) {
    if (!entry.url) continue;
    // permanent:false かつ expiresAt を過ぎている場合は再取得を許可する（将来のtemporary運用向け）
    if (entry.permanent === false && entry.expiresAt) {
      const expires = new Date(entry.expiresAt).getTime();
      if (!Number.isNaN(expires) && now >= expires) continue;
    }
    urls.add(normalizeUrl(entry.url));
  }
  return urls;
}

export function isRejectedUrl(url, rejectedUrlSet) {
  return rejectedUrlSet.has(normalizeUrl(url));
}

export function appendRejectedEntry({ url, title, reason, source, permanent = true }) {
  const data = readRejectedFile();
  data.entries.push({
    url,
    title,
    rejectedAt: new Date().toISOString().slice(0, 10),
    reason: reason || "記事化対象外",
    source: source || "",
    permanent,
  });
  if (!Array.isArray(data._comment) || data._comment.length === 0) {
    data._comment = [
      "人間が「記事化しない」と判断した候補の記録。fetch-*.js はここに載っているURLを再取得しない。",
      "permanent:true は今後も対象外（審議会・入札・単発終了イベント等）。",
      "permanent:false + expiresAt を設定すると、期限後は再取得の対象に戻る（temporary運用）。",
      "登録・削除は npm run reject:pending -- <pendingファイル名またはslug> [理由] で行う（手動でのJSON直接編集も可）。",
    ];
  }
  fs.writeFileSync(REJECTED_PATH, JSON.stringify(data, null, 2) + "\n");
}
