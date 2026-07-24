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
  gianResultPage,
  zaiseiWatchPage,
  suisougakuGuidePage,
  guidePage,
  mukogawaBosaiPage,
  giinPage,
  giinIndexPage,
  privacyPage,
  aboutPage,
  adPolicyPage,
  contactPage,
  searchPage,
  CATEGORIES,
  AD_CONFIG,
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
const GIKAI_GIAN_DIR = path.join(ROOT, "data", "gikai-gian");
const GIKAI_VOTES_DIR = path.join(ROOT, "data", "gikai-votes");
const ZAISEI_DIR = path.join(ROOT, "data", "zaisei");
const EVENTS_DIR = path.join(ROOT, "data", "events");
const PUBLIC_DIR = path.join(ROOT, "public");
const ASSETS_DIR = path.join(ROOT, "assets");

// 独自ドメイン takarazuka-today.jp（2026-06-21取得・Cloudflare Pagesにカスタムドメイン設定済み）
const SITE_URL = "https://takarazuka-today.jp";

// 人気記事ランキングは、アクセスデータがこの件数以上蓄積されるまで「新着記事」で代替表示する
const RANKING_READY_THRESHOLD = 5;

// 記事価値スコアによる公開範囲: S/A=通常公開, B=一覧のみ, C=非公開（収集のみ）
const PUBLISHABLE_SCORES = new Set(["S", "A", "B"]);
const HOMEPAGE_FEATURE_SCORES = new Set(["S", "A"]);

// サイト自体のお知らせ（新機能追加等）。公式ニュース記事とは別枠で「今日の宝塚トピック」に一時的に表示する。untilを過ぎると自動的に消える
const SITE_NOTICES = [
  { text: "「吹奏楽コンクールガイド」を追加しました", href: "/category/kyoiku/suisougaku-guide.html", until: "2026-07-19" },
  { text: "「宝塚おでかけガイド」を追加しました（手塚治虫記念館・中山寺・清荒神清澄寺など）", href: "/category/kanko.html", until: "2026-07-30" },
  { text: "サイト内検索を追加しました。ページ上部の検索窓からキーワードで探せます", href: "/search.html", until: "2026-08-06" },
];

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

// 議案採決一覧：開催回ごとの議案・審議結果（宝塚市議会「議案等一覧・審議結果」をもとに人手で作成）
function loadGianSessions() {
  if (!fs.existsSync(GIKAI_GIAN_DIR)) return [];
  return fs
    .readdirSync(GIKAI_GIAN_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(GIKAI_GIAN_DIR, f), "utf-8")))
    .sort((a, b) => (a.sessionTerm < b.sessionTerm ? 1 : -1));
}

// 財政ウォッチ：宝塚市が年2回（6月・12月）公表する「財政状況」をもとに作成。period（例: r8-06）の降順（新しい順）に並べる
function loadZaiseiPeriods() {
  if (!fs.existsSync(ZAISEI_DIR)) return [];
  return fs
    .readdirSync(ZAISEI_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(ZAISEI_DIR, f), "utf-8")))
    .sort((a, b) => (a.period < b.period ? 1 : -1));
}

// 西阪神吹奏楽コンクールガイド：年度ごとのJSON（例: suisougaku-2026.json）をyearの降順（新しい順）に並べる。翌年以降はJSONを追加するだけで最新年が表示される
function loadSuisougakuYears() {
  if (!fs.existsSync(EVENTS_DIR)) return [];
  return fs
    .readdirSync(EVENTS_DIR)
    .filter((f) => f.startsWith("suisougaku-") && f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(EVENTS_DIR, f), "utf-8")))
    .sort((a, b) => b.year - a.year);
}

