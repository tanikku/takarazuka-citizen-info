import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateBlocks, renderBlock, renderBlocks, tableRowValues, BLOCK_POSES } from "./series-blocks.js";
import { validateEpisodeShape, episodePage, contentHashOf, decideEpisode, selectEpisodes, loadEpisodes, parseScheduledAt, SERIES_HASH_META_NAME } from "./series-episodes.js";
import { generateKeyPair, runApprove, signEpisode } from "./series-approval.js";
import { FEATURE_POSE_FILES, jitsuryokuFeaturePage } from "./jitsuryoku-feature.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = "https://takarazuka-today.jp";
const EP_FILE = path.join(ROOT, "data", "jitsuryoku", "episodes", "population-takarazuka-nagareyama.json");
const FIRST = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "jitsuryoku", "zeishu-shigoto.json"), "utf-8"));
const ep = JSON.parse(fs.readFileSync(EP_FILE, "utf-8"));
const c = ep.content;
// PM が承認の対象として確定した原稿の内容ハッシュと予約日時（status・承認・公開日は対象外）
const APPROVED_CONTENT_HASH = "8bafb3f2e33e9c3928aa15c0fd0efdcd91a11574c0069a3f719762e5c5451b08";
const SCHEDULED_AT = "2026-11-07T10:15:00+09:00";
// 実原稿から公開の状態（status・承認・公開日）を外した下書きの形。原稿は draft → scheduled（署名）→ published と進むので、
// 状態に左右されない表示・内容のテストはこちらを使う
const { approval: _approval, publishedAt: _publishedAt, ...epContent } = ep;
const draftEp = { ...epContent, status: "draft" };

// ====================================================================
// 部品（汎用）
// ====================================================================
const okBars = { t: "bars", id: "fig-a", title: "t", desc: "d", max: 100, groups: [{ title: "g", rows: [{ label: "x", value: 50 }, { label: "y", value: 100 }], delta: { a: 0, b: 1, label: "x→y" } }] };

test("部品の検査：正しい形は通り、型・必須項目・数値・URL・id の重複・列の参照の誤りは検出する", () => {
  assert.deepEqual(validateBlocks([okBars, { t: "p", k: "fact", text: "本文" }, { t: "say", who: "madoka", pose: "madoka-guide", text: "こんにちは" }]), []);
  const bad = (b) => validateBlocks([b]).length > 0;
  assert.ok(bad({ t: "nope" }), "不明な型");
  assert.ok(bad({ t: "p", text: "" }), "空の本文");
  assert.ok(bad({ t: "p", k: "zzz", text: "x" }), "不明なラベル");
  assert.ok(bad({ t: "say", who: "x", pose: "madoka-guide", text: "a" }), "不明な話者");
  assert.ok(bad({ t: "say", who: "wan", pose: "no-pose", text: "a" }), "不明なポーズ");
  assert.ok(bad({ t: "source", label: "a", url: "http://insecure.example/" }), "https でない出典");
  assert.ok(bad({ t: "sources", items: [{ label: "a", url: "javascript:alert(1)" }] }), "不正なURL");
  assert.ok(bad({ ...okBars, groups: [{ title: "g", rows: [{ label: "x", value: 101 }] }] }), "max を超える値");
  assert.ok(bad({ ...okBars, groups: [{ title: "g", rows: [{ label: "x", value: -1 }] }] }), "負の棒");
  assert.ok(bad({ ...okBars, id: "Bad Id" }), "id の形");
  assert.ok(validateBlocks([okBars, okBars]).some((e) => e.includes("重複")), "id の重複");
  assert.ok(bad({ t: "stack", id: "s", title: "t", desc: "d", legend: [{ key: "a", label: "A", cls: "a1" }, { key: "b", label: "B", cls: "a2" }], rows: [{ label: "r", parts: { a: 1 } }] }), "parts が legend と不一致");
  assert.ok(bad({ t: "div", id: "dv", title: "t", desc: "d", max: 10, legend: [{ key: "n", label: "N", cls: "nat" }], groups: [{ title: "g", rows: [{ label: "r", key: "zz", value: 1 }] }] }), "key が legend にない");
  assert.ok(bad({ t: "table", caption: "c", cols: [{ h: "a", kind: "text" }, { h: "b", kind: "delta", a: 0, b: 1 }], rows: [["x", null]] }), "計算列が自分や右の列を参照");
  assert.ok(bad({ t: "table", caption: "c", cols: [{ h: "a", kind: "text" }, { h: "b", kind: "num" }], rows: [["x", 1, 2]] }), "行の列数の不一致");
  assert.ok(bad({ t: "table", caption: "c", cols: [{ h: "a", kind: "text" }, { h: "b", kind: "num" }, { h: "d", kind: "sub", a: 1, b: 1 }], rows: [["x", 1, 5]] }), "計算列のセルが null でない");
  assert.ok(bad({ t: "next", title: "t", text: "x", href: "https://evil.example/", linkText: "l" }), "次回予告のリンクはサイト内だけ");
});

test("表の計算：増減・増減率・差・和・割合・合計セルを数値から計算する", () => {
  const cols = [{ h: "a", kind: "text" }, { h: "x", kind: "num" }, { h: "y", kind: "num" }, { h: "d", kind: "delta", a: 1, b: 2 }, { h: "p", kind: "pct", a: 1, b: 2 }, { h: "s", kind: "sub", a: 1, b: 2 }, { h: "ad", kind: "add", a: 1, b: 2 }, { h: "r", kind: "ratio", a: 1, b: 2 }];
  const v = tableRowValues(cols, ["k", { sum: [20, 30, 50] }, 80, null, null, null, null, null]);
  assert.deepEqual(v.slice(0, 4), ["k", 100, 80, -20]);
  assert.equal(v[4], -20);
  assert.equal(v[5], 20);
  assert.equal(v[6], 180);
  assert.equal(v[7], 125);
  assert.equal(tableRowValues(cols, ["k", null, 5, null, null, null, null, null])[3], null, "欠けた値からは計算しない");
});

test("描画：本文は HTML をエスケープし、**太字** だけを強調にする。不明なブロックは描画しない", () => {
  const h = renderBlock({ t: "p", k: "fact", text: "<script>alert(1)</script> と **大事** です & \"引用\"" });
  assert.ok(!h.includes("<script>"));
  assert.ok(h.includes("&lt;script&gt;") && h.includes("<strong>大事</strong>") && h.includes("&amp;") && h.includes("&quot;"));
  assert.throws(() => renderBlock({ t: "zzz" }), /不明なブロック/);
  const t = renderBlock({ t: "table", caption: "<b>c</b>", cols: [{ h: "<i>h</i>", kind: "text" }, { h: "v", kind: "num" }], rows: [["<img src=x onerror=1>", 1234]] });
  assert.ok(!t.includes("<img") && !t.includes("<i>h</i>") && t.includes("1,234"));
});

