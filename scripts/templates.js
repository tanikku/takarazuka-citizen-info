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
];

// 市議会会議録サイトの利用規約調査が完了するまでは記事生成対象外。UIのみ先行公開する
export const SHIGIKAI_CATEGORY = { key: "shigikai", label: "市議会", icon: "building" };

export function categoryPath(key) {
  return `/category/${key}.html`;
}

function themeInitScript() {
  return `(function(){try{var s=localStorage.getItem('theme');var t=s||((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
}

function header() {
  return `<header class="site-header">
<div class="header-row">
  <a href="/" class="logo">宝塚タウン<small>市民向け情報ポータル</small></a>
  <button class="theme-toggle" data-theme-toggle type="button" aria-label="ダークモード切り替え">
    <span class="theme-icon theme-icon-sun">${icon("sun")}</span>
    <span class="theme-icon theme-icon-moon">${icon("moon")}</span>
  </button>
</div>
</header>`;
}

function dateBar(dateLabel) {
  return `<div class="date-bar">${icon("calendar")}<span>${escapeHtml(dateLabel)}</span></div>`;
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
<meta property="og:site_name" content="宝塚タウン｜宝塚市民向け情報ポータル">
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
    author: { "@type": "Organization", name: "宝塚タウン編集部" },
    publisher: { "@type": "Organization", name: "宝塚タウン｜宝塚市民向け情報ポータル" },
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
    title: `${article.title}｜宝塚市民向け情報サイト`,
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
};

function sourceBadge(sourceName) {
  const badge = SOURCE_BADGES[sourceName] ?? { label: sourceName, className: "source-other" };
  return `<span class="source-tag ${badge.className}">${escapeHtml(badge.label)}</span>`;
}

function headlineRow(article) {
  const categoryMeta = findCategory(article.category);
  return `<a class="headline-row" href="/articles/${article.slug}.html">
<div class="headline-thumb">${categoryMeta ? icon(categoryMeta.icon) : icon("newspaper")}</div>
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
    return `<div class="panel">
<p class="panel-title">${icon("calendar")}今日の宝塚トピック</p>
<p class="empty-state">本日の新しい記事はまだありません</p>
</div>`;
  }
  const items = todayArticles.map(headlineRow).join("\n");
  return `<div class="panel">
<p class="panel-title">${icon("calendar")}今日の宝塚トピック</p>
${items}
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

  const shigikaiChip = `<a class="category-pill is-comingsoon" href="${categoryPath(SHIGIKAI_CATEGORY.key)}">${icon(SHIGIKAI_CATEGORY.icon)}<span>${escapeHtml(SHIGIKAI_CATEGORY.label)}</span><span class="badge-comingsoon">準備中</span></a>`;

  return `<div class="panel">
<p class="panel-title">${icon("building")}カテゴリーから探す</p>
<div class="category-list">${realChips.join("\n")}\n${shigikaiChip}</div>
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

function rankingOrRecentPanel(ranking, recentArticles) {
  if (ranking) {
    const items = ranking.weekly
      .slice(0, 5)
      .map(
        (entry, i) => `<li class="ranking-item">
<span class="rank-num">${i + 1}</span>
<a class="rank-title" href="/articles/${entry.slug}.html">${escapeHtml(entry.title)}</a>
</li>`,
      )
      .join("\n");
    return `<div class="panel">
<p class="panel-title">${icon("flame")}人気記事ランキング（7日間）</p>
<ol class="ranking-list">${items}</ol>
</div>`;
  }

  const items = recentArticles
    .slice(0, 5)
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

export function indexPage({ topArticles, todayArticles, categoryPreviewSections, categoryPageKeys, publishedArticles, ranking, dateLabel, siteUrl }) {
  const bodyHtml = `${dateBar(dateLabel)}
<div class="grid-2">
  <div class="col-main">
    ${topNewsPanel(topArticles)}
    ${todayTopicPanel(todayArticles)}
    ${categoryPanel(categoryPageKeys)}
    ${categoryPreviewSections.map(categoryPreviewSection).join("\n")}
  </div>
  <div class="col-side">
    ${rankingOrRecentPanel(ranking, publishedArticles)}
    ${recentListPanel(publishedArticles)}
  </div>
</div>`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "宝塚タウン｜宝塚市民向け情報ポータル",
    url: `${siteUrl}/`,
    description: "宝塚市の行政・暮らし情報をまとめた市民向け情報サイト",
  };

  return layout({
    title: "宝塚市民向け情報サイト｜宝塚タウン",
    description: "宝塚市の行政・暮らし情報をまとめた市民向け情報サイト",
    bodyHtml,
    canonicalUrl: `${siteUrl}/`,
    structuredData,
  });
}

export function categoryPage(category, articles, siteUrl) {
  const canonicalUrl = `${siteUrl}${categoryPath(category.key)}`;
  const items = articles.map(headlineRow).join("\n");

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; ${escapeHtml(category.label)}</nav>
<div class="page-content">
<div class="panel">
<p class="panel-title">${icon(category.icon)}${escapeHtml(category.label)}の記事一覧</p>
${items || '<p class="empty-state">まだ記事がありません</p>'}
</div>
</div>`;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.label}の記事一覧｜宝塚タウン`,
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
    title: `${category.label}の記事一覧｜宝塚市民向け情報サイト`,
    description: `宝塚市の「${category.label}」に関する記事一覧です。`,
    bodyHtml,
    canonicalUrl,
    structuredData: [collectionLd, breadcrumbLd],
  });
}

export function comingSoonCategoryPage(siteUrl) {
  const canonicalUrl = `${siteUrl}${categoryPath(SHIGIKAI_CATEGORY.key)}`;

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; 市議会</nav>
<div class="page-content">
<div class="panel">
<p class="panel-title">${icon(SHIGIKAI_CATEGORY.icon)}市議会ウォッチ（準備中）</p>
<p>現在、公開情報の利用条件を確認中です。</p>
<p>確認完了後に市議会情報の要約配信を開始予定です。</p>
</div>
</div>`;

  return layout({
    title: "市議会ウォッチ（準備中）｜宝塚市民向け情報サイト",
    description: "宝塚市議会に関する情報配信は、公開情報の利用条件確認後に開始予定です。",
    bodyHtml,
    canonicalUrl,
  });
}
