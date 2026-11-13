// 承認記録方式（v3）のテスト。第3回以降の公開が「運営者の端末操作なし」で安全に行えること、
// そして承認の偽装に準ずる操作・承認後の編集・公開済みの回が消える変更が止まることを確かめる。
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  contentHashOf, signApproval, decideEpisode, selectEpisodes, validateEpisodeShape, checkApprovalV3, isSaturdayDate, APPROVAL_V3, episodeDate,
} from "./series-episodes.js";
import { recordApprovalV3, publishV3, reviseV3, checkSeries, runVerifyLive } from "./series-approval.js";

const SAT = "2026-11-14"; // 土曜日
const NOW = new Date("2026-11-14T03:00:00Z"); // 2026-11-14 12:00 JST
const approver = crypto.generateKeyPairSync("ed25519");

function ep(over = {}) {
  return {
    slug: "ep3-sample", episode: 3, title: "第3回のテスト", description: "テスト用の回です。", status: "draft", plannedAt: SAT,
    content: { sections: [{ heading: "見出し", paragraphs: ["本文です。"] }], sources: [{ label: "出典", url: "https://example.go.jp/a" }] },
    ...over,
  };
}
const withApproval = (e, over = {}) => ({
  ...e,
  approval: { method: APPROVAL_V3, approvedBy: "運営者", approvedAt: "2026-11-14T10:00:00+09:00", contentHash: contentHashOf(e), evidence: "運営者がチャットで公開を承認（2026-11-14）", ...over },
});
const published = (over = {}, appr = {}) => { const e = ep(); return { ...withApproval(e, appr), status: "published", publishedAt: SAT, ...over }; };

// 第2回（署名方式・公開済み）の見本
const SLOT = "2026-11-07T10:15:00+09:00";
function signedEp2() {
  const e = { slug: "ep2-sample", episode: 2, title: "第2回", description: "d", status: "scheduled", scheduledAt: SLOT, content: { sections: [{ heading: "h", paragraphs: ["p"] }], sources: [{ label: "s", url: "https://example.go.jp/b" }] } };
  const approvedAt = "2026-11-06T18:00:00+09:00";
  const contentHash = contentHashOf(e);
  const signature = signApproval(approver.privateKey, { slug: e.slug, contentHash, scheduledAt: SLOT, approvedBy: "運営者", approvedAt });
  return { ...e, status: "published", publishedAt: "2026-11-07", approval: { approvedBy: "運営者", approvedAt, contentHash, scheduledAt: SLOT, signature } };
}

test("v3：有効な承認記録＋published＋土曜日なら、公開鍵なしで公開される", () => {
  const d = decideEpisode(published(), { now: NOW });
  assert.deepEqual([d.publish, d.reason], [true, "published"]);
});

test("v3：承認記録がない・draft のままなら公開しない（無承認公開の防止）", () => {
  assert.equal(decideEpisode(ep(), { now: NOW }).publish, false);
  const noApproval = { ...ep(), status: "published", publishedAt: SAT };
  const d = decideEpisode(noApproval, { now: NOW, approverPublicKey: approver.publicKey });
  assert.equal(d.publish, false);
  assert.equal(d.blocking, true, "published なのに承認がない場合はビルドを止める");
});

test("v3：承認のあとに本文を変えると公開しない（承認後の編集の防止）", () => {
  const e = published();
  e.content = { ...e.content, sections: [{ heading: "見出し", paragraphs: ["本文を1文字変えました。"] }] };
  const d = decideEpisode(e, { now: NOW });
  assert.deepEqual([d.publish, d.reason, d.blocking], [false, "published-but-content-changed-after-approval", true]);
});

test("v3：公開日・状態・予定日の変更は承認を無効にしない（制御項目）", () => {
  const e = withApproval(ep());
  assert.equal(contentHashOf({ ...e, plannedAt: "2026-11-21", status: "published", publishedAt: SAT }), e.approval.contentHash);
});

