// 財政ウォッチのサイトマップ lastmod。
// publishedDate は資料の公告日で、ページ自体の更新日ではない（資料が同じでも、表示や説明を直せばページは更新される）。
// ページを実質的に更新したときは、最新期のJSONの pageUpdatedAt（YYYY-MM-DD）を手で書く。
// 書かなければ publishedDate を使う。最新期にだけ効くので、次の公表期を追加したとき古い値が残らない。
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ページ全体の lastmod：半期データ（zaiseiLastmod）と、決算セクションの pageUpdatedAt のうち新しい方。
// ビルド日は使わない。決算データが無ければ従来どおり半期データだけで決まる
export function zaiseiPageLastmod(periods, kessan) {
  const base = zaiseiLastmod(periods);
  const k = kessan?.pageUpdatedAt;
  if (k === undefined) return base;
  if (!DATE_RE.test(k)) throw new Error(`決算の pageUpdatedAt は YYYY-MM-DD 形式にしてください: ${k}`);
  return base === undefined || k > base ? k : base;
}

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
