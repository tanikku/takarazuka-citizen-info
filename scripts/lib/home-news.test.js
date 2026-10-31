// トップ「注目・新着ニュース」の選定ロジックのテスト（固定日付。Node標準の node:test）
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectHomeNews, reasonLabel, monthDayLabel, jstDateKey, HOME_NEWS_MAX, HOME_DATE_KINDS } from "./home-news.js";
import { validateArticle } from "./article-schema.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// 基準日は 2026-11-01（日）
const TODAY = "2026-11-01";
function art(slug, over = {}) {
  return { slug, title: `記事${slug}`, category: "行政・くらし", valueScore: "A", publishedAt: "2026-09-01", ...over };
}
const slugs = (result) => result.map((r) => r.article.slug);
const kinds = (result) => result.map((r) => r.reason.kind);
const label = (result, i = 0) => reasonLabel(result[i].reason);

test("新着が3件以上ある日：最大3件で、公開日の新しい順", () => {
  const list = [art("a", { publishedAt: "2026-10-27" }), art("b", { publishedAt: "2026-10-31" }), art("c", { publishedAt: "2026-10-29" }), art("d", { publishedAt: "2026-10-30" })];
  const r = selectHomeNews(list, TODAY);
  assert.equal(r.length, HOME_NEWS_MAX);
  assert.deepEqual(slugs(r), ["b", "d", "c"]);
  assert.deepEqual(kinds(r), ["new", "new", "new"]);
  assert.equal(label(r), "新着");
});

test("新着が1〜2件の日：古い記事で埋めず、その件数だけ返す", () => {
  const list = [art("new1", { publishedAt: "2026-10-31" }), art("old1", { publishedAt: "2026-09-20" }), art("old2", { publishedAt: "2026-09-10" }), art("old3", { publishedAt: "2026-08-10" })];
  assert.deepEqual(slugs(selectHomeNews(list, TODAY)), ["new1"]);
  assert.deepEqual(slugs(selectHomeNews([...list, art("new2", { publishedAt: "2026-10-28" })], TODAY)), ["new1", "new2"]);
});

test("新着が0件の日：空配列（古い記事を代わりに出さない）", () => {
  const list = [art("old1", { publishedAt: "2026-10-20" }), art("old2", { publishedAt: "2026-09-10" })];
  assert.deepEqual(selectHomeNews(list, TODAY), []);
  assert.deepEqual(selectHomeNews([], TODAY), []);
});

test("公開から7日未満が新着。日付が変わって7日目（再ビルド後）には外れる", () => {
  const a = art("a", { publishedAt: "2026-10-26" }); // 11/1 時点で6日前
  assert.deepEqual(slugs(selectHomeNews([a], "2026-11-01")), ["a"]);
  assert.deepEqual(slugs(selectHomeNews([a], "2026-11-02")), [], "7日前になったら新着ではない");
});

test("updatedAt が7日以内という理由だけでは載せない（公開が古い記事の更新は注目枠に出ない）", () => {
  const upd = art("upd", { publishedAt: "2026-09-01", updatedAt: "2026-10-31" });
  assert.deepEqual(selectHomeNews([upd], TODAY), []);
  // 公開が新しければ、updatedAt の有無にかかわらず新着として載る（理由は公開日）
  assert.deepEqual(kinds(selectHomeNews([art("n", { publishedAt: "2026-10-30", updatedAt: "2026-10-31" })], TODAY)), ["new"]);
});

test("近づく日付は、編集者が homeDate で明示した記事だけ。eventDates だけの記事は日付を理由に載せない", () => {
  const onlyEventDates = art("ev", { eventDates: ["2026-11-03"] });
  assert.deepEqual(selectHomeNews([onlyEventDates], TODAY), []);
  const tagged = art("tagged", { homeDate: { kind: "開催", date: "2026-11-03" } });
  const r = selectHomeNews([tagged], TODAY);
  assert.deepEqual(kinds(r), ["soon"]);
  assert.equal(label(r), "11月3日開催");
});

