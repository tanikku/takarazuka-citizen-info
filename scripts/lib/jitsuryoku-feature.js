// 「宝塚の実力。」第1弾の特集ページ（インフォグラフィック主体）。
// 数字は data/jitsuryoku/*.json に集約し、グラフ・表・本文の数字はすべてそこから計算する（数字の食い違いを防ぐ）。
// グラフは画像ではなく HTML / CSS（文字は本物のテキスト）。色だけで区別せず、値のラベル・模様・文字の説明を付ける。
import fs from "node:fs";
import path from "node:path";
import { layout } from "../templates.js";

const ORDER = ["takarazuka", "itami", "atsugi", "chigasaki", "nagareyama", "matsumoto"];
const POSES = {
  "madoka-think": { file: "takara-madoka-think.webp", w: 146, h: 380 },
  "madoka-guide": { file: "takara-madoka-guide.webp", w: 200, h: 380 },
  "madoka-point": { file: "takara-madoka-point.webp", w: 225, h: 380 },
  "wan-cheer": { file: "takara-wan-cheer.webp", w: 320, h: 380 },
  "wan-board": { file: "takara-wan-board.webp", w: 292, h: 380 },
};
export const FEATURE_POSE_FILES = Object.values(POSES).map((p) => p.file);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n0 = (x) => Math.round(x).toLocaleString("ja-JP");
const pct1 = (x) => `${(Math.round(x * 10) / 10).toFixed(1)}%`;
const okuFromSen = (sen) => sen / 100000; // 千円 → 億円
const okuFromMillion = (m) => m / 100; // 百万円 → 億円

// ---------- データの読み込みと検査 ----------
export function validateFeature(d) {
  const errors = [];
  if (!["draft", "published"].includes(d?.status)) errors.push("status は draft か published にしてください");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d?.lastUpdated ?? "")) errors.push("lastUpdated は YYYY-MM-DD にしてください");
  const ids = (d?.cities ?? []).map((c) => c.id);
  if (JSON.stringify(ids) !== JSON.stringify(ORDER)) errors.push("cities は宝塚・伊丹・厚木・茅ヶ崎・流山・松本の順に6市が必要です");
  for (const id of ORDER) {
    const r = d?.rows?.[id];
    if (!r) { errors.push(`${id}: rows がありません`); continue; }
    const t = r.tax, dn = r.daynight, ind = r.industry, rt = r.retail, p = r.population;
    for (const [grp, obj] of Object.entries({ population: p, tax: t, daynight: dn, industry: ind, retail: rt })) {
      for (const [k, v] of Object.entries(obj ?? {})) if (!(typeof v === "number" && v >= 0)) errors.push(`${id}.${grp}.${k} は0以上の数値にしてください`);
    }
    if (t.individual + t.corporate + t.fixedAsset > t.total) errors.push(`${id}: 個人+法人+固定資産税が地方税の総額を超えています`);
    if (dn.night - dn.outflow + dn.inflow !== dn.day) errors.push(`${id}: 昼間人口 ≠ 夜間人口 − 流出 + 流入`);
    if (ind.manufacturing + ind.medicalWelfare + ind.wholesaleRetail > ind.workers) errors.push(`${id}: 産業別の従業者の合計が総数を超えています`);
    if (!Array.isArray(d.landmarks?.[id]) || d.landmarks[id].length === 0) errors.push(`${id}: landmarks がありません`);
    for (const l of d.landmarks?.[id] ?? []) if (!l.name || !l.sourceUrl || !l.sourceLabel || !/^\d{4}-\d{2}-\d{2}$/.test(l.confirmedAt ?? "")) errors.push(`${id}: ${l.name ?? "?"} に出典・確認日が必要です`);
  }
  for (const k of ["population", "tax", "daynight", "industry", "retail"]) if (!d?.sources?.[k]?.url || !d?.sources?.[k]?.label) errors.push(`sources.${k} が必要です`);
  return errors;
}

