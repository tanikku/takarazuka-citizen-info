import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseJstDateTime, parseScheduledAt, contentHashOf, signApproval, verifyApproval, checkApproval,
  validateEpisodeShape, decideEpisode, selectEpisodes, loadEpisodes, resolveNow, resolveApproverKey,
  episodePage, episodeListHtml, episodeDate,
} from "./series-episodes.js";
import { jitsuryokuPage } from "../templates.js";
import { loadFeature, jitsuryokuFeaturePage } from "./jitsuryoku-feature.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = "https://takarazuka-today.jp";
// 2026-11-07・11-14 は土曜日。予約は 10:15:00 JST = 01:15:00 UTC
const SLOT = "2026-11-07T10:15:00+09:00";
const SLOT2 = "2026-11-14T10:15:00+09:00";
const SLOT_UTC = Date.parse("2026-11-07T01:15:00Z");
const SLOT2_UTC = Date.parse("2026-11-14T01:15:00Z");
const at = (ms, base = SLOT_UTC) => new Date(base + ms);
const SEC = 1000;
const DAY = 24 * 3600 * SEC;

const approver = crypto.generateKeyPairSync("ed25519");
const stranger = crypto.generateKeyPairSync("ed25519");

function draft(over = {}) {
  return {
    slug: "ep2-sample", episode: 2, title: "第2回のテスト", description: "テスト用の回です。", status: "scheduled", scheduledAt: SLOT,
    content: { sections: [{ heading: "見出し", paragraphs: ["本文です。"] }], sources: [{ label: "出典", url: "https://example.go.jp/a" }] },
    ...over,
  };
}
// 承認：署名の対象は 回の識別子・内容ハッシュ・予約日時・承認者・承認日時
function approve(ep, { key = approver.privateKey, approvedBy = "運営者", approvedAt = "2026-11-06T18:00:00+09:00" } = {}) {
  const contentHash = contentHashOf(ep);
  const scheduledAt = ep.scheduledAt;
  const signature = signApproval(key, { slug: ep.slug, contentHash, scheduledAt, approvedBy, approvedAt });
  return { ...ep, approval: { approvedBy, approvedAt, contentHash, scheduledAt, signature } };
}
const ctx = (ms = 0, extra = {}) => ({ now: at(ms), approverPublicKey: approver.publicKey, ...extra });

// ---------- 日時 ----------
test("日時：+09:00の実在する日時だけを受け付け、予約は土曜10:15:00 JSTだけ", () => {
  assert.equal(parseJstDateTime(SLOT).ok, true);
  assert.equal(parseJstDateTime(SLOT).ms, SLOT_UTC);
  assert.equal(parseScheduledAt(SLOT).ok, true);
  for (const bad of ["2026-11-07 10:15:00", "2026-11-07T10:15:00Z", "2026-11-07T10:15:00+00:00", "2026-11-07T10:15+09:00", "2026-11-31T10:15:00+09:00", "2026-13-07T10:15:00+09:00", "", null, undefined, 20261107]) {
    assert.equal(parseJstDateTime(bad).ok, false, String(bad));
  }
  assert.equal(parseScheduledAt("2026-11-06T10:15:00+09:00").reason, "not-saturday-1015-jst", "金曜");
  assert.equal(parseScheduledAt("2026-11-07T10:16:00+09:00").reason, "not-saturday-1015-jst", "10:16");
  assert.equal(parseScheduledAt("2026-11-07T10:15:01+09:00").reason, "not-saturday-1015-jst", "秒");
  assert.equal(parseScheduledAt("2026-11-07T09:15:00+09:00").reason, "not-saturday-1015-jst", "9:15");
});

// ---------- 時刻別 ----------
test("時刻：予定の1秒前は出さず、同時と1秒後は出す（承認済み・保留なし）", () => {
  const ep = approve(draft());
  assert.deepEqual(decideEpisode(ep, ctx(-SEC)), { publish: false, reason: "not-yet-due" });
  assert.deepEqual(decideEpisode(ep, ctx(-1)), { publish: false, reason: "not-yet-due" });
  assert.deepEqual(decideEpisode(ep, ctx(0)), { publish: true, reason: "due" });
  assert.deepEqual(decideEpisode(ep, ctx(SEC)), { publish: true, reason: "due" });
  assert.deepEqual(decideEpisode(ep, ctx(3 * DAY)), { publish: true, reason: "due" }, "遅延しても公開される");
});

