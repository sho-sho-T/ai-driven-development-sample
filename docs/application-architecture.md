# アプリケーションアーキテクチャ

## アーキテクチャスタイル
**モジュラーモノリスアーキテクチャ**
モジュラーモノリスは、単一のデプロイ可能なアプリケーション（モノリス）として動作しながら、内部を明確に分離されたモジュール（コンテキスト）で構成するアーキテクチャ。各モジュールは独立したビジネスコンテキストを持ち、将来的にマイクロサービスへ分割する際の移行コストを最小化できる設計となっている。

---
## 設計原則
### ① コンテキストの独立性
各コンテキスト（例: `modules/*`）は独立しており、他コンテキストの実装に直接依存しない。
### ② 契約（contracts）による連携
コンテキスト間の連携は `contracts` を通じて行われる。
### ③ 共有機能の集約
共通機能は `shared-kernel` に集約し、重複を避ける。
### ④ CQRS の適用
「読み取り（Query: Read）」と「書き込み（Command: Write）」を分離し、それぞれ最適化された実装を可能にする。
### ⑤ デプロイ単位の明確化
`apps/` 配下の各アプリケーションは独立したデプロイ管理として管理される。

---
## 全体構成
### エントリポイント
```
Client ──→ Bounded Context（上段）
Web   ──→ controller ──→ Bounded Context（下段）
```

- **Client**: クライアントから直接 Bounded Context を参照可能
- **Web**: Web リクエストは `controller` を経由して Bounded Context に到達する

---

## Bounded Context の構造
各 Bounded Context は以下の要素で構成される。
### Contract
Bounded Context の公開インターフェースを定義する。コンテキスト間の連携はこの Contract を通じて行う。
### Write（書き込み側）
- パス: `packages/modules/*/write`
- 構成要素:
  - **Application**: ユースケースを実装するアプリケーション層
  - **Domain Model**: ビジネスロジックを表現するドメインモデル
### Read（読み取り側）
- パス: `packages/modules/*/read`
- 構成要素:
  - **Application**: クエリを処理するアプリケーション層
  - **Read Model**: 読み取りに最適化されたモデル

---
## modules
- パス: `packages/modules/*`
- CQRS パターンに基づき、各モジュールは Write と Read に分離される
- `QueryBus` / `CommandBus` / `EventBus` を用いた疎結合な連携が前提となる
### modules に関するルール
- modules はコンテキストをまたいで参照できない
- 各コンテキストの実装は独立している。他のコンテキストの実装に直接依存してはいけない
- コンテキスト間の連携が必要な場合は、`contracts` を通じて行う
---
## controller
- Web からのリクエストを受け付けるエントリポイント
- controller はコンテキストを参照する
- HTTP リクエストの解釈やバリデーションを行い、適切な Bounded Context へ処理を委譲する
---
## Infra（インフラストラクチャ層）
### 役割
値の形式がドメインの型であることを保証する。
### 方針
- **never throw**（Result 型）であることを保証する
- 例外をスローせず、Result 型で成功・失敗を表現する
### DB
インフラストラクチャ層を経由してデータベースへアクセスする。

---
## shared-kernel
- パス: `packages/shared-kernel/`
- どのコンテキストからも参照可能
- 複数のコンテキストで共通して使用される機能を提供するため、広く参照されることを想定
### 公開共有カーネル
- パス: `packages/shared-kernel/public`
- BE（バックエンド）、FE（フロントエンド）で使える共通モジュール
### サーバー共有カーネル
- パス: `packages/shared-kernel/server`
- BE（バックエンド）でのみ使えるサーバーサイド専用モジュール

---
## ディレクトリ構成（概要）

```
packages/
├── modules/
│   ├── <context-a>/
│   │   ├── write/          # Command 側（Application + Domain Model）
│   │   └── read/           # Query 側（Application + Read Model）
│   ├── <context-b>/
│   │   ├── write/
│   │   └── read/
│   └── ...
├── shared-kernel/
│   ├── public/             # BE・FE 共通
│   └── server/             # BE 専用
apps/
├── <app-a>/                # デプロイ単位
├── <app-b>/
└── ...
```

---

## アーキテクチャ図の要点まとめ

| 概念                  | 説明                                    |
| ------------------- | ------------------------------------- |
| **Bounded Context** | 独立したビジネスドメインの境界。モジュール単位で分離            |
| **Contract**        | コンテキスト間の公開インターフェース                    |
| **Write（Command）**  | 書き込み処理。Application + Domain Model で構成 |
| **Read（Query）**     | 読み取り処理。Application + Read Model で構成   |
| **Infra**           | ドメイン型の保証、Result 型による安全なエラーハンドリング      |
| **shared-kernel**   | 全コンテキスト共通の機能を提供（public / server）      |
| **controller**      | Web リクエストのエントリポイント                    |
| **apps/**           | デプロイ単位の管理                             |