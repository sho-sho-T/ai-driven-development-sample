# APPLICATION_ARCHITECTURE

最終更新: 2026-02-09（実装調査ベース）

このドキュメントは、特定プロジェクト固有の用語に依存せず、別プロジェクトへ移植可能な形でアプリケーションアーキテクチャを定義したものです。

---

## 1. アーキテクチャの要点

このアーキテクチャは次の組み合わせです。

- モジュラーモノレポ / モジュラーモノリス志向
- コンテキスト分割 + CQRS（Read/Write 分離）
- Contract-first（`@contracts/*` を境界の唯一の共有面にする）
- 関数型ドメインモデリング（class 中心ではない）
- `neverthrow` による明示的エラー伝播
- 軽量 DI コンテナ + 型付きトークン
- Bus ミドルウェア（logging / transactional 拡張）

例:

- コマンド: `order.create`
- クエリ: `inventory.findById`

---

## 2. リポジトリ全体構成

### 2.1 ディレクトリ責務

- `apps/`: デプロイ単位（API / Web / Mobile など）
- `packages/contracts/`: コンテキスト境界の公開契約
- `packages/modules/`: コンテキスト実装（read / write / infra）
- `packages/shared-kernel/`: 全体共通（public/server）
- `packages/platform/`: 技術基盤（DB など）
- `infrastructures/`: IaC

### 2.2 コンテキスト構成（テンプレート）

- `<context-a>`
- `<context-b>`

各コンテキストは `read` と `write` を分離し、DB 実装は `infra/db` に分離します。

---

## 3. パッケージ境界と依存ルール

### 3.1 役割分担

- `@contracts/<context>-public`
  - FE/BE 共通の型・スキーマ・DTO・エラー
- `@contracts/<context>-server`
  - サーバー側 Bus 型（`CommandBus`/`QueryBus` の具体化）
- `@modules/<context>-read`
  - Query ハンドラー、ReadModel、QueryService IF
- `@modules/<context>-write`
  - Command ハンドラー、Aggregate 型、ドメイン関数、Repository IF
- `@modules/<context>-infra-db`
  - DB 実装（read/write）
- `@shared-kernel/public`
  - ID スキーマ、AppError、Option、Logger
- `@shared-kernel/server`
  - Bus/Handler 型、Container、Context、Middleware、Retry
- `@platform/db`
  - DB 接続、schema、クエリ実行ヘルパー、tenant tx

### 3.2 依存方向

- app は `contracts` / `modules` / `shared-kernel` / `platform` を compose する。
- `modules` 同士を直接参照しない。必要連携は contracts + bus 呼び出し。
- `infra` は `modules` の IF を実装する。
- `shared-kernel` は他層への逆依存を作らない。

---

## 4. Contract-first 設計

### 4.1 コマンド/クエリ定義

`packages/contracts/*/public/src/*-commands.ts`, `*-queries.ts` で以下を定義します。

- Zod Schema（入力検証）
- Command/Query の Union 型
- `type` discriminant（例: `order.create`, `order.findById`）
- `ResultMap`（成功型, エラー型）

### 4.2 サーバー契約

`packages/contracts/*/server/src/*` で以下を定義します。

- `<ContextName>CommandBus` のような context 専用 Bus 型
- `...HandlerDefinition` 型（factory + settings）
- ハンドラー設定（transactional/retry 等）

### 4.3 命名規則

- コマンド/クエリ識別子: `"<context>.<action>"`
- 例: `order.create`, `inventory.verifyStock`

---

## 5. CQRS 実装パターン

### 5.1 Write 側

構成テンプレート: `packages/modules/<context>/write/src`

- `models/`: Aggregate 型定義（Zod）とドメイン関数
- `command-bus/handlers/`: ユースケース実装
- `command-bus/builder.ts`: 型安全ハンドラー登録ビルダー
- `command-bus/bus.ts`: Bus 生成（依存注入 + middleware 適用）

### 5.2 Read 側

構成テンプレート: `packages/modules/<context>/read/src`

- `models/*-read-model.ts`
- `models/*-query-service.ts`（IF）
- `query-bus/handlers/`: クエリユースケース
- `query-bus/builder.ts`, `query-bus/bus.ts`

### 5.3 典型フロー

Command:

1. App 層で request を Zod parse
2. `commandBus.execute(command, context)`
3. 必要なら他コンテキスト queryBus を呼び出し
4. aggregate 関数で状態遷移
5. repository save
6. DTO を返却

Query:

1. App 層で request parse
2. `queryBus.execute(query, context)`
3. query service で ReadModel 取得
4. DTO を返却

---

## 6. ドメインモデリング（関数型）

本アーキテクチャは class 中心ではなく、以下を基本にします。

- Aggregate = `z.object(...)` + `type`
- 振る舞い = 純粋関数
- ルール違反 = `err(...)`（`neverthrow`）

例:

- `createOrder`
- `startShipment`
- `addItemToBatch`

---

## 7. エラー処理標準

### 7.1 ベース

- エラー基盤: `@shared-kernel/public` の `AppError` / `defineError`
- 期待エラー: `meta.exposure = "EXPECTED"`
- 想定外エラー: `meta.exposure = "UNEXPECTED"` + `fault`

### 7.2 戻り値

- 非同期は `ResultAsync<T, E>`（`neverthrow`）を基本とする
- `throw` を業務フローの主制御に使わない
- DB/外部境界では `DependencyError` 化する

### 7.3 API 変換

API 層では `AppError` を HTTP ステータスへ写像する共通ハンドラを置きます。

---

