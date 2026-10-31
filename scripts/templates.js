import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { articleStatusNotice } from "./lib/article-status.js";
import { isArticleIndexable } from "./lib/indexing.js";
import { contentVersion } from "./lib/asset-version.js";
import { reasonLabel, monthDayLabel } from "./lib/home-news.js";

// フェーズ17：回遊率向上のための「おすすめページ」「人気コンテンツ」データ（JSON管理）
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// build.js が public/css/style.css へそのままコピーするファイルと同じ内容からバージョンを決める
export const STYLESHEET_HREF = `/css/style.css?v=${contentVersion(
  fs.readFileSync(path.join(__dirname, "..", "assets", "style.css"))
)}`;
const RECOMMENDATIONS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "recommendations.json"), "utf-8"),
);

// フェーズ21：広告設定（AdSense導入準備）。enabled:falseの間は広告関連の出力を一切行わない。
// 防災・防犯など広告を出さないページはexcludedCategories/excludedPathsで制御する
export const AD_CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "ad-config.json"), "utf-8"),
);

// このページで広告を表示してよいか（カテゴリ・パスの除外ルールを適用）
export function adsAllowedFor({ category = "", pathname = "" }) {
  if (AD_CONFIG.excludedCategories.includes(category)) return false;
  if (AD_CONFIG.excludedPaths.includes(pathname)) return false;
  return true;
}

// 広告挿入ポイント。enabled:false、スロット未設定、または除外ページでは空文字を返す（HTMLに何も出力しない）
function adSlot(slotName, adsAllowed) {
  if (!AD_CONFIG.enabled || !adsAllowed) return "";
  const slotId = AD_CONFIG.slots[slotName];
  if (!slotId || !AD_CONFIG.adsenseClientId) return "";
  return `<div class="ad-slot ad-slot-${escapeHtml(slotName)}">
<ins class="adsbygoogle" style="display:block" data-ad-client="${escapeHtml(AD_CONFIG.adsenseClientId)}" data-ad-slot="${escapeHtml(slotId)}" data-ad-format="auto" data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>`;
}

export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// comparisonTables のセル。文字列は従来どおりエスケープのみ（既存記事の出力を変えない）。
// { links: [{ text, href }] } のときだけリンクにする。schema検証済みでも、描画側で https:// 以外は文字のみ出力する
export function tableCellHtml(cell) {
  if (typeof cell === "string") return escapeHtml(cell);
  if (!cell || !Array.isArray(cell.links)) return "";
  return cell.links
    .map((link) => {
      const text = escapeHtml(link?.text ?? "");
      const href = typeof link?.href === "string" ? link.href : "";
      if (!href.startsWith("https://")) return text;
      return `<a class="table-cell-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    })
    .join("<br>");
}

// モダンな線画スタイルのアイコンセット（絵文字の代わりに使用。外部アイコンフォント・ライブラリは使わない）
const ICON_PATHS = {
  building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><rect x="8" y="6.5" width="3" height="3" rx="0.5"/><rect x="13" y="6.5" width="3" height="3" rx="0.5"/><rect x="8" y="11.5" width="3" height="3" rx="0.5"/><rect x="13" y="11.5" width="3" height="3" rx="0.5"/><line x1="9" y1="21" x2="15" y2="21"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
  alert: '<path d="M12 4l9 16H3z"/><line x1="12" y1="10" x2="12" y2="13.5"/><rect x="11.4" y="15.5" width="1.2" height="1.2" rx="0.3" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>',
  child: '<circle cx="12" cy="7" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  book: '<path d="M12 6.5c-2.2-1.3-5-1.7-8-1v13c3-0.7 5.8-0.3 8 1c2.2-1.3 5-1.7 8-1v-13c-3-0.7-5.8-0.3-8 1z"/><line x1="12" y1="6.5" x2="12" y2="19.5"/>',
  camera: '<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M9 6l1-2h4l1 2"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5 1.5 6.5H4.5C4.5 13 6 12 6 8z"/><path d="M10 18a2 2 0 0 0 4 0"/>',
  flame: '<path d="M12 3c1 3-3 4-3 7a3 3 0 0 0 6 0c0-1-.5-2-.5-2 2 1 3 3 3 5a5.5 5.5 0 0 1-11 0c0-4 3-6 3-7 0-1.5 1-2.5 2-3z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4" y1="12" x2="2" y2="12"/><line x1="22" y1="12" x2="20" y2="12"/><line x1="5" y1="5" x2="6.5" y2="6.5"/><line x1="17.5" y1="17.5" x2="19" y2="19"/><line x1="5" y1="19" x2="6.5" y2="17.5"/><line x1="17.5" y1="6.5" x2="19" y2="5"/>',
  moon: '<path d="M21 12.5A9 9 0 1 1 11.5 3a7 7 0 0 0 9.5 9.5z"/>',
  newspaper: '<rect x="3" y="5" width="14" height="16" rx="1.5"/><line x1="6" y1="9" x2="14" y2="9"/><line x1="6" y1="12.5" x2="14" y2="12.5"/><line x1="6" y1="16" x2="11" y2="16"/><path d="M17 8h3a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H7"/>',
  videoCamera: '<rect x="2" y="6" width="13" height="12" rx="1.5"/><path d="M15 10l6-3v10l-6-3z"/><circle cx="6" cy="9" r="0.6" fill="currentColor" stroke="none"/>',
  ticket: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><line x1="13" y1="6" x2="13" y2="18" stroke-dasharray="2 2"/>',
  user: '<circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  horse: '<ellipse cx="11" cy="14" rx="6" ry="3.2" fill="currentColor" stroke="none"/><path d="M14 11 L16 12 L20 5 L18 5 Z" fill="currentColor" stroke="none"/><circle cx="19.5" cy="5" r="1.8" fill="currentColor" stroke="none"/><path d="M19 3.5 L20 1.3 L21 3.5 Z" fill="currentColor" stroke="none"/><rect x="20.5" y="4.5" width="2.6" height="1.4" rx="0.6" fill="currentColor" stroke="none"/><rect x="6" y="16" width="1.4" height="6" fill="currentColor" stroke="none"/><rect x="9" y="16" width="1.4" height="6" fill="currentColor" stroke="none"/><rect x="13" y="16" width="1.4" height="6" fill="currentColor" stroke="none"/><rect x="16" y="16" width="1.4" height="6" fill="currentColor" stroke="none"/><path d="M5 12 Q2 14 3 19 Q4 16 6 14 Z" fill="currentColor" stroke="none"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/>',
  temple: '<path d="M3 8 Q12 4 21 8"/><line x1="3" y1="8" x2="3" y2="9.5"/><line x1="21" y1="8" x2="21" y2="9.5"/><line x1="4.5" y1="11" x2="19.5" y2="11"/><line x1="7" y1="11" x2="7" y2="21"/><line x1="17" y1="11" x2="17" y2="21"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.2" y2="16.2"/>',
};

export function icon(name) {
  const path = ICON_PATHS[name] ?? ICON_PATHS.newspaper;
  return `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

// 記事を生成・公開する対象カテゴリ
export const CATEGORIES = [
  { key: "kurashi", label: "行政・くらし", icon: "building" },
  { key: "bohan", label: "防犯", icon: "shield" },
  { key: "bosai", label: "防災", icon: "alert" },
  { key: "event", label: "イベント", icon: "calendar" },
  { key: "kosodate", label: "子育て", icon: "child" },
  { key: "kyoiku", label: "教育", icon: "book" },
  { key: "kanko", label: "文化・観光", icon: "camera" },
  { key: "shigikai", label: "市議会", icon: "building" },
];

export const SHIGIKAI_CATEGORY = CATEGORIES.find((c) => c.key === "shigikai");

// 市議会カテゴリーは市議会の公式情報をもとにAI要約・人間レビューを行う運用のため、ページ上部に明記する（特定の資料に限定しない文言にする）
const SHIGIKAI_DISCLOSURE = `<div class="disclosure-box">本ページの内容は、宝塚市議会が公開している公式情報をもとに、AIを用いて整理・要約し、公開前に人間が内容を確認しています。使用した資料は各ページの「出典」をご確認ください。事実のみを記載し、議員の評価・政治的意見・優劣判断は一切行いません。</div>`;

export function categoryPath(key) {
  return `/category/${key}`;
}

function themeInitScript() {
  return `(function(){try{var s=localStorage.getItem('theme');var t=s||((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
}

function header() {
  return `<header class="site-header">
<div class="header-overlay">
  <div class="header-row">
    <a href="/" class="logo">Takarazuka Today<small>今日の宝塚を、3分で。</small></a>
    <button class="theme-toggle" data-theme-toggle type="button" aria-label="ダークモード切り替え">
      <span class="theme-icon theme-icon-sun">${icon("sun")}</span>
      <span class="theme-icon theme-icon-moon">${icon("moon")}</span>
    </button>
  </div>
  <p class="site-tagline"><span>宝塚の暮らしに役立つ情報を</span><span>毎日わかりやすくお届け</span></p>
</div>
</header>`;
}

// 運営系の固定ページ（運営者情報・プライバシー・広告ポリシー）の項目見出し。
// 見出しとしての意味を持たせつつ、既存の .guide-q（font-weight:700）の見え方を保つため
// h2の既定サイズ（1.5em）を打ち消して本文と同じ1remにそろえる。
function staticSectionHeading(text) {
  return `<h2 class="guide-q" style="font-size:1rem;">${escapeHtml(text)}</h2>`;
}

// トップページ唯一のh1。日付バー内の説明文をそのまま見出しにするため、
// .site-lead 側でh1既定の太字・上下marginを打ち消して見た目を変えない。
function dateBar(dateLabel) {
  return `<div class="date-bar">${icon("calendar")}<span>${escapeHtml(dateLabel)}</span><span class="site-lead-sep">|</span><h1 class="site-lead">宝塚市の暮らしに役立つ地域情報</h1></div>`;
}


function weatherPanel(weather) {
  if (!weather) {
    return `<div class="panel" id="weather">
<p class="panel-title">${icon("sun")}今日の天気</p>
<p class="empty-state">天気情報を取得できませんでした</p>
</div>`;
  }

  const popHtml =
    weather.popBlocks && weather.popBlocks.length > 0
      ? `<div class="weather-pop-row">
${weather.popBlocks.map((b) => `<div class="weather-pop-block"><span class="weather-pop-time">${escapeHtml(b.label)}</span><span class="weather-pop-val">${escapeHtml(b.pop)}%</span></div>`).join("\n")}
</div>`
      : "";

  return `<div class="panel" id="weather">
<p class="panel-title">${icon("sun")}今日の天気</p>
<div class="weather-body">
  <div class="weather-row"><span class="weather-emoji">${escapeHtml(weather.weatherEmoji)}</span><span class="weather-temp">${escapeHtml(weather.tempMax ?? "?")}℃</span><span class="weather-area">${escapeHtml(weather.areaLabel)}</span></div>
  ${popHtml}
</div>
<p class="today-source">天気出典：<a href="${escapeHtml(weather.sourceUrl)}" target="_blank" rel="noopener">気象庁</a>（${escapeHtml(weather.forecastDate)}発表予報・宝塚市は阪神地域のため代表地点「神戸」のデータを表示・降水確率は6時間ごと）</p>
</div>`;
}

// フェーズ20：サイト内検索。/search-index.json（ビルド時自動生成）を/js/search.jsが読み込み、入力中に候補表示・Enterで/searchへ遷移する
function searchBoxPanel() {
  return `<div class="search-box">
<form id="site-search-form" class="search-form" action="/search" role="search" autocomplete="off">
${icon("search")}
<input type="search" id="site-search-input" name="q" placeholder="サイト内を検索（例：ゴミ出し、防災、宝塚歌劇）" aria-label="サイト内検索">
</form>
<div id="site-search-suggestions" class="search-suggestions" hidden></div>
</div>`;
}

function contactCtaPanel() {
  return `<a class="panel contact-cta-panel" href="/contact">${icon("mail")}<span>お問い合わせ</span></a>`;
}

const QUICK_ACCESS_ITEMS = [
  { href: "/#featured-news", icon: "calendar", label: "注目ニュース" },
  { href: "/category/shigikai", icon: "building", label: "市議会" },
  { href: "/category/bohan", icon: "shield", label: "防犯" },
  { href: "/events/", icon: "calendar", label: "イベント" },
  { href: "/photo", icon: "camera", label: "フォト" },
  { href: "/livecam", icon: "videoCamera", label: "武庫川・水位情報" },
];

function quickAccessPanel() {
  const items = QUICK_ACCESS_ITEMS.map(
    (item) => `<a class="qa-tile" href="${escapeHtml(item.href)}">${icon(item.icon)}<span class="qa-lbl">${escapeHtml(item.label)}</span></a>`,
  ).join("\n");
  return `<div class="quick-access">${items}</div>`;
}

// フッターの著作権表記に使う年。ビルド時点の日本時間で判定する（build.jsのtodayDateKeyと同じ方式）。
function siteYear() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" }).slice(0, 4);
}

export function layout({ title, description, bodyHtml, canonicalUrl, ogType = "website", structuredData = null, extraScripts = [], ogImage = null, adsAllowed = true, noindex = false, extraHeadHtml = "" }) {
  const dataList = Array.isArray(structuredData) ? structuredData : structuredData ? [structuredData] : [];
  const jsonLdScript = dataList
    .map((data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`)
    .join("\n");

  // ogImageはサイト内の絶対パス（/photos/...）または完全URLを受け取り、絶対URLに正規化する
  const origin = new URL(canonicalUrl).origin;
  const ogImageUrl = ogImage ? (ogImage.startsWith("http") ? ogImage : `${origin}${ogImage}`) : null;
  const ogImageTags = ogImageUrl
    ? `<meta property="og:image" content="${escapeHtml(ogImageUrl)}">
<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}">`
    : "";

  // AdSense審査用スニペット。ad-config.jsonのenabled:true＋クライアントID設定時のみ出力（広告除外ページには出力しない）
  const adsenseHeadScript =
    AD_CONFIG.enabled && AD_CONFIG.adsenseClientId && adsAllowed
      ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${escapeHtml(AD_CONFIG.adsenseClientId)}" crossorigin="anonymous"></script>`
      : "";

  // 404ページなど検索結果に載せないページ向け。指定時のみrobotsメタを出力する
  const robotsMeta = noindex ? '<meta name="robots" content="noindex">' : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">${robotsMeta}${extraHeadHtml}
<meta name="google-site-verification" content="j8M7gv2ziexoZ_pW1ZVdNS8gzpJV4qRiq27tLKtyIpw">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="${escapeHtml(ogType)}">
<meta property="og:site_name" content="Takarazuka Today｜今日の宝塚を、3分で。">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
${ogImageTags}
<link rel="stylesheet" href="${STYLESHEET_HREF}">
<script>${themeInitScript()}</script>
${adsenseHeadScript}
</head>
<body>
${header()}
<main>
${bodyHtml}
${popularContentStrip(new URL(canonicalUrl).pathname)}
</main>
<footer class="site-footer">
<p>宝塚Todayは、宝塚市や兵庫県などの公式情報をもとに、地域のニュースや暮らしに役立つ情報を整理してお届けしています。一部の記事・ガイドでは、運営者が現地で取材・撮影しています。詳細・正式な内容は各ページの出典元をご確認ください。</p>
<p>本サイトは宝塚市の公式サイトではありません。個人が運営する地域情報サイトです。</p>
<p>写真：<a href="https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/index.html" target="_blank" rel="noopener">宝塚市オープンデータ</a>（<a href="https://creativecommons.org/licenses/by/4.0/deed.ja" target="_blank" rel="noopener">CC BY 4.0</a>）、宝塚Today撮影など。出典・撮影情報は各ページをご確認ください。</p>
<p>公式X：<a href="https://x.com/TakaTodayJP" target="_blank" rel="noopener">@TakaTodayJP</a>　公式Facebook：<a href="https://www.facebook.com/takarazukatoday" target="_blank" rel="noopener">宝塚Today</a></p>
<p class="footer-contact"><a href="/contact">${icon("mail")}お問い合わせ</a></p>
<p class="footer-links"><a href="/privacy">プライバシーポリシー</a>　<a href="/about">運営者情報</a>　<a href="/ad-policy">PR・広告掲載ポリシー</a></p>
<p class="footer-copyright">&copy; ${siteYear()} Takarazuka Today</p>
</footer>
${jsonLdScript}
<script src="/js/theme.js" defer></script>
${extraScripts.map((src) => `<script src="${escapeHtml(src)}" defer></script>`).join("\n")}
<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "5f991631faa34f22bb67b9b90d954848"}'></script><!-- End Cloudflare Web Analytics -->
</body>
</html>
`;
}

function findCategory(label) {
  return CATEGORIES.find((c) => c.label === label);
}

export function articlePage(article, siteUrl, giinList = [], articlesBySlug = new Map()) {
  const findGiinName = (slug) => giinList.find((g) => g.slug === slug)?.name;
  // description は検索結果・OGP用の短い概要。未設定の記事は従来どおり summary を使う
  const metaDescription = article.description ?? article.summary;
  const canonicalUrl = `${siteUrl}/articles/${article.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    description: metaDescription,
    url: canonicalUrl,
    author: { "@type": "Organization", name: "Takarazuka Today編集部" },
    publisher: { "@type": "Organization", name: "Takarazuka Today｜今日の宝塚を、3分で。" },
    isAccessibleForFree: true,
    ...(article.ogImage ? { image: `${siteUrl}${article.ogImage}` } : {}),
  };
  const categoryMeta = findCategory(article.category);
  // 防災・防犯カテゴリの記事（避難情報・災害情報・被害者が存在しうる事件事故等）には広告を表示しない
  const adsAllowed = adsAllowedFor({ category: article.category, pathname: `/articles/${article.slug}` });

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      ...(categoryMeta
        ? [{ "@type": "ListItem", position: 2, name: categoryMeta.label, item: `${siteUrl}${categoryPath(categoryMeta.key)}` }]
        : []),
      { "@type": "ListItem", position: categoryMeta ? 3 : 2, name: article.title, item: canonicalUrl },
    ],
  };

  const isShigikai = article.category === "市議会";
  // 市議会記事は従来どおり keyPoints があれば表示。それ以外の記事は keyPointsTitle を明示したときだけ表示する（既存記事に自動では出さない）
  const keyPointsBox =
    (isShigikai || article.keyPointsTitle) && Array.isArray(article.keyPoints) && article.keyPoints.length > 0
      ? `<div class="point-box${isShigikai ? "" : " point-box-plain"}">
<p class="point-box-title">${icon(isShigikai ? "alert" : "book")}${escapeHtml(isShigikai ? "今回のポイント（市民生活への影響）" : article.keyPointsTitle)}</p>
<ul>${article.keyPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("\n")}</ul>
</div>`
      : "";
  const aiEditorialBadge = isShigikai ? `<p class="badge-line"><span class="badge-ai-editorial">AI要約・編集確認済</span></p>` : "";
  const shigikaiDisclosure = isShigikai ? SHIGIKAI_DISCLOSURE : "";
  const giinLinkBox =
    isShigikai && Array.isArray(article.giin) && article.giin.length > 0
      ? `<div class="giin-link-box">
${icon("user")}
<div>この記事で発言した議員：${article.giin.map((slug) => `<a href="/giin/${escapeHtml(slug)}">${escapeHtml(findGiinName(slug) ?? slug)}議員の発言記録を見る →</a>`).join("、")}</div>
</div>`
      : "";

  const comparisonTablesHtml =
    Array.isArray(article.comparisonTables) && article.comparisonTables.length > 0
      ? article.comparisonTables
          .map(
            (t) => `<div class="panel" style="margin:1rem 0;">
<p class="panel-title">${escapeHtml(t.title)}</p>
<div class="table-scroll">
<table class="data-table" style="width:100%;border-collapse:collapse;font-size:0.9rem;">
<thead><tr style="background:var(--color-surface-2,#f5f5f5);">
${t.headers.map((h, i) => `<th style="padding:0.5rem;text-align:${i === 0 ? "left" : "right"};border-bottom:1px solid var(--color-border,#ddd);">${escapeHtml(h)}</th>`).join("\n")}
</tr></thead>
<tbody>
${t.rows
  .map(
    (row) =>
      `<tr>${row.map((cell, i) => `<td style="padding:0.5rem;text-align:${i === 0 ? "left" : "right"};border-bottom:1px solid var(--color-border,#ddd);">${tableCellHtml(cell)}</td>`).join("")}</tr>`
  )
  .join("\n")}
</tbody>
</table>
</div>
${t.sourceUrl ? `<p class="panel-note">出典：<a href="${escapeHtml(t.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(t.sourceLabel ?? "宝塚市公式サイト")}</a></p>` : ""}
</div>`
          )
          .join("\n")
      : "";

  // 構造化本文。sections未定義の記事（既存117件）は空文字となり、従来と同一のHTMLになる。
  // 全テキストはescapeし、生HTMLは受け付けない（ガイドのitemsのようなraw HTML方式は記事に持ち込まない）
  const sectionsHtml =
    Array.isArray(article.sections) && article.sections.length > 0
      ? "\n" +
        article.sections
          .map(
            (s) => `<section class="article-section${Array.isArray(s.questions) ? " article-section--questions" : ""}">
<h2>${escapeHtml(s.heading)}</h2>
${(s.paragraphs ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join("\n")}
${articleItemsHtml(s.items ?? [])}${Array.isArray(s.questions) ? questionListHtml(s.questions) : ""}
</section>`
          )
          .join("\n")
      : "";

  // 記事全体の追加出典。主出典(sourceUrl/sourceName)とは別枠で表示する
  const additionalSourcesHtml =
    Array.isArray(article.sources) && article.sources.length > 0
      ? `\n<p class="article-source">追加出典：${article.sources
          .map((s) => `<a href="${escapeHtml(s.url)}" rel="noopener" target="_blank">${escapeHtml(s.label)}</a>`)
          .join("、")}</p>`
      : "";

  // 関連記事。参照先のtitleはbuild時に記事データから解決する（存在確認はvalidatorが行う）
  const relatedArticlesHtml =
    Array.isArray(article.relatedArticles) && article.relatedArticles.length > 0
      ? `\n<div class="panel" style="margin:1rem 0;">
<p class="panel-title">${icon("newspaper")}関連記事</p>
<ul class="related-links">
${article.relatedArticles
  .map((slug) => {
    const label = articlesBySlug.get(slug)?.title ?? slug;
    return `<li><a href="/articles/${escapeHtml(slug)}">${escapeHtml(label)}</a></li>`;
  })
  .join("\n")}
</ul>
</div>`
      : "";

  // 関連ガイド。カードは「あなたへのおすすめ」と同じ見た目で、表示名と説明は recommendations.json から引く
  const relatedGuidesHtml =
    Array.isArray(article.relatedGuides) && article.relatedGuides.length > 0
      ? `\n<div class="panel" style="margin:1rem 0;">
<p class="panel-title">${icon("book")}関連ガイド</p>
${article.relatedGuides.map((href) => recommendationCard(findRecommendation(href))).join("\n")}
</div>`
      : "";

  // keyPointsTitle を使う記事は、図解より先に要点を見せる（タイトル → 要点 → 要約 → 図解）。市議会記事など従来の記事は図解が先のまま
  const figureHtml = explainerFigure(article.explainerImage);
  const pointsFirst = !isShigikai && Boolean(article.keyPointsTitle) && Boolean(keyPointsBox);
  const figureBeforePoints = pointsFirst ? "" : figureHtml;
  const figureAfterSummary = pointsFirst ? figureHtml : "";

  // 更新日。updatedAt未設定の記事は公開日のみ表示（従来と同一）
  const updatedAtHtml = article.updatedAt ? `（${escapeHtml(article.updatedAt)}更新）` : "";

  const bodyHtml = `<nav class="breadcrumb breadcrumb-article"><a href="/">トップ</a> &gt; ${categoryMeta ? `<a href="${categoryPath(categoryMeta.key)}">${escapeHtml(categoryMeta.label)}</a>` : escapeHtml(article.category)}</nav>
<article class="article-detail">
<p class="category-tag">${sourceBadge(article.sourceName)}${categoryMeta ? icon(categoryMeta.icon) : icon("newspaper")}${escapeHtml(article.category)}</p>
<h1>${escapeHtml(article.title)}</h1>
<p class="article-meta">${escapeHtml(article.publishedAt)}${updatedAtHtml}</p>${articleStatusBox(article)}${figureBeforePoints}
${aiEditorialBadge}
${keyPointsBox}
<p class="article-summary">${escapeHtml(article.summary)}</p>${figureAfterSummary}${sectionsHtml}
${comparisonTablesHtml}
${giinLinkBox}
${shigikaiDisclosure}
${adSlot("articleBottom", adsAllowed)}
<p class="article-source">出典：<a href="${escapeHtml(article.sourceUrl)}" rel="noopener" target="_blank">${escapeHtml(article.sourceName)}</a>${article.sourceUnavailable ? "（掲載終了）" : ""}</p>
${article.sourceUnavailable ? `<p class="empty-state" style="font-size:0.85rem;">※ 出典ページは掲載終了しています（期間限定のお知らせのため）。本文は掲載当時の公式発表内容を要約したものです。</p>` : ""}${additionalSourcesHtml}${relatedArticlesHtml}${relatedGuidesHtml}
<p class="x-follow-note">公式X：<a href="https://x.com/TakaTodayJP" target="_blank" rel="noopener">@TakaTodayJP</a><br>最新の更新情報や防災情報をお届けしています。</p>
<p class="back-link"><a href="/">${icon("newspaper")}トップへ戻る</a></p>
</article>
${adSlot("beforeRelated", adsAllowed)}
${recommendedPagesPanel(categoryMeta?.key ?? "", `/articles/${article.slug}`)}`;

  return layout({
    title: `${article.title}｜Takarazuka Today`,
    description: metaDescription,
    bodyHtml,
    canonicalUrl,
    ogType: "article",
    structuredData: [jsonLd, breadcrumbLd],
    ogImage: article.ogImage ?? null,
    adsAllowed,
    noindex: !isArticleIndexable(article),
  });
}

// 記事 sections の items。連続する文字列は1つの箇条書きにまとめ、{ photo } は箇条書きの間に写真として挟む。
// 写真のない記事は従来どおり <ul> 1つだけになる
function articleItemsHtml(items) {
  const parts = [];
  let list = [];
  const flush = () => {
    if (list.length > 0) parts.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}</ul>`);
    list = [];
  };
  for (const item of items) {
    if (typeof item === "string") {
      list.push(item);
    } else {
      flush();
      parts.push(photoFigureHtml(item.photo));
    }
  }
  flush();
  return parts.join("\n");
}

