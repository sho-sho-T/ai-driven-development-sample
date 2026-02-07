# DevContainer環境構築ガイド（他プロジェクト適用版）

このドキュメントは、案件 の `.devcontainer` 設定をベースに、他プロジェクトへ移植できる形で環境構築の設計と実装手順をまとめたものです。

## 1. 目的

- 開発者・AIエージェントの実行環境を統一する。
- 初回セットアップを自動化し、作業開始までの時間を短縮する。
- CLI、依存パッケージ、Git hooks、補助ツールを再現可能な形で配布する。

## 2. 先に押さえる前提

このプロジェクトの設定には、案件 固有の前提が含まれます。

- 固有CLI: `orc`, `toys3`
- 固有ディレクトリ: `worktrees`
- 固有エージェント運用: `~/.claude`, `~/.codex`

したがって、移植時は「設定ファイルを丸ごと複製」ではなく、次の粒度で移植します。

- 何を実現する設定か（目的）
- どこで設定しているか（実装ポイント）
- 何を置換・削除するか（移植判断）

### 開発での技術スタック
開発で使用する技術スタックは以下です。

- TypeScript
- tanstack start
- supabase
    - データベースを管理するために使用する(Supabase CLIを使用する)
    - アプリケーションコンテナ内でSupabase CLIを使用してデータベースを管理したい（接続方法を考える必要あり）
- Bun
- Rust
  - AI駆動開発を手助けするCLIを実装するために使用する
- gh
  - GitHubのリポジトリにあるIssueを取得したり、pull requestを作成したりするために使用する
- Codex CLI
- Claude CLI

## 3. 設定マップ（何を設定しているか）

| 設定テーマ | 何を設定しているか | このプロジェクトの実装箇所 | 他プロジェクト移植時の判断 |
|---|---|---|---|
| 実行ユーザー統一 | コンテナ内ユーザーを `vscode` に固定し、権限問題を減らす | `.devcontainer/devcontainer.json` (`remoteUser`, `containerUser`) | 基本はそのまま採用 |
| ワークスペースマウント | ソース本体は bind mount、キャッシュは volume 分離 | `.devcontainer/devcontainer.json` (`workspaceMount`, `mounts`) | プロジェクト固有volume名に置換 |
| ツールキャッシュ永続化 | `mise`, `node_modules`, Rustキャッシュを再利用し高速化 | `.devcontainer/devcontainer.json` (`mounts`) | 使うツールに応じて対象を選択 |
| AIエージェント状態保持 | `.claude/.codex/.cursor` を volume 永続化 | `.devcontainer/devcontainer.json` (`mounts`) | AIを使う場合のみ採用 |
| IDE標準設定 | 拡張、formatter、generated除外を配布 | `.devcontainer/devcontainer.json` (`customizations.vscode`) | 使用言語/formatterに合わせて置換 |
| 初回セットアップ自動化 | 依存OSパッケージ、ランタイム、依存ライブラリ導入 | `.devcontainer/post-create.sh` | 依存マネージャと導入物を置換 |
| シェル初期化 | `mise activate`、補完、alias、fzf連携 | `.devcontainer/.bashrc_project`, `.bash_profile_project` | 必要な alias のみ移植 |
| Git運用統一 | `safe.directory`, `core.hooksPath` 設定 | `.devcontainer/post-create.sh` | hooks運用するなら採用 |
| ローカル依存サービス起動 | DB等をコンテナ起動時に自動起動 | `.devcontainer/post-start.sh`, `docker-compose.yml` | 対象サービスを置換 |
| 環境診断の自動実行 | 起動時に doctor コマンドで不足設定を検知 | `.devcontainer/post-start.sh` (`orc doctor`) | 自前診断コマンドへ置換 |
| ローカル拡張ポイント | 個人設定を `.local` スクリプトで追加 | `.devcontainer/post-create.sh` (`post-create.local.sh`) | 再利用推奨 |
| 機密の分離 | 認証情報はGitに含めず volume で扱う | `mounts`, `.gitignore` 方針 | 必ず採用 |

## 4. 全体アーキテクチャ

### 4.1 主要ファイル

- `.devcontainer/devcontainer.json`
- `.devcontainer/post-create.sh`
- `.devcontainer/post-start.sh`
- `.devcontainer/.bashrc_project`
- `.devcontainer/.bash_profile_project`
- `.devcontainer/.bun-completion.bash`
- `docker-compose.yml`（ローカル依存サービス）
- `mise.toml`（ツール/タスク定義）

### 4.2 起動フェーズ

1. DevContainer 作成時
- `postCreateCommand` で `post-create.sh` を実行
- ツール導入、所有権修正、依存インストール、Git hooks設定を実施

2. DevContainer 起動時
- `postStartCommand` で `post-start.sh` を実行
- DBコンテナ起動、環境診断、補助サーバ起動を実施

## 5. `devcontainer.json` 設計テンプレート

### 5.1 ベース方針

- ベースイメージ: `mcr.microsoft.com/devcontainers/base:ubuntu`
- ユーザー: `remoteUser/containerUser = vscode`
- `workspaceMount` は bind、キャッシュや状態ファイルは volume を使い分ける

### 5.2 mount設計（推奨）

次を volume で永続化する。

- ツールキャッシュ: `~/.local/share/mise`
- 依存: `node_modules`
- AI設定: `~/.codex`, `~/.claude`
- 開発CLI認証: `~/.config/gh`, `~/.aws`
- Rust系: `~/.cargo`, `~/.rustup`
- 並行開発ディレクトリ: `worktrees`

