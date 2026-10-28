// 財政ウォッチのサイトマップ lastmod。
// publishedDate は資料の公告日で、ページ自体の更新日ではない（資料が同じでも、表示や説明を直せばページは更新される）。
// ページを実質的に更新したときは、最新期のJSONの pageUpdatedAt（YYYY-MM-DD）を手で書く。
// 書かなければ publishedDate を使う。最新期にだけ効くので、次の公表期を追加したとき古い値が残らない。
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function zaiseiLastmod(periods) {
  const latest = periods[0];
  if (!latest) return undefined;
  if (latest.pageUpdatedAt !== undefined) {
    if (!DATE_RE.test(latest.pageUpdatedAt)) throw new Error(`pageUpdatedAt は YYYY-MM-DD 形式にしてください: ${latest.pageUpdatedAt}`);
    if (latest.pageUpdatedAt < latest.publishedDate) throw new Error("pageUpdatedAt は publishedDate より前にできません");
    return latest.pageUpdatedAt;
  }
  return latest.publishedDate;
}
