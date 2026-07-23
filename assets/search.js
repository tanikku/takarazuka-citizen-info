// サイト内検索（純粋なJavaScript、外部ライブラリ不使用）
// /search-index.json はビルドごとに自動生成されるため、記事・ガイドを追加するだけで検索対象になる
(function () {
  "use strict";

  var INDEX_URL = "/search-index.json";
  var SUGGESTION_LIMIT = 8;
  var RESULT_LIMIT = 50;
  var indexPromise = null;

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(INDEX_URL)
        .then(function (res) { return res.json(); })
        .catch(function () { return []; });
    }
    return indexPromise;
  }

  function normalize(s) {
    if (!s) return "";
    var n = s.toLowerCase();
    if (n.normalize) n = n.normalize("NFKC");
    return n;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // タイトル一致を最優先、次にキーワード・カテゴリ、最後にdescription。複数語（スペース区切り）はAND検索
  function scoreEntry(entry, terms) {
    var title = normalize(entry.title);
    var description = normalize(entry.description);
    var category = normalize(entry.category);
    var keywords = normalize(entry.keywords);
    var total = 0;

    for (var i = 0; i < terms.length; i++) {
      var term = terms[i];
      if (!term) continue;
      var score = 0;
      if (title.indexOf(term) !== -1) score = Math.max(score, title.indexOf(term) === 0 ? 100 : 60);
      if (category.indexOf(term) !== -1) score = Math.max(score, 30);
      if (keywords.indexOf(term) !== -1) score = Math.max(score, 25);
      if (description.indexOf(term) !== -1) score = Math.max(score, 15);
      if (score === 0) return 0; // AND検索：1語でも一致しなければ除外
      total += score;
    }
    return total;
  }

  function search(query, index, limit) {
    var terms = normalize(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    var scored = index
      .map(function (entry) { return { entry: entry, score: scoreEntry(entry, terms) }; })
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit)
      .map(function (r) { return r.entry; });
    return scored;
  }

  function suggestionItemHtml(entry) {
    return (
      '<a class="search-suggestion-item" href="' + escapeHtml(entry.url) + '">' +
      '<span class="search-suggestion-title">' + escapeHtml(entry.title) + "</span>" +
      (entry.category ? '<span class="search-suggestion-cat">' + escapeHtml(entry.category) + "</span>" : "") +
      "</a>"
    );
  }

  function resultItemHtml(entry) {
    return (
      '<a class="headline-row search-result-item" href="' + escapeHtml(entry.url) + '">' +
      "<div>" +
      '<p class="headline-title">' + escapeHtml(entry.title) + "</p>" +
      '<p class="headline-meta">' + (entry.category ? escapeHtml(entry.category) + "・" : "") + escapeHtml(entry.description || "") + "</p>" +
      "</div>" +
      "</a>"
    );
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function initSuggestions() {
    var input = document.getElementById("site-search-input");
    var box = document.getElementById("site-search-suggestions");
    if (!input || !box) return;

    function hide() {
      box.hidden = true;
      box.innerHTML = "";
    }

    var runSearch = debounce(function () {
      var q = input.value.trim();
      if (!q) { hide(); return; }
      loadIndex().then(function (index) {
        var results = search(q, index, SUGGESTION_LIMIT);
        if (results.length === 0) { hide(); return; }
        box.innerHTML = results.map(suggestionItemHtml).join("");
        box.hidden = false;
      });
    }, 150);

    input.addEventListener("input", runSearch);
    input.addEventListener("focus", function () { if (input.value.trim()) runSearch(); });
    document.addEventListener("click", function (e) {
      if (e.target !== input && !box.contains(e.target)) hide();
    });
  }

  function initResultsPage() {
    var input = document.getElementById("site-search-input");
    var resultsBox = document.getElementById("site-search-results");
    if (!input || !resultsBox) return;

    function render(q) {
      if (!q) {
        resultsBox.innerHTML = '<p class="empty-state">検索キーワードを入力してください。</p>';
        return;
      }
      loadIndex().then(function (index) {
        var results = search(q, index, RESULT_LIMIT);
        if (results.length === 0) {
          resultsBox.innerHTML = '<p class="empty-state">「' + escapeHtml(q) + '」に一致するページが見つかりませんでした。</p>';
          return;
        }
        resultsBox.innerHTML =
          '<p class="search-result-count">「' + escapeHtml(q) + '」の検索結果：' + results.length + "件</p>" +
          results.map(resultItemHtml).join("\n");
      });
    }

    var params = new URLSearchParams(window.location.search);
    var initialQuery = params.get("q") || "";
    input.value = initialQuery;
    render(initialQuery);

    input.addEventListener("input", debounce(function () { render(input.value.trim()); }, 200));
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSuggestions();
    initResultsPage();
  });
})();