// 議員別の表決結果：決議日ごとのPDF（議員の賛否）をClaudeが読み取って作成。billNumber+decidedAtで議案採決一覧と緩く連携する
function loadGikaiVoteIndex() {
  const index = new Map();
  if (!fs.existsSync(GIKAI_VOTES_DIR)) return index;
  for (const file of fs.readdirSync(GIKAI_VOTES_DIR).filter((f) => f.endsWith(".json"))) {
    const data = JSON.parse(fs.readFileSync(path.join(GIKAI_VOTES_DIR, file), "utf-8"));
    for (const bill of data.bills) {
      index.set(`${bill.billNumber}|${data.decidedAt}`, {
        ...bill,
        verified: data.verified,
        verifiedAt: data.verifiedAt,
      });
    }
  }
  return index;
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

function buildSitemap(publishedArticles, categoryPageKeys, giinWithArticles, guides, gianSessions, zaiseiPeriods, suisougakuYears) {
  const today = todayDateKey();
  const entries = [
    { loc: `${SITE_URL}/`, lastmod: today },
    ...[...categoryPageKeys].map((key) => ({ loc: `${SITE_URL}/category/${key}.html`, lastmod: today })),
    { loc: `${SITE_URL}/livecam.html`, lastmod: today },
    { loc: `${SITE_URL}/mukogawa/`, lastmod: today },
    { loc: `${SITE_URL}/events/`, lastmod: today },
    { loc: `${SITE_URL}/ranking/`, lastmod: today },
    { loc: `${SITE_URL}/search.html`, lastmod: today },
    { loc: `${SITE_URL}/category/shigikai/guide.html`, lastmod: today },
    { loc: `${SITE_URL}/privacy.html`, lastmod: today },
    { loc: `${SITE_URL}/about.html`, lastmod: today },
    { loc: `${SITE_URL}/ad-policy.html`, lastmod: today },
    { loc: `${SITE_URL}/contact.html`, lastmod: today },
    ...guides.map((g) => ({ loc: `${SITE_URL}/category/${g.categoryKey}/${g.slug}.html`, lastmod: g.updatedAt })),
    ...(gianSessions.length > 0 ? [{ loc: `${SITE_URL}/category/shigikai/gian.html`, lastmod: today }] : []),
    ...(zaiseiPeriods.length > 0 ? [{ loc: `${SITE_URL}/category/shigikai/zaisei-watch.html`, lastmod: zaiseiPeriods[0].publishedDate }] : []),
    ...(suisougakuYears.length > 0 ? [{ loc: `${SITE_URL}/category/kyoiku/suisougaku-guide.html`, lastmod: today }] : []),
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

// サイト内検索用インデックス。ビルドごとに全ページから自動生成するため、記事・ガイドを追加するだけで検索対象になる
function buildSearchIndex({ publishedArticles, categorySections, guides, gianSessions, zaiseiPeriods, suisougakuYears, giinWithArticles }) {
  const entries = [];

  for (const article of publishedArticles) {
    entries.push({
      title: article.title,
      description: article.summary ?? "",
      category: article.category,
      keywords: "",
      url: `/articles/${article.slug}.html`,
    });
  }

  for (const guide of guides) {
    const keywords = [
      ...(guide.toc ?? []).map((t) => t.label),
      ...(guide.faq ?? []).map((f) => f.q),
    ].join(" ");
    entries.push({
      title: guide.title,
      description: guide.lead ?? "",
      category: guide.category?.label ?? "",
      keywords,
      url: `/category/${guide.categoryKey}/${guide.slug}.html`,
    });
  }

  for (const section of categorySections) {
    entries.push({
      title: `${section.label}の記事一覧`,
      description: `宝塚市の「${section.label}」に関する記事一覧です。`,
      category: section.label,
      keywords: "",
      url: `/category/${section.key}.html`,
    });
  }

  if (gianSessions.length > 0) {
    entries.push({
      title: "議案採決一覧",
      description: "宝塚市議会で審議された議案の採決結果（可決・否決等）と、市民生活への影響をご案内します。",
      category: "市議会",
      keywords: "議決 賛否 議員",
      url: "/category/shigikai/gian.html",
    });
  }
  if (zaiseiPeriods.length > 0) {
    entries.push({
      title: "宝塚市財政ウォッチ",
      description: "宝塚市が毎年6月・12月に公表する「財政状況」をもとに、主要な財政指標を市民向けに整理して紹介するページです。",
      category: "市議会",
      keywords: "予算 市税収入 市債残高 基金残高",
      url: "/category/shigikai/zaisei-watch.html",
    });
  }
  if (suisougakuYears.length > 0) {
    entries.push({
      title: "吹奏楽コンクールガイド",
      description: "宝塚市内の中学校・高校が出場する吹奏楽コンクールの大会情報・結果をまとめたガイドページです。",
      category: "教育",
      keywords: "西阪神地区大会 県大会 中学校 高校",
      url: "/category/kyoiku/suisougaku-guide.html",
    });
  }
  entries.push({
    title: "宝塚市議会のしくみ・市議会ウォッチの見方",
    description: "宝塚市議会のしくみをわかりやすく解説。本会議と委員会の違い、定例会・臨時会の違いなどを紹介します。",
    category: "市議会",
    keywords: "",
    url: "/category/shigikai/guide.html",
  });

  if (giinWithArticles.length > 0) {
    entries.push({
      title: "議員活動サマリー一覧",
      description: "宝塚市議会議員の公開発言を時系列で整理した一覧です。",
      category: "市議会",
      keywords: giinWithArticles.map((g) => g.name).join(" "),
      url: "/giin/",
    });
    for (const giin of giinWithArticles) {
      entries.push({
        title: `${giin.name}議員の発言記録`,
        description: `${giin.name}議員の市議会会議録に基づく公開発言を時系列で整理したページです。`,
        category: "市議会",
        keywords: "",
        url: `/giin/${giin.slug}.html`,
      });
    }
  }

  entries.push(
    {
      title: "武庫川ライブカメラ",
      description: "武庫川（武田尾・生瀬）と大堀川・波豆川のライブカメラをまとめてリンク。水位基準もあわせて確認できます。",
      category: "防災",
      keywords: "河川監視カメラ 水位",
      url: "/livecam.html",
    },
    {
      title: "武庫川防災情報",
      description: "武庫川のライブカメラ・水位・雨量情報を確認できる公式ページへの案内です。",
      category: "防災",
      keywords: "",
      url: "/mukogawa/",
    },
    {
      title: "イベントカレンダー",
      description: "宝塚市内で開催されるイベントの今日・今週末・今月の予定一覧です。",
      category: "イベント",
      keywords: "",
      url: "/events/",
    },
    {
      title: "人気記事ランキング",
      description: "Takarazuka Todayでよく読まれている記事のランキングです。",
      category: "",
      keywords: "",
      url: "/ranking/",
    },
    {
      title: "運営者情報",
      description: "Takarazuka Todayのサイト名・目的・編集方針・運営体制について説明します。",
      category: "",
      keywords: "",
      url: "/about.html",
    },
    {
      title: "お問い合わせ",
      description: "Takarazuka Todayへのお問い合わせはこちらから。記事内容の訂正依頼・情報提供・PR・広告掲載のご相談を受け付けています。",
      category: "",
      keywords: "",
      url: "/contact.html",
    },
  );

  return entries;
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
  const activeNotices = SITE_NOTICES.filter((n) => todayKey <= n.until);
  const ranking = loadRanking();
  const giinList = loadGiin();
  const guides = loadGuides();
  const gianSessions = loadGianSessions();
  const gikaiVoteIndex = loadGikaiVoteIndex();
  const zaiseiPeriods = loadZaiseiPeriods();
  const suisougakuYears = loadSuisougakuYears();

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
      hasGianPage: gianSessions.length > 0,
      activeNotices,
    }),
  );

  for (const article of publishedArticles) {
    writeFile(`articles/${article.slug}.html`, articlePage(article, SITE_URL, giinList));
  }

  for (const section of categorySections) {
    const hasGianPage = section.key === "shigikai" && gianSessions.length > 0;
    const hasZaiseiPage = section.key === "shigikai" && zaiseiPeriods.length > 0;
    const hasSuisougakuPage = section.key === "kyoiku" && suisougakuYears.length > 0;
    writeFile(`category/${section.key}.html`, categoryPage(section, section.allArticles, SITE_URL, section.guides, hasGianPage, hasZaiseiPage, hasSuisougakuPage));
  }
  for (const guide of guides) {
    writeFile(`category/${guide.categoryKey}/${guide.slug}.html`, guidePage(guide, SITE_URL));
  }
  writeFile("livecam.html", livecamPage(SITE_URL));
  writeFile("mukogawa/index.html", mukogawaBosaiPage(SITE_URL));
  writeFile("category/shigikai/guide.html", gikaiGuidePage(SITE_URL));
  if (gianSessions.length > 0) {
    writeFile("category/shigikai/gian.html", gianResultPage(gianSessions, gikaiVoteIndex, SITE_URL));
  }
  if (zaiseiPeriods.length > 0) {
    writeFile("category/shigikai/zaisei-watch.html", zaiseiWatchPage(zaiseiPeriods, SITE_URL));
  }
  if (suisougakuYears.length > 0) {
    writeFile("category/kyoiku/suisougaku-guide.html", suisougakuGuidePage(suisougakuYears, SITE_URL));
  }
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

  writeFile("sitemap.xml", buildSitemap(publishedArticles, categoryPageKeys, giinWithArticles, guides, gianSessions, zaiseiPeriods, suisougakuYears));
  writeFile("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  // AdSense導入準備（フェーズ21）：data/ad-config.jsonのadsTxtに内容を設定するとads.txtが出力される。未設定の間は生成しない
  if (AD_CONFIG.adsTxt) {
    writeFile("ads.txt", `${AD_CONFIG.adsTxt}\n`);
  }

  const searchIndex = buildSearchIndex({ publishedArticles, categorySections, guides, gianSessions, zaiseiPeriods, suisougakuYears, giinWithArticles });
  writeFile("search-index.json", JSON.stringify(searchIndex));
  writeFile("search.html", searchPage(SITE_URL));
  writeFile("js/search.js", fs.readFileSync(path.join(ASSETS_DIR, "search.js"), "utf-8"));

  writeFile("css/style.css", fs.readFileSync(path.join(ASSETS_DIR, "style.css"), "utf-8"));
  writeFile("js/theme.js", fs.readFileSync(path.join(ASSETS_DIR, "theme.js"), "utf-8"));
  writeFile("js/contact-form.js", fs.readFileSync(path.join(ASSETS_DIR, "contact-form.js"), "utf-8"));
  writeFile("favicon.svg", fs.readFileSync(path.join(ASSETS_DIR, "favicon.svg"), "utf-8"));
  writeFile("img/header-banner.png", fs.readFileSync(path.join(ASSETS_DIR, "header-banner.png")));
  writeFile("photos/hanshin-keibajo.jpg", fs.readFileSync(path.join(ASSETS_DIR, "photos", "hanshin-keibajo.jpg")));
  writeFile("photos/nakayamadera.jpg", fs.readFileSync(path.join(ASSETS_DIR, "photos", "nakayamadera.jpg")));
  writeFile("photos/kiyoshikojin.jpg", fs.readFileSync(path.join(ASSETS_DIR, "photos", "kiyoshikojin.jpg")));

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
  console.log(`検索インデックス: ${searchIndex.length}件`);
}

main();
