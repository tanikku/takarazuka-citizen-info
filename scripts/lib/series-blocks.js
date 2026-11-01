// 「宝塚の実力」週刊連載（第2回以降）の、図解つきの記事本文を描画する部品。
// 第1弾（jitsuryoku-feature.js）と同じ .jf-* のデザインを使い、グラフ・表の割合や増減は「描画時に数値から計算」する（本文と図の食い違いを防ぐ）。
// 本文はすべてプレーンテキスト（HTML は使えない）。強調だけ **太字** で書ける。
// 記事のデータ（blocks）は承認ハッシュの対象（contentHashOf は content 全体を対象にしている）。
const POSES = {
  "madoka-think": { file: "takara-madoka-think.webp", w: 146, h: 380 },
  "madoka-guide": { file: "takara-madoka-guide.webp", w: 200, h: 380 },
  "madoka-point": { file: "takara-madoka-point.webp", w: 225, h: 380 },
  "wan-cheer": { file: "takara-wan-cheer.webp", w: 320, h: 380 },
  "wan-board": { file: "takara-wan-board.webp", w: 292, h: 380 },
};
export const BLOCK_POSES = POSES;
const LABELS = { fact: "事実", calc: "計算値", idea: "考察", hypo: "未検証の仮説", unk: "確認できないこと" };
const BOX_KINDS = ["fact", "idea", "hypo", "next"];
const SEG_CLASSES = ["a1", "a2", "a3", "nat", "soc"];
const RATE_ROLES = ["focus", "peer", "other"];
const TABLE_KINDS = ["text", "num", "delta", "pct", "sub", "add", "ratio"];
const WHO = { madoka: "まどか", wan: "たからワン" };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
const n0 = (x) => Math.round(x).toLocaleString("ja-JP");
const round1 = (x) => Math.round(x * 10) / 10;
export const fmtPct = (x, dec = 1) => `${(Math.round(x * 10 ** dec) / 10 ** dec).toFixed(dec)}%`;
const SIGN = { plus: "＋", minus: "−" };
export const fmtSigned = (x) => (x > 0 ? `${SIGN.plus}${n0(x)}` : x < 0 ? `${SIGN.minus}${n0(Math.abs(x))}` : "0");
export const fmtSignedPct = (x) => (round1(x) > 0 ? `${SIGN.plus}${fmtPct(x)}` : round1(x) < 0 ? `${SIGN.minus}${fmtPct(Math.abs(x))}` : "0.0%");
const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const isHttps = (u) => typeof u === "string" && /^https:\/\//.test(u);
const isStr = (s) => typeof s === "string" && s.trim() !== "";

