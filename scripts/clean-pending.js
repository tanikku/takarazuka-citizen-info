// data/pending/ に溜まり続ける候補記事を自動整理する。
// 終了イベントの自動判定は行わない（タイトル・概要だけでは正確な判定ができず誤削除のリスクが高いため、60日ルールで代替する）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PENDING_DIR = path.join(ROOT, "data", "pending");
const ARTICLES_DIR = path.join(ROOT, "data", "articles");
const MAX_AGE_DAYS = 60;

function loadPublishedLinks() {
  const links = new Set();
  for (const file of fs.readdirSync(ARTICLES_DIR)) {
    if (!file.endsWith(".json")) continue;
    const data = JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, file), "utf-8"));
    if (data.sourceUrl) links.add(data.sourceUrl);
  }
  return links;
}

function parsePubDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function loadPendingEntries() {
  return fs
    .readdirSync(PENDING_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const filePath = path.join(PENDING_DIR, file);
      try {
        return { file, filePath, data: JSON.parse(fs.readFileSync(filePath, "utf-8")) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function main() {
  const publishedLinks = loadPublishedLinks();
  const entries = loadPendingEntries();
  const now = Date.now();

  // 重複候補は「最も新しいpubDateを残す」ため、新しい順に処理する
  entries.sort((a, b) => (parsePubDate(b.data.pubDate)?.getTime() ?? 0) - (parsePubDate(a.data.pubDate)?.getTime() ?? 0));

  const seenLinks = new Set();
  let removedPublished = 0;
  let removedDuplicate = 0;
  let removedOld = 0;
  let keptProtected = 0;

  for (const entry of entries) {
    const { data, filePath } = entry;
    const link = data.link;

    if (data.keep === true) {
      keptProtected++;
      continue;
    }

    if (link && publishedLinks.has(link)) {
      fs.rmSync(filePath);
      removedPublished++;
      continue;
    }

    if (link) {
      if (seenLinks.has(link)) {
        fs.rmSync(filePath);
        removedDuplicate++;
        continue;
      }
      seenLinks.add(link);
    }

    const pubDate = parsePubDate(data.pubDate);
    if (pubDate && (now - pubDate.getTime()) / 86400000 > MAX_AGE_DAYS) {
      fs.rmSync(filePath);
      removedOld++;
      continue;
    }
  }

  const remaining = entries.length - removedPublished - removedDuplicate - removedOld;

  console.log("整理結果:");
  console.log(`  公開済み除外 ${removedPublished}件`);
  console.log(`  重複除外 ${removedDuplicate}件`);
  console.log(`  60日超除外 ${removedOld}件`);
  console.log(`  keep保護 ${keptProtected}件`);
  console.log(`  残存 ${remaining}件`);
}

main();
