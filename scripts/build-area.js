// まちカルテ（町丁目別の生活情報ページ）を生成する。
// build.js の完了後に実行し、public/ にページを追加したうえで sitemap.xml と search-index.json に追記する。
// build.js / templates.js は変更せず、templates.js の共通レイアウトだけを利用する。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { layout, escapeHtml, icon, adsAllowedFor } from "./templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const AREAS_DIR = path.join(ROOT, "data", "areas");
const PUBLIC_DIR = path.join(ROOT, "public");
const SITE_URL = "https://takarazuka-today.jp";
const AREA_ROOT_PATH = "/area/";

const STATUSES = ["verified", "needs_review", "expired"];
// 出典・確認日を持つ情報ブロック。公開してよいのは status が verified のものだけ
const BLOCK_KEYS = ["garbage", "schools", "polling", "nursery", "babyStations", "aedStations", "parks", "shops", "disasterPlan", "shelters", "hazardMap"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateArea(area, file) {
  const errors = [];
  for (const key of ["slug", "name", "fullName", "verifiedAt"]) {
    if (typeof area[key] !== "string" || area[key].trim() === "") errors.push(`${key} が空です`);
  }
  if (!area.district || !area.district.slug || !area.district.name) errors.push("district.slug / district.name が必要です");
  if (area.verifiedAt && !DATE_RE.test(area.verifiedAt)) errors.push("verifiedAt は YYYY-MM-DD 形式にしてください");
  for (const key of BLOCK_KEYS) {
    const block = area[key];
    if (block === undefined) continue;
    if (!STATUSES.includes(block.status)) errors.push(`${key}.status は ${STATUSES.join(" / ")} のいずれかにしてください`);
    if (!DATE_RE.test(block.verifiedAt ?? "")) errors.push(`${key}.verifiedAt は YYYY-MM-DD 形式にしてください`);
    if (typeof block.sourceName !== "string" || block.sourceName.trim() === "") errors.push(`${key}.sourceName が空です`);
    if (typeof block.sourceUrl !== "string" || !block.sourceUrl.startsWith("https://")) errors.push(`${key}.sourceUrl は https:// のURLにしてください`);
  }
  if (errors.length > 0) {
    throw new Error(`data/areas/${file} の検証エラー:\n  - ${errors.join("\n  - ")}`);
  }
}

function loadAreas() {
  return fs
    .readdirSync(AREAS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const area = JSON.parse(fs.readFileSync(path.join(AREAS_DIR, file), "utf-8"));
      validateArea(area, file);
      return area;
    });
}

const visible = (block) => Boolean(block) && block.status === "verified";

function formatDate(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

function areaPath(area) {
  return `${AREA_ROOT_PATH}${area.district.slug}/${area.slug}/`;
}

function districtPath(district) {
  return `${AREA_ROOT_PATH}${district.slug}/`;
}

function sourceLine(block) {
  return `<p class="source-note">出典：<a href="${escapeHtml(block.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(block.sourceName)}</a>（確認日：${escapeHtml(formatDate(block.verifiedAt))}）</p>`;
}

function section(id, iconName, heading, innerHtml) {
  return `<section class="guide-section" id="${id}">
<h2>${icon(iconName)}${escapeHtml(heading)}</h2>
${innerHtml}
</section>`;
}

function dataTable(headers, rows) {
  const cell = (tag, text) => `<${tag} style="padding:0.5rem;text-align:left;border-bottom:1px solid var(--color-border,#ddd);">${escapeHtml(text)}</${tag}>`;
  return `<div class="table-scroll">
<table class="data-table" style="width:100%;border-collapse:collapse;font-size:0.9rem;">
<thead><tr style="background:var(--color-surface-2,#f5f5f5);">${headers.map((h) => cell("th", h)).join("")}</tr></thead>
<tbody>
${rows.map((row) => `<tr>${row.map((c) => cell("td", c)).join("")}</tr>`).join("\n")}
</tbody>
</table>
</div>`;
}

function breadcrumbItems(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: `${SITE_URL}${item.path}` })),
  };
}

function webPageLd({ name, description, pagePath, dateModified }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: `${SITE_URL}${pagePath}`,
    inLanguage: "ja",
    ...(dateModified ? { dateModified } : {}),
    isPartOf: { "@type": "WebSite", name: "Takarazuka Today", url: `${SITE_URL}/` },
  };
}

