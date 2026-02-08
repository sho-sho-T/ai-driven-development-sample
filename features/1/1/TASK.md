---
issueNumber: 1
taskNumber: 1
status: done
branchName: feat/issue-1-task-1
worktreePath: .worktrees/issue-1-task-1
---

# Context

Rust CLI プロジェクトの基盤を構築する。`clap` を使用してサブコマンド構造を定義し、全コマンドのスケルトンを作成する。既存の `tools/aidd/aidd.sh` の構造を参考に、同等のサブコマンド体系を Rust で再現する。

# Implementation Steps

1. `tools/aidd/Cargo.toml` を作成（依存: `clap`, `anyhow`, `serde`, `serde_yaml`）
2. `tools/aidd/src/main.rs` にエントリポイントを作成
3. `clap` の `derive` マクロでサブコマンド構造を定義:
   - `wt ensure <issue> <task>`
   - `wt remove <issue> <task>`
   - `issue plan <issue-number>`
   - `task run <issue> <task>`
   - `task done <issue> <task>`
   - `pr create <issue> <task>`
   - `status`
4. 各サブコマンドのスケルトン（`todo!()` or placeholder）を実装
5. `cargo build` で正常にコンパイルできることを確認
6. `mise.toml` に rust ツールチェインを追加（必要な場合）

# Files to Change

- `tools/aidd/Cargo.toml`（新規）
- `tools/aidd/src/main.rs`（新規）
- `tools/aidd/src/cli.rs`（新規 - CLI定義）
- `mise.toml`（rust 追加）

# Verification

- [ ] `cargo build` が成功する
- [ ] `cargo run -- --help` でサブコマンド一覧が表示される
- [ ] `cargo run -- wt --help` でサブコマンドヘルプが表示される
- [ ] `mise run lint` パス

# Commit Plan

- `feat(aidd): scaffold Rust CLI with clap subcommands`
