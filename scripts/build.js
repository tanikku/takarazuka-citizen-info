import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { articlePage, indexPage } from "./templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "data", "articles");
const PUBLIC_DIR = path.join(ROOT, "public");
const ASSETS_DIR = path.join(ROOT, "assets");

// TODO: 独自ドメイン取得後に正式なURLへ差し替える
const SITE_URL = "https://example-takarazuka-info.pages.dev";

function loadArticles() {
  if (!fs.existsSync(ARTICLES_DIR)) return [];

  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf-8");
      return JSON.parse(raw);
    })
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

function writeFile(relativePath, content) {
  const filePath = path.join(PUBLIC_DIR, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function buildSitemap(articles) {
  const urls = [
    `${SITE_URL}/`,
    ...articles.map((article) => `${SITE_URL}/articles/${article.slug}.html`),
  ];

  const body = urls
    .map((url) => `<url><loc>${url}</loc></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function main() {
  fs.rmSync(PUBLIC_DIR, { recursive: true, force: true });

  const articles = loadArticles();

  writeFile("index.html", indexPage(articles, SITE_URL));
  for (const article of articles) {
    writeFile(`articles/${article.slug}.html`, articlePage(article, SITE_URL));
  }

  writeFile("sitemap.xml", buildSitemap(articles));
  writeFile("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  const cssSource = path.join(ASSETS_DIR, "style.css");
  writeFile("css/style.css", fs.readFileSync(cssSource, "utf-8"));

  console.log(`記事${articles.length}件をビルドしました → ${PUBLIC_DIR}`);
}

main();
