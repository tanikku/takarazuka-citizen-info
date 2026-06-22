import * as cheerio from "cheerio";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PENDING_DIR = path.join(__dirname, "..", "data", "pending");

// 兵庫県警察 トップページの「新着情報」一覧
// robots.txtは採用・入札・キャンペーン等のページのみ制限対象で、新着情報には制限なし
// 利用規約上は出典記載必須・引用の範囲での利用は可（無断複製・転用は禁止）
const LIST_URL = "https://www.police.pref.hyogo.lg.jp/";
const BASE_URL = "https://www.police.pref.hyogo.lg.jp/";
const SOURCE_NAME = "兵庫県警察";

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

  $("#shintyaku dl.new dt").each((_, dt) => {
    const dateText = $(dt).clone().children().remove().end().text().trim(); // 例: 2026/06/18
    const category = $(dt).find("span").first().text().trim();
    const dd = $(dt).next("dd");
    const anchor = dd.find("a").first();
    const href = anchor.attr("href");
    const title = anchor.text().trim();

    if (!href || !title) {
      skippedCount += 1;
      return;
    }

    const link = href.startsWith("http") ? href : new URL(href, BASE_URL).toString();
    const pubDate = dateText.replaceAll("/", "-");
    const filePath = path.join(PENDING_DIR, `police_${slugify(link)}.json`);
    if (fs.existsSync(filePath)) return;

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          title,
          link,
          pubDate,
          category,
          sourceName: SOURCE_NAME,
        },
        null,
        2,
      ),
    );
    savedCount += 1;
  });

  console.log(`兵庫県警察 新着情報: 新規候補保存 ${savedCount}件 / スキップ ${skippedCount}件`);
  console.log(`保存先: ${PENDING_DIR}`);
}

main().catch((error) => {
  console.error("兵庫県警察 新着情報の取得に失敗しました:", error);
  process.exitCode = 1;
});
