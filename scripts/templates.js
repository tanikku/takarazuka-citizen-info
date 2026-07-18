export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

// 市議会カテゴリーは会議録を手動確認のうえAI要約・人間レビューを行う運用のため、ページ上部に明記する
const SHIGIKAI_DISCLOSURE = `<div class="disclosure-box">本ページの会議要約は、宝塚市議会会議録検索システムの公開情報を基に、人間が内容を確認しながらAIが要約を作成しています。事実のみを記載し、議員の評価・政治的意見・優劣判断は一切行いません。</div>`;

export function categoryPath(key) {
  return `/category/${key}.html`;
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
  <p class="site-tagline">宝塚の暮らしに役立つ情報を毎日わかりやすくお届け</p>
</div>
</header>`;
}

function dateBar(dateLabel) {
  return `<div class="date-bar">${icon("calendar")}<span>${escapeHtml(dateLabel)}</span><span class="site-lead-sep">|</span><span class="site-lead">宝塚市の防災・行政・市議会・暮らしの情報をまとめる地域情報サイト</span></div>`;
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

function contactCtaPanel() {
  return `<a class="panel contact-cta-panel" href="/contact.html">${icon("mail")}<span>お問い合わせ</span></a>`;
}

const QUICK_ACCESS_ITEMS = [
  { href: "/#today-topic", icon: "calendar", label: "今日の宝塚" },
  { href: "/category/shigikai.html", icon: "building", label: "市議会" },
  { href: "/category/bohan.html", icon: "shield", label: "防犯" },
  { href: "/events/", icon: "calendar", label: "イベント" },
  { href: "/#photo", icon: "camera", label: "フォト" },
  { href: "/mukogawa/", icon: "videoCamera", label: "武庫川防災" },
];

function quickAccessPanel() {
  const items = QUICK_ACCESS_ITEMS.map(
    (item) => `<a class="qa-tile" href="${escapeHtml(item.href)}">${icon(item.icon)}<span class="qa-lbl">${escapeHtml(item.label)}</span></a>`,
  ).join("\n");
  return `<div class="quick-access">${items}</div>`;
}

export function layout({ title, description, bodyHtml, canonicalUrl, ogType = "website", structuredData = null }) {
  const dataList = Array.isArray(structuredData) ? structuredData : structuredData ? [structuredData] : [];
  const jsonLdScript = dataList
    .map((data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="google-site-verification" content="j8M7gv2ziexoZ_pW1ZVdNS8gzpJV4qRiq27tLKtyIpw">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="${escapeHtml(ogType)}">
<meta property="og:site_name" content="Takarazuka Today｜今日の宝塚を、3分で。">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<link rel="stylesheet" href="/css/style.css">
<script>${themeInitScript()}</script>
</head>
<body>
${header()}
<main>
${bodyHtml}
</main>
<footer class="site-footer">
<p>本サイトに掲載する記事は、公開情報の要約と出典リンクのみで構成しています。詳細・正式な内容は出典元をご確認ください。</p>
<p>写真提供：<a href="https://www.city.takarazuka.hyogo.jp/1014984/1015575/" target="_blank" rel="noopener">宝塚市オープンデータ</a>（<a href="https://creativecommons.org/licenses/by/4.0/deed.ja" target="_blank" rel="noopener">CC BY 4.0</a>）</p>
<p>公式X：<a href="https://x.com/TakaTodayJP" target="_blank" rel="noopener">@TakaTodayJP</a></p>
<p class="footer-contact"><a href="/contact.html">${icon("mail")}お問い合わせ</a></p>
<p class="footer-links"><a href="/privacy.html">プライバシーポリシー</a>　<a href="/about.html">運営者情報</a>　<a href="/ad-policy.html">PR・広告掲載ポリシー</a></p>
</footer>
${jsonLdScript}
<script src="/js/theme.js" defer></script>
<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "5f991631faa34f22bb67b9b90d954848"}'></script><!-- End Cloudflare Web Analytics -->
</body>
</html>
`;
}

function findCategory(label) {
  return CATEGORIES.find((c) => c.label === label);
}

export function articlePage(article, siteUrl, giinList = []) {
  const findGiinName = (slug) => giinList.find((g) => g.slug === slug)?.name;
  const canonicalUrl = `${siteUrl}/articles/${article.slug}.html`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    description: article.summary,
    url: canonicalUrl,
    author: { "@type": "Organization", name: "Takarazuka Today編集部" },
    publisher: { "@type": "Organization", name: "Takarazuka Today｜今日の宝塚を、3分で。" },
    isAccessibleForFree: true,
  };
  const categoryMeta = findCategory(article.category);

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
  const keyPointsBox =
    isShigikai && Array.isArray(article.keyPoints) && article.keyPoints.length > 0
      ? `<div class="point-box">
<p class="point-box-title">${icon("alert")}今回のポイント（市民生活への影響）</p>
<ul>${article.keyPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("\n")}</ul>
</div>`
      : "";
  const aiEditorialBadge = isShigikai ? `<p class="badge-line"><span class="badge-ai-editorial">AI要約・編集確認済</span></p>` : "";
  const shigikaiDisclosure = isShigikai ? SHIGIKAI_DISCLOSURE : "";
  const giinLinkBox =
    isShigikai && Array.isArray(article.giin) && article.giin.length > 0
      ? `<div class="giin-link-box">
${icon("user")}
<div>この記事で発言した議員：${article.giin.map((slug) => `<a href="/giin/${escapeHtml(slug)}.html">${escapeHtml(findGiinName(slug) ?? slug)}議員の発言記録を見る →</a>`).join("、")}</div>
</div>`
      : "";

  const bodyHtml = `<nav class="breadcrumb breadcrumb-article"><a href="/">トップ</a> &gt; ${categoryMeta ? `<a href="${categoryPath(categoryMeta.key)}">${escapeHtml(categoryMeta.label)}</a>` : escapeHtml(article.category)}</nav>
<article class="article-detail">
<p class="category-tag">${sourceBadge(article.sourceName)}${categoryMeta ? icon(categoryMeta.icon) : icon("newspaper")}${escapeHtml(article.category)}</p>
<h1>${escapeHtml(article.title)}</h1>
<p class="article-meta">${escapeHtml(article.publishedAt)}</p>
${aiEditorialBadge}
${keyPointsBox}
<p class="article-summary">${escapeHtml(article.summary)}</p>
${giinLinkBox}
${shigikaiDisclosure}
<p class="article-source">出典：<a href="${escapeHtml(article.sourceUrl)}" rel="noopener" target="_blank">${escapeHtml(article.sourceName)}</a></p>
<p class="x-follow-note">公式X：<a href="https://x.com/TakaTodayJP" target="_blank" rel="noopener">@TakaTodayJP</a><br>最新の更新情報や防災情報をお届けしています。</p>
<p class="back-link"><a href="/">${icon("newspaper")}トップへ戻る</a></p>
</article>`;

  return layout({
    title: `${article.title}｜Takarazuka Today`,
    description: article.summary,
    bodyHtml,
    canonicalUrl,
    ogType: "article",
    structuredData: [jsonLd, breadcrumbLd],
  });
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
];

