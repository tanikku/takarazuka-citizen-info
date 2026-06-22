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
  return `<div class="date-bar">${icon("calendar")}<span>${escapeHtml(dateLabel)}</span></div>`;
}

function todayPanel({ weather, counts }) {
  const weatherStat = weather
    ? `<div class="stat-card"><div class="stat-val">${escapeHtml(weather.weatherEmoji)}${escapeHtml(weather.tempMax ?? "?")}℃</div><div class="stat-lbl">${escapeHtml(weather.areaLabel)}</div></div>`
    : `<div class="stat-card"><div class="stat-val">－</div><div class="stat-lbl">天気（未取得）</div></div>`;

  return `<div class="today-panel">
${weatherStat}
<div class="stat-card"><div class="stat-val">${counts.event}件</div><div class="stat-lbl">イベント情報</div></div>
<div class="stat-card"><div class="stat-val">${counts.city}件</div><div class="stat-lbl">宝塚市（7日間）</div></div>
<div class="stat-card"><div class="stat-val">${counts.pref}件</div><div class="stat-lbl">兵庫県（7日間）</div></div>
<div class="stat-card"><div class="stat-val">${counts.police}件</div><div class="stat-lbl">県警（7日間）</div></div>
</div>
${weather ? `<p class="today-source">天気出典：<a href="${escapeHtml(weather.sourceUrl)}" target="_blank" rel="noopener">気象庁</a>（${escapeHtml(weather.forecastDate)}発表予報・宝塚市は阪神地域のため代表地点「神戸」のデータを表示）</p>` : ""}`;
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
</footer>
${jsonLdScript}
<script src="/js/theme.js" defer></script>
<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "ba952a62129e40bc9a9b3423de1c98a3"}'></script><!-- End Cloudflare Web Analytics -->
</body>
</html>
`;
}

function findCategory(label) {
  return CATEGORIES.find((c) => c.label === label);
}

export function articlePage(article, siteUrl) {
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

  const bodyHtml = `<nav class="breadcrumb breadcrumb-article"><a href="/">トップ</a> &gt; ${categoryMeta ? `<a href="${categoryPath(categoryMeta.key)}">${escapeHtml(categoryMeta.label)}</a>` : escapeHtml(article.category)}</nav>
<article class="article-detail">
<p class="category-tag">${sourceBadge(article.sourceName)}${categoryMeta ? icon(categoryMeta.icon) : icon("newspaper")}${escapeHtml(article.category)}</p>
<h1>${escapeHtml(article.title)}</h1>
<p class="article-meta">${escapeHtml(article.publishedAt)}</p>
<p class="article-summary">${escapeHtml(article.summary)}</p>
<p class="article-source">出典：<a href="${escapeHtml(article.sourceUrl)}" rel="noopener" target="_blank">${escapeHtml(article.sourceName)}</a></p>
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

function todayTopicPanel(todayArticles) {
  if (todayArticles.length === 0) {
    return `<div class="panel" id="today-topic">
<p class="panel-title">${icon("calendar")}今日の宝塚トピック</p>
<p class="empty-state">本日の新しい記事はまだありません</p>
</div>`;
  }
  const items = todayArticles.map(headlineRow).join("\n");
  return `<div class="panel" id="today-topic">
<p class="panel-title">${icon("calendar")}今日の宝塚トピック</p>
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

function todayRow(todayArticles, photoOfDay) {
  return `<div class="today-row">
${todayTopicPanel(todayArticles)}
${photoOfDayPanel(photoOfDay)}
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

  return `<div class="panel">
<p class="panel-title">${icon("building")}カテゴリーから探す</p>
<div class="category-list">${realChips.join("\n")}</div>
</div>`;
}

function categoryPreviewSection(section) {
  const items = section.articles.slice(0, 3).map(headlineRow).join("\n");
  return `<div class="panel">
<p class="panel-title">${icon(section.icon)}${escapeHtml(section.label)}</p>
${items}
<p class="panel-note"><a href="${categoryPath(section.key)}">${escapeHtml(section.label)}の記事をもっと見る →</a></p>
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
</div>`;
}

function recentListPanel(publishedArticles) {
  const items = publishedArticles.slice(0, 30).map(headlineRow).join("\n");
  return `<div class="panel">
<p class="panel-title">${icon("bell")}新着記事一覧</p>
${items || '<p class="empty-state">まだ記事がありません</p>'}
</div>`;
}

