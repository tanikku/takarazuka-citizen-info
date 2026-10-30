import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadFeature, validateFeature, jitsuryokuFeaturePage, FEATURE_POSE_FILES } from "./jitsuryoku-feature.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA = path.join(ROOT, "data", "jitsuryoku", "zeishu-shigoto.json");
const SITE = "https://takarazuka-today.jp";

test("特集データは検査を通る", () => {
  assert.ok(loadFeature(DATA));
});

test("昼間人口が合わないデータは検査で弾く", () => {
  const d = structuredClone(loadFeature(DATA));
  d.rows.takarazuka.daynight.day += 1;
  assert.ok(validateFeature(d).some((e) => e.includes("昼間人口")));
});

test("出典のない街の顔は弾く", () => {
  const d = structuredClone(loadFeature(DATA));
  d.landmarks.itami[0].sourceUrl = "";
  assert.ok(validateFeature(d).length > 0);
});

test("draft のページは noindex で、公開済みなら noindex を付けない", () => {
  const d = structuredClone(loadFeature(DATA));
  d.status = "draft";
  assert.match(jitsuryokuFeaturePage(d, SITE), /<meta name="robots" content="noindex">/);
  d.status = "published";
  assert.doesNotMatch(jitsuryokuFeaturePage(d, SITE), /name="robots" content="noindex"/);
});

test("グラフの数字は表と同じデータから出ている（宝塚の主要値）", () => {
  const d = loadFeature(DATA);
  const html = jitsuryokuFeaturePage(d, SITE);
  const t = d.rows.takarazuka;
  assert.ok(html.includes(t.daynight.night.toLocaleString("ja-JP")));
  assert.ok(html.includes(t.industry.medicalWelfare.toLocaleString("ja-JP")));
  assert.ok(html.includes(t.retail.sales.toLocaleString("ja-JP")));
  assert.ok(html.includes(((t.daynight.day / t.daynight.night) * 100).toFixed(2)));
});

test("全グラフに題名・説明・文字の数値があり、表が用意されている", () => {
  const html = jitsuryokuFeaturePage(loadFeature(DATA), SITE);
  assert.equal((html.match(/<figure /g) ?? []).length, 5);
  assert.equal((html.match(/<figcaption>/g) ?? []).length, 5);
  assert.ok((html.match(/<table /g) ?? []).length >= 5);
  assert.equal((html.match(/<caption>/g) ?? []).length, (html.match(/<table /g) ?? []).length);
});

test("積み上げグラフは色だけに頼らず、凡例の文字と数値を持つ", () => {
  const html = jitsuryokuFeaturePage(loadFeature(DATA), SITE);
  assert.match(html, /role="img" aria-label="宝塚市：個人市民税 [\d.]+%、法人市民税 [\d.]+%/);
  assert.match(html, /jf-key--cor/);
});

test("禁止事項: 順位・優劣・1人当たり税額の表現を本文に載せない", () => {
  const html = jitsuryokuFeaturePage(loadFeature(DATA), SITE).replace(/<[^>]+>/g, "");
  assert.doesNotMatch(html, /第\d位|\d位|ランキング|総合評価|1人当たり[^。]{0,20}\d[\d,]*円/);
  assert.match(html, /優劣を決めるものではありません/);
});

test("昼夜間人口比率を就業率と取り違えない注記があり、小売の対象年が明記されている", () => {
  const html = jitsuryokuFeaturePage(loadFeature(DATA), SITE);
  assert.match(html, /就業率（仕事をしている人の割合）ではありません/);
  assert.match(html, /2020年（令和2年）の1年間/);
  assert.match(html, /公営|国や市などの事業所/);
});

test("キャラクター画像は正式原画から切り出したファイルだけを指し、実在する", () => {
  const html = jitsuryokuFeaturePage(loadFeature(DATA), SITE);
  const used = [...html.matchAll(/\/characters\/poses\/([\w-]+\.webp)/g)].map((m) => m[1]);
  assert.ok(used.length > 0);
  for (const f of used) {
    assert.ok(FEATURE_POSE_FILES.includes(f), f);
    assert.ok(fs.existsSync(path.join(ROOT, "assets", "characters", "poses", f)), f);
  }
});

test("本文の文字量は目安の範囲（表・出典・注記を除く）", () => {
  const html = jitsuryokuFeaturePage(loadFeature(DATA), SITE);
  const main = html
    .replace(/<details[\s\S]*?<\/details>/g, "")
    .replace(/<ul class="jf-notes">[\s\S]*?<\/ul>/g, "")
    .replace(/<p class="jf-source">[\s\S]*?<\/p>/g, "")
    .replace(/<ul class="jf-city__list"[\s\S]*?<\/ul>/g, "")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<[^>]+>/g, "");
  const body = main.slice(main.indexOf("宝塚の実力 第1弾"));
  assert.ok(body.length < 4500, `本文が長すぎます: ${body.length}`);
});

