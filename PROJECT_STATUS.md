# PROJECT_STATUS.md — 宝塚Today 実装状況

このファイルは「今、何が実装済みで、何が保留中か」のスナップショット。
判断理由・経緯は[[DECISIONS.md]]、ルール・方針は[[PROJECT_RULES.md]]を参照。

## サイト基本情報
- 公開URL：https://takarazuka-today.jp （独自ドメイン、スタードメイン取得・Cloudflare DNS管理）
- 旧URL：https://takarazuka-citizen-info.pages.dev （生存中・リダイレクトなし。新ドメインのみ正規運用）
- GitHubリポジトリ：https://github.com/tanikku/takarazuka-citizen-info
- デプロイ：Cloudflare Pages（`main`ブランチpushで自動デプロイ。Build command=`npm run build`／output=`public`）

## 採用済み機能（実装済み）

### コンテンツ・データソース
- 宝塚市公式サイト（RSS）／兵庫県公式サイト（cheerio）／兵庫県警察（cheerio）の3ソースから記事取得
- 市議会ウォッチ：DiscussVisionSmart（速報・質問テーマ）＋ gijiroku.com（確定会議録、公開まで数ヶ月のタイムラグ）。いずれも自動取得は行わずClaudeが手動確認
- 議員活動サマリー（`/giin/<slug>.html`、`data/giin.json`）
- 検索流入向け固定ガイド4本：ゴミ出し／子育て支援／防災／学校情報（`data/guides/*.json`、`guidePage()`）
- 写真サムネイル：宝塚市オープンデータ34枚（`data/photos.json`、キーワードマッチで記事サムネイルに自動差し込み）
- 今日の宝塚フォト（季節別に日替わり選出、トップページ）
- 今日の宝塚パネル（気象庁データ＋イベント数＋3ソースの7日間件数）
- イベントカレンダー（`/events/`、今日／今週末／今月のタブUI）
- 人気記事ランキングの実データ化（`scripts/fetch-ranking.js`、Cloudflare GraphQL Analytics API、過去30日PV上位10件。データ不足時は新着記事にフォールバック）
- 武庫川防災情報（`/mukogawa/`、数値表示なし・リンクカードのみ）
- ライブカメラ一覧（`/livecam.html`）、宝塚エンタメ情報（歌劇公式サイトへの誘導）

### サイト構造・UI
- トップページ：日付バー→今日の宝塚パネル→クイックアクセス→今日のトピック＋フォト→トップニュース→くらしガイド導線（4列）→新着記事統合フィード（10件）→カテゴリーチップ→人気/新着→ライブカメラ→エンタメ
- カテゴリー8分類：行政・くらし／防犯／防災／イベント／子育て／教育／文化・観光／市議会（`scripts/templates.js`の`CATEGORIES`）。各カテゴリーに固有アーカイブページ
- ダークモード対応（`localStorage`永続化、FOUC対策済み）
- 自作インラインSVGアイコンセット（外部ライブラリ不使用）

### SEO・解析
- title/description/OGP/Twitterカード/JSON-LD（NewsArticle・WebSite・CollectionPage・BreadcrumbList・FAQPage）/サイトマップ/robots.txt
- Google Search Console：ドメインプロパティ（DNS TXT認証）、サイトマップ送信済み
- Cloudflare Web Analytics：ビーコン導入済み（Automatic setup）

### 自動化
- `.github/workflows/fetch-daily.yml`：毎日朝6時（JST）に`npm run fetch:all`→`npm run clean:pending`を自動実行し`data/pending/`へbotコミット。**要約作成・承認・公開は人間が手動で行う**（完全自動公開ではない）
- `scripts/clean-pending.js`：`data/pending/`の自動整理（公開済み記事と同一URL／同一URLの重複（新しい方を残す）／60日超を削除。候補JSONに`keep:true`を付けると削除対象から保護できる。終了イベントの自動判定は誤削除リスクが高いため未実装で、60日ルールで代替）

## 保留・未実装事項

| 項目 | 状態 | 理由 |
|---|---|---|
| 広報たからづか（PDF解析） | 未実装 | `pdf-parse`等の導入要否を着手時に再検討 |
| イベント情報（観光協会サイト） | 未実装 | robots.txt未確認のまま |
| 暮らし情報カテゴリ新設 | 保留 | 既存カテゴリと重複の可能性、カテゴリ数よりcontentの厚みを優先 |
| 交通情報（阪急・JR） | 見送り | 規約上の不確実性、JRは技術的にも取得困難、サイト価値への寄与が限定的 |
| 宝塚市内飲食店の開店・閉店・キャンペーン情報 | 見送り | 適法な情報源が存在しない（民間競合メディアのみが該当粒度を持つ） |
| 武庫川の水位・雨量数値表示 | 実装しない方針で確定 | 無料の信頼できる取得方法がない |
| SNS自動投稿 | 未実装・運用方針のみ確定 | 記事ごとに`sns.x`等の下書きJSONを保持。投稿は人間が手動（X優先） |
| ライブカメラ画像の直接埋め込み | 未対応 | river.go.jpの画像はJS経由のみで直接URL特定不可。ヘッドレスブラウザ非導入の方針のため保留 |

## 次フェーズ候補（優先順位付き、未着手）

1. **土台づくり**：Search Console上で全ページ（特にガイド4ページ）のインデックス状況確認・登録リクエスト。SNS（X）投稿運用の開始
2. **コンテンツの幅拡大**：検索流入向けガイドページの追加横展開（図書館・引っ越し手続き・母子手帳等）、市議会ウォッチの更新頻度向上
3. **データドリブン最適化**：Analyticsデータが十分蓄積された時点で、実際の人気・離脱ページに基づきトップページを再調整

## 開発環境
- OS: Windows 11 / シェル: PowerShell
- ローカルプレビュー：`npm run preview`（`scripts/preview-server.js`、`file://`直接オープンは不可）