export function indexPage({ topArticles, todayArticles, categoryPreviewSections, categoryPageKeys, publishedArticles, ranking, weather, todayCounts, photoOfDay, dateLabel, siteUrl }) {
  const bodyHtml = `${dateBar(dateLabel)}
${todayPanel({ weather, counts: todayCounts })}
${quickAccessPanel()}
${todayRow(todayArticles, photoOfDay)}
<div class="grid-2">
  <div class="col-main">
    ${topNewsPanel(topArticles)}
    ${categoryPanel(categoryPageKeys)}
    ${categoryPreviewSections.map(categoryPreviewSection).join("\n")}
  </div>
  <div class="col-side">
    ${rankingOrRecentPanel(ranking, publishedArticles)}
    ${livecamPanel()}
    ${entertainmentPanel()}
    ${recentListPanel(publishedArticles)}
  </div>
</div>`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Takarazuka Today｜今日の宝塚を、3分で。",
    url: `${siteUrl}/`,
    description: "宝塚市の行政・暮らし情報をまとめた市民向け情報サイト",
  };

  return layout({
    title: "Takarazuka Today｜今日の宝塚を、3分で。",
    description: "宝塚市の行政・暮らし情報をまとめた市民向け情報サイト",
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
  <p class="headline-title"><span class="badge-ai">AI要約</span><span class="badge-review">人間レビュー済み</span>${escapeHtml(article.title)}</p>
  <p class="headline-meta">${escapeHtml(article.meetingType ?? "")}・${escapeHtml(article.meetingDate ?? article.publishedAt)}・出典：宝塚市議会会議録検索システム</p>
</div>
</a>`;
}

export function categoryPage(category, articles, siteUrl) {
  const canonicalUrl = `${siteUrl}${categoryPath(category.key)}`;
  const isShigikai = category.key === "shigikai";
  const items = articles.map(isShigikai ? gikaiRow : headlineRow).join("\n");
  const giinLink = isShigikai ? `<p class="panel-note"><a href="/giin/">議員活動サマリー一覧を見る →</a></p>` : "";

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; ${escapeHtml(category.label)}</nav>
<div class="page-content">
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
const LIVE_CAMERAS = [
  {
    name: "武庫川武田尾（国土交通省 川の防災情報）",
    description: "宝塚市玉瀬・武庫川武田尾地点の河川監視カメラ",
    url: "https://www.river.go.jp/kawabou/pc/tm?zm=14&clat=34.803796253690784&clon=135.30083656311038&fld=0&mapType=0&viewGrpStg=0&viewRd=1&viewRW=1&viewRiver=1&viewPoint=1&ext=0&itmkndCd=100&scamId=222057042&ownCd=22057&sysCamId=22057042",
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
<p class="panel-note"><a href="/livecam.html">国土交通省「川の防災情報」で他の地点も見る →</a></p>
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
  const items = LIVE_CAMERAS.map(
    (cam) => `<a class="headline-row" href="${escapeHtml(cam.url)}" target="_blank" rel="noopener">
<div class="headline-thumb">${icon("videoCamera")}</div>
<div>
  <p class="headline-title">${escapeHtml(cam.name)}</p>
  <p class="headline-meta">${escapeHtml(cam.description)}</p>
</div>
</a>`,
  ).join("\n");

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; ライブカメラ</nav>
<div class="page-content">
<div class="panel">
<p class="panel-title">${icon("videoCamera")}宝塚市内のライブカメラ</p>
<p class="empty-state">本サイトでは、信頼できる公式の河川監視カメラのみをリンク掲載しています（画像の埋め込みは行わず、各機関の公式ページへ直接ご案内します）。</p>
${items}
<p class="panel-note">出典：国土交通省「川の防災情報」（<a href="https://www.river.go.jp/kawabou/" target="_blank" rel="noopener">https://www.river.go.jp/kawabou/</a>）<br>地図上で武庫川流域の他の観測点・カメラも確認できます。</p>
</div>
</div>`;

  return layout({
    title: "宝塚市内のライブカメラ｜Takarazuka Today",
    description: "宝塚市内（武庫川流域）の河川監視ライブカメラを、国土交通省「川の防災情報」など公式ソースへのリンクでご案内します。",
    bodyHtml,
    canonicalUrl,
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
