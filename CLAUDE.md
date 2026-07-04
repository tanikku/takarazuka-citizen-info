# 宝塚市民向け情報サイト「Takarazuka Today」 (CLAUDE.md)

このファイルはこのプロジェクト専用の設定です。
（グローバル設定 `~/.claude/CLAUDE.md` の内容も併せて適用されます）

Context消費を抑えるため、詳細はすべて以下の3ファイルに分離している。**作業前に必ず目的に応じたファイルを参照すること**。

- **[NEXT_TASK.md](./NEXT_TASK.md)** — 次にやるべきことの実行用TODOリスト。作業開始前に最初に確認する
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** — 現在の実装状況、採用済み機能、保留事項、次フェーズ候補
- **[PROJECT_RULES.md](./PROJECT_RULES.md)** — 運営ルール、記事生成ルール、SEO方針、SNS方針、ソース採用基準、自動化方針、デザイン方針
- **[DECISIONS.md](./DECISIONS.md)** — 過去の重要な意思決定とその理由（採用/不採用判断、規約調査結果、UI変更の経緯など）

簡易版の方針サマリーは [SKILL_TAKARAZUKA_TODAY.md](./SKILL_TAKARAZUKA_TODAY.md) にもある（PROJECT_RULES.mdが詳細版）。

## 新しい決定を記録する際のルール
- 実装状況が変わったら → PROJECT_STATUS.md を更新
- ルール・方針そのものが変わったら → PROJECT_RULES.md を更新
- 「なぜそう決めたか」という経緯・理由が発生したら → DECISIONS.md に追記
- タスクが完了したら → NEXT_TASK.md から該当項目を削除。新しいタスクが決まったら → NEXT_TASK.md に追記
- このCLAUDE.md自体には実装の詳細を書き戻さない（重複を防ぐため）