// ---------- 検査 ----------
// ブロックの形の誤りを文字列で返す（空なら問題なし）。図の id は記事全体で重複させない。
export function validateBlocks(blocks, where = "blocks", ids = new Set()) {
  const errors = [];
  if (!Array.isArray(blocks) || blocks.length === 0) return [`${where}: ブロックの配列が必要です`];
  blocks.forEach((b, i) => {
    const at = `${where}[${i}]`;
    const need = (cond, msg) => { if (!cond) errors.push(`${at}(${b?.t}): ${msg}`); };
    if (!b || typeof b !== "object") { errors.push(`${at}: オブジェクトが必要です`); return; }
    const figId = () => { need(/^[a-z][a-z0-9-]*$/.test(b.id ?? ""), "id は英小文字・数字・ハイフンにしてください"); need(!ids.has(b.id), `id「${b.id}」が重複しています`); ids.add(b.id); };
    switch (b.t) {
      case "p": need(isStr(b.text), "text が必要です"); need(b.k === undefined || b.k in LABELS, "k は fact/calc/idea/hypo/unk のいずれかです"); break;
      case "h3": need(isStr(b.text), "text が必要です"); break;
      case "say": need(b.who in WHO, "who は madoka か wan です"); need(b.pose in POSES, "pose が不正です"); need(isStr(b.text), "text が必要です"); break;
      case "callout": need(isStr(b.title) && isStr(b.text), "title と text が必要です"); break;
      case "notes": need(Array.isArray(b.items) && b.items.length > 0 && b.items.every(isStr), "items（文字列の配列）が必要です"); break;
      case "source": need(isStr(b.label) && isHttps(b.url), "label と https の url が必要です"); break;
      case "sources": need(Array.isArray(b.items) && b.items.length > 0 && b.items.every((x) => isStr(x.label) && isHttps(x.url)), "items（label と https の url）が必要です"); break;
      case "bars": {
        figId(); need(isStr(b.title) && isStr(b.desc), "title と desc が必要です"); need(isNum(b.max) && b.max > 0, "max が必要です");
        const groups = Array.isArray(b.groups) ? b.groups : [];
        need(groups.length > 0, "groups が必要です");
        for (const g of groups) {
          need(isStr(g.title) && Array.isArray(g.rows) && g.rows.length > 0, "group に title と rows が必要です");
          for (const r of g.rows ?? []) { need(isStr(r.label) && isNum(r.value) && r.value >= 0, "row に label と0以上の value が必要です"); need(isNum(r.value) && r.value <= b.max, "value が max を超えています"); }
          if (g.delta) need(Number.isInteger(g.delta.a) && Number.isInteger(g.delta.b) && g.rows[g.delta.a] && g.rows[g.delta.b] && isStr(g.delta.label), "delta の a/b/label が不正です");
        }
        break;
      }
      case "stack": {
        figId(); need(isStr(b.title) && isStr(b.desc), "title と desc が必要です");
        need(Array.isArray(b.legend) && b.legend.length >= 2 && b.legend.every((l) => isStr(l.key) && isStr(l.label) && SEG_CLASSES.includes(l.cls)), "legend（key・label・cls）が必要です");
        need(Array.isArray(b.rows) && b.rows.length > 0, "rows が必要です");
        for (const r of b.rows ?? []) need(isStr(r.label) && (b.legend ?? []).every((l) => isNum(r.parts?.[l.key]) && r.parts[l.key] >= 0), "row の parts が legend と一致していません");
        break;
      }
      case "div": {
        figId(); need(isStr(b.title) && isStr(b.desc), "title と desc が必要です"); need(isNum(b.max) && b.max > 0, "max が必要です");
        need(Array.isArray(b.legend) && b.legend.length >= 1 && b.legend.every((l) => isStr(l.key) && isStr(l.label) && SEG_CLASSES.includes(l.cls)), "legend が必要です");
        need(Array.isArray(b.groups) && b.groups.length > 0, "groups が必要です");
        for (const g of b.groups ?? []) {
          need(isStr(g.title) && Array.isArray(g.rows) && g.rows.length > 0, "group に title と rows が必要です");
          for (const r of g.rows ?? []) { need(isStr(r.label) && isNum(r.value) && Math.abs(r.value) <= b.max, "row の value が不正か max を超えています"); need((b.legend ?? []).some((l) => l.key === r.key), "row の key が legend にありません"); }
        }
        break;
      }
      case "rate": {
        // 複数の街の「増減率」を、0% を中心に左右へ伸びる棒で比べる図。率は from→to から描画時に計算する
        figId(); need(isStr(b.title) && isStr(b.desc), "title と desc が必要です"); need(isNum(b.max) && b.max > 0, "max（％）が必要です");
        need(Array.isArray(b.rows) && b.rows.length >= 2, "rows が2件以上必要です");
        const names = new Set();
        for (const r of b.rows ?? []) {
          need(isStr(r.label) && !names.has(r.label), "row に重複しない label が必要です"); names.add(r.label);
          need(isNum(r.from) && r.from > 0 && isNum(r.to) && r.to >= 0, "row に from（0より大きい）と to が必要です");
          need(RATE_ROLES.includes(r.role), "row の role は focus / peer / other のいずれかです");
          if (isNum(r.from) && isNum(r.to) && r.from > 0) need(Math.abs(((r.to - r.from) / r.from) * 100) <= b.max, "増減率が max を超えています");
        }
        break;
      }
      case "table": {
        need(isStr(b.caption), "caption が必要です");
        need(Array.isArray(b.cols) && b.cols.length >= 2 && b.cols.every((c) => isStr(c.h) && TABLE_KINDS.includes(c.kind)), "cols が不正です");
        need(Array.isArray(b.rows) && b.rows.length > 0, "rows が必要です");
        const cols = b.cols ?? [];
        cols.forEach((c, ci) => {
          if (["delta", "pct", "sub", "add", "ratio"].includes(c.kind)) need(Number.isInteger(c.a) && Number.isInteger(c.b) && c.a >= 0 && c.b >= 0 && c.a < ci && c.b < ci && ["num", "delta", "sub", "add"].includes(cols[c.a]?.kind) && ["num", "delta", "sub", "add"].includes(cols[c.b]?.kind), `列${ci}の a/b は、左にある数値の列を指してください`);
        });
        for (const r of b.rows ?? []) {
          need(Array.isArray(r) && r.length === cols.length, "行の列数が cols と一致していません");
          (r ?? []).forEach((v, ci) => {
            const k = cols[ci]?.kind;
            if (k === "text") need(isStr(v), "text 列には文字列が必要です");
            else if (k === "num") need(v === null || isNum(v) || (v && Array.isArray(v.sum) && v.sum.length > 0 && v.sum.every(isNum)), "num 列には数値・{sum:[…]}・null のいずれかが必要です");
            else need(v === null, "計算列のセルは null にしてください");
          });
        }
        break;
      }
      case "compare": need(isStr(b.caption) && Array.isArray(b.items) && b.items.length > 0 && b.items.every((x) => isStr(x.h) && Array.isArray(x.cells) && x.cells.length >= 2 && x.cells.every((y) => isStr(y.city) && isStr(y.text))), "caption と items（h・cells[city,text]）が必要です"); break;
      case "details": need(isStr(b.summary), "summary が必要です"); errors.push(...validateBlocks(b.blocks, `${at}.blocks`, ids)); break;
      case "sum": need(Array.isArray(b.boxes) && b.boxes.length > 0 && b.boxes.every((x) => BOX_KINDS.includes(x.kind) && isStr(x.title) && Array.isArray(x.items) && x.items.length > 0 && x.items.every(isStr)), "boxes（kind・title・items）が必要です"); break;
      case "next": need(isStr(b.title) && isStr(b.text), "title と text が必要です"); need(b.href === undefined || (typeof b.href === "string" && /^\/[a-z0-9\-/]*$/.test(b.href) && isStr(b.linkText)), "href はサイト内の絶対パス、linkText が必要です"); break;
      case "stats": need(isStr(b.aria) && Array.isArray(b.items) && b.items.length > 0 && b.items.every((x) => isStr(x.label) && isStr(x.sub) && Array.isArray(x.values) && x.values.length === 2 && x.values.every((v) => isStr(v.city) && isStr(v.num))), "stats の形が不正です"); break;
      default: errors.push(`${at}: 不明なブロック「${b.t}」`);
    }
  });
  return errors;
}

