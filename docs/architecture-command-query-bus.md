# CommandBus / QueryBus — 実装パターン

コンテキストごとの CommandBus / QueryBus の実装パターンを、`delivery` モジュールの実装を基に解説します。
新しいコンテキストを追加する際のリファレンスとして使用してください。

> **関連ドキュメント:**
> - `architecture-core-infrastructure.md` — DomainEventStore、Container、Middleware 等の基盤
> - `architecture-contracts-modules.md` — contracts・modules の型定義パターン
> - `architecture-server-handler-types.md` — shared-kernel のハンドラー型の詳細

---

## 目次

1. [全体像](#1-全体像)
2. [型の階層](#2-型の階層)
3. [CommandBus の実装](#3-commandbus-の実装)
4. [QueryBus の実装](#4-querybus-の実装)
5. [ハンドラーの実装パターン](#5-ハンドラーの実装パターン)
6. [ファクトリー関数（bus.ts）](#6-ファクトリー関数busts)
7. [DI での接続](#7-di-での接続)
8. [新コンテキスト追加チェックリスト](#8-新コンテキスト追加チェックリスト)

---

## 1. 全体像

### ディレクトリ構成

```
modules/{context}/
├── write/src/
│   └── command-bus/
│       ├── builder.ts      # CommandBusBuilder（型安全なビルダー）
│       ├── bus.ts           # ファクトリー関数（組み立て + export）
│       ├── handlers/
│       │   ├── index.ts     # barrel export
│       │   ├── create-shipment.ts
│       │   ├── complete-delivery.ts
│       │   └── ...
│       └── index.ts         # re-export bus.ts
│
└── read/src/
    └── query-bus/
        ├── builder.ts       # QueryBusBuilder（型安全なビルダー）
        ├── bus.ts            # ファクトリー関数（組み立て + export）
        ├── handlers/
        │   ├── index.ts      # barrel export
        │   ├── list-shipments-for-admin.ts
        │   ├── find-shipment-for-delivery-person.ts
        │   └── ...
        └── index.ts          # re-export bus.ts
```

### リクエストの流れ

```
[HTTP Handler]
    │ command = CommandSchema.parse(body)
    │ commandBus = container.resolve(DELIVERY_COMMAND_BUS)
    │
    ▼
[commandBus.execute(command, context)]
    │
    ▼
[CommandBusBuilder.execute]
    │ 1. command.type からハンドラーを選択
    │ 2. DomainEventStore を生成
    │ 3. ミドルウェアチェーンを構築
    │
    ▼
[applyMiddlewares]
    ├── LoggingMiddleware
    └── TransactionalMiddleware（transactional: true の場合）
        │
        ▼
    [handler(command, { context, domainEventStore, afterCommit })]
        │ ← 集約の取得・ドメインロジック・保存・イベント収集
        │
        ▼
    [domainEventStore.save()]  ← TX 内で DB 永続化
    │
    ▼（TX コミット後）
[domainEventStore.publish()]   ← サブスクライバーに配信
    │
    ▼
[ResultAsync<Result, Error>]
```

---

## 2. 型の階層

### 型が定義される場所

```
shared-kernel/server/
├── command-bus.ts          # CommandBus<Commands, CommandType, ResultMap>
├── query-bus.ts            # QueryBus<Queries, ResultMap>
├── command-handler.ts      # CommandHandlerFacotry<Deps, Commands, ResultMap, Key, Store>
└── query-handler.ts        # QueryHandlerFacotry<Deps, Queries, ResultMap, Key>
        ↑ 汎用型
        │
contracts/{context}/public/
├── {context}-commands.ts   # Commands union, CommandsResultMap, CommandType
└── {context}-queries.ts    # Queries union, QueriesResultMap, QueryType
        ↑ 型パラメータの具体値
        │
contracts/{context}/server/
├── {context}-commands.ts   # {Context}CommandBus, {Context}CommandHandler<K>, ...
└── {context}-queries.ts    # {Context}QueryBus, {Context}QueryHandler<K>, ...
        ↑ コンテキスト固有の具体型
        │
modules/{context}/write/    # CommandBusBuilder, ハンドラー実装
modules/{context}/read/     # QueryBusBuilder, ハンドラー実装
```

### CommandBus 型の具体化の流れ

```typescript
// 1. shared-kernel: 汎用型
type CommandBus<Commands, CommandType, CommandsResultMap> = {
  execute<K extends CommandType>(
    command: Extract<Commands, { type: K }>,
    context: Context,
  ): ResultAsync<CommandsResultMap[K][0], CommandsResultMap[K][1]>;
};

// 2. contracts/server: コンテキスト固有の型
type DeliveryCommandBus = CommandBus<
  DeliveryCommands,        // ← contracts/public の union
  DeliveryCommandType,     // ← contracts/public の string union
  DeliveryCommandsResultMap // ← contracts/public の result map
>;

// 3. 呼び出し側: 型安全な execute
commandBus.execute(
  { type: "delivery.completeDelivery", shipmentId, photoUrls },
  //  ↑ type が "delivery.completeDelivery" に絞られる
  context,
);
// → ResultAsync<DeliveryCompleteDeliveryResult, DependencyError | ShipmentNotFoundError | ...>
```

### QueryBus 型も同様

```typescript
type QueryBus<Queries, QueriesResultMap> = {
  execute<K extends keyof QueriesResultMap & Queries["type"]>(
    query: Extract<Queries, { type: K }>,
    context: Context,
  ): ResultAsync<QueriesResultMap[K][0], QueriesResultMap[K][1]>;
};

type DeliveryQueryBus = QueryBus<DeliveryQueries, DeliveryQueriesResultMap>;
```

**CommandBus と QueryBus の型引数の違い:** CommandBus は `CommandType`（string union）を第2引数に取る。QueryBus は `Queries["type"]` から推論するため不要。

---

## 3. CommandBus の実装

### 3-1. CommandBusBuilder

Builder パターンで**全コマンドが登録されたことを型レベルで保証**します。

```typescript
// modules/{context}/write/src/command-bus/builder.ts

export class DeliveryCommandBusBuilder<
  Deps,
  Registered extends Partial<Record<DeliveryCommandType, unknown>> = {},
> {
  private readonly handlers: Partial<Record<DeliveryCommandType, HandlerRegistration<Deps>>> = {};
  private readonly middlewares: Middleware[] = [];
  private readonly deps: BuilderDeps;

  constructor(deps: BuilderDeps) {
    this.deps = deps;
  }

  // ── ミドルウェア登録 ──
  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  // ── ハンドラー登録（型パラメータ Registered を積み上げる） ──
  register<K extends DeliveryCommandType>(
    commandType: K,
    registration: {
      handlerFactory: (deps: Deps) => DeliveryCommandHandler<K>;
      settings: DeliveryCommandHandlerSettings<K>;
    },
  ): DeliveryCommandBusBuilder<Deps, Registered & Record<K, DeliveryCommandHandler<K>>> {
    this.handlers[commandType] = registration;
    return this as unknown as DeliveryCommandBusBuilder<
      Deps,
      Registered & Record<K, DeliveryCommandHandler<K>>
    >;
  }

  // ── ビルド（全コマンドが登録済みでないとコンパイルエラー） ──
  build(
    this: MissingKeys<Registered> extends never
      ? DeliveryCommandBusBuilder<Deps, Registered>
      : never,   // ← 未登録コマンドがあると never になりコンパイル不可
    options: BuildOptions<Deps>,
  ): DeliveryCommandBus { ... }
}

// 未登録コマンドを検出する型
type MissingKeys<Registered> = Exclude<DeliveryCommandType, keyof Registered>;
```

**型安全性のポイント:**
- `register()` を呼ぶたびに `Registered` 型に `Record<K, ...>` が追加される
- `build()` の `this` 制約で `MissingKeys<Registered> extends never`（= 全キーが登録済み）を強制
- **1つでも未登録のコマンドがあるとコンパイルエラー**になる

### 3-2. Builder 内部の execute 実装

```typescript
build(options): DeliveryCommandBus {
  return {
    execute: <K extends DeliveryCommandType>(command, context) => {
      const registration = this.handlers[command.type];
      const { handlerFactory, settings } = registration;

      // ── 毎回新しい DomainEventStore を生成 ──
      const domainEventStore = this.deps.createDomainEventStore();

      const info = {
        type: command.type,
        payload: command,
        context,
        transactional: settings.transactional,
      };

      // ── ハンドラー実行 ──
      const executeHandler = () => {
        const deps = resolveDeps(info.context.container);
        //                       ↑ TX middleware が fork した container を使う
        const handler = handlerFactory(deps);
        const execute = () =>
          handler(command, { afterCommit, context, domainEventStore })
            .andThen((result) =>
              domainEventStore.save().map(() => result)
              //               ↑ TX 内でイベント永続化
            );

        return settings.retry ? withRetry(execute, settings.retry) : execute();
      };

      // ── ミドルウェア適用 → 実行 → publish ──
      return applyMiddlewares(middlewares, info, executeHandler)
        .andThen((result) =>
          domainEventStore.publish().map(() => result)
          //               ↑ TX 外でイベント配信
        );
    },
  };
}
```

**重要な設計判断:**
1. `DomainEventStore` は **execute のたびに新規生成**（コマンド間でイベントが混ざらない）
2. `resolveDeps` は `info.context.container` から解決（TX middleware が fork した container を使う）
3. `save()` は middleware チェーン内（= TX 内）、`publish()` は外（= TX コミット後）

---

## 4. QueryBus の実装

### 4-1. QueryBusBuilder

CommandBusBuilder と同じパターンですが、DomainEventStore 関連がありません。

```typescript
// modules/{context}/read/src/query-bus/builder.ts

export class DeliveryQueryBusBuilder<
  Deps,
  Registered extends Partial<Record<DeliveryQueryType, unknown>> = {},
> {
  use(middleware: Middleware): this { ... }

  register<K extends DeliveryQueryType>(
    queryType: K,
    registration: {
      handlerFactory: (deps: Deps) => DeliveryQueryHandler<K>;
      settings: { retry?: object };
    },
  ): DeliveryQueryBusBuilder<Deps, Registered & Record<K, DeliveryQueryHandler<K>>> { ... }

  build(
    this: MissingKeys<Registered> extends never
      ? DeliveryQueryBusBuilder<Deps, Registered>
      : never,
    options: BuildOptions<Deps>,
  ): DeliveryQueryBus { ... }
}
```

### 4-2. CommandBus vs QueryBus の違い

| 項目 | CommandBusBuilder | QueryBusBuilder |
|------|-------------------|-----------------|
| `DomainEventStore` | あり（コンストラクタで `createDomainEventStore` を受け取る） | なし |
| ハンドラー引数 | `(command, { afterCommit, context, domainEventStore })` | `(query, context)` |
| `transactional` | settings に指定可 | なし |
| `save` / `publish` | execute 内で自動呼び出し | なし |
| ミドルウェア | Logging + Transactional | Logging のみ（通常） |

---

## 5. ハンドラーの実装パターン

### 5-1. コマンドハンドラー

すべてのコマンドハンドラーは `{Context}CommandHandlerDefinition<Deps, CommandType>` 型で `factory` と `settings` のペアとして定義します。

#### パターン A: 基本（取得 → ロジック → 保存 → イベント）

```typescript
// handlers/complete-delivery.ts

export const completeDeliveryHandler: DeliveryCommandHandlerDefinition<
  {
    shipmentRepository: ShipmentRepository;
    domainEventIdGenerator: DomainEventIdGenerator;
  },
  "delivery.completeDelivery"   // ← この文字列から Result/Error 型が自動推論
> = {
  factory: (deps) => (command, args) => {
    return deps.shipmentRepository
      .get(command.shipmentId)                                    // 1. 取得
      .andThen((shipment) =>
        completeDelivery(shipment, command.photoUrls))            // 2. ドメインロジック
      .andThen((updatedShipment) =>
        deps.shipmentRepository.save(updatedShipment)             // 3. 保存
          .map(() => updatedShipment))
      .map((shipment) => {
        args.domainEventStore.add(createShipmentEvent({ ... }));  // 4. イベント収集
        return { shipmentId: shipment.id };
      });
  },
  settings: {
    transactional: true,
  },
};
```

#### パターン B: 新規作成（ロジック → 保存 → イベント）

```typescript
// handlers/create-shipment.ts

export const createShipmentHandler: DeliveryCommandHandlerDefinition<
  { shipmentRepository: ShipmentRepository; domainEventIdGenerator: DomainEventIdGenerator },
  "delivery.createShipment"
> = {
  factory: (deps) => (command, { context, domainEventStore }) => {
    const shipment = createShipment({           // 1. 集約を生成（ピュア関数）
      id: command.id,
      tenantId: context.tenantId,
      ...command,
    });
    return deps.shipmentRepository
      .save(shipment)                           // 2. 保存
      .map(() => {
        domainEventStore.add(createShipmentEvent({ ... }));  // 3. イベント
        return { shipmentId: shipment.id };
      });
  },
  settings: { transactional: true },
};
```

#### パターン C: 他バスを経由する検証付き

```typescript
// handlers/add-shipment-to-delivery-run.ts

export const addShipmentToDeliveryRunHandler: DeliveryCommandHandlerDefinition<
  {
    deliveryRunRepository: DeliveryRunRepository;
    deliveryQueryBus: DeliveryQueryBus;         // ← 他バス（自コンテキストのクエリ）
    domainEventIdGenerator: DomainEventIdGenerator;
  },
  "delivery.addShipmentToDeliveryRun"
> = {
  factory: (deps) => (command, args) => {
    return deps.deliveryQueryBus
      .execute(                                  // 1. 検証クエリを実行
        { type: "delivery.verifyShipmentAvailableForDeliveryRun", shipmentId: command.shipmentId },
        args.context,
      )
      .andThen((verifyResult) =>
        deps.deliveryRunRepository
          .get(command.deliveryRunId)             // 2. 集約取得
          .andThen((deliveryRun) =>
            addShipmentToDeliveryRun(deliveryRun, {  // 3. ドメインロジック
              shipmentId: verifyResult.availableShipmentId,  // ← Branded 型で検証済みを保証
              registeredAt,
            })),
      )
      .andThen((updated) =>
        deps.deliveryRunRepository.save(updated).map(() => updated))  // 4. 保存
      .map((deliveryRun) => {
        args.domainEventStore.add(createDeliveryRunEvent({ ... }));   // 5. イベント
        return { deliveryRunId: deliveryRun.id };
      });
  },
  settings: { transactional: true },
};
```

#### パターン D: イベント不要な軽量コマンド

```typescript
// handlers/mark-announcement-as-read.ts（DomainEventStore を使わない）

settings: {
  // transactional なし → TX middleware が発動しない
},
```

### 5-2. クエリハンドラー

クエリハンドラーは `{Context}QueryHandlerDefinition<Deps, QueryType>` 型です。
QueryService に委譲するだけのシンプルな構造です。

#### パターン A: リスト取得

```typescript
// handlers/list-shipments-for-admin.ts

export const listShipmentsForAdmin: DeliveryQueryHandlerDefinition<
  { shipmentQueryService: ShipmentQueryService },
  "delivery.listShipmentsForAdmin"
> = {
  factory: (deps) => (query, _context) => {
    return deps.shipmentQueryService
      .list({
        consignorId: query.consignorId,
        trackingNumber: query.trackingNumber,
        ...
      })
      .map((shipments) => ({ shipments }));
  },
  settings: {},
};
```

#### パターン B: 単一取得（Option → nullable）

```typescript
// handlers/find-shipment-for-delivery-person.ts

export const findShipmentForDeliveryPerson: DeliveryQueryHandlerDefinition<
  { shipmentQueryService: ShipmentQueryService },
  "delivery.findShipmentForDeliveryPerson"
> = {
  factory: (deps) => (query, _context) => {
    return deps.shipmentQueryService
      .findById(query.id)
      .map((option) => ({
        shipment: isSome(option) ? option.value : null,
      }));
  },
  settings: {},
};
```

#### パターン C: 検証クエリ（エラーを返す）

```typescript
// handlers/verify-shipment-available-for-delivery-run.ts

export const verifyShipmentAvailableForDeliveryRun: DeliveryQueryHandlerDefinition<
  { deliveryRunQueryService: DeliveryRunQueryService },
  "delivery.verifyShipmentAvailableForDeliveryRun"
> = {
  factory: (deps) => (query, _context) =>
    deps.deliveryRunQueryService.verifyShipmentAvailableForDeliveryRun(query.shipmentId),
    // → ResultAsync<{ availableShipmentId: AvailableForDeliveryRunShipmentId }, Error>
  settings: {},
};
```

---

## 6. ファクトリー関数（bus.ts）

`bus.ts` は Builder を使って全ハンドラーを登録し、完成した Bus を返すファクトリー関数です。

### 6-1. CommandBus ファクトリー

```typescript
// modules/{context}/write/src/command-bus/bus.ts

type Deps = {
  shipmentRepository: ShipmentRepository;
  deliveryRunRepository: DeliveryRunRepository;
  // ... ハンドラーが必要とする依存の和集合
};

type CreateDeliveryCommandBusDeps = {
  resolveDeps: (container: Container) => Deps;     // DI 解決関数
  createDomainEventStore: () => DomainEventStore;  // ストアファクトリー
  logger: Logger;
  middlewares?: Middleware[];                       // 追加ミドルウェア（テスト用等）
};

export const createDeliveryCommandBus = (
  deps: CreateDeliveryCommandBusDeps,
): DeliveryCommandBus => {
  const loggingMiddleware = createLoggingMiddleware({
    logger: deps.logger,
    busType: "command",
  });

  const builder = new DeliveryCommandBusBuilder<Deps>({
    createDomainEventStore: deps.createDomainEventStore,
  });

  return builder
    .use(loggingMiddleware)
    // ── 全コマンドを登録（1つでも抜けるとコンパイルエラー） ──
    .register("delivery.createShipment", {
      handlerFactory: (deps) =>
        createShipmentHandler.factory({
          shipmentRepository: deps.shipmentRepository,
          domainEventIdGenerator: deps.domainEventIdGenerator,
        }),
      settings: createShipmentHandler.settings,
    })
    .register("delivery.completeDelivery", { ... })
    // ... 全コマンドを登録
    .build({
      resolveDeps: deps.resolveDeps,
    });
};
```

**resolveDeps パターン:**
- ハンドラーは `Deps` 型の全依存を受け取る
- `register` 時に `handlerFactory` が必要な依存だけを選んで渡す
- `resolveDeps` は DI Container から全依存を解決する関数

### 6-2. QueryBus ファクトリー

```typescript
// modules/{context}/read/src/query-bus/bus.ts

type Deps = {
  shipmentQueryService: ShipmentQueryService;
  consignorQueryService: ConsignorQueryService;
  deliveryRunQueryService: DeliveryRunQueryService;
  announcementQueryService: AnnouncementQueryService;
};

type CreateDeliveryQueryBusDeps = {
  resolveDeps: (container: Container) => Deps;
  logger: Logger;
};

export const createDeliveryQueryBus = (
  deps: CreateDeliveryQueryBusDeps,
): DeliveryQueryBus => {
  const loggingMiddleware = createLoggingMiddleware({
    logger: deps.logger,
    busType: "query",
  });

  return new DeliveryQueryBusBuilder<Deps>()
    .use(loggingMiddleware)
    .register("delivery.listShipmentsForAdmin", {
      handlerFactory: (deps) =>
        listShipmentsForAdmin.factory({
          shipmentQueryService: deps.shipmentQueryService,
        }),
      settings: listShipmentsForAdmin.settings,
    })
    // ... 全クエリを登録
    .build({ resolveDeps: deps.resolveDeps });
};
```

**CommandBus との違い:** `createDomainEventStore` が不要。

---

## 7. DI での接続

### アプリ起動時（apps/delivery-api/src/di/index.ts）

```typescript
export function configureDi(): Container {
  const container = new Container();

  // ── インフラ ──
  container.register(Tokens.DB, () => createDb());
  container.register(Tokens.LOGGER, () => createLogger({ prefix: "delivery-api" }));
  container.register(Tokens.DOMAIN_EVENT_BUS, (c) =>
    new InMemoryDomainEventBus({ logger: c.resolve(Tokens.LOGGER) })
  );

  // ── Repository / QueryService ──
  container.register(Tokens.SHIPMENT_REPOSITORY, (c) =>
    new DrizzleShipmentRepository({ db: c.resolve(Tokens.DB) })
  );
  // ...

  // ── QueryBus ──
  container.register(Tokens.DELIVERY_QUERY_BUS, (c) =>
    createDeliveryQueryBus({
      resolveDeps: (resolveContainer) => ({
        shipmentQueryService: resolveContainer.resolve(Tokens.SHIPMENT_QUERY_SERVICE),
        // ...
      }),
      logger: c.resolve(Tokens.LOGGER),
    })
  );

  // ── CommandBus ──
  container.register(Tokens.DELIVERY_COMMAND_BUS, (c) =>
    createDeliveryCommandBus({
      resolveDeps: (resolveContainer) => ({
        shipmentRepository: resolveContainer.resolve(Tokens.SHIPMENT_REPOSITORY),
        deliveryRunRepository: resolveContainer.resolve(Tokens.DELIVERY_RUN_REPOSITORY),
        tenantManagementQueryBus: resolveContainer.resolve(Tokens.TENANT_MANAGEMENT_QUERY_BUS),
        deliveryQueryBus: resolveContainer.resolve(Tokens.DELIVERY_QUERY_BUS),
        // ...
      }),
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

**`resolveDeps` と `c` の違い:**
- `c`（外側の Container）: Bus 生成時に解決される。Logger や DomainEventStore のファクトリーに使う。
- `resolveContainer`（`resolveDeps` の引数）: **ハンドラー実行時**に解決される。TX middleware が fork した Container が渡されるため、Repository は TX 内の DB コネクションを使える。

---

## 8. 新コンテキスト追加チェックリスト

### contracts/{context}/public

```
□ {context}-commands.ts
    □ コマンドスキーマ（z.object + type: z.literal）
    □ コマンド結果型（{Command}Result）
    □ Commands union 型
    □ CommandsResultMap（コマンド名 → [成功型, エラー型]）
    □ CommandType（Commands["type"]）

□ {context}-queries.ts
    □ クエリスキーマ + DTO（ロール別）
    □ Queries union 型
    □ QueriesResultMap
    □ QueryType

□ {context}-errors.ts（defineError）
□ {context}-events.ts（EventTypes + イベントスキーマ）
□ {context}-status.ts（z.enum + 同名 const、必要な場合）
```

### contracts/{context}/server

```
□ {context}-commands.ts
    □ {Context}CommandBus 型
    □ {Context}CommandHandler<K> 型
    □ {Context}CommandHandlerDefinition<Deps, K> 型
    □ {Context}CommandHandlerSettings<K> 型（retry 時 errorMapper 必須）
    □ {Context}CommandHandlers 型（全ハンドラーのレコード）

□ {context}-queries.ts（同様のパターン）
```

### modules/{context}/write

```
□ models/
    □ {aggregate}-aggregate/types.ts     ← Zod スキーマ + 型
    □ {aggregate}-aggregate/{action}.ts  ← ドメインロジック（ピュア関数）
    □ {aggregate}-repository.ts          ← Repository インターフェース
    □ domain-events.ts                   ← イベント生成ヘルパー

□ command-bus/
    □ builder.ts  ← {Context}CommandBusBuilder
        □ Registered 型パラメータで全コマンド登録を保証
        □ MissingKeys 型で未登録を検出
        □ use() / register() / build()
    □ handlers/
        □ 各コマンドごとに1ファイル
        □ {Context}CommandHandlerDefinition<Deps, K> 型で export
        □ factory + settings のペア
    □ handlers/index.ts ← barrel export
    □ bus.ts ← createXxxCommandBus ファクトリー関数
    □ index.ts ← re-export bus.ts
```

### modules/{context}/read

```
□ models/
    □ {aggregate}-read-model.ts     ← ReadModel 型
    □ {aggregate}-query-service.ts  ← QueryService インターフェース

□ query-bus/
    □ builder.ts  ← {Context}QueryBusBuilder
    □ handlers/   ← 各クエリごとに1ファイル
    □ bus.ts      ← createXxxQueryBus ファクトリー関数
    □ index.ts    ← re-export bus.ts
```

### modules/{context}/infra/db

```
□ drizzle-{aggregate}-repository.ts     ← Repository 実装
□ drizzle-{aggregate}-query-service.ts  ← QueryService 実装
□ index.ts                              ← barrel export
```

### apps/{app}/src/di/

```
□ Token 追加
    □ {CONTEXT}_COMMAND_BUS
    □ {CONTEXT}_QUERY_BUS
    □ 各 Repository / QueryService
□ container.register で接続
    □ QueryBus → createXxxQueryBus({ resolveDeps, logger })
    □ CommandBus → createXxxCommandBus({ resolveDeps, createDomainEventStore, logger })
```
