import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml } from "./templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DRAFTS_DIR = path.join(ROOT, "data", "drafts");
const REVIEW_DIR = path.join(ROOT, "review");

function loadDrafts() {
  if (!fs.existsSync(DRAFTS_DIR)) return [];
  return fs
    .readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const raw = JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, file), "utf-8"));
      return { file, ...raw };
    })
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

function snsBlock(sns) {
  if (!sns) return "<p class=\"empty\">SNS下書きなし</p>";
  return `<details>
<summary>SNS下書きを見る</summary>
<p><strong>X：</strong></p><pre>${escapeHtml(sns.x ?? "")}</pre>
<p><strong>Instagram：</strong></p><pre>${escapeHtml(sns.instagram ?? "")}</pre>
<p><strong>YouTube Shorts台本：</strong></p><pre>${escapeHtml(sns.youtube_shorts ?? "")}</pre>
</details>`;
}

function draftCard(draft) {
  const approved = draft.approved === true;
  return `<div class="draft-card ${approved ? "is-approved" : ""}">
<div class="draft-head">
  <span class="score-badge score-${escapeHtml(draft.valueScore ?? "?")}">${escapeHtml(draft.valueScore ?? "未評価")}</span>
  <span class="category-badge">${escapeHtml(draft.category ?? "未分類")}</span>
  <span class="status-badge">${approved ? "承認済み" : "レビュー待ち"}</span>
</div>
<h2>${escapeHtml(draft.title ?? "(無題)")}</h2>
<p class="draft-meta">${escapeHtml(draft.publishedAt ?? "")}・${escapeHtml(draft.sourceName ?? "")}・ファイル: ${escapeHtml(draft.file)}</p>
<p class="draft-summary">${escapeHtml(draft.summary ?? "")}</p>
<p><a href="${escapeHtml(draft.sourceUrl ?? "#")}" target="_blank" rel="noopener">出典を開く →</a></p>
${snsBlock(draft.sns)}
</div>`;
}

function main() {
  const drafts = loadDrafts();
  fs.mkdirSync(REVIEW_DIR, { recursive: true });

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>記事レビュー（内部ツール）</title>
<style>
body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 16px; line-height: 1.6; }
.draft-card { border: 1px solid #ccc; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.draft-card.is-approved { border-color: #2a8; background: #f3fff8; }
.score-badge { font-weight: bold; padding: 2px 8px; border-radius: 4px; background: #eee; }
.score-S { background: #ffd2d2; }
.score-A { background: #ffe9c2; }
.score-B { background: #e0e0e0; }
.category-badge, .status-badge { font-size: 0.85em; color: #555; margin-left: 8px; }
.draft-meta { color: #777; font-size: 0.85em; }
pre { white-space: pre-wrap; background: #f7f7f7; padding: 8px; border-radius: 4px; }
.note { background: #fff8e1; padding: 12px; border-radius: 6px; }
</style>
</head>
<body>
<h1>記事レビュー（内部確認用・非公開）</h1>
<p class="note">承認するには対象の <code>data/drafts/&lt;ファイル名&gt;</code> を開き <code>"approved": true</code> に変更してください。その後 <code>npm run promote</code> を実行すると <code>data/articles/</code> に移動します。非承認の場合はファイルを削除するか内容を修正してください。</p>
<p>レビュー待ち件数: ${drafts.filter((d) => !d.approved).length} / 承認済み: ${drafts.filter((d) => d.approved).length}</p>
${drafts.map(draftCard).join("\n") || "<p>ドラフトはありません。</p>"}
</body>
</html>
`;

  fs.writeFileSync(path.join(REVIEW_DIR, "index.html"), html);
  console.log(`レビューページを生成しました: ${path.join(REVIEW_DIR, "index.html")}（ドラフト${drafts.length}件）`);
}

main();
