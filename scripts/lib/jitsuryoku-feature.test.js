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
  assert.doesNotMatch(html, /第\d位|\d位|ランキング|総合評価|1人当たり.*円/);
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
  const body = main.slice(main.indexOf("宝塚の実力。 第1弾"));
  assert.ok(body.length < 4500, `本文が長すぎます: ${body.length}`);
});
