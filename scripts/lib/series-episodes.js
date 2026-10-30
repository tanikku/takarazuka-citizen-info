// 「宝塚の実力」週刊連載（第2回以降）の公開判定。
// 状態は data/jitsuryoku/episodes/<slug>.json に持ち、「いつ・誰が承認したか」を検証できたものだけをビルド出力へ出す。
// 第1弾（data/jitsuryoku/zeishu-shigoto.json）はこの仕組みの対象外で、一切変えない。
//
// 公開判定の要点（すべて満たしたときだけ公開）
//   1. 承認の署名が、運営者の公開鍵（リポジトリの外にある信頼の起点）で検証できる
//      署名の対象は「回の識別子・原稿の内容ハッシュ・予約公開日時・承認者・承認日時」。予約日時を変えると署名は無効になる
//   2. 承認の内容ハッシュが、いまの本文と一致する（承認後の変更は無効）
//   3. 現在時刻が、署名された予約公開日時（+09:00・土曜10:15 JST）以降である
//   4. scheduled は、さらに hold が無いこと
//   5. published も同じ承認検証を通し、署名された日時より前には出ない（status の書き換えでは早く出せない）
// 公開済み（published・承認検証OK・署名された日時を経過）は、hold に関係なく毎回の再ビルドで出力する（再ビルドで消さない）。
// 予定を早める・遅らせるときは、承認者が新しい日時で承認し直す（再承認）。公開の保留（hold）だけは、署名を変えずに誰でも付けられる。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { layout, escapeHtml } from "../templates.js";

export const EPISODE_STATUSES = ["draft", "scheduled", "published"];
// 承認の対象にしない項目。公開状態・予約・保留・承認そのものは、本文の承認とは別に管理する（権限の分離）
const CONTROL_KEYS = ["status", "scheduledAt", "hold", "approval", "publishedAt"];
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\+09:00$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// ---------- 日時 ----------
// "2026-11-07T10:15:00+09:00" だけを受け付ける。実在しない日付は拒否する。
export function parseJstDateTime(value) {
  const m = typeof value === "string" ? DATETIME_RE.exec(value) : null;
  if (!m) return { ok: false, reason: "format" };
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number);
  const ms = Date.UTC(y, mo - 1, d, h, mi, s) - JST_OFFSET_MS;
  const back = new Date(ms + JST_OFFSET_MS);
  const same = back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d && back.getUTCHours() === h && back.getUTCMinutes() === mi && back.getUTCSeconds() === s;
  if (!same) return { ok: false, reason: "not-a-real-date" };
  return { ok: true, ms, jstDay: back.getUTCDay(), jstHour: h, jstMinute: mi, jstSecond: s };
}

// 原則：土曜日 10:15:00 JST
export function parseScheduledAt(value) {
  const p = parseJstDateTime(value);
  if (!p.ok) return p;
  if (p.jstDay !== 6 || p.jstHour !== 10 || p.jstMinute !== 15 || p.jstSecond !== 0) return { ok: false, reason: "not-saturday-1015-jst" };
  return p;
}

