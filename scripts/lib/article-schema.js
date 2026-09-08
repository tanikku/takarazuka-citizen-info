// 記事データ（data/articles/*.json・data/drafts/*.json）の検証を集約する。
// promote-drafts.js（公開前）と build.js（公開記事のload後）の両方から呼び、
// Claude Codeが記事JSONを直接編集した場合の不正schemaも検出できるようにする。
//
// 方針：
// - 既存fieldの意味は変更しない。summary は従来どおり記事本文として必須。
// - 新fieldはすべて任意。未定義の既存記事はerrorにならない。
// - 文字数の下限は設けない（短くても事実が正確なら成立する記事があるため）。
import { CATEGORIES } from "../templates.js";

const REQUIRED_STRING_FIELDS = ["slug", "title", "summary", "sourceUrl", "sourceName", "publishedAt", "category", "valueScore"];
const VALUE_SCORES = new Set(["S", "A", "B", "C"]);
// 公開対象スコアの唯一の定義元。build.js / promote-drafts.js / validator が共有する。
// C評価は記事ページ自体が生成されないため、relatedArticles の参照先としても認めない。
export const PUBLISHABLE_SCORES = new Set(["S", "A", "B"]);
const CATEGORY_LABELS = new Set(CATEGORIES.map((c) => c.label));
const DESCRIPTION_WARN_LENGTH = 140;
const RELATED_ARTICLES_MAX = 3;

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim() !== "";
}

// YYYY-MM-DD 形式かつ実在する日付か（2026-02-30 のような値を弾く）
function isValidDateString(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isHttpsUrl(v) {
  if (!isNonEmptyString(v) || !v.startsWith("https://")) return false;
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

// 文字列配列を検証する。存在する場合は1件以上・各要素が非空stringであること。
function validateStringArray(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} は配列である必要があります`);
    return;
  }
  if (value.length === 0) {
    errors.push(`${label} が空です（存在する場合は1件以上必要）`);
    return;
  }
  value.forEach((v, i) => {
    if (!isNonEmptyString(v)) errors.push(`${label}[${i}] が空、または文字列ではありません`);
  });
}

function validateSections(sections, errors) {
  if (!Array.isArray(sections)) {
    errors.push("sections は配列である必要があります");
    return;
  }
  if (sections.length === 0) {
    errors.push("sections が空です（存在する場合は1件以上必要）");
    return;
  }
  sections.forEach((s, i) => {
    const at = `sections[${i}]`;
    if (!s || typeof s !== "object" || Array.isArray(s)) {
      errors.push(`${at} はオブジェクトである必要があります`);
      return;
    }
    if (!isNonEmptyString(s.heading)) errors.push(`${at}.heading が空です`);

    const hasParagraphs = s.paragraphs !== undefined;
    const hasItems = s.items !== undefined;
    // 見出しだけのsection・中身が0件のsectionを禁止する
    if (!hasParagraphs && !hasItems) {
      errors.push(`${at} に paragraphs も items もありません（見出しのみのsectionは作成できません）`);
      return;
    }
    if (hasParagraphs) validateStringArray(s.paragraphs, `${at}.paragraphs`, errors);
    if (hasItems) validateStringArray(s.items, `${at}.items`, errors);
  });
}

// publishedSlugs が渡されたときのみ参照先を検証する。
// 参照先は「公開対象（S/A/B）として存在する記事」でなければならない（C評価はページが生成されず404になる）
function validateRelatedArticles(related, article, publishedSlugs, errors) {
  if (!Array.isArray(related)) {
    errors.push("relatedArticles は配列である必要があります");
    return;
  }
  if (related.length === 0) {
    errors.push("relatedArticles が空です（存在する場合は1件以上必要）");
    return;
  }
  if (related.length > RELATED_ARTICLES_MAX) {
    errors.push(`relatedArticles は最大${RELATED_ARTICLES_MAX}件です（${related.length}件あります）`);
  }
  const seen = new Set();
  related.forEach((slug, i) => {
    if (!isNonEmptyString(slug)) {
      errors.push(`relatedArticles[${i}] が空、または文字列ではありません`);
      return;
    }
    if (slug === article.slug) errors.push(`relatedArticles[${i}] が自分自身（${slug}）を参照しています`);
    if (seen.has(slug)) errors.push(`relatedArticles に重複したslugがあります: ${slug}`);
    seen.add(slug);
    if (publishedSlugs && !publishedSlugs.has(slug)) {
      errors.push(`relatedArticles の参照先が存在しない、または公開対象ではありません（C評価は参照できません）: ${slug}`);
    }
  });
}

// 主出典(sourceUrl)と同じURLの重複は error とする。
// 主出典は記事末尾に必ず表示されるため、sources に同じURLを入れると同一リンクが二重に並び、
// 「追加出典」という表示上の意味と矛盾するため。
function validateSources(sources, article, errors) {
  if (!Array.isArray(sources)) {
    errors.push("sources は配列である必要があります");
    return;
  }
  if (sources.length === 0) {
    errors.push("sources が空です（存在する場合は1件以上必要）");
    return;
  }
  const seen = new Set();
  sources.forEach((s, i) => {
    const at = `sources[${i}]`;
    if (!s || typeof s !== "object" || Array.isArray(s)) {
      errors.push(`${at} はオブジェクトである必要があります`);
      return;
    }
    if (!isHttpsUrl(s.url)) errors.push(`${at}.url が https:// の有効なURLではありません: ${s.url}`);
    if (!isNonEmptyString(s.label)) errors.push(`${at}.label が空です`);
    if (isNonEmptyString(s.url)) {
      if (s.url === article.sourceUrl) errors.push(`${at}.url が主出典(sourceUrl)と同じです: ${s.url}`);
      if (seen.has(s.url)) errors.push(`sources に重複したURLがあります: ${s.url}`);
      seen.add(s.url);
    }
  });
}