注意:
- `worktrees` を volume にすると高速だが、ホスト側へ直接反映されない。
- 機密情報が含まれるディレクトリは bind せず volume 管理を優先する。

### 5.3 VSCodeカスタマイズ

`customizations.vscode` で以下を定義する。

- 必須拡張（lint/test/language support）
- `formatOnSave` と default formatter
- generatedファイルの watcher/search除外
- 誤編集防止の readonly 指定（必要なら）

### 5.4 ライフサイクル

- `postCreateCommand: bash ./.devcontainer/post-create.sh`
- `postStartCommand: bash ./.devcontainer/post-start.sh`
- 必要なら `shutdownAction` を制御（IDE特性に応じて）

## 6. `post-create.sh` 実装ガイド

### 6.1 実装責務

- build必須パッケージ導入（`apt-get install`）
- ツールランタイム導入（`mise`）
- プロジェクトツール導入（`mise install`）
- シェル初期化設定の差し込み（`.bashrc`, `.bash_profile`）
- Git初期設定（safe.directory, hooksPath）
- パッケージ依存インストール（例: `bun install --frozen-lockfile`）
- プロジェクトCLIのビルド/配置（例: `mise run orc:install`）

### 6.2 実装パターン

- 冪等性を守る。
  - マーカーコメントで `.bashrc`/`.bash_profile` 追記ブロックを置換
  - 既存インストール済みツールはスキップ
- 権限問題を先に解消する。
  - mount先へ `chown` を実施
- ローカル拡張ポイントを用意する。
  - `post-create.local.sh` があれば最後に実行

### 6.3 案件での追加要素（必要時のみ移植）

- Claude CLI インストール

## 7. `post-start.sh` 実装ガイド

### 7.1 推奨処理

- `docker-compose up -d` で依存サービス起動（DB等）
- プロジェクト診断CLI実行（例: `orc doctor`）
- 補助サーバ起動（例: S3モックなど）

### 7.2 設計ポイント

- コマンド存在チェック（`command -v`）を入れる
- 診断失敗時は即終了ではなく警告出力にして開発継続可能にする
- デーモンログは `~/.cache/...` へ保存する

## 8. シェルUXの共通化（`.bashrc_project`）

以下をプロジェクト標準として提供する。

- `mise activate` と completion 有効化
- CLI補完読み込み（例: bun completion）
- エイリアス（`mr`, `m`, `g`, `gst` など）
- ファジーファインダ連携（`fzf` がある場合のみ）

ローカル専用設定は `.bashrc_project.local` / `.bash_profile_project.local` に分離する。

## 9. 他プロジェクトへ移植する手順

1. まずこのドキュメントの「設定マップ」を見て、`Keep / Replace / Drop` を決める
3. `devcontainer.json` の以下を設定
- `name`
- mount名プレフィックス
- 必要拡張/settings
4. `post-create.sh` をプロジェクト要件に合わせて作成・調整
- 依存マネージャ（bun/pnpm/npm）
- 独自CLIインストール処理
- 不要なクラウド連携処理の削除
5. `post-start.sh` を作成・調整
- 起動するローカルサービス
- 診断コマンド
6. `docker-compose.yml` と `mise.toml` を整備
7. IDEで `Rebuild and Reopen in Container` を実行
8. 初回起動確認
- 依存インストール成功
- hooks有効化
- DB接続/アプリ起動

## 10. 設定の取捨選択ルール（コピー可否の判断基準）

移植時は各設定を `Keep / Replace / Drop` で判断します。

- `Keep`: 目的も実装方法も他プロジェクトで有効
  - 例: `postCreateCommand`, `postStartCommand`, `safe.directory`
- `Replace`: 目的は同じだが実装は置換が必要
  - 例: `orc doctor` -> `make doctor`
  - 例: `mise install` -> `asdf install` / `volta install`
  - 例: `toys3 start` -> `minio` 起動
- `Drop`: そのプロジェクトでは不要
  - 例: Claude CLI導入が不要
  - 例: Rustキャッシュvolumeが不要
  - 例: `worktrees` volumeが不要

## 11. 最小構成サンプル

```jsonc
// .devcontainer/devcontainer.json
{
  "name": "my-project",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "remoteUser": "vscode",
  "containerUser": "vscode",
  "workspaceFolder": "/workspace",
  "workspaceMount": "source=${localWorkspaceFolder},target=/workspace,type=bind,consistency=cached",
  "mounts": [
    "source=${localWorkspaceFolderBasename}-node-modules,target=${containerWorkspaceFolder}/node_modules,type=volume",
    "source=${localWorkspaceFolderBasename}-mise,target=/home/vscode/.local/share/mise,type=volume"
  ],
  "postCreateCommand": "bash ./.devcontainer/post-create.sh",
  "postStartCommand": "bash ./.devcontainer/post-start.sh"
}
```

```bash
# .devcontainer/post-create.sh
#!/bin/bash
set -euo pipefail

if ! command -v mise >/dev/null 2>&1; then
  curl https://mise.run | sh
fi
mise install
bun install --frozen-lockfile
```

```bash
# .devcontainer/post-start.sh
#!/bin/bash
set -euo pipefail

docker-compose up -d
```

## 12. 運用時の注意

- 機密を含む設定ファイル（認証トークン等）は Git 管理しない。
- `post-create.sh` は必ず冪等に保ち、再作成時に壊れないようにする。
- heavy な処理（フルビルド等）は必要性を検証し、起動時間悪化を避ける。