// ---------- 承認 ----------
function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).filter((k) => value[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function contentHashOf(episode) {
  const content = Object.fromEntries(Object.entries(episode).filter(([k]) => !CONTROL_KEYS.includes(k)));
  return crypto.createHash("sha256").update(canonicalize(content)).digest("hex");
}

function approvalMessage({ slug, contentHash, scheduledAt, approvedBy, approvedAt }) {
  return ["series-approval-v2", slug, contentHash, scheduledAt, approvedBy, approvedAt].join("\n");
}

// 公開鍵は KeyObject か PEM を受け付け、Ed25519 以外・不正なものは null（安全側で停止）にする
function asEd25519PublicKey(key) {
  if (!key) return null;
  try {
    const k = typeof key === "object" && key.type === "public" ? key : crypto.createPublicKey(key);
    return k.asymmetricKeyType === "ed25519" ? k : null;
  } catch {
    return null;
  }
}

// 公開鍵リング：鍵の更新のあいだ、旧鍵と新鍵を同時に信頼するため、複数の公開鍵（PEM を並べる）を受け付ける。
// 1つでも読めない・Ed25519 でないものが混ざっていれば、リング全体を無効（null）にする（安全側で停止）。
const PEM_BLOCK_RE = /-----BEGIN PUBLIC KEY-----[A-Za-z0-9+/=\s]+?-----END PUBLIC KEY-----/g;
export function asKeyRing(input) {
  if (!input) return null;
  let items;
  if (Array.isArray(input)) items = input;
  else if (typeof input === "string") {
    const blocks = input.match(PEM_BLOCK_RE);
    if (!blocks || input.replace(PEM_BLOCK_RE, "").trim() !== "") return null;
    items = blocks;
  } else items = [input];
  if (items.length === 0) return null;
  const ring = items.map(asEd25519PublicKey);
  return ring.every(Boolean) ? ring : null;
}

// 公開鍵の指紋（SPKI DER の SHA-256）。承認の画面や運用で「どの鍵か」を見比べるために使う。
export function publicKeyFingerprint(publicKey) {
  const k = asEd25519PublicKey(publicKey);
  if (!k) return null;
  return crypto.createHash("sha256").update(k.export({ type: "spki", format: "der" })).digest("hex");
}

// 承認者だけが持つ秘密鍵（Ed25519）で署名する。ビルド側は公開鍵だけを持つ。
export function signApproval(privateKey, fields) {
  return crypto.sign(null, Buffer.from(approvalMessage(fields)), privateKey).toString("base64");
}

export function verifyApproval(publicKey, fields, signature) {
  try {
    const key = asEd25519PublicKey(publicKey);
    if (!key) return false;
    return crypto.verify(null, Buffer.from(approvalMessage(fields)), key, Buffer.from(String(signature), "base64"));
  } catch {
    return false;
  }
}

// 承認の検査。ハッシュの一致だけでは承認とみなさない（署名の検証が必須）。
export function checkApproval(episode, approverPublicKey) {
  const a = episode.approval;
  if (!a || typeof a !== "object") return { ok: false, reason: "not-approved" };
  if (typeof a.approvedBy !== "string" || !a.approvedBy.trim() || !parseJstDateTime(a.approvedAt).ok || !parseJstDateTime(a.scheduledAt).ok || !/^[0-9a-f]{64}$/.test(a.contentHash ?? "") || typeof a.signature !== "string" || !a.signature) {
    return { ok: false, reason: "not-approved" };
  }
  if (a.contentHash !== contentHashOf(episode)) return { ok: false, reason: "content-changed-after-approval" };
  if (episode.scheduledAt !== a.scheduledAt) return { ok: false, reason: "schedule-changed-after-approval" };
  if (!approverPublicKey) return { ok: false, reason: "approver-key-missing" };
  const ring = asKeyRing(approverPublicKey);
  if (!ring) return { ok: false, reason: "approver-key-invalid" };
  const fields = { slug: episode.slug, contentHash: a.contentHash, scheduledAt: a.scheduledAt, approvedBy: a.approvedBy, approvedAt: a.approvedAt };
  if (!ring.some((key) => verifyApproval(key, fields, a.signature))) {
    return { ok: false, reason: "approval-signature-invalid" };
  }
  return { ok: true };
}

// ---------- 形式の検査 ----------
export function validateEpisodeShape(ep) {
  const errors = [];
  if (!ep || typeof ep !== "object" || Array.isArray(ep)) return ["episode がオブジェクトではありません"];
  if (!SLUG_RE.test(ep.slug ?? "")) errors.push("slug は小文字英数字とハイフンだけにしてください");
  if (!Number.isInteger(ep.episode) || ep.episode < 2) errors.push("episode は2以上の整数にしてください（第1弾は対象外）");
  if (typeof ep.title !== "string" || !ep.title.trim()) errors.push("title が必要です");
  if (typeof ep.description !== "string" || !ep.description.trim()) errors.push("description が必要です");
  if (!EPISODE_STATUSES.includes(ep.status)) errors.push(`status は ${EPISODE_STATUSES.join(" / ")} のいずれかです`);
  if (ep.hold !== undefined && typeof ep.hold !== "boolean") errors.push("hold は true / false です");
  const c = ep.content;
  if (!c || !Array.isArray(c.sections) || c.sections.length === 0 || !c.sections.every((s) => typeof s?.heading === "string" && Array.isArray(s?.paragraphs) && s.paragraphs.every((p) => typeof p === "string"))) errors.push("content.sections（heading と paragraphs）が必要です");
  if (!c || !Array.isArray(c.sources) || c.sources.length === 0 || !c.sources.every((s) => typeof s?.label === "string" && /^https:\/\//.test(s?.url ?? ""))) errors.push("content.sources（label と https の url）が必要です");
  if (ep.status === "published" && !DATE_RE.test(ep.publishedAt ?? "")) errors.push("published には publishedAt（YYYY-MM-DD）が必要です");
  return errors;
}

// ---------- 公開判定 ----------
// now は Date。テストでは固定した時刻を渡す。
export function decideEpisode(ep, { now, approverPublicKey } = {}) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error("decideEpisode: now が不正です");
  const shape = validateEpisodeShape(ep);
  if (shape.length > 0) return { publish: false, reason: "invalid-episode", detail: shape };
  if (ep.status === "draft") return { publish: false, reason: "draft" };

  const approval = checkApproval(ep, approverPublicKey);
  if (!approval.ok) {
    // 公開済みを名乗る回の承認が崩れたときは、黙って捨てずビルドを止める（直前の本番はそのまま残る）
    return ep.status === "published" ? { publish: false, reason: `published-but-${approval.reason}`, blocking: true } : { publish: false, reason: approval.reason };
  }
  // ここから先の予約日時は、署名で承認された値（ep.scheduledAt と一致済み）
  const sched = parseScheduledAt(ep.scheduledAt);
  if (!sched.ok) return { publish: false, reason: `invalid-schedule:${sched.reason}` };
  // 公開日（ページに表示され、sitemap の lastmod になる）は署名の対象ではないので、署名された予約日と一致することを求める
  if (ep.status === "published" && ep.publishedAt !== ep.scheduledAt.slice(0, 10)) return { publish: false, reason: "published-date-mismatch", blocking: true };
  // 承認が予約より後でも、公開済みの回は有効：鍵の更新で、公開済みの回を新しい鍵で署名し直すときに必要になる
  if (ep.status !== "published" && parseJstDateTime(ep.approval.approvedAt).ms > sched.ms) return { publish: false, reason: "approved-after-schedule" };
  if (now.getTime() < sched.ms) return { publish: false, reason: ep.status === "published" ? "published-before-scheduled" : ep.hold === true ? "on-hold" : "not-yet-due" };
  if (ep.status === "published") return { publish: true, reason: "published" };
  if (ep.hold === true) return { publish: false, reason: "on-hold" };
  return { publish: true, reason: "due" };
}

export function selectEpisodes(episodes, { now, approverPublicKey, reservedSlugs = [] } = {}) {
  const errors = [];
  const bySlug = new Map();
  const byNumber = new Map();
  for (const ep of episodes) {
    bySlug.set(ep?.slug, (bySlug.get(ep?.slug) ?? 0) + 1);
    byNumber.set(ep?.episode, (byNumber.get(ep?.episode) ?? 0) + 1);
  }
  const publish = [];
  const excluded = [];
  for (const ep of episodes) {
    const slug = ep?.slug ?? "(slugなし)";
    if (ep?.__loadError) { errors.push(`${slug}: ${ep.__loadError}`); excluded.push({ slug, reason: "load-error" }); continue; }
    if ((bySlug.get(ep.slug) ?? 0) > 1) { errors.push(`${slug}: slug が重複しています`); excluded.push({ slug, reason: "duplicate-slug" }); continue; }
    if (Number.isInteger(ep.episode) && (byNumber.get(ep.episode) ?? 0) > 1) { errors.push(`${slug}: 第${ep.episode}回が重複しています`); excluded.push({ slug, reason: "duplicate-episode-number" }); continue; }
    if (reservedSlugs.includes(ep.slug)) { errors.push(`${slug}: 既存ページの slug と衝突します`); excluded.push({ slug, reason: "reserved-slug" }); continue; }
    const d = decideEpisode(ep, { now, approverPublicKey });
    if (d.blocking) errors.push(`${slug}: 公開済みの承認が検証できません（${d.reason}）`);
    if (d.publish) publish.push(ep);
    else excluded.push({ slug, reason: d.reason, status: ep.status });
  }
  publish.sort((a, b) => a.episode - b.episode);
  return { publish, excluded, errors };
}

// ---------- 読み込み・現在時刻 ----------
export function loadEpisodes(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => {
    const slug = f.replace(/\.json$/, "");
    try {
      const ep = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
      if (ep?.slug !== slug) return { slug, __loadError: `ファイル名と slug が一致しません（${f}）` };
      return ep;
    } catch (e) {
      return { slug, __loadError: `JSON を読めません（${f}）` };
    }
  });
}

// ローカルの確認用に SERIES_NOW で時刻を固定できる。Cloudflare Pages のビルド（CF_PAGES）では無視する。
export function resolveNow(env = process.env) {
  if (env.SERIES_NOW && !env.CF_PAGES) {
    const t = new Date(env.SERIES_NOW);
    if (Number.isNaN(t.getTime())) throw new Error(`SERIES_NOW が不正です: ${env.SERIES_NOW}`);
    return t;
  }
  return new Date();
}

// ---------- 出力 ----------
const jpDate = (s) => { const [y, m, d] = s.split("-").map(Number); return `${y}年${m}月${d}日`; };
export const episodeDate = (ep) => (ep.publishedAt ?? ep.scheduledAt).slice(0, 10);

export function episodePage(ep, siteUrl) {
  const canonicalUrl = `${siteUrl}/jitsuryoku/${ep.slug}`;
  const sections = ep.content.sections.map((s) => `<section class="jf-sec"><h2 class="jf-h2">${escapeHtml(s.heading)}</h2>${s.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}</section>`).join("\n");
  const sources = `<ul class="jf-sources" role="list">${ep.content.sources.map((x) => `<li><a href="${escapeHtml(x.url)}" target="_blank" rel="noopener">${escapeHtml(x.label)}</a></li>`).join("")}</ul>`;
  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; <a href="/jitsuryoku">「宝塚の実力」</a> &gt; 第${ep.episode}回</nav>
<div class="jf">
<header class="jf-hero"><p class="jf-hero__tag">宝塚の実力 第${ep.episode}回</p><h1 class="jf-hero__title">${escapeHtml(ep.title)}</h1><p class="jf-lead">${escapeHtml(ep.description)}</p><p class="jf-small">公開日：${jpDate(episodeDate(ep))}</p></header>
${sections}
<section class="jf-sec"><h2 class="jf-h2">出典</h2>${sources}</section>
<p class="jf-back"><a href="/jitsuryoku">「宝塚の実力」の企画紹介へ →</a></p>
</div>`;
  return layout({
    title: `${ep.title}｜「宝塚の実力」第${ep.episode}回｜Takarazuka Today`,
    description: ep.description,
    bodyHtml,
    canonicalUrl,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: "「宝塚の実力」", item: `${siteUrl}/jitsuryoku` },
        { "@type": "ListItem", position: 3, name: `第${ep.episode}回`, item: canonicalUrl },
      ],
    },
  });
}

// 企画紹介ページの「これまでの連載」。公開できる回が1つも無いときは空文字を返し、既存の出力を変えない。
export function episodeListHtml(episodes) {
  if (episodes.length === 0) return "";
  const items = [...episodes].sort((a, b) => b.episode - a.episode).map((ep) => `<li><a href="/jitsuryoku/${escapeHtml(ep.slug)}">第${ep.episode}回　${escapeHtml(ep.title)}</a>（${jpDate(episodeDate(ep))}）</li>`).join("");
  return `<h2 class="guide-q" style="font-size:1rem;">これまでの連載</h2>\n<ul>${items}</ul>\n`;
}

// 承認者の公開鍵（PEM。鍵の更新中は複数を並べてよい）。リポジトリの外（ビルド環境の変数）から受け取る。無い・不正なときは null（予約・公開済みは出さない）
export function resolveApproverKey(env = process.env) {
  const raw = env.SERIES_APPROVER_PUBLIC_KEY;
  if (!raw) return null;
  return asKeyRing(raw.replace(/\\n/g, "\n"));
}
