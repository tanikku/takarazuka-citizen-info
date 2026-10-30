// 「宝塚の実力」週刊連載の承認・公開確定・検査の道具。ビルドの公開判定（series-episodes.js）とは別に、人が使う側の処理を持つ。
//   - 秘密鍵は読むだけで、表示も保存もしない。リポジトリの中にある鍵ファイルは使わない。
//   - 承認は、画面に出した内容を人が確認して、回の識別子（slug）をそのまま入力したときだけ行う。
//   - 公開の確定（scheduled → published）は秘密鍵を使わない。承認の署名は status を対象にしていないため、署名は変わらない。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  contentHashOf, signApproval, verifyApproval, parseScheduledAt, validateEpisodeShape, decideEpisode, selectEpisodes,
  asKeyRing, publicKeyFingerprint,
} from "./series-episodes.js";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// "2026-11-06T18:00:00+09:00" の形で返す（秒未満は切り捨て）
export function formatJst(date) {
  return `${new Date(Math.floor(date.getTime() / 1000) * 1000 + JST_OFFSET_MS).toISOString().slice(0, 19)}+09:00`;
}

// ---------- 秘密鍵 ----------
// 鍵がリポジトリの中にあると、うっかり commit される。実体（シンボリックリンクの先）で判定する。
function realpathOrParent(file) {
  const abs = path.resolve(file);
  if (fs.existsSync(abs)) return fs.realpathSync.native(abs);
  return path.join(fs.realpathSync.native(path.dirname(abs)), path.basename(abs));
}

