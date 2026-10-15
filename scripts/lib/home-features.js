// トップページの「現地取材」写真と人気記事ランキングの表示可否。build.js が使い、テストから直接呼べるよう純粋関数にしている。

// 宝塚Todayが自ら現地で撮影した写真だけを載せる。リンク先は現地取材を明記したガイドに限る
// （ガイド側の fieldReport に「現地取材：2026年10月3日」「掲載写真は宝塚Todayが現地で撮影」とある2件）。
export const FIELD_REPORT_PHOTOS = [
  {
    src: "/photos/kiyoshikojin-gate-20261003-1200x630.webp",
    alt: "清荒神清澄寺の山門（2026年10月3日 宝塚Today撮影）",
    place: "清荒神清澄寺・山門",
    shotOn: "2026年10月3日",
    href: "/category/kanko/kiyoshikojin-guide",
  },
  {
    src: "/photos/nakayamadera-gate-20261003-1200x630.webp",
    alt: "中山寺の山門（2026年10月3日 宝塚Today撮影）",
    place: "中山寺・山門",
    shotOn: "2026年10月3日",
    href: "/category/kanko/nakayamadera-guide",
  },
];

// "YYYY-MM-DD" のその年の通算日（1月1日=1）。タイムゾーンに依存しない
function dayOfYear(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000);
}

// 旧「今日の宝塚フォト」と同じ日替わり方式。同じ日のビルドでは常に同じ写真になる（ランダムにしない）
export function pickFieldReportPhoto(dateKey, photos = FIELD_REPORT_PHOTOS) {
  if (photos.length === 0) return null;
  return photos[dayOfYear(dateKey) % photos.length];
}

// ranking.json は手動の fetch:ranking でしか更新されない。過去30日の集計なので、
// 生成から日数が経ったものを「人気記事ランキング（30日間）」として出すと現在の人気のように見えてしまう。
export const RANKING_MAX_AGE_DAYS = 14;

export function isRankingFresh(data, todayKey, maxAgeDays = RANKING_MAX_AGE_DAYS) {
  if (!data || typeof data.generatedAt !== "string") return false;
  const generated = Date.parse(data.generatedAt);
  if (Number.isNaN(generated)) return false;
  const [y, m, d] = todayKey.split("-").map(Number);
  const ageDays = (Date.UTC(y, m - 1, d) - generated) / 86400000;
  return ageDays <= maxAgeDays;
}