function validateComparisonTables(tables, errors) {
  if (!Array.isArray(tables)) {
    errors.push("comparisonTables は配列である必要があります");
    return;
  }
  tables.forEach((t, i) => {
    const at = `comparisonTables[${i}]`;
    if (!t || typeof t !== "object" || Array.isArray(t)) {
      errors.push(`${at} はオブジェクトである必要があります`);
      return;
    }
    if (!Array.isArray(t.headers) || t.headers.length === 0) {
      errors.push(`${at}.headers が空、または配列ではありません`);
      return;
    }
    if (!Array.isArray(t.rows)) {
      errors.push(`${at}.rows が配列ではありません`);
      return;
    }
    t.rows.forEach((row, j) => {
      if (!Array.isArray(row)) {
        errors.push(`${at}.rows[${j}] が配列ではありません`);
        return;
      }
      if (row.length !== t.headers.length) {
        errors.push(`${at}.rows[${j}] の列数(${row.length})が headers(${t.headers.length})と一致しません`);
      }
    });
    if (t.sourceUrl !== undefined && !isHttpsUrl(t.sourceUrl)) {
      errors.push(`${at}.sourceUrl が https:// の有効なURLではありません: ${t.sourceUrl}`);
    }
  });
}

/**
 * 記事1件を検証する。
 * @param {object} article 記事データ
 * @param {{publishedSlugs?: Set<string>}} [context] publishedSlugs を渡すと relatedArticles の参照先を検証する（公開対象S/A/Bのslug集合）
 * @returns {{errors: string[], warnings: string[]}}
 */
