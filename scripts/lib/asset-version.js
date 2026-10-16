// 静的ファイルのURLに内容から決まるバージョンを付ける（例: /css/style.css?v=a1b2c3d4e5）。
// style.css は max-age=4時間でキャッシュされるため、URLを変えないと更新後も古いCSSが使われ続ける。
// 同じ内容なら同じURL、内容が変われば別のURLになる。
import crypto from "node:crypto";

export function contentVersion(content) {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 10);
}