// ---------- 表のセルの計算 ----------
export function cellValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return v.sum.reduce((a, x) => a + x, 0);
  return v;
}
export function tableRowValues(cols, row) {
  const out = [];
  cols.forEach((c, i) => {
    if (c.kind === "text") out.push(row[i]);
    else if (c.kind === "num") out.push(cellValue(row[i]));
    else {
      const a = out[c.a], b = out[c.b];
      if (a === null || b === null || a === undefined || b === undefined) out.push(null);
      else if (c.kind === "delta") out.push(b - a);
      else if (c.kind === "pct") out.push(((b - a) / a) * 100);
      else if (c.kind === "sub") out.push(a - b);
      else if (c.kind === "add") out.push(a + b);
      else out.push((a / b) * 100); // ratio: a ÷ b × 100
    }
  });
  return out;
}
const fmtCell = (c, v) => {
  if (v === null || v === undefined) return "—";
  if (c.kind === "text") return esc(v);
  if (c.kind === "pct") return fmtSignedPct(v);
  if (c.kind === "ratio") return fmtPct(v, c.dec ?? 1);
  if (c.kind === "delta" || c.kind === "sub" || c.kind === "add") return fmtSigned(v);
  if (c.dec) return v.toLocaleString("ja-JP", { minimumFractionDigits: c.dec, maximumFractionDigits: c.dec });
  return n0(v);
};

