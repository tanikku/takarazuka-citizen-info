import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  articlePage,
  indexPage,
  categoryPage,
  comingSoonCategoryPage,
  livecamPage,
  eventsPage,
  mukogawaBosaiPage,
  CATEGORIES,
  SHIGIKAI_CATEGORY,
} from "./templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "data", "articles");
const RANKING_FILE = path.join(ROOT, "data", "ranking.json");
const PHOTOS_JSON = path.join(ROOT, "data", "photos.json");
const PHOTOS_DIR = path.join(ROOT, "assets", "photos");
const WEATHER_JSON = path.join(ROOT, "data", "weather.json");
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

function loadPhotos() {
  if (!fs.existsSync(PHOTOS_JSON)) return [];
  return JSON.parse(fs.readFileSync(PHOTOS_JSON, "utf-8"));
}

function loadWeather() {
  if (!fs.existsSync(WEATHER_JSON)) return null;
  try {
    return JSON.parse(fs.readFileSync(WEATHER_JSON, "utf-8"));
  } catch {
    return null;
  }
}

function computeTodayCounts(publishedArticles) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const isWithin7Days = (a) => new Date(a.publishedAt).getTime() >= sevenDaysAgo;

  return {
    event: publishedArticles.filter((a) => a.category === "イベント").length,
    city: publishedArticles.filter((a) => a.sourceName === "宝塚市公式サイト" && isWithin7Days(a)).length,
    pref: publishedArticles.filter((a) => a.sourceName === "兵庫県公式サイト" && isWithin7Days(a)).length,
    police: publishedArticles.filter((a) => a.sourceName === "兵庫県警察" && isWithin7Days(a)).length,
  };
}

function buildEventOccurrences(publishedArticles) {
  const todayKey = todayDateKey();
  const occurrences = [];
  for (const article of publishedArticles) {
    if (!Array.isArray(article.eventDates)) continue;
    for (const date of article.eventDates) {
      if (date >= todayKey) occurrences.push({ article, date });
    }
  }
  occurrences.sort((a, b) => (a.date < b.date ? -1 : 1));
  return occurrences;
}

function splitEventsByRange(occurrences) {
  const todayKey = todayDateKey();
  const today = new Date(`${todayKey}T00:00:00+09:00`);
  const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const thisWeek = occurrences.filter((o) => new Date(`${o.date}T00:00:00+09:00`) <= weekEnd);
  const thisMonth = occurrences.filter((o) => new Date(`${o.date}T00:00:00+09:00`) <= monthEnd);
  return { thisWeek, thisMonth };
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
    { loc: `${SITE_URL}/livecam.html`, lastmod: today },
    { loc: `${SITE_URL}/mukogawa/`, lastmod: today },
    { loc: `${SITE_URL}/events/`, lastmod: today },
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
  const allPhotos = loadPhotos();

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
      weather: loadWeather(),
      todayCounts: computeTodayCounts(publishedArticles),
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
  writeFile("livecam.html", livecamPage(SITE_URL));
  writeFile("mukogawa/index.html", mukogawaBosaiPage(SITE_URL));

  const eventOccurrences = buildEventOccurrences(publishedArticles);
  const { thisWeek, thisMonth } = splitEventsByRange(eventOccurrences);
  writeFile("events/index.html", eventsPage({ thisWeek, thisMonth, siteUrl: SITE_URL }));

  writeFile("sitemap.xml", buildSitemap(publishedArticles, categoryPageKeys));
  writeFile("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  writeFile("css/style.css", fs.readFileSync(path.join(ASSETS_DIR, "style.css"), "utf-8"));
  writeFile("js/theme.js", fs.readFileSync(path.join(ASSETS_DIR, "theme.js"), "utf-8"));
  writeFile("favicon.svg", fs.readFileSync(path.join(ASSETS_DIR, "favicon.svg"), "utf-8"));
  writeFile("img/header-banner.png", fs.readFileSync(path.join(ASSETS_DIR, "header-banner.png")));

  for (const photo of allPhotos) {
    const srcPath = path.join(PHOTOS_DIR, photo.localFile);
    if (fs.existsSync(srcPath)) {
      writeFile(`photos/${photo.localFile}`, fs.readFileSync(srcPath));
    }
  }

  console.log(`公開記事: ${publishedArticles.length}件（S/A=${featuredArticles.length}件・B=${publishedArticles.length - featuredArticles.length}件） / 非公開(C): ${skippedCount}件`);
  console.log(`写真: ${allPhotos.length}枚をpublic/photos/にコピー（記事・パネルのサムネイル用）`);
  console.log(`カテゴリーページ: ${categorySections.length}件 + 市議会（準備中）`);
  console.log(`ランキング表示: ${ranking ? "有効" : "未蓄積のため新着記事で代替"}`);
}

main();