export function validateArticle(article, context = {}) {
  const errors = [];
  const warnings = [];
  const { publishedSlugs } = context;

  if (!article || typeof article !== "object" || Array.isArray(article)) {
    return { errors: ["記事データがオブジェクトではありません"], warnings };
  }

  // --- 既存fieldの検証（117記事すべてが現時点で満たしている条件のみ） ---
  for (const key of REQUIRED_STRING_FIELDS) {
    if (!isNonEmptyString(article[key])) errors.push(`${key} が未設定、または空です`);
  }
  if (article.sourceUrl !== undefined && !isHttpsUrl(article.sourceUrl)) {
    errors.push(`sourceUrl が https:// の有効なURLではありません: ${article.sourceUrl}`);
  }
  if (article.publishedAt !== undefined && !isValidDateString(article.publishedAt)) {
    errors.push(`publishedAt が YYYY-MM-DD 形式の実在する日付ではありません: ${article.publishedAt}`);
  }
  if (article.category !== undefined && !CATEGORY_LABELS.has(article.category)) {
    errors.push(`category が定義済みカテゴリーではありません: ${article.category}`);
  }
  if (article.valueScore !== undefined && !VALUE_SCORES.has(article.valueScore)) {
    errors.push(`valueScore は S / A / B / C のいずれかです: ${article.valueScore}`);
  }

  // --- 新field（存在するときのみ検証。未定義の既存記事はここを一切通らない） ---
  if (article.description !== undefined) {
    if (!isNonEmptyString(article.description)) {
      errors.push("description が空、または文字列ではありません");
    } else if (article.description.length > DESCRIPTION_WARN_LENGTH) {
      warnings.push(`description が${article.description.length}字あります（検索結果の表示上は${DESCRIPTION_WARN_LENGTH}字以内が目安）`);
    }
  }

  if (article.updatedAt !== undefined) {
    if (!isValidDateString(article.updatedAt)) {
      errors.push(`updatedAt が YYYY-MM-DD 形式の実在する日付ではありません: ${article.updatedAt}`);
    } else if (isValidDateString(article.publishedAt) && article.updatedAt < article.publishedAt) {
      errors.push(`updatedAt(${article.updatedAt})が publishedAt(${article.publishedAt})より前です`);
    }
  }

  if (article.sections !== undefined) validateSections(article.sections, errors);
  if (article.relatedArticles !== undefined) validateRelatedArticles(article.relatedArticles, article, publishedSlugs, errors);
  if (article.sources !== undefined) validateSources(article.sources, article, errors);
  if (article.comparisonTables !== undefined) validateComparisonTables(article.comparisonTables, errors);

  return { errors, warnings };
}

/**
 * 記事群から「公開対象（S/A/B）」のslug集合を作る。
 * relatedArticles の検証・title解決の両方でこの集合を使い、対象がずれないようにする。
 * @param {object[]} articles
 * @returns {Set<string>}
 */
export function publishableSlugsOf(articles) {
  return new Set(
    articles.filter((a) => PUBLISHABLE_SCORES.has(a?.valueScore) && isNonEmptyString(a?.slug)).map((a) => a.slug)
  );
}

/**
 * 記事一覧をまとめて検証する。
 * relatedArticles の参照先は、渡された記事のうち公開対象（S/A/B）のslugだけで解決する。
 * @param {object[]} articles
 * @returns {{errors: string[], warnings: string[]}} メッセージにはslug（無ければindex）を前置する
 */
export function validateArticles(articles) {
  const publishedSlugs = publishableSlugsOf(articles);
  const errors = [];
  const warnings = [];
  articles.forEach((article, i) => {
    const label = isNonEmptyString(article?.slug) ? article.slug : `articles[${i}]`;
    const result = validateArticle(article, { publishedSlugs });
    result.errors.forEach((e) => errors.push(`${label}: ${e}`));
    result.warnings.forEach((w) => warnings.push(`${label}: ${w}`));
  });
  return { errors, warnings };
}

export const ARTICLE_SCHEMA_LIMITS = {
  RELATED_ARTICLES_MAX,
  DESCRIPTION_WARN_LENGTH,
};
