# Packages/ 構成ルール

`packages/`配下の配置・参照先を決める際はこのルールに従うこと。
ルートのディレクトリ構成は`directory-structure.md`を参照

## ディレクトリ概観

```
packages/
├── shared-kernel/     # 全コンテキスト共通の基盤ライブラリ
├── contracts/         # コンテキスト間の契約定義
├── modules/           # ビジネスコンテキストごとの実装
└── platform/          # インフラ・プラットフォーム共通機能
```

---

## 各パッケージの役割

### shared-kernel/

全コンテキストから参照可能な共通基盤。ドメインに依存しない汎用的な型・ユーティリティを提供する。

| パッケージ | 用途 |
|-----------|------|
| `@shared-kernel/public` | クライアント・サーバー両方で使用可能なユーティリティ（Result 型, Zod スキーマ等） |
| `@shared-kernel/server` | サーバーサイド専用のユーティリティ（DI コンテナ, Bus 等） |

### contracts/

コンテキスト間の連携を定義する契約層。モジュール間の直接 import を禁止し、この層を経由させることで依存関係を制御する。

| パッケージ | 用途 |
|-----------|------|
| `@contracts/<context>-public` | クライアントが参照するコマンド/クエリ定義・DTO |
| `@contracts/<context>-server` | サーバー内部で参照するコマンド/クエリ定義・ドメインイベント |

contracts パッケージのディレクトリ構成（コンテキストごとにネスト）:

```
contracts/
└── <context>/
    ├── public/    # @contracts/<context>-public
    │   └── src/
    │       └── index.ts
    └── server/    # @contracts/<context>-server
        └── src/
            └── index.ts
```

現在のコンテキスト:

| コンテキスト | public | server |
|-------------|--------|--------|
| `core` | DomainEvent 型定義 | CoreTokens, DomainEventIdGenerator |
| `library` | LibraryCommand/Query 定義・DTO・エラー | LibraryCommand/Query 定義・トークン |

### modules/

コンテキストごとのビジネスロジック実装。CQRS パターンに基づき write / read / infra に分割する。

| パッケージ | 用途 |
|-----------|------|
| `@modules/<context>-write` | Write 側: ドメインモデル・CommandHandler・Repository インターフェース |
| `@modules/<context>-read` | Read 側: QueryHandler（ReadModel から直接読み取り） |
| `@modules/<context>-infra-db` | DB 実装: Repository 実装 |
| `@modules/<context>-infra-inmemory` | インメモリ実装: テスト・開発用 |

modules パッケージのディレクトリ構成（コンテキストごとにネスト）:

```
modules/
└── <context>/
    ├── write/              # @modules/<context>-write
    │   └── src/
    │       ├── models/         # Aggregate / ValueObject / Repository インターフェース
    │       ├── command-bus/
    │       │   ├── handlers/   # CommandHandler
    │       │   ├── builder.ts
    │       │   └── bus.ts
    │       └── index.ts
    ├── read/               # @modules/<context>-read
    │   └── src/
    │       ├── models/         # ReadModel / QueryService インターフェース
    │       ├── query-bus/
    │       │   ├── handlers/   # QueryHandler
    │       │   ├── builder.ts
    │       │   └── bus.ts
    │       └── index.ts
    └── infra/
        ├── db/             # @modules/<context>-infra-db
        │   └── src/        # Repository 実装（DB）
        └── inmemory/       # @modules/<context>-infra-inmemory
            └── src/        # Repository 実装（インメモリ）
```

現在のコンテキスト:

| コンテキスト | write | read | infra |
|-------------|-------|------|-------|
| `core` | DomainEventPublisher/Store/Subscriber | - | `inmemory`: InMemoryDomainEventBus |
| `library` | Library 集約・CommandHandler | QueryHandler・ReadModel | `db`: DB 実装, `inmemory`: インメモリ実装 |

### platform/

インフラ層の共通コンポーネント。各モジュールの infra から参照する。

| パッケージ | 用途 |
|-----------|------|
| `@platform/db` | データベース共通（Prisma 等） |
| `platform/supabase` | Supabase マイグレーション・設定 |

---

## 依存関係ルール

- **shared-kernel**: どこからでも参照可
- **contracts**: コンテキストを跨いで参照可。モジュール間の連携は contracts 経由で行う
- **modules**: 他コンテキストの modules を直接参照禁止。連携は contracts を介する

### 禁止事項

- `modules/*` が別コンテキストの `modules/*` を直接 import すること
- コンテキスト間の連携は必ず `contracts/` を経由する
- `apps/` が `modules/` を直接 import すること（`contracts/` 経由にする）
- 上位パッケージ（apps 等）が下位パッケージ（shared-kernel）へ実装を export すること
