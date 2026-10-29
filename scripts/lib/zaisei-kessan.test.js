// 財政ウォッチの決算（data/zaisei-kessan/）：数値の整合・認定状況の切り替え・半期データとの分離・lastmod
// 実行: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateKessan, loadZaiseiKessan } from "./zaisei-kessan.js";
import { zaiseiPageLastmod, zaiseiLastmod } from "./zaisei-lastmod.js";
import { zaiseiWatchPage } from "../templates.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = "https://takarazuka-today.jp";
const kessan = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "zaisei-kessan", "r7.json"), "utf8"));
const periods = fs
  .readdirSync(path.join(ROOT, "data", "zaisei"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "zaisei", f), "utf8")))
  .sort((a, b) => (a.period < b.period ? 1 : -1));
const clone = (o) => JSON.parse(JSON.stringify(o));
const textOf = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const sectionOf = (html) => html.slice(html.indexOf('id="kessan"'), html.indexOf("財政用語の解説"));

test("実データは検査を通り、決算概要（原資料・千円）の数値と一致する", () => {
  assert.deepEqual(validateKessan(kessan), []);
  const c = kessan.generalAccount.current;
  assert.deepEqual(c, { revenue: 99500242, expenditure: 97364935, formalBalance: 2135307, carryoverFunds: 464013, realBalance: 1671294, singleYearBalance: 410675, realSingleYearBalance: 1092206 });
  const p = kessan.generalAccount.previous;
  assert.deepEqual(p, { revenue: 118939288, expenditure: 117397753, formalBalance: 1541535, carryoverFunds: 280916, realBalance: 1260619, singleYearBalance: 83816, realSingleYearBalance: -420184 });
  assert.equal(kessan.fiscalAdjustmentFund.yearEnd, 6994486);
  assert.equal(kessan.fiscalAdjustmentFund.previousYearEnd, 6312955);
  assert.equal(kessan.ratios.currentAccountRatio.value, 95.4);
  assert.equal(kessan.ratios.realDebtServiceRatio.value, 5.5);
  assert.equal(kessan.bonds.balance, 67850729);
  assert.equal(kessan.unit, "千円");
});

test("単年度収支（410,675）は実質収支（1,671,294）と別の数字として持つ。実質単年度収支は原資料の算式と整合する", () => {
  const c = kessan.generalAccount.current;
  assert.notEqual(c.singleYearBalance, c.realBalance);
  assert.equal(c.singleYearBalance, c.realBalance - kessan.generalAccount.previous.realBalance);
  // 原資料の算式：実質単年度収支 = 単年度収支 + 財政調整基金積立額 + 地方債繰上償還額 − 取崩額。令和7年度は取崩0・繰上償還0で、基金の増加額が積立額になる
  assert.equal(kessan.fiscalAdjustmentFund.withdrawalDuringYear, 0);
  assert.equal(c.realSingleYearBalance, c.singleYearBalance + (kessan.fiscalAdjustmentFund.yearEnd - kessan.fiscalAdjustmentFund.previousYearEnd));
});

test("財政調整基金：3月31日現在高 + 出納整理期間中の増加 = 決算の年度末残高（決算書の財産に関する調書）", () => {
  const t = kessan.fiscalAdjustmentFund.timeline;
  assert.equal(t[1].yen, 6312955258);
  assert.equal(t[2].yen, 681530358);
  assert.equal(t[1].yen + t[2].yen, t[3].yen);
  assert.equal(Math.round(t[3].yen / 1000), kessan.fiscalAdjustmentFund.yearEnd);
});

test("検査：整合しない数値・認定の先取り・日付の不正を拒否する", () => {
  const bad = (mutate) => {
    const k = clone(kessan);
    mutate(k);
    return validateKessan(k);
  };
  assert.ok(bad((k) => { k.generalAccount.current.realBalance += 1; }).length > 0, "実質収支の不整合");
  assert.ok(bad((k) => { k.generalAccount.current.singleYearBalance = k.generalAccount.current.realBalance; }).length > 0, "単年度収支に実質収支を入れる誤り");
  assert.ok(bad((k) => { k.authorization.certifiedDate = "2026-11-18"; }).length > 0, "pending に認定日");
  assert.ok(bad((k) => { k.authorization = { status: "certified" }; }).length > 0, "certified に認定日がない");
  assert.ok(bad((k) => { k.authorization.status = "approved"; }).length > 0, "状態の値");
  assert.ok(bad((k) => { k.pageUpdatedAt = "2026-10-01"; }).length > 0, "掲載ページの更新日より前");
  assert.ok(bad((k) => { k.fiscalAdjustmentFund.timeline[2].yen += 1; }).length > 0, "基金の内訳の不整合");
  assert.ok(bad((k) => { k.bonds.balance += 1; }).length > 0, "市債残高の内訳");
  assert.ok(bad((k) => { k.unit = "円"; }).length > 0, "原資料の単位");
});

