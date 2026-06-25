import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  articlePage,
  indexPage,
  categoryPage,
  livecamPage,
  eventsPage,
  rankingPage,
  gikaiGuidePage,
  guidePage,
  mukogawaBosaiPage,
  giinPage,
  giinIndexPage,
  privacyPage,
  aboutPage,
  adPolicyPage,
  contactPage,
  CATEGORIES,
} from "./templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "data", "articles");
const RANKING_FILE = path.join(ROOT, "data", "ranking.json");
const PHOTOS_JSON = path.join(ROOT, "data", "photos.json");
const PHOTOS_DIR = path.join(ROOT, "assets", "photos");
const WEATHER_JSON = path.join(ROOT, "data", "weather.json");
const GIIN_JSON = path.join(ROOT, "data", "giin.json");
const GUIDES_DIR = path.join(ROOT, "data", "guides");
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

function loadGuides() {
  if (!fs.existsSync(GUIDES_DIR)) return [];
  return fs.readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(GUIDES_DIR, f), "utf-8")))
    .map((g) => ({ ...g, category: CATEGORIES.find((c) => c.key === g.categoryKey) }));
}

function loadGiin() {
  if (!fs.existsSync(GIIN_JSON)) return [];
  return JSON.parse(fs.readFileSync(GIIN_JSON, "utf-8"));
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

// 月から季節カテゴリーを判定（3-5月=春, 6-8月=夏, 9-11月=秋, 12-2月=冬）
function seasonFromMonth(month) {
  if (month >= 3 && month <= 5) return { category: "春", label: "春の宝塚" };
  if (month >= 6 && month <= 8) return { category: "夏", label: "夏の宝塚" };
  if (month >= 9 && month <= 11) return { category: "秋", label: "秋の宝塚" };
  return { category: "冬", label: "冬の宝塚" };
}

function pickPhotoOfDay(allPhotos) {
  const now = new Date();
  const todayKobe = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const { category, label } = seasonFromMonth(todayKobe.getMonth() + 1);

  const seasonPhotos = allPhotos.filter((p) => p.category === category);
  if (seasonPhotos.length === 0) return null;

  const dayOfYear = Math.floor((todayKobe - new Date(todayKobe.getFullYear(), 0, 0)) / 86400000);
  const photo = seasonPhotos[dayOfYear % seasonPhotos.length];
  return { photo, seasonLabel: label };
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

// "YYYY-MM-DD"の文字列から曜日（0=日〜6=土）をタイムゾーンに依存せず求める
function dayOfWeek(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function addDaysToKey(dateKey, days) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function lastDayOfMonthKey(dateKey) {
  const [y, m] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m, 0)); // 翌月の0日 = 当月末日
  return dt.toISOString().slice(0, 10);
}

function splitEventsByRange(occurrences) {
  const todayKey = todayDateKey();
  const weekEndKey = addDaysToKey(todayKey, 7);
  const monthEndKey = lastDayOfMonthKey(todayKey);

  const today = occurrences.filter((o) => o.date === todayKey);
  const thisWeekend = occurrences.filter((o) => {
    if (o.date > weekEndKey) return false;
    const dow = dayOfWeek(o.date);
    return dow === 0 || dow === 6;
  });
  const thisMonth = occurrences.filter((o) => o.date <= monthEndKey);
  return { today, thisWeekend, thisMonth };
}

function loadRanking() {
  if (!fs.existsSync(RANKING_FILE)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(RANKING_FILE, "utf-8"));
    if (Array.isArray(data.top) && data.top.length >= RANKING_READY_THRESHOLD) {
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

function buildSitemap(publishedArticles, categoryPageKeys, giinWithArticles, guides) {
  const today = todayDateKey();
  const entries = [
    { loc: `${SITE_URL}/`, lastmod: today },
    ...[...categoryPageKeys].map((key) => ({ loc: `${SITE_URL}/category/${key}.html`, lastmod: today })),
    { loc: `${SITE_URL}/livecam.html`, lastmod: today },
    { loc: `${SITE_URL}/mukogawa/`, lastmod: today },
    { loc: `${SITE_URL}/events/`, lastmod: today },
    { loc: `${SITE_URL}/ranking/`, lastmod: today },
    { loc: `${SITE_URL}/category/shigikai/guide.html`, lastmod: today },
    { loc: `${SITE_URL}/privacy.html`, lastmod: today },
    { loc: `${SITE_URL}/about.html`, lastmod: today },
    { loc: `${SITE_URL}/ad-policy.html`, lastmod: today },
    { loc: `${SITE_URL}/contact.html`, lastmod: today },
    ...guides.map((g) => ({ loc: `${SITE_URL}/category/${g.categoryKey}/${g.slug}.html`, lastmod: g.updatedAt })),
    ...(giinWithArticles.length > 0 ? [{ loc: `${SITE_URL}/giin/`, lastmod: today }] : []),
    ...giinWithArticles.map((giin) => ({ loc: `${SITE_URL}/giin/${giin.slug}.html`, lastmod: today })),
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
  const giinList = loadGiin();
  const guides = loadGuides();

  // カテゴリーごとに、公開対象（S/A/B）の記事をまとめる。記事が1件以上、またはガイドページがある場合のみカテゴリーページを生成する
  const categorySections = CATEGORIES.map((cat) => ({
    ...cat,
    allArticles: publishedArticles.filter((a) => a.category === cat.label),
    featuredArticles: featuredArticles.filter((a) => a.category === cat.label),
    guides: guides.filter((g) => g.categoryKey === cat.key),
  })).filter((section) => section.allArticles.length > 0 || section.guides.length > 0);

  const categoryPageKeys = new Set(categorySections.map((s) => s.key));
  const allPhotos = loadPhotos();

  writeFile(
    "index.html",
    indexPage({
      topArticles: featuredArticles,
      todayArticles,
      categoryPageKeys,
      publishedArticles,
      ranking,
      weather: loadWeather(),
      todayCounts: computeTodayCounts(publishedArticles),
      photoOfDay: pickPhotoOfDay(allPhotos),
      dateLabel: todayDateLabel(),
      siteUrl: SITE_URL,
    }),
  );

  for (const article of publishedArticles) {
    writeFile(`articles/${article.slug}.html`, articlePage(article, SITE_URL, giinList));
  }

  for (const section of categorySections) {
    writeFile(`category/${section.key}.html`, categoryPage(section, section.allArticles, SITE_URL, section.guides));
  }
  for (const guide of guides) {
    writeFile(`category/${guide.categoryKey}/${guide.slug}.html`, guidePage(guide, SITE_URL));
  }
  writeFile("livecam.html", livecamPage(SITE_URL));
  writeFile("mukogawa/index.html", mukogawaBosaiPage(SITE_URL));
  writeFile("category/shigikai/guide.html", gikaiGuidePage(SITE_URL));
  writeFile("privacy.html", privacyPage(SITE_URL));
  writeFile("about.html", aboutPage(SITE_URL));
  writeFile("ad-policy.html", adPolicyPage(SITE_URL));
  writeFile("contact.html", contactPage(SITE_URL, process.env.TURNSTILE_SITE_KEY));

  const giinWithArticles = giinList.filter(
    (giin) => publishedArticles.filter((a) => (a.giin ?? []).includes(giin.slug)).length > 0,
  );
  for (const giin of giinWithArticles) {
    const relatedArticles = publishedArticles.filter((a) => (a.giin ?? []).includes(giin.slug));
    writeFile(`giin/${giin.slug}.html`, giinPage(giin, relatedArticles, SITE_URL));
  }
  if (giinWithArticles.length > 0) {
    writeFile("giin/index.html", giinIndexPage(giinWithArticles, SITE_URL));
  }

  const eventOccurrences = buildEventOccurrences(publishedArticles);
  const { today: todayEvents, thisWeekend, thisMonth } = splitEventsByRange(eventOccurrences);
  writeFile("events/index.html", eventsPage({ todayEvents, thisWeekend, thisMonth, siteUrl: SITE_URL }));
  writeFile("ranking/index.html", rankingPage(ranking, publishedArticles, SITE_URL));

  writeFile("sitemap.xml", buildSitemap(publishedArticles, categoryPageKeys, giinWithArticles, guides));
  writeFile("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  writeFile("css/style.css", fs.readFileSync(path.join(ASSETS_DIR, "style.css"), "utf-8"));
  writeFile("js/theme.js", fs.readFileSync(path.join(ASSETS_DIR, "theme.js"), "utf-8"));
  writeFile("js/contact-form.js", fs.readFileSync(path.join(ASSETS_DIR, "contact-form.js"), "utf-8"));
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
  console.log(`カテゴリーページ: ${categorySections.length}件`);
  console.log(`議員活動サマリー: ${giinWithArticles.length}名`);
  console.log(`ランキング表示: ${ranking ? "有効" : "未蓄積のため新着記事で代替"}`);
}

main();
