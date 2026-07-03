# Takarazuka Today — プロジェクト全体設計書

> **このファイルの目的**
> 新しい Claude Code セッションでプロジェクトを引き継ぐ際に、最初に読む概要資料です。
> 詳細ルール → `PROJECT_RULES.md` ／ 意思決定の経緯 → `DECISIONS.md` ／ 実装状況スナップショット → `PROJECT_STATUS.md`

---

## 1. サイト概要

| 項目 | 内容 |
|---|---|
| サイト名 | **Takarazuka Today**（サブタイトル：「今日の宝塚を、3分で。」） |
| 公開 URL | https://takarazuka-today.jp |
| GitHub | https://github.com/tanikku/takarazuka-citizen-info |
| デプロイ | Cloudflare Pages（`main` push で自動ビルド） |

### 目的

宝塚市民が防災・行政・市議会・暮らしの情報をすばやく・分かりやすく取得できる、信頼性の高い地域情報ポータルを構築・運営する。

### ターゲット

- 宝塚市民（全世代）
- スマートフォンユーザーを主要ターゲットとしたモバイル優先設計

### 運営方針

- **量より質**。記事数目標は設定しない
- 公式情報（宝塚市・兵庫県・兵庫県警）を要約して掲載。原文転載は禁止
- 個人運営（1人）を前提に、保守負荷の低い構成を維持する
- 自動生成した記事は必ず人間がレビューしてから公開する（完全自動公開は行わない）

---

## 2. サイト構成

### カテゴリ一覧（8分類）

| カテゴリ名 | キー | 役割 |
|---|---|---|
| 行政・くらし | `kurashi` | 市の制度・手続き・生活情報全般。最大カテゴリ |
| 防犯 | `bohan` | 兵庫県警からの情報、地域の安全情報 |
| 防災 | `bosai` | ハザードマップ・避難情報・緊急情報 |
| イベント | `event` | 市主催・地域イベント |
| 子育て | `kosodate` | 保育園・手当・子育て支援サービス |
| 教育 | `kyoiku` | 小中学校・学校情報 |
| 文化・観光 | `kanko` | 宝塚歌劇・阪神競馬場（地域施設として）・文化情報 |
| 市議会 | `shigikai` | 市議会の動向・採決結果・議員活動サマリー |

### ページ構成（概要）

```
/                         トップページ
/category/<key>.html      カテゴリアーカイブ（8ページ）
/articles/<slug>.html     個別ニュース記事（73件・公開中）
/category/<key>/<slug>.html  常設ガイドページ（11本）
/category/shigikai/gian.html  議案採決一覧
/giin/<slug>.html         議員活動サマリー
/events/                  イベントカレンダー
/mukogawa/                武庫川防災情報
/livecam.html             ライブカメラ一覧
/privacy.html /about.html /ad-policy.html /contact.html  運営系固定ページ
```

---

## 3. SEO 基本方針

### 基本スタンス

- **EEAT（専門性・権威性・信頼性・経験）を重視**する
- 出典は必ず宝塚市公式サイト等の一次情報にリンクする
- 原文・公式文章の転載は禁止。要約・言い換えで記載する

### title 設計

- ニュース記事：`{記事タイトル} | Takarazuka Today`
- ガイドページ：`{ガイドタイトル（110〜130文字圏内で検索キーワードを含む）} | Takarazuka Today`
- カテゴリ：`{カテゴリ名}の最新情報 | Takarazuka Today`

### description 設計

- 110〜140 文字を目安に、記事の要点を要約
- ガイドページは `lead` フィールドの内容をそのまま使用

### 構造化データ

| スキーマ | 対象 |
|---|---|
| `WebSite` | トップページ（サイト名・SearchAction） |
| `NewsArticle` | 個別ニュース記事 |
| `CollectionPage` | カテゴリアーカイブ |
| `BreadcrumbList` | 全ページ |
| `FAQPage` | ガイドページ（全ガイドに設置済み） |

### canonical

全ページに canonical を設置。ガイドページは `/category/{key}/{slug}.html` を正規 URL とする。

### 内部リンク方針

- 各ガイドページ末尾に `relatedLinks` で他ガイドへ相互リンクを設置
- カテゴリページ冒頭にガイドカード（`guideCard()`）で導線を設置
- トップページのクイックアクセスには最重要ガイドへのリンクを設置

### 画像利用ルール

- 宝塚市オープンデータ提供写真 34 枚のみ使用
- 記事に `PHOTO_KEYWORDS` でキーワードマッチしたサムネイルを自動差し込み
- 外部サイトからの画像取得・埋め込みは行わない