test("日付ラベルには日付の意味（開催・実施・受付・締切・開始）を添える", () => {
  const one = (kind, date = "2026-11-03") => label(selectHomeNews([art("x", { homeDate: { kind, date } })], TODAY));
  assert.equal(one("開催"), "11月3日開催");
  assert.equal(one("実施"), "11月3日実施");
  assert.equal(one("締切"), "11月3日締切");
  assert.equal(one("開始"), "11月3日開始");
  assert.equal(label(selectHomeNews([art("r", { homeDate: { kind: "受付", date: "2026-11-04", endDate: "2026-11-30" } })], "2026-11-02")), "11月4日〜30日受付");
  assert.equal(label(selectHomeNews([art("r2", { homeDate: { kind: "開催", date: "2026-11-03", endDate: "2026-11-08" } })], "2026-11-02")), "11月3日〜8日開催");
  assert.equal(label(selectHomeNews([art("r3", { homeDate: { kind: "受付", date: "2026-12-28", endDate: "2027-01-05" } })], "2026-12-27")), "12月28日〜1月5日受付", "月をまたぐ期間");
  assert.deepEqual(HOME_DATE_KINDS, ["開催", "実施", "受付", "締切", "開始"]);
});

test("開催前・開催当日・開催翌日の扱い（homeDate）", () => {
  const ev = (d) => art("ev", { homeDate: { kind: "開催", date: d } });
  assert.deepEqual(selectHomeNews([ev("2026-11-16")], TODAY), [], "15日先はまだ拾わない");
  assert.deepEqual(kinds(selectHomeNews([ev("2026-11-15")], TODAY)), ["upcoming"]);
  assert.deepEqual(kinds(selectHomeNews([ev("2026-11-04")], TODAY)), ["soon"]);
  assert.equal(label(selectHomeNews([ev("2026-11-01")], TODAY)), "11月1日開催", "当日も「本日」とは書かず日付で言う");
  assert.deepEqual(selectHomeNews([ev("2026-10-31")], TODAY), [], "翌日（日付が過ぎた）古い記事は外れる。終了とは断定しない");
});

test("期間つきの homeDate：開始前は開始までの日数、期間中は終了までの日数で判定し、終了の翌日に外れる", () => {
  const fes = art("fes", { homeDate: { kind: "開催", date: "2026-11-03", endDate: "2026-11-08" } });
  assert.deepEqual(kinds(selectHomeNews([fes], "2026-11-01")), ["soon"], "開始まで2日");
  assert.deepEqual(kinds(selectHomeNews([fes], "2026-11-03")), ["soon"], "開始日");
  assert.deepEqual(kinds(selectHomeNews([fes], "2026-11-04")), ["upcoming"], "期間中・終了まで4日");
  assert.deepEqual(kinds(selectHomeNews([fes], "2026-11-06")), ["soon"], "期間中・終了まで2日");
  assert.deepEqual(kinds(selectHomeNews([fes], "2026-11-08")), ["soon"], "最終日");
  assert.deepEqual(selectHomeNews([fes], "2026-11-09"), [], "終了の翌日");
  // 長い受付期間が、その間ずっと注目枠を占領しない
  const longRun = art("long", { homeDate: { kind: "受付", date: "2026-11-04", endDate: "2026-11-30" } });
  assert.deepEqual(kinds(selectHomeNews([longRun], "2026-11-02")), ["soon"], "開始の2日前");
  assert.deepEqual(selectHomeNews([longRun], "2026-11-10"), [], "期間中でも終了まで20日あるうちは載せない");
  assert.deepEqual(kinds(selectHomeNews([longRun], "2026-11-20")), ["upcoming"], "終了まで10日");
  assert.deepEqual(kinds(selectHomeNews([longRun], "2026-11-28")), ["soon"], "終了まで2日");
});

test("開催翌日でも、公開から7日以内の記事（結果報告など）は新着として残る", () => {
  const r = selectHomeNews([art("report", { publishedAt: "2026-10-30", homeDate: { kind: "開催", date: "2026-10-29" } })], TODAY);
  assert.deepEqual(kinds(r), ["new"]);
});

