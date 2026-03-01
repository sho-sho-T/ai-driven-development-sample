# Directory Structure

## トップレベル構成

```
/
├── apps/       # デプロイ可能なアプリケーション
├── docs/       # プロジェクトドキュメント
├── features/   # Issue/タスク単位の要件・設計ドキュメント
├── packages/   # 共有ライブラリ・ビジネスモジュール
└── tools/      # 開発・運用支援ツール
```

---

## apps/

デプロイ単位となるアプリケーションを配置する。各アプリは独立してデプロイ可能。

```
apps/
├── web/           # エンドユーザー向け Web アプリ（TanStack Start）
├── admin-web/     # 管理者向け Web アプリ（TanStack Start）
└── dev-console/   # 開発者向けコンソール
```

- アプリ間で実装を直接共有しない（共有ロジックは `packages/` に切り出す）
- フロントエンドの詳細構成は `.claude/rules/frontend-structure.md` を参照

## docs/

プロジェクト全体に関わるアーキテクチャ・設計ドキュメントを配置する。

```
docs/
├── application-architecture.md   # アーキテクチャ方針
├── frontend-architecture.md      # フロントエンド方針
├── designs/                      # UI デザイン資料
└── tasks/                        # タスク管理ドキュメント
```

## features/

Issue（機能要求）単位のディレクトリ。要件定義・ドメインモデル・イベントストーミング等の設計ドキュメントを格納する。

```
features/
└── <issue-number>/
    └── <task-number>/
        ├── PLAN.md        # 実装計画
        └── ...            # その他設計ドキュメント
```

## packages/

共有ライブラリとビジネスモジュールを配置する。詳細は `.claude/rules/packages-structure.md` を参照。

```
packages/
├── shared-kernel/   # 全コンテキスト共通の基盤ライブラリ
├── contracts/       # コンテキスト間の契約定義
├── modules/         # ビジネスコンテキストごとの実装（CQRS）
└── platform/        # インフラ・プラットフォーム共通機能
```

## tools/

開発・運用を支援するツール群。プロジェクト本体のビジネスロジックは含まない。

```
tools/
└── aidd/   # AI Driven Development 支援ツール（Rust 製 CLI）
```
