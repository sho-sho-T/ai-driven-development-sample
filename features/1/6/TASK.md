---
issueNumber: 1
taskNumber: 6
status: done
branchName: feat/issue-1-task-6
worktreePath: .worktrees/issue-1-task-6
---

# Context

エラー処理・ログ出力・終了コードの整備と、主要ロジックのユニットテスト・統合テストを追加する。失敗原因が明確にわかるようにする。

# Implementation Steps

1. `anyhow` によるエラーチェインの整備
   - 各コマンドのエラーにコンテキストメッセージを付与
   - 外部コマンド（git, gh, bun, mise）の未インストール検出
2. ログ出力の統一
   - `INFO:`, `ERROR:`, `WARN:` プレフィックスの統一
   - verbose フラグ（`--verbose` / `-v`）の追加
3. 終了コードの定義
   - 0: 成功
   - 1: 一般エラー
   - 2: 引数エラー
4. ユニットテスト追加:
   - ブランチ名・パス生成のテスト
   - frontmatter パースのテスト
   - status 走査のテスト
5. 統合テスト追加（可能な範囲）:
   - テスト用 git リポジトリを作成して wt ensure/remove をテスト

# Files to Change

- `tools/aidd/src/main.rs`（verbose フラグ追加）
- `tools/aidd/src/helpers.rs`（テスト追加）
- `tools/aidd/src/frontmatter.rs`（テスト追加）
- `tools/aidd/src/commands/*.rs`（エラーハンドリング改善）
- `tools/aidd/tests/`（統合テスト）

# Verification

- [ ] `cargo test` で全テストパス
- [ ] 存在しない Issue 番号で実行した際に明確なエラーメッセージが出る
- [ ] `--verbose` フラグで詳細ログが出力される
- [ ] `mise run lint` パス

# Commit Plan

- `feat(aidd): add error handling, logging, and tests`