function breadcrumbNav(items) {
  return `<nav class="breadcrumb">${items
    .map((item, i) => (i === items.length - 1 ? escapeHtml(item.name) : `<a href="${escapeHtml(item.path)}">${escapeHtml(item.name)}</a>`))
    .join(" &gt; ")}</nav>`;
}

const DATA_POLICY =
  "まちカルテは、宝塚市などの公的な情報をもとに、町丁目ごとの生活情報を整理したページです。掲載しているのは運営者が出典を確認できた情報だけで、各項目に出典と確認日を記載しています。内容は変更される場合がありますので、最新の情報は各出典をご確認ください。";

function areaSummaryItems(area) {
  const items = [];
  if (visible(area.garbage)) items.push(`ごみ収集地区 ${area.garbage.area}`);
  if (visible(area.schools)) items.push(`${area.schools.elementary.replace("宝塚市立", "")}・${area.schools.juniorHigh.replace("宝塚市立", "")}の校区`);
  if (visible(area.polling)) items.push(area.polling.pollingDistrict);
  if (visible(area.shelters)) items.push("避難所の開設区分");
  return items;
}

function areaCard(area) {
  return `<div class="rule-card"><strong><a href="${escapeHtml(areaPath(area))}">${escapeHtml(area.fullName)}のまちカルテ →</a></strong><br>${escapeHtml(areaSummaryItems(area).join("／"))}など（情報確認日：${escapeHtml(formatDate(area.verifiedAt))}）</div>`;
}

