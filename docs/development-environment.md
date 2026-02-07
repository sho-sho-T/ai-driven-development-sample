# 開発環境構成

## 概要

本プロジェクトは DevContainer (Docker-in-Docker) を使用し、TanStack Start + Supabase の開発環境を提供する。
開発者・AI エージェント問わず、同一の環境で即座に開発を開始できる。

## 技術スタック

| カテゴリ | 技術 | バージョン |
|----------|------|-----------|
| ランタイム | Bun | latest |
| ランタイム | Node.js | 22 |
| フレームワーク | TanStack Start | latest |
| データベース | Supabase (PostgreSQL) | latest |
| バージョン管理 | mise | latest |
| モノレポ | Bun workspaces | - |
| GitHub CLI | gh | latest |

## Docker 方式: Docker-in-Docker (DinD)

DevContainer 内に Docker デーモンが起動する方式を採用。

```
Host Machine
└── DevContainer (mcr.microsoft.com/devcontainers/base:ubuntu)
    ├── Docker Daemon (DinD)
    │   ├── supabase-db       (PostgreSQL)
    │   ├── supabase-api      (PostgREST)
    │   ├── supabase-studio   (管理UI)
    │   ├── supabase-auth     (GoTrue)
    │   └── ...
    ├── mise (ツール管理)
    │   ├── bun, node, supabase, gh
    │   └── shims → PATH
    └── /workspace (ソースコード)
```

### DinD を選択した理由

当初は Docker-outside-of-Docker (DooD) を計画していたが、以下の問題により DinD に変更した。

- DooD では `supabase start` が作成するコンテナがホスト Docker 上の兄弟コンテナとして起動する
- ポートマッピングがホスト側に紐付くため、DevContainer 内の `localhost` からアクセスできない
- `supabase start` のヘルスチェックが `127.0.0.1` に接続するため必ず失敗する

DinD ではコンテナが DevContainer 内の Docker デーモン上に起動するため、`localhost` で問題なくアクセスできる。

## ディレクトリ構成

```
.
├── .devcontainer/
│   ├── devcontainer.json      # コンテナ設定
│   ├── post-create.sh         # 初回セットアップ
│   └── post-start.sh          # 起動時処理
├── apps/
│   └── web/                   # TanStack Start アプリ (@sample/web)
│       ├── src/
│       │   ├── routes/        # ファイルベースルーティング
│       │   ├── components/
│       │   └── router.tsx
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
├── packages/
│   ├── modules/               # Bounded Contexts (CQRS)
│   └── shared-kernel/
│       ├── public/            # BE/FE 共通
│       └── server/            # BE 専用
├── supabase/
│   ├── config.toml            # Supabase 設定
│   └── migrations/            # DBマイグレーション
├── docs/
├── package.json               # Bun workspaces ルート
├── mise.toml                  # ツール・タスク定義
├── bun.lock
└── .gitignore
```

## DevContainer ライフサイクル

### 1. コンテナ作成時 (`postCreateCommand`)

`post-create.sh` が実行され、以下を自動セットアップする。

| 順序 | 処理 | 詳細 |
|------|------|------|
| 1 | Volume 所有権修正 | `/home/vscode/.local`, `.claude`, `.config` を vscode ユーザーに chown |
| 2 | mise インストール | `curl https://mise.run` で導入 |
| 3 | ツールインストール | `mise trust --all && mise install` (bun, node, supabase, gh) |
| 4 | 依存インストール | `bun install` でワークスペース全体の依存を解決 |
| 5 | シェル設定 | `.bashrc` に mise shims PATH、補完、エイリアスを追加 |
| 6 | Git 設定 | `safe.directory` を設定 |
| 7 | ローカル拡張 | `post-create.local.sh` があれば実行 |

### 2. コンテナ起動時 (`postStartCommand`)

`post-start.sh` が実行され、以下を処理する。

| 順序 | 処理 | 失敗時 |
|------|------|--------|
| 1 | Docker アクセス確認 | 警告を出して正常終了（開発継続可能） |
| 2 | `supabase start` | 警告を出して正常終了（手動リトライ可能） |
| 3 | サービス URL 表示 | - |

## Volume マウント

| Volume 名 | マウント先 | 目的 |
|-----------|-----------|------|
| `*-node-modules` | `/workspace/node_modules` | 依存パッケージのキャッシュ |
| `*-mise` | `/home/vscode/.local/share/mise` | mise ツールのキャッシュ |
| `*-claude` | `/home/vscode/.claude` | Claude CLI 状態保持 |
| `*-gh-config` | `/home/vscode/.config/gh` | GitHub CLI 認証情報 |

## ポートフォワード

| ポート | サービス | 用途 |
|--------|---------|------|
| 3000 | TanStack Start | アプリケーション開発サーバー |
| 54321 | Supabase API | PostgREST API |
| 54323 | Supabase Studio | DB 管理 GUI |

## mise タスク

| コマンド | 説明 |
|---------|------|
| `mise run dev` (`mr dev`) | TanStack Start 開発サーバー起動 (localhost:3000) |
| `mise run db` (`mr db`) | Supabase サービス起動 |
| `mise run db:stop` | Supabase サービス停止 |
| `mise run db:reset` | DB リセット（マイグレーション再適用） |

## VSCode 拡張（自動インストール）

| 拡張 | 用途 |
|------|------|
| ESLint | Lint |
| Prettier | コードフォーマッタ |
| Tailwind CSS IntelliSense | Tailwind 補完 |
| Auto Rename Tag | HTML/JSX タグ自動リネーム |
| Docker | Docker ファイルサポート |

## 既知の注意点

### nitro-nightly の Bun workspaces 問題

TanStack Start は `"nitro": "npm:nitro-nightly@latest"` という npm エイリアスを使用する。
nitro-nightly は内部で `import from "nitro/meta"` と自己参照するが、Bun の `.bun` キャッシュ内では `nitro` として解決できない。

**対策**: ルート `package.json` に `"nitro": "npm:nitro-nightly@latest"` を dependencies として追加し、`node_modules/nitro` にシンボリックリンクが作られるようにしている。

### Rebuild 時の Supabase Docker イメージ

DinD では Docker デーモンがコンテナ内で動作するため、DevContainer を Rebuild すると Supabase の Docker イメージが再 pull される。初回の `supabase start` には数分かかる場合がある。
