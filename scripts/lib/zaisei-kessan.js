// 財政ウォッチの「決算」データ（data/zaisei-kessan/）。
// 半期の財政状況（data/zaisei/）とは性格が違う（予算の執行状況と、1年間の収支の結果）ため、別のディレクトリ・別の読み込みで扱う。
// data/zaisei/ に置くと loadZaiseiPeriods が公表期として読んでしまう。
// 数値は原資料（決算概要）の単位（千円）のまま持つ。
import fs from "node:fs";
import path from "node:path";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const KESSAN_AUTHORIZATION_STATUSES = ["pending", "certified"];

const ACCOUNT_KEYS = ["revenue", "expenditure", "formalBalance", "carryoverFunds", "realBalance", "singleYearBalance", "realSingleYearBalance"];

// 決算数値の整合（原資料の定義どおり）を検査する。違反は文字列の配列で返す
export function validateKessan(k) {
  const errors = [];
  const isInt = (v) => Number.isInteger(v);
  if (!isInt(k?.fiscalYear)) errors.push("fiscalYear は整数にしてください");
  if (typeof k?.fiscalYearLabel !== "string" || !k.fiscalYearLabel) errors.push("fiscalYearLabel が必要です");
  if (k?.unit !== "千円") errors.push("unit は原資料の単位「千円」にしてください");
  if (!DATE_RE.test(k?.pageUpdatedAt ?? "")) errors.push("pageUpdatedAt は YYYY-MM-DD 形式にしてください");

  if (!Array.isArray(k?.sources) || k.sources.length === 0) errors.push("sources が必要です");
  else {
    for (const s of k.sources) {
      if (!s.url || !s.label || !DATE_RE.test(s.pageUpdatedAt ?? "")) errors.push(`sources の項目が不正です: ${s.label ?? s.url}`);
    }
    const latestSource = k.sources.map((s) => s.pageUpdatedAt).sort().at(-1);
    if (DATE_RE.test(k.pageUpdatedAt ?? "") && latestSource && k.pageUpdatedAt < latestSource) {
      errors.push("pageUpdatedAt は資料の掲載ページの更新日より前にできません");
    }
  }

  const a = k?.authorization;
  if (!KESSAN_AUTHORIZATION_STATUSES.includes(a?.status)) errors.push("authorization.status は pending か certified にしてください");
  else if (a.status === "certified") {
    if (!DATE_RE.test(a.certifiedDate ?? "")) errors.push("certified には certifiedDate（YYYY-MM-DD）が必要です");
  } else {
    if (a.certifiedDate) errors.push("pending に certifiedDate は書けません（認定を先取りしない）");
    if (a.scheduledDate !== undefined && !DATE_RE.test(a.scheduledDate)) errors.push("scheduledDate は YYYY-MM-DD 形式にしてください");
  }

  for (const which of ["current", "previous"]) {
    const c = k?.generalAccount?.[which];
    if (!c) { errors.push(`generalAccount.${which} が必要です`); continue; }
    for (const key of ACCOUNT_KEYS) if (!isInt(c[key])) errors.push(`generalAccount.${which}.${key} は整数にしてください`);
    if (c.revenue - c.expenditure !== c.formalBalance) errors.push(`${which}: 形式収支 ≠ 歳入 − 歳出`);
    if (c.formalBalance - c.carryoverFunds !== c.realBalance) errors.push(`${which}: 実質収支 ≠ 形式収支 − 翌年度に繰り越すべき財源`);
  }
  const cur = k?.generalAccount?.current;
  const prev = k?.generalAccount?.previous;
  if (cur && prev && cur.realBalance - prev.realBalance !== cur.singleYearBalance) errors.push("単年度収支 ≠ 当年度の実質収支 − 前年度の実質収支");

  const f = k?.fiscalAdjustmentFund;
  if (!isInt(f?.yearEnd) || !isInt(f?.previousYearEnd)) errors.push("fiscalAdjustmentFund の残高は整数にしてください");
  const t = f?.timeline;
  if (Array.isArray(t) && t.length === 4) {
    // 3月31日現在高 + 出納整理期間中の増減 = 決算の年度末残高（円）
    if (t[1].yen + t[2].yen !== t[3].yen) errors.push("基金の3月31日現在高 + 出納整理期間中の増減 ≠ 決算の年度末残高");
    if (Math.round(t[3].yen / 1000) !== f.yearEnd) errors.push("基金の年度末残高（円）と決算概要（千円）が一致しません");
  } else errors.push("fiscalAdjustmentFund.timeline は4件にしてください");

  for (const key of ["currentAccountRatio", "realDebtServiceRatio"]) {
    const r = k?.ratios?.[key];
    if (typeof r?.value !== "number" || typeof r?.previous !== "number" || typeof r?.preliminary !== "boolean") errors.push(`ratios.${key} が不正です`);
  }

  const b = k?.bonds;
  if (b && b.generalAccount + b.cemeteryAccount !== b.balance) errors.push("市債残高 ≠ 一般会計 + 宝塚市営霊園事業費");
  if (b && b.previousGeneralAccount + b.previousCemeteryAccount !== b.previousBalance) errors.push("前年度の市債残高 ≠ 一般会計 + 宝塚市営霊園事業費");
  return errors;
}

// 年度の新しい順に並べて返す。ディレクトリが無ければ空配列。不正なデータはビルドを止める
export function loadZaiseiKessan(dir) {
  if (!fs.existsSync(dir)) return [];
  const list = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ file: f, data: JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) }));
  for (const { file, data } of list) {
    const errors = validateKessan(data);
    if (errors.length > 0) throw new Error(`data/zaisei-kessan/${file}: ${errors.join(" / ")}`);
  }
  return list.map((x) => x.data).sort((a, b) => b.fiscalYear - a.fiscalYear);
}