test("募集の締切の当日と翌日：status が closed（締切後）の記事は、予定が近くても外す", () => {
  const open = art("open", { publishedAt: "2026-10-28", homeDate: { kind: "開催", date: "2026-11-07" } });
  assert.deepEqual(slugs(selectHomeNews([open], TODAY)), ["open"], "締切当日（status未設定）は残る");
  assert.deepEqual(selectHomeNews([{ ...open, status: "closed", statusDate: "2026-11-02" }], "2026-11-03"), [], "締切の翌日に closed になった記事は外れる");
});

test("status が ended / closed の記事は、新着でも注目枠に出さない。resolved（復旧済み）は新着なら出す", () => {
  const fresh = { publishedAt: "2026-10-31" };
  assert.deepEqual(selectHomeNews([art("e", { ...fresh, status: "ended" }), art("c", { ...fresh, status: "closed" })], TODAY), []);
  assert.deepEqual(slugs(selectHomeNews([art("r", { ...fresh, status: "resolved" })], TODAY)), ["r"]);
});

test("期限が未確認の記事を、過去の日付から終了と推測して外さない／受付中と推測して載せない", () => {
  assert.deepEqual(selectHomeNews([art("x", { publishedAt: "2026-08-01", eventDates: ["2026-08-23"] })], TODAY), []);
  const r = selectHomeNews([art("y", { publishedAt: "2026-10-30", eventDates: ["2026-08-23"] })], TODAY);
  assert.deepEqual(kinds(r), ["new"]);
});

test("「継続中」の特別扱いはしない：status: \"active\" や S評価の防災・防犯でも、通常の新着・日付の規則で選ばれる", () => {
  const act = art("act", { status: "active", publishedAt: "2026-10-22" });
  const implicitS = art("implicit", { valueScore: "S", category: "防災", publishedAt: "2026-10-22" });
  assert.deepEqual(selectHomeNews([act, implicitS], TODAY), [], "公開が7日より前なら、status:active でも載らない");
  const fresh = art("fresh", { status: "active", valueScore: "S", category: "防災", publishedAt: "2026-10-31" });
  const r = selectHomeNews([fresh], TODAY);
  assert.deepEqual(kinds(r), ["new"], "理由は通常の新着");
  assert.equal(label(r), "新着");
  // 新着の記事の並びも、status:active や防災だからと先頭にしない（公開日の新しい順）
  const newer = art("newer", { publishedAt: "2026-11-01" });
  assert.deepEqual(slugs(selectHomeNews([fresh, newer], TODAY)), ["newer", "fresh"]);
});

test("復旧済み（resolved）の災害情報：直近7日以内に公開された復旧報告は新着として載り、古いものは載らない", () => {
  assert.deepEqual(kinds(selectHomeNews([art("fix", { valueScore: "S", category: "防災", publishedAt: "2026-10-30", status: "resolved" })], TODAY)), ["new"]);
  assert.deepEqual(selectHomeNews([art("fixold", { valueScore: "S", category: "防災", publishedAt: "2026-10-10", status: "resolved" })], TODAY), []);
});

test("優先順：まもなく → 新着 → 近づく日付（14日以内）", () => {
  const list = [
    art("upcoming", { homeDate: { kind: "締切", date: "2026-11-12" } }),
    art("new", { publishedAt: "2026-10-31" }),
    art("soon", { homeDate: { kind: "開催", date: "2026-11-03" } }),
  ];
  assert.deepEqual(slugs(selectHomeNews(list, TODAY)), ["soon", "new", "upcoming"]);
});

test("同じ記事は1回だけ（新着かつ開催間近でも、理由は優先度の高い方）", () => {
  const both = art("both", { publishedAt: "2026-10-31", homeDate: { kind: "開催", date: "2026-11-02" } });
  const r = selectHomeNews([both, both], TODAY);
  assert.equal(r.length, 1);
  assert.equal(r[0].reason.kind, "soon");
});

test("未来の公開日の記事は載せない", () => {
  assert.deepEqual(selectHomeNews([art("future", { publishedAt: "2026-11-05" })], TODAY), []);
});