test("描画：棒は値÷max の長さ、増減は数値から計算、積み上げは合計100%、増減図は 0 を中心に左右へ伸びる", () => {
  const bars = renderBlock({ ...okBars, suffix: "人" });
  assert.match(bars, /width:50\.00%/);
  assert.match(bars, /width:100\.00%/);
  assert.ok(bars.includes("＋50人（＋100.0%）"), "増減と増減率は計算で出す");
  const stack = renderBlock({ t: "stack", id: "s1", title: "t", desc: "d", legend: [{ key: "a", label: "A", cls: "a1" }, { key: "b", label: "B", cls: "a2" }, { key: "c", label: "C", cls: "a3" }], rows: [{ label: "r", parts: { a: 1, b: 2, c: 1 } }] });
  const widths = [...stack.matchAll(/jf-seg jf-seg--a\d" style="width:([\d.]+)%/g)].map((m) => Number(m[1]));
  assert.deepEqual(widths, [25, 50, 25]);
  assert.ok(stack.includes("A 25.0%") && stack.includes("B 50.0%"));
  const div = renderBlock({ t: "div", id: "d1", title: "t", desc: "d", max: 200, suffix: "人", legend: [{ key: "n", label: "N", cls: "nat" }], groups: [{ title: "g", rows: [{ label: "up", key: "n", value: 100 }, { label: "down", key: "n", value: -50 }, { label: "zero", key: "n", value: 0 }] }] });
  assert.match(div, /jf-div__fill--nat" style="left:50\.00%;width:25\.00%"/);
  assert.match(div, /jf-div__fill--nat is-neg" style="left:37\.50%;width:12\.50%"/);
  assert.ok(div.includes("＋100人") && div.includes("−50人"), "符号つきの数字でも確かめられる");
  assert.ok(div.includes("縦線は0"), "基準線の説明");
});

test("キャラクター：ポーズ画像は第1弾と同じ素材で、実在し、ビルドが常にコピーするファイルに含まれる", () => {
  const files = Object.values(BLOCK_POSES).map((p) => p.file).sort();
  assert.deepEqual(files, [...FEATURE_POSE_FILES].sort());
  for (const f of files) assert.ok(fs.existsSync(path.join(ROOT, "assets", "characters", "poses", f)), f);
});

// ====================================================================
// 記事の形・承認の対象・ページの出力
// ====================================================================
test("記事の形：実原稿は検査を通り、承認の対象（内容ハッシュ）と予約日時が確定値のまま。draft・scheduled・published の各状態の条件を満たし、公開鍵の無い判定では公開されない", () => {
  assert.deepEqual(validateEpisodeShape(ep), []);
  assert.equal(path.basename(EP_FILE, ".json"), ep.slug);
  assert.equal(ep.episode, 2);
  assert.notEqual(ep.hold, true);
  assert.equal(ep.scheduledAt, SCHEDULED_AT);
  assert.equal(parseScheduledAt(ep.scheduledAt).ok, true, "予約日時は土曜10:15 JSTの枠");
  assert.equal(contentHashOf(ep), APPROVED_CONTENT_HASH, "承認の対象の内容が、確定原稿から1文字も変わっていない");
  assert.ok(["draft", "scheduled", "published"].includes(ep.status), `想定外の状態: ${ep.status}`);

  const far = new Date("2030-01-01T00:00:00Z");
  const d = decideEpisode(ep, { now: far, approverPublicKey: null });
  assert.equal(d.publish, false, "公開鍵の無い判定では、どの状態でも公開されない");
  if (ep.status === "draft") {
    assert.equal(ep.approval, undefined, "下書きには承認が無い");
    assert.equal(ep.publishedAt, undefined);
    assert.equal(d.reason, "draft");
  } else {
    if (ep.status === "scheduled") assert.equal(ep.publishedAt, undefined, "公開日は公開の確定（finalize）で付く");
    if (ep.status === "published") {
      assert.ok(ep.approval, "公開済みの回には承認が必須");
      assert.equal(ep.publishedAt, ep.scheduledAt.slice(0, 10), "公開日は署名された予約日と同じ日");
    }
    if (ep.approval) {
      // 承認は今の内容と予約日時に結びついている。署名そのものは本物の公開鍵で CI の check --strict と Pages の check --deploy が検証する
      assert.equal(ep.approval.contentHash, APPROVED_CONTENT_HASH);
      assert.equal(ep.approval.scheduledAt, SCHEDULED_AT);
      if (ep.status === "scheduled") assert.ok(Date.parse(ep.approval.approvedAt) < Date.parse(SCHEDULED_AT), "署名は予約日時より前");
      assert.equal(d.reason, ep.status === "published" ? "published-but-approver-key-missing" : "approver-key-missing");
    } else {
      assert.equal(d.reason, "not-approved", "署名の無い予約は公開されない");
    }
  }
  const sel = selectEpisodes(loadEpisodes(path.dirname(EP_FILE)), { now: far, approverPublicKey: null, reservedSlugs: [FIRST.slug] });
  // 公開鍵が無いと、署名方式の回（第2回）は公開されない。承認記録方式（v3。第3回以降）の回は、鍵なしでも承認記録が有効なら公開される
  assert.deepEqual(sel.publish.filter((e) => e.episode === ep.episode), []);
  assert.ok(sel.publish.every((e) => e.approval?.method === "operator-approval-v3" && e.episode >= 3), "鍵なしで公開されるのは承認記録方式の回だけ");
  // 公開済みを名乗る回が検証できないときはビルドを止める（直前の本番を残す）。それ以外の状態では止めない
  assert.equal(sel.errors.length > 0, ep.status === "published");
});

test("公開の状態ごとの判定（実原稿・使い捨て鍵）：未署名の予約は出ず、署名した予約は予約日時から出る。公開済みは公開日が合うときだけ有効。原稿の改ざん・署名の破損は拒否する", () => {
  const kp = crypto.generateKeyPairSync("ed25519");
  const key = kp.publicKey;
  const slot = Date.parse(SCHEDULED_AT);
  const at = (ms) => new Date(ms);
  const before = new Date("2026-11-06T12:00:00+09:00");
  const decide = (e, ms, k = key) => decideEpisode(e, { now: at(ms), approverPublicKey: k });

  // 下書き：鍵があっても公開しない
  assert.deepEqual(decide(draftEp, slot + 1000), { publish: false, reason: "draft" });
  // 予約・未署名：公開しない
  const unsigned = { ...draftEp, status: "scheduled" };
  assert.equal(decide(unsigned, slot + 1000).reason, "not-approved");
  // 予約・署名済み：内容ハッシュは確定値、1秒前は出さず予約日時ちょうどから出す
  const signed = signEpisode(unsigned, { now: before, privateKey: kp.privateKey, approvedBy: "テスト承認者" });
  assert.equal(signed.approval.contentHash, APPROVED_CONTENT_HASH);
  assert.deepEqual(validateEpisodeShape(signed), []);
  assert.equal(decide(signed, slot - 1000).publish, false);
  assert.deepEqual(decide(signed, slot), { publish: true, reason: "due" });
  // 公開済み：公開日が予約日と一致すれば有効。食い違いはビルドを止める
  const published = { ...signed, status: "published", publishedAt: "2026-11-07" };
  assert.deepEqual(validateEpisodeShape(published), []);
  assert.deepEqual(decide(published, slot + 3600 * 1000), { publish: true, reason: "published" });
  const wrongDate = decide({ ...published, publishedAt: "2026-11-08" }, slot + 3600 * 1000);
  assert.deepEqual([wrongDate.publish, wrongDate.reason, wrongDate.blocking], [false, "published-date-mismatch", true]);
  // 改ざん：本文を1文字でも変えると、予約は出ず、公開済みはビルドを止める
  const tampered = { ...signed, content: { ...signed.content, sections: signed.content.sections.map((s, i) => (i === 0 ? { ...s, heading: `${s.heading}x` } : s)) } };
  assert.equal(decide(tampered, slot + 1000).reason, "content-changed-after-approval");
  const tamperedPub = decide({ ...tampered, status: "published", publishedAt: "2026-11-07" }, slot + 1000);
  assert.deepEqual([tamperedPub.publish, tamperedPub.blocking], [false, true]);
  // 予約日時の書き換え・署名の破損・別の鍵は拒否する
  assert.equal(decide({ ...signed, scheduledAt: "2026-11-14T10:15:00+09:00" }, Date.parse("2026-11-14T10:15:00+09:00")).reason, "schedule-changed-after-approval");
  const sig = signed.approval.signature;
  const broken = { ...signed, approval: { ...signed.approval, signature: `${sig.slice(0, -4)}${sig.slice(-4) === "AAAA" ? "BBBB" : "AAAA"}` } };
  assert.equal(decide(broken, slot + 1000).reason, "approval-signature-invalid");
  const otherKey = crypto.generateKeyPairSync("ed25519").publicKey;
  assert.equal(decide(signed, slot + 1000, otherKey).reason, "approval-signature-invalid");
});

test("承認の対象：図のデータ・表・本文のどこを1つ変えても内容ハッシュが変わる（承認後の書き換えを検出できる）", () => {
  const base = contentHashOf(ep);
  const clone = () => JSON.parse(JSON.stringify(ep));
  const mutate = (fn) => { const x = clone(); fn(x); return contentHashOf(x); };
  const flat = (x) => x.content.sections.flatMap((sec) => sec.blocks);
  const byId = (x, id) => flat(x).find((b) => b.id === id);
  const mutations = {
    棒グラフの値: (x) => { byId(x, "jf-pop").groups[0].rows[0].value += 1; },
    増減率の図の人数: (x) => { byId(x, "jf-rate6").rows[0].to += 1; },
    表のセル: (x) => { flat(x).find((b) => b.t === "details").blocks[0].rows[0][1] += 1; },
    本文の数字: (x) => { flat(x).find((b) => b.t === "p" && b.k === "fact").text += "x"; },
    ヒーローの数字: (x) => { x.content.heroBlocks[0].items[0].values[0].num = "−4.2%"; },
    出典のURL: (x) => { x.content.sources[0].url += "x"; },
    確認日: (x) => { x.content.checkedAt = "2026-10-30"; },
    題名: (x) => { x.title += "x"; }
  };
  for (const [label, fn] of Object.entries(mutations)) assert.notEqual(mutate(fn), base, label);
  assert.equal(mutate((x) => { x.status = "scheduled"; x.hold = true; }), base, "状態・保留は署名の対象外");
});

test("ページの出力：下書きは確認用の帯と noindex、公開される状態では出ない。内容ハッシュのメタ・公開日・確認日・章番号が出る", () => {
  const html = episodePage(draftEp, SITE);
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.ok(html.includes("公開前の確認用ページです"));
  assert.ok(html.includes(`<meta name="${SERIES_HASH_META_NAME}" content="${contentHashOf(draftEp)}">`));
  assert.ok(html.includes("公開日：2026年11月7日") && html.includes("統計などの確認日：2026年11月1日"));
  assert.ok(html.includes("更新日：2026年11月7日"), "公開後に内容を変えた回は更新日を表示する");
  const live = episodePage({ ...draftEp, status: "scheduled" }, SITE);
  assert.ok(!live.includes("noindex") && !live.includes("公開前の確認用ページです"));
  const nums = [...html.matchAll(/<span class="jf-h2__no">(\d+)<\/span>/g)].map((m) => Number(m[1]));
  assert.deepEqual(nums, [1, 2, 3, 4, 5], "5章構成（6つの街の比較＋2つの街の深掘り4章）。まとめは番号なし");
  assert.equal((html.match(/<h2 /g) ?? []).length, 6);
  assert.equal((html.match(/<h1 /g) ?? []).length, 1);
  assert.equal((html.match(/<figure /g) ?? []).length, 4, "中心の図解は4つ（6つの街の増減率＋2つの街の3つ）");
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, "id が重複していない");
  for (const f of html.matchAll(/<figure class="jf-figure" aria-labelledby="([^"]+)" aria-describedby="([^"]+)"/g)) assert.ok(ids.includes(f[1]) && ids.includes(f[2]));
  assert.ok(html.includes("まどか") && html.includes("たからワン"));
  assert.equal((html.match(/<table/g) ?? []).length, [...JSON.stringify(c).matchAll(/"t":"table"/g)].length, "表は折りたたみの中も含めて、データの数と同じだけ出る");
});

test("既存の連載の最小ページ（paragraphs だけの回）は、図解の部品を使わず従来の出力のまま", () => {
  const minimal = { slug: "ep9-min", episode: 9, title: "t", description: "d", status: "scheduled", scheduledAt: "2026-11-07T10:15:00+09:00", content: { sections: [{ heading: "h", paragraphs: ["本文"] }], sources: [{ label: "s", url: "https://example.go.jp/" }] } };
  const html = episodePage(minimal, SITE);
  assert.ok(html.includes('<section class="jf-sec"><h2 class="jf-h2">h</h2><p>本文</p></section>'));
  assert.ok(!html.includes("jf-h2__no") && !html.includes("統計などの確認日"));
});

// ====================================================================
// 数値：原表との照合値・内部の整合
// ====================================================================
const allBlocks = (list = [...(c.heroBlocks ?? []), ...c.sections.flatMap((s) => s.blocks)]) => list.flatMap((b) => (b.t === "details" ? [b, ...allBlocks(b.blocks)] : [b]));
const blocks = allBlocks();
const tables = blocks.filter((b) => b.t === "table");
const tableByCaption = (re) => tables.find((t) => re.test(t.caption));
const rowsOf = (t) => t.rows.map((r) => tableRowValues(t.cols, r));
const fig = (id) => blocks.find((b) => b.id === id);

// 原表（e-Stat の国勢調査・各県の人口動態・各市の公式資料）から読み取った値。記事のデータとは別に書き写してある（編集で崩れたら気づくため）。
const GOLDEN = {
  pop: { takarazuka: { 2010: 225700, 2015: 224903, 2020: 226432, 2025: 217157 }, nagareyama: { 2010: 163984, 2015: 174373, 2020: 199849, 2025: 215086 } }, // 2020・2025: 第1-1表。2010・2015: 各市の公表資料
  households: { takarazuka: { 2020: [95465, 95366, 94610], 2025: [94579, 94406, 93470] }, nagareyama: { 2020: [83115, 83001, 82405], 2025: [91215, 91063, 90498] } }, // 世帯総数・一般世帯・住宅に住む一般世帯
  age: { // [15歳未満, 15〜64歳, 65歳以上, 75歳以上, 年齢不詳, 総数]。第2-7表
    takarazuka: { 2020: [29195, 129846, 63689, 33622, 3702, 226432], 2025: [25456, 125115, 65031, 39454, 1555, 217157] },
    nagareyama: { 2020: [31172, 118860, 46047, 23574, 3770, 199849], 2025: [34212, 129982, 47487, 29297, 3405, 215086] }
  },
  dyn: { // [出生, 死亡, 転入等, 転出等]。各県の年報
    takarazuka: { 2022: [1283, 2546, 8362, 8476], 2023: [1171, 2553, 8294, 8780], 2024: [1166, 2671, 8435, 8215] },
    nagareyama: { 2022: [2071, 1837, 13650, 9995], 2023: [1983, 1871, 11861, 9641], 2024: [1973, 1936, 11661, 9869] }
  },
  published: { takarazuka: { 2022: [-1263, -114], 2023: [-1382, -486], 2024: [-1505, 220] }, nagareyama: { 2022: [234, 3655], 2023: [112, 2220], 2024: [37, 1792] } }, // 各県が公表した [自然増減, 社会増減]
  commute: { takarazuka: [226432, 183303, 33119], nagareyama: [199849, 157255, 40681] }, // 夜間人口・昼間人口・他県で従業・通学（2020年）
  housing: { // [住宅に住む一般世帯, 共同住宅, 一戸建, 主世帯, 持ち家, 民営の借家]。第24-4表・第19-4表
    takarazuka: { 2020: [94610, 47297, 45779, 93612, 68995, 18419], 2025: [93470, 46384, 45582, 92503, 68764, 18421] },
    nagareyama: { 2020: [82405, 37367, 43720, 81399, 55496, 23339], 2025: [90498, 43416, 46008, 89411, 58541, 28161] }
  },
  areaDensity: { takarazuka: [101.8, 2133.2], nagareyama: [35.32, 6089.6] }
};
const CITY = { takarazuka: "宝塚市", nagareyama: "流山市" };

test("原表の照合値：人口・世帯・面積が、第1-1表の値と一致し、第1弾の同じ数字とも一致する", () => {
  const popFig = fig("jf-pop");
  for (const [id, name] of Object.entries(CITY)) {
    const g = popFig.groups.find((x) => x.title === name);
    assert.deepEqual(g.rows.map((r) => r.value), [2010, 2015, 2020, 2025].map((y) => GOLDEN.pop[id][y]), `${name} 人口の棒`);
    const row = rowsOf(tableByCaption(/国勢調査人口/)).find((r) => r[0] === name);
    assert.deepEqual(row.slice(1, 5), [2010, 2015, 2020, 2025].map((y) => GOLDEN.pop[id][y]));
    const hh = rowsOf(tableByCaption(/世帯の数え方/));
    for (const y of [2020, 2025]) assert.deepEqual(hh.find((r) => r[0] === name && r[1] === `${y}年`).filter((_, i) => [2, 3, 5].includes(i)), GOLDEN.households[id][y], `${name} ${y}年 世帯`);
    const ad = rowsOf(tableByCaption(/面積と人口密度/)).find((r) => r[0] === name);
    assert.deepEqual(ad.slice(1), GOLDEN.areaDensity[id]);
    // 第1弾の同じ数字
    assert.equal(FIRST.rows[id].population.pop2025, GOLDEN.pop[id][2025]);
    assert.equal(FIRST.rows[id].population.pop2020, GOLDEN.pop[id][2020]);
    assert.equal(FIRST.rows[id].population.areaKm2, GOLDEN.areaDensity[id][0]);
    const dn = FIRST.rows[id].daynight;
    assert.deepEqual([dn.night, dn.day], GOLDEN.commute[id].slice(0, 2), `${name} 昼夜間人口は第1弾と同じ`);
  }
});

test("原表の照合値：年齢別人口が第2-7表と一致し、年齢の合計が総数に合う（年齢不詳を含めて）。図・表・割合表が同じ数字", () => {
  const stack = fig("jf-age");
  const ageRows = rowsOf(tableByCaption(/年齢別人口の5年間/));
  const rowByLabel = (re) => ageRows.find((r) => re.test(r[0]));
  const cols = { 宝塚市2020: 1, 宝塚市2025: 2, 流山市2020: 4, 流山市2025: 5 };
  for (const [id, name] of Object.entries(CITY)) {
    for (const y of [2020, 2025]) {
      const [u15, w, o65, o75, unk, total] = GOLDEN.age[id][y];
      const col = cols[`${name}${y}`];
      assert.deepEqual([u15, w, o65, o75, unk, total], [rowByLabel(/^15歳未満/)[col], rowByLabel(/^15〜64歳/)[col], rowByLabel(/^65歳以上/)[col], rowByLabel(/^75歳以上/)[col], rowByLabel(/^年齢不詳/)[col], rowByLabel(/^総数/)[col]], `${name} ${y} 年齢表`);
      assert.equal(u15 + w + o65 + unk, total, `${name} ${y}: 年齢の合計＋不詳 = 総数`);
      assert.equal(total, GOLDEN.pop[id][y], "年齢表の総数 = 国勢調査人口");
      assert.deepEqual(Object.values(stack.rows.find((r) => r.label === `${name} ${y}年`).parts), [u15, w, o65], `${name} ${y} 積み上げ図`);
    }
  }
  // 年齢階級の合計の行（15歳未満＝0〜4＋5〜9＋10〜14）が、15歳未満の人数と一致する
  for (const col of [1, 2, 4, 5]) assert.equal(rowByLabel(/^0〜4歳/)[col] + rowByLabel(/^5〜9歳/)[col] + rowByLabel(/^10〜14歳/)[col], rowByLabel(/^15歳未満/)[col]);
  // 割合表の分母は、3区分の合計（不詳を除く人口）
  const shareRows = rowsOf(tableByCaption(/年齢別の割合/));
  for (const [id, name] of Object.entries(CITY)) for (const y of [2020, 2025]) {
    const [u15, w, o65, o75] = GOLDEN.age[id][y];
    const r = shareRows.find((x) => x[0] === name && x[1] === `${y}年`);
    assert.deepEqual([r[2], r[3], r[5], r[7]], [u15 + w + o65, u15, o65, o75]);
    assert.ok(Math.abs(r[6] - (o65 / (u15 + w + o65)) * 100) < 1e-9);
  }
});

test("原表の照合値：人口動態は2022〜2024年に統一され、自然増減・社会増減は各県の公表値と一致。図と表が同じ数字", () => {
  const div = fig("jf-dyn");
  const tbl = rowsOf(tableByCaption(/人口の動き/));
  for (const [id, name] of Object.entries(CITY)) {
    const g = div.groups.find((x) => x.title.startsWith(name));
    assert.equal(g.rows.length, 6, "3年×2種類");
    for (const [y, vals] of Object.entries(GOLDEN.dyn[id])) {
      const [b, d, i, o] = vals;
      const row = tbl.find((r) => r[0] === name && r[1] === `${y}年`);
      assert.deepEqual([row[2], row[3], row[5], row[6]], vals, `${name} ${y} 表`);
      assert.equal(row[4], b - d, "自然増減 = 出生 − 死亡");
      assert.equal(row[7], i - o, "社会増減 = 転入等 − 転出等");
      assert.deepEqual([row[4], row[7]], GOLDEN.published[id][y], `${name} ${y} 各県の公表値`);
      assert.equal(row[8], row[4] + row[7]);
      assert.equal(g.rows.find((r) => r.label === `${y}年 自然増減`).value, GOLDEN.published[id][y][0], `${name} ${y} 自然増減の図`);
      assert.equal(g.rows.find((r) => r.label === `${y}年 社会増減`).value, GOLDEN.published[id][y][1], `${name} ${y} 社会増減の図`);
    }
    const sum = tbl.find((r) => r[0] === name && r[1] === "3年計");
    assert.equal(sum[4], Object.values(GOLDEN.published[id]).reduce((s, v) => s + v[0], 0));
    assert.equal(sum[7], Object.values(GOLDEN.published[id]).reduce((s, v) => s + v[1], 0));
  }
  const years = new Set(div.groups.flatMap((g) => g.rows.map((r) => r.label.slice(0, 5))));
  assert.deepEqual([...years].sort(), ["2022年", "2023年", "2024年"], "図は2022〜2024年だけ");
  const text = JSON.stringify(c);
  for (const never of ["−1,565", "＋556", "2025年 自然", "2025年 社会"]) assert.ok(!text.includes(never), `2025年の動態（${never}）は載せない`);
  assert.ok(text.includes("2022〜2024年"));
  assert.equal(div.max, 4000);
  assert.ok(div.groups.every((g) => g.rows.every((r) => Math.abs(r.value) <= div.max)));
});

test("原表の照合値：住宅の世帯は『住宅に住む一般世帯』で数え、世帯の数え方の大小関係が合う。新築住宅の数とは別と明記", () => {
  const h = rowsOf(tableByCaption(/住宅の建て方と所有/));
  for (const [id, name] of Object.entries(CITY)) for (const [yi, y] of [[2, 2020], [3, 2025]]) {
    const rows = h.filter((r) => r[0] === name);
    const col = rows.map((r) => r[yi]);
    assert.deepEqual(col, GOLDEN.housing[id][y], `${name} ${y} 住宅表`);
    const [res, apt, house, main, own, rent] = col;
    assert.ok(apt + house <= res && main <= res && own + rent <= main, "内訳が全体を超えない");
    const hh = GOLDEN.households[id][y];
    assert.ok(hh[0] >= hh[1] && hh[1] >= hh[2], "世帯総数 ≥ 一般世帯 ≥ 住宅に住む一般世帯");
    assert.equal(res, hh[2], "住宅表と世帯表の『住宅に住む一般世帯』が同じ");
  }
  const share = rowsOf(tableByCaption(/持ち家の割合/));
  for (const [id, name] of Object.entries(CITY)) {
    const r = share.find((x) => x[0] === name);
    assert.deepEqual([r[1], r[2], r[4], r[5]], [GOLDEN.housing[id][2020][4], GOLDEN.housing[id][2020][3], GOLDEN.housing[id][2025][4], GOLDEN.housing[id][2025][3]]);
  }
  const text = JSON.stringify(c);
  assert.ok(text.includes("新築住宅の数とは別の数字") && text.includes("着工・供給量") && text.includes("新築住宅の供給量は、今回は確認していません"));
  assert.ok(!/新築住宅が.{0,6}増/.test(text), "世帯の増加を新築住宅の増加と言い換えない");
});

test("原表の照合値：通勤・通学（2020年）の数字と、昼夜間人口比率が第1弾と同じ", () => {
  const rows = rowsOf(tableByCaption(/昼間人口と夜間人口/));
  for (const [id, name] of Object.entries(CITY)) {
    const r = rows.find((x) => x[0] === name);
    assert.deepEqual([r[1], r[2], r[4]], GOLDEN.commute[id]);
    const first = FIRST.rows[id].daynight;
    assert.equal(r[3].toFixed(2), ((first.day / first.night) * 100).toFixed(2), "第1弾の比率と同じ");
  }
  assert.ok(JSON.stringify(c).includes("行き先（東京都や大阪府など）は、この集計だけでは分かりません"));
});

// ====================================================================
// 本文の数字の出どころ（本文・見出し・表の文字の中の数字が、データから計算できる値か）
// ====================================================================
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
function allowedNumbers() {
  const set = new Set();
  const add = (x) => { if (Number.isFinite(x)) { for (const v of [x, Math.abs(x), r1(x), Math.abs(r1(x)), r2(x), Math.abs(r2(x)), Math.round(x), Math.abs(Math.round(x)), r1(x / 10000)]) set.add(Math.round(v * 1e6) / 1e6); } };
  const series = [];
  for (const b of blocks) {
    if (b.t === "bars") for (const g of b.groups) series.push(g.rows.map((r) => r.value));
    if (b.t === "stack") { for (const r of b.rows) { const v = Object.values(r.parts); series.push([...v, v.reduce((s, x) => s + x, 0)]); } }
    if (b.t === "div") series.push(b.groups.flatMap((g) => g.rows.map((r) => r.value)));
    if (b.t === "rate") for (const r of b.rows) series.push([r.from, r.to]);
    if (b.t === "table") {
      const rows = rowsOf(b);
      const numCols = b.cols.map((_, i) => i).filter((i) => b.cols[i].kind !== "text");
      for (const i of numCols) series.push(rows.map((r) => r[i]).filter((v) => typeof v === "number"));
      for (const r of rows) series.push(numCols.map((i) => r[i]).filter((v) => typeof v === "number"));
    }
  }
  for (const s of series) {
    s.forEach(add);
    for (let i = 0; i < s.length; i++) for (let j = 0; j < s.length; j++) {
      if (i === j) continue;
      const a = s[i], b = s[j];
      add(b - a); add(a + b);
      if (a !== 0) { add(((b - a) / a) * 100); add(b / a); add((b / a) * 100); }
    }
  }
  return set;
}
const texts = () => {
  const out = [c.lead];
  const walk = (list) => { for (const b of list) {
    switch (b.t) {
      case "p": case "say": case "h3": out.push(b.text); break;
      case "callout": out.push(b.title, b.text); break;
      case "notes": out.push(...b.items); break;
      case "rate": out.push(b.title, b.desc, b.unit ?? "", ...b.rows.map((r) => r.label)); break;
      case "bars": case "stack": case "div": out.push(b.title, b.desc, b.unit ?? "", ...(b.groups ?? []).map((g) => g.title), ...(b.groups ?? []).flatMap((g) => g.rows.map((r) => r.label)), ...(b.rows ?? []).map((r) => r.label)); break;
      case "table": out.push(b.caption, b.note ?? "", ...b.cols.map((x) => x.h), ...b.rows.flatMap((r) => r.filter((v, i) => b.cols[i].kind === "text"))); break;
      case "compare": out.push(b.caption, ...b.items.flatMap((x) => [x.h, ...x.cells.flatMap((y) => [y.city, y.text])])); break;
      case "details": out.push(b.summary); walk(b.blocks); break;
      case "sum": out.push(...b.boxes.flatMap((x) => [x.title, ...x.items])); break;
      case "next": out.push(b.title, b.text); break;
      case "stats": out.push(...b.items.flatMap((x) => [x.label, x.sub, ...x.values.flatMap((v) => [v.city, v.num])])); break;
      default: break;
    }
  } };
  walk(c.heroBlocks);
  for (const s of c.sections) { out.push(s.heading); walk(s.blocks); }
  return out;
};
// 資料の記載をそのまま引用している数字（データの表にはない）。出どころを明記しておく
const CITED = new Map([[28600, "流山市 新市街地地区 計画人口（約28,600人）"], [29.9, "宝塚市の資料の65歳以上の割合（不詳を含む全体に対する割合）"]]);

test("本文の数字：小数・1,000以上の数字は、すべて図・表のデータから計算できる値か、出どころを明記した引用値", () => {
  const allowed = allowedNumbers();
  const bad = [];
  for (const t of texts()) {
    for (const m of t.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
      const raw = m[0].replace(/,/g, "");
      const v = Number(raw);
      const checkable = raw.includes(".") || (v >= 1000 && !(Number.isInteger(v) && v >= 1900 && v <= 2100));
      if (!checkable || CITED.has(v)) continue;
      if (!allowed.has(Math.round(v * 1e6) / 1e6)) bad.push(`${m[0]} … ${t.slice(Math.max(0, m.index - 12), m.index + 12)}`);
    }
  }
  assert.deepEqual(bad, [], "データから計算できない数字があります");
  assert.ok(allowed.size > 500);
  // 検査が効くこと：数字を1つ変えた値（9,276・15,238）は許可されない
  assert.ok(!allowed.has(9276) && !allowed.has(15238) && allowed.has(9275) && allowed.has(15237));
});

test("本文の数字：主要な数字（見出しの数字・図の説明・まとめ）が、原表の値から正しく計算されている", () => {
  const html = episodePage(draftEp, SITE);
  const must = [
    "9,275人（4.1%）減りました", "15,237人（7.6%）増えました", "886世帯（0.9%）減り", "8,100世帯（9.7%）増えました", "51,102人増えて約1.31倍", "8,543人（3.8%）減っています",
    "30.2%、流山市が22.4%", "18.3%、流山市が13.8%", "24.3%減り", "7.0%減りました", "16.1%減り", "2.8%増えました", "5年間で9.8%増",
    "−4,150人", "−380人", "−4,530人", "＋383人", "＋7,667人", "＋8,050人", "3,889人", "2,332人", "1,829人",
    "8,093世帯（9.8%）", "6,049世帯（16.2%）", "2,288世帯（5.2%）", "1,140世帯（1.2%）", "68.2%から65.5%", "73.7%から74.3%", "4,822世帯（20.7%）",
    "80.95", "78.69", "40,681人（住んでいる人の20.4%）", "33,119人（14.6%）"
  ];
  const plain = html.replace(/<[^>]+>/g, "");
  for (const s of must) assert.ok(plain.includes(s), s);
  // ヒーローの3つの数字
  for (const s of ["−4.1%", "＋7.6%", "−16.1%", "＋2.8%", "−1,505人", "＋37人"]) assert.ok(plain.includes(s), s);
});

// ====================================================================
// 6つの街の人口増減（第1章）
// ====================================================================
// 令和7年国勢調査 人口等基本集計 第1-1表（2025年の人口・2020年の人口（2025年の市の区域に組替）・5年間の増減数・増減率）と、
// 令和2年国勢調査 第2-7表（2020年の人口）の原表の値。記事のデータとは別に書き写してある（編集で崩れたら気づくため）
const SIX = {
  宝塚市: { p2020: 226432, p2025: 217157, diff: -9275, rate: -4.09615, first: "takarazuka" },
  伊丹市: { p2020: 198138, p2025: 195049, diff: -3089, rate: -1.55901, first: "itami" },
  厚木市: { p2020: 223705, p2025: 222785, diff: -920, rate: -0.41126, first: "atsugi" },
  茅ヶ崎市: { p2020: 242389, p2025: 244680, diff: 2291, rate: 0.94517, first: "chigasaki" },
  流山市: { p2020: 199849, p2025: 215086, diff: 15237, rate: 7.62426, first: "nagareyama" },
  松本市: { p2020: 241145, p2025: 232241, diff: -8904, rate: -3.69238, first: "matsumoto" }
};
const NATIONAL = { p2020: 126146099, p2025: 122972528, diff: -3173571, rate: -2.51579 };
const rateFig = () => fig("jf-rate6");

test("6つの街：第1弾と同じ6市が1つも省略されず、原表（第1-1表）の人口・増減数・増減率と一致し、第1弾の人口とも一致する", () => {
  const f = rateFig();
  assert.deepEqual(f.rows.map((r) => r.label).sort(), Object.keys(SIX).sort(), "6市すべて");
  for (const r of f.rows) {
    const o = SIX[r.label];
    assert.equal(r.from, o.p2020, `${r.label} 2020年`);
    assert.equal(r.to, o.p2025, `${r.label} 2025年`);
    assert.equal(r.to - r.from, o.diff, `${r.label} 増減数`);
    assert.ok(Math.abs(((r.to - r.from) / r.from) * 100 - o.rate) < 0.0001, `${r.label} 増減率（原表の小数5桁と一致）`);
    assert.deepEqual([FIRST.rows[o.first].population.pop2020, FIRST.rows[o.first].population.pop2025], [o.p2020, o.p2025], `第1弾と同じ ${r.label}`);
  }
  // 既存の2市の章の数字とも同じ
  for (const [name, id] of [["宝塚市", "takarazuka"], ["流山市", "nagareyama"]]) assert.deepEqual([SIX[name].p2020, SIX[name].p2025], [GOLDEN.pop[id][2020], GOLDEN.pop[id][2025]], name);
});

test("6つの街：表は6市＋全国（参考）で、増減人数・増減率が人数から計算され原表と一致する。住基・推計の値は使わず、市域変更の確認を明記する", () => {
  const t = tableByCaption(/6つの街の人口と増減/);
  const rows = rowsOf(t);
  assert.equal(rows.length, 7);
  for (const r of rows) {
    const o = r[0].startsWith("全国") ? NATIONAL : SIX[r[0]];
    assert.ok(o, r[0]);
    assert.deepEqual(r.slice(1, 4), [o.p2020, o.p2025, o.diff], `${r[0]} 人口・増減数`);
    assert.ok(Math.abs(r[4] - o.rate) < 0.0001, `${r[0]} 増減率 ${r[4]}`);
  }
  const six = rows.slice(0, 6);
  assert.ok(six.every((r, i) => i === 0 || r[4] <= six[i - 1][4]), "6市は増減率の大きい順");
  assert.deepEqual(rateFig().rows.map((r) => r.label), six.map((r) => r[0]), "図と表で同じ並び");
  assert.deepEqual(six.map((r) => r[0]), ["流山市", "茅ヶ崎市", "厚木市", "伊丹市", "松本市", "宝塚市"], "増減率の高い順（流山・茅ヶ崎・厚木・伊丹・松本・宝塚）");
  const all = texts().join("\n");
  assert.ok(all.includes("住民基本台帳の人口") && all.includes("推計人口") && all.includes("使っていません"), "住基・推計を混ぜていないことの明記");
  // 市域変更：組替人口と公表人口の一致だけを根拠に「変更はなかった」と断定しない。確認できた範囲（統計局の一覧は2025年3月末まで）と未確認の範囲を分けて書く
  assert.ok(all.includes("2025年の市の区域に合わせて組み替えた値") && all.includes("この組替人口と、2020年に公表された人口が一致しています"), "一致したという事実の範囲");
  assert.ok(all.includes("廃置分合のあった市区町村一覧") && all.includes("2025年4月以降の変更や、小さな境界の変更までは確認していません"), "確認した資料と、確認していない範囲");
  for (const w of ["区域の変更はありません", "市域変更はなかった", "境界の変更はありません", "変更はありませんでした"]) assert.ok(!all.includes(w), `断定しない：${w}`);
  assert.ok(all.includes("速報値は使っていません"), "速報値と人口等基本集計の値を混同しない");
});

test("6つの街：図は0%を中心にした増減率で、人数と割合を別の数字として出し、色以外（符号・文字・模様・枠）でも区別できる", () => {
  const html = renderBlock(rateFig());
  for (const [name, o] of Object.entries(SIX)) {
    const pct = Math.round(Math.abs(o.rate) * 10) / 10;
    assert.ok(html.includes(`${o.rate > 0 ? "＋" : "−"}${pct.toFixed(1)}%`), `${name} の割合`);
    assert.ok(html.includes(`（${o.diff > 0 ? "＋" : "−"}${Math.abs(o.diff).toLocaleString("ja-JP")}人）`), `${name} の人数`);
  }
  const row = (name) => html.match(new RegExp(`<li class="jf-rate jf-rate--[a-z]+"[^>]*><span class="jf-rate__name">${name}[\\s\\S]*?</li>`))[0];
  // 増加は右へ、減少は左へ伸びる（max=8%：流山 +7.6% は中央から右へ、宝塚 −4.1% は左へ）
  assert.match(row("流山市"), /jf-rate__fill" style="left:50\.00%;width:47\.65%"/);
  assert.match(row("宝塚市"), /jf-rate__fill is-neg" style="left:\d+\.\d+%;width:25\.6\d%"/);
  assert.match(row("宝塚市"), /jf-rate--focus/);
  assert.match(row("流山市"), /jf-rate--peer/);
  assert.equal((html.match(/jf-rate__tag">深掘り</g) ?? []).length, 2, "深掘りの2市だけに文字の目印");
  assert.equal((html.match(/jf-rate--other/g) ?? []).length, 4, "ほかの4市を省略しない");
  assert.ok(html.includes("縦線は0%") && html.includes("かっこの中は人数"));
  assert.ok(html.includes('aria-label="宝塚市：226,432人から217,157人へ、9,275人減少、増減率−4.1%"'), "読み上げ用の説明");
  assert.ok(html.includes("枠つきの濃い棒") && html.includes("斜線の棒") && html.includes("淡い棒"), "凡例は色以外の特徴でも説明する");
  assert.ok(texts().join("\n").includes("順位は、街の優劣を表すものではありません"));
});

test("6つの街：本文の結果（増えた2市・減った4市・全国）が図のデータと一致している", () => {
  const f = rateFig();
  assert.deepEqual(f.rows.filter((r) => r.to > r.from).map((r) => r.label).sort(), ["流山市", "茅ヶ崎市"].sort());
  assert.deepEqual(f.rows.filter((r) => r.to < r.from).map((r) => r.label).sort(), ["伊丹市", "厚木市", "宝塚市", "松本市"].sort());
  const plain = episodePage(draftEp, SITE).replace(/<[^>]+>/g, "");
  for (const s of ["増えたのは流山市と茅ヶ崎市の2市です", "厚木市、伊丹市、松本市、宝塚市の4市は減りました", "3,173,571人（2.5%）の減少です", "全国の代表ではない", "増えたのは2つの街、減ったのは4つの街"]) assert.ok(plain.includes(s), s);
  // 数字は図と表に任せ、本文では繰り返さない（6市の人数の羅列を本文に置かない）
  const ch1 = c.sections[0].blocks.filter((b) => b.t === "p").map((b) => b.text).join("");
  for (const o of [15237, 2291, 920, 3089, 8904, 9275]) assert.ok(!ch1.includes(o.toLocaleString("ja-JP")), `第1章の本文に ${o} を重ねて書かない`);
  // 期間の違う統計を同じ数字として扱わない
  const all = texts().join("\n");
  assert.ok(all.includes("期間も統計も違います") && all.includes("同じ5年間の内訳として読んだりはできません"), "2020→2025年と2022〜2024年を混ぜない注記");
  assert.ok(all.includes("考えられる背景（原因が証明されたわけではありません）"), "考えられる背景は原因の証明ではない");
  assert.ok(!all.includes("おもに自然減") && !all.includes("おもに転入"), "期間の違う統計をつないだ『おもに〜』の断定をしない");
});

test("描画：増減率の図の部品は、from→to から率を計算し、不正な形を検出する", () => {
  const ok = { t: "rate", id: "r1", title: "t", desc: "d", max: 10, rows: [{ label: "A", from: 100, to: 110, role: "focus" }, { label: "B", from: 100, to: 90, role: "other" }] };
  assert.deepEqual(validateBlocks([ok]), []);
  const html = renderBlock(ok);
  assert.ok(html.includes("＋10.0%") && html.includes("−10.0%") && html.includes("（＋10人）") && html.includes("（−10人）"));
  assert.match(html, /left:50\.00%;width:50\.00%/);
  assert.match(html, /left:0\.00%;width:50\.00%/);
  const bad = (patch) => validateBlocks([{ ...ok, ...patch }]).length > 0;
  assert.ok(bad({ rows: [ok.rows[0]] }), "2件未満");
  assert.ok(bad({ max: 5 }), "率が max を超える");
  assert.ok(bad({ rows: [{ ...ok.rows[0], role: "x" }, ok.rows[1]] }), "role が不正");
  assert.ok(bad({ rows: [{ ...ok.rows[0], from: 0 }, ok.rows[1]] }), "from が0");
  assert.ok(bad({ rows: [ok.rows[0], { ...ok.rows[1], label: "A" }] }), "label の重複");
});

// ====================================================================
// 承認コマンド（approve）で図解つきの回を扱えること。使い捨ての鍵と一時フォルダだけを使い、実際の原稿・鍵には触れない
// ====================================================================
test("承認の手順：図解つきの回でも approve が最後まで動き、承認した内容だけが予約日時に公開される（使い捨て鍵・一時フォルダ）", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ep-approve-"));
  try {
    const keyFile = path.join(tmp, "approver.pem");
    const { publicKeyPem } = generateKeyPair(keyFile, ROOT);
    const ring = [crypto.createPublicKey(publicKeyPem)];
    const dir = path.join(tmp, "episodes"); fs.mkdirSync(dir);
    const file = path.join(dir, `${ep.slug}.json`);
    fs.writeFileSync(file, JSON.stringify({ ...draftEp, status: "scheduled" }, null, 2));
    const lines = [];
    const before = new Date("2026-11-06T12:00:00+09:00");
    const r = await runApprove({ slug: ep.slug, approvedBy: "テスト承認者", dir, repoRoot: ROOT, keyFile, ring, now: before, interactive: true, ask: async () => ep.slug, out: (l) => lines.push(l) });
    assert.equal(r.approved, true);
    assert.ok(lines.some((l) => l.includes("ブロック")), "図解つきの節は、ブロック数で表示する（paragraphs が無くても落ちない）");
    const slotMs = Date.parse("2026-11-07T10:15:00+09:00");
    const sel = (now, eps = loadEpisodes(dir)) => selectEpisodes(eps, { now: new Date(now), approverPublicKey: publicKeyPem });
    assert.equal(sel(slotMs - 1000).publish.length, 0, "予約日時の1秒前は公開されない");
    assert.equal(sel(slotMs).publish.length, 1, "予約日時ちょうどのビルドから公開される");
    assert.equal(sel(slotMs + 3600 * 1000).publish.length, 1);
    // 承認後に原稿を1文字でも変えると、公開されない（署名が合わなくなる）
    const changed = loadEpisodes(dir).map((e) => ({ ...e, title: `${e.title}x` }));
    assert.equal(sel(slotMs + 1000, changed).publish.length, 0);
    // 公開保留（hold）は署名を変えずに止められる
    const held = loadEpisodes(dir).map((e) => ({ ...e, hold: true }));
    assert.equal(sel(slotMs + 1000, held).publish.length, 0);
    // 予約日時を過ぎてからの承認はできない（署名は予約日時の前に済ませる）
    fs.writeFileSync(file, JSON.stringify({ ...draftEp, status: "scheduled" }, null, 2));
    await assert.rejects(() => runApprove({ slug: ep.slug, approvedBy: "テスト承認者", dir, repoRoot: ROOT, keyFile, ring, now: new Date(slotMs), interactive: true, ask: async () => ep.slug, out: () => {} }), /予約日時を過ぎています/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ====================================================================
// 編集監査の指摘への対応（最終原稿）
// ====================================================================
test("編集監査1：第4章の確認済み人口動態は【事実】で、【考察】のラベルを付けない", () => {
  const ch4 = c.sections[3].blocks.filter((b) => b.t === "p");
  assert.ok(ch4.some((b) => b.k === "fact" && b.text.startsWith("2022〜2024年の人口の動きでは、宝塚市は自然減が続き")));
  assert.ok(!ch4.some((b) => b.k === "idea"), "第4章に考察ラベルの段落は無い");
  // 考察は、事実と区別して残る（第3章）
  assert.ok(blocks.some((b) => b.t === "p" && b.k === "idea"));
});

test("編集監査2：待機児童は、集計の年度・定義が両市で異なることを明記し、同じ条件の比較結果として扱わない", () => {
  const t = blocks.find((b) => b.t === "compare");
  const wait = t.items.find((x) => x.h.startsWith("保育所等の待機児童"));
  assert.ok(wait.h.includes("集計の年度・定義が両市で異なります"));
  const all = texts().join("\n");
  assert.ok(all.includes("宝塚市（令和4年度以降）と流山市（令和5・6年）で、集計の年度と定義") && all.includes("同じ条件での比較結果としては扱っていません"));
});

test("編集監査3・4：第1章の冒頭で比較対象（第1弾の5つの街＋宝塚市＝6市）を明記し、第4章に流山市の自然増減の縮小（対象年つき）を戻す", () => {
  const ch1p = c.sections[0].blocks.find((b) => b.t === "p");
  assert.ok(ch1p.text.startsWith("宝塚市と、第1弾で比較した5つの街（計6市）の"));
  assert.equal(Object.keys(FIRST.rows).length, 6, "第1弾は宝塚市を含む6市（宝塚市＋5つの街）");
  const all = texts().join("\n");
  assert.ok(all.includes("自然増減も、2022年の＋234人から2024年の＋37人へ小さくなりました"));
  assert.equal(GOLDEN.published.nagareyama[2022][0], 234); assert.equal(GOLDEN.published.nagareyama[2024][0], 37);
});

test("編集監査5：出典の名称は各公表元の表記に従う旨を、出典一覧の前に1回だけ示し、出典4・6の題名は変えない", () => {
  assert.equal(c.sourcesNote, "出典の名称は各公表元の表記に従っています。");
  const html = episodePage(draftEp, SITE);
  assert.equal(html.split("出典の名称は各公表元の表記に従っています").length - 1, 1, "1回だけ");
  assert.ok(html.indexOf("出典の名称は各公表元の表記に従っています") < html.indexOf('<ul class="jf-sources"'), "出典一覧の前");
  assert.ok(c.sources[3].label.includes("人口等基本集計結果」（確定値）") && c.sources[5].label.includes("人口等基本集計結果（確定値）」"), "出典4・6の題名は各市の表記のまま");
  assert.equal(c.sources.length, 21, "出典21件");
  assert.ok(validateEpisodeShape({ ...draftEp, content: { ...c, sourcesNote: " " } }).length > 0, "空の注記は形式エラー");
});

test("編集監査6：持ち家割合と民営借家の増加は、別々の文（別の数字）で示し、関係があるように書かない", () => {
  const p = c.sections[4].blocks.find((b) => b.t === "p" && b.k === "fact" && b.text.includes("持ち家の割合"));
  const sentences = p.text.split("。");
  const own = sentences.findIndex((s) => s.includes("持ち家の割合"));
  const rent = sentences.findIndex((s) => s.includes("民営の借家に住む世帯が4,822世帯（20.7%）"));
  assert.ok(own >= 0 && rent > own, "別の文");
  assert.ok(sentences[rent].startsWith("これとは別の数字として"));
  assert.ok(!sentences[own].includes("民営の借家"), "同じ文に入れない");
});

test("統計と考察：人口増減の原因を断定する語や、成功・失敗の評価語を使わない", () => {
  const all = texts().join("\n");
  for (const w of ["成功", "失敗", "苦戦", "好調", "危機", "のおかげ", "によって人口", "が原因", "原因は", "原因です", "だから人口", "そのため人口", "選ばれ", "魅力"]) assert.ok(!all.includes(w), `使わない表現：${w}`);
  // 因果の言葉を含む文は、「示すものではない」「確かめられない」「証明されたわけではありません」のように否定・保留の形だけ
  const sents = all.split(/[。\n]/).filter((x) => /原因|理由/.test(x));
  for (const s of sents) assert.ok(/(ではなく|ではありません|示すものではない|確かめられません|確かめていない|言い切れません|断定しません|断定はしません|証明された)/.test(s), `因果の語が肯定の形で使われている：${s}`);
});

// ====================================================================
// 書きぶり・定義・日付・出典
// ====================================================================
test("書きぶり：歴史的な断定・優劣・原因の断定の表現を使わない。事実・計算値・考察・確認できないことを区別する", () => {
  const all = texts().join("\n");
  for (const w of ["以来初", "初めて", "史上", "全国初", "過去最", "最も", "いちばん", "ランキング", "優れ", "劣っ", "おかげ", "せいで", "が原因", "原因は", "原因です", "決定的"]) assert.ok(!all.includes(w), `使わない表現：${w}`);
  assert.ok(all.includes("優劣を決めるものではありません") && all.includes("優劣や、人口の増減との関係を示すものではありません"));
  assert.ok(all.includes("理由までは、統計だけでは言い切れません"));
  const kinds = new Set(blocks.filter((b) => b.t === "p" && b.k).map((b) => b.k));
  assert.deepEqual([...kinds].sort(), ["calc", "fact", "hypo", "idea", "unk"]);
  // 『計算値』のラベルは、数字を足し引きした段落だけに付ける（原表の数字そのままには付けない）
  for (const b of blocks.filter((x) => x.t === "p" && x.k === "calc")) assert.ok(/合計|変化|からの15年間/.test(b.text), b.text.slice(0, 20));
});

test("統計の定義：年齢不詳の扱い・世帯の数え方・推計人口と国勢調査の違い・30〜44歳の目安を明示している", () => {
  const all = texts().join("\n");
  for (const s of ["年齢『不詳』）を除いて計算しています", "年齢不詳は2025年に、宝塚市が1,555人（0.7%）、流山市が3,405人（1.6%）", "世帯総数＝一般世帯＋施設等の世帯", "『住宅に住む一般世帯』は、一般世帯のうち住宅に住む世帯", "国勢調査の人口とは一致しません", "『30〜44歳』は、この記事の目安の区分です", "公的な『子育て世代』の定義ではありません", "定義はほぼ同じですが、同一の統計ではありません", "（各年1〜12月）", "（各年1月1日から翌年1月1日まで）", "どちらも令和4〜6年"]) assert.ok(all.includes(s), s);
});

test("子育て施策：宝塚市の現行（高校生世代の入院助成を含む）と2027年7月の見直しを区別し、公表の時点を明記している", () => {
  const t = blocks.find((b) => b.t === "compare");
  assert.ok(t.caption.includes("各市の公式ページの記載"));
  // 項目の見出しと、市の名前で記載を取り出す（宝塚市が先、流山市が後）
  const it = (rowRe) => t.items.find((x) => rowRe.test(x.h));
  const cell = (rowRe, city) => it(rowRe).cells.find((y) => y.city === city).text;
  assert.deepEqual(t.items[0].cells.map((y) => y.city), ["宝塚市", "流山市"]);
  const nowTak = cell(/医療費助成（現行）/, "宝塚市");
  assert.ok(nowTak.includes("0歳〜中学3年生は、通院・入院とも自己負担なし") && nowTak.includes("高校生世代") && nowTak.includes("通院は助成の対象外") && nowTak.includes("入院は申請により自己負担の全額を助成"), "現行：高校生世代は入院のみ");
  const nextTak = cell(/見直し/, "宝塚市");
  assert.ok(nextTak.includes("1歳〜小学3年生は通院1回200円") && nextTak.includes("小学4年生〜高校3年生相当は通院1回400円") && nextTak.includes("月2回まで") && nextTak.includes("低所得者は負担なし") && nextTak.includes("入院は自己負担なし"));
  assert.ok(t.items.find((x) => /見直し/.test(x.h)).h.includes("令和9年（2027年）7月1日"));
  assert.ok(nowTak.includes("2026年10月8日更新") && nextTak.includes("2026年10月8日更新"), "最新の公表文書の更新日");
  const all = texts().join("\n");
  assert.ok(all.includes("それまでは現行の制度です"), "見直し前は現行制度");
  // 議案第54号（議会資料 資料1『改正条例の概要について』）：乳幼児等医療費助成の見直しで、令和8年6月25日に可決、施行は令和9年7月1日の予定
  assert.ok(all.includes("令和8年6月25日に、乳幼児・こども医療費助成を見直す条例の改正（議案第54号）を可決しました"), "可決（議決）の事実");
  assert.ok(all.includes("施行は令和9年（2027年）7月1日の予定で、まだ始まっていません"), "未施行");
  assert.ok(all.includes("可決された改正と、まだ施行されていない制度の変更を、分けて読んでください"), "議決と施行を混同しない");
  assert.ok(it(/見直し/).h.includes("施行予定") && nextTak.includes("令和8年6月25日に条例の改正が可決され、令和9年7月1日の施行予定"));
  assert.ok(!all.includes("確認できません。市議会") && !all.includes("当たるかを確認できません"), "議案第54号との関係を『確認できない』としない");
  const srcUrls = c.sources.map((s) => s.url);
  assert.ok(srcUrls.some((u) => u.endsWith("/54_001_001.pdf")) && srcUrls.some((u) => u.endsWith("/1041642.html")), "議会の一次資料を出典に載せる");
  assert.ok(!/見直しが決まり|見直しが始まり|すでに見直|廃止/.test(all), "見直しが開始済みのように書かない");
  const nag = cell(/医療費助成（現行）/, "流山市");
  assert.ok(nag.includes("高校3年生") && nag.includes("通院1回200円") && nag.includes("入院1日200円"));
  assert.ok(all.includes("待機児童の最新（令和8年4月）の人数は、確認できていません"));
});

test("日付：公開日・確認日・予約日の整合。本文の日付は確認日以前（将来の予定は『予定』として区別）", () => {
  const checked = c.checkedAt;
  assert.match(checked, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(checked <= ep.scheduledAt.slice(0, 10), "確認日は公開予定日より前");
  assert.equal(ep.scheduledAt.slice(0, 10), "2026-11-07");
  for (const t of texts()) {
    for (const m of t.matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)) {
      const iso = `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
      if (iso > checked) assert.ok(/令和9年（2027年）7月1日/.test(t) && iso === "2027-07-01", `未来の日付は、令和9年7月1日の見直し予定だけ：${m[0]}`);
    }
  }
  assert.ok(texts().join("\n").includes("2026年10月8日更新"));
  assert.equal(c.updatedAt, "2026-11-07");
});

test("出典：すべて https で重複がなく、本文中の出典は、末尾の出典一覧にも載っている。人口動態の出典は3か年分が揃う", () => {
  const list = c.sources.map((s) => s.url);
  assert.equal(new Set(list).size, list.length, "出典の一覧に重複がない");
  assert.ok(list.every((u) => /^https:\/\//.test(u)));
  const inline = blocks.filter((b) => b.t === "source" || b.t === "sources").flatMap((b) => (b.t === "source" ? [b] : b.items));
  assert.ok(inline.length >= 10);
  for (const s of inline) assert.ok(list.includes(s.url), `一覧にない出典：${s.label}`);
  for (const y of ["04001.pdf", "05001_3.pdf", "06001.pdf"]) assert.ok(list.some((u) => u.endsWith(y)), `兵庫県 ${y}`);
  const hosts = new Set(list.map((u) => new URL(u).host));
  for (const h of ["www.e-stat.go.jp", "web.pref.hyogo.lg.jp", "www.pref.chiba.lg.jp", "www.city.takarazuka.hyogo.jp", "www.city.nagareyama.chiba.jp"]) assert.ok(hosts.has(h), h);
  assert.ok([...hosts].every((h) => /(\.go\.jp|\.lg\.jp)$/.test(h) || /^www\.city\.(takarazuka\.hyogo|nagareyama\.chiba)\.jp$/.test(h)), "国・県・市の公式サイトだけ");
});

test("次回予告：第3弾「市議会の全体像」。サイト内の既存ページへのリンクで、新しい事実を述べない", () => {
  const next = blocks.find((b) => b.t === "next");
  assert.ok(next.title.includes("第3弾") && next.title.includes("市議会の全体像"));
  assert.equal(next.href, "/category/shigikai");
  assert.ok(!/\d/.test(next.text), "予告に数字を入れない");
});

test("子育て関連の比較：見出しと説明を調査した2項目に合わせ、子育て支援全体の評価としない", () => {
  const all = JSON.stringify(c);
  assert.ok(!all.includes("子育て施策"), "調査範囲より広い表現を残さない");
  const sec = c.sections.find((s) => s.heading === "住まい・通勤・子育て関連の制度・状況は？");
  assert.ok(sec, "章見出し");
  const i = sec.blocks.findIndex((b) => b.t === "compare");
  assert.ok(sec.blocks.some((b) => b.t === "h3" && b.text === "子ども医療費助成と保育所等の待機児童"));
  assert.ok(sec.blocks[i].caption.startsWith("子ども医療費助成制度と待機児童数の比較"));
  assert.equal(sec.blocks[i - 1].text, "比較するのはこの2項目だけで、子育て支援全体の評価ではありません。", "表の直前");
  assert.ok(sec.blocks[i + 1].items[0].startsWith("この2項目は、各市の公式ページの記載です。"), "表の直後");
  assert.ok(all.includes("住宅事情や医療費助成・待機児童数と、転入や出生との関係。"));
});

test("分量：本文（図・表・比較カード・吹き出し・折りたたみを除く）は、第1弾の1.35倍以内で、読み切れる長さ", () => {
  // 2つの街だけの構成では1.15倍で作っていた。6つの街の比較の章を加える構成変更（PM決定）に合わせて上限を1.35倍にした。これ以上は増やさない
  const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<nav[\s\S]*?<\/nav>/g, "").replace(/<details[\s\S]*?<\/details>/g, "").replace(/<figure[\s\S]*?<\/figure>/g, "").replace(/<table[\s\S]*?<\/table>/g, "").replace(/<section class="jf-cmp"[\s\S]*?<\/section>/g, "").replace(/<div class="jf-say[\s\S]*?<\/p><\/div>/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
  const body = (html) => strip(html.slice(html.indexOf('<div class="jf">'), html.indexOf("</main>") > 0 ? html.indexOf("</main>") : undefined)).length;
  const first = jitsuryokuFeaturePage(FIRST, SITE);
  assert.ok(first.length > 1000);
  const n2 = body(episodePage(draftEp, SITE));
  const n1 = body(first);
  assert.ok(n2 <= n1 * 1.35, `第2弾 ${n2}字 / 第1弾 ${n1}字`);
  assert.ok(renderBlocks(blocks.filter((b) => b.t === "p")).length > 0);
});
