// article-schema.js の単体テスト（Node標準の node:test を使用。外部ライブラリは追加しない）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { validateArticle, validateArticles, publishableSlugsOf, PUBLISHABLE_SCORES } from "./article-schema.js";

// 既存117記事と同じ形（新fieldを一切持たない）の記事
function legacyArticle(overrides = {}) {
  return {
    slug: "test-article-2026",
    title: "テスト記事のタイトル",
    summary: "テスト用の要約本文です。",
    sourceUrl: "https://www.city.takarazuka.hyogo.jp/example.html",
    sourceName: "宝塚市公式サイト",
    publishedAt: "2026-09-01",
    category: "行政・くらし",
    valueScore: "A",
    ...overrides,
  };
}

// 新fieldをすべて持つ記事
function extendedArticle(overrides = {}) {
  return legacyArticle({
    description: "検索結果とOGPに使う短い概要です。",
    updatedAt: "2026-09-05",
    sections: [
      { heading: "何が変わる？", paragraphs: ["1つ目の段落です。", "2つ目の段落です。"] },
      { heading: "対象者", items: ["市内在住の方", "市内在勤の方"] },
      { heading: "手続き", paragraphs: ["窓口で申請します。"], items: ["本人確認書類", "印鑑"] },
    ],
    relatedArticles: ["other-article-2026"],
    sources: [{ url: "https://web.pref.hyogo.lg.jp/example.html", label: "兵庫県公式サイト" }],
    comparisonTables: [
      { title: "変更前後", headers: ["項目", "変更前", "変更後"], rows: [["料金", "300円", "400円"]] },
    ],
    ...overrides,
  });
}

const publishedSlugs = new Set(["test-article-2026", "other-article-2026"]);
const ctx = { publishedSlugs };

const errorsOf = (article) => validateArticle(article, ctx).errors;

