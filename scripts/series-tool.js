// 「宝塚の実力」週刊連載の運用コマンド。使い方は `node scripts/series-tool.js help`。
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { loadEpisodes, resolveNow, resolveApproverKey, publicKeyFingerprint } from "./lib/series-episodes.js";
import { runApprove, generateKeyPair, runFinalize, checkSeries } from "./lib/series-approval.js";

const SITE_URL = "https://takarazuka-today.jp"; // build.js の SITE_URL と同じ値（本番の公開確認に使う）

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EPISODES_DIR = path.join(REPO_ROOT, "data", "jitsuryoku", "episodes");
const out = (line = "") => console.log(line);

const HELP = `使い方: node scripts/series-tool.js <コマンド>

  keygen --out <秘密鍵のファイル>   承認用の鍵を作る。秘密鍵はリポジトリの外のファイルにだけ保存し、公開鍵と指紋を表示する
  approve <slug> [--by <承認者名>]  原稿を確認して承認する（署名を approval に書き込む）。端末での対話が必須
  check [--strict]                  公開状態の回の承認を検証する（CI 用）。問題があれば終了コード 1
  finalize [--write]                公開された scheduled の回を published に確定する。手動操作で、本番のページが実際に
                                    配信され、内容が承認した原稿と一致することを確認できた回だけを確定する（--write なしは確認のみ）
  fingerprint                       SERIES_APPROVER_PUBLIC_KEY に入っている公開鍵の指紋を表示する

環境変数
  SERIES_APPROVER_KEY_FILE    approve が使う秘密鍵のファイル（リポジトリの外）
  SERIES_APPROVER_NAME        承認者名（--by の代わり）
  SERIES_APPROVER_PUBLIC_KEY  ビルドが信頼する公開鍵（PEM。鍵の更新中は複数を並べる）
  SERIES_NOW                  確認用に現在時刻を固定する（ISO 8601。Cloudflare Pages のビルドでは無視される）
`;

function parseArgs(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out" || a === "--by") flags[a.slice(2)] = argv[++i];
    else if (a.startsWith("--")) flags[a.slice(2)] = true;
    else rest.push(a);
  }
  return { flags, rest };
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

async function main() {
  const [command, ...argv] = process.argv.slice(2);
  const { flags, rest } = parseArgs(argv);
  const env = process.env;
  const now = resolveNow(env);

  switch (command) {
    case "keygen": {
      const { publicKeyPem, fingerprint } = generateKeyPair(flags.out, REPO_ROOT);
      out("鍵を作りました。秘密鍵は指定のファイルにだけ保存しました（この画面には出していません）。");
      out(`指紋: ${fingerprint}`);
      out("公開鍵（Cloudflare Pages と GitHub Actions の SERIES_APPROVER_PUBLIC_KEY に登録します）:");
      out(publicKeyPem.trim());
      return 0;
    }
    case "approve": {
      const slug = rest[0];
      if (!slug) throw new Error("slug を指定してください");
      const ring = env.SERIES_APPROVER_PUBLIC_KEY ? resolveApproverKey(env) : null;
      if (env.SERIES_APPROVER_PUBLIC_KEY && !ring) throw new Error("SERIES_APPROVER_PUBLIC_KEY が不正です");
      if (!ring) out("注意: SERIES_APPROVER_PUBLIC_KEY が未設定のため、この鍵がビルドで信頼されるかは確認できません。指紋を本番の公開鍵と見比べてください。");
      await runApprove({
        slug,
        approvedBy: flags.by || env.SERIES_APPROVER_NAME,
        dir: EPISODES_DIR,
        repoRoot: REPO_ROOT,
        keyFile: env.SERIES_APPROVER_KEY_FILE,
        ring,
        now: new Date(),
        interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
        ask: prompt,
        out,
      });
      return 0;
    }
    case "check": {
      const result = checkSeries(loadEpisodes(EPISODES_DIR), { now, approverPublicKey: resolveApproverKey(env), strict: Boolean(flags.strict) });
      out(`公開できる回: ${result.published.length}件 / 公開しない回: ${result.excluded.length}件${result.excluded.length ? `（${result.excluded.map((x) => `${x.slug}: ${x.reason}`).join("、")}）` : ""}`);
      for (const e of result.errors) console.error(`エラー: ${e}`);
      return result.errors.length > 0 ? 1 : 0;
    }
    case "finalize": {
      return runFinalize({ dir: EPISODES_DIR, now, approverPublicKey: resolveApproverKey(env), write: Boolean(flags.write), siteUrl: SITE_URL, fetchFn: fetch, out, err: (l) => console.error(l) });
    }
    case "fingerprint": {
      const raw = env.SERIES_APPROVER_PUBLIC_KEY;
      const ring = raw ? resolveApproverKey(env) : null;
      if (!ring) throw new Error("SERIES_APPROVER_PUBLIC_KEY が未設定か不正です");
      for (const k of ring) out(publicKeyFingerprint(k));
      return 0;
    }
    default:
      out(HELP);
      return command && command !== "help" ? 1 : 0;
  }
}

main().then((code) => { process.exitCode = code; }, (e) => {
  console.error(`エラー: ${e.message}`);
  process.exitCode = 1;
});
