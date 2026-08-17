// 人間が「記事化しない」と判断した候補を data/rejected.json に記録してから data/pending/ を削除する。
// 使い方: npm run reject:pending -- <pendingファイル名またはslug> [理由]
//   例: npm run reject:pending -- pref_abc123 "地域限定・宝塚と無関係"
//   例: npm run reject:pending -- abc123.json
import fs from "node:fs";
import path from "node:path";
import { PENDING_DIR, appendRejectedEntry } from "./lib/pending-shared.js";

function resolvePendingFile(arg) {
  const filename = arg.endsWith(".json") ? arg : `${arg}.json`;
  const filePath = path.join(PENDING_DIR, filename);
  return fs.existsSync(filePath) ? filePath : null;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("使い方: npm run reject:pending -- <pendingファイル名またはslug> [理由]");
    process.exitCode = 1;
    return;
  }

  const [target, ...reasonParts] = args;
  const reason = reasonParts.join(" ") || undefined;

  const filePath = resolvePendingFile(target);
  if (!filePath) {
    console.error(`見つかりません: data/pending/${target}`);
    process.exitCode = 1;
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  appendRejectedEntry({
    url: data.link,
    title: data.title,
    reason,
    source: data.sourceName,
  });

  fs.unlinkSync(filePath);
  console.log(`却下記録＋削除: ${data.title}`);
  console.log(`  URL: ${data.link}`);
  console.log(`  理由: ${reason || "記事化対象外"}`);
}

main();