// ---------- 未承認・早期公開 ----------
test("未承認：scheduledでも、publishedに書き換えても公開されない（ビルドは止まる）", () => {
  const unapproved = draft();
  assert.equal(decideEpisode(unapproved, ctx(SEC)).reason, "not-approved");
  const flipped = { ...unapproved, status: "published", publishedAt: "2026-11-07" };
  const d = decideEpisode(flipped, ctx(SEC));
  assert.equal(d.publish, false);
  assert.equal(d.blocking, true);
  const sel = selectEpisodes([flipped], ctx(SEC));
  assert.equal(sel.publish.length, 0);
  assert.equal(sel.errors.length, 1);
});

test("scheduled→published への書き換え：予定前は公開されず、予定の1秒前・同時・1秒後で挙動が分かれる", () => {
  const sched = approve(draft());
  const flipped = { ...sched, status: "published", publishedAt: "2026-11-07" };
  assert.deepEqual(decideEpisode(flipped, ctx(-DAY)), { publish: false, reason: "published-before-scheduled" });
  assert.deepEqual(decideEpisode(flipped, ctx(-SEC)), { publish: false, reason: "published-before-scheduled" });
  assert.deepEqual(decideEpisode(flipped, ctx(0)), { publish: true, reason: "published" });
  assert.deepEqual(decideEpisode(flipped, ctx(SEC)), { publish: true, reason: "published" });
  const early = selectEpisodes([flipped], ctx(-SEC));
  assert.equal(early.publish.length, 0);
  assert.deepEqual(early.errors, [], "承認は本物なので、ビルドは止めずに出さないだけ");
});

test("承認後の原稿変更：ハッシュが合わなくなり公開されない（scheduled・published とも）", () => {
  const ep = approve(draft());
  const edited = { ...ep, content: { ...ep.content, sections: [{ heading: "見出し", paragraphs: ["本文を後から変えました。"] }] } };
  assert.equal(decideEpisode(edited, ctx(SEC)).reason, "content-changed-after-approval");
  const published = approve(draft({ status: "published", publishedAt: "2026-11-07" }));
  assert.equal(decideEpisode(published, ctx(SEC)).publish, true);
  const editedPub = { ...published, title: "公開後に勝手に変更" };
  const d = decideEpisode(editedPub, ctx(SEC));
  assert.equal(d.publish, false);
  assert.equal(d.blocking, true);
});

// ---------- 予約日時の承認 ----------
test("予約日時も承認の対象：前倒しは公開できない", () => {
  const ep = approve(draft({ scheduledAt: SLOT2 }));
  assert.equal(decideEpisode(ep, ctx(0, { now: at(0, SLOT2_UTC) })).publish, true, "承認した日時なら公開");
  const earlier = { ...ep, scheduledAt: SLOT };
  assert.equal(decideEpisode(earlier, ctx(SEC)).reason, "schedule-changed-after-approval", "前倒し");
  assert.equal(decideEpisode(earlier, { now: at(7 * DAY), approverPublicKey: approver.publicKey }).publish, false, "新しい日時を過ぎても出ない");
  const both = { ...earlier, approval: { ...earlier.approval, scheduledAt: SLOT } };
  assert.equal(decideEpisode(both, ctx(SEC)).reason, "approval-signature-invalid", "承認欄の日時も書き換えると、署名が合わない");
});

test("予約日時も承認の対象：後ろ倒しは再承認まで公開できない。再承認後は新しい日時に公開", () => {
  const ep = approve(draft());
  const later = { ...ep, scheduledAt: SLOT2 };
  assert.equal(decideEpisode(later, ctx(0)).reason, "schedule-changed-after-approval", "元の日時でも出ない");
  assert.equal(decideEpisode(later, { now: at(0, SLOT2_UTC), approverPublicKey: approver.publicKey }).publish, false, "新しい日時でも再承認まで出ない");
  const { approval, ...unsigned } = later;
  const reapproved = approve(unsigned, { approvedAt: "2026-11-12T18:00:00+09:00" });
  assert.equal(reapproved.approval.scheduledAt, SLOT2);
  assert.equal(decideEpisode(reapproved, ctx(0)).reason, "not-yet-due", "元の日時では出ない");
  assert.equal(decideEpisode(reapproved, { now: at(-SEC, SLOT2_UTC), approverPublicKey: approver.publicKey }).publish, false, "新日時の1秒前");
  assert.deepEqual(decideEpisode(reapproved, { now: at(0, SLOT2_UTC), approverPublicKey: approver.publicKey }), { publish: true, reason: "due" }, "新日時に公開");
});

