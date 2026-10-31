// トップページ「注目・新着ニュース」に載せる記事の選定（純粋関数。DB・時計・ファイルに触れない）。
//
// 方針：
// - valueScore（S/A）は「載せてよい重要度」の資格であって、鮮度ではない。鮮度は日付で別に判定する。
// - 候補が少ない日は、古い記事で埋めない（0件でも枠は出し、「新着がない」と言う）。
// - 記事の状態を推測しない。
//   ・外すのは status が ended / closed と明示された記事だけ。
//   ・近づいている日付は、編集者が homeDate（種類つき）で明示した記事だけ。eventDates は催し・募集期間・締切などが混在して
//     意味を読み取れないので使わない。
//   ・「継続中」の特別扱いはしない。status: "active" は「表示なし（未設定と同じ）」のままで、災害対応の継続中を意味しない。
//     継続案件の扱いは別途設計する。
// - updatedAt（実質的な更新日）だけを理由には載せない。載せる理由は「新しく公開された」「明示された日付が近い」のどちらか。
// - 同じ記事は1回だけ（slug で重複排除）。

export const HOME_NEWS_MAX = 3;
export const FRESH_DAYS = 7; // 公開からこの日数未満（当日を含め7日間）を新着とする
export const IMMINENT_DAYS = 3; // 「まもなく」として優先する日数
export const UPCOMING_DAYS = 14; // 近づいている日付として拾う日数

// homeDate.kind：日付の意味。載せるときは「11月8日開催」のように必ず意味を添える
export const HOME_DATE_KINDS = ["開催", "実施", "受付", "締切", "開始"];

const EXCLUDED_STATUSES = new Set(["ended", "closed"]);

// "YYYY-MM-DD" を UTC の日付として扱う（時刻・タイムゾーンを持ち込まない）
function dayNumber(key) {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

// today からの経過日数（過去なら正、未来なら負）
function daysAgo(todayKey, key) {
  return dayNumber(todayKey) - dayNumber(key);
}

// homeDate が「今日から見てどの日付に近いか」。まだ始まっていなければ開始までの日数、
// 期間つきで期間中なら終了までの日数（長い受付期間が、その間ずっと「まもなく」を占領しないように）、過ぎていれば null
function homeDateDistance(homeDate, todayKey) {
  if (!homeDate || !HOME_DATE_KINDS.includes(homeDate.kind) || typeof homeDate.date !== "string") return null;
  const untilStart = -daysAgo(todayKey, homeDate.date);
  if (untilStart >= 0) return untilStart;
  if (typeof homeDate.endDate === "string") {
    const untilEnd = -daysAgo(todayKey, homeDate.endDate);
    if (untilEnd >= 0) return untilEnd;
  }
  return null;
}

/**
 * @returns {{article: object, reason: {kind: "soon"|"new"|"upcoming", homeDate?: object}}[]}
 */
export function selectHomeNews(articles, todayKey) {
  const picked = [];
  for (const article of articles) {
    if (EXCLUDED_STATUSES.has(article.status)) continue;
    const age = daysAgo(todayKey, article.publishedAt);
    if (age < 0) continue; // 未来日付の公開は載せない
    const distance = homeDateDistance(article.homeDate, todayKey);

    let candidate = null;
    if (distance !== null && distance <= IMMINENT_DAYS) {
      candidate = { priority: 1, sortKey: article.homeDate.date, reason: { kind: "soon", homeDate: article.homeDate } };
    } else if (age <= FRESH_DAYS - 1) {
      candidate = { priority: 2, sortKey: article.publishedAt, reason: { kind: "new" } };
    } else if (distance !== null && distance <= UPCOMING_DAYS) {
      candidate = { priority: 3, sortKey: article.homeDate.date, reason: { kind: "upcoming", homeDate: article.homeDate } };
    }
    if (candidate) picked.push({ article, ...candidate });
  }
  // 優先度 → 日付（近い予定は早い順、新着は新しい順）→ 重要度 S 先 → slug（決定的にするため）
  picked.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const dateOrder = a.priority === 1 || a.priority === 3 ? a.sortKey.localeCompare(b.sortKey) : b.sortKey.localeCompare(a.sortKey);
    if (dateOrder !== 0) return dateOrder;
    if (a.article.valueScore !== b.article.valueScore) return a.article.valueScore === "S" ? -1 : 1;
    return a.article.slug.localeCompare(b.article.slug);
  });
  const seen = new Set();
  const result = [];
  for (const c of picked) {
    if (seen.has(c.article.slug)) continue;
    seen.add(c.article.slug);
    result.push({ article: c.article, reason: c.reason });
    if (result.length >= HOME_NEWS_MAX) break;
  }
  return result;
}

// 日付キーを「M月D日」にする（理由ラベル用）
export function monthDayLabel(key) {
  const [, m, d] = key.split("-").map(Number);
  return `${m}月${d}日`;
}

// 「11月8日開催」「11月9日〜20日受付」。意味（kind）を必ず添える
function homeDateLabel(homeDate) {
  const start = monthDayLabel(homeDate.date);
  if (!homeDate.endDate) return `${start}${homeDate.kind}`;
  const [, m1] = homeDate.date.split("-").map(Number);
  const [, m2, d2] = homeDate.endDate.split("-").map(Number);
  const end = m1 === m2 ? `${d2}日` : `${m2}月${d2}日`;
  return `${start}〜${end}${homeDate.kind}`;
}

// 「本日」「明日」のような相対表現は使わない。静的ビルドなので、日付が変わってから再ビルドされるまで（実績では翌朝8時台）
// 古い「本日」が残り得る。日付で言えば、いつ見ても正しい
export function reasonLabel(reason) {
  switch (reason.kind) {
    case "soon":
    case "upcoming":
      return homeDateLabel(reason.homeDate);
    case "new":
      return "新着";
    default:
      return "";
  }
}

// 日本時間の日付キー（YYYY-MM-DD）。サーバー（ビルド環境）のタイムゾーンに依存しない。
export function jstDateKey(now) {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}
