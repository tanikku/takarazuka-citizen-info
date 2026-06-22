import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  articlePage,
  indexPage,
  categoryPage,
  comingSoonCategoryPage,
  CATEGORIES,
  SHIGIKAI_CATEGORY,
} from "./templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "data", "articles");
const RANKING_FILE = path.join(ROOT, "data", "ranking.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const ASSETS_DIR = path.join(ROOT, "assets");

// 独自ドメイン takarazuka-today.jp（2026-06-21取得・Cloudflare Pagesにカスタムドメイン設定済み）
const SITE_URL = "https://takarazuka-today.jp";

// 人気記事ランキングは、アクセスデータがこの件数以上蓄積されるまで「新着記事」で代替表示する
const RANKING_READY_THRESHOLD = 5;

// 記事価値スコアによる公開範囲: S/A=通常公開, B=一覧のみ, C=非公開（収集のみ）
const PUBLISHABLE_SCORES = new Set(["S", "A", "B"]);
const HOMEPAGE_FEATURE_SCORES = new Set(["S", "A"]);

function loadArticles() {
  if (!fs.existsSync(ARTICLES_DIR)) return [];

  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf-8");
      return JSON.parse(raw);
    })
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

function loadRanking() {
  if (!fs.existsSync(RANKING_FILE)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(RANKING_FILE, "utf-8"));
    if (Array.isArray(data.weekly) && data.weekly.length >= RANKING_READY_THRESHOLD) {
      return data;
    }
  } catch {
    return null;
  }
  return null;
}

function todayDateLabel() {
  const now = new Date();
  return now.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function todayDateKey() {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" }); // YYYY-MM-DD
}

function writeFile(relativePath, content) {
  const filePath = path.join(PUBLIC_DIR, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function buildSitemap(publishedArticles, categoryPageKeys) {
  const today = todayDateKey();
  const entries = [
    { loc: `${SITE_URL}/`, lastmod: today },
    ...[...categoryPageKeys].map((key) => ({ loc: `${SITE_URL}/category/${key}.html`, lastmod: today })),
    { loc: `${SITE_URL}/category/${SHIGIKAI_CATEGORY.key}.html`, lastmod: today },
    ...publishedArticles.map((article) => ({
      loc: `${SITE_URL}/articles/${article.slug}.html`,
      lastmod: article.publishedAt,
    })),
  ];

  const body = entries
    .map((e) => `<url><loc>${e.loc}</loc><lastmod>${e.lastmod}</lastmod></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function main() {
  fs.rmSync(PUBLIC_DIR, { recursive: true, force: true });

  const allArticles = loadArticles();
  const skippedCount = allArticles.length - allArticles.filter((a) => PUBLISHABLE_SCORES.has(a.valueScore)).length;

  // C評価（非公開）は完全に除外。記事詳細ページもサイトマップにも含めない
  const publishedArticles = allArticles.filter((a) => PUBLISHABLE_SCORES.has(a.valueScore));
  // S/Aのみがトップニュース・今日のトピック・カテゴリープレビューなど目立つ場所に表示される
  const featuredArticles = publishedArticles.filter((a) => HOMEPAGE_FEATURE_SCORES.has(a.valueScore));

  const todayKey = todayDateKey();
  const todayArticles = featuredArticles.filter((a) => a.publishedAt === todayKey);
  const ranking = loadRanking();

  // カテゴリーごとに、公開対象（S/A/B）の記事をまとめる。1件以上ある場合のみカテゴリーページを生成する
  const categorySections = CATEGORIES.map((cat) => ({
    ...cat,
    allArticles: publishedArticles.filter((a) => a.category === cat.label),
    featuredArticles: featuredArticles.filter((a) => a.category === cat.label),
  })).filter((section) => section.allArticles.length > 0);

  const categoryPageKeys = new Set(categorySections.map((s) => s.key));

  writeFile(
    "index.html",
    indexPage({
      topArticles: featuredArticles,
      todayArticles,
      categoryPreviewSections: categorySections
        .filter((s) => s.featuredArticles.length > 0)
        .map((s) => ({ ...s, articles: s.featuredArticles })),
      categoryPageKeys,
      publishedArticles,
      ranking,
      dateLabel: todayDateLabel(),
      siteUrl: SITE_URL,
    }),
  );

  for (const article of publishedArticles) {
    writeFile(`articles/${article.slug}.html`, articlePage(article, SITE_URL));
  }

  for (const section of categorySections) {
    writeFile(`category/${section.key}.html`, categoryPage(section, section.allArticles, SITE_URL));
  }
  writeFile(`category/${SHIGIKAI_CATEGORY.key}.html`, comingSoonCategoryPage(SITE_URL));

  writeFile("sitemap.xml", buildSitemap(publishedArticles, categoryPageKeys));
  writeFile("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  writeFile("css/style.css", fs.readFileSync(path.join(ASSETS_DIR, "style.css"), "utf-8"));
  writeFile("js/theme.js", fs.readFileSync(path.join(ASSETS_DIR, "theme.js"), "utf-8"));
  writeFile("favicon.svg", fs.readFileSync(path.join(ASSETS_DIR, "favicon.svg"), "utf-8"));
  writeFile("img/header-banner.png", fs.readFileSync(path.join(ASSETS_DIR, "header-banner.png")));

  console.log(`公開記事: ${publishedArticles.length}件（S/A=${featuredArticles.length}件・B=${publishedArticles.length - featuredArticles.length}件） / 非公開(C): ${skippedCount}件`);
  console.log(`カテゴリーページ: ${categorySections.length}件 + 市議会（準備中）`);
  console.log(`ランキング表示: ${ranking ? "有効" : "未蓄積のため新着記事で代替"}`);
}

main();
