import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PHOTOS_DIR = path.join(ROOT, "assets", "photos");
const PHOTO_JSON = path.join(ROOT, "data", "photos.json");

// 宝塚市オープンデータ「写真データ」（CC BY 4.0）
// 出典: https://www.city.takarazuka.hyogo.jp/1014984/1015575/
const BASE = "https://www.city.takarazuka.hyogo.jp/_res/projects/default_project/_page_";

const PHOTOS = [
  // その他の風景 (1015682)
  { title: "あいあいパーク", year: 2011, category: "その他の風景", file: "aiaipark2011.jpg", dir: "001/015/682", page: "https://www.city.takarazuka.hyogo.jp/1014984/1015575/1015682.html" },
  { title: "手塚治虫記念館", year: 2015, category: "その他の風景", file: "tezukakinenkan2015.jpg", dir: "001/015/682", page: "https://www.city.takarazuka.hyogo.jp/1014984/1015575/1015682.html" },
  { title: "宝塚大橋1", year: 2009, category: "その他の風景", file: "takarazukaohashi2009.jpg", dir: "001/015/682", page: "https://www.city.takarazuka.hyogo.jp/1014984/1015575/1015682.html" },
  { title: "宝塚大橋2", year: 2005, category: "その他の風景", file: "takarazukaohashi2005.jpg", dir: "001/015/682", page: "https://www.city.takarazuka.hyogo.jp/1014984/1015575/1015682.html" },
  { title: "宝塚大劇場1", year: 2014, category: "その他の風景", file: "takarazukadaigekizyou.jpg", dir: "001/015/682", page: "https://www.city.takarazuka.hyogo.jp/1014984/1015575/1015682.html" },
  { title: "宝塚大劇場2", year: 2017, category: "その他の風景", file: "daigekizyo.jpg", dir: "001/015/682", page: "https://www.city.takarazuka.hyogo.jp/1014984/1015575/1015682.html" },
  { title: "宝塚文化創造館", year: 2009, category: "その他の風景", file: "takarazukabunkasouzoukan2009.jpg", dir: "001/015/682", page: "https://www.city.takarazuka.hyogo.jp/1014984/1015575/1015682.html" },
  { title: "末広中央公園 平和の鐘", year: 2016, category: "その他の風景", file: "heiwa.jpg", dir: "001/015/682", page: "https://www.city.takarazuka.hyogo.jp/1014984/1015575/1015682.html" },
  { title: "武庫川", year: 2017, category: "その他の風景", file: "mukogawa.jpg", dir: "001/015/682", page: "https://www.city.takarazuka.hyogo.jp/1014984/1015575/1015682.html" },

  // 春 (1015578)
  { title: "花と緑のフェスティバル", year: 2015, category: "春", file: "hanamidori_1.jpg", dir: "001/015/578", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015578.html" },
  { title: "花と緑のフェスティバル", year: 2017, category: "春", file: "hanamidori2017b.jpg", dir: "001/015/578", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015578.html" },
  { title: "花のみち1", year: 2013, category: "春", file: "hananomichi_1.jpg", dir: "001/015/578", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015578.html" },
  { title: "花のみち2", year: 2013, category: "春", file: "hananomichi_2.jpg", dir: "001/015/578", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015578.html" },
  { title: "花のみち3", year: 2017, category: "春", file: "hananomichi3b.jpg", dir: "001/015/578", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015578.html" },
  { title: "花のみち4", year: 2017, category: "春", file: "hananomichi4b.jpg", dir: "001/015/578", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015578.html" },
  { title: "寿楽荘", year: 2015, category: "春", file: "zyurakusou_1.jpg", dir: "001/015/578", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015578.html" },
  { title: "市役所", year: 2017, category: "春", file: "shiyakusyob.jpg", dir: "001/015/578", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015578.html" },
  { title: "長谷牡丹園", year: 2015, category: "春", file: "nagatanibotanen_1.jpg", dir: "001/015/578", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015578.html" },

  // 夏 (1015579)
  { title: "サマーフェスタ", year: 2015, category: "夏", file: "summerfesta1.jpg", dir: "001/015/579", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015579.html" },
  { title: "宝塚観光花火大会1", year: 2015, category: "夏", file: "kankouhanabi1-1.jpg", dir: "001/015/579", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015579.html" },
  { title: "宝塚観光花火大会2", year: 2015, category: "夏", file: "kankouhanabi2-1.jpg", dir: "001/015/579", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015579.html" },
  { title: "花のみち1", year: 2017, category: "夏", file: "hananomichi1b.jpg", dir: "001/015/579", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015579.html" },
  { title: "花のみち2", year: 2017, category: "夏", file: "hananomichi2b.jpg", dir: "001/015/579", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015579.html" },

  // 秋 (1015680)
  { title: "ダリア花つみ園1", year: 2015, category: "秋", file: "daria2015.jpg", dir: "001/015/680", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015680.html" },
  { title: "ダリア花つみ園2", year: 2015, category: "秋", file: "daria2b.jpg", dir: "001/015/680", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015680.html" },
  { title: "武庫川", year: 2013, category: "秋", file: "mukogawa2013.jpg", dir: "001/015/680", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015680.html" },
  { title: "武田尾紅葉1", year: 2013, category: "秋", file: "takedaomomizi2013.jpg", dir: "001/015/680", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015680.html" },
  { title: "武田尾紅葉2", year: 2016, category: "秋", file: "takedao2b.jpg", dir: "001/015/680", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015680.html" },
  { title: "武田尾紅葉3", year: 2016, category: "秋", file: "takedao3b.jpg", dir: "001/015/680", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015680.html" },

  // 冬 (1015681)
  { title: "「生」の字", year: 2011, category: "冬", file: "seinozi2011.jpg", dir: "001/015/681", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015681.html" },
  { title: "宝塚ハーフマラソン", year: 2015, category: "冬", file: "takarazukamarason2015.jpg", dir: "001/015/681", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015681.html" },
  { title: "宝来橋初日の出", year: 2016, category: "冬", file: "houraibashihatsuhinode2016.jpg", dir: "001/015/681", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015681.html" },
  { title: "「生」のモニュメントのライトアップ", year: 2017, category: "冬", file: "sei.jpg", dir: "001/015/681", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015681.html" },
  { title: "1.17祈りのともしび", year: 2017, category: "冬", file: "inori.jpg", dir: "001/015/681", page: "https://www.city.takarazuka.hyogo.jp/1060687/1060729/1014984/1015575/1015681.html" },
];

async function downloadPhoto(photo) {
  const url = `${BASE}/${photo.dir}/${photo.file}`;
  const localName = `${photo.dir.replaceAll("/", "")}_${photo.file}`;
  const localPath = path.join(PHOTOS_DIR, localName);

  if (fs.existsSync(localPath)) {
    return { ...photo, url, localFile: localName };
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`取得失敗 (${res.status}): ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(localPath, buffer);
  return { ...photo, url, localFile: localName };
}

async function main() {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(PHOTO_JSON), { recursive: true });

  const results = [];
  for (const photo of PHOTOS) {
    const result = await downloadPhoto(photo);
    results.push({
      title: result.title,
      year: result.year,
      category: result.category,
      localFile: result.localFile,
      sourcePage: result.page,
      sourceUrl: result.url,
      license: "CC BY 4.0",
      credit: "写真提供：宝塚市オープンデータ",
    });
    console.log(`取得: ${result.title}（${result.year}）`);
  }

  fs.writeFileSync(PHOTO_JSON, JSON.stringify(results, null, 2));
  console.log(`\n合計 ${results.length} 枚を ${PHOTOS_DIR} に保存し、${PHOTO_JSON} を生成しました。`);
}

main().catch((error) => {
  console.error("写真の取得に失敗しました:", error);
  process.exitCode = 1;
});
