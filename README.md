# ai-driven-development-sample

TanStack Start + Supabase を DevContainer で開発するためのサンプルプロジェクトです。  
開発者と AI エージェントが同じ環境で、すぐに開発を開始できる構成になっています。

## 技術スタック

- `TanStack Start` (React)
- `Supabase` (PostgreSQL)
- `Bun` / `Node.js 22`
- `Biome` (Lint / Formatter)
- `mise` (ツール・タスク管理)
- `DevContainer` (Docker-in-Docker)

## 開発環境構築（推奨: DevContainer）

### 前提

- Docker Desktop が起動していること
- VS Code + Dev Containers 拡張が入っていること

### セットアップ手順

1. リポジトリを clone して VS Code で開く
2. `Reopen in Container` を実行
3. 初回起動時に `post-create.sh` が走り、以下が自動セットアップされる
   - `mise` と各種ツール (`bun`, `node`, `supabase`, `gh`) のインストール
   - 依存パッケージのインストール (`bun install`)
4. コンテナ起動時に `post-start.sh` が走り、Supabase 起動を試行

### 起動確認

- アプリ: `http://localhost:3000`
- Supabase API: `http://localhost:54321`
- Supabase Studio: `http://localhost:54323`

## 開発時の基本操作

プロジェクトルートで実行:

| コマンド | 説明 |
|---|---|
| `mise run dev` | フロントエンド開発サーバー起動 |
| `mise run lint` | Biome で lint |
| `mise run format` | Biome で format（書き込み） |
| `mise run db` | Supabase サービス起動 |
| `mise run db:stop` | Supabase サービス停止 |
| `mise run db:reset` | DB リセット（マイグレーション再適用） |

`bun` で直接実行する場合:

| コマンド | 説明 |
|---|---|
| `bun run lint` | リポジトリ全体を Biome lint |
| `bun run format` | リポジトリ全体を Biome format |
| `cd apps/web && bun run test` | フロントエンドテスト実行 |
| `cd apps/web && bun run build` | フロントエンドビルド |

## 開発ガイドライン

- 日常開発は DevContainer 内で行う（環境差分を最小化）
- 保存時フォーマットは `Biome` が自動実行される（`.devcontainer/devcontainer.json` で設定済み）
- 生成ファイル `apps/web/src/routeTree.gen.ts` は手動編集しない
- 変更前/PR 前に最低限 `mise run lint` と `cd apps/web && bun run test` を実行する

## ドキュメント

- 開発環境の詳細: `docs/development-environment.md`
- DevContainer 設計の詳細: `docs/devcontainer-setup.md`
- AI 駆動開発運用の詳細: `docs/ai-driven-development-setup.md`
