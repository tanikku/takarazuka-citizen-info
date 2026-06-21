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
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>',
  child: '<circle cx="12" cy="7" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
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

export const CATEGORIES = [
  { label: "行政・くらし", icon: "building" },
  { label: "防犯・安全", icon: "shield" },
  { label: "イベント", icon: "calendar" },
  { label: "子育て", icon: "child" },
  { label: "文化・観光", icon: "camera" },
];

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

export function layout({ title, description, bodyHtml, canonicalUrl }) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
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
<script src="/js/theme.js" defer></script>
</body>
</html>
`;
}

export function articlePage(article, siteUrl) {
  const canonicalUrl = `${siteUrl}/articles/${article.slug}.html`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    datePublished: article.publishedAt,
    description: article.summary,
    url: canonicalUrl,
  };
  const categoryMeta = CATEGORIES.find((c) => c.label === article.category);

  const bodyHtml = `<article class="article-detail">
<p class="category-tag">${categoryMeta ? icon(categoryMeta.icon) : icon("newspaper")}${escapeHtml(article.category)}</p>
<h1>${escapeHtml(article.title)}</h1>
<p class="article-meta">${escapeHtml(article.publishedAt)}</p>
<p class="article-summary">${escapeHtml(article.summary)}</p>
<p class="article-source">出典：<a href="${escapeHtml(article.sourceUrl)}" rel="noopener" target="_blank">${escapeHtml(article.sourceName)}</a></p>
<p class="back-link"><a href="/">${icon("newspaper")}トップへ戻る</a></p>
</article>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

  return layout({
    title: `${article.title}｜宝塚市民向け情報サイト`,
    description: article.summary,
    bodyHtml,
    canonicalUrl,
  });
}

function headlineRow(article) {
  const categoryMeta = CATEGORIES.find((c) => c.label === article.category);
  return `<a class="headline-row" href="/articles/${article.slug}.html">
<div class="headline-thumb">${categoryMeta ? icon(categoryMeta.icon) : icon("newspaper")}</div>
<div>
  <p class="headline-title"><span class="topic-tag">${escapeHtml(article.category)}</span>${escapeHtml(article.title)}</p>
  <p class="headline-meta">${escapeHtml(article.publishedAt)}・${escapeHtml(article.sourceName)}</p>
</div>
</a>`;
}

function topNewsPanel(articles) {
  const items = articles.slice(0, 3).map(headlineRow).join("\n");
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

function categoryPanel(categorySections) {
  const chips = CATEGORIES.map((cat) => {
    const section = categorySections.find((s) => s.label === cat.label);
    const count = section ? section.articles.length : 0;
    const className = count > 0 ? "category-pill" : "category-pill is-empty";
    const inner = `${icon(cat.icon)}<span>${escapeHtml(cat.label)}</span>`;
    return count > 0
      ? `<a class="${className}" href="#cat-${categorySlug(cat.label)}">${inner}</a>`
      : `<span class="${className}">${inner}</span>`;
  }).join("\n");

  return `<div class="panel">
<p class="panel-title">${icon("building")}カテゴリーから探す</p>
<div class="category-list">${chips}</div>
</div>`;
}

function categorySlug(label) {
  return Buffer.from(label).toString("base64url").slice(0, 12);
}

function categorySection(section) {
  const items = section.articles.slice(0, 5).map(headlineRow).join("\n");
  return `<div class="panel" id="cat-${categorySlug(section.label)}">
<p class="panel-title">${icon(section.icon)}${escapeHtml(section.label)}</p>
${items}
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

function recentListPanel(articles) {
  const items = articles.slice(0, 30).map(headlineRow).join("\n");
  return `<div class="panel">
<p class="panel-title">${icon("bell")}新着記事一覧</p>
${items || '<p class="empty-state">まだ記事がありません</p>'}
</div>`;
}

export function indexPage({ articles, todayArticles, categorySections, ranking, dateLabel, siteUrl }) {
  const bodyHtml = `${dateBar(dateLabel)}
<div class="grid-2">
  <div class="col-main">
    ${topNewsPanel(articles)}
    ${todayTopicPanel(todayArticles)}
    ${categoryPanel(categorySections)}
    ${categorySections.map(categorySection).join("\n")}
  </div>
  <div class="col-side">
    ${rankingOrRecentPanel(ranking, articles)}
    ${recentListPanel(articles)}
  </div>
</div>`;

  return layout({
    title: "宝塚市民向け情報サイト｜宝塚タウン",
    description: "宝塚市の行政・暮らし情報をまとめた市民向け情報サイト",
    bodyHtml,
    canonicalUrl: `${siteUrl}/`,
  });
}
