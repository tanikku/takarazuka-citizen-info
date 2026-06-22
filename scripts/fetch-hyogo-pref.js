import * as cheerio from "cheerio";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PENDING_DIR = path.join(__dirname, "..", "data", "pending");

// 兵庫県公式サイト「記者発表」一覧
// robots.txt不在（制限なし）・利用規約上は引用・私的使用のみ許可のため、要約＋出典明記で対応する前提
const LIST_URL = "https://web.pref.hyogo.lg.jp/pref/cate3_650.html";
const BASE_URL = "https://web.pref.hyogo.lg.jp";
const SOURCE_NAME = "兵庫県公式サイト";

function extractDate(href) {
  const match = href.match(/(\d{4})(\d{2})(\d{2})/);
  if (!match) return "";
  const [, y, m, d] = match;
  return `${y}-${m}-${d}`;
}

function slugify(link) {
  return crypto.createHash("sha1").update(link).digest("base64url").slice(0, 16);
}

async function main() {
  const res = await fetch(LIST_URL);
  const html = await res.text();
  const $ = cheerio.load(html);

  fs.mkdirSync(PENDING_DIR, { recursive: true });

  let savedCount = 0;
  let skippedCount = 0;

  $("ul.idx_list > li").each((_, el) => {
    const anchor = $(el).find("a").first();
    const href = anchor.attr("href");
    const title = anchor.text().trim();
    if (!href || !title) {
      skippedCount += 1;
      return;
    }

    const link = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    const department = $(el).find(".idx_list_r").text().trim();
    const filePath = path.join(PENDING_DIR, `pref_${slugify(link)}.json`);
    if (fs.existsSync(filePath)) return;

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          title,
          link,
          pubDate: extractDate(href),
          department,
          sourceName: SOURCE_NAME,
        },
        null,
        2,
      ),
    );
    savedCount += 1;
  });

  console.log(`兵庫県記者発表: 新規候補保存 ${savedCount}件 / スキップ ${skippedCount}件`);
  console.log(`保存先: ${PENDING_DIR}`);
}

main().catch((error) => {
  console.error("兵庫県記者発表の取得に失敗しました:", error);
  process.exitCode = 1;
});