function findPhotoForText(text) {
  return PHOTO_KEYWORDS.find((p) => text.includes(p.keyword));
}

function thumbHtml(photo, fallbackIconName) {
  return photo
    ? `<img src="/photos/${escapeHtml(photo.file)}" alt="${escapeHtml(photo.title)}" loading="lazy">`
    : icon(fallbackIconName);
}

function headlineRow(article) {
  const categoryMeta = findCategory(article.category);
  const photo = findPhotoForText(`${article.title} ${article.summary ?? ""}`);
  return `<a class="headline-row" href="/articles/${article.slug}.html">
<div class="headline-thumb">${thumbHtml(photo, categoryMeta ? categoryMeta.icon : "newspaper")}</div>
<div>
  <p class="headline-title">${sourceBadge(article.sourceName)}<span class="topic-tag">${escapeHtml(article.category)}</span>${escapeHtml(article.title)}</p>
  <p class="headline-meta">${escapeHtml(article.publishedAt)}・${escapeHtml(article.sourceName)}</p>
</div>
</a>`;
}

function topNewsPanel(topArticles) {
  const items = topArticles.slice(0, 3).map(headlineRow).join("\n");
  return `<div class="panel">
<p class="panel-title">${icon("newspaper")}トップニュース</p>
${items || '<p class="empty-state">まだ記事がありません</p>'}
</div>`;
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

function todayTopicPanel(todayArticles, activeNotices = []) {
  const noticeItems = activeNotices.map(siteNoticeRow).join("\n");
  if (todayArticles.length === 0 && activeNotices.length === 0) {
    return `<div class="panel" id="today-topic">
<p class="panel-title">${icon("calendar")}今日の宝塚トピック</p>
<p class="empty-state">本日の新しい記事はまだありません</p>
</div>`;
  }
  const items = todayArticles.map(headlineRow).join("\n");
  return `<div class="panel" id="today-topic">
<p class="panel-title">${icon("calendar")}今日の宝塚トピック</p>
${noticeItems}
${items}
</div>`;
}

function photoOfDayPanel(photoOfDay) {
  if (!photoOfDay) {
    return `<div class="panel" id="photo">
<p class="panel-title">${icon("camera")}今日の宝塚フォト</p>
<p class="empty-state">写真がまだ登録されていません</p>
</div>`;
  }
  const { photo, seasonLabel } = photoOfDay;
  return `<div class="panel" id="photo" style="padding:0; overflow:hidden;">
<a class="photo-hero" href="${escapeHtml(photo.sourcePage)}" target="_blank" rel="noopener">
<img src="/photos/${escapeHtml(photo.localFile)}" alt="${escapeHtml(photo.title)}">
<span class="photo-hero-caption">
  <span class="season-tag">${escapeHtml(seasonLabel)}</span>
  <span class="photo-hero-title">${escapeHtml(photo.title)}</span>
  <span class="photo-hero-credit">写真提供：宝塚市オープンデータ（CC BY 4.0）</span>
</span>
</a>
</div>`;
}

function todayRow(todayArticles, photoOfDay, categoryPageKeys, activeNotices = []) {
  return `<div class="today-row">
${todayTopicPanel(todayArticles, activeNotices)}
<div class="today-row-side">
${photoOfDayPanel(photoOfDay)}
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

function rankingOrRecentPanel(ranking, recentArticles, limit = 5, showMoreLink = true) {
  if (ranking) {
    const items = ranking.top
      .slice(0, limit)
      .map(
        (entry, i) => `<li class="ranking-item">
<span class="rank-num">${i + 1}</span>
<a class="rank-title" href="/articles/${entry.slug}.html">${escapeHtml(entry.title)}</a>
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
<a class="rank-title" href="/articles/${a.slug}.html">${escapeHtml(a.title)}</a>
</li>`,
    )
    .join("\n");
  return `<div class="panel">
<p class="panel-title">${icon("bell")}新着記事</p>
<ol class="ranking-list">${items || '<li class="empty-state">まだ記事がありません</li>'}</ol>
<p class="panel-note">※アクセスデータが蓄積されると人気記事ランキングに切り替わります</p>
${showMoreLink ? '<p class="panel-note"><a href="/ranking/">新着記事をもっと見る →</a></p>' : ""}
</div>`;
}

function recentCombinedFeed(publishedArticles, categoryPageKeys) {
  const items = publishedArticles.slice(0, 10).map(headlineRow).join("\n");
  const browseLink = categoryPageKeys.size > 0 ? `<p class="panel-note"><a href="#category-panel">→ もっと見る（カテゴリー別に探す）</a></p>` : "";
  return `<div class="panel">
<p class="panel-title">${icon("bell")}新着記事</p>
${items || '<p class="empty-state">まだ記事がありません</p>'}
${browseLink}
</div>`;
}

const GUIDE_NAV_ITEMS = [
  { href: "/category/kurashi/gomi-guide.html", icon: "building", label: "ゴミ出し" },
  { href: "/category/kosodate/guide.html", icon: "child", label: "子育て支援" },
  { href: "/category/bosai/guide.html", icon: "alert", label: "防災" },
  { href: "/category/kyoiku/guide.html", icon: "book", label: "学校情報" },
];

function guideNavPanel() {
  const items = GUIDE_NAV_ITEMS.map(
    (g) => `<a class="guide-nav-tile" href="${g.href}">${icon(g.icon)}<span>${escapeHtml(g.label)}</span></a>`,
  ).join("\n");
  return `<div class="panel guide-nav-panel">
<p class="panel-title">${icon("newspaper")}くらしガイド</p>
<div class="guide-nav">${items}</div>
</div>`;
}

function shigikaiCornerPanel({ hasGianPage, gikaiArticles }) {
  if (!hasGianPage && gikaiArticles.length === 0) return "";

  const announcement = hasGianPage
    ? `<div class="corner-announce">${icon("bell")}<span><strong>NEW</strong>議案の採決結果・議員別の表決結果がわかる「議案採決一覧」を公開しました</span></div>`
    : "";
  const cta = hasGianPage
    ? `<a class="gian-cta-card" href="/category/shigikai/gian.html">
<div class="gian-cta-icon">${icon("newspaper")}</div>
<div class="gian-cta-text">
<div class="gian-cta-title">議案採決一覧を見る</div>
<div class="gian-cta-sub">議案の可決・否決と、議員別の表決結果をまとめて確認できます</div>
</div>
<div class="gian-cta-arrow">→</div>
</a>`
    : "";
  const items = gikaiArticles.slice(0, 3).map(gikaiRow).join("\n");

  return `<div class="panel shigikai-corner">
<p class="panel-title">${icon("building")}市議会情報</p>
${announcement}
${cta}
${items}
<p class="panel-note"><a href="/category/shigikai.html">→ 市議会ウォッチ一覧へ</a></p>
</div>`;
}

export function indexPage({ topArticles, todayArticles, categoryPageKeys, publishedArticles, ranking, weather, todayCounts, photoOfDay, dateLabel, siteUrl, hasGianPage = false, activeNotices = [] }) {
  const gikaiArticles = publishedArticles.filter((a) => a.category === "市議会");

  const bodyHtml = `${dateBar(dateLabel)}
${quickAccessPanel()}
<div class="weather-standalone-row">${weatherPanel(weather)}${contactCtaPanel()}</div>
${todayRow(todayArticles, photoOfDay, categoryPageKeys, activeNotices)}
<div class="grid-2">
  <div class="col-main">
    ${topNewsPanel(topArticles)}
    ${shigikaiCornerPanel({ hasGianPage, gikaiArticles })}
    ${guideNavPanel()}
    ${recentCombinedFeed(publishedArticles, categoryPageKeys)}
  </div>
  <div class="col-side">
    ${rankingOrRecentPanel(ranking, publishedArticles)}
    ${livecamPanel()}
    ${entertainmentPanel()}
  </div>
</div>`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Takarazuka Today｜今日の宝塚を、3分で。",
    url: `${siteUrl}/`,
    description: "宝塚市の防災・行政・市議会・暮らしの情報をわかりやすくまとめる地域情報サイト",
  };

  return layout({
    title: "Takarazuka Today｜今日の宝塚を、3分で。",
    description: "宝塚市の防災・行政・市議会・暮らしの情報をわかりやすくまとめる地域情報サイト",
    bodyHtml,
    canonicalUrl: `${siteUrl}/`,
    structuredData,
  });
}

function gikaiRow(article) {
  const photo = findPhotoForText(`${article.title} ${article.summary ?? ""}`);
  return `<a class="headline-row" href="/articles/${article.slug}.html">
<div class="headline-thumb">${thumbHtml(photo, "building")}</div>
<div>
  <p class="headline-title"><span class="badge-ai-editorial">AI要約・編集確認済</span>${escapeHtml(article.title)}</p>
  <p class="headline-meta">${escapeHtml(article.meetingType ?? "")}・${escapeHtml(article.meetingDate ?? article.publishedAt)}・出典：宝塚市議会会議録検索システム</p>
</div>
</a>`;
}

function guideCard(guide) {
  const iconBoxContent = guide.cardPhoto
    ? `<img src="${escapeHtml(guide.cardPhoto)}" alt="" loading="lazy">`
    : icon(guide.icon ?? guide.category.icon);
  return `<a class="guide-card" href="/category/${guide.categoryKey}/${escapeHtml(guide.slug)}.html">
<div class="icon-box${guide.cardPhoto ? " icon-box-photo" : ""}">${iconBoxContent}</div>
<div>
  <div class="label">${escapeHtml(guide.title)}</div>
  <div class="sub">${escapeHtml(guide.cardSummary)}</div>
</div>
</a>`;
}

export function categoryPage(category, articles, siteUrl, guidesForCategory = [], hasGianPage = false, hasZaiseiPage = false, hasSuisougakuPage = false) {
  const canonicalUrl = `${siteUrl}${categoryPath(category.key)}`;
  const isShigikai = category.key === "shigikai";
  const items = articles.map(isShigikai ? gikaiRow : headlineRow).join("\n");
  const giinLink = isShigikai
    ? `<p class="panel-note"><a href="/giin/">議員活動サマリー一覧を見る →</a>　<a href="/category/shigikai/guide.html">市議会のしくみ・このページの見方 →</a></p>`
    : "";
  const gianCta = hasGianPage
    ? `<a class="gian-cta-card" href="/category/shigikai/gian.html">
<div class="gian-cta-icon">${icon("newspaper")}</div>
<div class="gian-cta-text">
<div class="gian-cta-title">議案採決一覧を見る</div>
<div class="gian-cta-sub">議案の可決・否決と、議員別の表決結果をまとめて確認できます</div>
</div>
<div class="gian-cta-arrow">→</div>
</a>`
    : "";
  const zaiseiCta = hasZaiseiPage
    ? `<a class="gian-cta-card" href="/category/shigikai/zaisei-watch.html">
<div class="gian-cta-icon">${icon("building")}</div>
<div class="gian-cta-text">
<div class="gian-cta-title">財政ウォッチを見る</div>
<div class="gian-cta-sub">市が年2回公表する財政状況を、予算・市債・基金などの主要指標でまとめて確認できます</div>
</div>
<div class="gian-cta-arrow">→</div>
</a>`
    : "";
  const suisougakuCta = hasSuisougakuPage
    ? `<a class="gian-cta-card" href="/category/kyoiku/suisougaku-guide.html">
<div class="gian-cta-icon">${icon("book")}</div>
<div class="gian-cta-text">
<div class="gian-cta-title">吹奏楽コンクールガイドを見る</div>
<div class="gian-cta-sub">西阪神吹奏楽コンクールの日程・会場・宝塚市内出場校をまとめて確認できます</div>
</div>
<div class="gian-cta-arrow">→</div>
</a>`
    : "";
  const guideCards = guidesForCategory.map(guideCard).join("\n");

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; ${escapeHtml(category.label)}</nav>
<div class="page-content">
${guideCards}
${gianCta}
${zaiseiCta}
${suisougakuCta}
<div class="panel">
<p class="panel-title">${icon(category.icon)}${escapeHtml(category.label)}${isShigikai ? "ウォッチ" : "の記事一覧"}</p>
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
<p class="panel-note"><a href="/livecam.html">ライブカメラ一覧・水位基準を見る →</a></p>
</div>`;
}

function entertainmentPanel() {
  return `<div class="panel">
<p class="panel-title">${icon("ticket")}宝塚エンタメ情報</p>
<a class="headline-row" href="https://kageki.hankyu.co.jp/schedule/index.html" target="_blank" rel="noopener">
<div class="headline-thumb">${thumbHtml({ file: "001015682_daigekizyo.jpg", title: "宝塚大劇場" }, "ticket")}</div>
<div>
  <p class="headline-title">宝塚歌劇 公演・チケット情報</p>
  <p class="headline-meta">宝塚大劇場の最新公演スケジュールは公式サイトでご確認ください</p>
</div>
</a>
<p class="panel-note"><a href="https://kageki.hankyu.co.jp/schedule/index.html" target="_blank" rel="noopener">宝塚歌劇公式サイトで公演スケジュールを見る →</a></p>
</div>`;
}

export function livecamPage(siteUrl) {
  const canonicalUrl = `${siteUrl}/livecam.html`;

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
      a: "市が「避難指示」や「高齢者等避難」を発令した場合は速やかに避難してください。水位や雨量の数値を見ながら、警戒レベル3以上が発令されたら行動開始を目安にしてください。詳しくは<a href=\"/category/bosai/bosai-guide.html\">防災ガイド</a>をご覧ください。",
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
<li><a href="/category/bosai/bosai-guide.html">防災ガイド（避難場所・ハザードマップ・非常持ち出し品）</a></li>
<li><a href="/mukogawa/">武庫川防災情報</a></li>
<li><a href="/category/bosai.html">防犯・防災の記事一覧</a></li>
</ul>
</div>

</div>`;

  return layout({
    title: "武庫川ライブカメラ｜宝塚市周辺の河川監視カメラ・水位基準まとめ｜Takarazuka Today",
    description: "武庫川（武田尾・生瀬）と大堀川・波豆川のライブカメラ（国土交通省・兵庫県）をまとめてリンク。警戒水位・避難判断水位・氾濫危険水位の基準値も宝塚市公表データで確認できます。大雨・台風時にご活用ください。",
    bodyHtml,
    canonicalUrl,
    structuredData: [breadcrumbLd, faqLd],
  });
}

function eventRow(occurrence) {
  const { article, date } = occurrence;
  const categoryMeta = findCategory(article.category);
  const photo = findPhotoForText(`${article.title} ${article.summary ?? ""}`);
  const dateLabel = new Date(`${date}T00:00:00+09:00`).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric", weekday: "short" });
  return `<a class="headline-row" href="/articles/${article.slug}.html">
<div class="headline-thumb">${thumbHtml(photo, categoryMeta ? categoryMeta.icon : "calendar")}</div>
<div>
  <p class="headline-title">${escapeHtml(dateLabel)}　${escapeHtml(article.title)}</p>
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

export function rankingPage(ranking, recentArticles, siteUrl) {
  const canonicalUrl = `${siteUrl}/ranking/`;
  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; 人気記事ランキング</nav>
<div class="page-content">
${rankingOrRecentPanel(ranking, recentArticles, 10, false)}
</div>`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "人気記事ランキング", item: canonicalUrl },
    ],
  };

  return layout({
    title: "人気記事ランキング｜Takarazuka Today",
    description: "Takarazuka Todayでよく読まれている記事のランキングです（過去30日間）。",
    bodyHtml,
    canonicalUrl,
    structuredData: breadcrumbLd,
  });
}

// 議員活動サマリー：本人の公開発言（市議会会議録）を時系列で並べるのみ。スコア化・ランキング・評価は行わない
export function giinPage(giin, relatedArticles, siteUrl) {
  const canonicalUrl = `${siteUrl}/giin/${giin.slug}.html`;
  const items = relatedArticles
    .map(
      (article) => `<div class="row">
<div>
  <a href="/articles/${article.slug}.html">${escapeHtml(article.title)}</a>
  <p class="headline-meta">${escapeHtml(article.meetingType ?? "")}・${escapeHtml(article.meetingDate ?? article.publishedAt)}</p>
</div>
</div>`,
    )
    .join("\n");

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; <a href="${categoryPath("shigikai")}">市議会</a> &gt; ${escapeHtml(giin.name)}議員</nav>
<div class="page-content">
<div class="panel">
${SHIGIKAI_DISCLOSURE.replace("本ページの会議要約は、", "このページは議員本人の公開発言（市議会会議録）を時系列で整理したものです。活動量のスコア化・ランキング・優劣評価は行いません。<br><br>本ページの会議要約は、")}
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
  });
}

export function giinIndexPage(giinList, siteUrl) {
  const canonicalUrl = `${siteUrl}/giin/`;
  const items = giinList
    .map(
      (giin) => `<a class="headline-row" href="/giin/${giin.slug}.html">
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
${SHIGIKAI_DISCLOSURE.replace("本ページの会議要約は、", "このページは議員本人の公開発言（市議会会議録）を時系列で整理したものです。活動量のスコア化・ランキング・優劣評価は行いません。<br><br>本ページの会議要約は、")}
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
  });
}