test("v3：承認記録の必須項目（承認者・承認日時・根拠・ハッシュ）が欠けると公開しない", () => {
  for (const bad of [{ approvedBy: "" }, { approvedAt: "2026-11-14 10:00" }, { evidence: "" }, { evidence: undefined }, { contentHash: "abc" }]) {
    const d = decideEpisode(published({}, bad), { now: NOW });
    assert.equal(d.publish, false, JSON.stringify(bad));
    assert.equal(d.blocking, true, JSON.stringify(bad));
  }
});

test("v3：第2回は署名方式のまま。v3の記録に差し替えて降格することはできない", () => {
  const e2 = signedEp2();
  assert.equal(decideEpisode(e2, { now: NOW, approverPublicKey: approver.publicKey }).publish, true, "署名済みの第2回は公開される");
  const downgraded = { ...e2, approval: { method: APPROVAL_V3, approvedBy: "x", approvedAt: "2026-11-14T10:00:00+09:00", contentHash: contentHashOf(e2), evidence: "偽の記録のつもり" } };
  const d = decideEpisode(downgraded, { now: NOW, approverPublicKey: approver.publicKey });
  assert.deepEqual([d.publish, d.reason, d.blocking], [false, "published-but-v3-not-allowed-for-this-episode", true]);
  assert.equal(checkApprovalV3(downgraded).ok, false);
});

test("v3：署名つきの記録をv3として扱わない／scheduled はv3で公開しない", () => {
  assert.equal(checkApprovalV3(published({}, { signature: "AAAA" })).reason, "v3-with-signature");
  const sched = { ...withApproval(ep()), status: "scheduled", scheduledAt: "2026-11-14T10:15:00+09:00" };
  assert.deepEqual([decideEpisode(sched, { now: NOW }).publish, decideEpisode(sched, { now: NOW }).reason], [false, "v3-requires-published"]);
});

test("v3：公開日は土曜日だけ。未来の日付はその日まで出さず、承認日時が未来なら止める", () => {
  assert.equal(isSaturdayDate("2026-11-14"), true);
  for (const bad of ["2026-11-13", "2026-11-15", "2026-02-30", "2026-11-1", "", null]) assert.equal(isSaturdayDate(bad), false, String(bad));
  const notSat = decideEpisode(published({ publishedAt: "2026-11-13" }), { now: NOW });
  assert.deepEqual([notSat.publish, notSat.reason, notSat.blocking], [false, "published-but-not-saturday", true]);
  const future = decideEpisode(published({ publishedAt: "2026-11-21" }), { now: NOW });
  assert.deepEqual([future.publish, future.reason, future.blocking], [false, "before-publication-date", undefined]);
  const futureApproval = decideEpisode(published({}, { approvedAt: "2026-11-15T10:00:00+09:00" }), { now: NOW });
  assert.deepEqual([futureApproval.publish, futureApproval.blocking], [false, true]);
  // 時刻は固定しない：公開日（JST）の 0:00 以降ならいつでも公開される
  assert.equal(decideEpisode(published({}, { approvedAt: "2026-11-13T23:00:00+09:00" }), { now: new Date("2026-11-13T15:00:00Z") }).publish, true, "11/14 0:00 JST");
  assert.equal(decideEpisode(published(), { now: new Date("2026-11-13T14:59:00Z") }).publish, false, "11/13 23:59 JST はまだ");
});

test("v3：第2回（署名）と第3回（記録）が一緒に公開され、第3回の不備は第2回の公開を巻き込まない判定になる", () => {
  const ok = selectEpisodes([signedEp2(), published()], { now: NOW, approverPublicKey: approver.publicKey });
  assert.deepEqual(ok.publish.map((e) => e.episode), [2, 3]);
  assert.equal(ok.errors.length, 0);
  const broken = selectEpisodes([signedEp2(), published({}, { contentHash: "0".repeat(64) })], { now: NOW, approverPublicKey: approver.publicKey });
  assert.deepEqual(broken.publish.map((e) => e.episode), [2]);
  assert.equal(broken.errors.length, 1, "第3回の不整合はビルドを止める（errors）");
});

