// 検索エンジンにインデックスさせるか（robots noindex）の唯一の定義元。
// article-schema.js（検証）・templates.js（robotsメタ）・build.js（sitemap）が共有する。
//
// 方針：
// - 記事の indexing は任意。未設定は通常どおり index で、指定できる値は "noindex" だけ。
// - 記事の status（終了・受付終了・復旧済み）とは別の概念で、互いに連動させない。
// - noindex は「検索エンジンの検索結果に載せない」だけで、ページは公開したまま。
//   内部リンク・サイト内検索（search-index）からは外さない。
// - sitemap は「検索エンジンにインデックスしてほしいURLの一覧」なので、noindex のURLは載せない。

export const INDEXING_VALUES = ["noindex"];

export function isIndexingValue(value) {
  return INDEXING_VALUES.includes(value);
}

export function isArticleIndexable(article) {
  return article?.indexing !== "noindex";
}

// 記事1件のsitemap候補。noindex の記事も noindex: true 付きで返し、除外は indexableSitemapEntries に任せる
export function articleSitemapEntry(article, siteUrl) {
  return {
    loc: `${siteUrl}/articles/${article.slug}`,
    lastmod: article.updatedAt ?? article.publishedAt,
    noindex: !isArticleIndexable(article),
  };
}

// sitemap共通ルール：noindex の項目を除く。記事以外のページも { noindex: true } を付ければ同じ規則で外れる
export function indexableSitemapEntries(entries) {
  return entries.filter((entry) => !entry.noindex);
}
