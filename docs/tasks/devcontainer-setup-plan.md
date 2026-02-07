# DevContainer 開発環境構築タスク計画

## 1. 概要・目的

本タスクでは、DevContainer による統一開発環境を構築し、TanStack Start + Supabase での開発を開始できる状態にする。

### 背景

- プロジェクトは初期状態（README.md と docs/ のみ）
- アーキテクチャドキュメント（モジュラーモノリス + CQRS）と DevContainer 設計ガイドは整備済み
- 実装コードや設定ファイルは一切存在しない

## 2. 受け入れ条件

| # | 条件 | 検証方法 |
|---|------|----------|
| AC1 | DevContainer で開発環境が構築できる | `mise doctor` でツールが全てインストールされている |
| AC2 | Supabase CLI をコンテナ内でも操作できる | `supabase status` / `docker ps` で確認 |
| AC3 | TanStack Start の開発環境ができ、GUI上でDB操作ができる | `bun run dev` で localhost:3000 起動、localhost:54323 で Studio 操作 |

## 3. 技術スタック・決定事項

| 項目 | 決定内容 |
|------|----------|
| Docker方式 | Docker-outside-Docker（ホストの Docker socket をマウント） |
| TanStack Start | 公式テンプレート（`create-tanstack-app`）から生成 |
| モノレポ管理 | Bun workspaces |
| DB GUI | Supabase Studio（`supabase start` で自動起動、localhost:54323） |
| ツールバージョン管理 | mise |
| ベースイメージ | `mcr.microsoft.com/devcontainers/base:ubuntu` |

## 4. 実装フェーズ

### Phase 1: プロジェクト基盤

Bun workspaces によるモノレポ構成とディレクトリ構造を作成する。

#### 作成ファイル

| ファイル | 内容 |
|----------|------|
| `package.json` | Bun workspaces ルート（`apps/*`, `packages/*`） |
| `.gitignore` | node_modules, dist, .env, supabase/.temp 等 |
| `apps/.gitkeep` | apps ディレクトリのプレースホルダ |
| `packages/modules/.gitkeep` | Bounded Contexts 用 |
| `packages/shared-kernel/public/.gitkeep` | BE/FE 共通カーネル用 |
| `packages/shared-kernel/server/.gitkeep` | BE 専用カーネル用 |

#### `package.json`

```json
{
  "name": "ai-driven-development-sample",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

#### `.gitignore`

```
node_modules/
dist/
.env
.env.*
!.env.example
supabase/.temp/
.mise.local.toml
*.local.sh
.DS_Store
```

---

### Phase 2: DevContainer 設定

Docker-outside-Docker 方式で、Supabase CLI が Docker を利用できる環境を構築する。

#### 作成ファイル

| ファイル | 内容 |
|----------|------|
| `.devcontainer/devcontainer.json` | コンテナ設定本体 |
| `.devcontainer/post-create.sh` | 初回セットアップスクリプト |
| `.devcontainer/post-start.sh` | 起動時スクリプト |

#### `devcontainer.json` の主要設定

- **ベースイメージ**: `mcr.microsoft.com/devcontainers/base:ubuntu`
- **ユーザー**: `vscode`
- **Feature**: `ghcr.io/devcontainers/features/docker-outside-of-docker:1`
- **Volume mounts**: node_modules, mise キャッシュ, .claude, .config/gh
- **ポートフォワード**: 3000（TanStack Start）, 54321（Supabase API）, 54323（Supabase Studio）
- **VSCode 拡張**: ESLint, Prettier, Tailwind CSS IntelliSense

#### `post-create.sh` の処理

1. Volume マウントの所有権修正（chown）
2. mise インストール
3. `mise install` でツール導入（bun, node, supabase, gh）
4. `bun install` で依存インストール
5. .bashrc への mise activate / 補完設定
6. Git safe.directory 設定
7. `post-create.local.sh` 実行（存在する場合）

#### `post-start.sh` の処理

1. Docker アクセス確認
2. `supabase start` で DB/Studio/API 起動
3. サービス URL の表示（Studio: localhost:54323 等）
4. 失敗時は警告出力のみ（開発継続可能に）

---

### Phase 3: ツールバージョン管理

mise によるツールバージョンと開発タスクを定義する。

#### 作成ファイル

| ファイル | 内容 |
|----------|------|
| `mise.toml` | ツール定義 + タスク定義 |

#### 定義ツール

| ツール | バージョン |
|--------|-----------|
| bun | latest |
| node | 22 |
| supabase | latest |
| gh | latest |

#### 定義タスク

| タスク | コマンド | 説明 |
|--------|---------|------|
| `dev` | `cd apps/web && bun run dev` | TanStack Start 開発サーバー起動 |
| `db` | `supabase start` | Supabase サービス起動 |
| `db:stop` | `supabase stop` | Supabase サービス停止 |
| `db:reset` | `supabase db reset` | DB リセット（マイグレーション再適用） |

---

### Phase 4: アプリケーション初期構成

Supabase と TanStack Start アプリケーションの初期セットアップを行う。

#### 作業内容

| 操作 | 内容 |
|------|------|
| `supabase init` | `supabase/` ディレクトリ生成（config.toml, migrations/ 等） |
| `bunx create-tanstack-app@latest apps/web` | TanStack Start アプリの scaffold |
| `apps/web/package.json` 調整 | name を `@sample/web` に変更 |
| `bun install` | ワークスペース全体の依存解決 |

---

## 5. 検証手順

### AC1: DevContainer が構築できる

```bash
mise doctor                    # ツールが全てインストールされている
bun --version                  # bun が使える
node --version                 # node が使える
supabase --version             # supabase CLI が使える
```

### AC2: Supabase CLI がコンテナ内で動作する

```bash
supabase status                # Supabase サービスの状態確認
docker ps                      # Supabase コンテナが起動している
```

### AC3: TanStack Start + DB GUI

```bash
cd apps/web && bun run dev     # localhost:3000 でアプリが起動
# ブラウザで http://localhost:54323 → Supabase Studio でテーブル操作可能
```

## 6. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| Docker socket マウントの権限問題 | Supabase CLI が Docker にアクセスできない | docker-outside-of-docker Feature が自動的にグループ権限を設定 |
| Volume の所有権不一致 | node_modules 等へのアクセスエラー | post-create.sh で chown を実行 |
| Supabase start の初回起動が遅い | Docker イメージのプルに時間がかかる | post-start.sh で警告出力のみにし開発継続可能に |
| TanStack Start テンプレートの互換性 | create-tanstack-app のバージョン変更による差異 | latest を使用し、必要に応じて調整 |
| ポート競合 | ホスト側で同一ポートが使用中 | devcontainer.json の forwardPorts で明示的に定義 |