function areaPage(area) {
  const pagePath = areaPath(area);
  const canonicalUrl = `${SITE_URL}${pagePath}`;
  const title = `宝塚市${area.name}の生活情報｜ごみ・学校区・防災・子育て｜宝塚Today`;
  const description = `宝塚市${area.name}のごみ収集日、学校区、投票所、保育所、AED、公園、防災・避難所などの生活情報を、公的情報をもとにまとめています。`;
  const crumbs = [
    { name: "宝塚Today", path: "/" },
    { name: "まちカルテ", path: AREA_ROOT_PATH },
    { name: area.district.name, path: districtPath(area.district) },
    { name: area.name, path: pagePath },
  ];

  const parts = [];
  const g = area.garbage;
  if (visible(g)) {
    parts.push(
      section(
        "garbage",
        "calendar",
        `ごみの収集日（地区${g.area}）`,
        `<p>${escapeHtml(area.name)}は、宝塚市のごみ収集地区「${escapeHtml(g.area)}」です。</p>
${dataTable(["ごみの種類", "収集日"], g.schedule.map((s) => [s.type, s.days]))}
${g.calendar ? `<p>月ごとの収集日は<a href="${escapeHtml(g.calendar.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(g.calendar.sourceName)}</a>で確認できます。</p>` : ""}
${sourceLine(g)}`,
      ),
    );
  }
  const sc = area.schools;
  if (visible(sc)) {
    parts.push(
      section(
        "schools",
        "book",
        "通学区域（学校区）",
        `<div class="rule-card"><strong>小学校：</strong>${escapeHtml(sc.elementary)}<br><strong>中学校：</strong>${escapeHtml(sc.juniorHigh)}</div>
${sourceLine(sc)}`,
      ),
    );
  }
  const po = area.polling;
  if (visible(po)) {
    parts.push(
      section(
        "polling",
        "building",
        "投票所",
        `<div class="rule-card"><strong>投票区：</strong>${escapeHtml(po.pollingDistrict)}（${escapeHtml(po.coverage)}）<br><strong>投票所：</strong>${escapeHtml(po.place)}</div>
<div class="note-box">選挙の際は、お手元の投票所入場整理券や宝塚市選挙管理委員会の最新情報もあわせてご確認ください。</div>
${sourceLine(po)}`,
      ),
    );
  }
  const childParts = [];
  const nu = area.nursery;
  if (visible(nu)) {
    childParts.push(`<div class="rule-card"><strong>${escapeHtml(nu.name)}</strong><br>所在地：${escapeHtml(nu.address)}<br>開所時間：${escapeHtml(nu.openingHours)}<br>駐車場：${escapeHtml(nu.parking)}</div>
${sourceLine(nu)}`);
  }
  const bs = area.babyStations;
  if (visible(bs)) {
    childParts.push(`<div class="rule-card"><strong>赤ちゃんの駅</strong><br>${bs.facilities.map((f) => `${escapeHtml(f.name)}（利用可能時間：${escapeHtml(f.availableHours)}）`).join("<br>")}</div>
<div class="note-box">赤ちゃんの駅の利用可能時間は、保育所の開所時間とは異なります。</div>
${sourceLine(bs)}`);
  }
  if (childParts.length > 0) parts.push(section("childcare", "child", "子育て施設", childParts.join("\n")));
  const aed = area.aedStations;
  if (visible(aed)) {
    parts.push(
      section(
        "aed",
        "shield",
        "AED（まちかど救急ステーション）",
        `<p>宝塚市の「まちかど救急ステーション」として、${escapeHtml(area.name)}の${aed.facilities.length}施設を確認しています。</p>
${aed.facilities.map((f) => `<div class="rule-card"><strong>${escapeHtml(f.name)}</strong><br>所在地：${escapeHtml(f.address)}</div>`).join("\n")}
<div class="note-box">掲載している施設のほかにAEDがないという意味ではありません。</div>
${sourceLine(aed)}`,
      ),
    );
  }
  const pk = area.parks;
  if (visible(pk)) {
    parts.push(
      section(
        "parks",
        "sun",
        "公園",
        `${pk.parks.map((p) => `<div class="rule-card"><strong>${escapeHtml(p.name)}</strong><br>所在地：${escapeHtml(p.address)}</div>`).join("\n")}
${sourceLine(pk)}`,
      ),
    );
  }
  const sh = area.shops;
  if (visible(sh)) {
    parts.push(
      section(
        "shops",
        "building",
        "買い物",
        `<div class="rule-card"><strong>確認済みの${escapeHtml(sh.category)}：</strong>${sh.shops.map((s) => escapeHtml(s.name)).join("、")}</div>
${sourceLine(sh)}`,
      ),
    );
  }

  // 防災は通常の項目と区別し、冒頭に注意文を置く。独自の安全・危険の判定は行わない
  const bosaiParts = [];
  const dp = area.disasterPlan;
  if (visible(dp)) {
    bosaiParts.push(`<div class="rule-card"><strong>地区防災計画：</strong>${escapeHtml(area.name)}は「${escapeHtml(dp.community)}」の地区防災計画の対象です。</div>
${sourceLine(dp)}`);
  }
  const st = area.shelters;
  if (visible(st)) {
    bosaiParts.push(`<p>宝塚市の避難所・避難地等一覧に記載された、次の施設の開設区分です。</p>
${dataTable(["施設", "区分", "浸水時", "土砂災害時"], st.facilities.map((f) => [f.name, f.type, f.flood, f.landslide]))}
${sourceLine(st)}`);
  }
  const hm = area.hazardMap;
  if (visible(hm)) {
    bosaiParts.push(`<div class="rule-card"><strong>防災マップ：</strong>浸水や土砂災害のおそれがある区域は、<a href="${escapeHtml(hm.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(hm.sourceName.replace("宝塚市公式サイト", "").replace(/[「」]/g, ""))}</a>（宝塚市公式サイト）で確認できます。</div>
${sourceLine(hm)}`);
  }
  if (bosaiParts.length > 0) {
    parts.push(
      section(
        "bosai",
        "alert",
        "防災・避難所",
        `<div class="disclosure-box">災害の種類や状況によって、開設される避難所は異なります。実際に避難するときは、宝塚市の最新の避難所開設情報を確認してください。</div>
${bosaiParts.join("\n")}`,
      ),
    );
  }

  const bodyHtml = `${breadcrumbNav(crumbs)}
<div class="page-content">
<h1>宝塚市${escapeHtml(area.name)}｜まちカルテ</h1>
<p class="lead">宝塚市${escapeHtml(area.name)}のごみ収集日、学校区、投票所、子育て施設、AED、公園、防災・避難所などの生活情報を、公的な情報をもとにまとめました。</p>
<p class="updated-at">情報確認日：${escapeHtml(formatDate(area.verifiedAt))}</p>
<div class="disclosure-box">${escapeHtml(DATA_POLICY)}</div>
${parts.join("\n")}
<section class="guide-section">
<h2>${icon("newspaper")}関連リンク</h2>
<div class="related-links">
<a href="${escapeHtml(districtPath(area.district))}">${escapeHtml(area.district.name)}のまちカルテ一覧 →</a>
<a href="${AREA_ROOT_PATH}">まちカルテのトップ →</a>
<a href="/category/kurashi/gomi-guide">宝塚市のごみ出しガイド →</a>
<a href="/category/bosai/guide">宝塚市の防災ガイド →</a>
</div>
</section>
</div>`;

  return layout({
    title,
    description,
    bodyHtml,
    canonicalUrl,
    structuredData: [webPageLd({ name: `宝塚市${area.name}｜まちカルテ`, description, pagePath, dateModified: area.verifiedAt }), breadcrumbItems(crumbs)],
    adsAllowed: adsAllowedFor({ category: "", pathname: pagePath }),
  });
}

function districtPage(district, areas) {
  const pagePath = districtPath(district);
  const title = `宝塚市${district.name}のまちカルテ｜町丁目別の生活情報｜宝塚Today`;
  const description = `宝塚市${district.name}の町丁目ごとに、ごみ収集日・学校区・投票所・防災などの生活情報をまとめた「まちカルテ」の一覧です。`;
  const crumbs = [
    { name: "宝塚Today", path: "/" },
    { name: "まちカルテ", path: AREA_ROOT_PATH },
    { name: district.name, path: pagePath },
  ];
  const bodyHtml = `${breadcrumbNav(crumbs)}
<div class="page-content">
<h1>宝塚市${escapeHtml(district.name)}｜まちカルテ</h1>
<p class="lead">宝塚市${escapeHtml(district.name)}の町丁目ごとの生活情報ページです。掲載している町丁目は順次追加します。</p>
<div class="disclosure-box">${escapeHtml(DATA_POLICY)}</div>
<section class="guide-section">
<h2>${icon("building")}掲載中の町丁目</h2>
${areas.map(areaCard).join("\n")}
</section>
<section class="guide-section">
<h2>${icon("newspaper")}関連リンク</h2>
<div class="related-links">
<a href="${AREA_ROOT_PATH}">まちカルテのトップ →</a>
</div>
</section>
</div>`;
  return layout({
    title,
    description,
    bodyHtml,
    canonicalUrl: `${SITE_URL}${pagePath}`,
    structuredData: [webPageLd({ name: `宝塚市${district.name}｜まちカルテ`, description, pagePath }), breadcrumbItems(crumbs)],
    adsAllowed: adsAllowedFor({ category: "", pathname: pagePath }),
  });
}

function areaIndexPage(districts) {
  const title = "まちカルテ｜宝塚市の町丁目別 生活情報｜宝塚Today";
  const description = "宝塚市の町丁目ごとに、ごみ収集日・学校区・投票所・子育て施設・防災などの生活情報を、公的な情報をもとにまとめた「まちカルテ」の一覧です。";
  const crumbs = [
    { name: "宝塚Today", path: "/" },
    { name: "まちカルテ", path: AREA_ROOT_PATH },
  ];
  const bodyHtml = `${breadcrumbNav(crumbs)}
<div class="page-content">
<h1>まちカルテ｜宝塚市の町丁目別 生活情報</h1>
<p class="lead">お住まいの町丁目のごみ収集日、学校区、投票所、子育て施設、AED、公園、防災・避難所などを1ページで確認できます。掲載している町丁目は順次追加します。</p>
<div class="disclosure-box">${escapeHtml(DATA_POLICY)}</div>
${districts
  .map(
    ({ district, areas }) => `<section class="guide-section">
<h2>${icon("building")}${escapeHtml(district.name)}</h2>
${areas.map(areaCard).join("\n")}
<p><a href="${escapeHtml(districtPath(district))}">${escapeHtml(district.name)}のまちカルテ一覧 →</a></p>
</section>`,
  )
  .join("\n")}
</div>`;
  return layout({
    title,
    description,
    bodyHtml,
    canonicalUrl: `${SITE_URL}${AREA_ROOT_PATH}`,
    structuredData: [webPageLd({ name: "まちカルテ｜宝塚市の町丁目別 生活情報", description, pagePath: AREA_ROOT_PATH }), breadcrumbItems(crumbs)],
    adsAllowed: adsAllowedFor({ category: "", pathname: AREA_ROOT_PATH }),
  });
}

function writePublic(urlPath, html) {
  const filePath = path.join(PUBLIC_DIR, urlPath, "index.html");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html);
}

// 何度実行しても重複しないよう、既存の /area/ エントリを除いてから追加する
function updateSitemap(entries) {
  const file = path.join(PUBLIC_DIR, "sitemap.xml");
  const xml = fs.readFileSync(file, "utf-8");
  const kept = xml
    .split("\n")
    .filter((line) => !line.includes(`<loc>${SITE_URL}${AREA_ROOT_PATH}`))
    .join("\n");
  const urls = entries.map((e) => `<url><loc>${SITE_URL}${e.path}</loc><lastmod>${e.lastmod}</lastmod></url>`).join("\n");
  if (!kept.includes("</urlset>")) throw new Error("sitemap.xml に </urlset> が見つかりません");
  fs.writeFileSync(file, kept.replace("</urlset>", `${urls}\n</urlset>`));
}

function updateSearchIndex(entries) {
  const file = path.join(PUBLIC_DIR, "search-index.json");
  const index = JSON.parse(fs.readFileSync(file, "utf-8")).filter((e) => !String(e.url ?? "").startsWith(AREA_ROOT_PATH));
  fs.writeFileSync(file, JSON.stringify([...index, ...entries]));
}

function main() {
  if (!fs.existsSync(path.join(PUBLIC_DIR, "sitemap.xml"))) {
    throw new Error("public/ が見つかりません。先に node scripts/build.js を実行してください");
  }
  const areas = loadAreas();
  const districtMap = new Map();
  for (const area of areas) {
    if (!districtMap.has(area.district.slug)) districtMap.set(area.district.slug, { district: area.district, areas: [] });
    districtMap.get(area.district.slug).areas.push(area);
  }
  const districts = [...districtMap.values()];

  writePublic(AREA_ROOT_PATH, areaIndexPage(districts));
  const sitemapEntries = [];
  const searchEntries = [
    {
      title: "まちカルテ｜宝塚市の町丁目別 生活情報",
      description: "宝塚市の町丁目ごとに、ごみ収集日・学校区・投票所・子育て施設・防災などの生活情報をまとめた一覧です。",
      category: "まちカルテ",
      keywords: "まちカルテ 町丁目 生活情報",
      url: AREA_ROOT_PATH,
    },
  ];
  const latest = areas.map((a) => a.verifiedAt).sort().at(-1);
  sitemapEntries.push({ path: AREA_ROOT_PATH, lastmod: latest });
  for (const { district, areas: districtAreas } of districts) {
    writePublic(districtPath(district), districtPage(district, districtAreas));
    sitemapEntries.push({ path: districtPath(district), lastmod: districtAreas.map((a) => a.verifiedAt).sort().at(-1) });
    for (const area of districtAreas) {
      writePublic(areaPath(area), areaPage(area));
      sitemapEntries.push({ path: areaPath(area), lastmod: area.verifiedAt });
      const keywords = [
        area.district.name,
        area.name,
        visible(area.garbage) ? `ごみ 収集日 地区${area.garbage.area}` : "",
        visible(area.schools) ? `学校区 ${area.schools.elementary} ${area.schools.juniorHigh}` : "",
        visible(area.polling) ? `投票所 ${area.polling.pollingDistrict}` : "",
        visible(area.nursery) ? area.nursery.name : "",
        visible(area.babyStations) ? "赤ちゃんの駅" : "",
        visible(area.aedStations) ? "AED まちかど救急ステーション" : "",
        visible(area.parks) ? `公園 ${area.parks.parks.map((p) => p.name).join(" ")}` : "",
        visible(area.shelters) ? `防災 避難所 ${area.shelters.facilities.map((f) => f.name).join(" ")}` : "",
      ]
        .filter(Boolean)
        .join(" ");
      searchEntries.push({
        title: `宝塚市${area.name}｜まちカルテ`,
        description: `宝塚市${area.name}のごみ収集日、学校区、投票所、保育所、AED、公園、防災・避難所などの生活情報をまとめています。`,
        category: "まちカルテ",
        keywords,
        url: areaPath(area),
      });
    }
  }
  updateSitemap(sitemapEntries);
  updateSearchIndex(searchEntries);
  console.log(`まちカルテ: ${areas.length}町丁目 / ${districts.length}地区 / sitemap +${sitemapEntries.length} / search-index +${searchEntries.length}`);
}

main();