test("日時の誤り：枠でない日時・実在しない日時は、承認されていても公開されない", () => {
  const wrongSlot = approve(draft({ scheduledAt: "2026-11-08T10:15:00+09:00" }));
  assert.equal(decideEpisode(wrongSlot, ctx(DAY)).reason, "invalid-schedule:not-saturday-1015-jst");
  const nonexistent = approve(draft({ scheduledAt: "2026-11-31T10:15:00+09:00" }));
  assert.equal(decideEpisode(nonexistent, ctx(DAY)).reason, "not-approved", "実在しない日時は承認の記録としても成立しない");
  const missing = approve(draft());
  delete missing.scheduledAt;
  assert.notEqual(decideEpisode(missing, ctx(DAY)).publish, true);
  const early = approve(draft(), { approvedAt: "2026-11-07T10:30:00+09:00" });
  assert.equal(decideEpisode(early, ctx(DAY)).reason, "approved-after-schedule");
});

// ---------- 署名・鍵 ----------
test("署名：署名なし・ハッシュだけ・他人の署名・他の回の承認の流用・承認者名の改ざんは拒否", () => {
  const ok = approve(draft());
  const noSig = { ...ok, approval: { ...ok.approval, signature: "" } };
  assert.equal(decideEpisode(noSig, ctx(SEC)).reason, "not-approved");
  const hashOnly = { ...ok, approval: { contentHash: ok.approval.contentHash } };
  assert.equal(decideEpisode(hashOnly, ctx(SEC)).reason, "not-approved");
  const forged = approve(draft(), { key: stranger.privateKey });
  assert.equal(decideEpisode(forged, ctx(SEC)).reason, "approval-signature-invalid", "別の鍵で作った承認");
  const other = draft({ slug: "ep3-other", episode: 3 });
  const reused = { ...other, approval: ok.approval };
  assert.notEqual(decideEpisode(reused, ctx(SEC)).publish, true, "他の回の承認は使えない");
  const sameContent = { ...ok, slug: "ep9-copy", episode: 9, approval: ok.approval };
  assert.notEqual(decideEpisode(sameContent, ctx(SEC)).publish, true, "別slugへの流用");
  const renamed = { ...ok, approval: { ...ok.approval, approvedBy: "別の人" } };
  assert.equal(decideEpisode(renamed, ctx(SEC)).reason, "approval-signature-invalid");
  const truncated = { ...ok, approval: { ...ok.approval, signature: ok.approval.signature.slice(0, 20) } };
  assert.equal(decideEpisode(truncated, ctx(SEC)).reason, "approval-signature-invalid");
  assert.equal(checkApproval(ok, approver.publicKey).ok, true);
  assert.equal(verifyApproval(approver.publicKey, { slug: ok.slug, ...ok.approval }, ok.approval.signature), true);
});

test("鍵の不備は安全側で止まる：公開鍵なし・不正・Ed25519以外 → 出さない（公開済みはビルド停止）、秘密鍵の不備 → 署名できない", () => {
  const ok = approve(draft());
  assert.equal(decideEpisode(ok, { now: at(SEC), approverPublicKey: null }).reason, "approver-key-missing");
  assert.equal(decideEpisode(ok, { now: at(SEC), approverPublicKey: undefined }).reason, "approver-key-missing");
  assert.equal(decideEpisode(ok, { now: at(SEC), approverPublicKey: "not a key" }).reason, "approver-key-invalid");
  const rsa = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  assert.equal(decideEpisode(ok, { now: at(SEC), approverPublicKey: rsa.publicKey }).reason, "approver-key-invalid", "Ed25519以外");
  assert.equal(decideEpisode(ok, { now: at(SEC), approverPublicKey: stranger.publicKey }).reason, "approval-signature-invalid", "別人の公開鍵");
  const pub = approve(draft({ status: "published", publishedAt: "2026-11-07" }));
  for (const key of [null, "bad", rsa.publicKey]) {
    const d = decideEpisode(pub, { now: at(SEC), approverPublicKey: key });
    assert.equal(d.publish, false);
    assert.equal(d.blocking, true, "公開済みの検証ができないときは、ビルドを止めて直前の本番を残す");
  }
  assert.throws(() => signApproval("garbage", { slug: "a", contentHash: "b", scheduledAt: SLOT, approvedBy: "c", approvedAt: "d" }));
  let rsaSigned = null;
  try { rsaSigned = approve(draft(), { key: rsa.privateKey }); } catch { /* 署名できない鍵は、そこで止まる */ }
  if (rsaSigned) assert.notEqual(decideEpisode(rsaSigned, ctx(SEC)).publish, true, "Ed25519以外の鍵の署名は通らない");
});

