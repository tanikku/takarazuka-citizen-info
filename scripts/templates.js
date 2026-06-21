export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
</head>
<body>
<header class="site-header">
<a href="/" class="site-title">宝塚市民向け情報サイト</a>
</header>
<main>
${bodyHtml}
</main>
<footer class="site-footer">
<p>本サイトに掲載する記事は、公開情報の要約と出典リンクのみで構成しています。詳細・正式な内容は出典元をご確認ください。</p>
</footer>
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

  const bodyHtml = `<article>
<h1>${escapeHtml(article.title)}</h1>
<p class="article-meta">${escapeHtml(article.publishedAt)}｜${escapeHtml(article.category)}</p>
<p class="article-summary">${escapeHtml(article.summary)}</p>
<p class="article-source">出典：<a href="${escapeHtml(article.sourceUrl)}" rel="noopener" target="_blank">${escapeHtml(article.sourceName)}</a></p>
</article>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

  return layout({
    title: `${article.title }｜宝塚市民向け情報サイト`,
    description: article.summary,
    bodyHtml,
    canonicalUrl,
  });
}

export function indexPage(articles, siteUrl) {
  const items = articles
    .map(
      (article) => `<li class="article-list-item">
<a href="/articles/${article.slug}.html">${escapeHtml(article.title)}</a>
<span class="article-list-date">${escapeHtml(article.publishedAt)}</span>
</li>`,
    )
    .join("\n");

  const bodyHtml = `<h1>宝塚市の最新情報</h1>
<ul class="article-list">
${items}
</ul>`;

  return layout({
    title: "宝塚市民向け情報サイト",
    description: "宝塚市の行政・暮らし情報をまとめた市民向け情報サイト",
    bodyHtml,
    canonicalUrl: `${siteUrl}/`,
  });
}