test("検査：公開済みの回が消える変更を止める（第3回が公開されるのに第2回が欠ける）", () => {
  const ep2 = signedEp2();
  const ok = checkSeries([ep2, published()], { now: NOW, approverPublicKey: approver.publicKey, strict: true });
  assert.deepEqual(ok.errors, []);
  const lost = checkSeries([published()], { now: NOW, approverPublicKey: approver.publicKey, deploy: true });
  assert.ok(lost.errors.some((e) => e.includes("第2回が公開されません")), lost.errors.join("|"));
  const unpublishedEp2 = checkSeries([{ ...ep2, status: "draft" }, published()], { now: NOW, approverPublicKey: approver.publicKey, deploy: true });
  assert.ok(unpublishedEp2.errors.some((e) => e.includes("第2回が公開されません")));
});

test("検査：draft の第3回は strict でも deploy でも問題にならず、非公開のまま", () => {
  const draftEp = withApproval(ep());
  for (const mode of [{ strict: true }, { deploy: true }, {}]) {
    const r = checkSeries([signedEp2(), draftEp], { now: NOW, approverPublicKey: approver.publicKey, ...mode });
    assert.deepEqual(r.errors, [], JSON.stringify(mode));
    assert.deepEqual(r.published, ["ep2-sample"]);
  }
});

test("検査：公開日の前日までは strict でも失敗にならず、出力されない", () => {
  const r = checkSeries([signedEp2(), published({ publishedAt: "2026-11-21" })], { now: NOW, approverPublicKey: approver.publicKey, strict: true });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.published, ["ep2-sample"]);
});

test("episodeDate：公開前の draft は plannedAt を表示日にする", () => {
  assert.equal(episodeDate(ep()), SAT);
  assert.equal(episodeDate(published()), SAT);
});

// ---------- 操作（record-approval / publish） ----------
function tmpDir(e) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "series-v3-"));
  fs.writeFileSync(path.join(dir, `${e.slug}.json`), `${JSON.stringify(e, null, 2)}\n`);
  return dir;
}
const read = (dir, slug = "ep3-sample") => JSON.parse(fs.readFileSync(path.join(dir, `${slug}.json`), "utf8"));