---

## 4. コンテンツポリシー

### 掲載する情報

- 宝塚市公式サイト・兵庫県公式サイト・兵庫県警からの行政情報
- 市議会の議事・採決情報（公式会議録・公式 PDF をもとに要約）
- 宝塚市が公開した写真素材
- OpenStreetMap（地図埋め込み、APIキー不要）

### 掲載しない情報

- 民間ローカルメディアの独自取材記事（転載不可）
- 阪急・JR のリアルタイム運行情報（利用規約上の不確実性）
- 競馬のレース結果・オッズ・予想（阪神競馬場は地域施設として扱う）
- 飲食店の開店・閉店・キャンペーン情報（適法な情報源が存在しない）
- 武庫川の水位・雨量の数値データ（無料の取得手段がない）
- 推測・主観・評論・ランキング・感想

### ニュース記事のルール

- valueScore（S/A/B/C）で公開範囲を制御
  - **S・A**：必ず公開。トップページの目立つ枠に表示
  - **B**：カテゴリアーカイブのみ表示（トップの目立つ枠には出さない）
  - **C**：非公開（HTML 生成・サイトマップとも対象外）
- 文字数：300〜500文字
- 事実のみ・推測禁止・誇張禁止
- 出典 URL 必須（`sourceName` + `sourceUrl` フィールド）
- `publishedAt` は情報の元の発生日を使用（再掲載日ではない）

### ガイドページのルール

- 評価性のない常設リファレンス情報（ゴミ出し・防災・手続き等）
- `data/guides/*.json` として管理し、`guidePage()` テンプレートで HTML 生成
- 目次・FAQ・関連リンク・出典情報を必ず含める
- 年度ごとに変わる情報は「公式サイトで確認」と案内し、判明後に追記する

---

## 5. 技術構成

### ビルド方法

```
npm run build    → scripts/build.js を実行し public/ に HTML 生成
npm run preview  → ローカルプレビューサーバー起動（scripts/preview-server.js）
npm run fetch:all → 全ソースから記事候補を data/pending/ に取得
```

- 静的 HTML / CSS / JavaScript のみ（フレームワーク・CMS 不使用）
- 外部ライブラリは `rss-parser`（RSS 解析）と `cheerio`（HTML 解析）のみ

### サイトマップ

`build.js` が `public/sitemap.xml` を自動生成。全 HTML ページを含む（C 評価記事は除外）。

### 記事生成フロー

```
fetch:all（自動、毎朝6時 GitHub Actions）
  → data/pending/ に候補 JSON を保存
  → Claude が内容確認・要約作成（手動）
  → data/articles/ に移動・公開（人間が承認）
  → npm run build
  → git push → Cloudflare Pages が自動デプロイ
```

### JSON-LD 生成

`scripts/templates.js` の `layout()` 関数が全ページに JSON-LD を自動注入。`structuredData` パラメータは配列対応済み（複数スキーマを1ページに設置可能）。

### 画像管理

`data/photos.json` にキーワードと画像パス（`data/photos/` 配下）を定義。`build.js` が `PHOTO_KEYWORDS` マッチで自動差し込みし、`public/photos/` にコピー。

### セキュリティ

- TURNSTILE_SECRET_KEY / RESEND_API_KEY はコード・GitHub に含めない
- Cloudflare Pages の「環境変数」でのみ設定する（お問い合わせフォーム実装時）

---

## 6. 実装済み主要コンテンツ

### 常設ガイドページ（11本）

| ガイド名 | ファイル | カテゴリ |
|---|---|---|
| ゴミ出し完全ガイド | `gomi-guide.json` | 行政・くらし |
| 子育て支援まとめ | `kosodate-guide.json` | 子育て |
| 防災ガイド | `bosai-guide.json` | 防災 |
| 学校情報ガイド | `gakko-guide.json` | 教育 |
| 行政手続きガイド（転入・住民票等） | `gyousei-tetsuzuki-guide.json` | 行政・くらし |
| 高齢者向け介護・見守りサービスガイド | `koreisha-guide.json` | 行政・くらし |
| 交通ガイド（バス・駐輪場・シェアサイクル） | `kotsu-guide.json` | 行政・くらし |
| 公共施設ガイド（図書館・公民館等） | `kyoyo-shisetsu-guide.json` | 行政・くらし |
| 阪神競馬場ガイド（地域施設） | `hanshin-keibajo-guide.json` | 文化・観光 |
| 学区・高校受験ガイド | `school-admission-guide.json` | 行政・くらし |
| 喫煙所ガイド（OSM 地図埋め込み） | `kitsuen-guide.json` | 行政・くらし |

