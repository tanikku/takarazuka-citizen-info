// Cloudflare Web Analytics（RUM・ボットを含まない実アクセスのみ）から、
// 過去30日間のページビュー上位記事を集計し data/ranking.json を生成する。
// 環境変数（CF_API_TOKEN / CF_ACCOUNT_ID）が未設定・取得失敗の場合はエラー終了せず、
// 既存のランキング表示は「新着記事」へのフォールバックに委ねる（ranking.jsonを書き換えない）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "data", "articles");
const RANKING_FILE = path.join(ROOT, "data", "ranking.json");
const ENV_FILE = path.join(ROOT, ".env");

// Cloudflare Web AnalyticsのRUMデータ上のsite tag（ビーコンスクリプトのtokenとは異なる値。
// GraphQL Analytics APIへの実クエリで確認済み＝2026-06-22）
const SITE_TAG = "1632968d7f1243578a50034350ea6900";
const RANGE_DAYS = 30;
const TOP_N = 10;

function loadEnvFile() {
  if (!fs.existsSync(ENV_FILE)) return;
  const lines = fs.readFileSync(ENV_FILE, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function loadPublishedSlugs() {
  const slugs = new Set();
  for (const file of fs.readdirSync(ARTICLES_DIR)) {
    if (!file.endsWith(".json")) continue;
    const data = JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, file), "utf-8"));
    slugs.add(data.slug);
  }
  return slugs;
}

async function fetchPageviews(accountTag, apiToken, sinceIso, untilIso) {
  const query = `
    query {
      viewer {
        accounts(filter: { accountTag: "${accountTag}" }) {
          rumPageloadEventsAdaptiveGroups(
            limit: 1000
            filter: { siteTag: "${SITE_TAG}", datetime_geq: "${sinceIso}", datetime_leq: "${untilIso}" }
          ) {
            count
            dimensions { requestPath }
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`Cloudflare API HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`Cloudflare API error: ${JSON.stringify(json.errors)}`);
  }
  return json.data.viewer.accounts[0]?.rumPageloadEventsAdaptiveGroups ?? [];
}

async function main() {
  loadEnvFile();
  const apiToken = process.env.CF_API_TOKEN;
  const accountTag = process.env.CF_ACCOUNT_ID;

  if (!apiToken || !accountTag) {
    console.log("CF_API_TOKEN / CF_ACCOUNT_ID が未設定のため、ランキング集計をスキップします（新着記事表示にフォールバックされます）。");
    return;
  }

  const until = new Date();
  const since = new Date(until.getTime() - RANGE_DAYS * 24 * 60 * 60 * 1000);

  let groups;
  try {
    groups = await fetchPageviews(accountTag, apiToken, since.toISOString(), until.toISOString());
  } catch (err) {
    console.log(`Cloudflare Analyticsの取得に失敗しました（新着記事表示にフォールバックされます）: ${err.message}`);
    return;
  }

  const publishedSlugs = loadPublishedSlugs();
  const countBySlug = new Map();
  for (const group of groups) {
    const match = group.dimensions.requestPath?.match(/^\/articles\/([a-z0-9-]+)\.html$/);
    if (!match) continue;
    const slug = match[1];
    if (!publishedSlugs.has(slug)) continue;
    countBySlug.set(slug, (countBySlug.get(slug) ?? 0) + group.count);
  }

  const top = [...countBySlug.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([slug]) => {
      const data = JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, `${slug}.json`), "utf-8"));
      return { slug, title: data.title };
    });

  if (top.length === 0) {
    console.log("対象期間のアクセスデータがまだありません（新着記事表示にフォールバックされます）。");
    return;
  }

  fs.writeFileSync(
    RANKING_FILE,
    JSON.stringify({ rangeDays: RANGE_DAYS, generatedAt: until.toISOString(), top }, null, 2),
  );
  console.log(`ランキングを更新しました（過去${RANGE_DAYS}日・${top.length}件）。`);
}

main();