// ---------- 保留・公開済み ----------
test("公開保留：holdがあれば公開前は出さない。署名は変わらず、外せば公開できる", () => {
  const ep = approve(draft({ hold: true }));
  assert.equal(decideEpisode(ep, ctx(SEC)).reason, "on-hold");
  assert.equal(decideEpisode(ep, ctx(-SEC)).reason, "on-hold", "公開前でも保留");
  const released = { ...ep };
  delete released.hold;
  assert.equal(decideEpisode(released, ctx(SEC)).publish, true, "holdの有無は署名に影響しない");
  assert.equal(contentHashOf(ep), contentHashOf(released));
});

test("公開済み：通常の再ビルドで維持される（hold付き・遅れて再ビルドしても）。公開前に時計が戻る場合だけ出ない", () => {
  const published = approve(draft({ status: "published", publishedAt: "2026-11-07", hold: true }));
  for (const ms of [0, SEC, DAY, 90 * DAY]) assert.equal(decideEpisode(published, ctx(ms)).publish, true, `+${ms}ms`);
  const sel = selectEpisodes([published], ctx(30 * DAY));
  assert.deepEqual(sel.publish.map((e) => e.slug), ["ep2-sample"]);
  assert.deepEqual(sel.errors, []);
});

test("draft・形式の誤り・時刻の不正", () => {
  assert.deepEqual(decideEpisode(draft({ status: "draft" }), ctx(SEC)), { publish: false, reason: "draft" });
  assert.equal(decideEpisode(draft({ status: "ready" }), ctx(SEC)).reason, "invalid-episode");
  assert.equal(decideEpisode(draft({ slug: "Bad Slug" }), ctx(SEC)).reason, "invalid-episode");
  assert.equal(decideEpisode(draft({ episode: 1 }), ctx(SEC)).reason, "invalid-episode", "第1弾は対象外");
  assert.equal(decideEpisode(draft({ hold: "yes" }), ctx(SEC)).reason, "invalid-episode");
  assert.ok(validateEpisodeShape(draft({ content: {} })).length > 0);
  assert.throws(() => decideEpisode(approve(draft()), { now: new Date("x"), approverPublicKey: approver.publicKey }), /now が不正/);
});

// ---------- 重複・選択 ----------
test("重複：slugの重複・回番号の重複・既存ページとの衝突は、どれも出さずにエラーにする", () => {
  const a = approve(draft());
  const b = approve(draft({ title: "別の本文" }));
  let sel = selectEpisodes([a, b], ctx(SEC));
  assert.equal(sel.publish.length, 0);
  assert.ok(sel.errors.some((e) => e.includes("slug が重複")));
  const c = approve(draft({ slug: "ep2-other" }));
  sel = selectEpisodes([a, c], ctx(SEC));
  assert.equal(sel.publish.length, 0);
  assert.ok(sel.errors.some((e) => e.includes("第2回が重複")));
  sel = selectEpisodes([a], { ...ctx(SEC), reservedSlugs: ["ep2-sample"] });
  assert.equal(sel.publish.length, 0);
  assert.equal(sel.errors.length, 1);
});

test("選択：公開できる回だけが回番号順で返り、除外は理由つきで返る", () => {
  const e2 = approve(draft());
  const e3 = approve(draft({ slug: "ep3-next", episode: 3, scheduledAt: SLOT2 }));
  const e4 = draft({ slug: "ep4-memo", episode: 4, status: "draft" });
  const sel = selectEpisodes([e3, e4, e2], ctx(SEC));
  assert.deepEqual(sel.publish.map((e) => e.slug), ["ep2-sample"]);
  assert.deepEqual(sel.excluded.map((x) => [x.slug, x.reason]), [["ep3-next", "not-yet-due"], ["ep4-memo", "draft"]]);
  assert.deepEqual(sel.errors, []);
});