export function loadFeature(file) {
  if (!fs.existsSync(file)) return null;
  const d = JSON.parse(fs.readFileSync(file, "utf-8"));
  const errors = validateFeature(d);
  if (errors.length > 0) throw new Error(`${path.basename(file)}: ${errors.join(" / ")}`);
  return d;
}

// ---------- 部品 ----------
const say = (who, pose, text) => {
  const p = POSES[pose];
  const name = who === "madoka" ? "まどか" : "たからワン";
  return `<div class="jf-say jf-say--${who}"><img class="jf-say__img" src="/characters/poses/${p.file}" alt="" width="${p.w}" height="${p.h}" loading="lazy" decoding="async"><p class="jf-say__bubble"><span class="jf-say__who">${name}</span>${esc(text)}</p></div>`;
};

const note = (items) => `<ul class="jf-notes">${items.map((t) => `<li>${t}</li>`).join("")}</ul>`;
const srcLine = (s) => `<p class="jf-source">出典：<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></p>`;
const details = (summary, inner) => `<details class="jf-details"><summary>${esc(summary)}</summary>${inner}</details>`;

// 横棒グラフ（HTML/CSS）。rows: {id, label, valueText, ratio(0-1), highlight}
function barChart({ id, title, desc, rows, unitNote, baseline = null, hatchBelow = null }) {
  const li = rows
    .map((r) => {
      const hatch = hatchBelow !== null && r.value < hatchBelow ? " is-hatch" : "";
      return `<li class="jf-bar${r.highlight ? " is-self" : ""}"><span class="jf-bar__name">${esc(r.label)}</span><span class="jf-bar__track" aria-hidden="true"><span class="jf-bar__fill${hatch}" style="width:${(r.ratio * 100).toFixed(2)}%"></span>${baseline ? `<span class="jf-bar__base" style="left:${(baseline.ratio * 100).toFixed(2)}%"></span>` : ""}</span><span class="jf-bar__val">${esc(r.valueText)}</span></li>`;
    })
    .join("");
  return `<figure class="jf-figure" aria-labelledby="${id}-t" aria-describedby="${id}-d"><figcaption><strong id="${id}-t" class="jf-figure__title">${esc(title)}</strong><span id="${id}-d" class="jf-figure__desc">${esc(desc)}</span></figcaption><ul class="jf-bars" role="list">${li}</ul>${baseline ? `<p class="jf-baseline"><span class="jf-baseline__mark" aria-hidden="true"></span>${esc(baseline.label)}</p>` : ""}${unitNote ? `<p class="jf-unit">${esc(unitNote)}</p>` : ""}</figure>`;
}