// ---------- 部品 ----------
const label = (k) => `<span class="jf-label jf-label--${k}">${LABELS[k]}</span>`;
const say = (who, pose, text) => {
  const p = POSES[pose];
  return `<div class="jf-say jf-say--${who}"><img class="jf-say__img" src="/characters/poses/${p.file}" alt="" width="${p.w}" height="${p.h}" loading="lazy" decoding="async"><p class="jf-say__bubble"><span class="jf-say__who">${WHO[who]}</span>${rich(text)}</p></div>`;
};
const figure = (b, inner) => `<figure class="jf-figure" aria-labelledby="${b.id}-t" aria-describedby="${b.id}-d"><figcaption><strong id="${b.id}-t" class="jf-figure__title">${esc(b.title)}</strong><span id="${b.id}-d" class="jf-figure__desc">${esc(b.desc)}</span></figcaption>${inner}</figure>`;
const legend = (items) => `<ul class="jf-legend" role="list">${items.map((l) => `<li><i class="jf-key jf-key--${l.cls}" aria-hidden="true"></i>${esc(l.label)}</li>`).join("")}</ul>`;

function barsHtml(b) {
  const groups = b.groups.map((g) => {
    const rows = g.rows.map((r, i) => `<li class="jf-bar${r.hl ? " is-self" : ""}"><span class="jf-bar__name">${esc(r.label)}</span><span class="jf-bar__track" aria-hidden="true"><span class="jf-bar__fill" style="width:${((r.value / b.max) * 100).toFixed(2)}%"></span></span><span class="jf-bar__val">${n0(r.value)}${esc(b.suffix ?? "")}</span></li>`).join("");
    let delta = "";
    if (g.delta) {
      const from = g.rows[g.delta.a].value, to = g.rows[g.delta.b].value;
      delta = `<p class="jf-grp__delta">${label("calc")}${esc(g.delta.label)}：${fmtSigned(to - from)}${esc(b.suffix ?? "")}（${fmtSignedPct(((to - from) / from) * 100)}）</p>`;
    }
    return `<div class="jf-grp"><h3 class="jf-grp__title">${esc(g.title)}</h3><ul class="jf-bars" role="list">${rows}</ul>${delta}</div>`;
  }).join("");
  return figure(b, `${groups}${b.unit ? `<p class="jf-unit">${esc(b.unit)}</p>` : ""}`);
}

function stackHtml(b) {
  const rows = b.rows.map((r) => {
    const total = b.legend.reduce((s, l) => s + r.parts[l.key], 0);
    const shares = b.legend.map((l) => ({ l, pct: (r.parts[l.key] / total) * 100 }));
    const aria = `${r.label}：${shares.map((s) => `${s.l.label} ${fmtPct(s.pct)}`).join("、")}`;
    return `<li class="jf-stack${r.hl ? " is-self" : ""}"><span class="jf-stack__name">${esc(r.label)}</span><span class="jf-stack__bar" role="img" aria-label="${esc(aria)}">${shares.map((s) => `<span class="jf-seg jf-seg--${s.l.cls}" style="width:${s.pct.toFixed(2)}%"></span>`).join("")}</span><span class="jf-stack__nums">${shares.map((s) => `<span><i class="jf-key jf-key--${s.l.cls}" aria-hidden="true"></i>${esc(s.l.label)} <b>${fmtPct(s.pct)}</b></span>`).join("")}</span></li>`;
  }).join("");
  return figure(b, `${legend(b.legend)}<ul class="jf-stacks" role="list">${rows}</ul>${b.unit ? `<p class="jf-unit">${esc(b.unit)}</p>` : ""}`);
}