test("操作：record-approval → publish で、第3回が公開できる状態になる", () => {
  const dir = tmpDir(ep());
  try {
    const r = recordApprovalV3({ slug: "ep3-sample", approvedBy: "宝塚Today運営者", evidence: "運営者のチャット承認（2026-11-14）", dir, now: NOW });
    assert.equal(read(dir).status, "draft", "承認記録だけでは公開されない");
    assert.equal(read(dir).approval.contentHash, contentHashOf(ep()));
    assert.equal(r.approval.approvedAt, "2026-11-14T12:00:00+09:00");
    assert.equal(decideEpisode(read(dir), { now: NOW }).publish, false);
    const p = publishV3({ slug: "ep3-sample", dir, now: NOW });
    assert.equal(p.publishedAt, SAT);
    const after = read(dir);
    assert.deepEqual([after.status, after.publishedAt, "plannedAt" in after], ["published", SAT, false]);
    assert.equal(decideEpisode(after, { now: NOW }).publish, true);
    assert.equal(contentHashOf(after), contentHashOf(ep()), "公開しても本文のハッシュは変わらない");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("操作：承認記録なし・根拠なし・第2回・公開済みは拒否され、ファイルは変わらない", () => {
  const dir = tmpDir(ep());
  const before = fs.readFileSync(path.join(dir, "ep3-sample.json"), "utf8");
  try {
    assert.throws(() => publishV3({ slug: "ep3-sample", dir, now: NOW }), /承認記録/);
    assert.throws(() => recordApprovalV3({ slug: "ep3-sample", approvedBy: "運営者", evidence: "短い", dir, now: NOW }), /根拠/);
    assert.throws(() => recordApprovalV3({ slug: "ep3-sample", approvedBy: "", evidence: "運営者がチャットで承認", dir, now: NOW }), /承認者/);
    assert.equal(fs.readFileSync(path.join(dir, "ep3-sample.json"), "utf8"), before);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  const dir2 = tmpDir({ ...ep(), slug: "ep2-x", episode: 2 });
  try { assert.throws(() => recordApprovalV3({ slug: "ep2-x", approvedBy: "運営者", evidence: "運営者がチャットで承認", dir: dir2, now: NOW }), /第3回より前/); } finally { fs.rmSync(dir2, { recursive: true, force: true }); }
  const dir3 = tmpDir(published());
  try {
    assert.throws(() => recordApprovalV3({ slug: "ep3-sample", approvedBy: "運営者", evidence: "運営者がチャットで承認", dir: dir3, now: NOW }), /draft/);
    assert.throws(() => publishV3({ slug: "ep3-sample", dir: dir3, now: NOW }), /すでに published/);
  } finally { fs.rmSync(dir3, { recursive: true, force: true }); }
});

test("操作：承認後に原稿を変えた場合・土曜日以外・未来の日付では publish できない", () => {
  const dir = tmpDir(ep());
  try {
    recordApprovalV3({ slug: "ep3-sample", approvedBy: "運営者", evidence: "運営者がチャットで承認", dir, now: NOW });
    assert.throws(() => publishV3({ slug: "ep3-sample", publishedAt: "2026-11-13", dir, now: NOW }), /土曜日/);
    assert.throws(() => publishV3({ slug: "ep3-sample", publishedAt: "2026-11-21", dir, now: NOW }), /未来/);
    const e = read(dir);
    e.content.sections[0].paragraphs[0] = "承認後に書き換えた本文";
    fs.writeFileSync(path.join(dir, "ep3-sample.json"), JSON.stringify(e));
    assert.throws(() => publishV3({ slug: "ep3-sample", dir, now: NOW }), /再承認/);
    assert.equal(read(dir).status, "draft");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("操作：土曜日以外の日に publish を試すと、日付を指定しなくても拒否される", () => {
  const dir = tmpDir(ep());
  try {
    recordApprovalV3({ slug: "ep3-sample", approvedBy: "運営者", evidence: "運営者がチャットで承認", dir, now: NOW });
    assert.throws(() => publishV3({ slug: "ep3-sample", dir, now: new Date("2026-11-16T03:00:00Z") }), /土曜日/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("検証：verify は本番の内容ハッシュが承認した原稿と一致するときだけ成功する", async () => {
  const e = published();
  const dir = tmpDir(e);
  const hash = contentHashOf(e);
  const page = (h) => `<link rel="canonical" href="https://takarazuka-today.jp/jitsuryoku/ep3-sample"><meta name="series-content-hash" content="${h}">`;
  const res = (body, ok = true) => async () => ({ ok, status: ok ? 200 : 404, text: async () => body });
  const lines = [];
  try {
    assert.equal(await runVerifyLive({ dir, slug: "ep3-sample", siteUrl: "https://takarazuka-today.jp", fetchFn: res(page(hash)), out: (l) => lines.push(l), err: (l) => lines.push(l) }), 0);
    assert.equal(await runVerifyLive({ dir, slug: "ep3-sample", siteUrl: "https://takarazuka-today.jp", fetchFn: res(page("f".repeat(64))), out: (l) => lines.push(l), err: (l) => lines.push(l) }), 1, "古い版");
    assert.equal(await runVerifyLive({ dir, slug: "ep3-sample", siteUrl: "https://takarazuka-today.jp", fetchFn: res("", false), out: (l) => lines.push(l), err: (l) => lines.push(l) }), 1, "404");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("形式：v3の第3回の published には publishedAt が必要", () => {
  assert.ok(validateEpisodeShape({ ...published(), publishedAt: undefined }).some((m) => m.includes("publishedAt")));
  assert.deepEqual(validateEpisodeShape(published()), []);
});

// ---------- 公開済みの回の改訂（revise） ----------
const REAPPROVAL = "運営者が2026-11-14のチャットで、改訂版の公開を再承認";
function revFile(over = {}, dir = null) {
  const e = ep();
  const rev = { ...e, content: { ...e.content, sections: [{ heading: "見出し", paragraphs: ["改訂した本文です。"] }] }, status: "draft", plannedAt: "2026-11-21", ...over };
  const d = dir ?? fs.mkdtempSync(path.join(os.tmpdir(), "series-rev-src-"));
  const f = path.join(d, "rev.json");
  fs.writeFileSync(f, JSON.stringify(rev));
  return { f, d };
}
const reviseArgs = (dir, f, over = {}) => ({ slug: "ep3-sample", fromFile: f, approvedBy: "宝塚Today運営者", evidence: REAPPROVAL, operatorReapproval: true, dir, now: new Date("2026-11-15T03:00:00Z"), ...over });

test("改訂：運営者の再承認のもとで、本文だけが差し替わる。公開状態・公開日は変わらず、旧版の承認が supersedes に残る", () => {
  const dir = tmpDir(published());
  const src = revFile();
  try {
    const before = read(dir);
    const r = reviseV3(reviseArgs(dir, src.f));
    const after = read(dir);
    assert.equal(r.written, true);
    assert.equal(r.from, before.approval.contentHash);
    assert.notEqual(r.to, r.from);
    assert.deepEqual([after.status, after.publishedAt, "plannedAt" in after], ["published", SAT, false], "公開状態・公開日は最初のまま");
    assert.equal(after.content.sections[0].paragraphs[0], "改訂した本文です。");
    assert.equal(after.approval.contentHash, contentHashOf(after));
    assert.equal(after.approval.approvedAt, "2026-11-15T12:00:00+09:00");
    assert.equal(after.approval.evidence, REAPPROVAL);
    assert.deepEqual(after.approval.supersedes, { contentHash: before.approval.contentHash, approvedAt: before.approval.approvedAt, evidence: before.approval.evidence });
    assert.equal(decideEpisode(after, { now: new Date("2026-11-15T03:00:00Z") }).publish, true);
    assert.deepEqual(checkSeries([signedEp2(), after], { now: new Date("2026-11-15T03:00:00Z"), approverPublicKey: approver.publicKey, strict: true }).errors, []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(src.d, { recursive: true, force: true }); }
});

test("改訂：--check（dryRun）は書き込まず、差し替えできるかと新しいハッシュだけを返す", () => {
  const dir = tmpDir(published());
  const src = revFile();
  const before = fs.readFileSync(path.join(dir, "ep3-sample.json"), "utf8");
  try {
    const r = reviseV3(reviseArgs(dir, src.f, { dryRun: true }));
    assert.equal(r.written, false);
    assert.equal(fs.readFileSync(path.join(dir, "ep3-sample.json"), "utf8"), before);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(src.d, { recursive: true, force: true }); }
});

test("改訂：再承認の宣言・承認者・今回の根拠がなければ拒否する（承認の偽装・流用の防止）。拒否のときファイルは変わらない", () => {
  const dir = tmpDir(published());
  const src = revFile();
  const before = fs.readFileSync(path.join(dir, "ep3-sample.json"), "utf8");
  try {
    assert.throws(() => reviseV3(reviseArgs(dir, src.f, { operatorReapproval: false })), /--operator-reapproval/);
    assert.throws(() => reviseV3(reviseArgs(dir, src.f, { operatorReapproval: undefined })), /--operator-reapproval/);
    assert.throws(() => reviseV3(reviseArgs(dir, src.f, { approvedBy: "" })), /承認者名/);
    assert.throws(() => reviseV3(reviseArgs(dir, src.f, { evidence: "短い" })), /根拠/);
    assert.throws(() => reviseV3(reviseArgs(dir, src.f, { evidence: undefined })), /根拠/);
    assert.throws(() => reviseV3(reviseArgs(dir, src.f, { evidence: "運営者がチャットで公開を承認（2026-11-14）" })), /前回の承認と同じ/);
    assert.throws(() => reviseV3(reviseArgs(dir, undefined)), /--from/);
    assert.equal(fs.readFileSync(path.join(dir, "ep3-sample.json"), "utf8"), before);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(src.d, { recursive: true, force: true }); }
});

test("改訂：対象は承認記録方式の公開済みの回だけ（draft・第2回の署名方式・公開状態が壊れた回は拒否）", () => {
  const src = revFile();
  const cases = [
    [tmpDir(withApproval(ep())), /published の回だけ/],
    [tmpDir({ ...signedEp2(), slug: "ep3-sample" }), /署名方式の回/],
    [tmpDir(published({}, { contentHash: "0".repeat(64) })), /有効ではない/],
  ];
  try {
    for (const [dir, re] of cases) {
      try { assert.throws(() => reviseV3(reviseArgs(dir, src.f)), re); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
    const dir2 = tmpDir({ ...signedEp2(), slug: "ep2-sample" });
    try { assert.throws(() => reviseV3({ ...reviseArgs(dir2, src.f), slug: "ep2-sample" }), /署名方式の回/); } finally { fs.rmSync(dir2, { recursive: true, force: true }); }
  } finally { fs.rmSync(src.d, { recursive: true, force: true }); }
});

test("改訂：原稿ファイルの不備は拒否する（承認の同梱・本文が同じ・slugや回が違う・形式の誤り）", () => {
  const dir = tmpDir(published());
  const before = fs.readFileSync(path.join(dir, "ep3-sample.json"), "utf8");
  const dirs = [];
  const mk = (over) => { const r = revFile(over); dirs.push(r.d); return r.f; };
  try {
    assert.throws(() => reviseV3(reviseArgs(dir, mk({ approval: { method: APPROVAL_V3, approvedBy: "x", approvedAt: "2026-11-15T10:00:00+09:00", contentHash: "a".repeat(64), evidence: "偽の承認のつもり" } }))), /承認（approval）を含める/);
    assert.throws(() => reviseV3(reviseArgs(dir, mk({ content: ep().content }))), /同じ/);
    assert.throws(() => reviseV3(reviseArgs(dir, mk({ slug: "other-slug" }))), /一致しません/);
    assert.throws(() => reviseV3(reviseArgs(dir, mk({ episode: 4 }))), /一致しません/);
    assert.throws(() => reviseV3(reviseArgs(dir, mk({ content: { sections: [], sources: [] } }))), /形式/);
    assert.throws(() => reviseV3(reviseArgs(dir, path.join(os.tmpdir(), "no-such-file.json"))), /読めません/);
    assert.equal(fs.readFileSync(path.join(dir, "ep3-sample.json"), "utf8"), before);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); }
});

test("改訂：原稿ファイルの status・公開日・予定日は取り込まない（公開状態を原稿から変えられない）", () => {
  const dir = tmpDir(published());
  const src = revFile({ status: "draft", publishedAt: "2030-01-05", plannedAt: "2031-01-01", hold: true });
  try {
    reviseV3(reviseArgs(dir, src.f));
    const after = read(dir);
    assert.deepEqual([after.status, after.publishedAt, after.hold, "plannedAt" in after], ["published", SAT, undefined, false]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(src.d, { recursive: true, force: true }); }
});

test("改訂：公開済みの原稿を直接編集しただけでは公開されない（revise を通らない変更は止まる）", () => {
  const e = published();
  const edited = { ...e, content: { ...e.content, sections: [{ heading: "見出し", paragraphs: ["直接書き換えた本文"] }] } };
  const d = decideEpisode(edited, { now: new Date("2026-11-15T03:00:00Z") });
  assert.deepEqual([d.publish, d.reason, d.blocking], [false, "published-but-content-changed-after-approval", true]);
});