## 8. shared-kernel/server（実行基盤）

### 8.1 Container

- `createToken<T>()` による型付きトークン
- lifecycle: `singleton` / `transient`
- `fork()` でスコープ分離（トランザクション用途）

### 8.2 Context

最低限の実行コンテキスト例:

- `tenantId`
- `actorId`（例: userId / operatorId）
- `container`

`ContextProvider` で request 単位の文脈を生成し、`updateContainer()` でコンテナを埋め込みます。

### 8.3 Middleware

- Bus 実行をラップ可能
- `applyMiddlewares()` でチェーン適用
- 代表実装: `logging-middleware`, `transactional-middleware`

---

## 9. インフラ層（DB）

### 9.1 platform/db

`packages/platform/db/src` に以下を置きます。

- `createDb`
- schema
- `executeQuery`（エラー統一）
- `with-tenant-tx`（テナント境界トランザクション）

### 9.2 modules/*/infra/db

実装例:

- `DrizzleOrderRepository`
- `DrizzleOrderQueryService`
- `DrizzleBatchRepository`

ルール:

- read は ReadModel 直取得
- write は Aggregate 復元/保存
- DB 例外は `DependencyError` へ変換

---

## 10. アプリ層（Composition Root）

### 10.1 API アプリ（例: Hono / Fastify / Express）

- DI 構成: `apps/<api-app>/src/di/index.ts`
- HTTP エントリ: `apps/<api-app>/src/app.ts`
- `commandHandler` / `queryHandler` で Context 生成と結果変換を共通化

### 10.2 SSR Web アプリ（例: TanStack Start / Next.js）

- DI 構成: `apps/<web-app>/src/server/di/configure.ts`
- Server Function wrapper で bus 実行を共通化

### 10.3 Mobile アプリ（例: Expo）

- 主に `@contracts/*-public` と `@shared-kernel/public` に依存
- サーバー実装詳細（server contracts / modules）には依存しない

---

## 11. コンテキスト間連携パターン

例:

- `order.start` ハンドラーが `inventory.verifyStock` を QueryBus 経由で呼ぶ
- `VerifiedStockId` のような検証済み型を受け取り、order 集約を更新する

効果:

- コンテキスト内部実装を直接参照しない
- 契約と型だけで連携できる

---

## 12. テスト戦略（重心）

- ドメイン関数の unit test を厚くする
  - 例: `packages/modules/<context>/write/src/models/**/*test.ts`
- read/write ハンドラーは統合的に検証
- infra/db は integration test を別設定で実行

---

## 13. 移植手順（AI 実行テンプレート）

### Step 1: パッケージ骨格

1. `contracts/<context>/public`, `contracts/<context>/server`
2. `modules/<context>/read`, `modules/<context>/write`, `modules/<context>/infra/db`
3. `shared-kernel/public`, `shared-kernel/server`
4. `platform/db`
5. `apps/<api-app or web-app>`

### Step 2: shared-kernel 確定

1. `AppError` 基盤
2. `Option`
3. `Container` + `createToken`
4. `Context` と `ContextProvider`
5. Bus 型 + middleware + retry

### Step 3: contracts 定義

1. `type` literal を持つ command/query schema
2. `ResultMap`（成功/失敗）
3. server 側で context 専用 Bus/Handler 定義

### Step 4: modules/write

1. Aggregate schema/type
2. 状態遷移関数（純粋関数）
3. Repository IF
4. command handlers（factory + settings）
5. bus builder/bus

### Step 5: modules/read

1. ReadModel
2. QueryService IF
3. query handlers
4. bus builder/bus

### Step 6: infra/db

1. QueryService 実装
2. Repository 実装
3. `executeQuery` でエラー統一

### Step 7: app compose

1. DI configure（Token 登録）
2. ContextProvider 接続
3. route/serverfn で bus execute
4. エラーを HTTP/UI に写像

### Step 8: 依存境界固定

1. package dependencies 明示
2. 依存ルール lint（例: `check deps`）

---

## 14. 誤適用を防ぐ注意

- 「EventBus / DomainEvent 前提」で始めない（必要時のみ追加）
- 「class ベース DDD 前提」にしない（現行は関数型に寄せる）
- 独自 `Result<T,E>` を増やさない（`neverthrow` を統一採用）
- Context（tenantId 等）を固定値にしない（request 単位で解決）

---

## 15. 参照ファイルテンプレート

移植先でも次の粒度でファイルを作ると再現しやすいです。

- API composition root: `apps/<api-app>/src/di/index.ts`
- API route -> bus: `apps/<api-app>/src/app.ts`
- Bus 基盤: `packages/shared-kernel/server/src/command-bus.ts`
- Container: `packages/shared-kernel/server/src/container.ts`
- Middleware: `packages/shared-kernel/server/src/middleware.ts`
- Error 基盤: `packages/shared-kernel/public/src/error/core.ts`
- Write bus: `packages/modules/<context>/write/src/command-bus/bus.ts`
- Read bus: `packages/modules/<context>/read/src/query-bus/bus.ts`
- Contracts(public): `packages/contracts/<context>/public/src/*-commands.ts`
- Infra 実装: `packages/modules/<context>/infra/db/src/*-repository.ts`

---

## 16. 要約

このアーキテクチャは、

- contracts で境界を固定し、
- CQRS bus でユースケースを実行し、
- 関数型 Aggregate + `neverthrow` で振る舞いを明示し、
- app ごとに DI で compose する

構成です。

移植時は、`shared-kernel` と `contracts` を先に固め、次に `modules(read/write/infra)`、最後に `apps` を compose してください。