// 解説画像の直下に出す案内役の紹介。初見の読者向けに、画像のキャラクターが誰かを本文テキストで説明する
const EXPLAINER_GUIDE_HTML = `<div class="explainer-guide"><p class="explainer-guide-title">宝塚Todayの案内役<a class="explainer-guide-link" href="/takara-madoka-takara-wan">たから まどか・たからワンについて</a></p><p>「たから まどか」と柴犬の相棒「たからワン」が、難しい市政・議会情報を3〜4ポイントで分かりやすく整理します。まどかは全体像、たからワンは数字・日付・注意点を担当します。</p></div>`;

// 冒頭の「3〜4ポイント解説」画像。build.js が未配置のファイルを除くため、ここに来るのは実在する画像だけ。
// width/height を出して読み込み時のレイアウトずれを防ぐ。
// inline の max-width/height は、古い style.css がキャッシュに残っていても原寸（1200px）ではみ出さないための保険
function explainerFigure(img) {
  if (!img) return "";
  return `
<figure class="explainer-figure"><img src="${escapeHtml(img.src)}" width="${Number(img.width)}" height="${Number(img.height)}" alt="${escapeHtml(img.alt)}" decoding="async" style="display:block;max-width:100%;height:auto;">${img.caption ? `<figcaption class="explainer-caption">${escapeHtml(img.caption)}</figcaption>` : ""}</figure>${img.caption ? "" : `
${EXPLAINER_GUIDE_HTML}`}`;
}

const SOURCE_BADGES = {
  "宝塚市公式サイト": { label: "宝塚市", className: "source-city" },
  "兵庫県公式サイト": { label: "兵庫県", className: "source-pref" },
  "兵庫県警察": { label: "兵庫県警", className: "source-police" },
  "宝塚市議会会議録検索システム": { label: "市議会", className: "source-gikai" },
  "宝塚市議会インターネット中継": { label: "市議会", className: "source-gikai" },
};

function sourceBadge(sourceName) {
  const badge = SOURCE_BADGES[sourceName] ?? { label: sourceName, className: "source-other" };
  return `<span class="source-tag ${badge.className}">${escapeHtml(badge.label)}</span>`;
}

// 宝塚市オープンデータ写真（CC BY 4.0）を、関連するキーワードを含む記事のサムネイルに使う
// 出典は各写真ページにリンクし、必ず「写真提供：宝塚市オープンデータ」を表示する
const PHOTO_KEYWORDS = [
  { keyword: "手塚治虫", file: "001015682_tezukakinenkan2015.jpg", title: "手塚治虫記念館" },
  { keyword: "歌劇", file: "001015682_daigekizyo.jpg", title: "宝塚大劇場" },
  { keyword: "あいあいパーク", file: "001015682_aiaipark2011.jpg", title: "あいあいパーク" },
  { keyword: "武庫川", file: "001015682_mukogawa.jpg", title: "武庫川" },
  { keyword: "ハーフマラソン", file: "001015681_takarazukamarason2015.jpg", title: "宝塚ハーフマラソン" },
  { keyword: "花火", file: "001015579_kankouhanabi1-1.jpg", title: "宝塚観光花火大会" },
  { keyword: "文化創造館", file: "001015682_takarazukabunkasouzoukan2009.jpg", title: "宝塚文化創造館" },
  { keyword: "ダリア", file: "001015680_daria2015.jpg", title: "宝塚ダリア園" },
  { keyword: "平和の鐘", file: "001015682_heiwa.jpg", title: "末広中央公園 平和の鐘" },
  { keyword: "市役所駐車場", file: "001015578_shiyakusyob.jpg", title: "宝塚市役所" },
  { keyword: "花のみち", file: "001015578_hananomichi_1.jpg", title: "花のみち" },
];

function findPhotoForText(text) {
  return PHOTO_KEYWORDS.find((p) => text.includes(p.keyword));
}

function thumbHtml(photo, fallbackIconName) {
  return photo
    ? `<img src="/photos/${escapeHtml(photo.file)}" alt="${escapeHtml(photo.title)}" loading="lazy">`
    : icon(fallbackIconName);
}

// 一覧で「終了」「受付終了」「復旧済み」を見分けるためのタグ。status 未設定・active は空文字（従来と同一）
function statusTag(article) {
  const notice = articleStatusNotice(article);
  return notice ? `<span class="status-tag status-${notice.status}">${escapeHtml(notice.label)}</span>` : "";
}

// 記事ページ冒頭の状態表示。過去の告知が「開催します」「募集しています」のまま現行情報に見えないようにする
function articleStatusBox(article) {
  const notice = articleStatusNotice(article);
  if (!notice) return "";
  return `\n<p class="article-status article-status-${notice.status}" role="note"><span class="status-tag status-${notice.status}">${escapeHtml(notice.label)}</span>${escapeHtml(notice.message)}</p>`;
}

// reasonTag: 注目枠だけが付ける「なぜ今載っているか」（新着・更新・日付など）。一覧用の headlineRow は付けない
function headlineRowWith(article, reasonTag) {
  const categoryMeta = findCategory(article.category);
  const photo = findPhotoForText(`${article.title} ${article.summary ?? ""}`);
  const reason = reasonTag ? `<span class="reason-tag">${escapeHtml(reasonTag)}</span>` : "";
  return `<a class="headline-row" href="/articles/${article.slug}">
<div class="headline-thumb">${thumbHtml(photo, categoryMeta ? categoryMeta.icon : "newspaper")}</div>
<div>
  <p class="headline-title">${reason}${sourceBadge(article.sourceName)}<span class="topic-tag">${escapeHtml(article.category)}</span>${statusTag(article)}${escapeHtml(article.title)}</p>
  <p class="headline-meta">${escapeHtml(article.publishedAt)}・${escapeHtml(article.sourceName)}</p>
</div>
</a>`;
}

function headlineRow(article) {
  return headlineRowWith(article, "");
}

// サイト自体のお知らせ（新機能追加等）を一時的に表示する。公式ニュース記事とは別枠のため data/articles/ は使わず、期限（until）を過ぎたら自動的に非表示にする
function siteNoticeRow(notice) {
  return `<a class="headline-row" href="${escapeHtml(notice.href)}">
<div class="headline-thumb">${icon("bell")}</div>
<div>
  <p class="headline-title"><span class="topic-tag">お知らせ</span>${escapeHtml(notice.text)}</p>
  <p class="headline-meta">Takarazuka Today</p>
</div>
</a>`;
}

// 「注目・新着ニュース」1枠。選定は lib/home-news.js（新着・明示された近い日付）。
// 候補が無い日は古い記事で埋めず、その旨を言う。サイトのお知らせはニュースと区別して下に小さく出す。
// 表示は「ビルド時点」の日付で決まる静的な結果なので、基準日を明示する（再ビルドされるまで古い日付のまま残ることが読者に分かるように）。
function featuredNewsPanel(featuredNews, activeNotices, todayKey) {
  const items = featuredNews.map(({ article, reason }) => headlineRowWith(article, reasonLabel(reason))).join("\n");
  const body = items || `<p class="empty-state">この1週間に、新しい注目記事はありません。</p>
<p class="panel-note"><a href="#recent-articles">→ 新着記事を見る</a></p>`;
  const notices = activeNotices.length > 0 ? `<div class="site-notices"><p class="site-notices-title">サイトからのお知らせ</p>${activeNotices.map(siteNoticeRow).join("\n")}</div>` : "";
  return `<div class="panel" id="featured-news">
<span id="today-topic"></span>
<p class="panel-title">${icon("newspaper")}注目・新着ニュース</p>
<p class="panel-note featured-asof">${escapeHtml(monthDayLabel(todayKey))}時点の情報です</p>
${body}
${notices}
</div>`;
}

// 旧「今日の宝塚フォト」の枠。宝塚Todayが現地で撮影した写真を、撮影日・場所と現地取材ガイドへのリンクつきで出す
function fieldReportPanel(fieldReportPhoto) {
  if (!fieldReportPhoto) return "";
  const p = fieldReportPhoto;
  return `<div class="panel" id="photo" style="padding:0; overflow:hidden;">
<a class="photo-hero" href="${escapeHtml(p.href)}">
<img src="${escapeHtml(p.src)}" alt="${escapeHtml(p.alt)}">
<span class="photo-hero-caption">
  <span class="season-tag">現地取材</span>
  <span class="photo-hero-title">${escapeHtml(p.place)}</span>
  <span class="photo-hero-credit">宝塚Today撮影｜${escapeHtml(p.shotOn)}</span>
</span>
</a>
<p class="photo-more"><a href="/photo">現地取材フォトをもっと見る →</a></p>
</div>`;
}

// 上段の左枠（以前は「今日の宝塚トピック」があった場所）に「宝塚の実力」の予告バナーを置く。
// 「今日の宝塚トピック」と「トップニュース」は「注目・新着ニュース」1枠に統合した（featuredNewsPanel / lib/home-news.js）
function todayRow(fieldReportPhoto, categoryPageKeys) {
  return `<div class="today-row">
${jitsuryokuBannerPanel()}
<div class="today-row-side">
${fieldReportPanel(fieldReportPhoto)}
${categoryPanel(categoryPageKeys)}
</div>
</div>`;
}

function categoryPanel(categoryPageKeys) {
  const realChips = CATEGORIES.map((cat) => {
    const hasPage = categoryPageKeys.has(cat.key);
    const inner = `${icon(cat.icon)}<span>${escapeHtml(cat.label)}</span>`;
    return hasPage
      ? `<a class="category-pill" href="${categoryPath(cat.key)}">${inner}</a>`
      : `<span class="category-pill is-empty">${inner}</span>`;
  });

  return `<div class="panel" id="category-panel">
<p class="panel-title">${icon("building")}カテゴリーから探す</p>
<div class="category-list">${realChips.join("\n")}</div>
</div>`;
}

