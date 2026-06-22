import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEATHER_JSON = path.join(__dirname, "..", "data", "weather.json");

// 気象庁 防災情報XML/JSON（公共データ利用規約に準拠。出典明記の上で利用）
// 宝塚市は阪神地域のため、兵庫県南部・代表地点「神戸」のデータを使用する
const FORECAST_URL = "https://www.jma.go.jp/bosai/forecast/data/forecast/280000.json";

function weatherCodeToLabel(code) {
  const firstDigit = String(code)[0];
  switch (firstDigit) {
    case "1": return { label: "晴れ", emoji: "☀️" };
    case "2": return { label: "くもり", emoji: "☁️" };
    case "3": return { label: "雨", emoji: "🌧️" };
    case "4": return { label: "雪", emoji: "❄️" };
    default: return { label: "天候不明", emoji: "🌤️" };
  }
}

async function main() {
  const res = await fetch(FORECAST_URL);
  if (!res.ok) throw new Error(`気象庁データの取得に失敗しました (${res.status})`);
  const data = await res.json();

  const shortTerm = data[0];
  const nanbu = shortTerm.timeSeries[0].areas.find((a) => a.area.name === "南部");
  const kobeTemps = shortTerm.timeSeries.find((ts) => ts.areas.some((a) => a.area.name === "神戸"));
  const kobeArea = kobeTemps?.areas.find((a) => a.area.name === "神戸");

  const weatherCode = nanbu?.weatherCodes?.[0];
  const { label, emoji } = weatherCodeToLabel(weatherCode);

  const forecastDate = kobeTemps?.timeDefines?.[0]?.slice(0, 10) ?? "";
  const tempMin = kobeArea?.temps?.[0] ?? null;
  const tempMax = kobeArea?.temps?.[1] ?? null;

  const result = {
    reportDatetime: shortTerm.reportDatetime,
    areaLabel: "神戸（阪神地域代表地点）",
    weatherLabel: label,
    weatherEmoji: emoji,
    forecastDate,
    tempMin,
    tempMax,
    sourceUrl: "https://www.jma.go.jp/bosai/forecast/#area_type=class20s&area_code=2821100",
    sourceName: "気象庁",
  };

  fs.mkdirSync(path.dirname(WEATHER_JSON), { recursive: true });
  fs.writeFileSync(WEATHER_JSON, JSON.stringify(result, null, 2));
  console.log(`天気データを取得しました: ${label} 最低${tempMin}℃/最高${tempMax}℃（${forecastDate}予報）`);
}

main().catch((error) => {
  console.error("天気データの取得に失敗しました:", error);
  process.exitCode = 1;
});