test("認定前：「市公表・本会議の認定前」と表示し、認定済みを先取りしない", () => {
  const html = zaiseiWatchPage(periods, SITE, kessan);
  const s = sectionOf(html);
  assert.match(s, /市公表・本会議の認定前/);
  assert.match(s, /本会議での認定は、まだ行われていません/);
  assert.match(s, /令和8年11月18日に本会議で審議される予定です/);
  assert.doesNotMatch(textOf(html), /認定済み|認定されました/);
  assert.match(textOf(html), /決算の数字は確定していますか/);
});

test("認定後：認定日を入れると表示が切り替わる（認定日がなければ検査で止まる）", () => {
  const k = clone(kessan);
  k.authorization = { status: "certified", certifiedDate: "2026-11-18" };
  assert.deepEqual(validateKessan(k), []);
  const html = zaiseiWatchPage(periods, SITE, k);
  const s = sectionOf(html);
  assert.match(s, /本会議で認定済み/);
  assert.match(s, /令和8年11月18日の本会議で認定されました/);
  assert.doesNotMatch(s, /認定前|まだ行われていません/);
});

test("決算セクション：主要数値・前年度比較・基準日・会計範囲・速報値・出典を表示する", () => {
  const html = zaiseiWatchPage(periods, SITE, kessan);
  const s = textOf(sectionOf(html));
  assert.match(s, /令和7年度（2025年度）決算（市公表・本会議の認定前）/);
  for (const re of [/995億24万円/, /973億6,494万円/, /21億3,531万円/, /4億6,401万円/, /16億7,129万円/, /4億1,068万円/, /10億9,221万円/, /−4億2,018万円/, /69億9,449万円/, /95\.4%/, /5\.5%/, /678億5,073万円/]) {
    assert.match(s, re);
  }
  assert.match(s, /実質公債費比率（速報値）/);
  assert.match(s, /実質公債費比率は速報値で、確定値ではありません/);
  assert.match(s, /単年度収支の4億1,068万円は、実質収支が前年度から増えた額で、実質収支そのものとは別の数字です/);
  assert.match(s, /令和7年9月30日現在[^|]*63億1,296万円/);
  assert.match(s, /令和8年3月31日現在[^|]*63億1,296万円/);
  assert.match(s, /出納整理期間中の増加[^|]*\+6億8,153万円/);
  assert.match(s, /一般・特別会計合計/);
  assert.match(s, /原資料の単位は千円/);
  assert.match(s, /単純に比較できません/);
  assert.match(sectionOf(html), /_page_\/001\/064\/172\/r7_kessangaiyou\.pdf/);
  assert.match(sectionOf(html), /1045643\/1064316\.html/);
  assert.match(s, /掲載ページの更新日：令和8年9月15日/);
  assert.match(s, /掲載ページの更新日：令和8年10月22日/);
});

test("掲載しない情報：12月補正の積立予定・前年度末現在高の解釈・財政危機の断定は出さない", () => {
  const html = textOf(zaiseiWatchPage(periods, SITE, kessan));
  assert.doesNotMatch(html, /12月補正|約8\.4億円|積立予定/);
  assert.doesNotMatch(html, /前年度末現在高/);
  assert.doesNotMatch(html, /財政危機|財政破綻|財政健全化の/);
});

test("半期データと分離：既存の主要指標の表・チャートは、決算の有無で変わらない。決算は別の節", () => {
  const base = zaiseiWatchPage(periods, SITE);
  const withK = zaiseiWatchPage(periods, SITE, kessan);
  const tableOf = (h) => h.match(/<table class="zaisei-table zaisei-table--indicators"[\s\S]*?<\/table>/)[0];
  assert.equal(tableOf(withK), tableOf(base));
  assert.ok(!base.includes('id="kessan"'));
  assert.ok(withK.indexOf("主要指標") < withK.indexOf('id="kessan"'));
  assert.ok(withK.indexOf('id="kessan"') < withK.indexOf("財政用語の解説"));
  // 半期の指標は、半期データ（r8-06）の数値のまま
  assert.match(textOf(base), /63億1,296万円/);
  assert.match(textOf(base), /678億5,073万円/);
});