function divHtml(b) {
  const cls = Object.fromEntries(b.legend.map((l) => [l.key, l.cls]));
  const groups = b.groups.map((g) => {
    const rows = g.rows.map((r) => {
      const w = Math.min(50, (Math.abs(r.value) / b.max) * 50);
      const left = r.value >= 0 ? 50 : 50 - w;
      return `<li class="jf-div"><span class="jf-div__name">${esc(r.label)}</span><span class="jf-div__track" aria-hidden="true"><span class="jf-div__fill jf-div__fill--${cls[r.key]}${r.value < 0 ? " is-neg" : ""}" style="left:${left.toFixed(2)}%;width:${w.toFixed(2)}%"></span><span class="jf-div__zero"></span></span><span class="jf-div__val">${fmtSigned(r.value)}${esc(b.suffix ?? "")}</span></li>`;
    }).join("");
    return `<div class="jf-grp"><h3 class="jf-grp__title">${esc(g.title)}</h3><ul class="jf-divs" role="list">${rows}</ul></div>`;
  }).join("");
  return figure(b, `${legend(b.legend)}${groups}<p class="jf-baseline"><span class="jf-baseline__mark" aria-hidden="true"></span>縦線は0（増減なし）。左に伸びる棒は減った人数、右に伸びる棒は増えた人数です。</p>${b.unit ? `<p class="jf-unit">${esc(b.unit)}</p>` : ""}`);
}

// 増減率の図。棒の長さは 率÷max の絶対値（0% の位置を中央に置く）。右が増加・左が減少。
// 色だけに頼らず、街名・「＋／−」の符号つきの率・人数（別の数字）・「深掘り」の文字、棒の模様と枠でも区別できる
function rateHtml(b) {
  const rows = b.rows.map((r) => {
    const diff = r.to - r.from;
    const pct = (diff / r.from) * 100;
    const w = Math.min(50, (Math.abs(pct) / b.max) * 50);
    const left = pct >= 0 ? 50 : 50 - w;
    const dir = diff > 0 ? "増加" : diff < 0 ? "減少" : "増減なし";
    const aria = `${r.label}：${n0(r.from)}人から${n0(r.to)}人へ、${n0(Math.abs(diff))}人${dir}、増減率${fmtSignedPct(pct)}`;
    const tag = r.role === "other" ? "" : `<span class="jf-rate__tag">深掘り</span>`;
    return `<li class="jf-rate jf-rate--${r.role}" aria-label="${esc(aria)}"><span class="jf-rate__name">${esc(r.label)}${tag}</span><span class="jf-rate__track" aria-hidden="true"><span class="jf-rate__fill${pct < 0 ? " is-neg" : ""}" style="left:${left.toFixed(2)}%;width:${w.toFixed(2)}%"></span><span class="jf-rate__zero"></span></span><span class="jf-rate__val"><b>${fmtSignedPct(pct)}</b><span class="jf-rate__ppl">（${fmtSigned(diff)}人）</span></span></li>`;
  }).join("");
  const key = `<ul class="jf-legend" role="list"><li><i class="jf-key jf-key--rfocus" aria-hidden="true"></i>宝塚市（深掘り・枠つきの濃い棒）</li><li><i class="jf-key jf-key--rpeer" aria-hidden="true"></i>流山市（深掘り・斜線の棒）</li><li><i class="jf-key jf-key--rother" aria-hidden="true"></i>ほかの4市（淡い棒）</li></ul>`;
  return figure(b, `${key}<ul class="jf-rates" role="list">${rows}</ul><p class="jf-baseline"><span class="jf-baseline__mark" aria-hidden="true"></span>縦線は0%（増減なし）。右に伸びる棒は増えた割合、左に伸びる棒は減った割合です。かっこの中は人数です。</p>${b.unit ? `<p class="jf-unit">${esc(b.unit)}</p>` : ""}`);
}

