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
<p>公式X：<a href="https://x.com/TakaTodayJP" target="_blank" rel="noopener">@TakaTodayJP</a></p>
<p class="footer-links"><a href="/privacy.html">プライバシーポリシー</a>　<a href="/about.html">運営者情報</a>　<a href="/ad-policy.html">PR・広告掲載ポリシー</a>　<a href="/contact.html">お問い合わせ</a></p>
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

export function indexPage({ topArticles, todayArticles, categoryPageKeys, publishedArticles, ranking, weather, todayCounts, photoOfDay, dateLabel, siteUrl }) {
  const bodyHtml = `${dateBar(dateLabel)}
${todayPanel({ weather, counts: todayCounts })}
${quickAccessPanel()}
${todayRow(todayArticles, photoOfDay)}
<div class="grid-2">
  <div class="col-main">
    ${topNewsPanel(topArticles)}
    ${guideNavPanel()}
    ${recentCombinedFeed(publishedArticles, categoryPageKeys)}
    ${categoryPanel(categoryPageKeys)}
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
  <p class="headline-title"><span class="badge-ai-editorial">AI要約・編集確認済</span>${escapeHtml(article.title)}</p>
  <p class="headline-meta">${escapeHtml(article.meetingType ?? "")}・${escapeHtml(article.meetingDate ?? article.publishedAt)}・出典：宝塚市議会会議録検索システム</p>
</div>
</a>`;
}

function guideCard(guide) {
  return `<a class="guide-card" href="/category/${guide.categoryKey}/${escapeHtml(guide.slug)}.html">
<div class="icon-box">${icon(guide.category.icon)}</div>
<div>
  <div class="label">${escapeHtml(guide.title)}</div>
  <div class="sub">${escapeHtml(guide.cardSummary)}</div>
</div>
</a>`;
}

export function categoryPage(category, articles, siteUrl, guidesForCategory = []) {
  const canonicalUrl = `${siteUrl}${categoryPath(category.key)}`;
  const isShigikai = category.key === "shigikai";
  const items = articles.map(isShigikai ? gikaiRow : headlineRow).join("\n");
  const giinLink = isShigikai
    ? `<p class="panel-note"><a href="/giin/">議員活動サマリー一覧を見る →</a>　<a href="/category/shigikai/guide.html">市議会のしくみ・このページの見方 →</a></p>`
    : "";
  const guideCards = guidesForCategory.map(guideCard).join("\n");

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; ${escapeHtml(category.label)}</nav>
<div class="page-content">
${guideCards}
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

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "ライブカメラ", item: canonicalUrl },
    ],
  };

  return layout({
    title: "宝塚市内のライブカメラ｜Takarazuka Today",
    description: "宝塚市内（武庫川流域）の河川監視ライブカメラを、国土交通省「川の防災情報」など公式ソースへのリンクでご案内します。",
    bodyHtml,
    canonicalUrl,
    structuredData: breadcrumbLd,
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
    description: "宝塚市議会のしくみ、本会議と委員会の違い、本サイト「市議会ウォッチ」の見方を解説します。",
    bodyHtml,
    canonicalUrl,
    structuredData: [breadcrumbLd, faqLd],
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

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; <a href="${categoryPath(guide.category.key)}">${escapeHtml(guide.category.label)}</a> &gt; ${escapeHtml(guide.title)}</nav>
<div class="page-content">
<h1>${escapeHtml(guide.title)}</h1>
<p class="lead">${escapeHtml(guide.lead)}</p>
<p class="updated-at">最終更新：${escapeHtml(guide.updatedAt)}</p>
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