// ---------- ページ ----------
export function jitsuryokuFeaturePage(d, siteUrl) {
  const R = d.rows;
  const name = Object.fromEntries(d.cities.map((c) => [c.id, c.name]));
  const T = R.takarazuka;
  const taxShare = (id) => {
    const t = R[id].tax;
    const other = t.total - t.individual - t.corporate - t.fixedAsset;
    return { ind: (t.individual / t.total) * 100, cor: (t.corporate / t.total) * 100, fix: (t.fixedAsset / t.total) * 100, oth: (other / t.total) * 100 };
  };
  const ratio = (id) => (R[id].daynight.day / R[id].daynight.night) * 100;
  const share = (id, key) => (R[id].industry[key] / R[id].industry.workers) * 100;
  const sales = (id) => R[id].retail.sales;
  const ts = taxShare("takarazuka");

  // --- B 市税：100%積み上げ ---
  const taxRows = ORDER.map((id) => {
    const s = taxShare(id);
    const label = `${name[id]}：個人市民税 ${pct1(s.ind)}、法人市民税 ${pct1(s.cor)}、固定資産税 ${pct1(s.fix)}、その他 ${pct1(s.oth)}`;
    return `<li class="jf-stack${id === "takarazuka" ? " is-self" : ""}"><span class="jf-stack__name">${esc(name[id])}</span><span class="jf-stack__bar" role="img" aria-label="${esc(label)}"><span class="jf-seg jf-seg--ind" style="width:${s.ind.toFixed(2)}%"></span><span class="jf-seg jf-seg--cor" style="width:${s.cor.toFixed(2)}%"></span><span class="jf-seg jf-seg--fix" style="width:${s.fix.toFixed(2)}%"></span><span class="jf-seg jf-seg--oth" style="width:${s.oth.toFixed(2)}%"></span></span><span class="jf-stack__nums"><span><i class="jf-key jf-key--ind" aria-hidden="true"></i>個人 <b>${pct1(s.ind)}</b></span><span><i class="jf-key jf-key--cor" aria-hidden="true"></i>法人 <b>${pct1(s.cor)}</b></span><span><i class="jf-key jf-key--fix" aria-hidden="true"></i>固定資産税 <b>${pct1(s.fix)}</b></span></span></li>`;
  }).join("");
  const taxChart = `<figure class="jf-figure" aria-labelledby="jf-tax-t" aria-describedby="jf-tax-d"><figcaption><strong id="jf-tax-t" class="jf-figure__title">市税の内訳（6つの街・令和6年度決算）</strong><span id="jf-tax-d" class="jf-figure__desc">市税の合計を100%としたときの、個人市民税・法人市民税・固定資産税の割合です。</span></figcaption>
<ul class="jf-legend" role="list"><li><i class="jf-key jf-key--ind" aria-hidden="true"></i>個人市民税</li><li><i class="jf-key jf-key--cor" aria-hidden="true"></i>法人市民税</li><li><i class="jf-key jf-key--fix" aria-hidden="true"></i>固定資産税</li><li><i class="jf-key jf-key--oth" aria-hidden="true"></i>その他</li></ul>
<ul class="jf-stacks" role="list">${taxRows}</ul></figure>`;
  const taxTable = `<div class="jf-table-wrap" tabindex="0" role="region" aria-label="表（幅が足りないときは横にスクロールできます）"><table class="jf-table"><caption>市税の金額と割合（令和6年度決算、単位：千円）</caption><thead><tr><th scope="col">市</th><th scope="col">地方税の総額</th><th scope="col">個人市民税</th><th scope="col">法人市民税</th><th scope="col">固定資産税</th></tr></thead><tbody>${ORDER.map((id) => {
    const t = R[id].tax, s = taxShare(id);
    return `<tr><th scope="row">${esc(name[id])}</th><td>${n0(t.total)}</td><td>${n0(t.individual)}（${pct1(s.ind)}）</td><td>${n0(t.corporate)}（${pct1(s.cor)}）</td><td>${n0(t.fixedAsset)}（${pct1(s.fix)}）</td></tr>`;
  }).join("")}</tbody></table></div>`;

  // --- C 昼夜間人口比率 ---
  const dnMax = 130;
  const dnChart = barChart({
    id: "jf-dn",
    title: "昼夜間人口比率（2020年）",
    desc: "住んでいる人（夜間人口）を100としたときの、昼間にいる人（昼間人口）の割合です。100より小さいと、昼間は住んでいる人より少なくなります。",
    rows: ORDER.map((id) => ({ label: name[id], value: ratio(id), ratio: ratio(id) / dnMax, valueText: ratio(id).toFixed(2), highlight: id === "takarazuka" })),
    baseline: { ratio: 100 / dnMax, label: "縦線は100（昼間人口と夜間人口が同じ）" },
    hatchBelow: 100,
    unitNote: "しま模様の棒は100より小さい街、無地の棒は100より大きい街です。",
  });
  const dnTable = `<div class="jf-table-wrap" tabindex="0" role="region" aria-label="表（幅が足りないときは横にスクロールできます）"><table class="jf-table"><caption>昼間人口と夜間人口（2020年10月1日、単位：人）</caption><thead><tr><th scope="col">市</th><th scope="col">夜間人口</th><th scope="col">市外へ通勤・通学</th><th scope="col">市外から通勤・通学</th><th scope="col">昼間人口</th><th scope="col">比率</th></tr></thead><tbody>${ORDER.map((id) => {
    const x = R[id].daynight;
    return `<tr><th scope="row">${esc(name[id])}</th><td>${n0(x.night)}</td><td>${n0(x.outflow)}</td><td>${n0(x.inflow)}</td><td>${n0(x.day)}</td><td>${ratio(id).toFixed(2)}</td></tr>`;
  }).join("")}</tbody></table></div>`;
  const dnT = T.daynight;
  const flow = `<div class="jf-flow" role="group" aria-label="宝塚市の人の動き（2020年）"><div class="jf-flow__box"><span class="jf-flow__lbl">住んでいる人</span><b>${n0(dnT.night)}人</b></div><div class="jf-flow__mid"><div class="jf-flow__out"><span class="jf-flow__lbl">市外へ通勤・通学</span><b>−${n0(dnT.outflow)}人</b></div><div class="jf-flow__in"><span class="jf-flow__lbl">市外から通勤・通学</span><b>＋${n0(dnT.inflow)}人</b></div></div><div class="jf-flow__box is-day"><span class="jf-flow__lbl">昼間にいる人</span><b>${n0(dnT.day)}人</b></div></div>`;
  const above = ORDER.filter((id) => ratio(id) > 100).map((id) => name[id]);
  const below = ORDER.filter((id) => ratio(id) < 100).map((id) => name[id]);

  // --- D 産業 ---
  const indChart = (id, key, title, max) =>
    barChart({
      id,
      title,
      desc: "民営事業所で働く人全体を100%としたときの割合です。",
      rows: ORDER.map((c) => ({ label: name[c], value: share(c, key), ratio: share(c, key) / max, valueText: pct1(share(c, key)), highlight: c === "takarazuka" })),
    });
  const indTable = `<div class="jf-table-wrap" tabindex="0" role="region" aria-label="表（幅が足りないときは横にスクロールできます）"><table class="jf-table"><caption>民営事業所の従業者（2021年6月1日、単位：人）</caption><thead><tr><th scope="col">市</th><th scope="col">事業所数</th><th scope="col">従業者数</th><th scope="col">医療・福祉</th><th scope="col">製造業</th></tr></thead><tbody>${ORDER.map((id) => {
    const x = R[id].industry;
    return `<tr><th scope="row">${esc(name[id])}</th><td>${n0(x.establishments)}</td><td>${n0(x.workers)}</td><td>${n0(x.medicalWelfare)}（${pct1(share(id, "medicalWelfare"))}）</td><td>${n0(x.manufacturing)}（${pct1(share(id, "manufacturing"))}）</td></tr>`;
  }).join("")}</tbody></table></div>`;

  // --- E 小売業 ---
  const salesMax = 3000;
  const retailChart = barChart({
    id: "jf-retail",
    title: "小売業の年間商品販売額（2020年の1年間）",
    desc: "お店での販売額の合計です。単位は億円です。",
    rows: ORDER.map((id) => ({ label: name[id], value: sales(id), ratio: okuFromMillion(sales(id)) / salesMax, valueText: `${n0(okuFromMillion(sales(id)))}億円`, highlight: id === "takarazuka" })),
  });
  const retailTable = `<div class="jf-table-wrap" tabindex="0" role="region" aria-label="表（幅が足りないときは横にスクロールできます）"><table class="jf-table"><caption>小売業（経済センサス-活動調査・2021年6月1日現在。年間商品販売額は2020年1年間）</caption><thead><tr><th scope="col">市</th><th scope="col">事業所数</th><th scope="col">従業者数（人）</th><th scope="col">年間商品販売額（百万円）</th><th scope="col">売場面積（㎡）</th></tr></thead><tbody>${ORDER.map((id) => {
    const x = R[id].retail;
    return `<tr><th scope="row">${esc(name[id])}</th><td>${n0(x.establishments)}</td><td>${n0(x.workers)}</td><td>${n0(x.sales)}</td><td>${n0(x.floorArea)}</td></tr>`;
  }).join("")}</tbody></table></div>`;

  // --- 基本データ ---
  const baseTable = `<div class="jf-table-wrap" tabindex="0" role="region" aria-label="表（幅が足りないときは横にスクロールできます）"><table class="jf-table"><caption>比べた6つの街（人口は2025年10月1日の国勢調査）</caption><thead><tr><th scope="col">市</th><th scope="col">人口（2025年）</th><th scope="col">人口（2020年）</th><th scope="col">増減率</th><th scope="col">面積（km²）</th></tr></thead><tbody>${ORDER.map((id) => {
    const p = R[id].population;
    const r = ((p.pop2025 - p.pop2020) / p.pop2020) * 100;
    return `<tr><th scope="row">${esc(name[id])}</th><td>${n0(p.pop2025)}</td><td>${n0(p.pop2020)}</td><td>${r >= 0 ? "＋" : "−"}${Math.abs(r).toFixed(2)}%</td><td>${p.areaKm2.toFixed(2)}</td></tr>`;
  }).join("")}</tbody></table></div>`;
  const pops = ORDER.map((id) => R[id].population.pop2025);
  const popRange = `約${(Math.min(...pops) / 10000).toFixed(1)}万〜${(Math.max(...pops) / 10000).toFixed(1)}万人`;

  // --- F 街の顔 ---
  const cards = ORDER.map(
    (id) => `<section class="jf-city${id === "takarazuka" ? " is-self" : ""}" aria-labelledby="jf-city-${id}"><h3 id="jf-city-${id}" class="jf-city__name">${esc(name[id])}</h3><ul class="jf-city__list" role="list">${d.landmarks[id]
      .map((l) => `<li><span class="jf-kind">${esc(l.kind)}</span><strong>${esc(l.name)}</strong><span class="jf-city__detail">${esc(l.detail)}</span><a class="jf-city__src" href="${esc(l.sourceUrl)}" target="_blank" rel="noopener">${esc(l.sourceLabel)}（確認日 ${esc(l.confirmedAt.replace(/-/g, "."))}）</a></li>`)
      .join("")}</ul></section>`,
  ).join("");

  const sourcesHtml = `<ul class="jf-sources" role="list">${["population", "tax", "daynight", "industry", "retail"].map((k) => `<li><a href="${esc(d.sources[k].url)}" target="_blank" rel="noopener">${esc(d.sources[k].label)}</a></li>`).join("")}</ul>`;

  const draftRibbon = d.status === "draft" ? `<p class="jf-draft" role="note">公開前の確認用ページです。検索には載せていません。</p>` : "";

  const bodyHtml = `<nav class="breadcrumb"><a href="/">トップ</a> &gt; <a href="/jitsuryoku">「宝塚の実力。」</a> &gt; 第1弾</nav>
<div class="jf">
${draftRibbon}
<header class="jf-hero">
<p class="jf-hero__tag">宝塚の実力。 第1弾</p>
<h1 class="jf-hero__title">宝塚の税収と仕事、<br>ほかの街とどう違う？</h1>
<p class="jf-lead">宝塚市と、同じくらいの規模の5つの街を、公的な統計で比べました。</p>
<ul class="jf-chips" role="list"><li class="is-self">宝塚市</li>${ORDER.slice(1).map((id) => `<li>${esc(name[id])}</li>`).join("")}</ul>
<p class="jf-small">人口は${popRange}（2025年国勢調査）。伊丹市は20万人をわずかに下回り、松本市は面積が宝塚市の約${(R.matsumoto.population.areaKm2 / T.population.areaKm2).toFixed(1)}倍と、条件が違う街も含みます。</p>
<ul class="jf-stats" role="list">
<li class="jf-stat"><b class="jf-stat__num">${pct1(ts.ind)}</b><span class="jf-stat__lbl">市税のうち、個人市民税の割合</span><span class="jf-stat__sub">令和6年度（2024年度）決算</span></li>
<li class="jf-stat"><b class="jf-stat__num">${ratio("takarazuka").toFixed(2)}</b><span class="jf-stat__lbl">昼夜間人口比率（100が基準）</span><span class="jf-stat__sub">2020年国勢調査</span></li>
<li class="jf-stat"><b class="jf-stat__num">${pct1(share("takarazuka", "medicalWelfare"))}</b><span class="jf-stat__lbl">民営事業所の従業者のうち、医療・福祉の割合</span><span class="jf-stat__sub">2021年経済センサス</span></li>
</ul>
${say("madoka", "madoka-guide", "宝塚の“税金”と“仕事”を、ほかの街と並べて見てみましょう。")}
${say("wan", "wan-cheer", "数字には、ぜんぶ出典と調査年をつけています。")}
${details("比べた6つの街の基本データを見る", baseTable + srcLine(d.sources.population))}
</header>

<section class="jf-sec" aria-labelledby="jf-h-tax">
<h2 id="jf-h-tax" class="jf-h2"><span class="jf-h2__no">1</span>市の税金は、何でできている？</h2>
<p>市が集める税金（市税）の内訳を、6つの街で比べます。</p>
${taxChart}
${say("madoka", "madoka-think", "個人と会社、どちらの税金の割合が大きいの？")}
${say("wan", "wan-cheer", `宝塚は、個人市民税が${pct1(ts.ind)}。法人市民税は${pct1(ts.cor)}です。`)}
<p><span class="jf-label jf-label--fact">事実</span>6つの街の中では、個人市民税の割合がいちばん高く、法人市民税の割合がいちばん低いのが宝塚市です。茅ヶ崎市と流山市も、近い構成です。</p>
<div class="jf-callout"><p class="jf-callout__title">金額で見ると</p><p>割合と金額は、別のものです。個人市民税の金額は、宝塚市が約${n0(okuFromSen(T.tax.individual))}億円、厚木市が約${n0(okuFromSen(R.atsugi.tax.individual))}億円で、割合ほどの差はありません。厚木市は市税の総額が約${n0(okuFromSen(R.atsugi.tax.total))}億円と大きく、法人市民税（約${n0(okuFromSen(R.atsugi.tax.corporate))}億円）と固定資産税（約${n0(okuFromSen(R.atsugi.tax.fixedAsset))}億円）が大きい街です。</p></div>
<p><span class="jf-label jf-label--idea">考察</span>宝塚市の市税は、住民が納める個人市民税の比重が高い構成です。</p>
${note(["令和6年度（2024年度）決算の「地方税」（市町村税の合計）です。個人市民税は均等割＋所得割、法人市民税は均等割＋法人税割。「その他」は軽自動車税、市たばこ税、都市計画税などです。", "企業の売上は、市の税収ではありません。", "1人当たりの税額は、人口の取り方（住民基本台帳か国勢調査か）で結果が変わるため、載せていません。"])}
${srcLine(d.sources.tax)}
${details("金額と割合の表を見る", taxTable)}
</section>

<section class="jf-sec" aria-labelledby="jf-h-dn">
<h2 id="jf-h-dn" class="jf-h2"><span class="jf-h2__no">2</span>昼間、街にいる人は？</h2>
<p>昼間人口は、昼間にその街にいる人の数です。住んでいる人から、市外へ出かける人を引き、市外から来る人を足します。昼夜間人口比率は、昼間人口を夜間人口（住んでいる人）で割り、100をかけた値です。</p>
${dnChart}
${say("madoka", "madoka-point", "宝塚は、100より下なんですね。")}
${say("wan", "wan-board", `昼間にいるのは、住んでいる人の約${Math.round(ratio("takarazuka") / 10)}割です。`)}
<h3 class="jf-h3">宝塚市の人の動き（2020年）</h3>
${flow}
<p><span class="jf-label jf-label--fact">事実</span>100を下回るのは、${below.join("・")}。上回るのは、${above.join("・")}です。</p>
${note(["この数字は、住民の就業率（仕事をしている人の割合）ではありません。", "2020年10月1日現在です。2025年国勢調査の同じ集計は、この特集の作成時点で確認できていません。"])}
${srcLine(d.sources.daynight)}
${details("人数の表を見る", dnTable)}
</section>

<section class="jf-sec" aria-labelledby="jf-h-ind">
<h2 id="jf-h-ind" class="jf-h2"><span class="jf-h2__no">3</span>宝塚で働く人は、どんな仕事？</h2>
<p>市内の民営事業所で働く人のうち、医療・福祉と製造業の割合を比べます。</p>
<div class="jf-pair">
${indChart("jf-med", "medicalWelfare", "医療・福祉で働く人の割合（2021年）", 30)}
${indChart("jf-mfg", "manufacturing", "製造業で働く人の割合（2021年）", 30)}
</div>
${say("wan", "wan-board", `宝塚は、医療・福祉が${pct1(share("takarazuka", "medicalWelfare"))}。約4人に1人です。`)}
<p><span class="jf-label jf-label--fact">事実</span>宝塚市は、医療・福祉の従業者が${n0(T.industry.medicalWelfare)}人（${pct1(share("takarazuka", "medicalWelfare"))}）で、6つの街の中でいちばん高い割合です。製造業は${n0(T.industry.manufacturing)}人（${pct1(share("takarazuka", "manufacturing"))}）で、伊丹市（${pct1(share("itami", "manufacturing"))}）や厚木市（${pct1(share("atsugi", "manufacturing"))}）とは大きく違います。</p>
<p><span class="jf-label jf-label--idea">考察</span>宝塚市は、医療・福祉の比重が大きく、製造業の比重が小さい構成です。医療・福祉は茅ヶ崎市・流山市が、製造業は流山市が、宝塚市に近い割合です。</p>
${note(["2021年6月1日現在、民営事業所の従業者の割合です。国や市などの事業所（市立病院、市役所など）は含みません。", "市内の事業所で働く人の数で、市内に住む人の就業とは別の数字です。"])}
${srcLine(d.sources.industry)}
${details("人数の表を見る", indTable)}
</section>

<section class="jf-sec" aria-labelledby="jf-h-retail">
<h2 id="jf-h-retail" class="jf-h2"><span class="jf-h2__no">4</span>買い物の規模は？</h2>
<p>小売業（お店での販売）の、年間商品販売額を比べます。対象は<strong>2020年（令和2年）の1年間</strong>です。</p>
${retailChart}
${say("madoka", "madoka-guide", "宝塚は、茅ヶ崎と流山に近いですね。")}
<p><span class="jf-label jf-label--fact">事実</span>宝塚市は約${n0(okuFromMillion(sales("takarazuka")))}億円で、茅ヶ崎市（約${n0(okuFromMillion(sales("chigasaki")))}億円）、流山市（約${n0(okuFromMillion(sales("nagareyama")))}億円）に近い水準です。厚木市（約${n0(okuFromMillion(sales("atsugi")))}億円）と松本市（約${n0(okuFromMillion(sales("matsumoto")))}億円）は、それより大きくなっています。</p>
<p><span class="jf-label jf-label--hypo">未検証の仮説</span>厚木市と松本市は、昼夜間人口比率が100を上回ります。昼間に人が集まることと販売額の大きさに関係があるかは、確かめていません。</p>
${note(["国や市などの事業所は含みません。個人経営の事業所は、販売額を調べる項目がないため、販売額に含まれません。", "管理・補助的な活動のみの事業所や、産業の分類に格付けできない事業所なども含まれません。", "事業所数・従業者数・売場面積は、2021年6月1日現在です。販売額の対象年（2020年）とは異なります。", "人口当たりの金額は、商圏の違いで読み方が変わるため、載せていません。"])}
${srcLine(d.sources.retail)}
${details("事業所数・売場面積の表を見る", retailTable)}
</section>

<section class="jf-sec" aria-labelledby="jf-h-city">
<h2 id="jf-h-city" class="jf-h2"><span class="jf-h2__no">5</span>それぞれの街の顔</h2>
<p>市や企業の公式サイトで確認できたものだけを載せています（確認日は各項目に記載）。</p>
<div class="jf-cities">${cards}</div>
${note(["企業や施設があることだけで、税収や雇用への影響があるとは言えません。", "観光客数は、集計の方法が市ごとに違うため、比べていません。", "写真やロゴは、利用の条件を確認できていないため、載せていません。"])}
</section>

<section class="jf-sec" aria-labelledby="jf-h-end">
<h2 id="jf-h-end" class="jf-h2"><span class="jf-h2__no">6</span>まとめ</h2>
<div class="jf-sum">
<section class="jf-sum__box jf-sum__box--fact"><h3><span class="jf-label jf-label--fact">事実</span>確認できたこと</h3><ul><li>市税は、個人市民税が${pct1(ts.ind)}、法人市民税が${pct1(ts.cor)}（令和6年度）。</li><li>昼夜間人口比率は${ratio("takarazuka").toFixed(2)}（2020年）。</li><li>民営事業所の従業者は、医療・福祉が${pct1(share("takarazuka", "medicalWelfare"))}、製造業が${pct1(share("takarazuka", "manufacturing"))}（2021年）。</li><li>小売業の年間商品販売額は約${n0(okuFromMillion(sales("takarazuka")))}億円（2020年）。</li></ul></section>
<section class="jf-sum__box jf-sum__box--idea"><h3><span class="jf-label jf-label--idea">考察</span>ここから言えそうなこと</h3><ul><li>宝塚市は、茅ヶ崎市・流山市と同じように、市外へ通勤・通学する人が多く、住民が納める税金の比重が高い「住宅都市」の構成に近い。</li></ul></section>
<section class="jf-sum__box jf-sum__box--hypo"><h3><span class="jf-label jf-label--hypo">未検証の仮説</span>まだ確かめていないこと</h3><ul><li>大きな事業所が少ないことと、法人市民税の割合の低さに関係があるか。</li><li>昼夜間人口比率と、小売業の販売額に関係があるか。</li></ul></section>
<section class="jf-sum__box jf-sum__box--next"><h3>これから調べること</h3><ul><li>宝塚市の主要な企業・商業施設の、公式な確認。</li><li>2025年国勢調査の、昼夜間人口と産業別の就業者（公表後）。</li><li>通勤・通学の行き先の内訳。</li></ul></section>
</div>
${say("wan", "wan-board", "数字は、街の“良し悪し”ではなく、“違い”を見るためのものです。")}
<p class="jf-small">この特集は、都市や行政の優劣を決めるものではありません。</p>
${details("出典の一覧を見る", sourcesHtml)}
<p class="jf-back"><a href="/jitsuryoku">「宝塚の実力。」の企画紹介へ →</a>　<a href="/category/shigikai/zaisei-watch">宝塚市財政ウォッチへ →</a></p>
</section>
</div>`;

  const canonicalUrl = `${siteUrl}/jitsuryoku/${d.slug}`;
  const structured = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "「宝塚の実力。」", item: `${siteUrl}/jitsuryoku` },
      { "@type": "ListItem", position: 3, name: "第1弾", item: canonicalUrl },
    ],
  };
  return layout({
    title: `${d.title}｜「宝塚の実力。」第1弾｜Takarazuka Today`,
    description: d.description,
    bodyHtml,
    canonicalUrl,
    structuredData: structured,
    noindex: d.status === "draft",
  });
}
