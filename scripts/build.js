import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { articlePage, indexPage, CATEGORIES } from "./templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "data", "articles");
const RANKING_FILE = path.join(ROOT, "data", "ranking.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const ASSETS_DIR = path.join(ROOT, "assets");

// 独自ドメイン取得時はこのURLを差し替える
const SITE_URL = "https://takarazuka-citizen-info.pages.dev";

// 人気記事ランキングは、アクセスデータがこの件数以上蓄積されるまで「新着記事」で代替表示する
const RANKING_READY_THRESHOLD = 5;

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

function buildCategorySections(articles) {
  return CATEGORIES.map((cat) => ({
    ...cat,
    articles: articles.filter((a) => a.category === cat.label),
  })).filter((section) => section.articles.length > 0);
}

function writeFile(relativePath, content) {
  const filePath = path.join(PUBLIC_DIR, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function buildSitemap(articles) {
  const today = todayDateKey();
  const entries = [
    { loc: `${SITE_URL}/`, lastmod: today },
    ...articles.map((article) => ({
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

  const articles = loadArticles();
  const todayKey = todayDateKey();
  const todayArticles = articles.filter((a) => a.publishedAt === todayKey);
  const categorySections = buildCategorySections(articles);
  const ranking = loadRanking();

  writeFile(
    "index.html",
    indexPage({
      articles,
      todayArticles,
      categorySections,
      ranking,
      dateLabel: todayDateLabel(),
      siteUrl: SITE_URL,
    }),
  );

  for (const article of articles) {
    writeFile(`articles/${article.slug}.html`, articlePage(article, SITE_URL));
  }

  writeFile("sitemap.xml", buildSitemap(articles));
  writeFile("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  writeFile("css/style.css", fs.readFileSync(path.join(ASSETS_DIR, "style.css"), "utf-8"));
  writeFile("js/theme.js", fs.readFileSync(path.join(ASSETS_DIR, "theme.js"), "utf-8"));
  writeFile("favicon.svg", fs.readFileSync(path.join(ASSETS_DIR, "favicon.svg"), "utf-8"));

  console.log(`記事${articles.length}件をビルドしました → ${PUBLIC_DIR}`);
  console.log(`ランキング表示: ${ranking ? "有効" : "未蓄積のため新着記事で代替"}`);
}

main();
