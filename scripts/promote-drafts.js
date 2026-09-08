import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateArticle, PUBLISHABLE_SCORES } from "./lib/article-schema.js";

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
  // relatedArticles の参照先確認用。C評価は記事ページが生成されないため参照先として認めない。
  // 対象は「既存の公開対象記事(S/A/B)」＋「今回同時にpromoteされるapproved draftのうちS/A/B」。
  const publishedSlugs = new Set();
  if (fs.existsSync(ARTICLES_DIR)) {
    for (const f of fs.readdirSync(ARTICLES_DIR).filter((n) => n.endsWith(".json"))) {
      const existing = JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, f), "utf-8"));
      if (PUBLISHABLE_SCORES.has(existing.valueScore) && existing.slug) publishedSlugs.add(existing.slug);
    }
  }
  for (const file of files) {
    const draft = JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, file), "utf-8"));
    if (draft.approved === true && draft.slug && PUBLISHABLE_SCORES.has(draft.valueScore)) publishedSlugs.add(draft.slug);
  }
  let promotedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const filePath = path.join(DRAFTS_DIR, file);
    const draft = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    if (draft.approved !== true) continue;

    if (!draft.slug || !draft.valueScore) {
      console.warn(`スキップ（slugまたはvalueScoreが未設定）: ${file}`);
      continue;
    }

    const { approved, ...article } = draft;

    // 不正なschemaのまま data/articles/ に入れないよう、promote前に検証する
    const { errors, warnings } = validateArticle(article, { publishedSlugs });
    for (const warning of warnings) console.warn(`  警告（${file}）: ${warning}`);
    if (errors.length > 0) {
      console.error(`公開中止（${file}）:`);
      for (const error of errors) console.error(`  - ${error}`);
      errorCount += 1;
      continue;
    }

    const destPath = path.join(ARTICLES_DIR, `${draft.slug}.json`);
    fs.mkdirSync(ARTICLES_DIR, { recursive: true });
    fs.writeFileSync(destPath, JSON.stringify(article, null, 2));
    fs.unlinkSync(filePath);
    promotedCount += 1;
    console.log(`公開: ${draft.title}（${draft.valueScore}） → data/articles/${draft.slug}.json`);
  }

  console.log(`合計 ${promotedCount} 件を公開しました。`);
  if (errorCount > 0) {
    console.error(`${errorCount} 件はスキーマエラーのため公開されませんでした。`);
    process.exitCode = 1;
  }
}

main();