function tableHtml(b) {
  const head = `<tr>${b.cols.map((c, i) => `<th scope="col"${c.kind === "text" && i > 0 ? ' class="is-text"' : ""}>${esc(c.h)}</th>`).join("")}</tr>`;
  const body = b.rows.map((r) => {
    const vals = tableRowValues(b.cols, r);
    return `<tr>${b.cols.map((c, i) => (i === 0 && c.kind === "text" ? `<th scope="row">${esc(vals[i])}</th>` : `<td${c.kind === "text" ? ' class="is-text"' : ""}>${c.kind === "text" ? rich(vals[i]) : fmtCell(c, vals[i])}</td>`)).join("")}</tr>`;
  }).join("");
  return `<div class="jf-table-wrap" tabindex="0" role="region" aria-label="表（幅が足りないときは横にスクロールできます）"><table class="jf-table${b.textual ? " jf-table--text" : ""}"><caption>${esc(b.caption)}</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>${b.note ? `<p class="jf-small">${rich(b.note)}</p>` : ""}`;
}

export function renderBlock(b) {
  switch (b.t) {
    case "p": return `<p>${b.k ? label(b.k) : ""}${rich(b.text)}</p>`;
    case "h3": return `<h3 class="jf-h3">${esc(b.text)}</h3>`;
    case "say": return say(b.who, b.pose, b.text);
    case "callout": return `<div class="jf-callout"><p class="jf-callout__title">${esc(b.title)}</p><p>${rich(b.text)}</p></div>`;
    case "notes": return `<ul class="jf-notes">${b.items.map((t) => `<li>${rich(t)}</li>`).join("")}</ul>`;
    case "source": return `<p class="jf-source">出典：<a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.label)}</a></p>`;
    case "compare": return `<section class="jf-cmp" aria-label="${esc(b.caption)}"><h3 class="jf-cmp__cap">${esc(b.caption)}</h3>${b.items.map((x) => `<div class="jf-cmp__item"><h4 class="jf-cmp__h">${esc(x.h)}</h4><div class="jf-cmp__cells">${x.cells.map((y) => `<div class="jf-cmp__cell"><p class="jf-cmp__city">${esc(y.city)}</p><p>${rich(y.text)}</p></div>`).join("")}</div></div>`).join("")}</section>`;
    case "sources": return `<p class="jf-source">出典：${b.items.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a>`).join("／")}</p>`;
    case "bars": return barsHtml(b);
    case "stack": return stackHtml(b);
    case "div": return divHtml(b);
    case "rate": return rateHtml(b);
    case "table": return tableHtml(b);
    case "details": return `<details class="jf-details"><summary>${esc(b.summary)}</summary>${b.blocks.map(renderBlock).join("\n")}</details>`;
    case "sum": return `<div class="jf-sum">${b.boxes.map((x) => `<section class="jf-sum__box jf-sum__box--${x.kind}"><h3>${x.kind === "next" ? "" : label(x.kind)}${esc(x.title)}</h3><ul>${x.items.map((t) => `<li>${rich(t)}</li>`).join("")}</ul></section>`).join("")}</div>`;
    case "next": return `<aside class="jf-next" aria-label="次回予告"><p class="jf-next__tag">次回予告</p><p class="jf-next__title">${esc(b.title)}</p><p>${rich(b.text)}</p>${b.href ? `<p><a href="${esc(b.href)}">${esc(b.linkText)}</a></p>` : ""}</aside>`;
    case "stats": return `<ul class="jf-stats jf-stats--duo" role="list" aria-label="${esc(b.aria)}">${b.items.map((x) => `<li class="jf-stat jf-stat--duo"><span class="jf-stat__lbl">${esc(x.label)}</span><span class="jf-duo">${x.values.map((v) => `<span class="jf-duo__v"><span class="jf-stat__city">${esc(v.city)}</span><b class="jf-stat__num">${esc(v.num)}</b></span>`).join("")}</span><span class="jf-stat__sub">${esc(x.sub)}</span></li>`).join("")}</ul>`;
    default: throw new Error(`不明なブロック: ${b.t}`);
  }
}
export const renderBlocks = (blocks) => blocks.map(renderBlock).join("\n");
