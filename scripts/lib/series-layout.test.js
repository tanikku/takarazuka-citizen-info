// 「宝塚の実力」第3回以降の読みやすさ（表示の指定）のテスト。
// 第1・2弾の表示は変えない：新しい指定（labels:top・phrase・compact・per列）と、第3回以降の枠（jf--phrase）が、
// 指定のないブロックや第2回のページには一切出ないことを確かめる。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateBlocks, renderBlock, tableRowValues } from "./series-blocks.js";
import { episodePage, validateEpisodeShape } from "./series-episodes.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = "https://takarazuka-today.jp";

const bars = (over = {}) => ({ t: "bars", id: "b1", title: "題", desc: "説明", max: 10, groups: [{ title: "g", rows: [{ label: "とても長い項目名の会派", value: 5 }] }], ...over });
const table = (over = {}) => ({ t: "table", caption: "表", cols: [{ h: "市", kind: "text" }, { h: "人口", kind: "num" }, { h: "定数", kind: "num" }, { h: "1人あたり", kind: "per", a: 1, b: 2 }], rows: [["A市", 217157, 26, null], ["B市", 100, 0, null]], ...over });
const stats = (over = {}) => ({ t: "stats", aria: "a", items: [{ label: "L", sub: "S", values: [{ city: "x", num: "1" }, { city: "y", num: "2" }] }], ...over });

test("per列：a ÷ b を描画時に計算して整数で出す。割る数が0なら空欄（—）", () => {
  const b = table();
  assert.deepEqual(validateBlocks([b]), []);
  assert.equal(tableRowValues(b.cols, b.rows[0])[3], 217157 / 26);
  const html = renderBlock(b);
  assert.ok(html.includes("<td>8,352</td>"), "217,157 ÷ 26 = 8,352");
  assert.equal(tableRowValues(b.cols, b.rows[1])[3], null);
  assert.ok(renderBlock(b).includes("<td>—</td>"));
});

test("per列：左にある数値の列だけを参照できる（形の誤りを検出する）", () => {
  assert.ok(validateBlocks([table({ cols: [{ h: "市", kind: "text" }, { h: "人口", kind: "num" }, { h: "x", kind: "per", a: 1, b: 5 }] })]).length > 0);
  assert.ok(validateBlocks([table({ cols: [{ h: "市", kind: "text" }, { h: "人口", kind: "num" }, { h: "x", kind: "per", a: 0, b: 1 }], rows: [["A", 1, null]] })]).length > 0, "text列は参照できない");
});

test("表示の指定：labels・phrase・compact は決まった値だけ。指定がなければ従来のHTMLのまま", () => {
  assert.deepEqual(validateBlocks([bars({ labels: "top" }), stats({ phrase: true }), table({ compact: true })]), []);
  assert.ok(validateBlocks([bars({ labels: "left" })]).length > 0);
  assert.ok(validateBlocks([stats({ phrase: "yes" })]).length > 0);
  assert.ok(validateBlocks([table({ compact: 1 })]).length > 0);
  // 指定なし：新しいクラスは出ない（第1・2回の見た目を変えない）
  for (const b of [bars(), stats(), table()]) assert.ok(!/jf-bars--top|jf-stats--phrase|jf-table--compact|jf-table-wrap--compact/.test(renderBlock(b)));
  // 指定あり
  assert.ok(renderBlock(bars({ labels: "top" })).includes('class="jf-bars jf-bars--top"'));
  assert.ok(renderBlock(stats({ phrase: true })).includes("jf-stats--phrase"));
  const t = renderBlock(table({ compact: true }));
  assert.ok(t.includes("jf-table-wrap--compact") && t.includes("jf-table--compact"));
});

test("ページ：第3回以降の枠だけに jf--phrase が付く。第2回の実ページには新しいクラスが一切出ない", () => {
  const ep = (episode) => ({ slug: "x", episode, title: "題", description: "d", status: "draft", plannedAt: "2026-11-14", content: { sections: [{ heading: "h", blocks: [{ t: "p", text: "本文" }] }], sources: [{ label: "s", url: "https://example.go.jp/a" }] } });
  assert.ok(episodePage(ep(3), SITE).includes('<div class="jf jf--phrase">'));
  assert.ok(episodePage(ep(2), SITE).includes('<div class="jf">') && !episodePage(ep(2), SITE).includes("jf--phrase"));
  const real = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "jitsuryoku", "episodes", "population-takarazuka-nagareyama.json"), "utf8"));
  const html = episodePage(real, SITE);
  assert.ok(!/jf--phrase|jf-bars--top|jf-stats--phrase|jf-table--compact|jf-table-wrap--compact/.test(html), "公開済みの第2回に新しい表示の指定が入っていない");
});

