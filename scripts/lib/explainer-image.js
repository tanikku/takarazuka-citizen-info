// 記事・議案採決一覧の冒頭に置く「3〜4ポイント解説」画像（たから まどか・たからワンの案内図）。
// 画像は assets/photos/ に置いた WebP を /photos/ で配信する（build.js が .webp を一括コピーする既存の仕組みに乗せる）。
// 画像の文字だけに情報を依存させないため、同じ内容は必ず本文・ポイント欄にも書く。
import fs from "node:fs";
import path from "node:path";

const SRC_PATTERN = /^\/photos\/[a-z0-9][a-z0-9-]*\.webp$/;

// { src, width, height, alt } を検証し、エラーメッセージの配列を返す
export function validateExplainerImage(img, label = "explainerImage") {
  if (!img || typeof img !== "object" || Array.isArray(img)) return [`${label} はオブジェクトである必要があります`];
  const errors = [];
  const allowed = new Set(["src", "width", "height", "alt"]);
  for (const key of Object.keys(img)) if (!allowed.has(key)) errors.push(`${label} に未知のキーがあります: ${key}`);
  if (typeof img.src !== "string" || !SRC_PATTERN.test(img.src)) errors.push(`${label}.src は /photos/xxx.webp 形式である必要があります: ${img.src}`);
  for (const key of ["width", "height"]) {
    if (!Number.isInteger(img[key]) || img[key] <= 0) errors.push(`${label}.${key} は正の整数である必要があります`);
  }
  // キャラクター名だけのaltにしないため、図の内容が分かる長さを求める
  if (typeof img.alt !== "string" || img.alt.trim().length < 15) errors.push(`${label}.alt は図の内容が分かる15字以上の説明にしてください`);
  return errors;
}

// 画像ファイルが未配置なら null を返す（素材がそろうまでページには何も出さない）
export function availableExplainerImage(img, photosDir) {
  if (!img || typeof img.src !== "string") return null;
  return fs.existsSync(path.join(photosDir, path.basename(img.src))) ? img : null;
}
