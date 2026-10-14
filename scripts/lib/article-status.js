// 記事の「現在の状態」（終了・受付終了・復旧済み）を表す status の唯一の定義元。
// article-schema.js（検証）・templates.js（表示）・build.js（イベント一覧）が共有する。
//
// 方針：
// - status は任意。未設定の既存記事は active と同じ扱いで、表示は従来と変わらない。
// - statusDate は「記事データで確認できる日付」があるときだけ設定する（推測で入れない）。
// - status は表示のためのもので、noindex・sitemap・検索インデックスには連動させない。
//   インデックスさせるかどうかは記事の価値として別に判断する。

export const ARTICLE_STATUSES = ["active", "ended", "closed", "resolved"];

const STATUS_COPY = {
  ended: { label: "終了", subject: "この記事で案内したイベント・実施期間は", undated: "終了しました", dated: "に終了しました" },
  closed: { label: "受付終了", subject: "この記事で案内した募集・申込受付は", undated: "終了しています", dated: "に終了しました" },
  resolved: { label: "復旧済み", subject: "この記事の事案は", undated: "復旧・対応終了しています", dated: "に復旧・対応終了しました" },
};

export function isArticleStatus(value) {
  return ARTICLE_STATUSES.includes(value);
}

// "2026-09-30" → "2026年9月30日"
export function formatJapaneseDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

/**
 * 記事ページ・一覧に出す状態表示。active または未設定なら null（従来どおり何も出さない）。
 * @returns {{status: string, label: string, message: string} | null}
 */
export function articleStatusNotice(article) {
  const copy = STATUS_COPY[article?.status];
  if (!copy) return null;
  const tail = article.statusDate ? `${formatJapaneseDate(article.statusDate)}${copy.dated}` : copy.undated;
  return {
    status: article.status,
    label: copy.label,
    message: `${copy.subject}${tail}。以下は掲載当時の内容です。`,
  };
}

// イベントカレンダー（/events/）に「これからの予定」として載せてよいか。
// 終了・復旧済みの記事は eventDates に未来日が残っていても載せない。
// 受付終了（closed）は申込が締め切られただけで催し自体はこれからのことがあるため載せる（一覧側で受付終了を表示する）。
export function isListableAsUpcoming(article) {
  return article?.status !== "ended" && article?.status !== "resolved";
}