// ranking.jsonは取得時点のデータなので、公開終了した記事のURLが残っていることがある。
// 記事URLだけを現在の公開記事と突き合わせ、該当しないものは描画しない（404へのリンクを防ぐ）。
// /livecam・カテゴリー・ガイド等の記事以外のURLは判定対象外としてそのまま残す（誤除外を避けるため）。
function visibleRankingEntries(ranking, publishedArticles) {
  const publishedSlugs = new Set(publishedArticles.map((a) => a.slug));
  return ranking.top.filter((entry) => {
    const matched = /^\/articles\/([^/?#]+)/.exec(entry.path ?? "");
    if (!matched) return true;
    return publishedSlugs.has(matched[1].replace(/\.html$/, ""));
  });
}

function rankingOrRecentPanel(ranking, recentArticles, limit = 5, showMoreLink = true) {
  if (ranking) {
    const items = visibleRankingEntries(ranking, recentArticles)
      .slice(0, limit)
      .map(
        (entry, i) => `<li class="ranking-item">
<span class="rank-num">${i + 1}</span>
<a class="rank-title" href="${escapeHtml(entry.path)}">${escapeHtml(entry.title)}</a>
</li>`,
      )
      .join("\n");
    return `<div class="panel">
<p class="panel-title">${icon("flame")}人気記事ランキング（30日間）</p>
<ol class="ranking-list">${items}</ol>
${showMoreLink ? '<p class="panel-note"><a href="/ranking/">ランキングをもっと見る →</a></p>' : ""}
</div>`;
  }

  const items = recentArticles
    .slice(0, limit)
    .map(
      (a, i) => `<li class="ranking-item">
<span class="rank-num">${i + 1}</span>
<a class="rank-title" href="/articles/${a.slug}">${escapeHtml(a.title)}</a>
</li>`,
    )
    .join("\n");
  return `<div class="panel">
<p class="panel-title">${icon("bell")}新着記事</p>
<ol class="ranking-list">${items || '<li class="empty-state">まだ記事がありません</li>'}</ol>
<p class="panel-note">※最新のアクセスランキングを表示できないため、新着記事を表示しています</p>
${showMoreLink ? '<p class="panel-note"><a href="/ranking/">新着記事をもっと見る →</a></p>' : ""}
</div>`;
}

function recentCombinedFeed(publishedArticles, categoryPageKeys) {
  const items = publishedArticles.slice(0, 10).map(headlineRow).join("\n");
  const browseLink = categoryPageKeys.size > 0 ? `<p class="panel-note"><a href="#category-panel">→ もっと見る（カテゴリー別に探す）</a></p>` : "";
  return `<div class="panel" id="recent-articles">
<p class="panel-title">${icon("bell")}新着記事</p>
${items || '<p class="empty-state">まだ記事がありません</p>'}
${browseLink}
</div>`;
}

const GUIDE_NAV_ITEMS = [
  { href: "/category/kurashi/gomi-guide", icon: "building", label: "ゴミ出し" },
  { href: "/category/kosodate/guide", icon: "child", label: "子育て支援" },
  { href: "/category/bosai/guide", icon: "alert", label: "防災" },
  { href: "/category/kyoiku/guide", icon: "book", label: "学校情報" },
];

function guideNavPanel() {
  const items = GUIDE_NAV_ITEMS.map(
    (g) => `<a class="guide-nav-tile" href="${g.href}">${icon(g.icon)}<span>${escapeHtml(g.label)}</span></a>`,
  ).join("\n");
  return `<div class="panel guide-nav-panel">
<p class="panel-title">${icon("newspaper")}くらしガイド</p>
<div class="guide-nav">${items}</div>
<p class="panel-note"><a href="/area/">まちカルテ — 町丁目ごとの生活情報 →</a></p>
</div>`;
}

// 編集部のやさしい解説。今回だけの特集を「最新ニュース」に見せないため、日付やNEWは付けず、固定の入口として置く。
// 解説記事は公開済みで図解を持つときだけ出し、サムネイルは記事の explainerImage から引く
const EDITOR_EXPLAINER_SLUG = "php-vulnerability-takarazuka-sites-2026";
const EDITOR_EXPLAINER_TEXT = {
  title: "宝塚市のサイト停止とPHPの弱点を図解",
  sub: "停止と情報漏えいの違い、宝塚TodayがPHP更新不要だった理由",
};

// 文字なしのサムネイル（記事の図解と同じ配色）。図解の一部を切り出さず、小さくても何の話か分かる専用画像を使う
const EDITOR_EXPLAINER_THUMB = { src: "/photos/php-vulnerability-thumb.webp", width: 288, height: 216, alt: "ブラウザ画面と、チェックマーク入りの盾のイラスト" };

function editorExplainerCards(article) {
  if (!article?.explainerImage) return "";
  return `<a class="editor-explainer-card" href="/articles/${escapeHtml(article.slug)}">
<div class="editor-explainer-thumb"><img src="${escapeHtml(EDITOR_EXPLAINER_THUMB.src)}" width="${EDITOR_EXPLAINER_THUMB.width}" height="${EDITOR_EXPLAINER_THUMB.height}" alt="${escapeHtml(EDITOR_EXPLAINER_THUMB.alt)}" loading="lazy" decoding="async"></div>
<div class="editor-explainer-text"><span class="editor-explainer-tag">解説</span><p class="editor-explainer-title">${escapeHtml(EDITOR_EXPLAINER_TEXT.title)}</p><p class="editor-explainer-sub">${escapeHtml(EDITOR_EXPLAINER_TEXT.sub)}</p></div>
</a>`;
}

function editorExplainerPanel(article) {
  const articleCard = editorExplainerCards(article);
  if (!articleCard) return "";
  return `<div class="panel editor-explainer-panel">
<p class="panel-title">${icon("book")}編集部のやさしい解説</p>
<div class="editor-explainer-grid">
${articleCard}
<a class="editor-explainer-card" href="/category/bohan/guide">
<div class="editor-explainer-thumb editor-explainer-thumb-icon">${icon("shield")}</div>
<div class="editor-explainer-text"><span class="editor-explainer-tag">ガイド</span><p class="editor-explainer-title">宝塚市 防犯ガイド</p><p class="editor-explainer-sub">詐欺・事件への対処と、相談窓口の使い分け</p></div>
</a>
</div>
</div>`;
}

function shigikaiCornerPanel({ hasGianPage, gikaiArticles, gikaiNotices = [] }) {
  if (!hasGianPage && gikaiArticles.length === 0 && gikaiNotices.length === 0) return "";

  const announcement = hasGianPage
    ? `<div class="corner-announce">${icon("bell")}<span><strong>NEW</strong>議案の採決結果・議員別の表決結果がわかる「議案採決一覧」を公開しました</span></div>`
    : "";
  const cta = hasGianPage
    ? `<a class="gian-cta-card" href="/category/shigikai/gian">
<div class="gian-cta-icon">${icon("newspaper")}</div>
<div class="gian-cta-text">
<div class="gian-cta-title">議案採決一覧を見る</div>
<div class="gian-cta-sub">議案の可決・否決と、議員別の表決結果をまとめて確認できます</div>
</div>
<div class="gian-cta-arrow">→</div>
</a>`
    : "";
  const items = gikaiArticles.slice(0, 3).map(gikaiRow).join("\n");
  const notices = gikaiNotices.map((n) => `<p class="panel-note gikai-notice"><a href="${escapeHtml(n.href)}">${escapeHtml(n.text)}</a></p>`).join("\n");

  return `<div class="panel shigikai-corner">
<p class="panel-title">${icon("building")}市議会情報</p>
${announcement}
${cta}
${items}
${notices}
<p class="panel-note"><a href="/category/shigikai">→ 市議会ウォッチ一覧へ</a></p>
</div>`;
}

export function indexPage({ featuredNews, todayKey, categoryPageKeys, publishedArticles, ranking, weather, todayCounts, fieldReportPhoto, dateLabel, siteUrl, hasGianPage = false, activeNotices = [], gikaiNotices = [] }) {
  // 同じ記事を「注目・新着ニュース」「市議会情報」「新着記事」で重ねて出さない。上の枠から順に表示済みを除く
  // （注目枠は選定側で決まるので、重複を避けるために古い記事が繰り上がることはない。市議会情報は次の新しい市議会記事が出る）
  const explainerPanel = editorExplainerPanel(publishedArticles.find((a) => a.slug === EDITOR_EXPLAINER_SLUG));
  const shown = new Set(featuredNews.map(({ article }) => article.slug));
  // 解説コーナーに出す記事は、新着記事では重ねて出さない
  if (explainerPanel) shown.add(EDITOR_EXPLAINER_SLUG);
  const notShown = (a) => !shown.has(a.slug);
  // 最新の市議会記事3件のうち、注目枠に出したものだけを除く。足りない分を古い市議会記事で補わない（不自然な繰り上げをしない）
  const gikaiArticles = publishedArticles.filter((a) => a.category === "市議会").slice(0, 3).filter(notShown);
  gikaiArticles.forEach((a) => shown.add(a.slug));
  // 新着記事は検索対象（noindexでない）の記事だけ。noindexの記事も記事ページ自体は公開のまま
  const recentArticles = publishedArticles.filter((a) => notShown(a) && isArticleIndexable(a));

  const bodyHtml = `${dateBar(dateLabel)}
${searchBoxPanel()}
${quickAccessPanel()}
<div class="weather-standalone-row">${weatherPanel(weather)}${contactCtaPanel()}</div>
${todayRow(fieldReportPhoto, categoryPageKeys)}
<div class="grid-2">
  <div class="col-main">
    ${featuredNewsPanel(featuredNews, activeNotices, todayKey)}
    ${shigikaiCornerPanel({ hasGianPage, gikaiArticles, gikaiNotices })}
    ${explainerPanel}
    ${guideNavPanel()}
    ${recentCombinedFeed(recentArticles, categoryPageKeys)}
  </div>
  <div class="col-side">
    ${ranking ? rankingOrRecentPanel(ranking, publishedArticles) : ""}
    ${livecamPanel()}
    ${guideCharactersPanel()}
    ${entertainmentPanel()}
  </div>
</div>`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Takarazuka Today｜今日の宝塚を、3分で。",
    url: `${siteUrl}/`,
    description: "宝塚市の暮らし・子育て・教育・防災・防犯・市議会・イベントの情報を、市や県の公式発表をもとに整理してお届けする地域情報サイトです。暮らしのガイドや比較・一覧もまとめています。",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return layout({
    title: "Takarazuka Today｜今日の宝塚を、3分で。",
    description: "宝塚市の暮らし・子育て・教育・防災・防犯・市議会・イベントの情報を、市や県の公式発表をもとに整理してお届けする地域情報サイトです。暮らしのガイドや比較・一覧もまとめています。",
    bodyHtml,
    canonicalUrl: `${siteUrl}/`,
    structuredData,
    extraScripts: ["/js/search.js"],
    ogImage: "/img/header-banner.png",
  });
}

// 新企画「宝塚の実力」の予告バナー（トップページ）と企画紹介ページ。
// 比較結果・未監査の数字はここに書かない。公開日も約束しない（調査段階であることだけを示す）
export const JITSURYOKU_SLUG = "jitsuryoku";
export const JITSURYOKU_TITLE = "「宝塚の実力」企画紹介・第1弾公開";
export const JITSURYOKU_DESCRIPTION =
  "宝塚Todayの新企画「宝塚の実力」の紹介ページです。人口・産業・税収・暮らしを、伊丹・厚木・茅ヶ崎・流山・松本の5市と公的な統計で比べる調査の目的と、出典と調査年を重視する調査のルールを説明します。第1弾を公開しています。";

// 画像は写真・グラフィック部分だけ（文字なし）で、イメージ。見出し・コピー・「調査中」はPC・スマホともHTMLの文字で出す。
// 画像内に文言を埋め込まない（公開日の約束や、結論を先取りする文言を画像に残さないため）
function jitsuryokuBannerPanel() {
  return `<section class="jitsuryoku-banner" aria-label="新企画の予告">
<a class="jitsuryoku-banner__link" href="/${JITSURYOKU_SLUG}/zeishu-shigoto">
<span class="jitsuryoku-banner__head"><span class="jitsuryoku-banner__label">第1弾公開</span><span class="jitsuryoku-banner__title">宝塚の<em>実力</em></span></span>
<span class="jitsuryoku-banner__body"><span class="jitsuryoku-banner__copy">宝塚を、知っているつもりだった。</span><span class="jitsuryoku-banner__sub">同じくらいの規模の街と<wbr>比べたら、<wbr>何が見える？</span><span class="jitsuryoku-banner__pill">人口・税収・産業・暮らし。<wbr><strong>5都市</strong>と比較する独自調査。</span><span class="jitsuryoku-banner__more">第1弾を読む →</span></span>
<span class="jitsuryoku-banner__visual"><img src="/img/jitsuryoku-visual.webp" alt="" width="962" height="724" loading="lazy" decoding="async"><span class="jitsuryoku-banner__imgnote">※AI生成イメージ（実際の景観とは異なります）</span></span>
</a>
</section>`;
}

export function jitsuryokuPage(siteUrl, seriesListHtml = "") {
  const contentHtml = `
<p class="updated-at">最終更新日：2026年10月30日</p>
<p class="jitsuryoku-lead">宝塚を、知っているつもりだった。</p>
<p>毎日の暮らしの中で、宝塚市のことは分かっているつもりでも、データで見ると意外な姿が見えてくることがあります。この企画は、宝塚市を、規模や性格が近い他の都市と、公的な統計で並べて見直す調査です。</p>
<div class="rule-card"><strong>第1弾を公開しました。</strong><a href="/jitsuryoku/zeishu-shigoto">宝塚の税収と仕事、ほかの街とどう違う？</a>（市税・昼間の人口・市内の仕事・小売業）。今後も、ほかのテーマの調査を続けます。公開日は決まっていません。</div>

${staticSectionHeading("企画の目的")}
<ul>
<li>宝塚市の特徴を、感覚だけでなくデータで知る手がかりをつくります。</li>
<li>他の都市との違いを、「どちらが優れているか」ではなく「どう違うか」として整理します。</li>
<li>数字の出どころ・調査年・定義を明記し、読む人が自分で確かめられるようにします。</li>
</ul>

${staticSectionHeading("比較する5都市")}
<p>宝塚市と並べて調べる都市は、次の5市です。都市の性格が偏らないように選びました。順位を付けるための選び方ではありません。</p>
<ul class="jitsuryoku-cities">
<li><strong>伊丹市（兵庫県）</strong>宝塚市と隣り合う阪神間の都市です。人口は20万人をわずかに下回りますが、隣接する都市として加えました。</li>
<li><strong>厚木市（神奈川県）</strong>人口と面積が宝塚市に近く、工業や商業の集積がある都市です。</li>
<li><strong>茅ヶ崎市（神奈川県）</strong>住宅地と観光の性格を併せ持つ、湘南の都市です。</li>
<li><strong>流山市（千葉県）</strong>東京近郊で、近年人口が増えている住宅都市です。</li>
<li><strong>松本市（長野県）</strong>地方の中核都市です。面積が宝塚市よりずっと大きく、条件が大きく違うことを前提に比べます。</li>
</ul>

${staticSectionHeading("調べる4つのテーマ")}
<ul>
<li><strong>人口</strong>：人口の増減など。主に国勢調査を使います。</li>
<li><strong>産業</strong>：市内の事業所や働く人の数、業種の構成など。主に経済センサスを使います。</li>
<li><strong>税収</strong>：市税の内訳や、財政の基本的な指標など。総務省の市町村決算カードや、各市の決算資料を使います。</li>
<li><strong>暮らし</strong>：人の動きや通勤・通学、子育て・教育に関わる基礎的な統計など。国勢調査や各市の公式資料を使います。</li>
</ul>

${staticSectionHeading("調査のルール")}
<ul>
<li>数字には、出典・調査年・基準日・単位・集計の範囲を添えて載せます。</li>
<li>年や定義が違う数字は、同じ表で直接比べません。</li>
<li>「事実」（確認できた数字）、「考察」（事実から考えられること）、「仮説」（まだ確かめていないこと）を分けて書きます。</li>
<li>企業の売上は、市の税収ではありません。有名な企業や施設があることだけで、経済効果があるとは言いません。</li>
<li>数字だけで、街の良し悪しや行政の優劣は決めません。順位を付ける企画ではありません。</li>
<li>確認できなかった数字は、推測で補わず、分からないこととして書きます。</li>
</ul>

${seriesListHtml}${staticSectionHeading("関連するページ")}
<ul>
<li><a href="/category/shigikai/zaisei-watch">宝塚市財政ウォッチ</a>：宝塚市の財政状況と決算を、公式資料をもとに整理しています。</li>
<li><a href="/about">運営者情報</a>：本サイトの編集方針や情報源を説明しています。</li>
</ul>
`;

  return staticInfoPage({
    slug: JITSURYOKU_SLUG,
    breadcrumbLabel: "「宝塚の実力」",
    title: JITSURYOKU_TITLE,
    description: JITSURYOKU_DESCRIPTION,
    panelTitle: "「宝塚の実力」企画紹介",
    panelIcon: "newspaper",
    contentHtml,
    siteUrl,
  });
}

// 一般質問一覧（sections[].questions）。全議員を同じ3段（時刻＋議員名／件名／主な質問）で並べる。
// 件名が複数ある場合だけ丸数字を付けて1件ずつ改行する
const CIRCLED_NUMBERS = "①②③④⑤⑥⑦⑧⑨⑩";
function questionTimeLabel(time) {
  const m = /^(\d{1,2})時(\d{2})分$/.exec(time);
  return m ? `${m[1]}:${m[2]}` : time;
}
function questionListHtml(questions) {
  const entries = questions.map((q) => {
    const titles =
      q.titles.length > 1
        ? q.titles.map((t, i) => `<span class="question-title">${CIRCLED_NUMBERS[i] ?? ""} ${escapeHtml(t)}</span>`).join("")
        : escapeHtml(q.titles[0]);
    return `<div class="question-entry">
<p class="question-head"><span class="question-time">${escapeHtml(questionTimeLabel(q.time))}</span><span class="question-member">${escapeHtml(q.member)}議員</span></p>
<p class="question-titles"><span class="question-label">件名：</span>${titles}</p>
<p class="question-summary"><span class="question-label">主な質問：</span>${escapeHtml(q.summary)}</p>
</div>`;
  });
  return `\n<div class="question-list">\n${entries.join("\n")}\n</div>`;
}

function gikaiRow(article) {
  const photo = findPhotoForText(`${article.title} ${article.summary ?? ""}`);
  return `<a class="headline-row" href="/articles/${article.slug}">
<div class="headline-thumb">${thumbHtml(photo, "building")}</div>
<div>
  <p class="headline-title"><span class="badge-ai-editorial">AI要約・編集確認済</span>${escapeHtml(article.title)}</p>
  <p class="headline-meta">${escapeHtml(article.meetingType ?? "")}・${escapeHtml(article.meetingDate ?? article.publishedAt)}・出典：${escapeHtml(article.sourceName)}</p>
</div>
</a>`;
}

function guideCard(guide) {
  const iconBoxContent = guide.cardPhoto
    ? `<img src="${escapeHtml(guide.cardPhoto)}" alt="" loading="lazy">`
    : icon(guide.icon ?? guide.category.icon);
  return `<a class="guide-card" href="/category/${guide.categoryKey}/${escapeHtml(guide.slug)}">
<div class="icon-box${guide.cardPhoto ? " icon-box-photo" : ""}">${iconBoxContent}</div>
<div>
  <div class="label">${escapeHtml(guide.title)}</div>
  <div class="sub">${escapeHtml(guide.cardSummary)}</div>
</div>
</a>`;
}

// フェーズ17：おすすめページ・人気コンテンツ導線。既存の.guide-cardデザインを流用する
// 記事の relatedGuides から recommendations.json の項目を引く。未登録のリンクはビルドを止めて気づけるようにする
function findRecommendation(href) {
  const all = [...RECOMMENDATIONS.default, ...Object.values(RECOMMENDATIONS.categories).flat()];
  const item = all.find((r) => r.href === href);
  if (!item) throw new Error(`relatedGuides のリンク先が data/recommendations.json に登録されていません: ${href}`);
  return item;
}

function recommendationCard(item) {
  return `<a class="guide-card" href="${escapeHtml(item.href)}">
<div class="icon-box">${icon(item.icon)}</div>
<div>
  <div class="label">${escapeHtml(item.label)}</div>
  <div class="sub">${escapeHtml(item.sub)}</div>
</div>
</a>`;
}

// 資産ページ下部の「あなたへのおすすめ」：カテゴリごとに最適な候補を表示（関連リンクとは別枠）
function recommendedPagesPanel(categoryKey, currentPath) {
  const list = (RECOMMENDATIONS.categories[categoryKey] ?? RECOMMENDATIONS.default)
    .filter((item) => item.href !== currentPath)
    .slice(0, 4);
  if (list.length === 0) return "";
  return `<div class="panel">
<p class="panel-title">${icon("newspaper")}あなたへのおすすめ</p>
${list.map(recommendationCard).join("\n")}
</div>`;
}

// 全ページ共通の「人気コンテンツ」導線（layout()から自動挿入。個別ページ側での対応は不要）
function popularContentStrip(currentPath) {
  const list = RECOMMENDATIONS.default.filter((item) => item.href !== currentPath).slice(0, 5);
  if (list.length === 0) return "";
  return `<div class="page-content">
<div class="panel">
<p class="panel-title">${icon("flame")}人気コンテンツ</p>
${list.map(recommendationCard).join("\n")}
</div>
</div>`;
}

export function categoryPage(category, articles, siteUrl, guidesForCategory = [], hasGianPage = false, hasZaiseiPage = false, hasSuisougakuPage = false) {
  const canonicalUrl = `${siteUrl}${categoryPath(category.key)}`;
  const isShigikai = category.key === "shigikai";
  const items = articles.map(isShigikai ? gikaiRow : headlineRow).join("\n");
  const giinLink = isShigikai
    ? `<p class="panel-note"><a href="/giin/">議員活動サマリー一覧を見る →</a>　<a href="/category/shigikai/guide">市議会のしくみ・このページの見方 →</a></p>`
    : "";
  const gianCta = hasGianPage
    ? `<a class="gian-cta-card" href="/category/shigikai/gian">
<div class="gian-cta-icon">${icon("newspaper")}</div>
<div class="gian-cta-text">
<div class="gian-cta-title">議案採決一覧を見る</div>
<div class="gian-cta-sub">議案の可決・否決と、議員別の表決結果をまとめて確認できます</div>
</div>
<div class="gian-cta-arrow">→</div>
</a>`
    : "";
  const zaiseiCta = hasZaiseiPage
    ? `<a class="gian-cta-card" href="/category/shigikai/zaisei-watch">
<div class="gian-cta-icon">${icon("building")}</div>
<div class="gian-cta-text">
<div class="gian-cta-title">財政ウォッチを見る</div>
<div class="gian-cta-sub">市が年2回公表する財政状況を、予算・市債・基金などの主要指標でまとめて確認できます</div>
</div>
<div class="gian-cta-arrow">→</div>
</a>`
    : "";
  const suisougakuCta = hasSuisougakuPage
    ? `<a class="gian-cta-card" href="/category/kyoiku/suisougaku-guide">
<div class="gian-cta-icon">${icon("book")}</div>
<div class="gian-cta-text">
<div class="gian-cta-title">吹奏楽コンクールガイドを見る</div>
<div class="gian-cta-sub">西阪神吹奏楽コンクールの日程・会場・宝塚市内出場校をまとめて確認できます</div>
</div>
<div class="gian-cta-arrow">→</div>
</a>`
    : "";
  const guideCards = guidesForCategory.map(guideCard).join("\n");
  // 防犯カテゴリだけ、記事一覧の前に「知りたいこと別の入口」を出す（ガイドカードと一覧の構成は従来どおり）
  const explainerEntry = category.key === "bohan" ? editorExplainerCards(articles.find((a) => a.slug === EDITOR_EXPLAINER_SLUG)) : "";
  const entryCards =
    guideCards && explainerEntry
      ? `<h2 class="entry-label">事件・詐欺への対処と相談先</h2>
${guideCards}
<h2 class="entry-label">セキュリティの仕組みを知る</h2>
${explainerEntry}`
      : guideCards
        ? `<h2 class="entry-label">${escapeHtml(category.label)}のガイド</h2>
${guideCards}`
        : "";
  // ガイドカードが続くカテゴリでは、記事一覧へ移動できる短いリンクを見出しの下に置く（案内カード2枚だけの市議会は直下に一覧があるので出さない）
  const hasEntries = Boolean(entryCards);
  const jumpLink = hasEntries && items ? `<p class="category-jump"><a href="#category-articles">記事一覧へ移動（${articles.length}件）↓</a></p>` : "";

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; ${escapeHtml(category.label)}</nav>
<div class="page-content">
<h1 class="category-title">${icon(category.icon)}${escapeHtml(category.label)}${isShigikai ? "ウォッチ" : ""}</h1>
${jumpLink}
${entryCards}
${gianCta}
${zaiseiCta}
${suisougakuCta}
<div class="panel">
<h2 class="panel-title" id="category-articles">${icon(category.icon)}${escapeHtml(category.label)}${isShigikai ? "ウォッチ" : "の記事一覧"}</h2>
${isShigikai ? SHIGIKAI_DISCLOSURE : ""}
${items || '<p class="empty-state">まだ記事がありません</p>'}
${giinLink}
</div>
</div>`;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.label}の記事一覧｜Takarazuka Today`,
    url: canonicalUrl,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: category.label, item: canonicalUrl },
    ],
  };

  return layout({
    title: `${category.label}の記事一覧｜Takarazuka Today`,
    description: `宝塚市の「${category.label}」に関する記事一覧です。`,
    bodyHtml,
    canonicalUrl,
    structuredData: [collectionLd, breadcrumbLd],
    adsAllowed: adsAllowedFor({ category: category.label, pathname: categoryPath(category.key) }),
  });
}

// 実在する公式ソースのみを掲載。武庫川武田尾は宝塚市内（玉瀬）に設置された国土交通省の観測点であることを確認済み
// 兵庫県カメラは https://hyogo.kasenkanshi.info/ （旧 hyogo.rivercam.info から移転済み）
const LIVE_CAMERAS = [
  {
    name: "武庫川武田尾（国土交通省 川の防災情報）",
    description: "宝塚市玉瀬・武庫川武田尾地点の河川監視カメラ（国土交通省）",
    url: "https://www.river.go.jp/kawabou/pc/tm?zm=14&clat=34.803796253690784&clon=135.30083656311038&fld=0&mapType=0&viewGrpStg=0&viewRd=1&viewRW=1&viewRiver=1&viewPoint=1&ext=0&itmkndCd=100&scamId=222057042&ownCd=22057&sysCamId=22057042",
    area: "宝塚市玉瀬",
  },
  {
    name: "阪神北地区（武田尾・大堀川・波豆川）（兵庫県河川監視カメラ）",
    description: "宝塚市内の武田尾・大堀川・波豆川地点のカメラ映像（兵庫県）",
    url: "https://hyogo.kasenkanshi.info/text_cameras/river/hanshinkita",
    area: "宝塚市内3地点",
  },
  {
    name: "武庫川生瀬局（兵庫県河川監視カメラ）",
    description: "西宮市塩瀬町生瀬（宝塚市隣接）・武庫川の監視カメラ（約5分更新）",
    url: "https://hyogo.kasenkanshi.info/text_cameras/river/hanshinminami",
    area: "西宮市塩瀬町生瀬（宝塚市隣接）",
  },
];

function livecamPanel() {
  const items = LIVE_CAMERAS.map(
    (cam) => `<a class="headline-row" href="${escapeHtml(cam.url)}" target="_blank" rel="noopener">
<div class="headline-thumb">${thumbHtml({ file: "001015680_takedaomomizi2013.jpg", title: "武田尾（武庫川）" }, "videoCamera")}</div>
<div>
  <p class="headline-title">${escapeHtml(cam.name)}</p>
  <p class="headline-meta">${escapeHtml(cam.description)}</p>
</div>
</a>`,
  ).join("\n");

  return `<div class="panel">
<p class="panel-title">${icon("videoCamera")}宝塚市内のライブカメラ</p>
${items}
<p class="panel-note"><a href="/livecam">ライブカメラ一覧・水位基準を見る →</a></p>
</div>`;
}

// TOPの常設カード：案内役（たから まどか・たからワン）の紹介ページへの小さな導線。
// 主要コンテンツを見た後に出るよう、サイドバーのライブカメラの後に置く。
// 画像は正式原画を縮小しただけの軽量版（-thumb）を使う。名前は「たからワン」の途中で改行しないよう単位ごとにまとめる
function guideCharactersPanel() {
  return `<div class="panel guide-chara-panel">
<p class="panel-title">${icon("user")}宝塚Todayの案内役</p>
<div class="guide-chara-row">
<div class="guide-chara-imgs"><img src="/characters/takara-madoka-thumb.webp" width="144" height="180" alt="案内役のたから まどか" loading="lazy" decoding="async"><img src="/characters/takara-wan-thumb.webp" width="144" height="180" alt="柴犬のたからワン" loading="lazy" decoding="async"></div>
<div>
<p class="guide-chara-name"><span class="nowrap">たから まどか ＆</span> <span class="nowrap">柴犬のたからワン</span></p>
<p class="guide-chara-desc">市政・議会などの少し難しい情報を、3〜4ポイントで分かりやすく案内します。</p>
</div>
</div>
<p class="panel-note"><a href="/${GUIDE_CHARACTERS_SLUG}">2人について詳しく見る →</a></p>
</div>`;
}

// フェーズ18〜22：宝塚おでかけガイドシリーズへの導線。既存.guide-cardデザインを流用し、シリーズ追加ごとにカードを増やす（順序は検索需要を考慮）
const ODEKAKE_GUIDE_CARDS = [
  { href: "/category/kanko/takarazuka-kageki-guide", photo: "/photos/001015682_takarazukadaigekizyou.jpg", label: "宝塚歌劇ガイド", sub: "宝塚大劇場のアクセス・チケット購入・館内施設" },
  { href: "/category/kanko/hanshin-keibajo-guide", photo: "/photos/hanshin-keibajo.jpg", label: "阪神競馬場ガイド", sub: "アクセス・駐車場・ファミリー向け情報" },
  { href: "/category/kanko/takarazuka-kita-sa-guide", photo: "/photos/takarazuka-kita-sa.jpg", label: "宝塚北サービスエリアガイド", sub: "西日本最大級SA。一般道からの利用方法も" },
  { href: "/category/kanko/haisen-hiking-guide", photo: "/photos/001015680_takedaomomizi2013.jpg", label: "武田尾廃線ハイキングガイド", sub: "トンネルと鉄橋を歩く人気コース" },
  { href: "/category/kanko/tezuka-museum-guide", photo: "/photos/001015682_tezukakinenkan2015.jpg", label: "手塚治虫記念館ガイド", sub: "アクセス・入館案内・館内のみどころ" },
  { href: "/category/kanko/nakayamadera-guide", photo: "/photos/nakayamadera-gate-20261003-1200x630.webp", label: "中山寺ガイド", sub: "安産祈願・戌の日・アクセス" },
  { href: "/category/kanko/kiyoshikojin-guide", photo: "/photos/kiyoshikojin-gate-20261003-1200x630.webp", label: "清荒神清澄寺ガイド", sub: "境内案内・参道商店街・アクセス" },
  { href: "/category/kanko/takedao-onsen-guide", photo: "/photos/001015680_takedao2b.jpg", label: "武田尾温泉ガイド", sub: "武庫川渓谷の秘湯。日帰り入浴・足湯" },
  { href: "/category/kanko/takarazuka-onsen-guide", photo: "/photos/001015682_mukogawa.jpg", label: "宝塚温泉ガイド", sub: "宝塚駅近くの歴史ある街なか温泉" },
  { href: "/category/kanko/aiaipark-guide", photo: "/photos/001015682_aiaipark2011.jpg", label: "あいあいパークガイド", sub: "植木のまち山本の園芸拠点。入場無料" },
  { href: "/category/kanko/dahlia-en-guide", photo: "/photos/dahlia-field-orange-20261017-1200x630.webp", label: "宝塚ダリア園ガイド", sub: "約300種10万本のダリア。花摘み体験も" },
];

function entertainmentPanel() {
  const cards = ODEKAKE_GUIDE_CARDS.map(
    (c) => `<a class="guide-card" href="${escapeHtml(c.href)}">
<div class="icon-box icon-box-photo"><img src="${escapeHtml(c.photo)}" alt="" loading="lazy"></div>
<div>
  <div class="label">${escapeHtml(c.label)}</div>
  <div class="sub">${escapeHtml(c.sub)}</div>
</div>
</a>`,
  ).join("\n");
  return `<div class="panel">
<p class="panel-title">${icon("ticket")}宝塚おでかけガイド</p>
${cards}
<p class="panel-note"><a href="/category/kanko">→ 文化・観光の記事一覧を見る</a></p>
</div>`;
}

export function livecamPage(siteUrl) {
  const canonicalUrl = `${siteUrl}/livecam`;

  const cameraItems = LIVE_CAMERAS.map(
    (cam) => `<a class="headline-row" href="${escapeHtml(cam.url)}" target="_blank" rel="noopener">
<div class="headline-thumb">${thumbHtml({ file: "001015680_takedaomomizi2013.jpg", title: "武田尾（武庫川）" }, "videoCamera")}</div>
<div>
  <p class="headline-title">${escapeHtml(cam.name)}</p>
  <p class="headline-meta">${escapeHtml(cam.description)}</p>
</div>
</a>`,
  ).join("\n");

  const faqItems = [
    {
      q: "ライブカメラの映像はリアルタイムで見られますか？",
      a: "各機関のカメラによって更新頻度が異なります。国土交通省「川の防災情報」は概ね10分〜数十分更新、兵庫県の河川監視カメラは約5分更新です。大雨・台風時はアクセスが集中しつながりにくくなる場合があります。",
    },
    {
      q: "武庫川の水位はどこで確認できますか？",
      a: "宝塚市公式サイトの<a href=\"https://www.city.takarazuka.hyogo.jp/1013056/1011509/1013062/1020504.html\" target=\"_blank\" rel=\"noopener\">河川水位ページ</a>や、国土交通省<a href=\"https://www.river.go.jp/kawabou/\" target=\"_blank\" rel=\"noopener\">川の防災情報</a>で数値を確認できます。ライブカメラの映像と合わせて確認することをおすすめします。",
    },
    {
      q: "武田尾地点の危険水位はどのくらいですか？",
      a: "宝塚市が公表している水位基準（武田尾地点）は、警戒水位4.90m・避難判断水位5.90m・氾濫危険水位8.70mです。水位が警戒水位を超えたら、最新情報の確認と避難の準備を始めてください。",
    },
    {
      q: "どのタイミングで避難を判断すればよいですか？",
      a: "市が「避難指示」や「高齢者等避難」を発令した場合は速やかに避難してください。水位や雨量の数値を見ながら、警戒レベル3以上が発令されたら行動開始を目安にしてください。詳しくは<a href=\"/category/bosai/guide\">防災ガイド</a>をご覧ください。",
    },
    {
      q: "大雨・台風のとき他に確認すべき情報源は？",
      a: "気象庁の<a href=\"https://www.jma.go.jp/bosai/floodindex/#area_type=class20s&area_code=2821400\" target=\"_blank\" rel=\"noopener\">流域雨量指数（武庫川）</a>で河川が氾濫しやすい状況かを確認できます。また、宝塚市の<a href=\"https://www.city.takarazuka.hyogo.jp/1013056/index.html\" target=\"_blank\" rel=\"noopener\">防災情報ページ</a>・市公式SNS・防災行政無線（すみれ防災スピーカー）も必ず確認してください。",
    },
    {
      q: "スマートフォンで見やすいカメラはありますか？",
      a: "兵庫県の<a href=\"https://hyogo.kasenkanshi.info/\" target=\"_blank\" rel=\"noopener\">河川監視カメラシステム</a>はスマートフォン対応のサイトです。阪神北地区（武田尾・大堀川・波豆川）や生瀬地点の映像をまとめて確認できます。",
    },
  ];

  const faqHtml = faqItems
    .map(
      (item) => `<div class="faq-item">
<p class="faq-q">${icon("help")}${escapeHtml(item.q)}</p>
<div class="faq-a">${item.a}</div>
</div>`,
    )
    .join("\n");

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a.replace(/<[^>]+>/g, ""),
      },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "武庫川ライブカメラ・河川水位情報", item: canonicalUrl },
    ],
  };

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; 武庫川ライブカメラ・河川水位情報</nav>
<div class="page-content">
<h1>武庫川ライブカメラ・水位情報まとめ（宝塚市）</h1>
<p class="lead">宝塚市を流れる武庫川（武田尾・生瀬など）と大堀川・波豆川の河川監視カメラ（国土交通省・兵庫県）へのリンクと、宝塚市公表の水位基準（警戒水位・避難判断水位・氾濫危険水位）をまとめています。</p>

