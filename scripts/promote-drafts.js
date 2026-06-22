import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DRAFTS_DIR = path.join(ROOT, "data", "drafts");
const ARTICLES_DIR = path.join(ROOT, "data", "articles");

function main() {
  if (!fs.existsSync(DRAFTS_DIR)) {
    console.log("data/drafts が存在しません。");
    return;
  }

  const files = fs.readdirSync(DRAFTS_DIR).filter((f) => f.endsWith(".json"));
  let promotedCount = 0;

  for (const file of files) {
    const filePath = path.join(DRAFTS_DIR, file);
    const draft = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    if (draft.approved !== true) continue;

    if (!draft.slug || !draft.valueScore) {
      console.warn(`スキップ（slugまたはvalueScoreが未設定）: ${file}`);
      continue;
    }

    const { approved, ...article } = draft;
    const destPath = path.join(ARTICLES_DIR, `${draft.slug}.json`);
    fs.mkdirSync(ARTICLES_DIR, { recursive: true });
    fs.writeFileSync(destPath, JSON.stringify(article, null, 2));
    fs.unlinkSync(filePath);
    promotedCount += 1;
    console.log(`公開: ${draft.title}（${draft.valueScore}） → data/articles/${draft.slug}.json`);
  }

  console.log(`合計 ${promotedCount} 件を公開しました。`);
}

main();
