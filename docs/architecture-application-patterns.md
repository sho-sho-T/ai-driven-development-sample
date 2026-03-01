# アプリケーションアーキテクチャパターン

DDD × CQRS × クリーンアーキテクチャを TypeScript で実装するためのパターンガイドです。
コード例では `order`（受注管理）ドメインを題材として使用します。

> **関連ドキュメント:** contracts・modules の実装パターンは `architecture-contracts-modules.md` も参照してください。

---

## 目次

1. [全体像とパッケージ構成](#1-全体像とパッケージ構成)
2. [Shared Kernel — 共通基盤](#2-shared-kernel--共通基盤)
3. [Contracts — 型の契約](#3-contracts--型の契約)
4. [Modules/Write — コマンド側実装](#4-moduleswrite--コマンド側実装)
5. [Modules/Read — クエリ側実装](#5-modulesread--クエリ側実装)
6. [Platform/DB — データベース基盤](#6-platformdb--データベース基盤)
7. [Core Infra/DB — ドメインイベントストア](#7-core-infradb--ドメインイベントストア)
8. [テストパターン](#8-テストパターン)
9. [新コンテキスト実装チェックリスト](#9-新コンテキスト実装チェックリスト)

---

## 1. 全体像とパッケージ構成

```
packages/
├── shared-kernel/          # 全コンテキストから参照可能な共通基盤
│   ├── public/             # Frontend・Backend 両方から使える型・ユーティリティ
│   └── server/             # Backend のみ: CommandBus・QueryBus・Container・Middleware
│
├── platform/
│   └── db/                 # Drizzle ORM ラッパー・トランザクション・スキーマ定義
│
├── contracts/
│   └── {context}/          # コンテキストごとの型定義（実装なし）
│       ├── public/         # コマンド・クエリ・イベント・エラー・ステータス
│       └── server/         # CommandBus・QueryBus・ハンドラー定義の型
│
└── modules/
    └── {context}/          # コンテキストごとの実装
        ├── write/          # コマンド側: Aggregate + Repository Interface + CommandBus
        ├── read/           # クエリ側: ReadModel + QueryService Interface + QueryBus
        └── infra/
            └── db/         # インフラ実装: Repository・QueryService の Drizzle 実装
```

### 依存関係ルール

```
shared-kernel ← どこからでも参照可
platform      ← infra/db・core から参照
contracts     ← コンテキストをまたいで参照可（modules 間連携はここ経由）
modules       ← 他コンテキストの modules を直接参照禁止
```

---

## 2. Shared Kernel — 共通基盤

### 2-1. エラー型（`packages/shared-kernel/public/src/error/core.ts`）

すべてのエラーは `AppError` を継承し、`defineError` で定義します。

```typescript
// shared-kernel/public/src/error/core.ts

type Fault = "BUG" | "CONFIG" | "RESOURCE" | "DEPENDENCY" | "UNKNOWN";
type ErrorMeta = { exposure: "EXPECTED" } | { exposure: "UNEXPECTED"; fault: Fault };

export type ErrorDef<P extends Record<string, unknown>> = Readonly<{
  code: string;
  name: string;
  description: string;
  meta: ErrorMeta;
  create: (payload: P, opts?: { cause?: unknown }) => AppError<P>;
  is: (e: unknown) => e is AppError<P>;
}>;

export class AppError<P extends ErrorPayload = ErrorPayload> extends Error {
  public readonly code: string;
  public readonly description: string;
  public readonly meta: ErrorMeta;
  public readonly payload: P;

  constructor(args: {
    code: string;
    name: string;
    description: string;
    meta: ErrorMeta;
    payload: P;
    cause?: unknown;
  }) {
    super(args.description, { cause: args.cause });
    this.name = args.name;
    this.code = args.code;
    this.description = args.description;
    this.meta = args.meta;
    this.payload = args.payload;
  }
}

export function defineError<P extends Record<string, unknown>>(def: {
  code: string;
  name: string;
  description: string;
  meta: ErrorMeta;
}): ErrorDef<P> {
  return Object.freeze({
    ...def,
    create: (payload: P, opts?: { cause?: unknown }) =>
      new AppError<P>({ ...def, payload, cause: opts?.cause }),
    is: (e: unknown): e is AppError<P> => e instanceof AppError && e.code === def.code,
  });
}

// ErrorDef からエラー型を取り出すユーティリティ
export type ErrorType<T extends ErrorDef<any>> = ReturnType<T["create"]>;
```

**使い方:**

```typescript
// エラー定義例
export const OrderErrors = {
  ITEM_NOT_FOUND: defineError<{ itemId: string }>({
    code: "ITEM_NOT_FOUND",
    name: "ItemNotFoundError",
    description: "指定されたアイテムが存在しません。",
    meta: { exposure: "EXPECTED" },   // クライアントに返してよい予期済みエラー
  }),
};

// 型の取り出し
export type ItemNotFoundError = ErrorType<typeof OrderErrors.ITEM_NOT_FOUND>;

// エラーの生成
const error = OrderErrors.ITEM_NOT_FOUND.create({ itemId: "abc-123" });

// エラーの判定
if (OrderErrors.ITEM_NOT_FOUND.is(e)) { ... }
```

---

### 2-2. CommandBus 型（`packages/shared-kernel/server/src/command-bus.ts`）

```typescript
// shared-kernel/server/src/command-bus.ts

import type { ResultAsync } from "neverthrow";
import type { Context } from "./context";

/**
 * CommandBus の型定義
 * - Commands: コマンドの Union 型
 * - CommandType: コマンド type 文字列の Union
 * - CommandsResultMap: { "ctx.action": [成功型, エラー型] } のマッピング
 */
export type CommandBus<
  Commands extends { type: string },
  CommandType extends Commands["type"],
  CommandsResultMap extends Record<CommandType, [unknown, unknown]>,
> = {
  execute<K extends CommandType>(
    command: Extract<Commands, { type: K }>,
    context: Context,
  ): ResultAsync<CommandsResultMap[K][0], CommandsResultMap[K][1]>;
};
```

---

### 2-3. QueryBus 型（`packages/shared-kernel/server/src/query-bus.ts`）

```typescript
// shared-kernel/server/src/query-bus.ts

export type QueryBus<
  Queries extends { type: string },
  QueriesResultMap extends Record<Queries["type"], [unknown, unknown]>,
> = {
  execute<K extends keyof QueriesResultMap & Queries["type"]>(
    query: Extract<Queries, { type: K }>,
    context: Context,
  ): ResultAsync<QueriesResultMap[K][0], QueriesResultMap[K][1]>;

  /** 型推論用のファントムプロパティ。実際には持っていない */
  readonly __map?: QueriesResultMap;
};
```

---

### 2-4. CommandHandler・QueryHandler 型（ハンドラーファクトリーの型定義）

```typescript
// shared-kernel/server/src/command-handler.ts

type ExtractResultAndError<T> = T extends [infer Result, infer Error]
  ? { result: Result; error: Error }
  : { result: T; error: DependencyError };

export type CommandHandlerSettings<MappedE, E = unknown> = {
  readonly?: boolean;
  retry?: {
    maxAttempts: number;
    backoffMs?: number;
    shouldRetry?: (error: E) => boolean;
    errorMapper?: (error: E) => MappedE;
  };
};

/**
 * コマンドハンドラーファクトリーの型定義
 *
 * factory: (deps: Deps) => (command, { afterCommit, context, domainEventStore }) => ResultAsync<...>
 */
export type CommandHandlerFacotry<
  Deps,
  Commands extends { type: string },
  CommandsResultMap extends Record<string, unknown>,
  Key extends keyof CommandsResultMap & string,
  Store = unknown,
> = (deps: Deps) => (
  command: Extract<Commands, { type: Key }>,
  args: {
    afterCommit: () => ResultAsync<void, unknown>;
    context: Context;
    domainEventStore: Store;
  },
) => ResultAsync<
  ExtractResultAndError<CommandsResultMap[Key]>["result"],
  ExtractResultAndError<CommandsResultMap[Key]>["error"]
>;
```

```typescript
// shared-kernel/server/src/query-handler.ts

export type QueryHandlerFacotry<
  Deps,
  Queries extends { type: string },
  QueriesResultMap extends Record<string, unknown>,
  Key extends keyof QueriesResultMap & string,
> = (deps: Deps) => (
  query: Extract<Queries, { type: Key }>,
  context: Context,
) => ResultAsync<
  ExtractResultAndError<QueriesResultMap[Key]>["result"],
  ExtractResultAndError<QueriesResultMap[Key]>["error"]
>;
```

---

### 2-5. Context（実行コンテキスト）

```typescript
// shared-kernel/server/src/context.ts

export type Context = {
  readonly id: string;
  readonly tenantId: TenantId;           // マルチテナント識別
  readonly userId: UserId;               // 操作ユーザー
  readonly adminUserId?: AdminUserId;    // 管理者の場合のみ
  readonly correlationId: string;        // 分散トレーシング用（リクエスト全体を通じて同じID）
  readonly causationId: string | undefined; // 原因イベントのID
  readonly container: Container;         // DIコンテナ
};

// Context に container を付与/差し替えるユーティリティ
export function updateContainer(
  context: Omit<Context, "container"> | Context,
  container: Container,
): Context {
  return { ...context, container };
}
```

---

### 2-6. Container（DIコンテナ）

```typescript
// shared-kernel/server/src/container.ts

export type Lifecycle = "singleton" | "transient";
export type ServiceFactory<T> = (container: Container) => T;

// 型付きトークン
export interface Token<T> {
  readonly symbol: symbol;
  readonly __type: T;
}

export function createToken<T>(name: string): Token<T> {
  return { symbol: Symbol(name), __type: undefined as T };
}

export class Container {
  private services = new Map<symbol | string, ServiceRegistration<unknown>>();

  register<T>(token: Token<T>, factory: ServiceFactory<T>, lifecycle?: Lifecycle): void;
  register<T>(token: symbol | string, factory: ServiceFactory<T>, lifecycle?: Lifecycle): void;
  register<T>(
    token: Token<T> | symbol | string,
    factory: ServiceFactory<T>,
    lifecycle: Lifecycle = "singleton",
  ): void {
    const key = typeof token === "object" && "symbol" in token ? token.symbol : token;
    this.services.set(key, { factory, lifecycle });
  }

  resolve<T>(token: Token<T>): T;
  resolve<T>(token: symbol | string): T;
  resolve<T>(token: Token<T> | symbol | string): T {
    const key = typeof token === "object" && "symbol" in token ? token.symbol : token;
    const registration = this.services.get(key);
    if (!registration) {
      throw new Error(`Service not registered: ${String(key)}`);
    }
    if (registration.lifecycle === "singleton") {
      if (!registration.instance) {
        registration.instance = registration.factory(this);
      }
      return registration.instance as T;
    }
    return registration.factory(this) as T;
  }

  /**
   * トランザクション用にフォークする
   * シングルトンキャッシュをクリアして、同トークンに別インスタンスを登録可能にする
   */
  fork(): Container {
    const newContainer = new Container();
    for (const [key, reg] of this.services) {
      newContainer.services.set(key, {
        factory: reg.factory,
        lifecycle: reg.lifecycle,
        // instance をクリア → 再生成させる
      });
    }
    return newContainer;
  }
}
```

**使い方:**

```typescript
// トークンの定義（型安全な識別子）
const DB_TOKEN = createToken<Db>("db");
const ITEM_REPOSITORY_TOKEN = createToken<ItemRepository>("itemRepository");

// コンテナへの登録
const container = new Container();
container.register(DB_TOKEN, () => createDb(connectionString));
container.register(
  ITEM_REPOSITORY_TOKEN,
  (c) => new DrizzleItemRepository({ db: c.resolve(DB_TOKEN) }),
);

// 解決
const repo = container.resolve(ITEM_REPOSITORY_TOKEN);
```

---

### 2-7. Middleware アーキテクチャ

```typescript
// shared-kernel/server/src/middleware.ts

export type ExecutionInfo = {
  type: string;        // コマンド/クエリのタイプ文字列
  payload: unknown;    // コマンド/クエリの内容
  context: Context;    // 実行コンテキスト（ミドルウェアが書き換え可能）
  transactional?: boolean;
};

export type NextFunction<T, E> = () => ResultAsync<T, E>;

export type Middleware = <T, E>(
  info: ExecutionInfo,
  next: NextFunction<T, E>,
) => ResultAsync<T, E>;

/**
 * ミドルウェアを順番に適用してハンドラーを実行する
 * 登録順に外側から適用される: [m1, m2, m3] → m1(m2(m3(handler)))
 */
export function applyMiddlewares<T, E>(
  middlewares: Middleware[],
  info: ExecutionInfo,
  handler: () => ResultAsync<T, E>,
): ResultAsync<T, E> {
  if (middlewares.length === 0) {
    return handler();
  }
  let next: NextFunction<T, E> = handler;
  for (let i = middlewares.length - 1; i >= 0; i--) {
    const middleware = middlewares[i]!;
    const currentNext = next;
    next = () => middleware(info, currentNext);
  }
  return next();
}
```

---

### 2-8. ロギングミドルウェア

```typescript
// shared-kernel/server/src/middlewares/logging-middleware.ts

export function createLoggingMiddleware(options: {
  logger: Logger;
  busType: "command" | "query";
}): Middleware {
  const { logger, busType } = options;

  return <T, E>(info: ExecutionInfo, next: NextFunction<T, E>): ResultAsync<T, E> => {
    const startTime = Date.now();
    const baseContext = {
      type: info.type,
      busType,
      tenantId: info.context.tenantId,
    };

    return next()
      .map((result) => {
        logger.info(`${busType} executed successfully`, {
          ...baseContext,
          durationMs: Date.now() - startTime,
        });
        return result;
      })
      .mapErr((error) => {
        const durationMs = Date.now() - startTime;
        // AppError.meta.exposure で期待済み/予期外を判別
        const isExpected = error instanceof AppError && error.meta.exposure === "EXPECTED";
        if (isExpected) {
          logger.info(`${busType} failed with expected error`, { ...baseContext, durationMs, error });
        } else {
          logger.error(`${busType} failed with unexpected error`, { ...baseContext, durationMs, error });
        }
        return error;
      });
  };
}
```

---

### 2-9. トランザクションミドルウェア

```typescript
// shared-kernel/server/src/middlewares/transactional-middleware.ts

type TransactionRunner<Db> = <T, E>(
  db: Db,
  tenantId: string,
  run: (tx: Db) => Promise<Result<T, E>>,
) => Promise<Result<T, E>>;

export function createTransactionalMiddleware<Db>(options: {
  dbToken: Token<Db>;
  runInTransaction: TransactionRunner<Db>;
  shouldRun?: (info: ExecutionInfo) => boolean;
}): Middleware {
  return <T, E>(info: ExecutionInfo, next: NextFunction<T, E>): ResultAsync<T, E> => {
    const shouldRun = options.shouldRun
      ? options.shouldRun(info)
      : Boolean(info.transactional);  // info.transactional フラグで制御

    if (!shouldRun) {
      return next();
    }

    const container = info.context.container;
    const db = container.resolve(options.dbToken);

    const run = async (): Promise<Result<T, E>> =>
      await options.runInTransaction(db, info.context.tenantId, async (tx) => {
        // コンテナをフォークし、DB トークンをトランザクション用に差し替える
        const txContainer = container.fork();
        txContainer.register(options.dbToken, () => tx);
        info.context = updateContainer(info.context, txContainer);

        try {
          const result = await next();
          // エラーなら TransactionAborted を投げてトランザクションをロールバック
          if (result.isErr()) {
            throw new TransactionAborted(result.error);
          }
          return result;
        } finally {
          info.context = previousContext;
        }
      });

    return ResultAsync.fromPromise(run(), (error) => {
      if (error instanceof TransactionAborted) return error.error as E;
      return error as E;
    }).andThen((result) => (result.isOk() ? okAsync(result.value) : errAsync(result.error)));
  };
}
```

**ポイント:** ハンドラーの `settings: { transactional: true }` を見て自動的にトランザクションを開始します。コンテナをフォークして `DB_TOKEN` を差し替えることで、ハンドラー内のすべてのリポジトリが同じトランザクションを使います。

---

## 3. Contracts — 型の契約

contracts パッケージは **実装を持たない純粋な型定義** です。

### 3-1. ステータス型

```typescript
// contracts/order/public/src/order-status.ts

export const OrderStatusSchema = z.enum([
  "pending",    // 受付済み
  "active",     // 処理中
  "completed",  // 完了
  "on_hold",    // 保留中
  "closed",     // 終了
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// 同名 const でドメインルール（遷移可否）を管理
export const OrderStatus = {
  canActivate: (status: OrderStatus) => status === "pending" || status === "on_hold",
  canComplete: (status: OrderStatus) => status === "active",
  canHold:     (status: OrderStatus) => status === "active",
  canClose:    (status: OrderStatus) =>
    status === "active" || status === "on_hold" || status === "completed",
} as const;
```

### 3-2. エラー型

```typescript
// contracts/order/public/src/order-errors.ts

export const OrderErrors = {
  ITEM_NOT_FOUND: defineError<{ itemId: ItemId }>({
    code: "ITEM_NOT_FOUND",
    name: "ItemNotFoundError",
    description: "指定されたアイテムが存在しません。",
    meta: { exposure: "EXPECTED" },
  }),
  ITEM_INVALID_STATUS: defineError<{ itemId: ItemId }>({
    code: "ITEM_INVALID_STATUS",
    name: "ItemInvalidStatusError",
    description: "ステータスが不正なため、この操作を実行できません。",
    meta: { exposure: "EXPECTED" },
  }),
};

export type ItemNotFoundError     = ErrorType<typeof OrderErrors.ITEM_NOT_FOUND>;
export type ItemInvalidStatusError = ErrorType<typeof OrderErrors.ITEM_INVALID_STATUS>;
```

### 3-3. コマンド定義

```typescript
// contracts/order/public/src/order-commands.ts

// 個別コマンド
export const OrderCreateItemCommandSchema = z.object({
  type: z.literal("order.createItem"),   // ← 文字列リテラルで型絞り込み
  id: ItemIdSchema,
  requesterId: RequesterIdSchema,
  destination: DestinationInputSchema,
  trackingNumber: z.string(),
  quantity: z.number().int().positive().optional(),
});
export type OrderCreateItemCommand = z.infer<typeof OrderCreateItemCommandSchema>;
export type OrderCreateItemResult = { itemId: ItemId };

export const OrderActivateItemCommandSchema = z.object({
  type: z.literal("order.activateItem"),
  itemId: ItemIdSchema,
  assigneeId: AssigneeIdSchema,
});
export type OrderActivateItemCommand = z.infer<typeof OrderActivateItemCommandSchema>;
export type OrderActivateItemResult = { itemId: ItemId };

export const OrderCompleteItemCommandSchema = z.object({
  type: z.literal("order.completeItem"),
  itemId: ItemIdSchema,
  attachmentUrls: z.array(z.string()).max(5),
});
export type OrderCompleteItemCommand = z.infer<typeof OrderCompleteItemCommandSchema>;
export type OrderCompleteItemResult = { itemId: ItemId };

// Union 型（全コマンドをまとめる）
export type OrderCommands =
  | OrderCreateItemCommand
  | OrderActivateItemCommand
  | OrderCompleteItemCommand
  | OrderHoldItemCommand
  | OrderCloseItemCommand;

// ResultMap: コマンド名 → [成功型, エラー型] のタプル
export type OrderCommandsResultMap = {
  "order.createItem":   [OrderCreateItemResult,   DependencyError];
  "order.activateItem": [
    OrderActivateItemResult,
    DependencyError | ItemNotFoundError | ItemInvalidStatusError | AssigneeNotFoundError,
  ];
  "order.completeItem": [
    OrderCompleteItemResult,
    DependencyError | ItemNotFoundError | ItemInvalidStatusError,
  ];
  "order.holdItem":     [OrderHoldItemResult, DependencyError | ItemNotFoundError];
  "order.closeItem":    [OrderCloseItemResult, DependencyError | ItemNotFoundError];
};

export type OrderCommandType = OrderCommands["type"];
```

### 3-4. クエリ定義

```typescript
// contracts/order/public/src/order-queries.ts

// DTO（クエリ結果の形）
export const ItemForAdminDtoSchema = z.object({
  id: ItemIdSchema,
  status: OrderStatusSchema,
  destination: z.object({
    name: z.string(),
    postalCode: z.string(),
    address: z.string(),
    phoneNumber: z.string().optional(),
    email: z.string().optional(),  // 管理者のみ
  }),
  assignee: z.object({ id: AssigneeIdSchema, name: z.string() }).optional(),
  trackingNumber: z.string(),
  requester: z.object({ id: z.string(), name: z.string() }),
  receivedAt: DateTimeSchema,
  quantity: z.number().int().positive().optional(),
  location: z.object({ id: LocationIdSchema, name: z.string() }),
  attachmentCount: z.number().int().nonnegative(),
});
export type ItemForAdminDto = z.infer<typeof ItemForAdminDtoSchema>;

// クエリスキーマ
export const OrderListItemsForAdminQuerySchema = z.object({
  type: z.literal("order.listItemsForAdmin"),
  requesterId: RequesterIdSchema.optional(),
  trackingNumber: z.string().optional(),
  status: OrderStatusSchema.optional(),
});
export type OrderListItemsForAdminQuery = z.infer<typeof OrderListItemsForAdminQuerySchema>;
export type OrderListItemsForAdminResult = { items: ItemForAdminDto[] };

// ResultMap
export type OrderQueriesResultMap = {
  "order.listItemsForAdmin": [OrderListItemsForAdminResult, DependencyError];
  "order.findItemForAdmin":  [OrderFindItemForAdminResult,  DependencyError];
};

export type OrderQueryType = OrderQueries["type"];
```

### 3-5. ドメインイベント定義

```typescript
// contracts/order/public/src/order-events.ts

export const OrderEventTypes = {
  ITEM_CREATED:   "ITEM_CREATED",
  ITEM_ACTIVATED: "ITEM_ACTIVATED",
  ITEM_COMPLETED: "ITEM_COMPLETED",
  ITEM_HELD:      "ITEM_HELD",
  ITEM_CLOSED:    "ITEM_CLOSED",
} as const;

export type OrderEventType = (typeof OrderEventTypes)[keyof typeof OrderEventTypes];

// イベントスキーマ（createDomainEventSchema は core-public のヘルパー）
export const ItemCompletedEventSchema = createDomainEventSchema(
  z.object({
    itemId: z.string(),
    attachmentUrls: z.array(z.string()),
  }),
).extend({
  type: z.literal(OrderEventTypes.ITEM_COMPLETED),
  aggregateType: z.literal("Item"),  // 集約の種類で区別
});
export type ItemCompletedEvent = z.infer<typeof ItemCompletedEventSchema>;
```

### 3-6. Server 側ハンドラー型（contracts/server）

```typescript
// contracts/order/server/src/order-commands.ts

export type OrderCommandBus = CommandBus<
  OrderCommands,
  OrderCommandType,
  OrderCommandsResultMap
>;

// ハンドラーファクトリーの型（Deps から自動推論）
export type OrderCommandHandlerFactory<Deps, Key extends keyof OrderCommandsResultMap> =
  CommandHandlerFacotry<Deps, OrderCommands, OrderCommandsResultMap, Key, DomainEventStore>;

// ハンドラーの型（K に対応する Result/Error を自動推論）
export type OrderCommandHandler<K extends OrderCommandType> = (
  command: OrderCommandOf<K>,
  args: {
    afterCommit: () => ResultAsync<void, unknown>;
    context: Context;
    domainEventStore: DomainEventStore;
  },
) => ResultAsync<ResultOf<K>, ErrorOf<K>>;

// ハンドラー定義（factory + settings のペア）
export type OrderCommandHandlerDefinition<Deps, K extends OrderCommandType> = {
  factory: OrderCommandHandlerFactory<Deps, K>;
  settings: OrderCommandHandlerSettings<K>;
};

// settings 型（retry 設定時は errorMapper 必須）
export type OrderCommandHandlerSettings<K extends OrderCommandType> =
  | {
      transactional?: boolean;
      retry: {
        maxAttempts: number;
        backoffMs?: number;
        shouldRetry?: (error: ErrorOf<K>) => boolean;
        errorMapper: (error: ErrorOf<K>) => ErrorOf<K>;  // retry 時は必須
      };
    }
  | {
      transactional?: boolean;
      retry?: never;
    };
```

---

## 4. Modules/Write — コマンド側実装

### 4-1. Aggregate 型（Zod スキーマ＋ピュア関数）

```typescript
// modules/order/write/src/models/item-aggregate/types.ts

export const DestinationSchema = z.object({
  name: z.string(),
  postalCode: z.string(),
  address: z.string(),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
});
export type Destination = z.infer<typeof DestinationSchema>;

export const ItemAggregateSchema = z.object({
  id: ItemIdSchema,
  status: OrderStatusSchema,
  tenantId: TenantIdSchema,
  trackingNumber: z.string(),
  requesterId: RequesterIdSchema,
  destination: DestinationSchema,
  assigneeId: VerifiedAssigneeIdSchema.optional(),  // 検証済み担当者ID
  attachmentUrls: z.array(z.string()).optional(),
  quantity: z.number().int().positive().optional(),
  locationId: LocationIdSchema,
  receivedAt: z.date().optional(),
});

export type ItemAggregate = z.infer<typeof ItemAggregateSchema>;

// 型とバリデーションを1セットで公開するパターン
export const ItemAggregate = {
  validate: (value: unknown) => ItemAggregateSchema.safeParse(value).success,
  __unsafeParse: (value: unknown) => ItemAggregateSchema.parse(value),
} as const;

export type CreateItemAggregateParams = {
  readonly id: ItemId;
  readonly tenantId: TenantId;
  readonly trackingNumber: string;
  readonly requesterId: RequesterId;
  readonly destination: Destination;
  readonly quantity?: number;
  readonly locationId: LocationId;
};
```

### 4-2. Aggregate ドメインロジック（ピュア関数）

```typescript
// modules/order/write/src/models/item-aggregate/create-item.ts

export const createItem = (params: CreateItemAggregateParams): ItemAggregate => {
  return {
    tenantId: params.tenantId,
    id: params.id,
    status: "pending",            // 初期ステータス
    trackingNumber: params.trackingNumber,
    requesterId: params.requesterId,
    destination: params.destination,
    quantity: params.quantity,
    locationId: params.locationId,
    receivedAt: new Date(),
  };
};
```

```typescript
// modules/order/write/src/models/item-aggregate/activate-item.ts

/**
 * アイテムを処理中に移行する
 * ステータス検証は contracts の OrderStatus.canActivate を使う
 */
export const activateItem = (
  item: ItemAggregate,
  assigneeId: VerifiedAssigneeId,  // 担当者の存在確認が済んだ ID
): Result<ItemAggregate, ItemInvalidStatusError> => {
  if (!OrderStatus.canActivate(item.status)) {
    return err(OrderErrors.ITEM_INVALID_STATUS.create({ itemId: item.id }));
  }
  return ok({
    ...item,              // イミュータブル更新
    status: "active",
    assigneeId,
  });
};
```

```typescript
// modules/order/write/src/models/item-aggregate/complete-item.ts

export const completeItem = (
  item: ItemAggregate,
  attachmentUrls: string[],
): Result<ItemAggregate, ItemInvalidStatusError> => {
  if (!OrderStatus.canComplete(item.status)) {
    return err(OrderErrors.ITEM_INVALID_STATUS.create({ itemId: item.id }));
  }
  return ok({
    ...item,
    status: "completed",
    attachmentUrls,
  });
};
```

### 4-3. ドメインイベント生成ヘルパー

```typescript
// modules/order/write/src/models/domain-events.ts

type CreateEventParams<P> = {
  domainEventIdGenerator: DomainEventIdGenerator;
  type: OrderEventType;
  tenantId: string;
  aggregateId: string;
  aggregateVersion: number;
  correlationId: string;
  causationId: string | undefined;
  actor: Actor;
  purpose: Purpose;
  payload: P;
};

// Item 集約用イベント生成（aggregateType を "Item" で固定）
export function createItemEvent<P>(params: CreateEventParams<P>): DomainEvent<P> {
  return {
    id: params.domainEventIdGenerator.generate() as DomainEventId,
    type: params.type,
    occurredAt: new Date().toISOString(),
    tenantId: params.tenantId,
    aggregateType: "Item",         // ← 集約の種類
    aggregateId: params.aggregateId,
    aggregateVersion: params.aggregateVersion,
    schemaVersion: 1,
    correlationId: params.correlationId,
    causationId: params.causationId,
    actor: params.actor,
    purpose: params.purpose,
    payload: params.payload,
  };
}
```

### 4-4. Repository Interface

```typescript
// modules/order/write/src/models/item-repository.ts

export interface ItemRepository {
  save(aggregate: ItemAggregate): ResultAsync<void, DependencyError | ConcurrencyError>;
  find(id: ItemId): ResultAsync<Option<ItemAggregate>, DependencyError>;
  get(id: ItemId): ResultAsync<ItemAggregate, DependencyError | ItemNotFoundError>;
}
```

**ポイント:**
- `find`: 存在しない場合に `None` を返す（エラーではない）
- `get`: 存在しない場合に `ItemNotFoundError` を返す
- `save`: 楽観的ロック違反で `ConcurrencyError` を返す

### 4-5. Command Handler 実装

```typescript
// modules/order/write/src/command-bus/handlers/create-item.ts

export const createItemHandler: OrderCommandHandlerDefinition<
  {
    itemRepository: ItemRepository;
    domainEventIdGenerator: DomainEventIdGenerator;
  },
  "order.createItem"
> = {
  factory:
    (deps) =>
    (command, { context, domainEventStore }) => {
      // 1. Aggregate 生成
      const item = createItem({
        id: command.id,
        tenantId: context.tenantId,
        trackingNumber: command.trackingNumber,
        requesterId: command.requesterId,
        destination: command.destination,
        quantity: command.quantity,
        locationId: command.locationId,
      });

      // 2. 保存 → 3. ドメインイベント記録
      return deps.itemRepository.save(item).map(() => {
        domainEventStore.add(
          createItemEvent({
            domainEventIdGenerator: deps.domainEventIdGenerator,
            type: OrderEventTypes.ITEM_CREATED,
            tenantId: context.tenantId,
            aggregateId: item.id,
            aggregateVersion: 1,
            correlationId: context.correlationId,
            causationId: context.causationId,
            actor: { type: "user", id: context.userId },
            purpose: "audit_only",
            payload: {
              trackingNumber: command.trackingNumber,
              requesterId: command.requesterId,
              destination: command.destination,
            },
          }),
        );
        return { itemId: item.id };
      });
    },
  settings: {
    transactional: true,   // DB 書き込みを伴うため true
  },
};
```

```typescript
// modules/order/write/src/command-bus/handlers/activate-item.ts

export const activateItemHandler: OrderCommandHandlerDefinition<
  {
    itemRepository: ItemRepository;
    userManagementQueryBus: UserManagementQueryBus; // 担当者検証のため別コンテキスト参照
    domainEventIdGenerator: DomainEventIdGenerator;
  },
  "order.activateItem"
> = {
  factory:
    (deps) =>
    (command, { context, domainEventStore }) => {
      return (
        // 1. 担当者の存在確認（別コンテキストの QueryBus 経由）
        deps.userManagementQueryBus
          .execute(
            {
              type: "userManagement.verifyAssigneeExists",
              assigneeId: command.assigneeId,
            },
            context,
          )
          .andThen(({ verifiedAssigneeId }) =>
            // 2. Aggregate 取得
            deps.itemRepository
              .get(command.itemId)
              // 3. ドメインロジック（ピュア関数）
              .andThen((item) => activateItem(item, verifiedAssigneeId))
              // 4. 保存 → イベント記録
              .andThen((updatedItem) =>
                deps.itemRepository.save(updatedItem).map(() => updatedItem),
              )
              .map((item) => {
                domainEventStore.add(
                  createItemEvent({
                    domainEventIdGenerator: deps.domainEventIdGenerator,
                    type: OrderEventTypes.ITEM_ACTIVATED,
                    // ...
                    payload: { itemId: item.id, assigneeId: item.assigneeId },
                  }),
                );
                return { itemId: item.id };
              }),
          )
      );
    },
  settings: {
    transactional: true,
  },
};
```

**パターンのまとめ: 取得 → ドメインロジック → 保存 → イベント**

```
1. 外部リソース検証（必要な場合: 別コンテキストの QueryBus）
2. Aggregate 取得 (repository.get)
3. ドメインロジック（ピュア関数: activateItem など）
4. 保存 (repository.save)
5. ドメインイベント記録 (domainEventStore.add)
6. 結果の返却
```

### 4-6. CommandBusBuilder（型安全なビルダー）

```typescript
// modules/order/write/src/command-bus/builder.ts

type MissingKeys<Registered> = Exclude<OrderCommandType, keyof Registered>;

export class OrderCommandBusBuilder<
  Deps,
  Registered extends Partial<Record<OrderCommandType, unknown>> = {},
> {
  private readonly handlers: Partial<Record<OrderCommandType, HandlerRegistration<Deps>>> = {};
  private readonly middlewares: Middleware[] = [];
  private readonly deps: BuilderDeps;

  constructor(deps: BuilderDeps) {
    this.deps = deps;
  }

  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  register<K extends OrderCommandType>(
    commandType: K,
    registration: {
      handlerFactory: (deps: Deps) => OrderCommandHandler<K>;
      settings: OrderCommandHandlerSettings<K>;
    },
  ): OrderCommandBusBuilder<Deps, Registered & Record<K, OrderCommandHandler<K>>> {
    (this.handlers as Record<string, HandlerRegistration<Deps>>)[commandType] =
      registration as unknown as HandlerRegistration<Deps>;
    return this as unknown as OrderCommandBusBuilder<
      Deps,
      Registered & Record<K, OrderCommandHandler<K>>
    >;
  }

  // MissingKeys extends never = 全コマンドが登録済みのときのみ build() が呼べる
  build(
    this: MissingKeys<Registered> extends never
      ? OrderCommandBusBuilder<Deps, Registered>
      : never,
    options: BuildOptions<Deps>,
  ): OrderCommandBus {
    const middlewares = this.middlewares;
    const { resolveDeps } = options;

    return {
      execute: <K extends OrderCommandType>(
        command: Extract<OrderCommands, { type: K }>,
        context: Context,
      ) => {
        const registration = this.handlers[command.type] as HandlerRegistration<Deps>;
        const { handlerFactory, settings } = registration;
        const domainEventStore = this.deps.createDomainEventStore();

        const info: ExecutionInfo = {
          type: command.type,
          payload: command,
          context,
          transactional: settings.transactional,
        };

        const executeHandler = () => {
          const deps = resolveDeps(info.context.container);
          const handler = handlerFactory(deps);
          const execute = () =>
            handler(command, {
              afterCommit: () => okAsync(undefined),
              context,
              domainEventStore,
            }).andThen((result) =>
              // ハンドラー実行後にイベントを DB 保存
              domainEventStore.save().map(() => result),
            );

          if (settings.retry) {
            return withRetry(execute, settings.retry);
          }
          return execute();
        };

        // ミドルウェア適用後、イベントを publish
        return applyMiddlewares(middlewares, info, executeHandler).andThen((result) =>
          domainEventStore.publish().map(() => result),
        );
      },
    };
  }
}
```

### 4-7. CommandBus の組み立て（bus.ts）

```typescript
// modules/order/write/src/command-bus/bus.ts

type Deps = {
  itemRepository: ItemRepository;
  userManagementQueryBus: UserManagementQueryBus;
  orderQueryBus: OrderQueryBus;
  domainEventIdGenerator: DomainEventIdGenerator;
};

type CreateOrderCommandBusDeps = {
  resolveDeps: (container: Container) => Deps;
  createDomainEventStore: () => DomainEventStore;
  logger: Logger;
  middlewares?: Middleware[];
};

export const createOrderCommandBus = (deps: CreateOrderCommandBusDeps): OrderCommandBus => {
  const loggingMiddleware = createLoggingMiddleware({
    logger: deps.logger,
    busType: "command",
  });

  const builder = new OrderCommandBusBuilder<Deps>({
    createDomainEventStore: deps.createDomainEventStore,
  });

  let b = builder.use(loggingMiddleware);
  if (deps.middlewares) {
    for (const mw of deps.middlewares) b = b.use(mw);
  }

  return b
    .register("order.createItem", {
      handlerFactory: (deps) =>
        createItemHandler.factory({
          itemRepository: deps.itemRepository,
          domainEventIdGenerator: deps.domainEventIdGenerator,
        }),
      settings: createItemHandler.settings,
    })
    .register("order.activateItem", {
      handlerFactory: (deps) =>
        activateItemHandler.factory({
          itemRepository: deps.itemRepository,
          userManagementQueryBus: deps.userManagementQueryBus,
          domainEventIdGenerator: deps.domainEventIdGenerator,
        }),
      settings: activateItemHandler.settings,
    })
    .register("order.completeItem", {
      handlerFactory: (deps) =>
        completeItemHandler.factory({
          itemRepository: deps.itemRepository,
          domainEventIdGenerator: deps.domainEventIdGenerator,
        }),
      settings: completeItemHandler.settings,
    })
    // ... 全コマンドを登録（登録漏れはコンパイルエラー）
    .build({ resolveDeps: deps.resolveDeps });
};
```

---

## 5. Modules/Read — クエリ側実装

### 5-1. ReadModel 型定義

```typescript
// modules/order/read/src/models/item-read-model.ts

export const ItemReadModelSchema = z.object({
  id: ItemIdSchema,
  status: OrderStatusSchema,
  destination: z.object({
    name: z.string(),
    postalCode: z.string(),
    address: z.string(),
    phoneNumber: z.string().optional(),
    email: z.string().optional(),
  }),
  assignee: z.object({ id: AssigneeIdSchema, name: z.string() }).optional(),
  trackingNumber: z.string(),
  requester: z.object({ id: z.string(), name: z.string() }),
  deadline: DateTimeSchema.optional(),
  receivedAt: DateTimeSchema,
  quantity: z.number().int().positive().optional(),
  location: z.object({ id: LocationIdSchema, name: z.string() }),
  attachmentCount: z.number().int().nonnegative(),
});

export type ItemReadModel = z.infer<typeof ItemReadModelSchema>;
```

### 5-2. QueryService Interface

```typescript
// modules/order/read/src/models/item-query-service.ts

export type ItemQueryListArgs = {
  status?: OrderStatus;
  statuses?: OrderStatus[];
  requesterId?: RequesterId;
  assigneeId?: AssigneeId;
  trackingNumber?: string;
  recipientName?: string;
};

export interface ItemQueryService {
  list(args?: ItemQueryListArgs): ResultAsync<Array<ItemReadModel>, DependencyError>;
  findById(id: ItemId): ResultAsync<Option<ItemReadModel>, DependencyError>;
  listStatusHistoryById(itemId: ItemId): ResultAsync<Array<ItemStatusHistoryReadModel>, DependencyError>;
  listAttachmentsById(itemId: ItemId): ResultAsync<Array<AttachmentReadModel>, DependencyError>;
}
```

### 5-3. Query Handler 実装

```typescript
// modules/order/read/src/query-bus/handlers/list-items-for-admin.ts

export const listItemsForAdmin: OrderQueryHandlerDefinition<
  { itemQueryService: ItemQueryService },
  "order.listItemsForAdmin"
> = {
  factory: (deps) => (query, _context) => {
    return deps.itemQueryService
      .list({
        requesterId: query.requesterId,
        trackingNumber: query.trackingNumber,
        status: query.status,
      })
      .map((items) => ({ items }));
  },
  settings: {},  // クエリはシンプル（トランザクション不要）
};
```

### 5-4. QueryBusBuilder

```typescript
// modules/order/read/src/query-bus/builder.ts

type MissingKeys<Registered> = Exclude<OrderQueryType, keyof Registered>;

export class OrderQueryBusBuilder<
  Deps,
  Registered extends Partial<Record<OrderQueryType, unknown>> = {},
> {
  private readonly handlers: Partial<Record<OrderQueryType, HandlerRegistration<Deps>>> = {};
  private readonly middlewares: Middleware[] = [];

  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  register<K extends OrderQueryType>(
    queryType: K,
    registration: {
      handlerFactory: (deps: Deps) => OrderQueryHandler<K>;
      settings: { retry?: object };
    },
  ): OrderQueryBusBuilder<Deps, Registered & Record<K, OrderQueryHandler<K>>> {
    (this.handlers as Record<string, HandlerRegistration<Deps>>)[queryType] =
      registration as unknown as HandlerRegistration<Deps>;
    return this as unknown as OrderQueryBusBuilder<
      Deps,
      Registered & Record<K, OrderQueryHandler<K>>
    >;
  }

  build(
    this: MissingKeys<Registered> extends never ? OrderQueryBusBuilder<Deps, Registered> : never,
    options: BuildOptions<Deps>,
  ): OrderQueryBus {
    const { resolveDeps } = options;
    const middlewares = this.middlewares;

    return {
      execute: <K extends OrderQueryType>(
        query: Extract<OrderQueries, { type: K }>,
        context: Context,
      ) => {
        const registration = this.handlers[query.type] as HandlerRegistration<Deps>;
        const { handlerFactory, settings } = registration;
        const info = { type: query.type, payload: query, context };

        const executeHandler = () => {
          const deps = resolveDeps(info.context.container);
          const handler = handlerFactory(deps);
          const execute = () => handler(query, context);
          if (settings.retry) return withRetry(execute, settings.retry);
          return execute();
        };

        return applyMiddlewares(middlewares, info, executeHandler);
      },
    };
  }
}
```

---

## 6. Platform/DB — データベース基盤

### 6-1. executeQuery（エラーハンドリングラッパー）

```typescript
// platform/db/src/execute-query.ts

/**
 * DB クエリを ResultAsync でラップする共通ヘルパー
 * Promise の reject を DependencyError に変換する
 */
export function executeQuery<T>(fn: () => Promise<T>): ResultAsync<T, DependencyError> {
  return ResultAsync.fromPromise(fn(), (error: unknown) => {
    return KernelErrors.DEPENDENCY_ERROR.create({}, { cause: error });
  });
}

// 使い方
const result = executeQuery(() =>
  db.select().from(items).where(eq(items.uuid, id)).limit(1),
);
// result: ResultAsync<{...}[], DependencyError>
```

### 6-2. withTenantTx（マルチテナント対応トランザクション）

```typescript
// platform/db/src/with-tenant-tx.ts

/**
 * テナントスコープのトランザクションを実行する
 * SET LOCAL tenantId により PostgreSQL RLS ポリシーでデータを分離
 */
export async function withTenantTx<T>(
  db: PostgresJsDatabase<typeof schema>,
  tenantId: string,
  callback: (tx: PostgresJsDatabase<typeof schema>) => Promise<T>,
): Promise<T> {
  return await db.transaction(async (tx) => {
    // RLS ポリシーが参照する LOCAL 変数を設定
    await tx.execute(sql`SET LOCAL tenantId = ${tenantId}`);
    return await callback(tx);
  });
}
```

**TransactionalMiddleware との連携:**

```typescript
// アプリ初期化時
const transactionalMiddleware = createTransactionalMiddleware({
  dbToken: DB_TOKEN,
  runInTransaction: (db, tenantId, run) =>
    withTenantTx(db, tenantId, async (tx) => {
      const result = await run(tx);
      return result;
    }),
});

// CommandBus に適用
const commandBus = createOrderCommandBus({
  middlewares: [transactionalMiddleware],
  // ...
});
```

### 6-3. DomainEvent スキーマ（DB テーブル定義）

```typescript
// platform/db/src/schema/index.ts

const appSchema = pgSchema("app");  // PostgreSQL スキーマ分離

export const domainEvent = appSchema.table(
  "domain_events",
  {
    id: serial("id").primaryKey(),
    uuid: uuid("uuid").notNull().unique(),
    type: varchar("type", { length: 100 }).notNull(),
    occurredAt: timestamp("occurred_at").notNull(),
    tenantId: integer("tenant_id").notNull().references(() => tenant.id),
    aggregateType: varchar("aggregate_type", { length: 100 }).notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    aggregateVersion: integer("aggregate_version").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    causationId: uuid("causation_id"),
    actorType: varchar("actor_type", { length: 20 }).notNull(),
    actorId: varchar("actor_id", { length: 100 }),
    purpose: varchar("purpose", { length: 20 }).notNull(),
    payload: jsonb("payload"),
  },
  (t) => [
    // 楽観的ロック: (aggregateId, aggregateVersion) の一意制約
    unique().on(t.aggregateId, t.aggregateVersion),
  ],
);
```

---

## 7. Core Infra/DB — ドメインイベントストア

### 7-1. DomainEventStore インターフェース

```typescript
// modules/core/write/src/domain-event-store.ts

export interface DomainEventStore {
  add(event: DomainEvent<unknown>): void;
  save(): ResultAsync<void, DependencyError | ConcurrencyError>;
  publish(): ResultAsync<void, DependencyError>;
  getCollected(): readonly DomainEvent<unknown>[];
}

export interface DomainEventPublisher {
  publish(events: readonly DomainEvent<unknown>[]): ResultAsync<void, DependencyError>;
}
```

### 7-2. DrizzleDomainEventStore 実装

```typescript
// core/infra/db/src/drizzle-domain-event-store.ts

export class DrizzleDomainEventStore implements DomainEventStore {
  private readonly collected: DomainEvent<unknown>[] = [];

  constructor(private readonly deps: { db: Db; publisher: DomainEventPublisher }) {}

  add(event: DomainEvent<unknown>): void {
    this.collected.push(event);
  }

  save(): ResultAsync<void, DependencyError | ConcurrencyError> {
    if (this.collected.length === 0) return okAsync(undefined);

    return executeQuery(async () => {
      // 1. 関係する全集約 ID のバージョン最大値を取得
      const aggregateIds = [...new Set(this.collected.map((e) => e.aggregateId))];
      const maxVersionRows = await this.deps.db
        .select({
          aggregateId: domainEvent.aggregateId,
          maxVersion: max(domainEvent.aggregateVersion).mapWith(Number),
        })
        .from(domainEvent)
        .where(sql`${domainEvent.aggregateId} IN ${aggregateIds}`)
        .groupBy(domainEvent.aggregateId);

      // 2. 各集約に対してインクリメントしたバージョンを割り当て
      const maxVersionMap = new Map<string, number>();
      for (const row of maxVersionRows) {
        maxVersionMap.set(row.aggregateId, row.maxVersion ?? 0);
      }

      const rows = this.collected.map((event) => {
        const currentMax = maxVersionMap.get(event.aggregateId) ?? 0;
        const nextVersion = currentMax + 1;
        maxVersionMap.set(event.aggregateId, nextVersion);  // 複数イベント対応

        return {
          uuid: event.id,
          type: event.type,
          occurredAt: event.occurredAt,
          tenantId: sql`(SELECT id FROM app.tenants WHERE uuid = ${event.tenantId})`,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          aggregateVersion: nextVersion,
          schemaVersion: event.schemaVersion,
          correlationId: event.correlationId,
          causationId: event.causationId ?? null,
          actorType: event.actor.type,
          actorId: event.actor.type === "user" ? event.actor.id : null,
          purpose: event.purpose,
          payload: event.payload ?? null,
        };
      });

      // 3. 一括 INSERT（ユニーク制約違反 = 楽観的ロック失敗）
      await this.deps.db.insert(domainEvent).values(rows);
    }).mapErr((error) => {
      const cause = error.cause;
      // PostgreSQL エラーコード 23505 = unique_violation = 楽観的ロック失敗
      if (cause instanceof Error && "code" in cause && cause.code === "23505") {
        return KernelErrors.CONCURRENCY_ERROR.create({}, { cause }) as ConcurrencyError;
      }
      return error;
    });
  }

  publish(): ResultAsync<void, DependencyError> {
    if (this.collected.length === 0) return okAsync(undefined);
    return this.deps.publisher.publish(this.collected);
  }

  getCollected(): readonly DomainEvent<unknown>[] {
    return this.collected;
  }
}
```

**イベントストアの利用フロー:**

```
Command 実行時:
1. DomainEventStore インスタンスを生成（コマンドごとに新規）
2. ハンドラー内で domainEventStore.add(event) を呼ぶ
3. ハンドラー完了後、domainEventStore.save() でイベントを DB 保存
4. トランザクション正常終了後、domainEventStore.publish() でメッセージ配信
```

---

## 8. テストパターン

### 8-1. Aggregate の単体テスト

```typescript
// modules/order/write/src/models/item-aggregate/activate-item.test.ts

import { describe, it, expect } from "vitest";
import { createItem } from "./create-item";
import { activateItem } from "./activate-item";

describe("activateItem", () => {
  const baseItem = createItem({
    id: "item-id" as ItemId,
    tenantId: "tenant-id" as TenantId,
    trackingNumber: "TRK-001",
    requesterId: "requester-id" as RequesterId,
    destination: { name: "田中太郎", postalCode: "100-0001", address: "東京都千代田区" },
    locationId: "location-id" as LocationId,
  });

  it("pendingのアイテムはactiveに移行できる", () => {
    const result = activateItem(baseItem, "verified-assignee" as VerifiedAssigneeId);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().status).toBe("active");
    expect(result._unsafeUnwrap().assigneeId).toBe("verified-assignee");
  });

  it("activeのアイテムは再度activeにできる（on_hold からの復帰）", () => {
    const onHoldItem = { ...baseItem, status: "on_hold" as const };
    const result = activateItem(onHoldItem, "verified-assignee" as VerifiedAssigneeId);
    expect(result.isOk()).toBe(true);
  });

  it("completedのアイテムはactiveに移行できない", () => {
    const completedItem = { ...baseItem, status: "completed" as const };
    const result = activateItem(completedItem, "verified-assignee" as VerifiedAssigneeId);
    expect(result.isErr()).toBe(true);
    expect(OrderErrors.ITEM_INVALID_STATUS.is(result._unsafeUnwrapErr())).toBe(true);
  });
});
```

### 8-2. Repository の統合テスト

```typescript
// modules/order/infra/db/src/drizzle-item-repository.integration.ts

import { setupDbWithRollback } from "@platform/db-test-helper";
import * as schema from "@platform/db";

const { getDb, setup } = setupDbWithRollback({ schema });

describe("DrizzleItemRepository", () => {
  // 各テスト前のセットアップ
  setup(async (db) => {
    // マスターデータなど必要なシードデータを挿入
  });

  it("アイテムを保存して取得できる", async () => {
    const db = getDb();
    const repo = new DrizzleItemRepository({ db });

    const item = createItem({
      id: "990e8400-e29b-41d4-a716-446655440001" as ItemId,
      tenantId: TEST_TENANT_ID,
      // ...
    });

    await repo.save(item);

    const found = await repo.find(item.id);
    expect(found.isOk()).toBe(true);
    expect(found._unsafeUnwrap().isSome()).toBe(true);
    expect(found._unsafeUnwrap()._unsafeUnwrap().id).toBe(item.id);
  });

  it("存在しないIDはNoneを返す", async () => {
    const db = getDb();
    const repo = new DrizzleItemRepository({ db });

    const found = await repo.find("not-exists" as ItemId);
    expect(found.isOk()).toBe(true);
    expect(found._unsafeUnwrap().isNone()).toBe(true);
  });

  it("get で存在しないIDはItemNotFoundErrorを返す", async () => {
    const db = getDb();
    const repo = new DrizzleItemRepository({ db });

    const result = await repo.get("not-exists" as ItemId);
    expect(result.isErr()).toBe(true);
    expect(OrderErrors.ITEM_NOT_FOUND.is(result._unsafeUnwrapErr())).toBe(true);
  });
});
```

### 8-3. QueryService の統合テスト

```typescript
// modules/order/infra/db/src/drizzle-item-query-service.integration.ts

import { setupDbWithRollback } from "@platform/db-test-helper";

const { getDb, setup } = setupDbWithRollback({ schema });

describe("DrizzleItemQueryService", () => {
  setup(async (db) => {
    // テスト用テナント・マスターデータを挿入
  });

  it("全アイテムを取得できる", async () => {
    const db = getDb();
    const svc = new DrizzleItemQueryService({ db });

    // テストデータ挿入
    await insertTestItem(db, { id: "990e...", status: "pending" });
    await insertTestItem(db, { id: "990f...", status: "active" });

    const result = await svc.list();
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toHaveLength(2);
  });

  it("ステータスでフィルタリングできる", async () => {
    const db = getDb();
    const svc = new DrizzleItemQueryService({ db });

    await insertTestItem(db, { status: "pending" });
    await insertTestItem(db, { status: "completed" });

    const result = await svc.list({ status: "pending" });
    expect(result._unsafeUnwrap().every((i) => i.status === "pending")).toBe(true);
  });
});
```

### 8-4. テスト用フィクスチャパターン

```typescript
// modules/order/infra/db/src/test-helper/db-fixtures.ts

// テストデータ挿入のヘルパー関数
export async function insertTestItem(
  db: Db,
  overrides: Partial<{
    id: string;
    status: OrderStatus;
    tenantId: string;
    trackingNumber: string;
  }> = {},
) {
  const defaults = {
    id: "990e8400-e29b-41d4-a716-446655440000",
    status: "pending" as const,
    tenantId: TEST_TENANT_UUID,
    trackingNumber: "TRK-TEST-001",
  };
  const data = { ...defaults, ...overrides };

  await db.insert(schema.item).values({
    uuid: data.id,
    status: data.status,
    tenantId: sql`(SELECT id FROM app.tenants WHERE uuid = ${data.tenantId})`,
    trackingNumber: data.trackingNumber,
    // ...
  });
  return data;
}
```

---

## 9. 新コンテキスト実装チェックリスト

新しいコンテキスト（例: `invoice`）を実装する際の手順です。

### Step 1: contracts/public を作成

```
contracts/invoice/public/src/
├── invoice-status.ts        # z.enum + 同名 const（遷移ルール）
├── invoice-errors.ts        # defineError でエラー定義
├── invoice-commands.ts      # コマンドスキーマ + ResultMap
├── invoice-queries.ts       # クエリスキーマ + DTO + ResultMap
├── invoice-events.ts        # イベント型定数 + イベントスキーマ
└── index.ts                 # re-export
```

### Step 2: contracts/server を作成

```
contracts/invoice/server/src/
├── invoice-commands.ts      # CommandBus型 + HandlerDefinition型 + Handler型
├── invoice-queries.ts       # QueryBus型 + HandlerDefinition型
└── index.ts
```

### Step 3: modules/invoice/write を実装

```
modules/invoice/write/src/
├── models/
│   ├── invoice-aggregate/
│   │   ├── types.ts         # Zod スキーマ + 型 + 生成パラメーター型
│   │   ├── create-invoice.ts
│   │   ├── approve-invoice.ts
│   │   ├── *.test.ts        # 各操作の単体テスト
│   │   └── test-helper/
│   │       └── test-helpers.ts
│   ├── invoice-repository.ts  # Interface
│   └── domain-events.ts       # イベント生成ヘルパー
└── command-bus/
    ├── handlers/
    │   ├── create-invoice.ts
    │   ├── approve-invoice.ts
    │   └── index.ts
    ├── builder.ts            # InvoiceCommandBusBuilder
    ├── bus.ts                # createInvoiceCommandBus
    └── index.ts
```

### Step 4: modules/invoice/read を実装

```
modules/invoice/read/src/
├── models/
│   ├── invoice-read-model.ts
│   ├── invoice-query-service.ts  # Interface
│   └── index.ts
└── query-bus/
    ├── handlers/
    │   ├── list-invoices-for-admin.ts
    │   └── index.ts
    ├── builder.ts
    ├── bus.ts
    └── index.ts
```

### Step 5: modules/invoice/infra/db を実装

```
modules/invoice/infra/db/src/
├── drizzle-invoice-repository.ts
├── drizzle-invoice-repository.integration.ts
├── drizzle-invoice-query-service.ts
├── drizzle-invoice-query-service.integration.ts
├── test-helper/
│   └── db-fixtures.ts
└── index.ts
```

### 核心チェックリスト

| 項目 | チェックポイント |
|------|-----------------|
| コマンド識別 | `type: z.literal("invoice.createInvoice")` の形式 |
| ResultMap | `[成功型, エラー型]` のタプルで全コマンドを定義 |
| Aggregate | Zod スキーマ + ピュア関数（クラス不使用） |
| Repository | `save / find / get` の3メソッドで Interface を定義 |
| ハンドラー | `factory + settings` のペア形式 |
| 取得→ロジック→保存→イベント | ハンドラーの4ステップパターン |
| transactional | DB 書き込みがある場合は `true` |
| エラー | `DependencyError` を基底に、ドメインエラーを Union 型で追加 |
| Builder | 全コマンド/クエリ登録漏れがコンパイルエラーになること |
| テスト | Aggregate は単体テスト、Repository/QueryService は統合テスト |

---

## 付録: DomainEvent の型定義

```typescript
// contracts/core/public/src/domain-event.ts

export const ActorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("user"), id: z.string() }),
  z.object({ type: z.literal("system") }),
]);
export type Actor = z.infer<typeof ActorSchema>;

export const PurposeSchema = z.enum(["event_sourcing", "audit_only"]);
export type Purpose = z.infer<typeof PurposeSchema>;

export const DomainEventBaseSchema = z.object({
  id: DomainEventIdSchema,
  type: z.string(),
  occurredAt: z.string(),             // ISO 8601
  tenantId: z.string().uuid(),
  aggregateType: z.string(),          // 集約の種類（例: "Item", "Invoice"）
  aggregateId: z.string(),
  aggregateVersion: z.number().int(), // 楽観的ロック用
  schemaVersion: z.number().int(),
  correlationId: z.string().uuid(),
  causationId: z.string().uuid().optional(),
  actor: ActorSchema,
  purpose: PurposeSchema,
});

export type DomainEvent<P> = DomainEventBase & { payload: P };

// イベントスキーマ作成ヘルパー
export function createDomainEventSchema<T extends z.ZodType>(payloadSchema: T) {
  return DomainEventBaseSchema.extend({ payload: payloadSchema });
}
```