export function gikaiGuidePage(siteUrl) {
  const canonicalUrl = `${siteUrl}/category/shigikai/guide.html`;

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; <a href="${categoryPath("shigikai")}">市議会</a> &gt; 市議会のしくみ</nav>
<div class="page-content">
<div class="panel">
<p class="panel-title">${icon("building")}宝塚市議会のしくみ</p>
<p class="guide-q">Q. 市議会は何をするところ？</p>
<p>市の予算・条例・重要な計画などを審議し、可決・否決を決める機関です。市民が選んだ議員（定数26）によって構成されます。</p>
<p class="guide-q">Q.「本会議」と「委員会」はどう違う？</p>
<p><strong>本会議</strong>は議員全員が出席し、議案の提案・採決を行う公式な会議です。<strong>委員会</strong>（総務常任委員会・文教生活常任委員会など）は、本会議で各分野ごとに詳しく審査するための小グループの会議です。委員会での審査結果は、後日本会議で報告・採決されます。</p>
<p class="guide-q">Q. 定例会・臨時会とは？</p>
<p><strong>定例会</strong>は年4回（おおむね2月・5月・9月・11月）開かれる通常の議会です。<strong>臨時会</strong>は緊急の議案がある場合に開かれます。</p>
</div>
<div class="panel">
<p class="panel-title">${icon("newspaper")}「市議会ウォッチ」の見方</p>
<p>各記事の冒頭にある「今回のポイント」欄では、その日の会議のうち<strong>市民生活に関係する内容</strong>だけを整理して紹介しています。詳しい審議の経過を知りたい場合は、記事末尾の出典リンクから会議録本文（公式）をご確認ください。</p>
<p>本サイトの要約は<strong>事実の整理のみ</strong>を目的とし、議員や議案への評価・賛否の表明は行いません。</p>
<p class="panel-note"><a href="${categoryPath("shigikai")}">→ 市議会ウォッチ一覧へ</a></p>
<p class="panel-note"><a href="/giin/">→ 議員活動サマリー一覧へ</a></p>
<p class="panel-note"><a href="/category/shigikai/zaisei-watch.html">→ 財政ウォッチ（財政状況の解説）へ</a></p>
</div>
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

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "市議会は何をするところ？",
        acceptedAnswer: { "@type": "Answer", text: "市の予算・条例・重要な計画などを審議し、可決・否決を決める機関です。市民が選んだ議員（定数26）によって構成されます。" },
      },
      {
        "@type": "Question",
        name: "「本会議」と「委員会」はどう違う？",
        acceptedAnswer: { "@type": "Answer", text: "本会議は議員全員が出席し、議案の提案・採決を行う公式な会議です。委員会（総務常任委員会・文教生活常任委員会など）は、本会議で各分野ごとに詳しく審査するための小グループの会議です。委員会での審査結果は、後日本会議で報告・採決されます。" },
      },
      {
        "@type": "Question",
        name: "定例会・臨時会とは？",
        acceptedAnswer: { "@type": "Answer", text: "定例会は年4回（おおむね2月・5月・9月・11月）開かれる通常の議会です。臨時会は緊急の議案がある場合に開かれます。" },
      },
    ],
  };

  return layout({
    title: "宝塚市議会のしくみ・市議会ウォッチの見方｜Takarazuka Today",
    description: "宝塚市議会のしくみをわかりやすく解説。本会議と委員会（総務常任委員会・文教生活常任委員会など）の違い、定例会・臨時会の違い、本サイト「市議会ウォッチ」の見方や議員活動サマリー・財政ウォッチとの関係もあわせて紹介します。",
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
  const diff = current.value - previous.value;
  if (diff === 0) return "変動なし";
  const sign = diff > 0 ? "+" : "";
  if (current.unit === "percent") return `${sign}${(Math.round(diff * 10) / 10).toLocaleString()}pt`;
  return `${sign}${formatYen(diff)}`;
}

function zaiseiIndicatorRows(current, previous) {
  return current.indicators
    .map((ind) => {
      const prevInd = previous?.indicators.find((p) => p.key === ind.key);
      return `<tr><td>${escapeHtml(ind.label)}</td><td>${formatIndicatorValue(ind)}</td><td>${prevInd ? formatIndicatorValue(prevInd) : "－"}</td><td>${formatIndicatorDiff(ind, prevInd)}</td></tr>`;
    })
    .join("\n");
}

const ZAISEI_TERMS = [
  { term: "一般会計", desc: "市の基本的な行政活動（福祉・教育・道路整備など）に使うお金の会計区分です。国民健康保険や介護保険など目的が特定された「特別会計」とは別に管理されています。" },
  { term: "基金", desc: "将来の特定の目的（施設整備・災害への備えなど）のために積み立てているお金です。家庭でいう「貯金」にあたります。" },
  { term: "市債", desc: "市が学校や道路などの整備のために金融機関や国などから借り入れるお金です。家庭でいう「ローン」にあたり、複数年かけて返済します。" },
  { term: "実質収支", desc: "1年間の収入と支出の差額から、翌年度に繰り越す事業の財源などを除いた金額のことで、その年度の家計簿でいう黒字・赤字に近い指標です。決算がまとまる公表回にあわせて紹介します。" },
];

const ZAISEI_FAQ = [
  {
    q: "宝塚市の「市債」とは何ですか？",
    a: "市債とは、市が学校や道路などの整備のために金融機関や国などから借り入れるお金のことです。家庭でいう「住宅ローン」のように、複数年かけて返済していく仕組みです。",
  },
  {
    q: "「基金」とは何ですか？",
    a: "基金とは、将来の特定の目的のために積み立てているお金のことで、家庭でいう「貯金」にあたります。宝塚市には財政調整基金など複数の基金があります。",
  },
  {
    q: "宝塚市の財政は赤字なのですか？",
    a: "このページで紹介している「財政状況」の公表資料は、年度途中の予算の執行状況を示すもので、黒字・赤字を判定する決算資料ではありません。宝塚市は令和8年3月に策定した今後10年間の財政見通しの中で、人口減少や少子高齢化等によりリスク中位ケースでも累計約22.9億円の収支不足が見込まれるとしており、厳しい財政状況にあるとしています。",
  },
  {
    q: "なぜ年に2回（6月・12月）公表されるのですか？",
    a: "地方自治法第243条の3第1項及び宝塚市の条例に基づき、市は年に2回（6月・12月）財政状況を公表することが定められています。6月は前年度下半期分、12月はその年度の上半期分の状況が公表されます。",
  },
  {
    q: "このページの数字はいつ時点の情報ですか？",
    a: "直近の更新は令和8年（2026年）6月公表分で、令和7年度（2025年度）下半期（令和7年10月1日〜令和8年3月31日）の状況です。基礎数値（人口・世帯数）は令和8年3月31日時点のものです。",
  },
  {
    q: "もっと詳しい情報はどこで見られますか？",
    a: "宝塚市公式サイトの「財政状況」ページで、公表資料（PDF）の原本を確認できます。詳しい内訳や過去の公表分もあわせて掲載されています。",
  },
];

export function zaiseiWatchPage(periods, siteUrl) {
  const canonicalUrl = `${siteUrl}/category/shigikai/zaisei-watch.html`;
  const current = periods[0];
  const previous = periods[1];

  const highlightsHtml = current.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("\n");
  const indicatorRows = zaiseiIndicatorRows(current, previous);
  const termsHtml = ZAISEI_TERMS.map((t) => `<p class="guide-q">${escapeHtml(t.term)}</p><p>${escapeHtml(t.desc)}</p>`).join("\n");
  const historyRows = periods
    .map((p, i) => `<tr><td>${escapeHtml(p.publishedLabel)}</td><td>${escapeHtml(p.coverageLabel)}</td><td>${i === 0 ? "今回" : ""}</td></tr>`)
    .join("\n");
  const faqHtml = ZAISEI_FAQ.map((item) => `<p class="guide-q">Q. ${escapeHtml(item.q)}</p><p>${escapeHtml(item.a)}</p>`).join("\n");

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
<div class="table-scroll">
<table class="zaisei-table">
<thead><tr><th>項目</th><th>今回</th><th>前回</th><th>増減</th></tr></thead>
<tbody>
${indicatorRows}
</tbody>
</table>
</div>
<p class="today-source">単位換算・端数処理の都合上、原資料と表示が完全に一致しない場合があります。詳細は出典PDFをご確認ください。</p>
</div>

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
<p class="panel-note"><a href="/category/shigikai/guide.html">→ 市議会のしくみを見る</a></p>
<p class="panel-note"><a href="/category/kurashi/gyousei-tetsuzuki-guide.html">→ 行政手続きガイドを見る</a></p>
</div>
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
    mainEntity: ZAISEI_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return layout({
    title: "宝塚市財政ウォッチ｜財政状況を分かりやすく解説｜Takarazuka Today",
    description: "宝塚市が毎年6月・12月に公表する「財政状況」をもとに、一般会計の予算規模・市税収入・市債残高・基金残高などの主要な財政指標を市民向けにわかりやすく整理して紹介するページです。政治的評価は行わず、公式資料の事実整理のみを行います。",
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
    a: "地区大会での評価をもとに、県大会へ推薦される学校・団体が決まります。推薦される数の基準は部門・年度により異なるため、詳細は兵庫県吹奏楽連盟の公式サイトでご確認ください。",
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

function suisougakuStagePanel(iconName, title, stage) {
  const venuesHtml = stage.yearInfo.venues.map((v) => `<li>${escapeHtml(v)}</li>`).join("\n");
  return `<div class="panel">
<p class="panel-title">${icon(iconName)}${escapeHtml(title)}</p>
<p><strong>${escapeHtml(stage.name)}</strong></p>
<p>${escapeHtml(stage.aboutText)}</p>
<p class="guide-q">${escapeHtml(stage.yearInfo.dateLabel.match(/^\d{4}/)?.[0] ?? "今年")}年の開催時期・会場</p>
<p>${escapeHtml(stage.yearInfo.dateLabel)}</p>
<ul>
${venuesHtml}
</ul>
<p class="today-source">主催：${escapeHtml(stage.organizerName)}</p>
<p class="panel-note"><a href="${escapeHtml(stage.officialUrl)}" target="_blank" rel="noopener">→ ${escapeHtml(stage.organizerName)}公式サイトを見る</a></p>
</div>`;
}

function loadSuisougakuSchoolRows(schools) {
  return schools
    .map((s) => `<tr><td>${escapeHtml(s.name)}${s.type === "private" ? "（私立）" : ""}</td><td>${escapeHtml(s.division)}</td></tr>`)
    .join("\n");
}

export function suisougakuGuidePage(years, siteUrl) {
  const canonicalUrl = `${siteUrl}/category/kyoiku/suisougaku-guide.html`;
  const current = years[0];

  const scheduleRows = current.schedule
    .map((s) => `<tr><td>${escapeHtml(s.dateLabel)}</td><td>${escapeHtml(s.venue)}</td><td>${escapeHtml(s.divisions)}</td></tr>`)
    .join("\n");

  const juniorHighRows = loadSuisougakuSchoolRows(current.takarazukaSchools.juniorHigh);
  const highSchoolRows = loadSuisougakuSchoolRows(current.takarazukaSchools.highSchool);

  const resultsHtml = current.results.announced
    ? escapeHtml(current.results.note)
    : `<p>${escapeHtml(current.results.note)}</p>`;

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

${suisougakuStagePanel("building", "兵庫県大会", current.higherStages.prefectural)}

${suisougakuStagePanel("building", "関西大会", current.higherStages.kansai)}

${suisougakuStagePanel("shield", "全国大会", current.higherStages.national)}

<div class="panel">
<p class="panel-title">${icon("building")}宝塚市内出場校（${current.year}年）</p>
<p class="guide-q">中学校</p>
<div class="table-scroll">
<table class="zaisei-table">
<thead><tr><th>学校名</th><th>出場部門</th></tr></thead>
<tbody>
${juniorHighRows}
</tbody>
</table>
</div>
<p class="guide-q">高等学校</p>
<div class="table-scroll">
<table class="zaisei-table">
<thead><tr><th>学校名</th><th>出場部門</th></tr></thead>
<tbody>
${highSchoolRows}
</tbody>
</table>
</div>
<p class="today-source">出典：${escapeHtml(current.organizerName)}公式サイト掲載の公式タイムテーブル（PDF）。年度・部門により出場校は変動します。</p>
</div>

<div class="panel">
<p class="panel-title">${icon("shield")}宝塚市の学校の実績について</p>
<p>${escapeHtml(current.takarazukaAchievementNote)}</p>
</div>

<div class="panel">
<p class="panel-title">${icon("newspaper")}結果について</p>
${resultsHtml}
</div>

<div class="panel">
<p class="panel-title">${icon("shield")}よくある質問</p>
${faqHtml}
</div>

<div class="panel">
<p class="panel-title">${icon("newspaper")}出典・関連ページ</p>
${sourceLinksHtml}
<p class="panel-note"><a href="${categoryPath("kyoiku")}">→ 教育カテゴリ一覧へ</a></p>
<p class="panel-note"><a href="/category/kyoiku/guide.html">→ 宝塚市 学校情報ガイドを見る</a></p>
<p class="panel-note"><a href="/category/kurashi/school-admission-guide.html">→ 学区・高校受験ガイドを見る</a></p>
<p class="panel-note"><a href="/category/kyoiku/bunkasai-guide.html">→ 高校文化祭ガイドを見る</a></p>
</div>
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
    title: "宝塚市 吹奏楽コンクールガイド｜地区大会・県大会・結果まとめ｜Takarazuka Today",
    description: "宝塚市内の中学校・高校が出場する吹奏楽コンクールについて、西阪神地区大会・兵庫県吹奏楽コンクール・関西吹奏楽コンクール・全日本吹奏楽コンクールという大会の流れと、開催日程・会場・宝塚市内出場校を公式情報をもとに整理して紹介するガイドページです。評価・順位予想は行いません。",
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
    ? `<p class="gian-related-link"><a href="/articles/${escapeHtml(bill.relatedArticleSlug)}.html">→ 関連記事を見る</a></p>`
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
  const canonicalUrl = `${siteUrl}/category/shigikai/gian.html`;

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
</div>
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
<p class="panel-note"><a href="${categoryPath("shigikai")}">→ 市議会ウォッチ一覧へ</a>　<a href="/category/shigikai/guide.html">→ 市議会のしくみへ</a></p>
<p class="source-note">出典：宝塚市議会「議案等一覧・審議結果」「議決等結果（電子採決システムによる投票における賛否）」（各議案の詳しい出典は議案カード内のリンクをご確認ください）</p>
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

// 検索流入向けの常設ガイドページ（ごみ出し・子育て支援・防災・学校情報など）
// ニュース記事ではなく評価性のない常設リファレンス情報のため、記事スキーマとは別に専用ページとして実装する
export function guidePage(guide, siteUrl) {
  const canonicalUrl = `${siteUrl}/category/${guide.categoryKey}/${guide.slug}.html`;

  const tocHtml = `<div class="toc">
<p class="toc-title">${icon("newspaper")}目次</p>
<ol>${guide.toc.map((t) => `<li><a href="#${escapeHtml(t.id)}">${escapeHtml(t.label)}</a></li>`).join("\n")}</ol>
</div>`;

  const sectionsHtml = guide.sections
    .map(
      (s) => `<section class="guide-section" id="${escapeHtml(s.id)}">
<h2>${icon(s.icon ?? guide.category.icon)}${escapeHtml(s.heading)}</h2>
${s.items.map((item) => `<div class="rule-card">${item}</div>`).join("\n")}
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
    ? `<div class="guide-hero-photo"><img src="${escapeHtml(guide.cardPhoto)}" alt="${escapeHtml(guide.title)}" loading="lazy"></div>${guide.photoCredit ? `<p class="photo-credit">${guide.photoCredit}</p>` : ""}`
    : "";

  const changelogHtml = guide.changelog && guide.changelog.length > 0
    ? `<div class="changelog">
<p class="changelog-title">${icon("clock")}更新履歴</p>
<ul class="changelog-list">
${guide.changelog.map((c) => `<li><span class="changelog-date">${escapeHtml(c.date)}</span>${escapeHtml(c.note)}</li>`).join("\n")}
</ul>
</div>`
    : "";

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; <a href="${categoryPath(guide.category.key)}">${escapeHtml(guide.category.label)}</a> &gt; ${escapeHtml(guide.title)}</nav>
<div class="page-content">
<h1>${escapeHtml(guide.title)}</h1>
${heroPhotoHtml}
<p class="lead">${escapeHtml(guide.lead)}</p>
${disclosureHtml}
<p class="updated-at">最終更新：${escapeHtml(guide.updatedAt)}</p>
${changelogHtml}
${tocHtml}
${sectionsHtml}
${faqHtml}
${relatedHtml}
<p class="source-note">出典：<a href="${escapeHtml(guide.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(guide.sourceLabel)}</a>（情報は要約です。最新情報は出典元をご確認ください）</p>
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
  });
}

export function mukogawaBosaiPage(siteUrl) {
  const canonicalUrl = `${siteUrl}/mukogawa/`;

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; 武庫川防災情報</nav>
<div class="page-content">
<div class="panel">
<p class="panel-title">${icon("videoCamera")}武庫川防災情報</p>
<p>武庫川のライブカメラ・水位・雨量の最新情報は、下記の公式ページでご確認いただけます。</p>
<p class="panel-note"><a href="/livecam.html">宝塚市内のライブカメラ一覧を見る →</a></p>
<p class="panel-note"><a href="https://www.river.go.jp/kawabou/" target="_blank" rel="noopener">国土交通省「川の防災情報」で水位・雨量を見る →</a></p>
</div>
</div>`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "武庫川防災情報", item: canonicalUrl },
    ],
  };

  return layout({
    title: "武庫川防災情報｜Takarazuka Today",
    description: "武庫川のライブカメラ・水位・雨量情報を確認できる公式ページへの案内です。",
    bodyHtml,
    canonicalUrl,
    structuredData: breadcrumbLd,
  });
}

// フェーズ7：収益化の土台整備として追加した運営系の固定ページ共通レイアウト
function staticInfoPage({ slug, breadcrumbLabel, title, description, panelTitle, panelIcon, contentHtml, siteUrl }) {
  const canonicalUrl = `${siteUrl}/${slug}.html`;

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; ${escapeHtml(breadcrumbLabel)}</nav>
<div class="page-content">
<div class="panel">
<p class="panel-title">${icon(panelIcon)}${escapeHtml(panelTitle)}</p>
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
  });
}

export function privacyPage(siteUrl) {
  const contentHtml = `
<p class="updated-at">最終更新日：2026年6月25日</p>
<p>「Takarazuka Today（宝塚Today）」（以下「本サイト」）における、個人情報および利用者情報の取り扱いについて説明します。</p>

<p class="guide-q">アクセス解析について</p>
<p>本サイトでは、Cloudflare Web Analyticsを利用してアクセス状況を解析しています。Cloudflare Web Analyticsは、Cookieを使用せず、個人を特定する情報を収集しない方式のアクセス解析サービスです。</p>

<p class="guide-q">Cookie・localStorageについて</p>
<p>本サイトでは、ダークモード表示設定を保存するために、お使いの端末のlocalStorageを利用しています。この情報は、利用者を識別または追跡する目的では使用していません。現時点で、本サイトは第三者配信広告を表示していません。</p>

<p class="guide-q">将来の広告配信について</p>
<p>本サイトは将来、Google AdSenseなどの第三者配信事業者による広告を導入する可能性があります。広告を導入した場合、第三者配信事業者が利用者の興味に応じた広告を表示するためにCookieを使用することがあります。広告を導入する際は、本ページを更新し、必要な情報を追加します。</p>

<p class="guide-q">外部サイトへのリンクについて</p>
<p>本サイトの記事には、宝塚市、兵庫県、兵庫県警察などの出典元サイトへの外部リンクが含まれます。リンク先サイトにおける個人情報の取り扱いについては、本サイトは関与せず、各リンク先サイトのプライバシーポリシーが適用されます。</p>

<p class="guide-q">お問い合わせ情報の取り扱いについて</p>
<p>お問い合わせフォームなどを通じて提供された情報は、お問い合わせへの対応および必要な確認のために利用します。取得した情報を、本人の同意なく第三者へ提供することはありません。ただし、法令に基づく場合を除きます。</p>

<p class="guide-q">本ポリシーの変更について</p>
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
<p class="guide-q">サイト名</p>
<p>Takarazuka Today（宝塚Today）</p>

<p class="guide-q">目的</p>
<p>宝塚市、兵庫県、兵庫県警察などが公開する情報を、宝塚市にお住まいの方や宝塚市に関わりのある方に向けて、分かりやすく整理してお届けすることを目的としています。</p>

<p class="guide-q">編集方針</p>
<p>行政・くらしの情報、防犯・防災情報、市議会の動き、イベント情報などを扱います。記事は公開情報の要約と出典リンクを中心に構成し、原文の転載は行いません。事実に基づく内容を扱い、推測や誇張した表現は避けます。市議会に関する記事では、議員、会派、議案などへの政治的な評価や優劣判断は行わず、公開情報をもとにした事実ベースの要約を行います。PR記事や広告掲載枠については、通常記事と区別できるよう「PR」「広告」などの表記を行います。</p>

<p class="guide-q">運営体制</p>
<p>本サイトは個人により運営しています。運営者個人の氏名、所在地、電話番号については、プライバシー保護の観点から公開していません。</p>

<p class="guide-q">更新頻度</p>
<p>原則として平日は毎日更新しています。災害・緊急情報は確認でき次第更新します。</p>

<p class="guide-q">内容の誤りについて</p>
<p>記事内容に誤りや古い情報が含まれている場合は、<a href="/contact.html">お問い合わせページ</a>からご連絡ください。確認のうえ、必要に応じて訂正、追記、または掲載内容の見直しを行います。</p>
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

export function adPolicyPage(siteUrl) {
  const contentHtml = `
<p>本サイト「Takarazuka Today（宝塚Today）」では、掲載する情報を以下のように区別しています。</p>

<p class="guide-q">通常記事</p>
<p>宝塚市、兵庫県、兵庫県警察などの公的機関が公開している情報をもとに、編集部が独自に要約・整理した記事です。通常記事は、広告主や第三者からの依頼によって内容が左右されることはありません。</p>

<p class="guide-q">店舗・団体提供情報</p>
<p>店舗、企業、団体などから提供された情報をもとに掲載する情報です。掲載の可否は編集部が判断します。情報提供をいただいた場合でも、掲載を保証するものではありません。内容に誤りがないか確認するため、必要に応じて提供元へ確認を行う場合があります。</p>

<p class="guide-q">PR記事・広告掲載枠</p>
<p>対価を受けて掲載する記事または広告枠です。PR記事・広告掲載枠には、<span class="badge-ai-editorial" style="background:#c8102e;">PR</span> ・ <span class="badge-ai-editorial" style="background:#c8102e;">広告</span> などの表記を付け、通常記事と区別します。また、必要に応じて広告主・提供者の名称を明記します。</p>

<p class="guide-q">編集の独立性について</p>
<p>有料掲載であっても、事実と異なる内容、根拠のない表現、誇張した表現は掲載しません。広告主・提供者には、事実誤認がないか確認を依頼する場合がありますが、掲載内容の最終判断は編集部が行います。</p>

<p class="guide-q">防災・緊急情報との分離</p>
<p>避難情報、気象警報、防災情報、緊急のお知らせなどには、広告・PR要素を混在させません。</p>

<p class="guide-q">掲載をお断りする内容</p>
<p>以下に該当する、またはそのおそれがある内容は掲載をお断りします。</p>
<div class="rule-card">虚偽または誤認を招く内容</div>
<div class="rule-card">根拠のない効果・実績・比較表現</div>
<div class="rule-card">公序良俗に反する内容</div>
<div class="rule-card">法令または各種ガイドラインに違反する内容</div>
<div class="rule-card">第三者の権利を侵害する内容</div>
<div class="rule-card">本サイトの編集方針に合わない内容</div>

<p class="guide-q">掲載可否の決定</p>
<p>掲載の可否は、本サイト編集部の判断により決定します。掲載をお断りする場合、理由を個別にお伝えできない場合があります。</p>

<p class="guide-q">お問い合わせ</p>
<p>掲載情報の提供、PR記事、広告掲載に関するお問い合わせは、<a href="/contact.html">お問い合わせページ</a>からご連絡ください。</p>
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

const CONTACT_CATEGORIES = ["記事内容の訂正・削除依頼", "情報提供", "PR・広告掲載の相談", "その他"];

export function contactPage(siteUrl, turnstileSiteKey) {
  const contentHtml = turnstileSiteKey
    ? `
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
  <div class="cf-turnstile" data-sitekey="${escapeHtml(turnstileSiteKey)}"></div>
  <label class="consent-label">
    <input type="checkbox" name="consent" required>
    <a href="/privacy.html" target="_blank" rel="noopener">プライバシーポリシー</a>に同意します
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