test("同じ優先度・同じ日付なら重要度S、次いでslug順で決定的に並ぶ", () => {
  const list = [art("b2", { publishedAt: "2026-10-31" }), art("a1", { publishedAt: "2026-10-31" }), art("s1", { publishedAt: "2026-10-31", valueScore: "S" })];
  assert.deepEqual(slugs(selectHomeNews(list, TODAY)), ["s1", "a1", "b2"]);
  assert.deepEqual(slugs(selectHomeNews([...list].reverse(), TODAY)), ["s1", "a1", "b2"]);
});

test("日付キーは日本時間：UTCで10月31日15:00は日本の11月1日0:00", () => {
  assert.equal(jstDateKey(new Date("2026-10-31T14:59:59Z")), "2026-10-31");
  assert.equal(jstDateKey(new Date("2026-10-31T15:00:00Z")), "2026-11-01");
  assert.equal(jstDateKey(new Date("2026-11-01T20:59:59Z")), "2026-11-02");
});

test("ラベル：M月D日（意味つき）・新着。相対表現（本日・明日）は使わない", () => {
  assert.equal(monthDayLabel("2026-11-07"), "11月7日");
  assert.equal(reasonLabel({ kind: "new" }), "新着");
  assert.equal(reasonLabel({ kind: "upcoming", homeDate: { kind: "開催", date: "2026-11-07" } }), "11月7日開催");
});

test("homeDate のスキーマ検証：種類・日付・期間の順序", () => {
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "articles", "peace-walk-2026.json"), "utf8"));
  const errorsOf = (homeDate) => validateArticle({ ...base, homeDate }).errors.filter((e) => e.includes("homeDate"));
  assert.deepEqual(errorsOf({ kind: "開催", date: "2026-11-07" }), []);
  assert.deepEqual(errorsOf({ kind: "受付", date: "2026-11-04", endDate: "2026-11-30" }), []);
  assert.ok(errorsOf({ kind: "イベント", date: "2026-11-07" }).length > 0, "未知のkind");
  assert.ok(errorsOf({ kind: "開催", date: "2026-02-30" }).length > 0, "実在しない日付");
  assert.ok(errorsOf({ kind: "開催", date: "2026-11-07", endDate: "2026-11-07" }).length > 0, "endDateは開始より後");
  assert.ok(errorsOf({ kind: "開催", date: "2026-11-07", extra: 1 }).length > 0, "未知のキー");
  assert.ok(errorsOf("2026-11-07").length > 0, "オブジェクトでない");
});

test("実データ：homeDate は全て検証を通り、どの日でも最大3件・重複なし・ended/closed なし", () => {
  const dir = path.join(ROOT, "data", "articles");
  const all = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  for (const a of all) assert.deepEqual(validateArticle(a).errors.filter((e) => e.includes("homeDate")), [], a.slug);
  const featured = all.filter((a) => a.valueScore === "S" || a.valueScore === "A");
  for (const day of ["2026-09-15", "2026-10-01", "2026-10-20", "2026-11-01", "2026-11-08", "2026-12-31", "2027-03-01"]) {
    const r = selectHomeNews(featured, day);
    assert.ok(r.length <= HOME_NEWS_MAX, day);
    assert.equal(new Set(slugs(r)).size, r.length, `${day} 重複`);
    for (const { article } of r) assert.ok(article.status !== "ended" && article.status !== "closed", `${day} ${article.slug}`);
  }
  assert.deepEqual(selectHomeNews(featured, "2028-01-01"), []);
});

test("実データ：homeDate の日付は記事のタイトル・本文に現れる日付と一致する（締切・受付期間が延長されたら homeDate も更新する）", () => {
  const dir = path.join(ROOT, "data", "articles");
  const all = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  const withDate = all.filter((a) => a.homeDate);
  assert.ok(withDate.length > 0);
  for (const a of withDate) {
    const text = `${a.title} ${a.summary}`;
    for (const key of [a.homeDate.date, a.homeDate.endDate].filter(Boolean)) {
      const [, m, d] = key.split("-").map(Number);
      assert.ok(text.includes(`${m}月${d}日`), `${a.slug}: homeDate の ${m}月${d}日 がタイトル・本文に無い（日付が変わったのに homeDate が古いままの疑い）`);
    }
  }
});