<div class="panel">
<p class="panel-title">${icon("videoCamera")}武庫川ライブカメラ一覧</p>
<p style="margin-bottom:1rem;">大雨・台風の際に水位が急上昇することがあります。国土交通省・兵庫県が運営する公式の河川監視カメラへのリンクを掲載しています。大雨が予想されるときは早めに状況を確認してください。</p>
<p class="empty-state" style="font-size:0.85rem;">※ 画像の直接埋め込みは行わず、各機関の公式ページへ直接ご案内します</p>
${cameraItems}
<p class="panel-note">出典：国土交通省「川の防災情報」（<a href="https://www.river.go.jp/kawabou/" target="_blank" rel="noopener">river.go.jp/kawabou</a>）／兵庫県河川監視カメラ（<a href="https://hyogo.kasenkanshi.info/" target="_blank" rel="noopener">hyogo.kasenkanshi.info</a>）</p>
</div>

<div class="panel">
<p class="panel-title">${icon("alert")}武庫川 水位基準（宝塚市公表値）</p>
<table class="data-table" style="width:100%;border-collapse:collapse;font-size:0.9rem;">
<thead><tr style="background:var(--color-surface-2,#f5f5f5);">
<th style="padding:0.5rem;text-align:left;border-bottom:1px solid var(--color-border,#ddd);">観測地点</th>
<th style="padding:0.5rem;text-align:right;border-bottom:1px solid var(--color-border,#ddd);">警戒水位</th>
<th style="padding:0.5rem;text-align:right;border-bottom:1px solid var(--color-border,#ddd);">避難判断水位</th>
<th style="padding:0.5rem;text-align:right;border-bottom:1px solid var(--color-border,#ddd);">氾濫危険水位</th>
</tr></thead>
<tbody>
<tr><td style="padding:0.5rem;border-bottom:1px solid var(--color-border,#ddd);">武田尾地点（宝塚市玉瀬）</td><td style="padding:0.5rem;text-align:right;border-bottom:1px solid var(--color-border,#ddd);">4.90 m</td><td style="padding:0.5rem;text-align:right;border-bottom:1px solid var(--color-border,#ddd);">5.90 m</td><td style="padding:0.5rem;text-align:right;border-bottom:1px solid var(--color-border,#ddd);">8.70 m</td></tr>
<tr><td style="padding:0.5rem;">生瀬地点（西宮市塩瀬町生瀬）</td><td style="padding:0.5rem;text-align:right;">3.20 m</td><td style="padding:0.5rem;text-align:right;">3.20 m</td><td style="padding:0.5rem;text-align:right;">4.60 m</td></tr>
</tbody>
</table>
<p class="panel-note">出典：<a href="https://www.city.takarazuka.hyogo.jp/1013056/1011509/1013062/1020504.html" target="_blank" rel="noopener">宝塚市公式サイト「河川水位」</a></p>
</div>

<div class="panel">
<p class="panel-title">${icon("link")}公式の水位・雨量情報</p>
<ul class="related-links">
<li><a href="https://www.city.takarazuka.hyogo.jp/1013056/1011509/1013062/1020504.html" target="_blank" rel="noopener">宝塚市 河川水位情報</a></li>
<li><a href="https://www.river.go.jp/kawabou/" target="_blank" rel="noopener">国土交通省 川の防災情報（武庫川流域カメラ・水位）</a></li>
<li><a href="https://www.jma.go.jp/bosai/floodindex/#area_type=class20s&area_code=2821400" target="_blank" rel="noopener">気象庁 流域雨量指数（武庫川）</a></li>
<li><a href="https://hyogo.kasenkanshi.info/" target="_blank" rel="noopener">兵庫県 河川監視カメラシステム</a></li>
<li><a href="https://www.city.takarazuka.hyogo.jp/1013056/index.html" target="_blank" rel="noopener">宝塚市 防災情報トップ</a></li>
</ul>
</div>

<div class="panel">
<p class="panel-title">${icon("help")}よくある質問</p>
${faqHtml}
</div>

<div class="panel">
<p class="panel-title">${icon("shield")}防災の備えも確認しよう</p>
<ul class="related-links">
<li><a href="/category/bosai/guide">防災ガイド（避難場所・ハザードマップ・非常持ち出し品）</a></li>
<li><a href="/category/bosai">防犯・防災の記事一覧</a></li>
</ul>
</div>

${recommendedPagesPanel("bosai", canonicalUrl.replace(siteUrl, ""))}

</div>`;

  return layout({
    title: "武庫川ライブカメラ｜宝塚市周辺の河川監視カメラ・水位基準まとめ｜Takarazuka Today",
    description: "武庫川（武田尾・生瀬）と大堀川・波豆川のライブカメラ（国土交通省・兵庫県）をまとめてリンク。警戒水位・避難判断水位・氾濫危険水位の基準値も宝塚市公表データで確認できます。大雨・台風時にご活用ください。",
    bodyHtml,
    canonicalUrl,
    structuredData: [breadcrumbLd, faqLd],
    ogImage: "/photos/001015680_takedaomomizi2013.jpg",
    adsAllowed: false,
  });
}

function eventRow(occurrence) {
  const { article, date } = occurrence;
  const categoryMeta = findCategory(article.category);
  const photo = findPhotoForText(`${article.title} ${article.summary ?? ""}`);
  const dateLabel = new Date(`${date}T00:00:00+09:00`).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric", weekday: "short" });
  return `<a class="headline-row" href="/articles/${article.slug}">
<div class="headline-thumb">${thumbHtml(photo, categoryMeta ? categoryMeta.icon : "calendar")}</div>
<div>
  <p class="headline-title">${escapeHtml(dateLabel)}　${statusTag(article)}${escapeHtml(article.title)}</p>
  <p class="headline-meta">${escapeHtml(article.eventLocation ?? "")}</p>
</div>
</a>`;
}

export function eventsPage({ todayEvents, thisWeekend, thisMonth, siteUrl }) {
  const canonicalUrl = `${siteUrl}/events/`;

  const todayItems = todayEvents.map(eventRow).join("\n") || '<p class="empty-state">本日開催のイベントはありません</p>';
  const weekendItems = thisWeekend.map(eventRow).join("\n") || '<p class="empty-state">今週末開催予定のイベントはまだ登録されていません</p>';
  const monthItems = thisMonth.map(eventRow).join("\n") || '<p class="empty-state">今月開催予定のイベントはまだ登録されていません</p>';

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; イベントカレンダー</nav>
<div class="page-content">
<div class="event-tabs" role="tablist">
<button class="event-tab is-active" type="button" data-tab="today" role="tab" aria-selected="true">今日</button>
<button class="event-tab" type="button" data-tab="weekend" role="tab" aria-selected="false">今週末</button>
<button class="event-tab" type="button" data-tab="month" role="tab" aria-selected="false">今月</button>
</div>
<div class="panel event-tabpanel" id="event-panel-today" data-tabpanel="today">
<p class="panel-title">${icon("calendar")}今日のイベント</p>
${todayItems}
</div>
<div class="panel event-tabpanel" id="event-panel-weekend" data-tabpanel="weekend" hidden>
<p class="panel-title">${icon("calendar")}今週末のイベント</p>
${weekendItems}
</div>
<div class="panel event-tabpanel" id="event-panel-month" data-tabpanel="month" hidden>
<p class="panel-title">${icon("calendar")}今月のイベント</p>
${monthItems}
</div>
<p class="panel-note">掲載しているイベントは、宝塚市・兵庫県・兵庫県警が公開した情報のうち、開催日が明記されているものです。最新情報は出典元をご確認ください。</p>
</div>
<script>
(function(){
  var tabs = document.querySelectorAll(".event-tab");
  tabs.forEach(function(tab){
    tab.addEventListener("click", function(){
      tabs.forEach(function(t){ t.classList.remove("is-active"); t.setAttribute("aria-selected","false"); });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected","true");
      document.querySelectorAll(".event-tabpanel").forEach(function(p){ p.hidden = p.dataset.tabpanel !== tab.dataset.tab; });
    });
  });
})();
</script>`;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "イベントカレンダー｜Takarazuka Today",
    url: canonicalUrl,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "イベントカレンダー", item: canonicalUrl },
    ],
  };

  return layout({
    title: "イベントカレンダー｜Takarazuka Today",
    description: "宝塚市・兵庫県・兵庫県警が公開した、宝塚市内で開催されるイベントの今日・今週末・今月の予定一覧です。",
    bodyHtml,
    canonicalUrl,
    structuredData: [collectionLd, breadcrumbLd],
  });
}

export function searchPage(siteUrl) {
  const canonicalUrl = `${siteUrl}/search`;
  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; サイト内検索</nav>
<div class="page-content">
<h1>${icon("search")}サイト内検索</h1>
<div class="search-box search-box-page">
<form id="site-search-form" class="search-form" action="/search" role="search" autocomplete="off">
${icon("search")}
<input type="search" id="site-search-input" name="q" placeholder="サイト内を検索（例：ゴミ出し、防災、宝塚歌劇）" aria-label="サイト内検索">
</form>
</div>
<div id="site-search-results" class="search-results">
<p class="empty-state">検索キーワードを入力してください。</p>
</div>
</div>`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "サイト内検索", item: canonicalUrl },
    ],
  };

  return layout({
    title: "サイト内検索｜Takarazuka Today",
    description: "Takarazuka Today（宝塚市の防災・行政・市議会・暮らしの情報サイト）のサイト内検索です。記事・ガイドをキーワードで探せます。",
    bodyHtml,
    canonicalUrl,
    structuredData: breadcrumbLd,
    extraScripts: ["/js/search.js"],
    adsAllowed: adsAllowedFor({ pathname: "/search" }),
    noindex: true,
  });
}

// /ranking/ を検索エンジンにインデックスさせない。ランキングは手動集計でしか更新されず、
// 最新でないときは新着記事で代替するため、「人気記事ランキング」として検索結果に出す内容が安定しない。
// ページは公開したまま。build.js の sitemap もこの値を参照する
export const RANKING_PAGE_NOINDEX = true;

export function rankingPage(ranking, recentArticles, siteUrl) {
  const canonicalUrl = `${siteUrl}/ranking/`;
  // 最新ランキングが無いときは新着記事を出すので、ページ名・説明文も実際の表示内容に合わせる
  const pageLabel = ranking ? "人気記事ランキング" : "新着記事";
  const description = ranking
    ? "Takarazuka Todayでよく読まれているページを、過去30日間のアクセスデータをもとに紹介します。"
    : "Takarazuka Todayの新着記事をまとめてご案内します。";
  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; ${pageLabel}</nav>
<div class="page-content">
${rankingOrRecentPanel(ranking, recentArticles, 10, false)}
</div>`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: pageLabel, item: canonicalUrl },
    ],
  };

  return layout({
    title: `${pageLabel}｜Takarazuka Today`,
    description,
    bodyHtml,
    canonicalUrl,
    structuredData: breadcrumbLd,
    adsAllowed: adsAllowedFor({ pathname: "/ranking/" }),
    noindex: RANKING_PAGE_NOINDEX,
  });
}

// 議員活動サマリー（/giin/ と個別ページ）を検索エンジンにインデックスさせない。
// 掲載が一部の議員だけで、全議員を同じ基準・同じ期間で扱えていないため（議員本人や発言内容への評価ではない）。
// ページは公開したままで、市議会記事からの導線・サイト内検索も残す。build.js の sitemap もこの値を参照する
export const GIIN_PAGES_NOINDEX = true;

// 議員活動サマリー：本人の公開発言（市議会会議録）を時系列で並べるのみ。スコア化・ランキング・評価は行わない
export function giinPage(giin, relatedArticles, siteUrl) {
  const canonicalUrl = `${siteUrl}/giin/${giin.slug}`;
  const items = relatedArticles
    .map(
      (article) => `<div class="row">
<div>
  <a href="/articles/${article.slug}">${escapeHtml(article.title)}</a>
  <p class="headline-meta">${escapeHtml(article.meetingType ?? "")}・${escapeHtml(article.meetingDate ?? article.publishedAt)}</p>
</div>
</div>`,
    )
    .join("\n");

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; <a href="${categoryPath("shigikai")}">市議会</a> &gt; ${escapeHtml(giin.name)}議員</nav>
<div class="page-content">
<div class="panel">
${SHIGIKAI_DISCLOSURE.replace("本ページの内容は、", "このページは議員本人の公開発言（宝塚市議会の公式情報）を時系列で整理したものです。活動量のスコア化・ランキング・優劣評価は行いません。<br><br>本ページの内容は、")}
<div class="giin-card">
<div class="giin-avatar">${icon("user")}</div>
<div>
  <p class="giin-name">${escapeHtml(giin.name)}　議員</p>
  <p class="giin-kaiha">会派：${escapeHtml(giin.kaiha ?? "未掲載")}</p>
</div>
</div>
<p class="panel-title">発言テーマ一覧（時系列）</p>
${items || '<p class="empty-state">まだ発言記録がありません</p>'}
</div>
</div>`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "市議会", item: `${siteUrl}${categoryPath("shigikai")}` },
      { "@type": "ListItem", position: 3, name: `${giin.name}議員`, item: canonicalUrl },
    ],
  };

  return layout({
    title: `${giin.name}議員の発言記録｜Takarazuka Today`,
    description: `${giin.name}議員の市議会会議録に基づく公開発言を時系列で整理したページです。事実ベースの要約のみで、評価・ランキングは行いません。`,
    bodyHtml,
    canonicalUrl,
    structuredData: breadcrumbLd,
    adsAllowed: adsAllowedFor({ pathname: `/giin/${giin.slug}` }),
    noindex: GIIN_PAGES_NOINDEX,
  });
}

export function giinIndexPage(giinList, siteUrl) {
  const canonicalUrl = `${siteUrl}/giin/`;
  const items = giinList
    .map(
      (giin) => `<a class="headline-row" href="/giin/${giin.slug}">
<div class="headline-thumb">${icon("user")}</div>
<div>
  <p class="headline-title">${escapeHtml(giin.name)}　議員</p>
  <p class="headline-meta">会派：${escapeHtml(giin.kaiha ?? "未掲載")}</p>
</div>
</a>`,
    )
    .join("\n");

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; <a href="${categoryPath("shigikai")}">市議会</a> &gt; 議員活動サマリー</nav>
<div class="page-content">
<div class="panel">
<p class="panel-title">${icon("user")}議員活動サマリー一覧</p>
${SHIGIKAI_DISCLOSURE.replace("本ページの内容は、", "このページは議員本人の公開発言（宝塚市議会の公式情報）を時系列で整理したものです。活動量のスコア化・ランキング・優劣評価は行いません。<br><br>本ページの内容は、")}
${items || '<p class="empty-state">まだ掲載がありません</p>'}
</div>
</div>`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "市議会", item: `${siteUrl}${categoryPath("shigikai")}` },
      { "@type": "ListItem", position: 3, name: "議員活動サマリー", item: canonicalUrl },
    ],
  };

  return layout({
    title: "議員活動サマリー一覧｜Takarazuka Today",
    description: "宝塚市議会議員の公開発言を時系列で整理した一覧です。評価・ランキングは行いません。",
    bodyHtml,
    canonicalUrl,
    structuredData: breadcrumbLd,
    adsAllowed: adsAllowedFor({ pathname: "/giin/" }),
    noindex: GIIN_PAGES_NOINDEX,
  });
}