test("既存ページの注記：基金の基準日・市債の基準日・基金及び出資金との比較・9月末と年度末（決算の有無によらず表示）", () => {
  for (const html of [zaiseiWatchPage(periods, SITE), zaiseiWatchPage(periods, SITE, kessan)]) {
    const t = textOf(html);
    assert.match(t, /3月31日現在の残高と、出納整理期間[^。]*決算の年度末残高が異なります/);
    assert.match(t, /市債は、半期の財政状況の項目ごとに基準日を確認する必要があります/);
    assert.match(t, /「基金及び出資金」は基金に出資金及び出捐金を加えた合計で、決算の基金残高[^。]*単純に比較できません/);
    assert.match(t, /9月末と年度末の比較は、年度末どうしの前年比ではありません/);
  }
});

test("FAQ：決算の節に合わせて更新し、構造化データ（FAQPage）と表示が一致する", () => {
  const html = zaiseiWatchPage(periods, SITE, kessan);
  const t = textOf(html);
  assert.match(t, /Q\. 「決算」と、年2回公表される「財政状況」は何が違いますか/);
  assert.match(t, /Q\. 基金の金額が、資料によって違うのはなぜですか/);
  assert.match(t, /実質収支は16億7,129万円のプラスです（市公表・本会議の認定前）/);
  assert.match(t, /認定された時点で、このページの表示を更新します/);
  const ld = JSON.parse(html.match(/"@type":"FAQPage"[\s\S]*?<\/script>/) ? html.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"FAQPage"[\s\S]*?)<\/script>/)[1] : "{}");
  const names = ld.mainEntity.map((q) => q.name);
  assert.ok(names.includes("基金の金額が、資料によって違うのはなぜですか？"));
  assert.equal(names.length, (t.match(/Q\. /g) ?? []).length);
  // 決算なしの従来の回答は変えない
  assert.match(textOf(zaiseiWatchPage(periods, SITE)), /黒字・赤字を判定する決算資料ではありません。宝塚市は令和8年3月に策定/);
});

test("lastmod：半期データと決算の新しい方。ビルド日は使わない", () => {
  assert.equal(zaiseiPageLastmod(periods, null), zaiseiLastmod(periods));
  assert.equal(zaiseiPageLastmod(periods, { pageUpdatedAt: "2026-12-01" }), "2026-12-01");
  assert.equal(zaiseiPageLastmod(periods, { pageUpdatedAt: "2026-01-01" }), zaiseiLastmod(periods), "半期側が新しければ半期側");
  assert.throws(() => zaiseiPageLastmod(periods, { pageUpdatedAt: "2026/12/01" }));
  assert.equal(zaiseiPageLastmod([], { pageUpdatedAt: "2026-12-01" }), "2026-12-01");
  assert.equal(zaiseiPageLastmod(periods, kessan), [zaiseiLastmod(periods), kessan.pageUpdatedAt].sort().at(-1));
  assert.match(zaiseiPageLastmod(periods, kessan), /^\d{4}-\d{2}-\d{2}$/);
});

test("分離：決算データは data/zaisei/ に置かない。置き場所が違うので半期の公表期として読まれない", () => {
  const files = fs.readdirSync(path.join(ROOT, "data", "zaisei"));
  assert.deepEqual(files.sort(), ["r7-12.json", "r8-06.json"]);
  assert.ok(periods.every((p) => typeof p.period === "string" && p.fiscalYear === undefined));
});

test("loadZaiseiKessan：ディレクトリが無ければ空、不正なデータはビルドを止め、年度の新しい順に返す", () => {
  assert.deepEqual(loadZaiseiKessan(path.join(os.tmpdir(), "no-such-dir-zaisei-kessan")), []);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kessan-"));
  try {
    const older = clone(kessan);
    older.fiscalYear = 2024;
    fs.writeFileSync(path.join(tmp, "r6.json"), JSON.stringify(older));
    fs.writeFileSync(path.join(tmp, "r7.json"), JSON.stringify(kessan));
    assert.deepEqual(loadZaiseiKessan(tmp).map((k) => k.fiscalYear), [2025, 2024]);
    const broken = clone(kessan);
    broken.generalAccount.current.realBalance = 0;
    fs.writeFileSync(path.join(tmp, "r8.json"), JSON.stringify(broken));
    assert.throws(() => loadZaiseiKessan(tmp), /r8\.json/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