### その他の実装済みページ

- **議案採決一覧**（`/category/shigikai/gian.html`）：宝塚市議会の採決結果・議員別賛否
- **議員活動サマリー**（`/giin/<slug>.html`）：各議員の質問テーマ・賛否記録
- **武庫川防災情報**（`/mukogawa/`）：関連リンクカードのみ（数値なし）
- **ライブカメラ一覧**（`/livecam.html`）：河川カメラへの外部リンク集
- **イベントカレンダー**（`/events/`）：今日・今週末・今月のタブ UI
- **人気記事ランキング**：Cloudflare GraphQL Analytics API から過去 30 日 PV 上位を取得

---

## 7. 今後の運営方針

### 地域ポータルとして育成する方針

- ニュース記事（旬の情報）と常設ガイド（エバーグリーンコンテンツ）の両軸で運営する
- ガイドページは検索流入の柱。毎年更新して「資産ページ」として育てる
- 市議会ウォッチは差別化コンテンツとして継続する（PV 目的ではなく媒体価値向上が目的）

### ニュースとガイドのバランス

- 平日は原則毎日ニュース記事を更新（S/A 評価のみトップ掲載）
- 緊急・災害情報は確認でき次第更新する
- ガイドページは年数回の定期確認で内容を最新化する

### Search Console を見ながら改善する運営スタイル

- 検索クエリレポートを定期確認し、表示はされているがクリックされないキーワードに専用コンテンツを作成する
- インデックス登録状況を確認し、未登録ページは「インデックス登録をリクエスト」を手動実行する
- サイトマップは build 時に自動更新されるため手動操作は不要

### マネタイズ方針

- 現在は収益なし（アクセス規模が Google AdSense の最低水準に未達）
- 優先順位：①地元店舗の有料掲載枠 → ②PR 記事 → ③広告（アクセス増後）
- 運営系固定ページ（プライバシーポリシー・運営者情報・広告掲載ポリシー）は整備済み

---

## 8. 今後の優先テーマ

| 優先度 | テーマ | 概要 |
|---|---|---|
| 高 | Search Console データ活用 | 検索クエリ分析 → 不足コンテンツの特定と追加 |
| 高 | ガイドページの継続拡充 | 引っ越し・母子手帳・福祉制度など検索ボリュームが見込めるテーマ |
| 高 | X（Twitter）投稿の継続 | 記事公開時に手動投稿（`sns.x` フィールドに下書き済み） |
| 中 | お問い合わせフォーム実装 | Cloudflare Pages Functions + Turnstile + Resend の構成。環境変数設定後に実装 |
| 中 | 市議会ウォッチの更新 | 第3回定例会（令和8年9月〜10月）の議案・採決を追跡 |
| 中 | 広報たからづか対応 | 新号発行のタイミングで Claude が PDF を直接読み取って記事化（pdf-parse 不使用） |
| 低 | 人気記事ランキングのデータ蓄積 | アクセスが増えたら自動的に実データに切り替わる（フォールバック実装済み） |
| 低 | 偏差値・入試データの追加 | school-admission-guide への追記。フェーズ 11.5 以降に検討 |

---

## 付録：よく使うコマンド

```powershell
# ビルド
npm run build

# ローカルプレビュー（http://localhost:3000）
npm run preview

# 記事候補を取得（data/pending/）
npm run fetch:all

# 候補の重複整理
npm run clean:pending

# GitHub へプッシュ（Cloudflare Pages が自動デプロイ）
git add <files>
git commit -m "メッセージ"
git push origin main
```

## 付録：重要ファイルマップ

```
scripts/
  build.js          メインビルドスクリプト
  templates.js      HTML テンプレート関数・CATEGORIES 定義・QUICK_ACCESS_ITEMS 等
  fetch-*.js        各ソースの取得スクリプト
  fetch-ranking.js  Cloudflare Analytics から PV ランキング取得
data/
  articles/         公開済みニュース記事 JSON（slug・title・summary・category・valueScore 等）
  guides/           常設ガイドページ JSON（11 本）
  pending/          未審査の記事候補
  giin.json         議員情報
  gikai-votes/      議員別賛否データ（verified: false が初期値）
  photos.json       写真キーワードマッピング
assets/
  style.css         サイト全体のスタイルシート
public/             ビルド出力（Git 管理外）
```