export function gikaiGuidePage(siteUrl) {
  const canonicalUrl = `${siteUrl}/category/shigikai/guide`;

  // 制度説明はすべて宝塚市議会の公式ページで確認できる内容に限定する（フェーズE-3）。
  // 定例会の月は市の公表表記（3月・6月・9月・12月）を主表記とし、
  // 実際の会期が前月に開会する点は data/gikai-gian と同じ公式「議案等一覧・審議結果」を根拠に補足する。
  const SRC = {
    towa: "https://www.city.takarazuka.hyogo.jp/1060687/gikai/youkoso/1000840.html",
    gaiyo: "https://www.city.takarazuka.hyogo.jp/1060687/gikai/youkoso/1000841.html",
    bouchou: "https://www.city.takarazuka.hyogo.jp/1060687/gikai/annai/1000845.html",
    kaigiroku: "https://www.city.takarazuka.hyogo.jp/1060687/gikai/katsudo/1000849.html",
    chukei: "https://www.city.takarazuka.hyogo.jp/1060687/gikai/gikaikoho/1022175.html",
    seigan: "https://www.city.takarazuka.hyogo.jp/1060687/gikai/minnanogikai/1000990.html",
    gian: "https://www.city.takarazuka.hyogo.jp/1060687/gikai/katsudo/1000795/index.html",
  };

  const TOC = [
    { id: "yakuwari", label: "市議会は何を決めるところ？" },
    { id: "honkaigi", label: "本会議と委員会の違い" },
    { id: "teireikai", label: "定例会と臨時会" },
    { id: "rule", label: "会議はどう決まる？" },
    { id: "bouchou", label: "傍聴・中継・会議録を見る" },
    { id: "seigan", label: "市民が意見を出す方法" },
    { id: "watch", label: "Takarazuka Todayで議会を見る" },
  ];

  const FAQ = [
    {
      q: "市議会は何をするところ？",
      a: "市民が選挙で選んだ議員で構成される議決機関で、市の条例を設けたり予算を定めたりします。議員の条例定数は26人です。",
    },
    {
      q: "「本会議」と「委員会」はどう違う？",
      a: "本会議は議案などを審議し、議会の最終意思を決める会議です。委員会は効率的・専門的に審議を進めるための下審査機関で、議会運営委員会・常任委員会・特別委員会などがあります。議案は原則として所管する委員会に審査を委ね、審査後に本会議で委員長の報告を受けて採決します。",
    },
    {
      q: "定例会・臨時会とは？",
      a: "定例会は概ね3月・6月・9月・12月の年4回開かれる通常の議会です。臨時会は定例会以外の閉会中に必要があるときに開かれます。なお定例会は「3月定例会」などと呼ばれますが、実際の会期は前月から始まる場合があります。",
    },
  ];

  const WATCH_ROWS = [
    ["条例・予算・議案がどう決まったか", '<a href="/category/shigikai/gian">議案採決一覧</a>'],
    ["市の財政状況", '<a href="/category/shigikai/zaisei-watch">財政ウォッチ</a>'],
    ["議員ごとの発言", '<a href="/giin/">議員活動サマリー</a>'],
    ["会議ごとの要点", `<a href="${categoryPath("shigikai")}">市議会ウォッチ（記事一覧）</a>`],
    [
      "発言の一字一句・公式記録",
      `<a href="${SRC.kaigiroku}" target="_blank" rel="noopener">宝塚市議会 会議録の検索（公式）</a>`,
    ],
  ];

  const tocHtml = `<div class="toc">
<p class="toc-title">${icon("newspaper")}目次</p>
<ol>${TOC.map((t) => `<li><a href="#${t.id}">${escapeHtml(t.label)}</a></li>`).join("\n")}</ol>
</div>`;

  const watchTableHtml = `<div class="table-scroll">
<table class="data-table" style="width:100%;border-collapse:collapse;font-size:0.9rem;">
<thead><tr style="background:var(--color-surface-2,#f5f5f5);">
<th style="padding:0.5rem;text-align:left;border-bottom:1px solid var(--color-border,#ddd);">知りたいこと</th>
<th style="padding:0.5rem;text-align:left;border-bottom:1px solid var(--color-border,#ddd);">見るページ</th>
</tr></thead>
<tbody>
${WATCH_ROWS.map(
  (row) =>
    `<tr><td style="padding:0.5rem;text-align:left;border-bottom:1px solid var(--color-border,#ddd);">${escapeHtml(row[0])}</td><td style="padding:0.5rem;text-align:left;border-bottom:1px solid var(--color-border,#ddd);">${row[1]}</td></tr>`,
).join("\n")}
</tbody>
</table>
</div>`;

  const faqHtml = `<section class="guide-section" id="faq">
<h2>${icon("bell")}よくある質問</h2>
${FAQ.map((f) => `<div class="faq-item">
<div class="faq-q">${escapeHtml(f.q)}</div>
<div class="faq-a">${escapeHtml(f.a)}</div>
</div>`).join("\n")}
</section>`;

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; <a href="${categoryPath("shigikai")}">市議会</a> &gt; 市議会のしくみ</nav>
<div class="page-content">
<h1>宝塚市議会のしくみ・市議会ウォッチの見方</h1>
<p class="lead">宝塚市議会が何を決めているのか、会議はどう進むのか、そして市民が傍聴・視聴・意見提出するにはどうすればよいのかを、宝塚市議会の公式ページをもとに整理しました。あわせて、Takarazuka Today のどのページで何が分かるかもまとめています。</p>
${tocHtml}

<section class="guide-section" id="yakuwari">
<h2>${icon("building")}市議会は何を決めるところ？</h2>
<div class="rule-card">市議会は、市民が選挙で選んだ議員で構成される<strong>議決機関</strong>です。市長は執行機関にあたり、両者は車の両輪のようにともに市政に関わります。</div>
<div class="rule-card">基本的な権限は<strong>議決権</strong>で、市の条例を設けたり、予算を定めたりします。このほかに、予算を除く議案の提出権、副市長や教育委員などの選任についての同意権、市の事務に対する検査権、請願・陳情の受理権などがあります。</div>
<div class="rule-card">議員の<strong>条例定数は26人</strong>です。議長と副議長は、議員の中から議会の選挙によって選ばれます。</div>
</section>

<section class="guide-section" id="honkaigi">
<h2>${icon("building")}本会議と委員会の違い</h2>
<div class="rule-card"><strong>本会議</strong>は、議案などを審議し、議会の最終意思を決める会議です。市長が議案の提案理由を説明したり、議員が議案や市の一般事務について質問したり、意見を述べたりするのもこの会議です。</div>
<div class="rule-card"><strong>委員会</strong>は、効率的・専門的に審議を進めるために置かれた本会議の下審査機関です。<strong>議会運営委員会・常任委員会・特別委員会</strong>などがあります。</div>
<div class="rule-card">議案が決まるまでの流れは次のとおりです。<br>議案の提出 → 本会議で提出者が説明 → 原則として所管する委員会へ審査を委ねる（付託） → 委員会で審査 → 本会議で委員長が審査の経過と結果を報告 → 出席議員の多数決で最終意思を決定</div>
</section>

<section class="guide-section" id="teireikai">
<h2>${icon("calendar")}定例会と臨時会</h2>
<div class="rule-card">議会（本会議）はいつでも開かれているわけではなく、定期的または臨時的に、ある一定期間だけ開かれます。</div>
<div class="rule-card"><strong>定例会</strong>は、宝塚市では概ね<strong>3月・6月・9月・12月の年4回</strong>、定期的に開かれます。<strong>臨時会</strong>は、定例会以外の閉会中に必要があるときに開かれます。</div>
<div class="rule-card">定例会は「3月定例会」「6月定例会」のように呼ばれますが、<strong>実際の会期は前月から始まる場合があります</strong>。たとえば2026年の第1回定例会（3月）は2月13日に、第2回定例会（6月）は5月22日に開会しました（<a href="${SRC.gian}" target="_blank" rel="noopener">宝塚市議会「議案等一覧・審議結果」</a>）。傍聴や視聴を予定する場合は、実際の会期をご確認ください。</div>
</section>

<section class="guide-section" id="rule">
<h2>${icon("book")}会議はどう決まる？</h2>
<div class="rule-card"><strong>議事公開の原則</strong>：会議の模様は市民などに公開されます。傍聴や報道ができるのはこの原則によるものです。</div>
<div class="rule-card"><strong>定足数の原則</strong>：議員定数の半数以上（宝塚市議会の場合は<strong>13人</strong>）が出席しないと会議を開くことができません。</div>
<div class="rule-card"><strong>過半数議決の原則</strong>：原則として、会議に出席している議員（議長を除く）の2分の1を超える数で、賛成または反対を決めます。</div>
</section>

<section class="guide-section" id="bouchou">
<h2>${icon("user")}傍聴・中継・会議録を見る</h2>
<div class="rule-card"><strong>傍聴する</strong><br>本会議・委員会はいずれも一般に公開されており、どなたでも傍聴できます。会議時間は会議規則で午前9時から午後5時30分までと定められていますが、<strong>午前9時30分から始まるのが通例</strong>です。</div>
<div class="rule-card"><strong>本会議の傍聴</strong>：市庁舎5階の本会議場前で傍聴人受付簿に記入して受け付けます。傍聴席は<strong>84席</strong>（うち車椅子席2席）で、補助犬の同伴も可能です。</div>
<div class="rule-card"><strong>委員会の傍聴</strong>：議会事務局で受け付けます。傍聴席は<strong>10席程度</strong>で、満席の場合は音声のみを流す別室に案内される場合があります。</div>
<div class="rule-card">手話通訳者や要約筆記者の介助を希望する場合は、議会事務局総務課へファクス（0797-74-6902）または窓口へ申し出てください。本会議場には<strong>磁気ループ席26席</strong>が用意されています。</div>
<div class="rule-card"><strong>中継・録画で見る</strong><br>本会議と委員会審査はライブ中継が行われ、<strong>録画配信は約1週間後</strong>に公開されます。ただし<strong>議会中継の映像・音声は公式記録ではありません</strong>。</div>
<div class="rule-card"><strong>会議録で確認する</strong><br>公式な記録は会議録です。会議録は<strong>会議終了から約3カ月後をめどに掲載</strong>されます。早く内容を知りたいときは中継・録画、公式な記録を確認したいときは会議録、という使い分けになります。</div>
</section>

<section class="guide-section" id="seigan">
<h2>${icon("mail")}市民が意見を出す方法</h2>
<div class="rule-card">市の行政について意見や要望があるときは、市議会に請願や陳情をすることができます。<strong>議員の紹介があるものが「請願」、ないものが「陳情」</strong>として扱われます。</div>
<div class="rule-card">提出された請願・陳情は市議会で審査され、内容が妥当であり市の施策に反映すべきと判断された場合は「<strong>採択</strong>」、そうでない場合は「<strong>不採択</strong>」となります。審査結果は提出者へ後日通知されます。</div>
<div class="rule-card">提出方法の詳細は、<a href="${SRC.seigan}" target="_blank" rel="noopener">宝塚市議会「請願・陳情の方法」</a>でご確認ください。</div>
</section>

<section class="guide-section" id="watch">
<h2>${icon("newspaper")}Takarazuka Todayで議会を見る</h2>
<p class="panel-note">知りたいことから、見るページを選べます。</p>
${watchTableHtml}
<div class="rule-card">市議会ウォッチの各記事の冒頭にある「今回のポイント」欄では、その日の会議のうち<strong>市民生活に関係する内容</strong>だけを整理して紹介しています。詳しい審議の経過を知りたい場合は、記事末尾の出典リンクから会議録本文（公式）をご確認ください。</div>
<div class="rule-card">本サイトの要約は<strong>事実の整理のみ</strong>を目的とし、議員や議案への評価・賛否の表明は行いません。</div>
<div class="related-links">
<a href="${categoryPath("shigikai")}">市議会ウォッチ一覧を見る →</a>
<a href="/category/shigikai/gian">議案採決一覧を見る →</a>
<a href="/category/shigikai/zaisei-watch">財政ウォッチを見る →</a>
<a href="/giin/">議員活動サマリー一覧を見る →</a>
</div>
</section>

${faqHtml}

<p class="source-note">出典：<a href="${SRC.towa}" target="_blank" rel="noopener">宝塚市議会「市議会とは」</a>（公式情報をもとに編集部が整理しています。正式な内容・最新情報は出典元もあわせてご確認ください）</p>
<p class="article-source">追加出典：<a href="${SRC.gaiyo}" target="_blank" rel="noopener">宝塚市議会の概要</a>／<a href="${SRC.bouchou}" target="_blank" rel="noopener">本会議・委員会等の傍聴</a>／<a href="${SRC.kaigiroku}" target="_blank" rel="noopener">会議録の検索</a>／<a href="${SRC.chukei}" target="_blank" rel="noopener">議会中継・録画配信</a>／<a href="${SRC.seigan}" target="_blank" rel="noopener">請願・陳情の方法</a>／<a href="${SRC.gian}" target="_blank" rel="noopener">議案等一覧・審議結果</a>（いずれも宝塚市公式サイト）</p>
${recommendedPagesPanel("shigikai", canonicalUrl.replace(siteUrl, ""))}
</div>`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "市議会", item: `${siteUrl}${categoryPath("shigikai")}` },
      { "@type": "ListItem", position: 3, name: "市議会のしくみ", item: canonicalUrl },
    ],
  };

  // FAQPageの質問・回答は、上の「よくある質問」セクションで実際に表示している内容と同一にする
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return layout({
    title: "宝塚市議会のしくみ・市議会ウォッチの見方｜Takarazuka Today",
    description:
      "宝塚市議会のしくみを公式情報をもとに解説。本会議と委員会の違い、定例会（概ね3月・6月・9月・12月）と臨時会、傍聴・議会中継・会議録の見方、請願と陳情の違いをまとめ、議案採決一覧・財政ウォッチ・議員活動サマリーへの見方もあわせて紹介します。",
    bodyHtml,
    canonicalUrl,
    structuredData: [breadcrumbLd, faqLd],
  });
}

// 宝塚市財政ウォッチ：市が年2回（6月・12月）公表する「財政状況」をもとに事実を整理する。政治的評価・独自分析は行わない
function formatYen(yen) {
  if (yen == null) return "－";
  if (yen >= 100000000) {
    const oku = Math.floor(yen / 100000000);
    const man = Math.round((yen % 100000000) / 10000);
    return man > 0 ? `${oku.toLocaleString()}億${man.toLocaleString()}万円` : `${oku.toLocaleString()}億円`;
  }
  if (yen >= 10000) {
    return `${Math.round(yen / 10000).toLocaleString()}万円`;
  }
  return `${yen.toLocaleString()}円`;
}

function formatIndicatorValue(indicator) {
  if (indicator.unit === "percent") return `${indicator.value}%`;
  return formatYen(indicator.value);
}

function formatIndicatorDiff(current, previous) {
  if (!previous) return "－";
  // 収入率・執行率は基準日までの累計なので、基準日の違う公表期どうしの差は意味を持たない。自動の増減は出さない
  if (current.unit === "percent") return "－";
  const diff = current.value - previous.value;
  if (diff === 0) return "変動なし";
  const sign = diff > 0 ? "+" : "-";
  return `${sign}${formatYenDiffAmount(Math.abs(diff))}`;
}

// 財政ウォッチの増減額。1億円以上は formatYen と同じ（万円単位）。1億円未満は、万円未満の端数を丸めず円まで出す（例：722万5,000円）。
// 減少も増加と同じ単位表記にそろえるため、符号は呼び出し側で付ける
function formatYenDiffAmount(yen) {
  if (yen >= 100000000) return formatYen(yen);
  const man = Math.floor(yen / 10000);
  const rest = yen % 10000;
  if (man === 0) return `${yen.toLocaleString()}円`;
  return rest > 0 ? `${man.toLocaleString()}万${rest.toLocaleString()}円` : `${man.toLocaleString()}万円`;
}

// 基準日（basicStats.statsDate）から、令和表記の日付と会計年度を出す
function zaiseiAsOfLabel(period) {
  const d = period?.basicStats?.statsDate;
  if (typeof d !== "string") return null;
  const [y, m, day] = d.split("-").map(Number);
  return `令和${y - 2018}年${m}月${day}日`;
}
function zaiseiFiscalYear(period) {
  const d = period?.basicStats?.statsDate;
  if (typeof d !== "string") return null;
  const [y, m] = d.split("-").map(Number);
  return m >= 4 ? y : y - 1;
}
const zaiseiFiscalYearLabel = (fy) => `令和${fy - 2018}年度`;

// 表の下の注記。「前回」は直前の公表期で、基準日が違うこと、年度をまたぐ比較であること、収入率・執行率の増減を出さないことを明示する
function zaiseiComparisonNotes(current, previous) {
  if (!previous) return "";
  const curAsOf = zaiseiAsOfLabel(current);
  const prevAsOf = zaiseiAsOfLabel(previous);
  const asOfText = curAsOf && prevAsOf ? `基準日は、今回が${curAsOf}、前回が${prevAsOf}です。` : "";
  const notes = [
    `「前回」は、直前の公表期（${previous.publishedLabel}・${previous.coverageLabel}）の値です。増減は、今回の値から前回の値を引いた差です。${asOfText}`,
  ];
  const curFy = zaiseiFiscalYear(current);
  const prevFy = zaiseiFiscalYear(previous);
  if (curFy != null && prevFy != null && curFy !== prevFy) {
    notes.push(`今回（${zaiseiFiscalYearLabel(curFy)}）と前回（${zaiseiFiscalYearLabel(prevFy)}）は年度が異なります。予算総額・市税収入（予算）の増減は、年度をまたいだ比較です。`);
  }
  notes.push("収入率・執行率は、それぞれの基準日までの累計です。公表期によって基準日までの期間が異なるため、増減は表示していません（「－」）。");
  return notes.map((n) => `<p class="today-source">${escapeHtml(n)}</p>`).join("\n");
}

// 各グループの見出しと注意書き（グループごとに、見出しのすぐ下へ置く）
const ZAISEI_FLOW = {
  title: "① 年間の規模（フロー）",
  note: "1年間に動くお金の規模を示す指標です。一般会計予算総額と市税収入（予算）を並べています",
};
const ZAISEI_STOCK = {
  title: "② 現在の残高（ストック）",
  note: "ある時点での市債と、基金及び出資金の残高です。性質の異なる指標のため、単純な差額で財政状況を判断することはできません",
};

// 棒の長さ：従来のSVGと同じ計算。グループごとの最大値を基準に、幅＝max(4, 値/最大値×165) ÷ 165（外枠の幅165に対する割合）。
// 最大値が0など割合が数にならない場合、従来は棒が描かれなかったので、幅0%にする（意味を変えない）
const ZAISEI_BAR_AREA = 165;
const ZAISEI_BAR_MIN = 4;
function zaiseiBarPercent(value, max) {
  const w = Math.max(ZAISEI_BAR_MIN, (value / max) * ZAISEI_BAR_AREA);
  return Number.isFinite(w) ? Math.round((w / ZAISEI_BAR_AREA) * 10000) / 100 : 0;
}

function zaiseiChartGroup({ id, kind, def, items }) {
  const max = Math.max(...items.map((i) => i.value));
  const rows = items
    .map(
      (item) => `<li class="zaisei-chart-item"><span class="zaisei-chart-name">${escapeHtml(item.label)}</span><span class="zaisei-chart-value">${escapeHtml(item.valueLabel)}</span><span class="zaisei-chart-bar" aria-hidden="true"><span class="zaisei-chart-fill" style="width:${zaiseiBarPercent(item.value, max)}%"></span></span></li>`,
    )
    .join("");
  return `<div class="zaisei-chart-group zaisei-chart-group--${kind}" role="group" aria-labelledby="${id}"><p class="zaisei-chart-title" id="${id}">${escapeHtml(def.title)}</p><p class="zaisei-chart-note">${escapeHtml(def.note)}</p><ul class="zaisei-chart-list" role="list">${rows}</ul></div>`;
}

function zaiseiBillionLabel(yen) {
  return `${(yen / 1e8).toLocaleString("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}億円`;
}

// 主要指標のグラフ。SVGではなくHTML/CSSの棒で、名称・数値は文字として出し、棒は装飾（aria-hidden）にする
function zaiseiChartSvg(current) {
  const byKey = (key) => current.indicators.find((i) => i.key === key);
  const budget = byKey("general-account-budget");
  const tax = byKey("tax-revenue");
  const bond = byKey("bond-balance");
  const fund = byKey("fund-balance");
  if (!budget || !tax || !bond || !fund) return "";
  const item = (ind) => ({ label: ind.label, value: ind.value, valueLabel: zaiseiBillionLabel(ind.value) });
  const flow = zaiseiChartGroup({ id: "zaisei-chart-flow", kind: "flow", def: ZAISEI_FLOW, items: [item(budget), item(tax)] });
  const stock = zaiseiChartGroup({ id: "zaisei-chart-stock", kind: "stock", def: ZAISEI_STOCK, items: [item(bond), item(fund)] });
  return `<div class="zaisei-chart">${flow}${stock}<p class="zaisei-chart-caption">主要指標のうち金額4項目を、フロー（年間の規模）とストック（現在の残高）に分けてグラフ化しています。</p></div>`;
}

function zaiseiIndicatorRows(current, previous) {
  return current.indicators
    .map((ind) => {
      const prevInd = previous?.indicators.find((p) => p.key === ind.key);
      // 項目名は行見出し（th scope=row）。data-label はスマホの2行表示で「前回」「増減」を併記するための表示用。
      // スマホでは行を grid にするため、ブラウザによって表の意味が失われないよう role も明示している
      return `<tr role="row"><th scope="row" role="rowheader">${escapeHtml(ind.label)}</th><td role="cell" data-label="今回">${formatIndicatorValue(ind)}</td><td role="cell" data-label="前回">${prevInd ? formatIndicatorValue(prevInd) : "－"}</td><td role="cell" data-label="増減">${formatIndicatorDiff(ind, prevInd)}</td></tr>`;
    })
    .join("\n");
}

const ZAISEI_TERMS = [
  { term: "一般会計", desc: "市の基本的な行政活動（福祉・教育・道路整備など）に使うお金の会計区分です。国民健康保険や介護保険など目的が特定された「特別会計」とは別に管理されています。" },
  { term: "基金", desc: "将来の特定の目的（施設整備・災害への備えなど）のために、目的ごとに積み立てているお金です。家計の「貯金」に例えられることがありますが、積み立てた目的に沿って使うもので、いつでも自由に使えるお金ではありません。" },
  { term: "基金及び出資金", desc: "公表資料では、基金の残高に、市が出資・出捐しているお金（出資金及び出捐金）を加えた合計を「基金及び出資金」として示しています。このページの「基金及び出資金の残高」は、この合計額です。" },
  { term: "市債", desc: "市が学校や道路などの整備のために金融機関や国などから借り入れるお金です。家庭でいう「ローン」にあたり、複数年かけて返済します。" },
  { term: "実質収支", desc: "1年間の収入と支出の差額から、翌年度に繰り越す事業の財源などを除いた金額のことで、その年度の家計簿でいう黒字・赤字に近い指標です。決算の数値は、このページの決算の節で紹介しています。" },
];

function zaiseiFaq(current, kessan = null) {
  const asOf = zaiseiAsOfLabel(current);
  return [
  {
    q: "宝塚市の「市債」とは何ですか？",
    a: "市債とは、市が学校や道路などの整備のために金融機関や国などから借り入れるお金のことです。家庭でいう「住宅ローン」のように、複数年かけて返済していく仕組みです。",
  },
  {
    q: "「基金」とは何ですか？",
    a: "基金とは、将来の特定の目的のために、目的ごとに積み立てているお金のことです。家計の「貯金」に例えられることがありますが、積み立てた目的に沿って使うもので、いつでも自由に使えるお金ではありません。宝塚市には財政調整基金など複数の基金があります。なお、このページの「基金及び出資金」は、基金に出資金及び出捐金を加えた、公表資料の合計額です。",
  },
  {
    q: "宝塚市の財政は赤字なのですか？",
    a: kessan
      ? `半期の「財政状況」の公表資料は、予算の執行状況と基準日の残高を示すもので、黒字・赤字を判定する決算資料ではありません。収支の結果は決算で示され、このページの「${kessan.fiscalYearLabel}決算」の節で紹介しています。${kessan.fiscalYearLabel}の一般会計の実質収支は${formatKessanAmount(kessan.generalAccount.current.realBalance)}のプラスです（${kessan.authorization.status === "certified" ? "本会議で認定済み" : "市公表・本会議の認定前"}）。一方、宝塚市は令和8年3月に策定した今後10年間の財政見通しの中で、人口減少や少子高齢化等によりリスク中位ケースでも累計約22.9億円の収支不足が見込まれるとしています。`
      : "このページで紹介している「財政状況」の公表資料は、年度途中の予算の執行状況を示すもので、黒字・赤字を判定する決算資料ではありません。宝塚市は令和8年3月に策定した今後10年間の財政見通しの中で、人口減少や少子高齢化等によりリスク中位ケースでも累計約22.9億円の収支不足が見込まれるとしており、厳しい財政状況にあるとしています。",
  },
  ...(kessan
    ? [
        {
          q: "「決算」と、年2回公表される「財政状況」は何が違いますか？",
          a: "「財政状況」は6月と12月に公表され、予算の執行状況や、基準日現在の市債・基金の残高を示します。「決算」は、1年間の収入と支出の結果で、年度が終わった後にまとまり、議会の認定を受けます。数字の基準日や範囲が違うため、両者を直接比べたり、差を計算したりしないでください。",
        },
        {
          q: `${kessan.fiscalYearLabel}決算の数字は確定していますか？`,
          a: kessan.authorization.status === "certified"
            ? `${kessanDateLabel(kessan.authorization.certifiedDate)}の本会議で認定されました。`
            : "市が公表した内容で、本会議での認定は、まだ行われていません。実質公債費比率は速報値です。認定された時点で、このページの表示を更新します。",
        },
        {
          q: "基金の金額が、資料によって違うのはなぜですか？",
          a: `基準日と範囲が違うためです。半期の財政状況は3月31日現在の基金（と出資金及び出捐金の合計）、決算は出納整理期間（5月31日まで）を経た年度末の残高で、出資金は含みません。${kessan.fiscalYearLabel}の財政調整基金は、3月31日現在が${formatYen(kessan.fiscalAdjustmentFund.timeline[1].yen)}、出納整理期間中に${formatYen(kessan.fiscalAdjustmentFund.timeline[2].yen)}増え、決算の年度末残高は${formatYen(kessan.fiscalAdjustmentFund.timeline[3].yen)}です。`,
        },
      ]
    : []),
  {
    q: "なぜ年に2回（6月・12月）公表されるのですか？",
    a: "地方自治法第243条の3第1項及び宝塚市の条例に基づき、市は年に2回（6月・12月）財政状況を公表することが定められています。6月は前年度下半期分、12月はその年度の上半期分の状況が公表されます。",
  },
  {
    q: "このページの数字はいつ時点の情報ですか？",
    a: `直近の更新は${current.publishedLabel}分で、${current.coverageLabel}（${current.coverageRange}）の状況です。${asOf ? `基礎数値（人口・世帯数）は${asOf}時点のものです。` : ""}${kessan ? `決算の節は、${kessan.fiscalYearLabel}決算（${kessanDateLabel(kessan.pageUpdatedAt)}時点の表示）です。` : ""}`,
  },
  {
    q: "もっと詳しい情報はどこで見られますか？",
    a: "宝塚市公式サイトの「財政状況」ページで、公表資料（PDF）の原本を確認できます。詳しい内訳や過去の公表分もあわせて掲載されています。",
  },
  ];
}

// ---- 令和7年度決算セクション（data/zaisei-kessan/）----
// 決算は「1年間の収支の結果」で、上の半期の財政状況（予算の執行状況・基準日の残高）とは別物。表示も別の節に分け、数字を混ぜない。
// 原資料の単位は千円。表示は formatYen と同じ（万円未満を四捨五入）にそろえる
function formatKessanAmount(sen) {
  if (sen === 0) return "0円";
  return `${sen < 0 ? "−" : ""}${formatYen(Math.abs(sen) * 1000)}`;
}
function formatKessanDiff(cur, prev) {
  const d = cur - prev;
  if (d === 0) return "変動なし";
  return `${d > 0 ? "+" : "−"}${formatYenDiffAmount(Math.abs(d) * 1000)}`;
}
function formatPointDiff(cur, prev) {
  const d = Math.round((cur - prev) * 10) / 10;
  if (d === 0) return "変動なし";
  return `${d > 0 ? "+" : "−"}${Math.abs(d)}ポイント`;
}
const kessanDateLabel = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `令和${y - 2018}年${m}月${d}日`;
};

const KESSAN_TERMS = [
  { term: "決算", desc: "1年間（4月1日〜翌年3月31日）の収入と支出の結果をまとめたものです。市は決算を議会に提出し、議会が認定します。年に2回公表する「財政状況」（上の主要指標）は、予算の執行状況と基準日の残高を示すもので、決算とは性格が異なります。" },
  { term: "形式収支", desc: "歳入（1年間の収入）から歳出（1年間の支出）を引いた差額です。翌年度に使うために繰り越すお金も含んでいます。" },
  { term: "実質収支", desc: "形式収支から、翌年度に繰り越して使うお金（繰り越すべき財源）を引いた金額です。その年度の家計簿でいう黒字・赤字に近い指標です。" },
  { term: "単年度収支", desc: "その年度の実質収支から、前年度の実質収支を引いた金額です。実質収支そのものではなく、前年度から実質収支がどれだけ増減したかを示します。" },
  { term: "実質単年度収支", desc: "単年度収支から、基金の積立・取崩など一時的な要素を調整した金額です。原資料の算式は、当年度実質収支−前年度実質収支＋財政調整基金積立額＋地方債繰上償還額−財政調整基金取崩額です。" },
  { term: "財政調整基金", desc: "年度によって収入や支出が大きく動いたときなどに備えて、市が積み立てている基金です。" },
  { term: "出納整理期間", desc: "年度が終わった後、5月31日まで、その年度分の収入・支出を整理する期間です。基金の積立などが、この期間に処理されることがあります。そのため、3月31日現在の基金残高と、決算の年度末残高は異なる場合があります。" },
  { term: "経常収支比率", desc: "毎年の収入のうち、人件費・扶助費・公債費など毎年必ず必要な支出に使われた割合です。比率が小さいほど、臨時の需要に使えるお金の余裕が大きいといえます。" },
  { term: "実質公債費比率", desc: "市債の返済などに使うお金が、市の標準的な収入に対してどのくらいの割合かを示す指標です。3年間の平均で算出されます。" },
  { term: "一般会計・特別会計・普通会計", desc: "一般会計は市の基本的な行政活動の会計、特別会計は国民健康保険などの目的が特定された会計です。普通会計は、全国の自治体を同じ基準で比べるために、一般会計などを組み替えた区分で、基金残高や経常収支比率はこの区分で示されます。" },
];

function zaiseiKessanSection(k) {
  const cur = k.generalAccount.current;
  const prev = k.generalAccount.previous;
  const prevLabel = `令和${k.fiscalYear - 1 - 2018}年度`;
  const curLabel = `令和${k.fiscalYear - 2018}年度`;
  const certified = k.authorization.status === "certified";
  const statusTitle = certified ? "本会議で認定済み" : "市公表・本会議の認定前";
  const statusText = certified
    ? `${k.fiscalYearLabel}の決算は、${kessanDateLabel(k.authorization.certifiedDate)}の本会議で認定されました。`
    : `${k.fiscalYearLabel}の決算は、市が公表した内容です。本会議での認定は、まだ行われていません。${k.authorization.scheduledDate ? `市の議会日程では、${kessanDateLabel(k.authorization.scheduledDate)}に本会議で審議される予定です。` : ""}`;

  const acctRow = (label, key, note = "") =>
    `<tr role="row"><th scope="row" role="rowheader">${escapeHtml(label)}${note ? `<br><small>${escapeHtml(note)}</small>` : ""}</th><td role="cell" data-label="${curLabel}">${formatKessanAmount(cur[key])}</td><td role="cell" data-label="${prevLabel}">${formatKessanAmount(prev[key])}</td><td role="cell" data-label="増減">${formatKessanDiff(cur[key], prev[key])}</td></tr>`;
  const accountRows = [
    acctRow("歳入決算額", "revenue"),
    acctRow("歳出決算額", "expenditure"),
    acctRow("形式収支", "formalBalance", "歳入−歳出"),
    acctRow("翌年度に繰り越すべき財源", "carryoverFunds"),
    acctRow("実質収支", "realBalance", "形式収支−繰り越すべき財源"),
    acctRow("単年度収支", "singleYearBalance", "当年度の実質収支−前年度の実質収支"),
    acctRow("実質単年度収支", "realSingleYearBalance"),
  ].join("\n");

  const f = k.fiscalAdjustmentFund;
  const rd = k.ratios.realDebtServiceRatio;
  const cr = k.ratios.currentAccountRatio;
  const indRow = (label, curText, prevText, diffText) =>
    `<tr role="row"><th scope="row" role="rowheader">${escapeHtml(label)}</th><td role="cell" data-label="${curLabel}">${curText}</td><td role="cell" data-label="${prevLabel}">${prevText}</td><td role="cell" data-label="増減">${diffText}</td></tr>`;
  const indicatorRows = [
    indRow("財政調整基金の年度末残高（決算・出納整理期間後・普通会計）", formatKessanAmount(f.yearEnd), formatKessanAmount(f.previousYearEnd), formatKessanDiff(f.yearEnd, f.previousYearEnd)),
    indRow("基金残高の合計（一般・特別会計合計。出資金及び出捐金を含まない）", formatKessanAmount(k.allFunds.balance), formatKessanAmount(k.allFunds.previousBalance), formatKessanDiff(k.allFunds.balance, k.allFunds.previousBalance)),
    indRow("市債残高（一般・特別会計合計）", formatKessanAmount(k.bonds.balance), formatKessanAmount(k.bonds.previousBalance), formatKessanDiff(k.bonds.balance, k.bonds.previousBalance)),
    indRow("経常収支比率", `${cr.value}%`, `${cr.previous}%`, formatPointDiff(cr.value, cr.previous)),
    indRow(`実質公債費比率${rd.preliminary ? "（速報値）" : ""}`, `${rd.value}%`, `${rd.previous}%`, formatPointDiff(rd.value, rd.previous)),
  ].join("\n");

  const timelineRows = f.timeline
    .map((t) => `<tr><td>${escapeHtml(t.label)}</td><td>${t.isChange ? "+" : ""}${formatYen(t.yen)}</td></tr>`)
    .join("\n");

  const termsHtml = KESSAN_TERMS.map((t) => `<p class="guide-q">${escapeHtml(t.term)}</p><p>${escapeHtml(t.desc)}</p>`).join("\n");
  const sourcesHtml = k.sources
    .map((s) => `<p class="panel-note"><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">→ ${escapeHtml(s.label)}</a>（掲載ページの更新日：${kessanDateLabel(s.pageUpdatedAt)}）</p>`)
    .join("\n");

  return `<div class="panel" id="kessan">
<p class="panel-title">${icon("building")}${escapeHtml(k.fiscalYearLabel)}決算（${statusTitle}）</p>
<div class="rule-card"><strong>${statusTitle}</strong>。${escapeHtml(statusText)}</div>
<p>ここでは、1年間の収入と支出の結果である「決算」を紹介します。上の「主要指標」は、6月・12月に公表される半期ごとの財政状況（予算の執行状況と、基準日の残高）で、性格が異なります。両者の数字を直接比べたり、差を計算したりしないでください。</p>
<p class="today-source">対象：${escapeHtml(k.fiscalYearLabel)}の一般会計の決算。基金・経常収支比率は普通会計、市債残高は一般・特別会計の合計です。原資料の単位は千円で、表示は万円未満を四捨五入しています。</p>

<p class="guide-q">一般会計の決算（${curLabel}と${prevLabel}の比較）</p>
<div class="table-scroll">
<table class="zaisei-table zaisei-table--indicators" role="table">
<caption>${escapeHtml(k.fiscalYearLabel)}一般会計の決算</caption>
<thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">項目</th><th scope="col" role="columnheader">${curLabel}</th><th scope="col" role="columnheader">${prevLabel}</th><th scope="col" role="columnheader">増減</th></tr></thead>
<tbody role="rowgroup">
${accountRows}
</tbody>
</table>
</div>
<p class="today-source">${escapeHtml(`実質収支は${formatKessanAmount(cur.realBalance)}（前年度は${formatKessanAmount(prev.realBalance)}）です。単年度収支の${formatKessanAmount(cur.singleYearBalance)}は、実質収支が前年度から増えた額で、実質収支そのものとは別の数字です。`)}</p>
<p class="today-source">${escapeHtml(`${prevLabel}は、市立病院の建設に充てる寄附金（歳入）と、それに伴う基金への積立（歳出）があり、決算の規模が大きくなっていました。${curLabel}の歳入・歳出の減少には、その反動が含まれると、市の決算概要は説明しています。`)}</p>

<p class="guide-q">基金・比率・市債残高</p>
<div class="table-scroll">
<table class="zaisei-table zaisei-table--indicators" role="table">
<caption>${escapeHtml(k.fiscalYearLabel)}決算の基金・比率・市債残高</caption>
<thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">項目</th><th scope="col" role="columnheader">${curLabel}</th><th scope="col" role="columnheader">${prevLabel}</th><th scope="col" role="columnheader">増減</th></tr></thead>
<tbody role="rowgroup">
${indicatorRows}
</tbody>
</table>
</div>
<p class="today-source">${rd.preliminary ? "実質公債費比率は速報値で、確定値ではありません。" : ""}実質赤字比率・連結実質赤字比率・将来負担比率は、市の資料では赤字や資金不足がないため「－」と表示されています。経常収支比率と実質公債費比率の増減は、ポイント差です。</p>

<p class="guide-q">財政調整基金の基準日の違い</p>
<p>財政調整基金は、基準日によって金額が異なります。半期の財政状況と決算が、別の時点の残高を示しているためです。出納整理期間（年度終了後〜5月31日）に積み立てられた分が、決算の年度末残高に含まれます。</p>
<div class="table-scroll">
<table class="zaisei-table">
<thead><tr><th>基準日・区分</th><th>財政調整基金</th></tr></thead>
<tbody>
${timelineRows}
</tbody>
</table>
</div>
<p class="today-source">${escapeHtml(`${curLabel}中の財政調整基金の取崩しは${f.withdrawalDuringYear === 0 ? "ありません" : formatKessanAmount(f.withdrawalDuringYear)}。`)}半期の財政状況（令和8年6月公表）の「基金及び出資金」は、3月31日現在の基金に出資金及び出捐金を加えた合計で、決算の基金残高（出納整理期間後・出資金を含まない）とは、基準日も範囲も違うため、単純に比較できません。</p>

<p class="guide-q">市債残高の内訳と基準日</p>
<p>${escapeHtml(`決算の市債残高${formatKessanAmount(k.bonds.balance)}は、一般会計${formatKessanAmount(k.bonds.generalAccount)}と宝塚市営霊園事業費${formatKessanAmount(k.bonds.cemeteryAccount)}の合計です（前年度末は${formatKessanAmount(k.bonds.previousBalance)}）。半期の財政状況では、市債残高の基準日が公表期ごとに異なります（たとえば令和7年12月公表は9月30日現在、令和8年6月公表は出納整理期間末現在）。9月末と年度末の差は、年度末どうしの前年比ではありません。`)}</p>

<p class="guide-q">決算の用語</p>
${termsHtml}

<p class="guide-q">出典（宝塚市公式サイト）</p>
${sourcesHtml}
<p class="today-source">${escapeHtml(`${k.fiscalYearLabel}決算の表示は、${kessanDateLabel(k.pageUpdatedAt)}時点の内容です。`)}</p>
</div>`;
}

// 既存の半期の表の下に常に出す注記：基準日・範囲の違いと、比較してよいもの・いけないもの
function zaiseiBasisNotes() {
  const notes = [
    "基金は、3月31日現在の残高と、出納整理期間（年度終了後〜5月31日）を経た決算の年度末残高が異なります。半期の財政状況の基金は基準日現在の残高で、決算の残高はその後に確定します。",
    "市債は、半期の財政状況の項目ごとに基準日を確認する必要があります。たとえば令和7年12月公表は9月30日現在、令和8年6月公表は出納整理期間末現在で、「前回」との増減は同じ基準日どうしの比較ではありません。",
    "「基金及び出資金」は基金に出資金及び出捐金を加えた合計で、決算の基金残高（出資金を含まない・会計範囲も異なる）とは単純に比較できません。",
    "9月末と年度末の比較は、年度末どうしの前年比ではありません。",
  ];
  return notes.map((n) => `<p class="today-source">${escapeHtml(n)}</p>`).join("\n");
}

export function zaiseiWatchPage(periods, siteUrl, kessan = null) {
  const canonicalUrl = `${siteUrl}/category/shigikai/zaisei-watch`;
  const current = periods[0];
  const previous = periods[1];

  const highlightsHtml = current.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("\n");
  const indicatorRows = zaiseiIndicatorRows(current, previous);
  const comparisonNotes = [zaiseiComparisonNotes(current, previous), zaiseiBasisNotes()].filter(Boolean).join("\n");
  const faq = zaiseiFaq(current, kessan);
  const chartSvg = zaiseiChartSvg(current);
  const termsHtml = ZAISEI_TERMS.map((t) => `<p class="guide-q">${escapeHtml(t.term)}</p><p>${escapeHtml(t.desc)}</p>`).join("\n");
  const historyRows = periods
    .map((p, i) => `<tr><td>${escapeHtml(p.publishedLabel)}</td><td>${escapeHtml(p.coverageLabel)}</td><td>${i === 0 ? "今回" : ""}</td></tr>`)
    .join("\n");
  const faqHtml = faq.map((item) => `<p class="guide-q">Q. ${escapeHtml(item.q)}</p><p>${escapeHtml(item.a)}</p>`).join("\n");

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; <a href="${categoryPath("shigikai")}">市議会</a> &gt; 財政ウォッチ</nav>
<div class="page-content">
<div class="panel">
<p class="panel-title">${icon("newspaper")}宝塚市財政ウォッチ</p>
<p>宝塚市では毎年6月・12月に「財政状況」を公表しています。このページでは、市民の皆さまが3〜5分で読めるよう、主要なポイントを分かりやすく整理して紹介します。</p>
<p>本ページの内容は宝塚市公式資料を人が確認しながら要約したものです。数値・事実の整理のみを目的とし、財政運営に対する評価・意見は行いません。</p>
<p class="today-source">対象：${escapeHtml(current.coverageLabel)}（${escapeHtml(current.coverageRange)}）・${escapeHtml(current.publishedLabel)}</p>
</div>

<div class="panel">
<p class="panel-title">${icon("calendar")}今回のポイント</p>
<ul>
${highlightsHtml}
</ul>
</div>

<div class="panel">
<p class="panel-title">${icon("building")}主要指標</p>
${chartSvg}
<div class="table-scroll">
<table class="zaisei-table zaisei-table--indicators" role="table">
<caption>主要指標の今回・前回・増減</caption>
<thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">項目</th><th scope="col" role="columnheader">今回</th><th scope="col" role="columnheader">前回</th><th scope="col" role="columnheader">増減</th></tr></thead>
<tbody role="rowgroup">
${indicatorRows}
</tbody>
</table>
</div>
${comparisonNotes}
<p class="today-source">単位換算・端数処理の都合上、原資料と表示が完全に一致しない場合があります。詳細は出典PDFをご確認ください。</p>
</div>

${kessan ? zaiseiKessanSection(kessan) : ""}

<div class="panel">
<p class="panel-title">${icon("book")}財政用語の解説</p>
${termsHtml}
</div>

<div class="panel">
<p class="panel-title">${icon("clock")}更新履歴</p>
<div class="table-scroll">
<table class="zaisei-table">
<thead><tr><th>公表</th><th>対象期間</th><th>備考</th></tr></thead>
<tbody>
${historyRows}
</tbody>
</table>
</div>
</div>

<div class="panel">
<p class="panel-title">${icon("shield")}よくある質問</p>
${faqHtml}
</div>

<div class="panel">
<p class="panel-title">${icon("newspaper")}出典・関連ページ</p>
<p class="panel-note"><a href="${escapeHtml(current.sourceListUrl)}" target="_blank" rel="noopener">→ 宝塚市公式サイト「財政状況」一覧を見る</a></p>
<p class="panel-note"><a href="${escapeHtml(current.sourceUrl)}" target="_blank" rel="noopener">→ ${escapeHtml(current.publishedLabel)}分のPDFを見る</a></p>
<p class="panel-note"><a href="${categoryPath("shigikai")}">→ 市議会ウォッチ一覧へ</a></p>
<p class="panel-note"><a href="/category/shigikai/guide">→ 市議会のしくみを見る</a></p>
<p class="panel-note"><a href="/category/kurashi/gyousei-tetsuzuki-guide">→ 行政手続きガイドを見る</a></p>
</div>
${recommendedPagesPanel("shigikai", canonicalUrl.replace(siteUrl, ""))}
</div>`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "市議会", item: `${siteUrl}${categoryPath("shigikai")}` },
      { "@type": "ListItem", position: 3, name: "財政ウォッチ", item: canonicalUrl },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return layout({
    title: "宝塚市財政ウォッチ｜財政状況を分かりやすく解説｜Takarazuka Today",
    description: "宝塚市が毎年6月・12月に公表する「財政状況」をもとに、一般会計の予算規模・市税収入・市債残高・基金及び出資金の残高などの主要な財政指標を市民向けにわかりやすく整理して紹介するページです。政治的評価は行わず、公式資料の事実整理のみを行います。",
    bodyHtml,
    canonicalUrl,
    structuredData: [breadcrumbLd, faqLd],
  });
}

// 西阪神吹奏楽コンクール ガイド：西阪神吹奏楽連盟の公式情報（タイムテーブルPDF等）をもとに、宝塚市内出場校を整理して紹介する。結果予想・学校評価は行わない
const SUISOUGAKU_FAQ = [
  {
    q: "西阪神地区大会・県大会・全国大会はどう違うのですか？",
    a: "兵庫県吹奏楽コンクールは、地区大会 → 県大会 → 関西大会 → （部門により）全国大会という順に勝ち進むトーナメント形式です。部門は中学校・高校だけでなく、大学・職場・一般の部もあります。宝塚市内の学校・団体は「西阪神地区」に属しており、まず西阪神地区大会に出場します。本ページは中学校・高校の部門を中心に扱っており、上位大会に進んだ場合の情報は判明次第追記します。",
  },
  {
    q: "県大会へはどうすれば進めますか？",
    a: "地区大会で「地区代表」に選ばれた学校・団体が、そのまま県大会に出場します。代表校数の基準は部門・年度により異なるため、詳細は兵庫県吹奏楽連盟の公式サイトでご確認ください。",
  },
  {
    q: "関西大会とはどのような大会ですか？",
    a: "兵庫県大会を勝ち抜いた学校・団体が、近畿地方の各府県代表として出場する大会です。関西吹奏楽連盟（一般社団法人全日本吹奏楽連盟関西支部）が主催しています。",
  },
  {
    q: "全国大会はいつ開催されますか？",
    a: "全日本吹奏楽コンクールは例年10月下旬〜11月上旬に開催されます。開催日・会場は部門（中学校・高等学校・大学・職場・一般）ごとに異なります。詳細は本ページの「全国大会」欄、または全日本吹奏楽連盟の公式サイトをご確認ください。",
  },
  {
    q: "中学校と高校は別の大会ですか？",
    a: "地区大会・県大会・関西大会・全国大会のいずれも、中学校の部と高等学校の部は別部門として審査・開催されます（開催日や会場が分かれることもあります）。",
  },
  {
    q: "この大会は一般の人も観覧できますか？",
    a: "大会は公開で行われ、当日会場でチケットを購入すれば観覧できます（公式タイムテーブルに「チケット販売」の時間帯が記載されています）。詳細な観覧ルールは西阪神吹奏楽連盟の公式サイトでご確認ください。",
  },
  {
    q: "入場料はいくらですか？",
    a: "具体的な金額は西阪神吹奏楽連盟の公式サイト・当日会場でご確認ください。公式サイトに金額の記載がないため、本ページでは推測の金額は記載していません。",
  },
  {
    q: "出演順（タイムテーブル）はどこで確認できますか？",
    a: "西阪神吹奏楽連盟の公式サイトに、部門・会場ごとのタイムテーブル（PDF）が掲載されています。本ページ末尾の出典リンクからご確認いただけます。",
  },
  {
    q: "結果はいつ・どこで掲載されますか？",
    a: "西阪神地区大会の結果は西阪神吹奏楽連盟の公式サイトに、県大会以降の結果は各大会の主催団体（兵庫県吹奏楽連盟・関西吹奏楽連盟・全日本吹奏楽連盟）の公式サイトに順次掲載されます。本ページでも判明次第追記する予定です。",
  },
  {
    q: "宝塚市内から何校参加しますか？",
    a: "年度によって異なります。本ページの「宝塚市内出場校」の一覧に、公式タイムテーブルで確認できた最新の学校数を掲載しています。",
  },
];

function suisougakuStagePanel(iconName, title, stage, advancedLabel = "上位大会代表") {
  const venuesHtml = stage.yearInfo.venues.map((v) => `<li>${escapeHtml(v)}</li>`).join("\n");
  const hasResults = Array.isArray(stage.takarazukaSchedule) && stage.takarazukaSchedule.some((s) => s.result);
  const scheduleHtml =
    Array.isArray(stage.takarazukaSchedule) && stage.takarazukaSchedule.length > 0
      ? `<p class="guide-q">宝塚市関係校の${hasResults ? "出演スケジュール・結果" : "出演スケジュール"}</p>
<table class="data-table" style="width:100%;border-collapse:collapse;font-size:0.9rem;">
<thead><tr style="background:var(--color-surface-2,#f5f5f5);">
<th style="padding:0.5rem;text-align:left;border-bottom:1px solid var(--color-border,#ddd);">学校名</th>
<th style="padding:0.5rem;text-align:right;border-bottom:1px solid var(--color-border,#ddd);">出演順</th>
<th style="padding:0.5rem;text-align:right;border-bottom:1px solid var(--color-border,#ddd);">舞台時刻</th>
${hasResults ? `<th style="padding:0.5rem;text-align:right;border-bottom:1px solid var(--color-border,#ddd);">賞</th><th style="padding:0.5rem;text-align:right;border-bottom:1px solid var(--color-border,#ddd);">${escapeHtml(advancedLabel)}</th>` : ""}
</tr></thead>
<tbody>
${stage.takarazukaSchedule
  .map(
    (s) =>
      `<tr><td style="padding:0.5rem;border-bottom:1px solid var(--color-border,#ddd);">${escapeHtml(s.name)}</td><td style="padding:0.5rem;text-align:right;border-bottom:1px solid var(--color-border,#ddd);">${escapeHtml(s.order ?? "－")}</td><td style="padding:0.5rem;text-align:right;border-bottom:1px solid var(--color-border,#ddd);">${escapeHtml(s.time ?? "－")}</td>${hasResults ? `<td style="padding:0.5rem;text-align:right;border-bottom:1px solid var(--color-border,#ddd);">${escapeHtml(s.result ?? "結果待ち")}</td><td style="padding:0.5rem;text-align:right;border-bottom:1px solid var(--color-border,#ddd);">${escapeHtml(s.advanced ?? "－")}</td>` : ""}</tr>`
  )
  .join("\n")}
</tbody>
</table>`
      : "";
  const resultLinksHtml = Array.isArray(stage.resultLinks)
    ? stage.resultLinks.map((l) => `<p class="panel-note"><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">→ ${escapeHtml(l.label)}</a></p>`).join("\n")
    : "";
  return `<div class="panel">
<p class="panel-title">${icon(iconName)}${escapeHtml(title)}</p>
<p><strong>${escapeHtml(stage.name)}</strong></p>
<p>${escapeHtml(stage.aboutText)}</p>
<p class="guide-q">${escapeHtml(stage.yearInfo.dateLabel.match(/^\d{4}/)?.[0] ?? "今年")}年の開催時期・会場</p>
<p>${escapeHtml(stage.yearInfo.dateLabel)}</p>
<ul>
${venuesHtml}
</ul>
${scheduleHtml}
<p class="today-source">主催：${escapeHtml(stage.organizerName)}</p>
<p class="panel-note"><a href="${escapeHtml(stage.officialUrl)}" target="_blank" rel="noopener">→ ${escapeHtml(stage.organizerName)}公式サイトを見る</a></p>
${resultLinksHtml}
</div>`;
}

function loadSuisougakuTakarazukaNameSet(takarazukaSchools) {
  return new Set([...takarazukaSchools.juniorHigh, ...takarazukaSchools.highSchool].map((s) => s.name));
}

function loadSuisougakuDistrictDivisionTable(division, takarazukaNames) {
  const rows = division.schools
    .map((s) => {
      const award = s.award ? `${escapeHtml(s.award)}賞${s.best ? "（最優秀）" : ""}` : "－";
      const advanced = division.hasAdvancement ? (s.advanced ? "○" : "－") : "対象外";
      const isTakarazuka = takarazukaNames.has(s.name);
      const nameCell = isTakarazuka
        ? `<span class="takarazuka-tag">宝塚市内</span>${escapeHtml(s.name)}`
        : escapeHtml(s.name);
      return `<tr${isTakarazuka ? ' class="is-takarazuka"' : ""}><td>${s.order}</td><td>${nameCell}</td><td>${award}</td><td>${advanced}</td></tr>`;
    })
    .join("\n");
  return `<p class="guide-q">${escapeHtml(division.label)}（${escapeHtml(division.dateLabel)}）</p>
<div class="table-scroll">
<table class="zaisei-table">
<thead><tr><th>出演順</th><th>学校名・団体名</th><th>賞</th><th>県大会出場</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</div>`;
}

export function suisougakuGuidePage(years, siteUrl) {
  const canonicalUrl = `${siteUrl}/category/kyoiku/suisougaku-guide`;
  const current = years[0];

  const scheduleRows = current.schedule
    .map((s) => `<tr><td>${escapeHtml(s.dateLabel)}</td><td>${escapeHtml(s.venue)}</td><td>${escapeHtml(s.divisions)}</td></tr>`)
    .join("\n");

  const takarazukaNames = loadSuisougakuTakarazukaNameSet(current.takarazukaSchools);
  const resultsNoteHtml = `<p>${escapeHtml(current.results.note)}</p>`;

  const districtResultsHtml = current.districtResults
    ? `${resultsNoteHtml}
<p class="today-source"><span class="takarazuka-tag">宝塚市内</span>のマークが付いた学校が宝塚市内・雲雀丘学園の学校です。</p>
${current.districtResults.divisions.map((d) => loadSuisougakuDistrictDivisionTable(d, takarazukaNames)).join("\n")}
${current.districtResults.pendingNote ? `<p class="note-box">${escapeHtml(current.districtResults.pendingNote)}</p>\n` : ""}<p class="today-source">F部門・C部門は上位大会（県大会）への出場対象外の部門です。</p>`
    : resultsNoteHtml;

  const faqHtml = SUISOUGAKU_FAQ.map((item) => `<p class="guide-q">Q. ${escapeHtml(item.q)}</p><p>${escapeHtml(item.a)}</p>`).join("\n");

  const sourceLinksHtml = current.sourceLinks
    .map((link) => `<p class="panel-note"><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">→ ${escapeHtml(link.label)}</a></p>`)
    .join("\n");

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; <a href="${categoryPath("kyoiku")}">教育</a> &gt; 吹奏楽コンクールガイド</nav>
<div class="page-content">
<div class="panel">
<p class="panel-title">${icon("book")}宝塚市 吹奏楽コンクールガイド</p>
<p>「兵庫県吹奏楽コンクール」は、<strong>地区大会 → 県大会 → 関西大会 → （部門により）全国大会</strong>という順に勝ち進む仕組みになっています。部門は中学校・高校だけでなく、大学・職場・一般の部もあり、宝塚市内では学校の吹奏楽部に加えて市民吹奏楽団（宝塚市吹奏楽団など）も一般の部で出場しています。宝塚市内の学校は「西阪神地区」に属しており、まず西阪神吹奏楽連盟が主催する西阪神地区大会に出場します。<strong>このページでは、このうち中学校・高校の部門を中心に</strong>、宝塚市内の出場校の情報を整理しています。県大会以降の結果も判明次第追記していきます。公式情報の整理のみを目的とし、評価・順位予想は行いません。</p>
<p>学校の部活動だけでなく、市民による「宝塚市吹奏楽団」（1980年発足、約80名が毎週土曜日に市立東公民館で活動するアマチュア吹奏楽団）も、一般の部の団体として全日本吹奏楽コンクールの全国大会に出場した実績があります。宝塚市文化財団は、こうした音楽活動が盛んな様子を「音楽のまち・宝塚」と表現することがあります。</p>
<p class="panel-note"><a href="${escapeHtml(current.officialUrl)}" target="_blank" rel="noopener">→ ${escapeHtml(current.organizerName)}公式サイトを見る</a></p>
<p class="panel-note"><a href="http://www.zukasui.com/" target="_blank" rel="noopener">→ 宝塚市吹奏楽団 公式サイトを見る</a></p>
</div>

<div class="panel">
<p class="panel-title">${icon("newspaper")}コンクール全体の流れ</p>
<p>宝塚市内の学校が出場する吹奏楽コンクールは、以下の順に勝ち進むトーナメント形式です。</p>
<div class="contest-flow">
<div class="contest-flow-step"><div class="contest-flow-label">西阪神地区大会</div><div class="contest-flow-sub">宝塚市内の学校がまず出場</div></div>
<div class="contest-flow-arrow">↓</div>
<div class="contest-flow-step"><div class="contest-flow-label">兵庫県吹奏楽コンクール（県大会）</div></div>
<div class="contest-flow-arrow">↓</div>
<div class="contest-flow-step"><div class="contest-flow-label">関西吹奏楽コンクール（関西大会）</div></div>
<div class="contest-flow-arrow">↓</div>
<div class="contest-flow-step"><div class="contest-flow-label">全日本吹奏楽コンクール（全国大会）</div><div class="contest-flow-sub">部門により出場可否が異なります</div></div>
</div>
</div>

<div class="panel">
<p class="panel-title">${icon("calendar")}${current.year}年の開催概要（西阪神地区大会）</p>
<p><strong>${escapeHtml(current.contestName)}</strong></p>
<div class="table-scroll">
<table class="zaisei-table">
<thead><tr><th>日程</th><th>会場</th><th>部門</th></tr></thead>
<tbody>
${scheduleRows}
</tbody>
</table>
</div>
<p class="today-source">主催：${escapeHtml(current.organizerName)}</p>
</div>

<div class="panel">
<p class="panel-title">${icon("shield")}宝塚市の学校の実績について</p>
<p>${escapeHtml(current.takarazukaAchievementNote)}</p>
</div>

<div class="panel">
<p class="panel-title">${icon("newspaper")}西阪神地区大会 全結果（${current.year}年）</p>
${districtResultsHtml}
<p class="today-source">出典：${escapeHtml(current.organizerName)}公式サイト掲載の公式タイムテーブル・審査結果（PDF）。年度・部門により出場校は変動します。</p>
</div>

${suisougakuStagePanel("building", "兵庫県大会", current.higherStages.prefectural, "関西大会代表")}

${suisougakuStagePanel("building", "関西大会", current.higherStages.kansai, "全国大会代表")}

${suisougakuStagePanel("shield", "全国大会", current.higherStages.national)}

<div class="panel">
<p class="panel-title">${icon("shield")}よくある質問</p>
${faqHtml}
</div>

<div class="panel">
<p class="panel-title">${icon("newspaper")}出典・関連ページ</p>
${sourceLinksHtml}
<p class="panel-note"><a href="${categoryPath("kyoiku")}">→ 教育カテゴリ一覧へ</a></p>
<p class="panel-note"><a href="/category/kyoiku/guide">→ 宝塚市 学校情報ガイドを見る</a></p>
<p class="panel-note"><a href="/category/kurashi/school-admission-guide">→ 学区・高校受験ガイドを見る</a></p>
<p class="panel-note"><a href="/category/kyoiku/bunkasai-guide">→ 高校文化祭ガイドを見る</a></p>
</div>
${recommendedPagesPanel("kyoiku", canonicalUrl.replace(siteUrl, ""))}
</div>`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "教育", item: `${siteUrl}${categoryPath("kyoiku")}` },
      { "@type": "ListItem", position: 3, name: "吹奏楽コンクールガイド", item: canonicalUrl },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SUISOUGAKU_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return layout({
    title: `宝塚市 吹奏楽コンクールガイド｜西阪神地区大会${current.year}年結果・県大会情報｜Takarazuka Today`,
    description: `宝塚市内の中学校・高校が出場する吹奏楽コンクールの西阪神地区大会・兵庫県吹奏楽コンクール・関西吹奏楽コンクール・全日本吹奏楽コンクールという大会の流れと、${current.year}年の西阪神地区大会の結果（賞・県大会出場の有無）を公式発表をもとに整理して紹介するガイドページです。独自の評価・順位予想は行いません。`,
    bodyHtml,
    canonicalUrl,
    structuredData: [breadcrumbLd, faqLd],
  });
}

// 議案採決一覧：宝塚市議会公式サイトの「議案等一覧・審議結果」「議決等結果（議員の賛否）」をもとに作成
const GIAN_RESULT_CLASS = {
  否決: "result-reject",
  不採択: "result-reject",
  継続審査: "result-pending",
  趣旨採択: "result-pending",
  撤回: "result-pending",
  選挙執行: "result-pending",
};
const VOTE_GROUP_ORDER = ["賛成", "反対", "棄権", "欠席", "退席", "議長（表決なし）"];

function gianResultBadgeClass(result) {
  return GIAN_RESULT_CLASS[result] ?? "result-pass";
}

function formatDecidedAtLabel(decidedAt) {
  const [, m, d] = decidedAt.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

function voteDetailHtml(voteBill) {
  if (!voteBill) return "";
  const groups = VOTE_GROUP_ORDER.map((label) => ({
    label,
    members: voteBill.votes.filter((v) => v.vote === label).map((v) => v.member),
  })).filter((g) => g.members.length > 0);

  const groupsHtml = groups
    .map(
      (g) => `<div class="vote-group">
<p class="vote-group-label">${escapeHtml(g.label)}（${g.members.length}名）</p>
<p class="vote-group-members">${g.members.map(escapeHtml).join("　")}</p>
</div>`,
    )
    .join("\n");

  const verifiedBadge = voteBill.verified
    ? `<p class="verified-badge">${icon("shield")}公式PDF確認済</p>`
    : `<p class="unverified-note">※現在、宝塚市議会公式PDFとの照合作業中です。</p>`;

  return `<details class="vote-detail">
<summary>議員別の表決結果を見る</summary>
${verifiedBadge}
${groupsHtml}
<p class="vote-source-note">本データは宝塚市議会が公開する公式PDFをもとに作成しています。</p>
</details>`;
}

function gianCard(bill, voteIndex) {
  const voteBill = voteIndex.get(`${bill.billNumber}|${bill.decidedAt}`);
  const resultClass = gianResultBadgeClass(bill.result);
  const countLine = voteBill
    ? `<p class="gian-count-line">賛成${voteBill.voteCounts["賛成"] ?? 0}・反対${voteBill.voteCounts["反対"] ?? 0}</p>`
    : "";
  const impactHtml = bill.citizenImpact
    ? `<div class="gian-impact"><span class="gian-impact-label">${icon("bell")}市民生活への影響</span>${escapeHtml(bill.citizenImpact)}</div>`
    : "";
  const committeeTag =
    bill.committee && bill.committee !== "－" ? `<span class="committee-tag">${escapeHtml(bill.committee)}</span>` : "";
  const relatedLink = bill.relatedArticleSlug
    ? `<p class="gian-related-link"><a href="/articles/${escapeHtml(bill.relatedArticleSlug)}">→ 関連記事を見る</a></p>`
    : "";
  const detailLink = bill.detailUrl
    ? `<p class="gian-related-link"><a href="${escapeHtml(bill.detailUrl)}" target="_blank" rel="noopener">→ ${escapeHtml(bill.detailLabel ?? "この議案について詳しく見る")}</a></p>`
    : "";

  return `<div class="gian-card">
<div class="gian-head">
<span class="gian-number">${escapeHtml(bill.billNumber)}</span>
<span class="gian-result ${resultClass}">${escapeHtml(bill.result)}${bill.resultDetail ? `<span class="result-detail">（${escapeHtml(bill.resultDetail)}）</span>` : ""}</span>
</div>
${countLine}
<p class="gian-title">${escapeHtml(bill.title)}</p>
${impactHtml}
<div class="gian-meta">${committeeTag}</div>
${relatedLink}
${detailLink}
${voteDetailHtml(voteBill)}
</div>`;
}

export function gianResultPage(sessions, voteIndex, siteUrl) {
  const canonicalUrl = `${siteUrl}/category/shigikai/gian`;

  const sessionsHtml = sessions
    .map((session) => {
      const byDate = new Map();
      for (const bill of session.bills) {
        if (!byDate.has(bill.decidedAt)) byDate.set(bill.decidedAt, []);
        byDate.get(bill.decidedAt).push(bill);
      }
      const dateKeys = [...byDate.keys()].sort((a, b) => (a < b ? 1 : -1));

      const dateGroupsHtml = dateKeys
        .map(
          (date) => `<div class="decision-date-label">${escapeHtml(formatDecidedAtLabel(date))} 議決</div>
${byDate.get(date).map((bill) => gianCard(bill, voteIndex)).join("\n")}`,
        )
        .join("\n");

      return `<div class="session-header">
<div class="session-name">${escapeHtml(session.sessionName)}</div>
<div class="session-date">会期：${escapeHtml(session.sessionTerm)}</div>
</div>${explainerFigure(session.explainerImage)}
${dateGroupsHtml}`;
    })
    .join("\n");

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; <a href="${categoryPath("shigikai")}">市議会</a> &gt; 議案採決一覧</nav>
<div class="page-content">
<h1>議案採決一覧</h1>
<p class="lead">宝塚市議会で審議された議案の採決結果と、市民生活への影響をまとめています。最新の開催回から表示しています。</p>
<p class="lead">このページでは、宝塚市議会で審議された議案の結果を分かりやすく整理しています。議員別の表決結果は、宝塚市議会が公開する公式PDFをもとに掲載しています。</p>
<div class="disclosure-box">本ページの議案・採決結果は宝塚市公式サイトの公開情報をもとに作成しています。市民生活への影響の説明は事実の整理のみを目的とし、議案・議員への評価や賛否の意見は記載しません。</div>
<div class="disclosure-box">議員別の表決結果は、宝塚市議会が公開する「議員の賛否」PDFが議案ごとに発行された後に掲載します。賛成多数・反対多数など採決が分かれた議案でも、PDFがまだ公開されていない場合は議員別の表決結果が表示されません。公開後、随時更新します。</div>
${sessionsHtml || '<p class="empty-state">まだ掲載できる議案がありません</p>'}
<p class="panel-note"><a href="${categoryPath("shigikai")}">→ 市議会ウォッチ一覧へ</a>　<a href="/category/shigikai/guide">→ 市議会のしくみへ</a></p>
<p class="source-note">出典：宝塚市議会「議案等一覧・審議結果」「議決等結果（電子採決システムによる投票における賛否）」（各議案の詳しい出典は議案カード内のリンクをご確認ください）</p>
${recommendedPagesPanel("shigikai", canonicalUrl.replace(siteUrl, ""))}
</div>`;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "議案採決一覧｜Takarazuka Today",
    url: canonicalUrl,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "市議会", item: `${siteUrl}${categoryPath("shigikai")}` },
      { "@type": "ListItem", position: 3, name: "議案採決一覧", item: canonicalUrl },
    ],
  };

  return layout({
    title: "議案採決一覧｜Takarazuka Today",
    description: "宝塚市議会で審議された議案の採決結果（可決・否決等）と、市民生活への影響をご案内します。",
    bodyHtml,
    canonicalUrl,
    structuredData: [collectionLd, breadcrumbLd],
  });
}