test("legacy記事（新field無し）はPASSする", () => {
  const { errors, warnings } = validateArticle(legacyArticle(), ctx);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("新fieldをすべて持つ記事はPASSする", () => {
  const { errors } = validateArticle(extendedArticle(), ctx);
  assert.deepEqual(errors, []);
});

test("必須fieldが欠けているとFAILする", () => {
  for (const key of ["slug", "title", "summary", "sourceUrl", "sourceName", "publishedAt", "category", "valueScore"]) {
    const article = legacyArticle();
    delete article[key];
    assert.ok(errorsOf(article).some((e) => e.startsWith(key)), `${key} の欠落が検出されない`);
  }
});

test("sourceUrlがhttpsでないとFAILする", () => {
  assert.ok(errorsOf(legacyArticle({ sourceUrl: "http://example.com/" })).some((e) => e.includes("sourceUrl")));
});

test("存在しない日付のpublishedAtはFAILする", () => {
  assert.ok(errorsOf(legacyArticle({ publishedAt: "2026-02-30" })).some((e) => e.includes("publishedAt")));
});

test("未知のcategory・不正なvalueScoreはFAILする", () => {
  assert.ok(errorsOf(legacyArticle({ category: "存在しない分類" })).some((e) => e.includes("category")));
  assert.ok(errorsOf(legacyArticle({ valueScore: "X" })).some((e) => e.includes("valueScore")));
});

test("空のsection（paragraphs/itemsが0件）はFAILする", () => {
  const errors = errorsOf(extendedArticle({ sections: [{ heading: "見出し", items: [] }] }));
  assert.ok(errors.some((e) => e.includes("items")));
});

test("見出しのみのsectionはFAILする", () => {
  const errors = errorsOf(extendedArticle({ sections: [{ heading: "見出しだけ" }] }));
  assert.ok(errors.some((e) => e.includes("見出しのみ")));
});

test("headingが空のsectionはFAILする", () => {
  const errors = errorsOf(extendedArticle({ sections: [{ heading: "  ", paragraphs: ["本文"] }] }));
  assert.ok(errors.some((e) => e.includes("heading")));
});

test("sectionsが空配列だとFAILする", () => {
  assert.ok(errorsOf(extendedArticle({ sections: [] })).some((e) => e.includes("sections")));
});

test("不正な形式のupdatedAtはFAILする", () => {
  assert.ok(errorsOf(extendedArticle({ updatedAt: "2026/09/05" })).some((e) => e.includes("updatedAt")));
  assert.ok(errorsOf(extendedArticle({ updatedAt: "2026-13-01" })).some((e) => e.includes("updatedAt")));
});

test("updatedAt < publishedAt はFAILする", () => {
  const errors = errorsOf(extendedArticle({ publishedAt: "2026-09-05", updatedAt: "2026-09-01" }));
  assert.ok(errors.some((e) => e.includes("より前")));
});

test("updatedAt === publishedAt はPASSする", () => {
  const { errors } = validateArticle(extendedArticle({ publishedAt: "2026-09-05", updatedAt: "2026-09-05" }), ctx);
  assert.deepEqual(errors, []);
});

test("relatedArticlesが自分自身を参照するとFAILする", () => {
  const errors = errorsOf(extendedArticle({ relatedArticles: ["test-article-2026"] }));
  assert.ok(errors.some((e) => e.includes("自分自身")));
});

test("relatedArticlesの参照先が存在しないとFAILする", () => {
  const errors = errorsOf(extendedArticle({ relatedArticles: ["does-not-exist-2026"] }));
  assert.ok(errors.some((e) => e.includes("公開対象ではありません")));
});

test("relatedArticlesが4件以上・重複ありだとFAILする", () => {
  assert.ok(
    errorsOf(extendedArticle({ relatedArticles: ["a", "b", "c", "d"] })).some((e) => e.includes("最大3件"))
  );
  const dup = errorsOf(extendedArticle({ relatedArticles: ["other-article-2026", "other-article-2026"] }));
  assert.ok(dup.some((e) => e.includes("重複")));
});

test("sourcesのURL重複・主出典との重複はFAILする", () => {
  const dup = errorsOf(
    extendedArticle({
      sources: [
        { url: "https://web.pref.hyogo.lg.jp/a.html", label: "県A" },
        { url: "https://web.pref.hyogo.lg.jp/a.html", label: "県A（重複）" },
      ],
    })
  );
  assert.ok(dup.some((e) => e.includes("重複")));

  const sameAsMain = errorsOf(
    extendedArticle({ sources: [{ url: legacyArticle().sourceUrl, label: "主出典と同じ" }] })
  );
  assert.ok(sameAsMain.some((e) => e.includes("主出典")));
});

test("sourcesのlabel空・非httpsはFAILする", () => {
  assert.ok(
    errorsOf(extendedArticle({ sources: [{ url: "https://example.com/a", label: "" }] })).some((e) => e.includes("label"))
  );
  assert.ok(
    errorsOf(extendedArticle({ sources: [{ url: "http://example.com/a", label: "ラベル" }] })).some((e) => e.includes("url"))
  );
});

test("comparisonTablesの列数不一致はFAILする", () => {
  const errors = errorsOf(
    extendedArticle({
      comparisonTables: [{ title: "表", headers: ["A", "B", "C"], rows: [["1", "2"]] }],
    })
  );
  assert.ok(errors.some((e) => e.includes("列数")));
});

test("descriptionが空だとFAIL、140字超はwarningでPASSする", () => {
  assert.ok(errorsOf(extendedArticle({ description: "" })).some((e) => e.includes("description")));
  const long = validateArticle(extendedArticle({ description: "あ".repeat(200) }), ctx);
  assert.deepEqual(long.errors, []);
  assert.ok(long.warnings.some((w) => w.includes("description")));
});

test("relatedArticles → 公開対象(S/A/B)の記事はPASSする", () => {
  for (const score of ["S", "A", "B"]) {
    const target = legacyArticle({ slug: "target-2026", valueScore: score });
    const source = legacyArticle({ slug: "source-2026", relatedArticles: ["target-2026"] });
    assert.deepEqual(validateArticles([source, target]).errors, [], `valueScore=${score} が参照できない`);
  }
});

test("relatedArticles → 存在するがC評価（非公開）の記事はFAILする", () => {
  const hidden = legacyArticle({ slug: "hidden-c-2026", valueScore: "C" });
  const source = legacyArticle({ slug: "source-2026", relatedArticles: ["hidden-c-2026"] });
  const errors = validateArticles([source, hidden]).errors;
  assert.ok(errors.some((e) => e.includes("公開対象ではありません")), "C評価への参照が許可されている");
  assert.ok(errors.some((e) => e.includes("hidden-c-2026")));
});

test("publishableSlugsOf は S/A/B だけを返す", () => {
  const articles = [
    legacyArticle({ slug: "s-2026", valueScore: "S" }),
    legacyArticle({ slug: "a-2026", valueScore: "A" }),
    legacyArticle({ slug: "b-2026", valueScore: "B" }),
    legacyArticle({ slug: "c-2026", valueScore: "C" }),
  ];
  const slugs = publishableSlugsOf(articles);
  assert.deepEqual([...slugs].sort(), ["a-2026", "b-2026", "s-2026"]);
  assert.equal(slugs.has("c-2026"), false);
});

// build.js / promote-drafts.js はこの定数をimportして使うため、値の一致確認は不要。
// ここではドメインルール「公開対象 = S/A/B」自体が変わっていないことだけを守る。
test("PUBLISHABLE_SCORES は S/A/B のみ（公開対象のドメインルール）", () => {
  assert.deepEqual([...PUBLISHABLE_SCORES].sort(), ["A", "B", "S"]);
});

// promote-drafts.js の knownSlugs 生成ロジックと同じ条件を検証する。
// 既存の公開対象記事 ＋ 今回approvedかつS/A/Bのdraft だけが参照先になる。
test("promote相当のslug集合は、既存公開記事と approved S/A/B draft だけを含む", () => {
  const existingArticles = [
    legacyArticle({ slug: "existing-published-2026", valueScore: "A" }),
    legacyArticle({ slug: "existing-hidden-2026", valueScore: "C" }),
  ];
  const drafts = [
    { ...legacyArticle({ slug: "draft-published-2026", valueScore: "B" }), approved: true },
    { ...legacyArticle({ slug: "draft-hidden-2026", valueScore: "C" }), approved: true },
    { ...legacyArticle({ slug: "draft-unapproved-2026", valueScore: "A" }), approved: false },
  ];

  const publishedSlugsForPromote = new Set();
  for (const a of existingArticles) {
    if (PUBLISHABLE_SCORES.has(a.valueScore) && a.slug) publishedSlugsForPromote.add(a.slug);
  }
  for (const d of drafts) {
    if (d.approved === true && d.slug && PUBLISHABLE_SCORES.has(d.valueScore)) publishedSlugsForPromote.add(d.slug);
  }

  assert.deepEqual([...publishedSlugsForPromote].sort(), ["draft-published-2026", "existing-published-2026"]);

  // 同時promoteされる公開記事同士は参照できる
  const draftWithRelated = legacyArticle({ slug: "another-draft-2026", relatedArticles: ["draft-published-2026"] });
  assert.deepEqual(validateArticle(draftWithRelated, { publishedSlugs: publishedSlugsForPromote }).errors, []);

  // C評価のdraft・未承認draftは参照できない
  for (const slug of ["draft-hidden-2026", "draft-unapproved-2026", "existing-hidden-2026"]) {
    const bad = legacyArticle({ slug: "another-draft-2026", relatedArticles: [slug] });
    const errors = validateArticle(bad, { publishedSlugs: publishedSlugsForPromote }).errors;
    assert.ok(errors.some((e) => e.includes("公開対象ではありません")), `${slug} への参照が許可されている`);
  }
});

test("validateArticles はslugを前置し、記事間でrelatedArticlesを解決する", () => {
  const a = legacyArticle({ slug: "a-2026", relatedArticles: ["b-2026"] });
  const b = legacyArticle({ slug: "b-2026" });
  assert.deepEqual(validateArticles([a, b]).errors, []);

  const orphan = legacyArticle({ slug: "a-2026", relatedArticles: ["missing-2026"] });
  const errors = validateArticles([orphan]).errors;
  assert.ok(errors.length > 0);
  assert.ok(errors[0].startsWith("a-2026: "));
});
