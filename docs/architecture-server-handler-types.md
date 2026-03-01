# Server 側ハンドラー型パターン

`contracts/{context}/server/` と `shared-kernel/server/` が提供するサーバー専用の型群を解説します。
これらは CommandBus / QueryBus へのハンドラー登録を **型安全** に行うための基盤です。

> **前提:** `contracts/public` のコマンド・クエリ・ResultMap 定義、および `shared-kernel/server` の基本型（CommandBus、QueryBus、Container、Context、Middleware）は `architecture-application-patterns.md` を参照してください。

---

## 目次

1. [全体像と依存関係](#1-全体像と依存関係)
2. [shared-kernel/server — サポートユーティリティ](#2-shared-kernelserver--サポートユーティリティ)
   - 2-1. Context ファクトリー
   - 2-2. Option → Result 変換
   - 2-3. リトライ（withRetry）
   - 2-4. UUID v7 生成
3. [contracts/server — コマンドハンドラー型](#3-contractsserver--コマンドハンドラー型)
4. [contracts/server — クエリハンドラー型](#4-contractsserver--クエリハンドラー型)
5. [ファイル構成と全体像](#5-ファイル構成と全体像)

---

## 1. 全体像と依存関係

```
shared-kernel/server/
├── command-handler.ts      # CommandHandlerFacotry<Deps, Commands, ResultMap, Key, Store>
├── query-handler.ts        # QueryHandlerFacotry<Deps, Queries, ResultMap, Key>
├── command-bus.ts          # CommandBus<Commands, CommandType, ResultMap>
├── query-bus.ts            # QueryBus<Queries, ResultMap>
├── context.ts              # Context, ContextProvider, updateContainer()
├── context-factory.ts      # createNewContext(), forkContext()   ← 本ドキュメントの対象
├── container.ts            # Container, Token, createToken()
├── middleware.ts           # Middleware, applyMiddlewares()
├── middlewares/
│   ├── logging-middleware.ts
│   └── transactional-middleware.ts
├── option.ts               # toResult()                          ← 本ドキュメントの対象
├── retry.ts                # withRetry(), RetrySettings          ← 本ドキュメントの対象
└── uuidv7.ts               # generateUuidV7()                    ← 本ドキュメントの対象

contracts/{context}/server/
├── {context}-commands.ts   # CommandBus 型・ハンドラー型・settings 型
├── {context}-queries.ts    # QueryBus 型・ハンドラー型・settings 型
└── index.ts                # barrel export
```

### 依存関係

```
contracts/{context}/server/
    ↓ import
shared-kernel/server          （CommandBus, QueryBus, CommandHandlerFacotry, Context 等）
contracts/{context}/public    （Commands, Queries, ResultMap, CommandType, QueryType）
@modules/core-write           （DomainEventStore ← コマンド側のみ）
```

`contracts/server` は **実装を持たない純粋な型定義** です。実装（ハンドラー関数・バス組み立て）は `modules/{context}/write` および `modules/{context}/read` が担います。

---

## 2. shared-kernel/server — サポートユーティリティ

### 2-1. Context ファクトリー（`context-factory.ts`）

リクエスト受信時の初期 `Context` 生成と、ドメインイベント連鎖時の子 `Context` 派生を担うファクトリー関数群です。
`Context` は `container` を除いた形で生成し、後で `updateContainer()` で DI コンテナを付与します。

```typescript
// shared-kernel/server/src/context-factory.ts

import type { TenantId, UserId, AdminUserId } from "@shared-kernel/public";
import type { Context } from "./context";
import { generateUuidV7 } from "./uuidv7";

/**
 * 新しい Context を生成する（API リクエスト受信時に呼ぶ）
 * correlationId = 自身の id（分散トレーシングの起点）
 * causationId = undefined（根本コンテキストには原因なし）
 */
export function createNewContext(params: {
  tenantId: TenantId;
  userId: UserId;
  adminUserId?: AdminUserId;
}): Omit<Context, "container"> {
  const id = generateUuidV7();
  return {
    id,
    tenantId: params.tenantId,
    userId: params.userId,
    adminUserId: params.adminUserId,
    correlationId: id,       // 最初のコンテキストは自身が correlationId
    causationId: undefined,  // 根本コンテキストには causationId なし
  };
}

/**
 * 既存コンテキストから子コンテキストを派生させる（ドメインイベント連鎖処理）
 * correlationId = 親の correlationId（同一リクエストの分散トレーシングを維持）
 * causationId = 親の id（因果関係の追跡）
 */
export function forkContext(
  parent: Omit<Context, "container">,
  overrides?: Partial<Pick<Context, "userId">>,
): Omit<Context, "container"> {
  return {
    id: generateUuidV7(),
    tenantId: parent.tenantId,
    userId: overrides?.userId ?? parent.userId,
    adminUserId: parent.adminUserId,
    correlationId: parent.correlationId,  // 分散トレーシング: 親の correlationId を引き継ぐ
    causationId: parent.id,               // 原因は親コンテキストの id
  };
}
```

また `context.ts` には非同期で Context を解決するための型も定義されています：

```typescript
// shared-kernel/server/src/context.ts

/** Context を非同期で解決する（認証ミドルウェア等で使う） */
export type ContextProvider = () => ResultAsync<Omit<Context, "container">, AppError>;
```

**使い方:**

```typescript
// API ハンドラー：認証情報から Context を生成し、DI コンテナを付与
const ctx = createNewContext({
  tenantId: auth.tenantId,
  userId: auth.userId,
});
const context = updateContainer(ctx, container);
const result = await commandBus.execute(command, context);

// ドメインイベント連鎖処理：子 Context を派生（correlationId 引き継ぎ）
const childCtx = forkContext(context);
// childCtx.correlationId === context.correlationId  // 同じ
// childCtx.causationId   === context.id             // 親を指す
const childContext = updateContainer(childCtx, container);
```

---

### 2-2. Option → Result 変換（`option.ts`）

`Option<T>`（`{ type: "some", value: T } | { type: "none" }`）を `Result<T, E>` に変換するユーティリティです。
「存在しないこと」がビジネスエラーである場面で使います。

```typescript
// shared-kernel/server/src/option.ts

import { isSome, type Option } from "@shared-kernel/public";
import { ok, err, type Result } from "neverthrow";

export const toResult = <T, E>(option: Option<T>, error: () => E): Result<T, E> => {
  if (isSome(option)) {
    return ok(option.value);
  }
  return err(error());
};
```

**使い方:**

```typescript
// リポジトリは Option を返す（null/undefined の曖昧さを避けるため）
const optItem = await itemRepository.find(command.itemId);
//    ^ ResultAsync<Option<ItemAggregate>, DependencyError>

// Option を "存在しないのはエラー" として Result に変換
return itemResult.andThen((opt) =>
  toResult(opt, () => OrderErrors.ITEM_NOT_FOUND.create({ itemId: command.itemId })),
);
//    ^ Result<ItemAggregate, ItemNotFoundError>
```

**設計の意図:** リポジトリの `find()` は `Option<T>` を返し、「見つからない」がエラーかどうかはハンドラー側の判断に委ねます。`toResult` でその変換をワンライナーで表現できます。

---

### 2-3. リトライ（`retry.ts`）

`ResultAsync` を返す関数を指定回数リトライする汎用ユーティリティです。
`errorMapper` の有無が **型レベルで検出** され、指定時は返り値のエラー型が変換後の型に変わります。

```typescript
// shared-kernel/server/src/retry.ts

export type RetrySettings<E = unknown, MappedE = E> = {
  maxAttempts: number;
  backoffMs?: number;
  shouldRetry?: (error: E) => boolean;   // false を返すとリトライを中断
  errorMapper?: (error: E) => MappedE;   // 指定すると返り値のエラー型が変換後の型になる
};

/**
 * ResultAsync をリトライ設定に基づいて実行する
 *
 * errorMapper が指定されると → 返り値エラー型が MappedE
 * errorMapper が未指定のとき → 返り値エラー型が E のまま
 */
export function withRetry<T, E, Settings extends RetrySettings<E, any>>(
  fn: () => ResultAsync<T, E>,
  settings: Settings,
): ResultAsync<T, HasErrorMapper<Settings> extends true ? ExtractMappedError<Settings> : E>;
```

**型レベルのしくみ（HasErrorMapper）:**

```typescript
// MappedE が E と異なる場合に true になる型
type HasErrorMapper<Settings extends RetrySettings<any, any>> =
  ExtractMappedError<Settings> extends ExtractOriginalError<Settings>
    ? ExtractOriginalError<Settings> extends ExtractMappedError<Settings>
      ? false
      : true
    : true;
```

`errorMapper` を指定すると `MappedE ≠ E` になり `HasErrorMapper = true`、
その結果 `withRetry()` の返り値が `ResultAsync<T, MappedE>` になります。

**contracts/server 層での retry 必須化:**

`shared-kernel` の `RetrySettings.errorMapper` は省略可能ですが、`contracts/server` 層では retry 設定時に `errorMapper` を **型レベルで必須** にします（詳細は Section 3 参照）。

---

### 2-4. UUID v7 生成（`uuidv7.ts`）

UUIDv7 を生成するラッパー関数です。時刻ベースで単調増加するため、DB のインデックス効率が UUID v4 より優れています。

```typescript
// shared-kernel/server/src/uuidv7.ts

import { uuidv7 as uuidv7Lib } from "uuidv7";

/**
 * UUIDv7 を生成する
 *
 * - 時刻（ミリ秒）ベースで単調増加 → B-tree インデックスへの挿入がシーケンシャル
 * - UUID v4 と同程度のランダム性（衝突確率は極めて低い）
 * - ORDER BY id で挿入時刻順に並ぶ
 * - テストで固定値を使いたい場合は DI で差し替え可能な設計を推奨
 */
export const generateUuidV7 = (): string => uuidv7Lib();
```

**使い方:**

```typescript
// 集約 ID の生成（コマンド受信時）
const itemId = generateUuidV7() as ItemId;

// Context の id・correlationId 生成（context-factory.ts 内で使用）
const id = generateUuidV7();
```

---

## 3. contracts/server — コマンドハンドラー型

`contracts/{context}/server/` の Commands ファイルは、`shared-kernel/server` の汎用型を **特定コンテキスト向けに具体化** します。
`contracts/public` の Commands / ResultMap を組み合わせ、`modules/write` が実装すべきハンドラーの型シグネチャを定義します。

### ファイル構成

```
contracts/order/server/src/order-commands.ts
```

### 依存する shared-kernel の型

| 型 | 役割 |
|----|------|
| `CommandBus<Commands, CommandType, ResultMap>` | バスの execute メソッドの型 |
| `CommandHandlerFacotry<Deps, Commands, ResultMap, Key, Store>` | ファクトリー関数の型（deps → handler） |
| `Context` | ハンドラーに渡る実行コンテキスト |

### 完全な実装例

```typescript
// contracts/order/server/src/order-commands.ts

import type {
  OrderCommands,
  OrderCommandsResultMap,
  OrderCommandType,
} from "@contracts/order-public";
import type { CommandHandlerFacotry, CommandBus, Context } from "@shared-kernel/server";
import type { DomainEventStore } from "@modules/core-write";
import type { ResultAsync } from "neverthrow";

// ============================================================
// ヘルパー型（ResultOf / ErrorOf を ResultMap から取り出す）
// ============================================================

/**
 * コマンドキー K に対応するコマンドの型を取り出す
 * Extract<Union, { type: K }> パターン
 */
export type OrderCommandOf<K extends OrderCommandType> = Extract<
  OrderCommands,
  { type: K }
>;

/**
 * ResultMap のタプル [Result, Error] から成功型を取り出す
 * タプルでない場合（後方互換）はそのまま返す
 */
type ResultOf<K extends OrderCommandType> = OrderCommandsResultMap[K] extends [
  infer Result,
  unknown,
]
  ? Result
  : OrderCommandsResultMap[K];

/**
 * ResultMap のタプル [Result, Error] からエラー型を取り出す
 * タプルでない場合は never（エラーなし）
 */
type ErrorOf<K extends OrderCommandType> = OrderCommandsResultMap[K] extends [
  unknown,
  infer Error,
]
  ? Error
  : never;

// ============================================================
// CommandBus（外部から呼ぶ型）
// ============================================================

/**
 * このコンテキストの CommandBus 型
 * execute<K>(command, context) → ResultAsync<ResultMap[K][0], ResultMap[K][1]>
 */
export type OrderCommandBus = CommandBus<
  OrderCommands,
  OrderCommandType,
  OrderCommandsResultMap
>;

// ============================================================
// ハンドラー関連型（modules/write が実装する）
// ============================================================

/**
 * ハンドラーファクトリーの型
 * (deps: Deps) => (command, { afterCommit, context, domainEventStore }) => ResultAsync<...>
 */
export type OrderCommandHandlerFactory<
  Deps,
  Key extends keyof OrderCommandsResultMap,
> = CommandHandlerFacotry<
  Deps,
  OrderCommands,
  OrderCommandsResultMap,
  Key,
  DomainEventStore  // コマンド側は DomainEventStore を受け取る
>;

/**
 * 具体的なハンドラー関数の型
 * K を指定するだけで command / Result / Error が自動推論される
 */
export type OrderCommandHandler<K extends OrderCommandType> = (
  command: OrderCommandOf<K>,
  args: {
    /** コミット後の後処理（外部通知・メール送信等）。失敗してもロールバックしない */
    afterCommit: () => ResultAsync<void, unknown>;
    context: Context;
    domainEventStore: DomainEventStore;
  },
) => ResultAsync<ResultOf<K>, ErrorOf<K>>;

/**
 * 全コマンドタイプ → ハンドラー のレコード型
 * CommandBusBuilder が型レベルで「全コマンドのハンドラーが揃っているか」を検証するために使う
 */
export type OrderCommandHandlers = {
  [K in OrderCommandType]: OrderCommandHandler<K>;
};

/**
 * ハンドラー定義（factory + settings のペア）
 * CommandBusBuilder.register() に渡す
 */
export type OrderCommandHandlerDefinition<Deps, K extends OrderCommandType> = {
  factory: OrderCommandHandlerFactory<Deps, K>;
  settings: OrderCommandHandlerSettings<K>;
};

/**
 * ハンドラー設定型
 *
 * retry なし: transactional だけ設定できる
 * retry あり: errorMapper が必須（shared-kernel の RetrySettings.errorMapper は省略可能だが、
 *             contracts 層では型レベルで必須化してエラー型安全性を強制する）
 */
export type OrderCommandHandlerSettings<K extends OrderCommandType> =
  | {
      readonly?: boolean;
      transactional?: boolean;
      retry: {
        maxAttempts: number;
        backoffMs?: number;
        shouldRetry?: (error: ErrorOf<K>) => boolean;
        errorMapper: (error: ErrorOf<K>) => ErrorOf<K>;  // retry 時は必須（省略不可）
      };
    }
  | {
      readonly?: boolean;
      transactional?: boolean;
      retry?: never;
    };
```

### 型の関係図

```
contracts/public                         contracts/server
───────────────────────────────────────  ──────────────────────────────────────────────────
OrderCommands (union)                →   OrderCommandOf<K>           (Extract<Union, {type:K}>)
OrderCommandsResultMap               →   ResultOf<K> / ErrorOf<K>    (タプル展開)
OrderCommandType (string union)      →   OrderCommandBus             (CommandBus の具体化)
                                         OrderCommandHandlerFactory  (Deps → handler)
                                         OrderCommandHandler<K>      (ハンドラー関数シグネチャ)
                                         OrderCommandHandlers        (全コマンドのレコード)
                                         OrderCommandHandlerDefinition (factory + settings)
                                         OrderCommandHandlerSettings (retry 強制含む)
```

### 使い方（handlers/create-item.ts での実装例）

```typescript
// modules/order/write/src/command-bus/handlers/create-item.ts

import type {
  OrderCommandHandlerDefinition,
  OrderCommandHandlerFactory,
} from "@contracts/order-server";

type Deps = {
  itemRepository: ItemRepository;
  generateId: () => string;
};

const factory: OrderCommandHandlerFactory<Deps, "order.createItem"> =
  ({ itemRepository, generateId }) =>
  async (command, { context, domainEventStore }) => {
    const item = createItem({
      id: generateId() as ItemId,
      tenantId: context.tenantId,
      requesterId: command.requesterId,
      destination: command.destination,
      trackingNumber: command.trackingNumber,
    });

    const saveResult = await itemRepository.save(item, domainEventStore);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok({ itemId: item.id });
  };

export const createItemHandlerDefinition: OrderCommandHandlerDefinition<
  Deps,
  "order.createItem"
> = {
  factory,
  settings: { transactional: true },
};
```

---

## 4. contracts/server — クエリハンドラー型

クエリ側も同様のパターンで定義します。コマンド側と異なる点は、`DomainEventStore` と `afterCommit` が不要な点のみです。

### 完全な実装例

```typescript
// contracts/order/server/src/order-queries.ts

import type {
  OrderQueries,
  OrderQueriesResultMap,
  OrderQueryType,
} from "@contracts/order-public";
import type { QueryHandlerFacotry, QueryBus, Context } from "@shared-kernel/server";
import type { ResultAsync } from "neverthrow";

// ============================================================
// ヘルパー型
// ============================================================

export type OrderQueryOf<K extends OrderQueryType> = Extract<OrderQueries, { type: K }>;

type ResultOf<K extends OrderQueryType> = OrderQueriesResultMap[K] extends [
  infer Result,
  unknown,
]
  ? Result
  : OrderQueriesResultMap[K];

type ErrorOf<K extends OrderQueryType> = OrderQueriesResultMap[K] extends [
  unknown,
  infer Error,
]
  ? Error
  : never;

// ============================================================
// QueryBus（外部から呼ぶ型）
// ============================================================

/**
 * __map ファントムプロパティにより型推論が働く
 * （実際には持っていないが、TypeScript の型推論に利用される）
 */
export type OrderQueryBus = QueryBus<OrderQueries, OrderQueriesResultMap>;

// ============================================================
// ハンドラー関連型（modules/read が実装する）
// ============================================================

/**
 * ハンドラーファクトリーの型
 * (deps: Deps) => (query, context) => ResultAsync<...>
 */
export type OrderQueryHandlerFactory<
  Deps,
  Key extends keyof OrderQueriesResultMap,
> = QueryHandlerFacotry<Deps, OrderQueries, OrderQueriesResultMap, Key>;

/**
 * 具体的なハンドラー関数の型
 * コマンドと異なり afterCommit と domainEventStore がない
 */
export type OrderQueryHandler<K extends OrderQueryType> = (
  query: OrderQueryOf<K>,
  context: Context,
) => ResultAsync<ResultOf<K>, ErrorOf<K>>;

/** 全クエリタイプ → ハンドラー のレコード型 */
export type OrderQueryHandlers = {
  [K in OrderQueryType]: OrderQueryHandler<K>;
};

/** ハンドラー定義（factory + settings のペア） */
export type OrderQueryHandlerDefinition<Deps, K extends OrderQueryType> = {
  factory: OrderQueryHandlerFactory<Deps, K>;
  settings: OrderQueryHandlerSettings<K>;
};

/**
 * クエリハンドラー設定型
 * transactional 設定なし（クエリは読み取り専用）
 */
type OrderQueryHandlerSettings<K extends OrderQueryType> =
  | {
      retry: {
        maxAttempts: number;
        backoffMs?: number;
        shouldRetry?: (error: ErrorOf<K>) => boolean;
        errorMapper: (error: ErrorOf<K>) => ErrorOf<K>;  // retry 時は必須
      };
    }
  | {
      retry?: never;
    };
```

### コマンド vs クエリの比較

| 項目 | コマンド（`{context}-commands.ts`） | クエリ（`{context}-queries.ts`） |
|------|-----------------------------------|---------------------------------|
| ハンドラー引数 | `(command, { afterCommit, context, domainEventStore })` | `(query, context)` |
| `transactional` 設定 | あり | なし |
| `DomainEventStore` | あり（ドメインイベント発行に使う） | なし |
| `afterCommit` | あり（コミット後の外部通知等） | なし |
| `readonly` オプション | あり | なし |
| `CommandBus` の第3型引数 | `CommandType`（3引数）が必要 | `QueryBus`（2引数）でよい |

---

## 5. ファイル構成と全体像

### contracts/server の index.ts

```typescript
// contracts/order/server/src/index.ts

export * from "./order-commands";
export * from "./order-queries";
```

### 型の流れ（全体像）

```
[HTTP リクエスト受信]
        │
        ▼
createNewContext()          ← shared-kernel/server/context-factory.ts
        │
        ▼
updateContainer(ctx, container)   ← shared-kernel/server/context.ts
        │
        ▼
commandBus.execute(command, context)    ← OrderCommandBus（contracts/server）
        │
        ▼
[CommandBusBuilder が選択したハンドラーを実行]
applyMiddlewares([logging, transactional], info, handler)
        │
        ├─ handler(command, { afterCommit, context, domainEventStore })
        │       ← OrderCommandHandlerFactory で生成した関数
        │
        ▼
        ResultAsync<Result, Error>    ← ResultOf<K>, ErrorOf<K> で型安全
```

### 新コンテキスト追加時のチェックリスト（server 側）

```
contracts/{context}/server/src/
  □ {context}-commands.ts を作成
      □ {Context}CommandOf<K> を定義
      □ ResultOf<K> / ErrorOf<K> を定義（内部型）
      □ {Context}CommandBus を定義
      □ {Context}CommandHandlerFactory<Deps, Key> を定義
      □ {Context}CommandHandler<K> を定義
      □ {Context}CommandHandlers を定義
      □ {Context}CommandHandlerDefinition<Deps, K> を定義
      □ {Context}CommandHandlerSettings<K> を定義（retry 時に errorMapper 必須）
  □ {context}-queries.ts を作成（同様のパターン）
  □ index.ts に barrel export を追加

shared-kernel/server/ から使う関数
  □ createNewContext() で初期 Context を生成
  □ forkContext() でイベント連鎖時に子 Context を生成
  □ toResult() でリポジトリの Option<T> をエラーに変換
  □ generateUuidV7() で集約 ID を生成
  □ withRetry() でリトライが必要な操作を実装（必要な場合のみ）
```