// ガイド本文の1要素。文字列は従来どおりrule-card、オブジェクトは現地取材写真（photo）と小見出し（subheading）
// ガイドの表。セルは記事の比較表と同じ tableCellHtml で描画し、任意HTMLは出さない（形は guide-schema.js が検証済み）
// stacked: スマホで行をカード状に積む表にする（guide.visual のガイドだけ。data-label は積んだときの項目名）
function guideTableHtml(table, { stacked = false } = {}) {
  const caption = table.caption ? `<caption>${escapeHtml(table.caption)}</caption>` : "";
  const head = table.headers.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join("");
  // 2列の表は先頭列が項目名なので、積んだときの項目名ラベルは3列以上のときだけ付ける
  const label = (i) => (stacked && table.headers.length > 2 ? ` data-label="${escapeHtml(table.headers[i])}"` : "");
  const body = table.rows
    .map((row) => `<tr>${row.map((cell, i) => (i === 0 ? `<th scope="row">${tableCellHtml(cell)}</th>` : `<td${label(i)}>${tableCellHtml(cell)}</td>`)).join("")}</tr>`)
    .join("\n");
  return `<div class="table-scroll"><table class="guide-table${stacked ? " guide-table--stack" : ""}">${caption}
<thead><tr>${head}</tr></thead>
<tbody>
${body}
</tbody>
</table></div>`;
}

