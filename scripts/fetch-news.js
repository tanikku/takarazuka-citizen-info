import Parser from "rss-parser";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PENDING_DIR = path.join(__dirname, "..", "data", "pending");

const RSS_URL = "https://www.city.takarazuka.hyogo.jp/news.rss";

// 採用・入札等、事務的・定時的なお知らせを記事化対象から除外するキーワード
const EXCLUDE_KEYWORDS = [
  "採用試験",
  "採用候補者",
  "入札",
  "募集要項",
  "職員採用",
  "公売",
];

function isExcluded(title) {
  return EXCLUDE_KEYWORDS.some((keyword) => title.includes(keyword));
}

function slugify(link) {
  return crypto.createHash("sha1").update(link).digest("base64url").slice(0, 16);
}

async function main() {
  const parser = new Parser();
  const feed = await parser.parseURL(RSS_URL);

  fs.mkdirSync(PENDING_DIR, { recursive: true });

  let savedCount = 0;
  let skippedCount = 0;

  for (const item of feed.items) {
    const title = item.title ?? "";
    const link = item.link ?? "";

    if (!link || isExcluded(title)) {
      skippedCount += 1;
      continue;
    }

    const filePath = path.join(PENDING_DIR, `${slugify(link)}.json`);
    if (fs.existsSync(filePath)) {
      continue; // 取得済み
    }

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          title,
          link,
          pubDate: item.pubDate ?? "",
          rawDescription: item.contentSnippet ?? item.content ?? "",
          sourceName: "宝塚市公式サイト",
        },
        null,
        2,
      ),
    );
    savedCount += 1;
  }

  console.log(
    `取得: ${feed.items.length}件 / 新規候補保存: ${savedCount}件 / 除外: ${skippedCount}件`,
  );
  console.log(`保存先: ${PENDING_DIR}`);
}

main().catch((error) => {
  console.error("RSS取得に失敗しました:", error);
  process.exitCode = 1;
});