test("CSS：新しい表示のルールは、第3回以降の枠・指定したクラスだけを対象にし、共通のクラスを直接書き換えない", () => {
  const css = fs.readFileSync(path.join(ROOT, "assets", "style.css"), "utf8");
  const start = css.indexOf("「宝塚の実力」第3回以降の読みやすさ");
  assert.ok(start > 0);
  const added = css.slice(start);
  // ルールのセレクタ（{ の前）を取り出し、すべてが新しいクラスで始まることを確かめる
  const selectors = [...added.matchAll(/(?:^|\})\s*([^{}@/][^{}]*)\{/g)].map((m) => m[1].trim()).filter(Boolean);
  assert.ok(selectors.length > 10);
  for (const sel of selectors) for (const part of sel.split(",").map((x) => x.trim()).filter((x) => x && !x.startsWith("@"))) {
    // 第4回で加えた数値カード（.jf-kpi*）・数字のまとまり（.jf-nb）・通常の折り返しの枠（.jf--normal）も、新しいクラスだけを対象にする
    assert.match(part, /\.jf--phrase|\.jf-bars--top|\.jf-stats--phrase|\.jf-table--compact|\.jf-table-wrap--compact|\.jf-kpi|\.jf-nb|\.jf--normal/, `既存の共通クラスを直接変えている: ${part}`);
  }
});

test("ページ：content.textWrap が normal の回だけ jf--phrase を付けない（第4回）。値の誤りは検出する。第3回の実ページは従来どおり", () => {
  const ep = (content) => ({ slug: "x", episode: 4, title: "題", description: "d", status: "draft", plannedAt: "2026-11-21", content: { sections: [{ heading: "h", blocks: [{ t: "p", text: "本文" }] }], sources: [{ label: "s", url: "https://example.com/" }], ...content } });
  assert.ok(episodePage(ep({}), SITE).includes('<div class="jf jf--phrase">'), "指定なしは従来どおり");
  assert.ok(episodePage(ep({ textWrap: "normal" }), SITE).includes('<div class="jf jf--normal">'));
  assert.ok(validateEpisodeShape(ep({ textWrap: "normal" })).length === 0);
  assert.ok(validateEpisodeShape(ep({ textWrap: "phrase" })).some((e) => e.includes("textWrap")));
  const ep3 = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "jitsuryoku", "episodes", "council-overview-takarazuka.json"), "utf8"));
  assert.ok(episodePage(ep3, SITE).includes('<div class="jf jf--phrase">'), "公開済みの第3回は変わらない");
});


test("数値カード（kpi）：指標名・数値・比較結果・説明を縦に積む。形の誤りを検出し、第2・3回の実ページには出ない", () => {
  const kpi = { t: "kpi", aria: "a", items: [{ label: "経常収支比率", value: "96.9%", note: "6都市で2番目に高い", desc: "説明" }] };
  assert.deepEqual(validateBlocks([kpi]), []);
  assert.ok(validateBlocks([{ ...kpi, items: [{ label: "x", value: "1" }] }]).length > 0);
  const html = renderBlock(kpi);
  assert.ok(/<li class="jf-kpi"><span class="jf-kpi__lbl">経常収支比率<\/span><b class="jf-kpi__num">96\.9%<\/b><span class="jf-kpi__note">6都市で2番目に高い<\/span><span class="jf-kpi__desc">説明<\/span><\/li>/.test(html));
  for (const f of ["population-takarazuka-nagareyama.json", "council-overview-takarazuka.json"]) {
    const real = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "jitsuryoku", "episodes", f), "utf8"));
    const page = episodePage(real, SITE);
    assert.ok(!/jf-kpi|jf-nb|jf--normal/.test(page), f);
  }
});

test("通常の折り返しの回だけ、本文の数字と単位のまとまりを jf-nb で包む（タグの属性は変えない）", () => {
  const ep = (content) => ({ slug: "x", episode: 4, title: "題", description: "d", status: "draft", plannedAt: "2026-11-21", content: { sections: [{ heading: "h", blocks: [{ t: "p", text: "残高は33.3万円で、割合は96.9%です。" }, { t: "bars", id: "b", title: "t", desc: "d", max: 100, suffix: "%", groups: [{ title: "g", rows: [{ label: "A", value: 57.5 }] }] }] }], sources: [{ label: "s", url: "https://example.com/" }], ...content } });
  const normal = episodePage(ep({ textWrap: "normal" }), SITE);
  assert.ok(normal.includes('<span class="jf-nb">33.3万円</span>') && normal.includes('<span class="jf-nb">96.9%</span>'));
  assert.ok(/style="width:57\.50%"/.test(normal), "style 属性の中の数字は包まない");
  const phrase = episodePage(ep({}), SITE);
  assert.ok(!phrase.includes("jf-nb"), "指定のない回は従来どおり");
});