function guideItemHtml(item, opts) {
  if (typeof item === "string") return `<div class="rule-card">${item}</div>`;
  if (item.table) return guideTableHtml(item.table, opts);
  if (item.subheading) return `<h3 class="guide-subheading">${escapeHtml(item.subheading)}</h3>`;
  return photoFigureHtml(item.photo);
}

// 現地取材写真。ガイドと記事で同じ見た目にする
function photoFigureHtml(p) {
  const portraitClass = p.height > p.width ? " guide-photo--portrait" : "";
  return `<figure class="guide-photo${portraitClass}"><img src="${escapeHtml(p.src)}" width="${p.width}" height="${p.height}" alt="${escapeHtml(p.alt)}" loading="lazy" decoding="async"><figcaption>${escapeHtml(p.caption)}</figcaption></figure>`;
}

// 困ったときに最初に見る連絡先カード（guide.contactCards を持つガイドだけ）。番号と用途はHTMLテキストで出し、
// 色だけで区別しないよう、各カードにアイコンと種別ラベルを付ける。電話リンクは誤発信を避けるため付けない
function contactCardsHtml(c) {
  if (!c) return "";
  return `<section class="contact-cards" aria-labelledby="contact-cards-title">
<h2 id="contact-cards-title">${icon("alert")}${escapeHtml(c.heading)}</h2>
<ul class="contact-cards-list">
${c.cards
  .map(
    (card) => `<li class="contact-card">
<p class="contact-card-tag">${icon(card.icon)}${escapeHtml(card.tag)}</p>
<p class="contact-card-number">${escapeHtml(card.number)}</p>
<p class="contact-card-use">${escapeHtml(card.use)}</p>
<p class="contact-card-detail">${escapeHtml(card.detail)}</p>
</li>`,
  )
  .join("\n")}
</ul>
${c.note ? `<p class="contact-cards-note">${escapeHtml(c.note)}</p>` : ""}
</section>
`;
}

// 目的別の入口カード（guide.quickLinks を持つガイドだけ）。同じページ内の節へのリンクで、
// 見出しと一覧の見た目は連絡先カードと共通。アイコンとラベルを併記し、色だけに頼らない
function quickLinksHtml(q) {
  if (!q) return "";
  return `<nav class="contact-cards quick-links" aria-labelledby="quick-links-title">
<h2 id="quick-links-title">${icon("search")}${escapeHtml(q.heading)}</h2>
<ul class="contact-cards-list">
${q.links
  .map(
    (l) => `<li><a class="quick-link" href="${escapeHtml(l.href)}">
<span class="quick-link-icon">${icon(l.icon)}</span>
<span class="quick-link-body"><span class="quick-link-tag">${escapeHtml(l.tag)}</span><span class="quick-link-title">${escapeHtml(l.title)}</span><span class="quick-link-desc">${escapeHtml(l.desc)}</span></span>
</a></li>`,
  )
  .join("\n")}
</ul>
</nav>
`;
}

// 検索流入向けの常設ガイドページ（ごみ出し・子育て支援・防災・学校情報など）
// ニュース記事ではなく評価性のない常設リファレンス情報のため、記事スキーマとは別に専用ページとして実装する
export function guidePage(guide, siteUrl) {
  const canonicalUrl = `${siteUrl}/category/${guide.categoryKey}/${guide.slug}`;
  const guideAdsAllowed = adsAllowedFor({ category: guide.category?.label ?? "", pathname: `/category/${guide.categoryKey}/${guide.slug}` });

  const tocHtml = `<div class="toc">
<p class="toc-title">${icon("newspaper")}目次</p>
<ol>${guide.toc.map((t) => `<li><a href="#${escapeHtml(t.id)}">${escapeHtml(t.label)}</a></li>`).join("\n")}</ol>
</div>`;

  const sectionsHtml = guide.sections
    .map(
      (s) => `<section class="guide-section" id="${escapeHtml(s.id)}">
<h2>${icon(s.icon ?? guide.category.icon)}${escapeHtml(s.heading)}</h2>
${s.items.map((item) => guideItemHtml(item, { stacked: Boolean(guide.visual) })).join("\n")}
${(s.notes ?? []).map((note) => `<div class="note-box">${escapeHtml(note)}</div>`).join("\n")}
</section>`,
    )
    .join("\n");

  const faqHtml = `<section class="guide-section" id="faq">
<h2>${icon("bell")}よくある質問</h2>
${guide.faq
  .map(
    (f) => `<div class="faq-item">
<div class="faq-q">${escapeHtml(f.q)}</div>
<div class="faq-a">${f.a}</div>
</div>`,
  )
  .join("\n")}
</section>`;

  const relatedHtml = `<section class="guide-section">
<h2>${icon("newspaper")}関連リンク</h2>
<div class="related-links">
${guide.relatedLinks.map((l) => `<a href="${escapeHtml(l.href)}">${escapeHtml(l.label)} →</a>`).join("\n")}
</div>
</section>`;

  const disclosureHtml = guide.disclosure ? `<div class="disclosure-box">${escapeHtml(guide.disclosure)}</div>` : "";
  const heroPhotoHtml = guide.cardPhoto
    ? `<div class="guide-hero-photo"><img src="${escapeHtml(guide.cardPhoto)}" alt="${escapeHtml(guide.cardPhotoAlt ?? guide.title)}" loading="lazy"></div>${guide.photoCredit ? `<p class="photo-credit">${guide.photoCredit}</p>` : ""}`
    : "";

  const fieldReportHtml = guide.fieldReport ? `<p class="field-report-note">${guide.fieldReport.map(escapeHtml).join("<br>")}</p>` : "";

  const changelogHtml = guide.changelog && guide.changelog.length > 0
    ? `<div class="changelog">
<p class="changelog-title">${icon("clock")}更新履歴</p>
<ul class="changelog-list">
${guide.changelog.map((c) => `<li><span class="changelog-date">${escapeHtml(c.date)}</span>${escapeHtml(c.note)}</li>`).join("\n")}
</ul>
</div>`
    : "";

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; <a href="${categoryPath(guide.category.key)}">${escapeHtml(guide.category.label)}</a> &gt; ${escapeHtml(guide.title)}</nav>
<div class="page-content${guide.visual ? " guide-visual" : ""}">
<h1>${escapeHtml(guide.title)}</h1>${fieldReportHtml}
${heroPhotoHtml}
${contactCardsHtml(guide.contactCards)}${quickLinksHtml(guide.quickLinks)}<p class="lead">${escapeHtml(guide.lead)}</p>
${disclosureHtml}
<p class="updated-at">最終更新：${escapeHtml(guide.updatedAt)}</p>
${changelogHtml}
${tocHtml}
${sectionsHtml}
${faqHtml}
${relatedHtml}
<p class="source-note">出典：<a href="${escapeHtml(guide.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(guide.sourceLabel)}</a>（公式情報をもとに編集部が整理しています。正式な内容・最新情報は出典元もあわせてご確認ください）</p>
${adSlot("guideBottom", guideAdsAllowed)}
${recommendedPagesPanel(guide.categoryKey, canonicalUrl.replace(siteUrl, ""))}
</div>`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: guide.category.label, item: `${siteUrl}${categoryPath(guide.category.key)}` },
      { "@type": "ListItem", position: 3, name: guide.title, item: canonicalUrl },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a.replace(/<[^>]*>/g, "") },
    })),
  };

  return layout({
    title: `${guide.title}｜Takarazuka Today`,
    description: guide.lead,
    bodyHtml,
    canonicalUrl,
    structuredData: [breadcrumbLd, faqLd],
    // cardPhotoを持つガイドはOGP画像として自動設定される（宝塚歌劇・阪神競馬場・手塚治虫記念館・中山寺・清荒神清澄寺等）
    ogImage: guide.cardPhoto ?? null,
    adsAllowed: guideAdsAllowed,
  });
}


// フェーズ7：収益化の土台整備として追加した運営系の固定ページ共通レイアウト
function staticInfoPage({ slug, breadcrumbLabel, title, description, panelTitle, panelIcon, contentHtml, siteUrl, ogImage = null }) {
  const canonicalUrl = `${siteUrl}/${slug}`;

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; ${escapeHtml(breadcrumbLabel)}</nav>
<div class="page-content">
<div class="panel">
<h1 class="panel-title">${icon(panelIcon)}${escapeHtml(panelTitle)}</h1>
${contentHtml}
</div>
</div>`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: breadcrumbLabel, item: canonicalUrl },
    ],
  };

  return layout({
    title: `${title}｜Takarazuka Today`,
    description,
    bodyHtml,
    canonicalUrl,
    structuredData: breadcrumbLd,
    ogImage,
  });
}