export function isInsideRepo(file, repoRoot) {
  const rel = path.relative(fs.realpathSync.native(repoRoot), realpathOrParent(file));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export function loadPrivateKey(file, repoRoot) {
  if (!file) throw new Error("秘密鍵のファイルが指定されていません（SERIES_APPROVER_KEY_FILE）");
  if (!fs.existsSync(file)) throw new Error("秘密鍵のファイルが見つかりません");
  if (isInsideRepo(file, repoRoot)) throw new Error("秘密鍵のファイルがリポジトリの中にあります。リポジトリの外に置いてください");
  let key;
  try {
    key = crypto.createPrivateKey(fs.readFileSync(file));
  } catch {
    throw new Error("秘密鍵を読めません（PEM 形式の Ed25519 秘密鍵が必要です）");
  }
  if (key.asymmetricKeyType !== "ed25519") throw new Error("秘密鍵が Ed25519 ではありません");
  return key;
}

// 鍵の生成。秘密鍵はファイルにだけ書き（既存ファイルは上書きしない）、戻り値・表示には公開鍵と指紋だけを出す。
export function generateKeyPair(outFile, repoRoot) {
  if (!outFile) throw new Error("秘密鍵の保存先が指定されていません");
  if (isInsideRepo(outFile, repoRoot)) throw new Error("保存先がリポジトリの中です。リポジトリの外を指定してください");
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  fs.writeFileSync(outFile, privateKey.export({ type: "pkcs8", format: "pem" }), { flag: "wx", mode: 0o600 });
  return { publicKeyPem: publicKey.export({ type: "spki", format: "pem" }), fingerprint: publicKeyFingerprint(publicKey) };
}

// ---------- ファイルの読み書き ----------
// 一時ファイルに書いてから置き換える。途中で止まっても、元のファイルが壊れた状態では残らない。
// 一時ファイルは .json で終わらない名前にする（loadEpisodes が読み込まないため）。
export function writeJsonAtomic(file, value) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.tmp`);
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(tmp, file);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  }
}

export function readEpisodeFile(dir, slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? "")) throw new Error("slug の形式が不正です");
  const file = path.join(dir, `${slug}.json`);
  if (!fs.existsSync(file)) throw new Error(`${slug}.json が見つかりません`);
  let ep;
  try { ep = JSON.parse(fs.readFileSync(file, "utf-8")); } catch { throw new Error(`${slug}.json を読めません`); }
  if (ep?.slug !== slug) throw new Error("ファイル名と slug が一致しません");
  return { file, ep };
}

// ---------- 承認 ----------
// 承認できる状態か、何を承認することになるかを調べる（書き込みはしない）
export function prepareApproval(ep, { now, privateKey, ring }) {
  const shape = validateEpisodeShape(ep);
  if (shape.length > 0) return { ok: false, reason: `原稿の形式に誤りがあります: ${shape.join(" / ")}` };
  if (ep.status === "draft") return { ok: false, reason: "draft は承認できません。内容を確認して status を scheduled にしてください" };
  const sched = parseScheduledAt(ep.scheduledAt);
  if (!sched.ok) return { ok: false, reason: `予約日時が枠（土曜 10:15:00 JST・+09:00）ではありません（${sched.reason}）` };
  if (ep.status === "scheduled" && now.getTime() >= sched.ms) return { ok: false, reason: "予約日時を過ぎています。予約日時を次の枠に変えてから承認してください" };
  const fingerprint = publicKeyFingerprint(crypto.createPublicKey(privateKey));
  if (ring && !ring.some((k) => publicKeyFingerprint(k) === fingerprint)) {
    return { ok: false, reason: "この秘密鍵に対応する公開鍵が、ビルドが信頼する公開鍵（SERIES_APPROVER_PUBLIC_KEY）にありません。署名してもビルドで拒否されます" };
  }
  const contentHash = contentHashOf(ep);
  const prev = ep.approval;
  let kind = "初回の承認";
  if (prev && typeof prev === "object") {
    if (prev.contentHash !== contentHash) kind = "再承認（原稿が承認後に変更されています）";
    else if (prev.scheduledAt !== ep.scheduledAt) kind = "再承認（予約日時が承認後に変更されています）";
    else kind = "署名のやり直し（原稿・予約日時は承認時と同じ）";
  }
  return { ok: true, contentHash, scheduledAt: ep.scheduledAt, fingerprint, kind, sched };
}

// 署名して approval を付けた回を返す。付ける前に、公開鍵で検証できることを確かめる。
export function signEpisode(ep, { now, privateKey, approvedBy }) {
  const approvedAt = formatJst(now);
  const contentHash = contentHashOf(ep);
  const scheduledAt = ep.scheduledAt;
  const signature = signApproval(privateKey, { slug: ep.slug, contentHash, scheduledAt, approvedBy, approvedAt });
  if (!verifyApproval(crypto.createPublicKey(privateKey), { slug: ep.slug, contentHash, scheduledAt, approvedBy, approvedAt }, signature)) {
    throw new Error("署名の自己検証に失敗しました");
  }
  return { ...ep, approval: { approvedBy, approvedAt, contentHash, scheduledAt, signature } };
}

// 対話の承認。ask は質問を出して1行の回答を返す関数（テストでは差し替える）。
// interactive でないとき（CI・パイプ・リダイレクト）は、承認を一切行わない。承認を自動で通すための選択肢は用意しない。
export async function runApprove({ slug, approvedBy, dir, repoRoot, keyFile, ring, now = new Date(), interactive, ask, out }) {
  if (!interactive) throw new Error("承認は人が端末で操作するときだけ行えます（対話できない環境では実行できません）");
  if (!approvedBy || !approvedBy.trim()) throw new Error("承認者名が指定されていません（--by または SERIES_APPROVER_NAME）");
  const privateKey = loadPrivateKey(keyFile, repoRoot);
  const { file, ep } = readEpisodeFile(dir, slug);
  const plan = prepareApproval(ep, { now, privateKey, ring });
  if (!plan.ok) throw new Error(plan.reason);

  const wd = WEEKDAYS[plan.sched.jstDay];
  out("── 承認する内容 ─────────────────────────");
  out(`回の識別子  : ${ep.slug}（第${ep.episode}回）`);
  out(`タイトル    : ${ep.title}`);
  out(`状態        : ${ep.status}${ep.hold === true ? "（公開保留 hold あり）" : ""}`);
  out(`予約日時    : ${ep.scheduledAt}（${wd}曜日）`);
  out(`内容ハッシュ: ${plan.contentHash}`);
  out(`承認者      : ${approvedBy.trim()}`);
  out(`署名する鍵  : 指紋 ${plan.fingerprint}`);
  out(`承認の種類  : ${plan.kind}`);
  out("本文の見出し:");
  for (const s of ep.content.sections) out(`  - ${s.heading}（${s.paragraphs.join("").length}文字）`);
  out(`出典        : ${ep.content.sources.length}件`);
  out("────────────────────────────────────────");
  out("この内容を公開してよいと確認できた場合だけ、回の識別子をそのまま入力してください。それ以外の入力では何も書き込みません。");
  const answer = (await ask(`承認する回の識別子 > `)).trim();
  if (answer !== ep.slug) {
    out("入力が一致しないため、承認しませんでした。ファイルは変更していません。");
    return { approved: false };
  }
  const signed = signEpisode(ep, { now, privateKey, approvedBy: approvedBy.trim() });
  writeJsonAtomic(file, signed);
  out(`承認を ${path.basename(file)} に書き込みました（承認日時 ${signed.approval.approvedAt}）。`);
  out("次は変更を commit して main へ反映してください。");
  return { approved: true, approval: signed.approval };
}

// ---------- 公開の確定（scheduled → published） ----------
// 公開された回を、再ビルドで消えない published に確定する。確定は status と publishedAt を書き換えるだけで、秘密鍵は要らない。
// 確定の対象は「いまのビルドで公開される scheduled」だけ。保留・予定前・承認が崩れたものは対象にしない。
export function planFinalize(episodes, { now, approverPublicKey }) {
  const sel = selectEpisodes(episodes, { now, approverPublicKey });
  if (sel.errors.length > 0) return { ok: false, errors: sel.errors, targets: [] };
  const targets = sel.publish.filter((ep) => ep.status === "scheduled").map((ep) => ({ slug: ep.slug, publishedAt: ep.scheduledAt.slice(0, 10) }));
  return { ok: true, errors: [], targets };
}

// 「予定時刻を過ぎた」ことと「本番に公開された」ことは別。確定の前に、本番のページが実際に配信されていることを確かめる。
// 本番で見つからない・取得できない・正規URLが違う場合は live=false（確定しない）。ネットワークに届かないときも確定しない側に倒す。
export async function verifyLive(slugs, { siteUrl, fetchFn = fetch, timeoutMs = 10000 }) {
  const results = [];
  for (const slug of slugs) {
    const url = `${siteUrl}/jitsuryoku/${slug}`;
    try {
      const res = await fetchFn(url, { redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
      const body = res.ok ? await res.text() : "";
      const live = res.ok && body.includes(`<link rel="canonical" href="${url}">`);
      results.push({ slug, url, live, detail: live ? "公開を確認" : res.ok ? "ページはあるが、この回の正規URLがありません" : `HTTP ${res.status}` });
    } catch {
      results.push({ slug, url, live: false, detail: "取得できません" });
    }
  }
  return results;
}

export function applyFinalize(dir, targets, { now, approverPublicKey }) {
  const done = [];
  for (const t of targets) {
    const { file, ep } = readEpisodeFile(dir, t.slug);
    if (ep.status === "published") continue; // 再実行しても同じ結果（確定済みは何もしない）
    const next = { ...ep, status: "published", publishedAt: t.publishedAt };
    // 書き込む前に、確定後の姿でも公開されることを確かめる。公開されなくなるなら書かない。
    const d = decideEpisode(next, { now, approverPublicKey });
    if (!d.publish) throw new Error(`${t.slug}: 確定すると公開されなくなるため、書き込みを中止しました（${d.reason}）`);
    writeJsonAtomic(file, next);
    done.push(t.slug);
  }
  return done;
}

// ---------- 検査（CI・手元の確認） ----------
// strict では、公開状態の回（scheduled / published）が、いまの公開鍵で検証できる承認を持つことまで求める。
const OK_REASONS = new Set(["draft", "not-yet-due", "on-hold", "due", "published"]);

export function checkSeries(episodes, { now, approverPublicKey, strict = false }) {
  const errors = [];
  const sel = selectEpisodes(episodes, { now, approverPublicKey });
  errors.push(...sel.errors);
  const live = episodes.filter((e) => e && !e.__loadError && e.status !== "draft");
  if (live.length > 0) {
    if (!approverPublicKey) errors.push("公開鍵（SERIES_APPROVER_PUBLIC_KEY）が設定されていません。draft 以外の回は検証できません");
    else if (!asKeyRing(approverPublicKey)) errors.push("公開鍵（SERIES_APPROVER_PUBLIC_KEY）が不正です");
  }
  if (strict) {
    for (const x of sel.excluded) {
      if (x.reason === "load-error" || x.reason === "duplicate-slug" || x.reason === "duplicate-episode-number" || x.reason === "reserved-slug") continue; // errors に記録済み
      if (!OK_REASONS.has(x.reason)) errors.push(`${x.slug}: 公開状態なのに検証できません（${x.reason}）`);
    }
  }
  return { errors: [...new Set(errors)], published: sel.publish.map((e) => e.slug), excluded: sel.excluded };
}