test("街の選択：6市ぶんの数字がJSONから書き出され、初期は宝塚市で、JS無しでも宝塚市の数字が見える", () => {
  const d = loadFeature(DATA);
  const html = jitsuryokuFeaturePage(d, SITE);
  const chips = [...html.matchAll(/<li( class="is-selected")? data-city="(\w+)" data-ind="([\d.]+%)" data-dn="([\d.]+)" data-med="([\d.]+%)">([^<]+)<\/li>/g)];
  assert.deepEqual(chips.map((m) => m[2]), ["takarazuka", "itami", "atsugi", "chigasaki", "nagareyama", "matsumoto"]);
  assert.deepEqual(chips.filter((m) => m[1]).map((m) => m[2]), ["takarazuka"], "初期選択は宝塚市だけ");
  for (const m of chips) {
    const r = d.rows[m[2]];
    assert.equal(m[4], ((r.daynight.day / r.daynight.night) * 100).toFixed(2));
    assert.equal(m[3], `${(Math.round((r.tax.individual / r.tax.total) * 1000) / 10).toFixed(1)}%`);
    assert.equal(m[5], `${(Math.round((r.industry.medicalWelfare / r.industry.workers) * 1000) / 10).toFixed(1)}%`);
  }
  const t = chips[0];
  for (const v of [t[3], t[4], t[5]]) assert.ok(html.includes(`<b class="jf-stat__num">${v}</b>`), `JS無しの初期表示: ${v}`);
  assert.match(html, /<p class="jf-hint" hidden>/, "操作の案内はJSが動いたときだけ見せる");
  assert.match(html, /<script src="\/js\/zeishu-city-select.js" defer><\/script>/);
});

test("街の選択のスクリプト：数字はHTMLのdata属性だけから取り、通信・評価をしない", () => {
  const js = fs.readFileSync(path.join(ROOT, "assets", "zeishu-city-select.js"), "utf-8");
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|eval\(|innerHTML|new Function/);
  assert.match(js, /aria-pressed/);
  assert.match(js, /\.jf-sr/);
});

test("街の紹介：6市ぶん、地域・紹介文・公式の出典リンクがあり、折りたたみで第1弾の主要3指標より下にある", () => {
  const d = loadFeature(DATA);
  const html = jitsuryokuFeaturePage(d, SITE);
  assert.match(html, /<summary>比べている街はどんなところ？<\/summary>/);
  assert.ok(html.indexOf("比べている街はどんなところ？") > html.indexOf('class="jf-stats"'), "主要3指標より下");
  assert.equal((html.match(/class="jf-profile( is-self)?" aria-labelledby/g) ?? []).length, 6);
  for (const id of ["takarazuka", "itami", "atsugi", "chigasaki", "nagareyama", "matsumoto"]) {
    const p = d.profiles[id];
    assert.ok(p.text.length > 20 && p.text.length < 140, `${id}: 1〜2文`);
    assert.match(p.sourceUrl, /^https:\/\/www\.city\.[a-z.]+\//, `${id}: 公式の出典`);
    assert.ok(html.includes(`href="${p.sourceUrl}"`), id);
  }
  assert.match(d.profiles.nagareyama.text, /千葉県の北西部.*東京都心から25キロメートル圏.*つくばエクスプレス/);
  assert.doesNotMatch(d.profiles.nagareyama.text, /秋葉原.*分|\d+分/, "所要時間は載せない");
  assert.equal(d.profiles.nagareyama.sourceUrl, "https://www.city.nagareyama.chiba.jp/life/1002088/1002089/1002091/index.html");
});

test("小売業の説明：「お店での販売」ではなく事業所の年間商品販売額とし、個人経営の注意書きは維持する", () => {
  const html = jitsuryokuFeaturePage(loadFeature(DATA), SITE);
  assert.doesNotMatch(html, /お店での/);
  assert.match(html, /小売業の事業所が、2020年の1年間に商品を販売した額の合計です/);
  assert.match(html, /個人経営の事業所は、販売額を調べる項目がないため、販売額に含まれません/);
});

test("税収の注記：法人市民税の割合の計算式（決算カードの金額）を示す", () => {
  const d = loadFeature(DATA);
  const t = d.rows.takarazuka.tax;
  const html = jitsuryokuFeaturePage(d, SITE);
  assert.ok(html.includes(`${t.corporate.toLocaleString("ja-JP")}千円 ÷ 地方税の総額 ${t.total.toLocaleString("ja-JP")}千円 ＝ 3.24%`));
  assert.ok(html.includes("均等割＋法人税割"));
});

test("シリーズ名は「宝塚の実力」（句点なし）で統一され、特集ページ・企画紹介ページ・トップに旧表記が残らない", async () => {
  const { jitsuryokuPage, indexPage } = await import("../templates.js");
  const feature = jitsuryokuFeaturePage(loadFeature(DATA), SITE);
  const intro = jitsuryokuPage(SITE);
  for (const html of [feature, intro]) {
    assert.doesNotMatch(html, /宝塚の実力。|実力<\/em>。/);
    assert.match(html, /宝塚の実力/);
  }
  assert.match(feature, /<title>[^<]*「宝塚の実力」第1弾/);
  assert.match(feature, /"name":"「宝塚の実力」"/, "構造化データ（パンくず）");
  assert.match(intro, /<title>「宝塚の実力」企画紹介/);
  assert.equal(typeof indexPage, "function");
});