export function privacyPage(siteUrl) {
  const contentHtml = `
<p class="updated-at">最終更新日：2026年8月28日</p>
<p>「Takarazuka Today（宝塚Today）」（以下「本サイト」）における、個人情報および利用者情報の取り扱いについて説明します。</p>

${staticSectionHeading("アクセス解析について")}
<p>本サイトでは、Cloudflare Web Analyticsを利用してアクセス状況を解析しています。Cloudflare Web Analyticsは、Cookieを使用せず、個人を特定する情報を収集しない方式のアクセス解析サービスです。Google Analytics等、Cookieを用いるアクセス解析サービスは現時点で導入していません。</p>

${staticSectionHeading("Cookie・localStorageについて")}
<p>本サイトでは、ダークモード表示設定を保存するために、お使いの端末のlocalStorageを利用しています。この情報は、利用者を識別または追跡する目的では使用していません。</p>

${staticSectionHeading("Google AdSense（第三者配信広告）について")}
<p>本サイトは、Google AdSenseへの掲載審査に必要な基礎スクリプトを設置していますが、本ページの最終更新時点（2026年8月28日）では広告ユニットは設置しておらず、広告は表示されていません。</p>
<p>Google公式のCookie利用に関する説明によれば、Cookieは広告の表示・クリックなど、Googleサーバーへの呼び出しを伴う操作の際に送信されるとされています。本サイトでは広告ユニットを表示していないため、通常はこれに該当する動作は発生しませんが、広告配信ネットワークに関する技術的な通信の性質上、Cookie等の送信が完全に発生しないことを保証するものではありません。</p>
<p>今後、広告の表示を開始した場合、Googleを含む第三者配信事業者は、利用者が本サイトや他のウェブサイトを訪問した際の履歴に基づいて広告を配信するために、Cookieその他の技術を使用することがあります。これにより、利用者の興味・関心に応じた広告（パーソナライズ広告）が表示される場合があります。</p>
<p>利用者は、Googleの<a href="https://adssettings.google.com/" target="_blank" rel="noopener">広告設定</a>ページから、Googleによるパーソナライズ広告の表示を無効にできます。Google以外の第三者配信事業者についても、<a href="https://optout.aboutads.info/" target="_blank" rel="noopener">www.aboutads.info</a>から一括してオプトアウトを設定できる場合があります。</p>
<p>本サイトで実際に広告配信を開始する場合は、開始時点で本ページを更新し、その旨と当時点の実装内容を明記します。</p>

${staticSectionHeading("外部サイトへのリンクについて")}
<p>本サイトの記事には、宝塚市、兵庫県、兵庫県警察などの出典元サイトへの外部リンクが含まれます。リンク先サイトにおける個人情報の取り扱いについては、本サイトは関与せず、各リンク先サイトのプライバシーポリシーが適用されます。</p>

${staticSectionHeading("お問い合わせ情報の取り扱いについて")}
<p>お問い合わせフォームなどを通じて提供された情報は、お問い合わせへの対応および必要な確認のために利用します。取得した情報を、本人の同意なく第三者へ提供することはありません。ただし、法令に基づく場合を除きます。</p>

${staticSectionHeading("本ポリシーの変更について")}
<p>本ポリシーは、必要に応じて予告なく変更することがあります。変更後の内容は、本ページに掲載した時点から適用されます。</p>
`;

  return staticInfoPage({
    slug: "privacy",
    breadcrumbLabel: "プライバシーポリシー",
    title: "プライバシーポリシー",
    description: "Takarazuka Todayにおけるアクセス解析・Cookie・将来の広告配信・外部リンク・お問い合わせ情報の取り扱いについて説明します。",
    panelTitle: "プライバシーポリシー",
    panelIcon: "newspaper",
    contentHtml,
    siteUrl,
  });
}

export function aboutPage(siteUrl) {
  const contentHtml = `
<p>本サイトは宝塚市の公式サイトではありません。宝塚市に関する情報を個人が整理してお届けしている地域情報サイトです。制度・手続きの正式な内容は、各ページの出典元（宝塚市公式サイトなど）でご確認ください。</p>

${staticSectionHeading("サイト名")}
<p>Takarazuka Today（宝塚Today）</p>

${staticSectionHeading("目的")}
<p>宝塚市、兵庫県、兵庫県警察などが公開する情報を、宝塚市にお住まいの方や宝塚市に関わりのある方に向けて、分かりやすく整理してお届けすることを目的としています。</p>

${staticSectionHeading("編集方針")}
<p>行政・くらしの情報、防犯・防災情報、市議会の動き、イベント情報などを扱います。宝塚市や兵庫県などが公開する一次情報を主な情報源とし、地域ニュースの要点整理に加え、複数の公式情報をまとめたガイドや比較・一覧情報などを掲載しています。原文の転載は行わず、詳細・正式な内容を確認できるよう出典を明記します。事実に基づく内容を扱い、推測や誇張した表現は避けます。市議会に関する記事では、議員、会派、議案などへの政治的な評価や優劣判断は行わず、公開情報をもとにした事実ベースの要約を行います。PR記事や広告掲載枠については、通常記事と区別できるよう「PR」「広告」などの表記を行います。</p>
<p>一部のガイドでは、運営者が現地を訪れて撮影した写真や、現地で確認した様子を掲載しています（<a href="/category/kanko/kiyoshikojin-guide">清荒神清澄寺</a>・<a href="/category/kanko/nakayamadera-guide">中山寺</a>・<a href="/category/kanko/aiaipark-guide">あいあいパーク</a>・<a href="/category/kanko/dahlia-en-guide">宝塚ダリア園</a>の各ガイド）。現地で確認した内容には取材日を記載し、公式情報と区別しています。また、宝塚市議会が公開する議決結果を会期ごとに一覧にした「<a href="/category/shigikai/gian">議案採決一覧</a>」や、市が公表する財政状況の要点を整理した「<a href="/category/shigikai/zaisei-watch">財政ウォッチ</a>」など、公式情報を独自に整理したページも掲載しています。</p>
<p>掲載期間が終了し、継続して読む価値が失われた情報は、公開を終了する場合があります。また、出典元のページが削除・差し替えされた場合や、原典で確認できない記述が判明した場合は、出典の差し替え、本文の修正、または公開終了を行います。内容を更新した記事・ガイドには、更新日を表示しています。</p>

${staticSectionHeading("情報源")}
<p>宝塚市公式サイト、兵庫県公式サイト、兵庫県警察、宝塚市議会公式サイト・会議録、各種公式PDF資料などの一次情報を情報源としています。記事・ガイドページには出典元へのリンクを必ず明記しています。最新かつ正確な情報は、各出典元の公式サイトでご確認ください。</p>

${staticSectionHeading("引用ポリシー")}
<p>出典元の文章をそのまま転載することはせず、内容を要約・言い換えたうえで掲載しています。図表・データを参照する場合も、独自にまとめ直した形で掲載し、出典を明記します。</p>

${staticSectionHeading("AI利用方針")}
<p>本サイトは、記事の要約作成やガイドページの整理に生成AI（Claude／Anthropic社）を活用しています。AIが生成した内容は、公開前に必ず運営者が内容を確認しています。市議会に関する記事では、AIによる政治的評価や賛否の判断は行わない方針とし、生成過程を「AI要約・編集確認済」等のバッジで明記しています。完全自動での記事公開は行わず、人によるレビューを経て掲載しています。</p>

${staticSectionHeading("運営体制")}
<p>本サイトは個人により運営しています。運営者個人の氏名、所在地、電話番号については、プライバシー保護の観点から公開していません。記事では、サイト上の編集名義として「Takarazuka Today編集部」を使用しています。</p>

${staticSectionHeading("更新方針")}
<p>原則として平日は毎日更新しています。災害・緊急情報は確認でき次第更新します。常設ガイドページは年数回を目安に内容を見直し、実際に確認した内容のみを反映しています（内容の変更を伴わない日付のみの更新は行いません）。</p>

${staticSectionHeading("免責事項")}
<p>本サイトの内容は、情報提供を目的としたものであり、内容の完全性・正確性・最新性を保証するものではありません。掲載情報を利用したことにより生じたいかなる損害についても、本サイトは責任を負いかねます。制度・手続き等の詳細は、必ず各出典元の公式情報をご確認ください。</p>

${staticSectionHeading("内容の誤りについて")}
<p>記事内容に誤りや古い情報が含まれている場合は、<a href="/contact">お問い合わせページ</a>からご連絡ください。確認のうえ、必要に応じて訂正、追記、または掲載内容の見直しを行います。</p>
`;

  return staticInfoPage({
    slug: "about",
    breadcrumbLabel: "運営者情報",
    title: "運営者情報",
    description: "Takarazuka Todayのサイト名・目的・編集方針・運営体制について説明します。",
    panelTitle: "運営者情報",
    panelIcon: "building",
    contentHtml,
    siteUrl,
  });
}

// 案内役「たから まどか」「たからワン」の紹介。キャラクター画像は assets/characters/ の正式原画をそのまま表示する
export const GUIDE_CHARACTERS_SLUG = "takara-madoka-takara-wan";
export const GUIDE_CHARACTERS_TITLE = "宝塚Todayに案内役が登場　「たから まどか」と柴犬の「たからワン」を紹介します";
export const GUIDE_CHARACTERS_DESCRIPTION =
  "宝塚Todayの新しい案内役「たから まどか」と柴犬の「たからワン」を紹介します。市政や議会などの情報を3〜4ポイントで分かりやすく整理し、まどかは全体像、たからワンは数字・日付・注意点を担当します。";

export function guideCharactersPage(siteUrl) {
  const contentHtml = `
<p class="updated-at">公開日：2026年10月16日</p>
<div class="chara-intro">
<figure class="chara-card"><img src="/characters/takara-madoka.webp" width="1122" height="1402" alt="案内役のたから まどか。本を抱えて手で案内しているイラスト"><figcaption>たから まどか</figcaption></figure>
<figure class="chara-card"><img src="/characters/takara-wan.webp" width="1122" height="1402" alt="まどかの相棒、柴犬のたからワン。青いバンダナを着けて前足を上げているイラスト"><figcaption>たからワン（柴犬）</figcaption></figure>
</div>

${staticSectionHeading("「難しい情報を、まず3〜4ポイントで」")}
<p>宝塚Todayでは、宝塚市の行政情報や市議会の内容をできるだけ丁寧に紹介しています。一方で、市の資料や議会の議論は情報量が多く、「どこから読めばいいのか分からない」と感じる内容もあります。</p>
<p>そこで、長い記事を読む前に重要なポイントをつかめるよう、記事冒頭に3〜4項目の解説画像を掲載する取り組みを始めました。その案内役を務めるのが、「たから まどか」と「たからワン」です。</p>

${staticSectionHeading("たから まどか")}
<p>宝塚Todayの案内役。市政や議会などの情報について、「この記事では何が重要なのか」「全体として何が起きているのか」を整理して伝える役目です。</p>
<p>落ち着いて情報を整理し、難しい内容でもできるだけ身近な言葉で案内します。</p>

${staticSectionHeading("たからワン")}
<p>まどかの相棒を務める柴犬です。</p>
<p>数字、日付、締め切り、変更点など、「ここは見落としたくない」というポイントを担当します。記事の中で重要な数字や予定があるときは、たからワンの出番です。</p>

${staticSectionHeading("2人で役割分担")}
<p>まどかが「全体像」、たからワンが「数字・日付・注意点」。</p>
<p>この役割分担で、まず記事の要点を確認し、その後に本文で詳しい内容を読める構成を目指します。</p>

${staticSectionHeading("最初に登場したのは市議会の記事")}
<p>今回、この形式を最初に導入したのは、市議会に関する記事です。</p>
<ul class="related-links">
<li><a href="/articles/gikai-2026-09-discussion">9月定例会の主な論点</a></li>
<li><a href="/articles/shin-byoin-gikai-2026">新市立病院</a></li>
<li><a href="/category/shigikai/gian">議案採決一覧</a></li>
<li><a href="/articles/gikai-iken-kokan-2026-11-08">第16回意見交換会</a></li>
</ul>
<p>の記事で、まどかとたからワンによる解説画像を掲載しています。</p>
<p>市議会の記事は重要な情報が多い一方、どうしても長くなりやすいため、最初に要点を見られる形にしました。</p>

${staticSectionHeading("キャラクターがいても、情報の確認方法は変わりません")}
<p>まどかとたからワンは、情報を分かりやすく伝えるための案内役です。</p>
<p>宝塚Todayでは今後も、宝塚市や宝塚市議会などの公的な一次情報を優先し、事実と推測を分けて記事を作ります。日時、場所、金額、対象範囲などの重要な情報についても、これまでと同じように確認した上で掲載します。</p>
<p>キャラクターを通じて親しみやすくしながら、情報そのものの正確さは変えない。そんな形で続けていきます。</p>

${staticSectionHeading("これから登場する記事も増やしていきます")}
<p>市議会だけでなく、制度変更や教育、生活に関わるテーマなど、内容を整理した方が分かりやすい記事で登場してもらう予定です。</p>
<p>宝塚Todayの記事でこの一人と一匹を見かけたら、「まずここを見れば大事なところが分かる」という目印にしてもらえればと思います。</p>
`;

  return staticInfoPage({
    slug: GUIDE_CHARACTERS_SLUG,
    breadcrumbLabel: "宝塚Todayの案内役",
    title: GUIDE_CHARACTERS_TITLE,
    description: GUIDE_CHARACTERS_DESCRIPTION,
    panelTitle: GUIDE_CHARACTERS_TITLE,
    panelIcon: "user",
    contentHtml,
    siteUrl,
    ogImage: "/photos/takara-madoka-takara-wan-1200x630.webp",
  });
}

// 現地取材フォト（/photo）。宝塚Todayが現地で撮影した写真だけを、場所ごとに取材日とガイドへのリンクつきで並べる。
// gallery は home-features.js の buildFieldReportGallery で組み立てたもの（写真・キャプション・取材日はガイドのデータ）
export const FIELD_PHOTO_SLUG = "photo";
// 一覧の写真は縮小版を表示し、タップで元画像を開けるようにする。
// 最初の1枚だけは初回表示に入るため lazy にせず優先して読み込む
function galleryFigureHtml(p, isFirst) {
  const loading = isFirst ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<figure class="guide-photo"><a href="${escapeHtml(p.src)}"><img src="${escapeHtml(p.thumb)}" width="${p.width}" height="${p.height}" alt="${escapeHtml(p.alt)}" ${loading} decoding="async"></a><figcaption>${escapeHtml(p.caption)}</figcaption></figure>`;
}

export function photoGalleryPage(gallery, siteUrl) {
  const sections = gallery
    .map((g, gi) => {
      const figures = g.photos.map((p, pi) => galleryFigureHtml(p, gi === 0 && pi === 0)).join("\n");
      const articleLink = g.article ? `　<a href="${escapeHtml(g.article.href)}">${escapeHtml(g.article.label)} →</a>` : "";
      return `${staticSectionHeading(g.place)}
<p class="photo-gallery-meta">現地取材：${escapeHtml(g.reportedOn)}・写真：宝塚Today撮影</p>
<div class="photo-gallery">
${figures}
</div>
<p class="panel-note"><a href="${escapeHtml(g.href)}">${escapeHtml(g.guideTitle)}で詳しく見る →</a>${articleLink}</p>`;
    })
    .join("\n");
  const contentHtml = `
<p>宝塚Todayが実際に現地を訪れて撮影した写真を、場所ごとにまとめています。それぞれの場所のアクセスや見どころは、リンク先のガイドで詳しく紹介しています。</p>
<p class="panel-note">このページに載せているのは宝塚Todayが撮影した写真だけです。宝塚市オープンデータなど、提供を受けた写真は含めていません。</p>
${sections}
`;
  return staticInfoPage({
    slug: FIELD_PHOTO_SLUG,
    breadcrumbLabel: "現地取材フォト",
    title: "現地取材フォト",
    description: `宝塚Todayが現地で撮影した宝塚市内の写真を、場所ごとに取材日とあわせてまとめました（${gallery.map((g) => g.place).join("・")}）。`,
    panelTitle: "現地取材フォト",
    panelIcon: "camera",
    contentHtml,
    siteUrl,
    ogImage: gallery[0]?.photos[0]?.src ?? null,
  });
}

export function adPolicyPage(siteUrl) {
  const contentHtml = `
<p>本サイト「Takarazuka Today（宝塚Today）」では、掲載する情報を以下のように区別しています。</p>

${staticSectionHeading("現在の広告掲載について")}
<p>現在、本サイトでは広告の募集は行っておりません。将来的には、地域の企業・店舗の皆様に向けた広告掲載枠を設けることを予定しています。これは地域経済の活性化に貢献することを目的とした取り組みで、開始時期・掲載条件が決まり次第、本ページでお知らせします。掲載にご関心をお持ちの場合は、<a href="/contact">お問い合わせページ</a>からご連絡ください。</p>

${staticSectionHeading("第三者配信広告について")}
<p>本サイトでは、Google AdSenseなどの第三者配信広告を利用する場合があります。広告配信にともなうCookieの取り扱いや、パーソナライズ広告を無効にする方法については、<a href="/privacy">プライバシーポリシー</a>をご確認ください。</p>
<p>第三者配信広告は、広告配信事業者の仕組みによって自動的に表示されるもので、上記の地域企業・店舗向けの広告掲載枠とは別のものです。第三者配信広告の表示によって、記事・ガイドの編集内容が変わることはありません。</p>

${staticSectionHeading("通常記事")}
<p>宝塚市、兵庫県、兵庫県警察などの公的機関が公開している一次情報をもとに、編集部が市民生活への影響や利用時に必要な情報を整理して掲載している記事です。正式な内容や最新情報は、記事内の出典もあわせてご確認ください。通常記事は、広告主や第三者からの依頼によって内容が左右されることはありません。</p>

${staticSectionHeading("店舗・団体提供情報")}
<p>店舗、企業、団体などから提供された情報をもとに掲載する情報です。掲載の可否は編集部が判断します。情報提供をいただいた場合でも、掲載を保証するものではありません。内容に誤りがないか確認するため、必要に応じて提供元へ確認を行う場合があります。</p>

${staticSectionHeading("PR記事・広告掲載枠")}
<p>対価を受けて掲載する記事または広告枠です。PR記事・広告掲載枠には、<span class="badge-ai-editorial" style="background:#c8102e;">PR</span> ・ <span class="badge-ai-editorial" style="background:#c8102e;">広告</span> などの表記を付け、通常記事と区別します。また、必要に応じて広告主・提供者の名称を明記します。</p>

${staticSectionHeading("編集の独立性について")}
<p>有料掲載であっても、事実と異なる内容、根拠のない表現、誇張した表現は掲載しません。広告主・提供者には、事実誤認がないか確認を依頼する場合がありますが、掲載内容の最終判断は編集部が行います。</p>

${staticSectionHeading("防災・緊急情報との分離")}
<p>避難情報、気象警報、防災情報、緊急のお知らせなどには、広告・PR要素を混在させません。</p>

${staticSectionHeading("掲載をお断りする内容")}
<p>以下に該当する、またはそのおそれがある内容は掲載をお断りします。</p>
<div class="rule-card">虚偽または誤認を招く内容</div>
<div class="rule-card">根拠のない効果・実績・比較表現</div>
<div class="rule-card">公序良俗に反する内容</div>
<div class="rule-card">法令または各種ガイドラインに違反する内容</div>
<div class="rule-card">第三者の権利を侵害する内容</div>
<div class="rule-card">本サイトの編集方針に合わない内容</div>

${staticSectionHeading("掲載可否の決定")}
<p>掲載の可否は、本サイト編集部の判断により決定します。掲載をお断りする場合、理由を個別にお伝えできない場合があります。</p>

${staticSectionHeading("お問い合わせ")}
<p>掲載情報の提供、PR記事、広告掲載に関するお問い合わせは、<a href="/contact">お問い合わせページ</a>からご連絡ください。</p>
`;

  return staticInfoPage({
    slug: "ad-policy",
    breadcrumbLabel: "PR・広告掲載ポリシー",
    title: "PR・広告掲載ポリシー",
    description: "Takarazuka Todayにおける通常記事・店舗提供情報・PR記事・広告掲載枠の区別と、掲載に関する編集方針を説明します。",
    panelTitle: "PR・広告掲載ポリシー",
    panelIcon: "shield",
    contentHtml,
    siteUrl,
  });
}

// Cloudflare Pagesは公開ルート直下の404.htmlを、未マッチURLに対してHTTP 404で自動的に返す。
// このページが無い場合はindex.htmlが200で返る（ソフト404）ため、404.htmlの生成自体が是正手段になる。
// noindexを付け、sitemap・検索インデックス・ナビ導線には載せない。
export function notFoundPage(siteUrl) {
  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; ページが見つかりません</nav>
<div class="page-content">
<div class="panel">
<h1 class="panel-title">${icon("search")}ページが見つかりません</h1>
<p>お探しのページは見つかりませんでした。URLが変更されたか、掲載期間が終了した可能性があります。</p>
<p>お探しの情報は、トップページまたはサイト内検索からお探しください。</p>
<ul class="related-links">
<li><a href="/">トップページ</a></li>
<li><a href="/search">サイト内検索</a></li>
</ul>
</div>
</div>`;

  return layout({
    title: "ページが見つかりません｜Takarazuka Today",
    description: "お探しのページは見つかりませんでした。トップページまたはサイト内検索からお探しください。",
    bodyHtml,
    canonicalUrl: `${siteUrl}/404`,
    adsAllowed: adsAllowedFor({ pathname: "/404" }),
    noindex: true,
  });
}

const CONTACT_CATEGORIES = ["記事内容の訂正・削除依頼", "情報提供", "PR・広告掲載の相談", "その他"];

export function contactPage(siteUrl, turnstileSiteKey) {
  const contentHtml = turnstileSiteKey
    ? `
<noscript><style>#contact-form{display:none}</style><p class="contact-form-status">お問い合わせフォームの送信にはJavaScriptが必要です。ブラウザの設定でJavaScriptを有効にしてから、再度このページを開いてください。</p></noscript>
<form id="contact-form" class="contact-form">
  <label>お名前または団体名 <span class="req">必須</span>
    <input type="text" name="name" required maxlength="100">
  </label>
  <label>メールアドレス <span class="req">必須</span>
    <input type="email" name="email" required maxlength="200">
  </label>
  <label>お問い合わせ種別 <span class="req">必須</span>
    <select name="category" required>
      <option value="">選択してください</option>
      ${CONTACT_CATEGORIES.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("\n")}
    </select>
  </label>
  <label>件名 <span class="req">必須</span>
    <input type="text" name="subject" required maxlength="200">
  </label>
  <label>内容 <span class="req">必須</span>
    <textarea name="message" required maxlength="2000" rows="8"></textarea>
  </label>
  <div class="cf-turnstile" data-sitekey="${escapeHtml(turnstileSiteKey)}" data-size="compact"></div>
  <label class="consent-label">
    <input type="checkbox" name="consent" required>
    <a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>に同意します
  </label>
  <button type="submit">送信する</button>
  <p id="contact-form-status" class="contact-form-status" role="status"></p>
</form>
<p class="panel-note">※返信を保証するものではありません。※PR・広告掲載のご相談は、掲載を保証するものではありません。</p>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script src="/js/contact-form.js" defer></script>
`
    : `
<p>お問い合わせフォームは現在準備中です。</p>
<p>記事内容の訂正依頼、情報提供、PR・広告掲載に関するご相談の受付方法は、準備が整い次第このページでご案内します。</p>
`;

  return staticInfoPage({
    slug: "contact",
    breadcrumbLabel: "お問い合わせ",
    title: turnstileSiteKey ? "お問い合わせ" : "お問い合わせ（準備中）",
    description: "Takarazuka Todayへのお問い合わせはこちらから。記事内容の訂正依頼・情報提供・PR・広告掲載のご相談を受け付けています。",
    panelTitle: "お問い合わせ",
    panelIcon: "bell",
    contentHtml,
    siteUrl,
  });
}
