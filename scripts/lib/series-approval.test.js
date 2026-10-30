import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  contentHashOf, decideEpisode, selectEpisodes, loadEpisodes, resolveApproverKey, asKeyRing, publicKeyFingerprint, signApproval,
} from "./series-episodes.js";
import {
  formatJst, isInsideRepo, loadPrivateKey, generateKeyPair, runApprove, prepareApproval, planFinalize, applyFinalize, checkSeries, verifyLive,
} from "./series-approval.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TOOL = path.join(ROOT, "scripts", "series-tool.js");
const SLOT = "2026-11-07T10:15:00+09:00";
const SLOT2 = "2026-11-14T10:15:00+09:00";
const SLOT_UTC = Date.parse("2026-11-07T01:15:00Z");
const SLOT2_UTC = Date.parse("2026-11-14T01:15:00Z");
const SEC = 1000;
const DAY = 24 * 3600 * SEC;
const BEFORE = new Date("2026-11-06T09:00:00Z"); // 11/6 18:00 JST（承認する日）
const at = (ms, base = SLOT_UTC) => new Date(base + ms);

const tmps = [];
function tmpDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "series-"));
  tmps.push(d);
  return fs.realpathSync.native(d);
}
test.after(() => { for (const d of tmps) fs.rmSync(d, { recursive: true, force: true }); });

