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

contracts パッケージの内部構成:

```
contracts/<context>-{public|server}/
├── commands/    # Command 定義 + Input DTO
├── queries/     # Query 定義 + Input DTO
├── events/      # DomainEvent 定義（server のみ）
├── dtos/        # Output DTO
└── index.ts     # 公開 API（re-export）
```

### modules/

コンテキストごとのビジネスロジック実装。CQRS パターンに基づき Write / Read / infra-db に分割する。

| パッケージ | 用途 |
|-----------|------|
| `@modules/<context>-write` | Write 側: ドメインモデル・CommandHandler・Repository インターフェース |
| `@modules/<context>-read` | Read 側: QueryHandler（DB から直接読み取り） |
| `@modules/<context>-infra-db` | DB 実装: Repository 実装・マイグレーション |

modules パッケージの内部構成:

modules/<context>-write/
├── application/
│   ├── commands/          # CommandHandler
│   └── services/          # ApplicationService（複数 Aggregate 連携時）
├── domain/
│   ├── models/            # Entity / Aggregate / ValueObject
│   ├── events/            # DomainEvent
│   ├── services/          # DomainService
│   └── repositories/      # Repository インターフェース
└── infra/
    ├── repositories/      # Repository 実装
    └── container.ts       # DI 登録

modules/<context>-read/
└── application/
    └── queries/           # QueryHandler

`modules/<context>-infra/`: インフラ実装（例: `db/`）

### platform/

インフラ層の共通コンポーネント。各モジュールの`infra`から参照する

| パッケージ | 用途 |
|-----------|------|
| `platform/db` | データベース共通 |

---

## 依存関係ルール

- **shared-kernel**: どこからでも参照可
- **contracts**: コンテキストを跨いで参照可。モジュール間の連携は contracts 経由で行う
- **modules**: 他コンテキストのmodulesを直接参照禁止。連携はcontractsを介する

### 禁止事項

- `modules/*` が別コンテキストの `modules/*` を直接 import すること
- コンテキスト間の連携は必ず `contracts/` を経由する
- `apps/` が `modules/` を直接 import すること（`contracts/` 経由にする）
- 上位パッケージ（apps 等）が下位パッケージ（shared-kernel）へ実装を export すること
