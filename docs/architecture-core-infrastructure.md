# Core Infrastructure — アプリケーション基盤

`packages/modules/core/`・`packages/contracts/core/` が提供するアプリケーション基盤の解説です。
ドメインイベントシステム、機能トグル、DI コンテナ、ミドルウェアなど、すべてのコンテキストが依存する共通インフラを対象とします。

> **関連ドキュメント:**
> - `architecture-application-patterns.md` — contracts・modules の実装パターン
> - `architecture-server-handler-types.md` — ハンドラー型の詳細

---

## 目次

1. [Core の位置づけ](#1-core-の位置づけ)
2. [パッケージ構成と公開 API](#2-パッケージ構成と公開-api)
3. [ドメインイベントシステム](#3-ドメインイベントシステム)
4. [DI コンテナ](#4-di-コンテナ)
5. [ミドルウェア](#5-ミドルウェア)
6. [Context（リクエストコンテキスト）](#6-contextリクエストコンテキスト)
7. [機能トグル](#7-機能トグル)
8. [エラーハンドリング](#8-エラーハンドリング)
9. [アプリケーションでの接続](#9-アプリケーションでの接続)
10. [他プロジェクトへの適用チェックリスト](#10-他プロジェクトへの適用チェックリスト)

---

## 1. Core の位置づけ

`core` は他のコンテキスト（`delivery`、`tenant-management` 等）とは異なり、**ビジネスドメインを持たない横断的なインフラ層**です。

```
┌─────────────────────────────────────────────────────┐
│  apps/ (delivery-api, admin-web, mobile)            │
├─────────────────────────────────────────────────────┤
│  modules/{context}/write  ←──────────────────┐      │
│  modules/{context}/read                      │      │
├──────────────────────────────────────────────┤      │
│  modules/core/write         ← インターフェース│      │
│  modules/core/infra/db      ← DB実装         │依存  │
│  modules/core/infra/inmemory← InMemory実装    │      │
├──────────────────────────────────────────────┤      │
│  contracts/core/public      ← DomainEvent型   │      │
│  contracts/core/server      ← FeatureToggle型 │      │
├──────────────────────────────────────────────┘      │
│  shared-kernel/server       ← Container, Middleware │
│  shared-kernel/public       ← Error, Logger, Types  │
│  platform/db                ← Drizzle, Transaction   │
└─────────────────────────────────────────────────────┘
```

**他コンテキストとの違い:**
- `core` に CQRS の CommandBus / QueryBus はない
- コマンドハンドラーが内部で使う `DomainEventStore` を提供する側
- 機能トグルのようなクロスカッティングな関心事を管理する

---

## 2. パッケージ構成と公開 API

### contracts/core/public（`@contracts/core-public`）

```
contracts/core/public/src/
└── domain-event.ts      # DomainEvent<P> 型・スキーマ・ファクトリー
```

エクスポート: `DomainEvent`, `DomainEventBase`, `DomainEventId`, `Actor`, `Purpose`, `createDomainEventSchema`

### contracts/core/server（`@contracts/core-server`）

```
contracts/core/server/src/
├── domain-event-id-generator.ts    # DomainEventIdGenerator IF
├── uuidv7-domain-event-id-generator.ts  # UUIDv7 実装
├── feature-toggle-key.ts           # FeatureToggleKey 型
├── feature-toggle-types.ts         # FeatureFlagDto, FeatureToggleError
├── feature-toggle-reader.ts        # FeatureToggleReader IF
└── feature-toggle-writer.ts        # FeatureToggleWriter IF
```

### modules/core/write（`@modules/core-write`）

```
modules/core/write/src/
├── domain-event-store.ts       # DomainEventStore IF
├── domain-event-publisher.ts   # DomainEventPublisher IF
└── domain-event-subscriber.ts  # DomainEventSubscriber IF
```

### modules/core/infra/db（`@modules/core-infra-db`）

```
modules/core/infra/db/src/
├── drizzle-domain-event-store.ts   # DrizzleDomainEventStore
└── drizzle-feature-toggle-service.ts  # DrizzleFeatureToggleService
```

### modules/core/infra/inmemory（`@modules/core-infra-inmemory`）

```
modules/core/infra/inmemory/src/
└── inmemory-domain-event-bus.ts    # InMemoryDomainEventBus
```

---

## 3. ドメインイベントシステム

ドメインイベントはコマンド実行時に集約が発生させ、DB に永続化した後サブスクライバーに配信するまでの一連の流れを担います。

### 3-1. イベントライフサイクル

```
[コマンドハンドラー]
    │
    │ 1. 集約操作
    │ 2. domainEventStore.add(event)   ← メモリに収集
    │
    ▼
[CommandBusBuilder]
    │
    │ 3. domainEventStore.save()       ← DB永続化（トランザクション内）
    │
    ▼
[ミドルウェアチェーン完了後]
    │
    │ 4. domainEventStore.publish()    ← サブスクライバーに配信
    │
    ▼
[InMemoryDomainEventBus]
    │
    │ 5. 登録済みハンドラーを順次実行（リトライあり）
    │
    ▼
[Subscriber]
    │ 6. forkContext() で子コンテキストを作成
    │ 7. 別コマンドを実行（イベント連鎖）
```

**save → publish の分離が重要:** save はトランザクション内で行い、publish はトランザクション完了後に実行します。これにより「DB に永続化されたがサブスクライバーに通知されていない」状態は起こり得ますが、「通知されたが永続化されていない」状態は防ぎます。

### 3-2. DomainEvent 型

```typescript
// contracts/core/public/src/domain-event.ts

export type DomainEvent<P> = DomainEventBase & { payload: P };

export type DomainEventBase = {
  id: DomainEventId;           // イベント一意ID（UUIDv7）
  type: string;                // イベント種別（例: "SHIPMENT_CREATED"）
  occurredAt: string;          // 発生日時（ISO 8601）
  tenantId: string;            // テナントID
  aggregateType: string;       // 集約種別（例: "Shipment"）
  aggregateId: string;         // 集約ID
  aggregateVersion: number;    // 集約バージョン（楽観的ロック用）
  schemaVersion: number;       // ペイロードスキーマバージョン
  correlationId: string;       // 分散トレーシング: リクエスト起点ID
  causationId?: string;        // 因果関係: 親イベントID
  actor: Actor;                // 実行者（user | system）
  purpose: Purpose;            // 目的（event_sourcing | audit_only）
};
```

**correlationId / causationId の役割:**

```
API Request (ctx.id = A, correlationId = A)
  └→ SHIPMENT_ADDED_TO_DELIVERY_RUN (correlationId = A)
      └→ Subscriber: forkContext (ctx.id = B, correlationId = A, causationId = A)
          └→ startDelivery コマンド (correlationId = A)
              └→ DELIVERY_STARTED (correlationId = A, causationId = B)
```

同一 `correlationId` で全操作を追跡でき、`causationId` で因果関係の木構造を辿れます。

### 3-3. DomainEventStore インターフェース

```typescript
// modules/core/write/src/domain-event-store.ts

export interface DomainEventStore {
  /** イベントをメモリに収集する（まだ永続化しない） */
  add(event: DomainEvent<unknown>): void;

  /** 収集済みイベントを DB に一括永続化する */
  save(): ResultAsync<void, DependencyError | ConcurrencyError>;

  /** 収集済みイベントをサブスクライバーに配信する */
  publish(): ResultAsync<void, DependencyError>;

  /** 収集済みイベントを取得する */
  getCollected(): readonly DomainEvent<unknown>[];
}
```

### 3-4. DrizzleDomainEventStore（DB 実装）

```typescript
// modules/core/infra/db/src/drizzle-domain-event-store.ts

export class DrizzleDomainEventStore implements DomainEventStore {
  private readonly collected: DomainEvent<unknown>[] = [];

  constructor(deps: { db: Db; publisher: DomainEventPublisher }) { ... }

  add(event): void {
    this.collected.push(event);
  }

  save(): ResultAsync<void, DependencyError | ConcurrencyError> {
    // 1. 各集約の現在の最大バージョンを DB から取得
    // 2. イベントに連番バージョンを割り当て
    // 3. domain_events テーブルに INSERT
    // 4. UNIQUE(aggregateId, aggregateVersion) 違反 → ConcurrencyError
  }

  publish(): ResultAsync<void, DependencyError> {
    return this.publisher.publish(this.collected);
  }
}
```

**楽観的ロック:**
`(aggregateId, aggregateVersion)` のユニーク制約により、同一集約への同時書き込みを検出します。PostgreSQL エラーコード `23505` を `ConcurrencyError` に変換します。

### 3-5. DomainEventPublisher / DomainEventSubscriber

```typescript
// modules/core/write/src/domain-event-publisher.ts
export interface DomainEventPublisher {
  publish(events: readonly DomainEvent<unknown>[]): ResultAsync<void, DependencyError>;
}

// modules/core/write/src/domain-event-subscriber.ts
export interface DomainEventSubscriber {
  subscribe<T>(params: {
    eventType: string;
    eventSchema: { parse: (data: unknown) => T };  // Zod スキーマ
    handler: (event: T) => void;
  }): void;
}
```

### 3-6. InMemoryDomainEventBus

`DomainEventPublisher` と `DomainEventSubscriber` の両方を実装するインプロセスのイベントバスです。

```typescript
// modules/core/infra/inmemory/src/inmemory-domain-event-bus.ts

export class InMemoryDomainEventBus implements DomainEventPublisher, DomainEventSubscriber {
  private readonly handlers = new Map<string, SubscriberEntry[]>();

  subscribe<T>(params): void {
    // eventType → handler のマッピングを登録
  }

  publish(events): ResultAsync<void, DependencyError> {
    // 各イベントに対して登録済みハンドラーを順次実行
  }
}
```

**リトライ:**
- 最大 3 回リトライ（指数バックオフ: 100ms → 200ms → 400ms）
- Zod パース失敗時はスキップ（リトライしない）
- 3 回失敗時はエラーログを出力し、次のハンドラーに進む（全体を停止しない）

**将来の拡張ポイント:**
InMemory 実装はモノリス内で十分ですが、マイクロサービス分割時にはこのインターフェースを SQS / EventBridge / Kafka 等の実装に差し替えます。

### 3-7. CommandBusBuilder でのイベント統合

CommandBusBuilder がイベントの save / publish を自動的に行います。ハンドラーは `add()` するだけで済みます。

```typescript
// modules/{context}/write/src/command-bus/builder.ts（簡略化）

const executeHandler = () => {
  const handler = handlerFactory(deps);
  return handler(command, { context, domainEventStore, afterCommit })
    .andThen((result) =>
      domainEventStore.save().map(() => result)  // ← save はトランザクション内
    );
};

return applyMiddlewares(middlewares, info, executeHandler)
  .andThen((result) =>
    domainEventStore.publish().map(() => result)  // ← publish はトランザクション外
  );
```

---

## 4. DI コンテナ

### 4-1. Container

```typescript
// shared-kernel/server/src/container.ts

export class Container {
  register<T>(token: Token<T>, factory: (c: Container) => T, lifecycle?: "singleton" | "transient"): void;
  resolve<T>(token: Token<T>): T;
  isRegistered(token: Token<unknown>): boolean;
  fork(): Container;   // シングルトンキャッシュをクリアしたクローン
  clone(): Container;  // 完全なコピー
}
```

### 4-2. Token（型安全なサービス識別子）

```typescript
export interface Token<T> {
  readonly symbol: symbol;
  readonly __type: T;  // 型推論用ファントムプロパティ
}

export function createToken<T>(name: string): Token<T>;
```

### 4-3. fork() の用途

`TransactionalMiddleware` がトランザクション開始時に `container.fork()` を呼び、トランザクション用 DB インスタンスを差し替えます。

```
Container（元）
  DB → 通常の DB コネクション

Container（fork）
  DB → トランザクション内の tx コネクション ← ハンドラーはこちらを使う
```

---

## 5. ミドルウェア

### 5-1. Middleware 型

```typescript
// shared-kernel/server/src/middleware.ts

export type Middleware = <T, E>(
  info: ExecutionInfo,
  next: NextFunction<T, E>,
) => ResultAsync<T, E>;

export type ExecutionInfo = {
  type: string;          // コマンド/クエリの type
  payload: unknown;
  context: Context;
  transactional?: boolean;
};
```

合成順: `[m1, m2, m3]` → `m1(m2(m3(handler)))`

### 5-2. LoggingMiddleware

```
成功 → info レベル（所要時間付き）
予期済みエラー（exposure: "EXPECTED"）→ info レベル
予期しないエラー（exposure: "UNEXPECTED"）→ error レベル
```

### 5-3. TransactionalMiddleware

```typescript
// shared-kernel/server/src/middlewares/transactional-middleware.ts

export function createTransactionalMiddleware<Db>(options: {
  dbToken: Token<Db>;
  runInTransaction: TransactionRunner<Db>;
  shouldRun?: (info: ExecutionInfo) => boolean;
}): Middleware;
```

**動作:**
1. `info.transactional === true` の場合のみ発動
2. `container.fork()` で新コンテナを作成
3. トランザクション開始 → `SET LOCAL tenantId = ?`（RLS 適用）
4. fork したコンテナに `tx` を登録 → ハンドラーは tx 経由で DB アクセス
5. ハンドラー成功 → コミット / 失敗 → ロールバック
6. 元のコンテキストに復元

---

## 6. Context（リクエストコンテキスト）

```typescript
// shared-kernel/server/src/context.ts

export type Context = {
  readonly id: string;                      // リクエストID（UUIDv7）
  readonly tenantId: TenantId;
  readonly deliveryPersonId: DeliveryPersonId;
  readonly adminWebUserId?: AdminWebUserId;
  readonly correlationId: string;           // 分散トレーシング起点
  readonly causationId: string | undefined; // 親イベントID
  readonly container: Container;            // DI コンテナ
};
```

### Context の生成と派生

```typescript
// 初回（API リクエスト受信時）
const ctx = createNewContext({ tenantId, deliveryPersonId });
// ctx.correlationId === ctx.id  ← 自分自身が起点
// ctx.causationId === undefined

// イベント連鎖時（Subscriber 内）
const childCtx = forkContext(parentCtx);
// childCtx.correlationId === parentCtx.correlationId  ← 同じ
// childCtx.causationId === parentCtx.id               ← 親を指す

// container 付与
const context = updateContainer(ctx, container);
```

---

## 7. 機能トグル

テナント単位で機能の ON/OFF を制御するシステムです。

### 7-1. 型定義

```typescript
// contracts/core/server/src/feature-toggle-key.ts
export type FeatureToggleKey = "scan.continuous_scan" | "scan.single_scan";
```

新しいトグルを追加する際は、この Union 型にキーを追加します。

### 7-2. Reader / Writer インターフェース

```typescript
// contracts/core/server/src/feature-toggle-reader.ts
export interface FeatureToggleReader {
  isEnabled(tenantId: TenantId, key: FeatureToggleKey): ResultAsync<boolean, DependencyError | FeatureToggleError>;
  listAll(): ResultAsync<FeatureFlagDto[], DependencyError>;
  listAllForTenant(tenantId: TenantId): ResultAsync<FeatureFlagDto[], DependencyError>;
}

// contracts/core/server/src/feature-toggle-writer.ts
export interface FeatureToggleWriter {
  writeGlobalToggle(key: FeatureToggleKey): ResultAsync<void, DependencyError | FeatureToggleError>;
  writeTenantToggle(key: FeatureToggleKey, tenantId: TenantId): ResultAsync<void, DependencyError | FeatureToggleError>;
}
```

### 7-3. 2 層構造（グローバル + テナントオーバーライド）

```
global_feature_flags テーブル
  key: "scan.continuous_scan", defaultValue: false

tenant_feature_flag_overrides テーブル
  tenantId: 1, flagKey: "scan.continuous_scan", value: true  ← テナント1のみ有効
```

`isEnabled()` の評価順:
1. テナントオーバーライドがあればその値を返す
2. なければグローバルのデフォルト値を返す
3. キーが未登録なら `FeatureToggleError`

---

## 8. エラーハンドリング

### 8-1. エラー定義パターン

```typescript
// shared-kernel/public/src/error/core.ts

const error = defineError<{ itemId: string }>({
  code: "ITEM_NOT_FOUND",
  name: "ItemNotFoundError",
  description: "指定されたアイテムが存在しません。",
  meta: { exposure: "EXPECTED" },  // クライアントに返してよい
});

// 使い方
error.create({ itemId: "..." });   // AppError を生成
error.is(someError);               // 型ガード
```

### 8-2. Kernel エラー（システムエラー）

| エラー | exposure | 用途 |
|--------|----------|------|
| `BUG` | UNEXPECTED (fault: BUG) | コードのバグ |
| `CONFIG_ERROR` | UNEXPECTED (fault: CONFIG) | 設定の問題 |
| `RESOURCE_ERROR` | UNEXPECTED (fault: RESOURCE) | リソース枯渇 |
| `DEPENDENCY_ERROR` | UNEXPECTED (fault: DEPENDENCY) | 外部サービス障害 |
| `CONCURRENCY_ERROR` | EXPECTED | 楽観的ロック競合（リトライ可） |

### 8-3. ResultAsync によるエラー伝搬

すべての非同期操作は `ResultAsync<T, E>` を返し、例外を使いません。

```typescript
// DB 操作のラッパー（platform/db/src/execute-query.ts）
export function executeQuery<T>(fn: () => Promise<T>): ResultAsync<T, DependencyError> {
  return ResultAsync.fromPromise(fn(), (error) =>
    KernelErrors.DEPENDENCY_ERROR.create({}, { cause: error })
  );
}
```

---

## 9. アプリケーションでの接続

### 9-1. DI 構成（delivery-api の例）

```typescript
// apps/delivery-api/src/di/index.ts（簡略化）

export function configureDi(): Container {
  const container = new Container();

  // ── Core Infrastructure ──
  container.register(Tokens.DB, () => createDb());
  container.register(Tokens.LOGGER, () => createLogger({ prefix: "delivery-api" }));
  container.register(Tokens.DOMAIN_EVENT_BUS, (c) =>
    new InMemoryDomainEventBus({ logger: c.resolve(Tokens.LOGGER) })
  );
  container.register(Tokens.DOMAIN_EVENT_ID_GENERATOR, () =>
    new UUIDv7DomainEventIdGenerator()
  );
  container.register(Tokens.FEATURE_TOGGLE_READER, (c) =>
    new DrizzleFeatureToggleService({ db: c.resolve(Tokens.DB) })
  );

  // ── Repositories & QueryServices ──
  container.register(Tokens.SHIPMENT_REPOSITORY, (c) =>
    new DrizzleShipmentRepository({ db: c.resolve(Tokens.DB) })
  );
  // ...

  // ── CommandBus ──
  container.register(Tokens.DELIVERY_COMMAND_BUS, (c) =>
    createDeliveryCommandBus({
      resolveDeps: (resolveContainer) => ({ ... }),
      createDomainEventStore: () =>
        new DrizzleDomainEventStore({
          db: c.resolve(Tokens.DB),
          publisher: c.resolve(Tokens.DOMAIN_EVENT_BUS),
        }),
      logger: c.resolve(Tokens.LOGGER),
    })
  );

  return container;
}
```

### 9-2. サブスクライバー登録

```typescript
// apps/delivery-api/src/subscribers.ts

export function configureSubscribers(deps: {
  eventBus: DomainEventSubscriber;
  commandBus: DeliveryCommandBus;
  logger: Logger;
  container: Container;
}): void {
  deps.eventBus.subscribe({
    eventType: DeliveryEventTypes.SHIPMENT_ADDED_TO_DELIVERY_RUN,
    eventSchema: ShipmentAddedToDeliveryRunEventSchema,
    handler: (event) => {
      // 1. forkContext で子コンテキストを作成（correlationId 引き継ぎ）
      const context = updateContainer(
        forkContext({ ...parentInfo }),
        deps.container,
      );
      // 2. 別コマンドを実行（イベント連鎖）
      deps.commandBus.execute(
        { type: "delivery.startDelivery", shipmentId, deliveryPersonId },
        context,
      );
    },
  });
}
```

### 9-3. 全体の接続図

```
[HTTP Request]
    │
    ▼
[Hono Handler]
    │ contextProvider() → Context 生成
    │ container.resolve(DELIVERY_COMMAND_BUS)
    │
    ▼
[DeliveryCommandBus.execute(command, context)]
    │
    ▼
[applyMiddlewares]
    ├── LoggingMiddleware        → ログ出力
    └── TransactionalMiddleware  → DB トランザクション + container.fork()
        │
        ▼
    [Handler 実行]
        │ 1. repository.get(id)   → 集約取得
        │ 2. domainLogic(...)     → ドメインロジック
        │ 3. repository.save(...) → 集約永続化
        │ 4. eventStore.add(...)  → イベント収集
        │
        ▼
    [eventStore.save()]          → イベント DB 永続化（TX 内）
    │
    ▼（TX コミット後）
[eventStore.publish()]           → InMemoryDomainEventBus
    │
    ▼
[Subscriber]
    │ forkContext() → 子コンテキスト
    │ commandBus.execute(...)  → イベント連鎖
    │
    ▼
[HTTP Response]
```

---

## 10. 他プロジェクトへの適用チェックリスト

### 必須パッケージ

| パッケージ | 作成するもの |
|-----------|-------------|
| `shared-kernel/public` | `AppError`, `defineError`, `KernelErrors`, `Logger`, `Option`, `DateTime`, 各種 Branded ID |
| `shared-kernel/server` | `Container`, `Token`, `Context`, `ContextFactory`, `Middleware`, `applyMiddlewares`, `CommandBus`, `QueryBus`, `withRetry`, `toResult` |
| `platform/db` | `createDb`, `executeQuery`, `withTenantTx`, Drizzle スキーマ |
| `contracts/core/public` | `DomainEvent<P>`, `DomainEventBase`, `Actor`, `Purpose` |
| `contracts/core/server` | `DomainEventIdGenerator`, `FeatureToggleReader/Writer`, `FeatureToggleKey` |
| `modules/core/write` | `DomainEventStore`, `DomainEventPublisher`, `DomainEventSubscriber` |
| `modules/core/infra/db` | `DrizzleDomainEventStore`, `DrizzleFeatureToggleService` |
| `modules/core/infra/inmemory` | `InMemoryDomainEventBus` |

### 実装手順

```
1. shared-kernel を構築
   □ エラー型（defineError, KernelErrors）
   □ Branded ID 型（z.uuid().brand()）
   □ Logger
   □ Option 型
   □ Container + Token
   □ Context + ContextFactory
   □ Middleware + LoggingMiddleware + TransactionalMiddleware
   □ CommandBus / QueryBus 型
   □ withRetry, toResult

2. platform/db を構築
   □ Drizzle ORM セットアップ
   □ executeQuery ラッパー
   □ withTenantTx（マルチテナント時）
   □ domain_events テーブルスキーマ

3. contracts/core を構築
   □ DomainEvent 型定義
   □ createDomainEventSchema ファクトリー
   □ FeatureToggleKey, Reader/Writer IF（必要な場合）

4. modules/core を構築
   □ DomainEventStore IF
   □ DomainEventPublisher / Subscriber IF
   □ DrizzleDomainEventStore 実装
   □ InMemoryDomainEventBus 実装
   □ DrizzleFeatureToggleService 実装（必要な場合）

5. 最初のコンテキストを構築
   □ contracts/{context}/public — コマンド・クエリ・エラー・ステータス
   □ contracts/{context}/server — CommandBus / QueryBus / Handler 型
   □ modules/{context}/write — Aggregate + Repository IF + CommandBus
   □ modules/{context}/read — ReadModel + QueryService IF + QueryBus
   □ modules/{context}/infra/db — Drizzle 実装

6. アプリで接続
   □ DI 構成（configureDi）
   □ サブスクライバー登録（configureSubscribers）
   □ HTTP ハンドラーから CommandBus / QueryBus を呼び出す
```

### 技術スタック

| 要素 | ライブラリ |
|------|-----------|
| スキーマ定義・バリデーション | Zod |
| 型安全エラーハンドリング | neverthrow（`ResultAsync`） |
| ORM | Drizzle ORM |
| DB | PostgreSQL（RLS でマルチテナント） |
| ID 生成 | UUIDv7（`uuidv7` パッケージ） |
| HTTP フレームワーク | Hono |
| ランタイム | Bun |