function newKey() {
  const kp = crypto.generateKeyPairSync("ed25519");
  return { ...kp, fingerprint: publicKeyFingerprint(kp.publicKey), pem: kp.publicKey.export({ type: "spki", format: "pem" }) };
}
function writeKeyFile(dir, kp, name = "approver.pem") {
  const file = path.join(dir, name);
  fs.writeFileSync(file, kp.privateKey.export({ type: "pkcs8", format: "pem" }));
  return file;
}
function draft(over = {}) {
  return {
    slug: "ep2-sample", episode: 2, title: "第2回のテスト", description: "テスト用の回です。", status: "scheduled", scheduledAt: SLOT,
    content: { sections: [{ heading: "見出し", paragraphs: ["本文です。"] }], sources: [{ label: "出典", url: "https://example.go.jp/a" }] },
    ...over,
  };
}
// 作業用の「リポジトリ」と、その外の鍵置き場を用意する
function setup(ep = draft(), kp = newKey()) {
  const repo = tmpDir();
  const dir = path.join(repo, "data", "jitsuryoku", "episodes");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${ep.slug}.json`);
  fs.writeFileSync(file, `${JSON.stringify(ep, null, 2)}\n`);
  const keyDir = tmpDir();
  const keyFile = writeKeyFile(keyDir, kp);
  return { repo, dir, file, keyFile, kp };
}
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf-8"));
async function approveVia(s, { slug = "ep2-sample", answer = slug, now = BEFORE, ring = null, by = "運営者", interactive = true } = {}) {
  const lines = [];
  let asked = 0;
  const run = () => runApprove({ slug, approvedBy: by, dir: s.dir, repoRoot: s.repo, keyFile: s.keyFile, ring, now, interactive, ask: async () => { asked++; return answer; }, out: (l) => lines.push(l) });
  return { run, lines, asked: () => asked };
}

// ---------- 秘密鍵 ----------
test("鍵：秘密鍵はリポジトリの外のファイルにだけ保存し、画面に出る値には公開鍵と指紋だけが含まれる。既存ファイルは上書きしない", () => {
  const repo = tmpDir();
  const keyDir = tmpDir();
  const out = path.join(keyDir, "new.pem");
  const r = generateKeyPair(out, repo);
  const privatePem = fs.readFileSync(out, "utf-8");
  assert.match(privatePem, /BEGIN PRIVATE KEY/);
  const shown = JSON.stringify(r);
  assert.ok(!shown.includes("PRIVATE") && !shown.includes(privatePem.split("\n")[1]), "戻り値に秘密鍵を含めない");
  assert.match(r.publicKeyPem, /BEGIN PUBLIC KEY/);
  assert.equal(r.fingerprint, publicKeyFingerprint(crypto.createPublicKey(privatePem)));
  assert.throws(() => generateKeyPair(out, repo), /EEXIST|already exists/, "上書きしない");
  assert.throws(() => generateKeyPair(path.join(repo, "in-repo.pem"), repo), /リポジトリの中/);
  assert.ok(!fs.existsSync(path.join(repo, "in-repo.pem")));
});

test("鍵：リポジトリの中の鍵ファイル・Ed25519以外・壊れた鍵・存在しない鍵は読まない（エラーに鍵の内容を含めない）", () => {
  const repo = tmpDir();
  const outside = tmpDir();
  const kp = newKey();
  const inside = writeKeyFile(repo, kp, "k.pem");
  assert.equal(isInsideRepo(inside, repo), true);
  assert.equal(isInsideRepo(path.join(repo, "not-yet.pem"), repo), true, "まだ無いファイルも親で判定");
  assert.throws(() => loadPrivateKey(inside, repo), /リポジトリの中/);
  const ok = writeKeyFile(outside, kp);
  assert.equal(isInsideRepo(ok, repo), false);
  assert.equal(loadPrivateKey(ok, repo).asymmetricKeyType, "ed25519");
  const rsa = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const rsaFile = path.join(outside, "rsa.pem");
  fs.writeFileSync(rsaFile, rsa.privateKey.export({ type: "pkcs8", format: "pem" }));
  assert.throws(() => loadPrivateKey(rsaFile, repo), /Ed25519/);
  const bad = path.join(outside, "bad.pem");
  fs.writeFileSync(bad, "-----BEGIN PRIVATE KEY-----\nSECRETSECRET\n-----END PRIVATE KEY-----\n");
  assert.throws(() => loadPrivateKey(bad, repo), (e) => !String(e.message).includes("SECRETSECRET"));
  assert.throws(() => loadPrivateKey(path.join(outside, "none.pem"), repo), /見つかりません/);
  assert.throws(() => loadPrivateKey("", repo), /指定されていません/);
});

// ---------- 承認 ----------
test("承認：内容を表示し、slugを入力したときだけ署名を書き込む。書き込んだ回は予約日時に公開され、1秒前は公開されない", async () => {
  const s = setup();
  const ring = [s.kp.publicKey];
  const a = await approveVia(s, { ring });
  const res = await a.run();
  assert.equal(res.approved, true);
  const text = a.lines.join("\n");
  for (const must of ["ep2-sample", "第2回のテスト", SLOT, "土曜日", contentHashOf(draft()), s.kp.fingerprint, "初回の承認"]) assert.ok(text.includes(must), must);
  const privateBody = fs.readFileSync(s.keyFile, "utf-8").split("\n")[1];
  assert.ok(!text.includes(privateBody) && !text.includes("PRIVATE"), "秘密鍵を表示しない");
  const ep = readJson(s.file);
  assert.equal(ep.approval.approvedAt, "2026-11-06T18:00:00+09:00");
  assert.equal(ep.approval.approvedBy, "運営者");
  assert.equal(ep.approval.scheduledAt, SLOT);
  assert.ok(!JSON.stringify(ep).includes(privateBody), "ファイルにも秘密鍵を書かない");
  assert.equal(decideEpisode(ep, { now: at(-SEC), approverPublicKey: s.kp.publicKey }).publish, false);
  assert.equal(decideEpisode(ep, { now: at(0), approverPublicKey: s.kp.publicKey }).publish, true);
});

test("承認：slugが一致しない入力・空入力では何も書き込まない（ファイルはバイト単位で不変）", async () => {
  const s = setup();
  const before = fs.readFileSync(s.file);
  for (const answer of ["", "y", "yes", "ep2-sampl", "EP2-SAMPLE", "ep2-sample extra"]) {
    const a = await approveVia(s, { answer });
    const res = await a.run();
    assert.equal(res.approved, false, answer);
  }
  assert.deepEqual(fs.readFileSync(s.file), before);
});

test("承認：対話できない環境（CI・パイプ）では承認できない。質問も出さず、書き込まない", async () => {
  const s = setup();
  const before = fs.readFileSync(s.file);
  const a = await approveVia(s, { interactive: false });
  await assert.rejects(a.run(), /人が端末で操作/);
  assert.equal(a.asked(), 0);
  assert.deepEqual(fs.readFileSync(s.file), before);
  // 実際のコマンドでも、標準入力が端末でなければ拒否する
  const r = spawnSync(process.execPath, [TOOL, "approve", "ep2-sample", "--by", "運営者"], { input: "ep2-sample\n", encoding: "utf-8", env: { ...process.env, SERIES_APPROVER_KEY_FILE: s.keyFile } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /人が端末で操作/);
  assert.ok(!fs.existsSync(path.join(ROOT, "data", "jitsuryoku", "episodes", "ep2-sample.json")));
});

test("承認：承認できない状態は拒否する（draft・予約日時を過ぎている・枠でない・形式の誤り・承認者名なし・信頼されない鍵）", async () => {
  const cases = [
    [draft({ status: "draft" }), {}, /draft は承認できません/],
    [draft(), { now: at(SEC) }, /予約日時を過ぎています/],
    [draft({ scheduledAt: "2026-11-08T10:15:00+09:00" }), {}, /枠/],
    [draft({ scheduledAt: undefined }), {}, /枠|形式/],
    [draft({ title: "" }), {}, /形式/],
    [draft(), { by: "  " }, /承認者名/],
    [draft(), { ring: [newKey().publicKey] }, /信頼する公開鍵/],
  ];
  for (const [ep, opts, re] of cases) {
    const s = setup(ep);
    const before = fs.readFileSync(s.file);
    const a = await approveVia(s, opts);
    await assert.rejects(a.run(), re);
    assert.equal(a.asked(), 0, "拒否の前に質問しない");
    assert.deepEqual(fs.readFileSync(s.file), before);
  }
  const s = setup();
  assert.equal((await (await approveVia(s, { ring: [s.kp.publicKey] })).run()).approved, true, "信頼される鍵なら通る");
});

test("再承認：原稿の変更・予約日時の変更は承認が崩れ、承認し直すと公開できる。種類は画面に明示される", async () => {
  const s = setup();
  const approverPublicKey = [s.kp.publicKey];
  await (await approveVia(s)).run();
  const approved = readJson(s.file);
  assert.equal(decideEpisode(approved, { now: at(SEC), approverPublicKey }).publish, true);

  // 原稿を変える → 公開されない → 再承認で公開
  const edited = { ...approved, content: { ...approved.content, sections: [{ heading: "見出し", paragraphs: ["本文を直しました。"] }] } };
  fs.writeFileSync(s.file, JSON.stringify(edited));
  assert.equal(decideEpisode(edited, { now: at(SEC), approverPublicKey }).reason, "content-changed-after-approval");
  const a1 = await approveVia(s);
  await a1.run();
  assert.ok(a1.lines.join("\n").includes("再承認（原稿が承認後に変更されています）"));
  assert.equal(decideEpisode(readJson(s.file), { now: at(SEC), approverPublicKey }).publish, true);

  // 予約日時を変える → 公開されない → 再承認で、新しい日時に公開
  fs.writeFileSync(s.file, JSON.stringify({ ...readJson(s.file), scheduledAt: SLOT2 }));
  assert.equal(decideEpisode(readJson(s.file), { now: at(0, SLOT2_UTC), approverPublicKey }).reason, "schedule-changed-after-approval");
  const a2 = await approveVia(s);
  await a2.run();
  assert.ok(a2.lines.join("\n").includes("再承認（予約日時が承認後に変更されています）"));
  const re = readJson(s.file);
  assert.equal(decideEpisode(re, { now: at(-SEC, SLOT2_UTC), approverPublicKey }).publish, false);
  assert.equal(decideEpisode(re, { now: at(0, SLOT2_UTC), approverPublicKey }).publish, true);
});

test("formatJst：JSTの文字列で返し、秒未満は切り捨てる", () => {
  assert.equal(formatJst(new Date("2026-11-06T09:00:00.999Z")), "2026-11-06T18:00:00+09:00");
  assert.equal(formatJst(new Date("2026-12-31T15:00:00Z")), "2027-01-01T00:00:00+09:00");
});

// ---------- 公開の確定 ----------
function approvedEpisode(kp, over = {}, approvedAt = "2026-11-06T18:00:00+09:00") {
  const ep = draft(over);
  const contentHash = contentHashOf(ep);
  return { ...ep, approval: { approvedBy: "運営者", approvedAt, contentHash, scheduledAt: ep.scheduledAt, signature: signApproval(kp.privateKey, { slug: ep.slug, contentHash, scheduledAt: ep.scheduledAt, approvedBy: "運営者", approvedAt }) } };
}
function writeAll(dir, eps) { for (const e of eps) fs.writeFileSync(path.join(dir, `${e.slug}.json`), `${JSON.stringify(e, null, 2)}\n`); }

test("確定：公開された scheduled だけが対象。予定前・保留・未承認・draft・公開済みは対象外", () => {
  const kp = newKey();
  const eps = [
    approvedEpisode(kp, { slug: "ep2-due", episode: 2 }),
    approvedEpisode(kp, { slug: "ep3-hold", episode: 3, hold: true }),
    approvedEpisode(kp, { slug: "ep4-future", episode: 4, scheduledAt: SLOT2 }),
    draft({ slug: "ep5-unapproved", episode: 5 }),
    draft({ slug: "ep6-draft", episode: 6, status: "draft" }),
    approvedEpisode(kp, { slug: "ep7-pub", episode: 7, status: "published", publishedAt: "2026-11-07" }),
  ];
  const ctx = { now: at(SEC), approverPublicKey: [kp.publicKey] };
  assert.deepEqual(planFinalize(eps, ctx).targets, [{ slug: "ep2-due", publishedAt: "2026-11-07" }]);
  assert.deepEqual(planFinalize(eps, { ...ctx, now: at(-SEC) }).targets, [], "予定の1秒前は対象なし");
  const inconsistent = [...eps, { ...eps[0] }];
  const bad = planFinalize(inconsistent, ctx);
  assert.equal(bad.ok, false, "状態に矛盾があるときは何も確定しない");
  assert.deepEqual(bad.targets, []);
});

test("確定：published にしても署名は変わらず有効。以後は hold を付けても、3か月後に再ビルドしても公開が維持される。再実行しても変わらない", () => {
  const kp = newKey();
  const s = setup(approvedEpisode(kp), kp);
  const ctx = { now: at(SEC), approverPublicKey: [kp.publicKey] };
  const plan = planFinalize(loadEpisodes(s.dir), ctx);
  assert.deepEqual(applyFinalize(s.dir, plan.targets, ctx), ["ep2-sample"]);
  const ep = readJson(s.file);
  assert.equal(ep.status, "published");
  assert.equal(ep.publishedAt, "2026-11-07");
  assert.equal(ep.approval.signature, approvedEpisode(kp).approval.signature, "署名は不変");
  assert.equal(contentHashOf(ep), ep.approval.contentHash);
  for (const ms of [0, DAY, 90 * DAY]) {
    assert.equal(decideEpisode({ ...ep, hold: true }, { now: at(ms), approverPublicKey: [kp.publicKey] }).publish, true, `hold付き +${ms}ms`);
  }
  // 再実行：対象がなく、ファイルも変わらない
  const bytes = fs.readFileSync(s.file);
  assert.deepEqual(planFinalize(loadEpisodes(s.dir), ctx).targets, []);
  assert.deepEqual(applyFinalize(s.dir, plan.targets, ctx), [], "古い計画を再実行しても何もしない");
  assert.deepEqual(fs.readFileSync(s.file), bytes);
  // 確定前に付いた hold は尊重される（確定の対象にならず、公開もされない）
  const held = { ...approvedEpisode(kp, { slug: "ep3-held", episode: 3, hold: true }) };
  assert.equal(decideEpisode(held, ctx).publish, false);
});

test("確定：途中で失敗しても状態が壊れない（書く前に公開されることを確認し、一時ファイルを残さず、再実行で続きから完了する）", () => {
  const kp = newKey();
  const s = setup(approvedEpisode(kp, { slug: "ep2-a", episode: 2 }), kp);
  writeAll(s.dir, [approvedEpisode(kp, { slug: "ep3-b", episode: 3 })]);
  const ctx = { now: at(SEC), approverPublicKey: [kp.publicKey] };
  const plan = planFinalize(loadEpisodes(s.dir), ctx);
  assert.equal(plan.targets.length, 2);

  // 鍵が違う（確定すると公開されなくなる）→ 書かずに中止
  const before = fs.readdirSync(s.dir).map((f) => [f, fs.readFileSync(path.join(s.dir, f), "utf-8")]);
  assert.throws(() => applyFinalize(s.dir, plan.targets, { ...ctx, approverPublicKey: [newKey().publicKey] }), /公開されなくなる/);
  assert.deepEqual(fs.readdirSync(s.dir).map((f) => [f, fs.readFileSync(path.join(s.dir, f), "utf-8")]), before);

  // 2件目のファイルが無い → 1件目だけ確定、2件目でエラー。一時ファイルは残らない
  const second = path.join(s.dir, "ep3-b.json");
  const secondBytes = fs.readFileSync(second);
  fs.rmSync(second);
  assert.throws(() => applyFinalize(s.dir, plan.targets, ctx), /見つかりません/);
  assert.equal(readJson(path.join(s.dir, "ep2-a.json")).status, "published");
  assert.deepEqual(fs.readdirSync(s.dir).filter((f) => !f.endsWith(".json")), [], "一時ファイルが残らない");

  // 復旧して再実行 → 残りだけが確定し、1件目は変わらない
  fs.writeFileSync(second, secondBytes);
  const again = planFinalize(loadEpisodes(s.dir), ctx);
  assert.deepEqual(again.targets.map((t) => t.slug), ["ep3-b"]);
  assert.deepEqual(applyFinalize(s.dir, again.targets, ctx), ["ep3-b"]);
  const sel = selectEpisodes(loadEpisodes(s.dir), ctx);
  assert.deepEqual(sel.publish.map((e) => [e.slug, e.status]), [["ep2-a", "published"], ["ep3-b", "published"]]);
  assert.deepEqual(sel.errors, []);
});

// ---------- 検査 ----------
test("検査（CI）：strict では、公開状態の回が検証できない・公開鍵がない・公開済みの承認が崩れている場合に失敗する", () => {
  const kp = newKey();
  const ctx = (extra = {}) => ({ now: at(-DAY), approverPublicKey: [kp.publicKey], strict: true, ...extra });
  const good = [approvedEpisode(kp), draft({ slug: "ep3-d", episode: 3, status: "draft" })];
  assert.deepEqual(checkSeries(good, ctx()).errors, []);
  assert.deepEqual(checkSeries([], { now: at(0), approverPublicKey: null, strict: true }).errors, [], "回が無ければ公開鍵が無くても成功");
  assert.deepEqual(checkSeries([draft({ status: "draft" })], { now: at(0), approverPublicKey: null, strict: true }).errors, [], "draftだけなら公開鍵は不要");

  const unapproved = checkSeries([draft()], ctx());
  assert.ok(unapproved.errors.some((e) => e.includes("not-approved")), "新規予約が未承認");
  assert.deepEqual(checkSeries([draft()], ctx({ strict: false })).errors, [], "非strictでは未承認の予約を許す");
  const tampered = approvedEpisode(kp);
  tampered.content = { ...tampered.content, sections: [{ heading: "見出し", paragraphs: ["改ざん"] }] };
  assert.ok(checkSeries([tampered], ctx()).errors.some((e) => e.includes("content-changed-after-approval")));
  const moved = { ...approvedEpisode(kp), scheduledAt: SLOT2 };
  assert.ok(checkSeries([moved], ctx()).errors.some((e) => e.includes("schedule-changed-after-approval")));
  const early = { ...approvedEpisode(kp), status: "published", publishedAt: "2026-11-07" };
  assert.ok(checkSeries([early], ctx()).errors.length > 0, "予定前の published");
  assert.ok(checkSeries([approvedEpisode(kp)], { now: at(0), approverPublicKey: null, strict: true }).errors.some((e) => e.includes("公開鍵")));
  assert.ok(checkSeries([approvedEpisode(kp)], { now: at(0), approverPublicKey: "bad", strict: true }).errors.some((e) => e.includes("公開鍵")));
  const forged = approvedEpisode(newKey());
  assert.ok(checkSeries([forged], ctx()).errors.some((e) => e.includes("approval-signature-invalid")));
  assert.ok(checkSeries([draft({ slug: "x", episode: 5 }), { ...draft(), slug: "ep2-sample" }, { ...draft(), episode: 2, slug: "ep2-dup" }], ctx()).errors.length > 0);
});

test("検査コマンド：既存の連載0件のリポジトリでは成功し、公開鍵の有無に影響されない", () => {
  for (const key of ["", "garbage"]) {
    const r = spawnSync(process.execPath, [TOOL, "check", "--strict"], { encoding: "utf-8", env: { ...process.env, SERIES_APPROVER_PUBLIC_KEY: key, CF_PAGES: "" } });
    assert.equal(r.status, 0, r.stderr);
  }
  assert.equal(spawnSync(process.execPath, [TOOL, "help"], { encoding: "utf-8" }).status, 0);
  assert.equal(spawnSync(process.execPath, [TOOL, "nope"], { encoding: "utf-8" }).status, 1);
});

// ---------- 鍵の更新 ----------
test("鍵リング：複数の公開鍵（PEM）を並べて読める。1つでも不正なら全体を無効にする", () => {
  const a = newKey();
  const b = newKey();
  const ring = resolveApproverKey({ SERIES_APPROVER_PUBLIC_KEY: `${a.pem}\n${b.pem}` });
  assert.equal(ring.length, 2);
  assert.deepEqual(ring.map(publicKeyFingerprint), [a.fingerprint, b.fingerprint]);
  assert.equal(resolveApproverKey({ SERIES_APPROVER_PUBLIC_KEY: `${a.pem}${b.pem}`.replace(/\n/g, "\\n") }).length, 2, "改行を \\n で書いた形式も可");
  const rsa = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const rsaPem = rsa.publicKey.export({ type: "spki", format: "pem" });
  assert.equal(resolveApproverKey({ SERIES_APPROVER_PUBLIC_KEY: `${a.pem}\n${rsaPem}` }), null, "Ed25519以外が混ざる");
  assert.equal(resolveApproverKey({ SERIES_APPROVER_PUBLIC_KEY: `${a.pem}\nnot a key` }), null, "PEM以外の文字が混ざる");
  assert.equal(resolveApproverKey({ SERIES_APPROVER_PUBLIC_KEY: `${a.pem}\n-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----` }), null, "壊れたブロックが混ざる");
  assert.equal(asKeyRing([]), null);
  assert.equal(asKeyRing([a.publicKey, "bad"]), null);
  assert.equal(asKeyRing(a.publicKey).length, 1);
});

test("鍵の更新：旧鍵で承認した公開済みの回は、新鍵を足しても維持される。旧鍵を外す前に新鍵で署名し直せば、旧鍵を外しても維持される", () => {
  const oldK = newKey();
  const newK = newKey();
  const published = approvedEpisode(oldK, { status: "published", publishedAt: "2026-11-07" });
  const after = { now: at(30 * DAY) };
  // 1. 新鍵を足す（旧鍵も残す）：旧鍵の承認はそのまま通る
  assert.equal(decideEpisode(published, { ...after, approverPublicKey: [oldK.publicKey, newK.publicKey] }).publish, true);
  // 2. 新鍵で作った承認も通る（新規の回）
  const fresh = approvedEpisode(newK, { slug: "ep3-new", episode: 3, scheduledAt: SLOT2 });
  assert.equal(decideEpisode(fresh, { now: at(0, SLOT2_UTC), approverPublicKey: [oldK.publicKey, newK.publicKey] }).publish, true);
  // 3. 旧鍵だけを外すと、旧鍵で承認した公開済みの回はビルドを止める（黙って消えない）
  const withoutOld = decideEpisode(published, { ...after, approverPublicKey: [newK.publicKey] });
  assert.equal(withoutOld.publish, false);
  assert.equal(withoutOld.blocking, true);
  // 4. 新鍵で署名し直す（原稿・予約日時・公開状態はそのまま。承認日は予約より後でもよい）
  const resigned = approvedEpisode(newK, { status: "published", publishedAt: "2026-11-07" }, "2026-12-01T10:00:00+09:00");
  assert.equal(contentHashOf(resigned), contentHashOf(published), "署名し直しても本文は同一");
  assert.equal(decideEpisode(resigned, { ...after, approverPublicKey: [newK.publicKey] }).publish, true);
  assert.equal(decideEpisode(resigned, { ...after, approverPublicKey: [oldK.publicKey, newK.publicKey] }).publish, true);
  // scheduled の承認が予約より後なのは、従来どおり拒否する
  const late = approvedEpisode(newK, {}, "2026-11-07T10:30:00+09:00");
  assert.equal(decideEpisode(late, { now: at(DAY), approverPublicKey: [newK.publicKey] }).reason, "approved-after-schedule");
  // 5. 漏えいした旧鍵を外した後は、旧鍵で作った新規の承認は通らない
  const forged = approvedEpisode(oldK, { slug: "ep9-forged", episode: 9, scheduledAt: SLOT2 });
  assert.equal(decideEpisode(forged, { now: at(0, SLOT2_UTC), approverPublicKey: [newK.publicKey] }).reason, "approval-signature-invalid");
});

test("鍵の更新：承認コマンドで公開済みの回を新鍵で署名し直せる（種類は『署名のやり直し』）。新鍵が信頼リングに無ければ拒否", async () => {
  const oldK = newKey();
  const newK = newKey();
  const s = setup(approvedEpisode(oldK, { status: "published", publishedAt: "2026-11-07" }), newK);
  const now = at(30 * DAY);
  const rejected = await approveVia(s, { now, ring: [oldK.publicKey] });
  await assert.rejects(rejected.run(), /信頼する公開鍵/, "新鍵がビルドに登録される前は署名しても無意味");
  const a = await approveVia(s, { now, ring: [oldK.publicKey, newK.publicKey] });
  await a.run();
  assert.ok(a.lines.join("\n").includes("署名のやり直し"));
  const ep = readJson(s.file);
  assert.equal(ep.status, "published");
  assert.equal(decideEpisode(ep, { now, approverPublicKey: [newK.publicKey] }).publish, true, "新鍵だけで検証できる");
  assert.equal(prepareApproval(ep, { now, privateKey: newK.privateKey, ring: null }).kind, "署名のやり直し（原稿・予約日時は承認時と同じ）");
});

// ---------- 承認の対象（公開内容に関わる項目） ----------
test("承認ハッシュの対象：回番号・題名・説明・本文・出典・SEOに関わる項目（未知の項目も含む）のどれを変えても公開されず、対象外は状態・予約・保留・公開日・承認だけ", () => {
  const kp = newKey();
  const ctx = { now: at(SEC), approverPublicKey: [kp.publicKey] };
  const ok = approvedEpisode(kp);
  assert.equal(decideEpisode(ok, ctx).publish, true);
  const c = ok.content;
  const mutations = {
    題名: { title: "別の題名" },
    説明文: { description: "別の説明" },
    回番号: { episode: 3 },
    見出し: { content: { ...c, sections: [{ ...c.sections[0], heading: "別の見出し" }] } },
    本文: { content: { ...c, sections: [{ ...c.sections[0], paragraphs: ["別の本文"] }] } },
    節の追加: { content: { ...c, sections: [...c.sections, { heading: "追加", paragraphs: ["x"] }] } },
    出典の表示名: { content: { ...c, sources: [{ ...c.sources[0], label: "別の出典" }] } },
    出典のURL: { content: { ...c, sources: [{ ...c.sources[0], url: "https://example.com/other" }] } },
    出典の追加: { content: { ...c, sources: [...c.sources, { label: "追加", url: "https://example.go.jp/b" }] } },
    未知の項目_noindex: { noindex: true },
    未知の項目_canonical: { canonicalUrl: "https://example.com/" },
    未知の項目_ogImage: { ogImage: "/x.png" },
    本文内の未知の項目: { content: { ...c, extra: "x" } },
  };
  for (const [label, patch] of Object.entries(mutations)) {
    const d = decideEpisode({ ...ok, ...patch }, ctx);
    assert.equal(d.publish, false, label);
    assert.equal(d.reason, "content-changed-after-approval", label);
  }
  assert.notEqual(decideEpisode({ ...ok, slug: "ep9-other" }, ctx).publish, true, "slug");
  // 対象外：公開の状態管理に使う項目（hold・status の確定）は署名を壊さない
  assert.equal(decideEpisode({ ...ok, hold: true }, ctx).reason, "on-hold");
  assert.equal(contentHashOf({ ...ok, status: "published", publishedAt: "2026-11-07", hold: true }), ok.approval.contentHash);
});

test("公開日：published の publishedAt は署名された予約日と一致することを求める（ページの公開日・sitemap を書き換えさせない）", () => {
  const kp = newKey();
  const ctx = { now: at(30 * DAY), approverPublicKey: [kp.publicKey] };
  const pub = approvedEpisode(kp, { status: "published", publishedAt: "2026-11-07" });
  assert.equal(decideEpisode(pub, ctx).publish, true);
  for (const bad of ["2026-11-06", "2026-12-01", "2020-01-01"]) {
    const d = decideEpisode({ ...pub, publishedAt: bad }, ctx);
    assert.equal(d.publish, false, bad);
    assert.equal(d.reason, "published-date-mismatch");
    assert.equal(d.blocking, true, "公開済みの改変はビルドを止める");
    assert.ok(checkSeries([{ ...pub, publishedAt: bad }], { ...ctx, strict: true }).errors.length > 0);
  }
});

// ---------- 本番の公開確認 ----------
test("公開確認：本番のページが200で、この回の正規URLを含むときだけ live。404・別ページ・通信失敗は確定しない側に倒す", async () => {
  const siteUrl = "https://site.example";
  const page = (slug) => `<html><head><link rel="canonical" href="${siteUrl}/jitsuryoku/${slug}"></head></html>`;
  const mk = (fn) => (url) => Promise.resolve(fn(url));
  const res = (status, body = "") => ({ ok: status >= 200 && status < 300, status, text: async () => body });
  const live = await verifyLive(["ep2-a"], { siteUrl, fetchFn: mk((u) => res(200, page("ep2-a"))) });
  assert.deepEqual(live.map((x) => x.live), [true]);
  assert.equal(live[0].url, `${siteUrl}/jitsuryoku/ep2-a`);
  assert.equal((await verifyLive(["ep2-a"], { siteUrl, fetchFn: mk(() => res(404)) }))[0].live, false, "デプロイ前・失敗");
  assert.equal((await verifyLive(["ep2-a"], { siteUrl, fetchFn: mk(() => res(200, page("ep3-other"))) }))[0].live, false, "別の回／404ページを200で返す場合");
  assert.equal((await verifyLive(["ep2-a"], { siteUrl, fetchFn: mk(() => res(200, "<html></html>")) }))[0].live, false);
  assert.equal((await verifyLive(["ep2-a"], { siteUrl, fetchFn: () => Promise.reject(new Error("offline")) }))[0].live, false, "通信失敗");
  const mixed = await verifyLive(["ep2-a", "ep3-b"], { siteUrl, fetchFn: mk((u) => (u.endsWith("ep2-a") ? res(200, page("ep2-a")) : res(502))) });
  assert.deepEqual(mixed.map((x) => x.live), [true, false], "1件でも未確認なら、呼び出し側は全件の確定を止める");
});