// ---------- 読み込み・時刻・鍵 ----------
test("読み込み：ファイル名とslugの不一致・壊れたJSONはエラー扱いで、出力されない", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "episodes-"));
  try {
    fs.writeFileSync(path.join(dir, "ep2-sample.json"), JSON.stringify(approve(draft())));
    fs.writeFileSync(path.join(dir, "ep9-wrong.json"), JSON.stringify(approve(draft({ slug: "ep5-x", episode: 5 }))));
    fs.writeFileSync(path.join(dir, "ep7-broken.json"), "{ not json");
    const loaded = loadEpisodes(dir);
    assert.equal(loaded.length, 3);
    const sel = selectEpisodes(loaded, ctx(SEC));
    assert.deepEqual(sel.publish.map((e) => e.slug), ["ep2-sample"]);
    assert.equal(sel.errors.length, 2);
    assert.deepEqual(loadEpisodes(path.join(dir, "none")), []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("現在時刻：SERIES_NOWで固定できるが、Cloudflare Pagesのビルド（CF_PAGES）では無視する", () => {
  assert.equal(resolveNow({ SERIES_NOW: "2026-11-07T01:15:00Z" }).getTime(), SLOT_UTC);
  const real = resolveNow({ SERIES_NOW: "2026-01-01T00:00:00Z", CF_PAGES: "1" });
  assert.ok(Math.abs(real.getTime() - Date.now()) < 5000);
  assert.throws(() => resolveNow({ SERIES_NOW: "bad" }), /SERIES_NOW/);
});

test("承認者の公開鍵：環境変数（PEM、改行は\\nでも可）から読み、無い・不正・Ed25519以外ならnull", () => {
  const pem = approver.publicKey.export({ type: "spki", format: "pem" });
  assert.ok(resolveApproverKey({ SERIES_APPROVER_PUBLIC_KEY: pem }));
  assert.ok(resolveApproverKey({ SERIES_APPROVER_PUBLIC_KEY: pem.replace(/\n/g, "\\n") }));
  assert.equal(resolveApproverKey({}), null);
  assert.equal(resolveApproverKey({ SERIES_APPROVER_PUBLIC_KEY: "bad" }), null);
  const rsa = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  assert.equal(resolveApproverKey({ SERIES_APPROVER_PUBLIC_KEY: rsa.publicKey.export({ type: "spki", format: "pem" }) }), null);
});

// ---------- 出力・第1弾への影響 ----------
test("出力：公開できる回だけが、ページ・過去回一覧に出る。0件なら既存の企画紹介ページと同一", () => {
  assert.equal(episodeListHtml([]), "");
  assert.equal(jitsuryokuPage(SITE), jitsuryokuPage(SITE, ""), "既存の出力は変わらない");
  const ep = approve(draft());
  const html = episodePage(ep, SITE);
  assert.match(html, /<link rel="canonical" href="https:\/\/takarazuka-today\.jp\/jitsuryoku\/ep2-sample">/);
  assert.doesNotMatch(html, /name="robots" content="noindex"/);
  assert.match(html, /第2回のテスト/);
  const list = episodeListHtml([ep]);
  assert.match(list, /これまでの連載/);
  assert.match(jitsuryokuPage(SITE, list), /href="\/jitsuryoku\/ep2-sample"/);
  assert.equal(episodeDate(ep), "2026-11-07");
});

test("既存の第1弾：公開判定の対象外で、ページの出力が変わらない", () => {
  const d = loadFeature(path.join(ROOT, "data", "jitsuryoku", "zeishu-shigoto.json"));
  assert.equal(d.status, "published");
  assert.equal(d.slug, "zeishu-shigoto");
  const html = jitsuryokuFeaturePage(d, SITE);
  assert.doesNotMatch(html, /name="robots" content="noindex"/);
  assert.equal(decideEpisode({ ...d, episode: 1 }, ctx(SEC)).reason, "invalid-episode", "第1弾の形式は連載の判定に通らない（混ざらない）");
  const sel = selectEpisodes([approve(draft({ slug: "zeishu-shigoto" }))], { ...ctx(SEC), reservedSlugs: [d.slug] });
  assert.equal(sel.publish.length, 0, "第1弾のslugは使えない");
});

test("ビルドの配線：sitemap・検索インデックス・ページ・一覧には、公開判定を通した回だけを渡す", () => {
  const build = fs.readFileSync(path.join(ROOT, "scripts", "build.js"), "utf-8");
  assert.match(build, /const seriesEpisodes = seriesSelection\.publish;/);
  assert.match(build, /if \(seriesSelection\.errors\.length > 0\) throw/);
  assert.equal((build.match(/loadEpisodes\(/g) ?? []).length, 1, "読み込みは1箇所だけ");
  assert.doesNotMatch(build, /seriesSelection\.excluded\.map\(\(x\) => .*(episodePage|writeFile)/);
});
