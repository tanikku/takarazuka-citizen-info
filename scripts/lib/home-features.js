// トップページの「現地取材」写真と人気記事ランキングの表示可否。build.js が使い、テストから直接呼べるよう純粋関数にしている。

// 宝塚Todayが自ら現地で撮影した写真だけを載せる。リンク先は現地取材を明記したガイドに限る
// （ガイド側の fieldReport に「現地取材：…」「掲載写真は宝塚Todayが現地で撮影…」とある3件）。
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
  {
    src: "/photos/aiaipark-exterior-20261016-1200x630.webp",
    alt: "あいあいパークの英国風の建物（2026年10月16日 宝塚Today撮影）",
    place: "あいあいパーク",
    shotOn: "2026年10月16日",
    href: "/category/kanko/aiaipark-guide",
  },
];

// "YYYY-MM-DD" の1970-01-01からの通算日。タイムゾーンに依存せず、年をまたいでも1日ずつ増える
// （年内の通算日だと 12/31→1/1 で候補が戻ってしまう）
function dayNumber(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

// 日替わり。同じ日のビルドでは常に同じ写真、翌日は次の候補になる（ランダムにしない）
export function pickFieldReportPhoto(dateKey, photos = FIELD_REPORT_PHOTOS) {
  if (photos.length === 0) return null;
  return photos[dayNumber(dateKey) % photos.length];
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

// 現地取材フォト（/photo）に載せる場所と写真。宝塚Todayが現地で撮影したとガイドに明記している場所だけを、新しい取材順に並べる。
// 写真のキャプション・寸法・取材日は各ガイドのデータから読む（ここに複製しない）。一覧で切り抜かれないよう横長の写真だけを選ぶ
export const FIELD_REPORT_GALLERY = [
  {
    guide: "takedao-onsen-guide",
    place: "武田尾温泉",
    photos: ["/photos/takedao-azare-entrance-20261103.webp", "/photos/takedao-azare-fork-sign-20261103.webp"],
    article: { href: "/articles/takedao-azare-higaeri-2026", label: "現地取材の記事を読む" },
  },
  // 以下4か所の note は docs/FIELD_REPORTS.md（2026年11月3日の運営者の現地取材記録）にある内容だけを書く
  {
    guide: "takarazuka-kita-sa-guide",
    place: "宝塚北サービスエリア",
    photos: ["/photos/takarazuka-kita-sa-foodcourt-20261103.webp", "/photos/takarazuka-kita-sa-parking-20261103.webp"],
    note: "武田尾方面から一般道を通り、ウェルカムゲート経由で利用しました。高速道路には入らず、一般道利用者用の駐車場を利用できました。ドッグランがあり、犬連れの利用者が多く見られました。",
  },
  {
    guide: "takarazuka-onsen-guide",
    place: "宝塚温泉",
    photos: ["/photos/takarazuka-onsen-wakamizu-river-20261103.webp", "/photos/takarazuka-onsen-wilkinson-20261103.webp"],
    note: "ホテル若水の周辺と、休館中のナチュールスパ宝塚の前を歩きました。外から見て歩いた範囲で、入浴や宿泊はしていません。",
  },
  {
    guide: "takarazuka-kageki-guide",
    place: "宝塚大劇場・花のみち",
    photos: ["/photos/takarazuka-hananomichi-20261103.webp", "/photos/takarazuka-gekijo-signpost-20261103.webp"],
    note: "花のみちから、宝塚ホテルと宝塚大劇場の外観・館内（ロビーや通路など）を訪れ、その後、手塚治虫記念館の方面へ歩いて移動しました。観劇はしていません。",
  },
  {
    guide: "tezuka-museum-guide",
    place: "手塚治虫記念館",
    photos: ["/photos/tezuka-museum-phoenix-tower-20261103.webp", "/photos/tezuka-museum-street-view-20261103.webp"],
    note: "外観を見て、この日は館内に入っていません。隣の宝塚市立文化芸術センターの広場では、この日、イベントが開かれていました（名称・開催期間は確認できていません）。",
  },
  {
    guide: "dahlia-en-guide",
    place: "宝塚ダリア園",
    photos: ["/photos/dahlia-field-mountain-20261017.webp", "/photos/dahlia-pastel-bee-20261017.webp", "/photos/dahlia-area2-goldrush-20261017.webp"],
    article: { href: "/articles/dahlia-en-2026aki", label: "現地取材の記事を読む" },
  },
  {
    guide: "aiaipark-guide",
    place: "あいあいパーク",
    photos: ["/photos/aiaipark-exterior-20261016.webp", "/photos/aiaipark-courtyard-20261016.webp", "/photos/aiaipark-outdoor-plants-20261016.webp"],
  },
  {
    guide: "kiyoshikojin-guide",
    place: "清荒神清澄寺",
    photos: ["/photos/kiyoshikojin-approach-20261003.webp", "/photos/kiyoshikojin-keidai-20261003.webp", "/photos/kiyoshikojin-keidai-green-20261003.webp"],
  },
  {
    guide: "nakayamadera-guide",
    place: "中山寺",
    photos: ["/photos/nakayamadera-keidai-path-20261003.webp", "/photos/nakayamadera-keidai-20261003.webp"],
  },
];

const OWN_PHOTO_STATEMENT = "宝塚Todayが現地で撮影";

function guidePhotos(guide) {
  const photos = [];
  for (const section of guide.sections ?? []) {
    for (const item of section.items ?? []) {
      if (item && typeof item === "object" && item.photo) photos.push(item.photo);
    }
  }
  return photos;
}

// guides（data/guides の読み込み結果）から /photo の表示データを組み立てる。
// 撮影の明記・取材日・写真のどれかがガイドに無ければ、推測で埋めずにビルドを止める
export function buildFieldReportGallery(guides, gallery = FIELD_REPORT_GALLERY) {
  return gallery.map((entry) => {
    const guide = guides.find((g) => g.slug === entry.guide);
    if (!guide) throw new Error(`現地取材フォト: ガイド ${entry.guide} が見つかりません`);
    const report = guide.fieldReport ?? [];
    if (!report.some((line) => line.includes(OWN_PHOTO_STATEMENT))) {
      throw new Error(`現地取材フォト: ${entry.guide} に「${OWN_PHOTO_STATEMENT}」の明記がありません`);
    }
    const dateLine = report.find((line) => line.startsWith("現地取材："));
    if (!dateLine) throw new Error(`現地取材フォト: ${entry.guide} に取材日がありません`);
    const all = guidePhotos(guide);
    const photos = entry.photos.map((src) => {
      const photo = all.find((p) => p.src === src);
      if (!photo) throw new Error(`現地取材フォト: ${entry.guide} に写真 ${src} がありません`);
      // 一覧は横800pxの縮小版（assets/photos に別ファイルで配置）を表示し、元画像はリンク先に残す
      return { ...photo, thumb: src.replace(/\.webp$/, "-800w.webp") };
    });
    return {
      place: entry.place,
      reportedOn: dateLine.slice("現地取材：".length),
      href: `/category/${guide.categoryKey}/${guide.slug}`,
      guideTitle: guide.title,
      photos,
      article: entry.article ?? null,
      note: entry.note ?? null,
    };
  });
}
