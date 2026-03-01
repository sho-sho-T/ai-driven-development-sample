# アプリケーションレイヤー設計ガイド

本ドキュメントでは、アプリケーションレイヤーの設計パターンを、他プロジェクトにも適用可能な形で解説する。

## 概要

本アーキテクチャは以下の要素で構成される。

- **CQRS（Command Query Responsibility Segregation）**: 書き込みと読み取りの分離
- **自作の軽量 DI コンテナ**: Token ベースの依存注入
- **型安全な Bus Builder パターン**: ファントム型によるハンドラ登録の網羅性保証
- **ミドルウェアパイプライン**: トランザクション管理やロギングの横断的関心事
- **ファクトリ関数による DI**: クラスのコンストラクタ注入ではなく、クロージャによる注入

技術スタック: TypeScript, neverthrow（`ResultAsync`）, Zod

## 1. DI コンテナ

### 設計方針

サードパーティの DI ライブラリは使用せず、軽量な自作コンテナを使用する。理由は以下の通り。

- DI ライブラリが持つリフレクションやデコレータの複雑さを排除する
- TypeScript の型システムのみで型安全性を担保する
- コンテナの `fork()` によるトランザクションスコープの実現を容易にする

### Token

`createToken<T>(name)` で型付きトークンを作成する。内部では `Symbol` を使い、型パラメータ `T` で解決時の型を推論する。

```typescript
import { createToken } from "@shared-kernel/server";

// Token の定義
interface OrderRepository {
  get(id: string): ResultAsync<Order, DependencyError>;
  save(order: Order): ResultAsync<void, DependencyError>;
}

const ORDER_REPOSITORY = createToken<OrderRepository>("ORDER_REPOSITORY");
```

### Container

`Container` クラスは `register` / `resolve` / `fork` の 3 つの操作を持つ。

```typescript
import { Container, createToken } from "@shared-kernel/server";

const container = new Container();

// 登録（デフォルトは singleton）
container.register(Tokens.DB, () => createDb());
container.register(
  Tokens.ORDER_REPOSITORY,
  (c) => new DrizzleOrderRepository({ db: c.resolve(Tokens.DB) }),
);

// 解決
const repo = container.resolve(Tokens.ORDER_REPOSITORY);
```

#### ライフサイクル

| ライフサイクル | 説明 |
|---|---|
| `singleton` | 初回 `resolve` 時にインスタンスを生成しキャッシュする（デフォルト） |
| `transient` | `resolve` のたびに新しいインスタンスを生成する |

#### `fork()` — トランザクションスコープ

`fork()` はコンテナを複製し、シングルトンキャッシュをクリアする。これにより、トランザクション用の DB 接続を差し替えた新しいコンテナを作成できる。

```typescript
const txContainer = container.fork();
txContainer.register(Tokens.DB, () => txConnection); // TX 接続で上書き
// この txContainer から resolve される Repository は TX 接続を使用する
```

### Tokens オブジェクト（Composition Root）

アプリケーションごとに `Tokens` オブジェクトを定義し、全トークンを一箇所にまとめる。

```typescript
// apps/my-api/src/di/index.ts
export const Tokens = {
  DB: createToken<Db>("DB"),
  LOGGER: createToken<Logger>("LOGGER"),
  ORDER_REPOSITORY: createToken<OrderRepository>("ORDER_REPOSITORY"),
  PRODUCT_QUERY_SERVICE: createToken<ProductQueryService>("PRODUCT_QUERY_SERVICE"),
  ORDER_COMMAND_BUS: createToken<OrderCommandBus>("ORDER_COMMAND_BUS"),
  ORDER_QUERY_BUS: createToken<OrderQueryBus>("ORDER_QUERY_BUS"),
} as const;
```

## 2. CQRS — Command と Query の分離

### レイヤー構成

CQRS の実装は 3 つのレイヤーに分かれる。

```
contracts/public   → コマンド/クエリの型定義（Frontend/Backend 共通）
contracts/server   → ハンドラの型定義（Backend のみ）
modules/write      → コマンドハンドラの実装
modules/read       → クエリハンドラの実装
```

### 2.1 Contracts（Public）— コマンド/クエリの定義

コマンドは `type` リテラルを判別子とする Discriminated Union として定義する。Zod スキーマで入力バリデーションも兼ねる。

```typescript
// packages/contracts/order/public/src/order-commands.ts
import { z } from "zod";

// コマンド定義
export const PlaceOrderCommandSchema = z.object({
  type: z.literal("order.placeOrder"),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});
export type PlaceOrderCommand = z.infer<typeof PlaceOrderCommandSchema>;
export type PlaceOrderResult = { orderId: string };

export const CancelOrderCommandSchema = z.object({
  type: z.literal("order.cancelOrder"),
  orderId: z.string().uuid(),
  reason: z.string().optional(),
});
export type CancelOrderCommand = z.infer<typeof CancelOrderCommandSchema>;
export type CancelOrderResult = { orderId: string };

// ユニオン型
export type OrderCommands = PlaceOrderCommand | CancelOrderCommand;
export type OrderCommandType = OrderCommands["type"];

// 結果マップ: コマンドタイプ → [成功型, エラー型] のタプル
export type OrderCommandsResultMap = {
  "order.placeOrder": [PlaceOrderResult, DependencyError | ProductNotFoundError];
  "order.cancelOrder": [CancelOrderResult, DependencyError | OrderNotFoundError | OrderInvalidStatusError];
};
```

クエリも同様のパターンで定義する。

```typescript
// packages/contracts/order/public/src/order-queries.ts
export const ListOrdersQuerySchema = z.object({
  type: z.literal("order.listOrders"),
  customerId: z.string().uuid(),
});
export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;
export type ListOrdersResult = { orders: OrderSummary[] };

export type OrderQueries = ListOrdersQuery | /* ... */;
export type OrderQueriesResultMap = {
  "order.listOrders": [ListOrdersResult, DependencyError];
};
```

### 2.2 Contracts（Server）— ハンドラの型定義

サーバー側では、shared-kernel の汎用型を使い、コンテキスト固有のハンドラ型を定義する。

```typescript
// packages/contracts/order/server/src/order-commands.ts
import type { CommandHandlerFacotry, CommandBus } from "@shared-kernel/server";

// コマンドハンドラファクトリの型エイリアス
export type OrderCommandHandlerFactory<
  Deps,
  Key extends keyof OrderCommandsResultMap,
> = CommandHandlerFacotry<Deps, OrderCommands, OrderCommandsResultMap, Key, DomainEventStore>;

// コマンドバスの型エイリアス
export type OrderCommandBus = CommandBus<
  OrderCommands,
  OrderCommandType,
  OrderCommandsResultMap
>;

// ハンドラ定義の型（factory + settings のペア）
export type OrderCommandHandlerDefinition<Deps, K extends OrderCommandType> = {
  factory: OrderCommandHandlerFactory<Deps, K>;
  settings: OrderCommandHandlerSettings<K>;
};
```

### 2.3 ハンドラの実装

ハンドラは **`{ factory, settings }` オブジェクト**として実装する。`factory` はカリー化された関数で、`(deps) => (command, args) => ResultAsync` の形をとる。

#### コマンドハンドラの例

```typescript
// packages/modules/order/write/src/command-bus/handlers/place-order.ts
export const placeOrderHandler: OrderCommandHandlerDefinition<
  {
    orderRepository: OrderRepository;
    productQueryBus: ProductQueryBus;
  },
  "order.placeOrder"
> = {
  factory: (deps) => (command, args) => {
    return deps.productQueryBus
      .execute({ type: "product.getProduct", productId: command.productId }, args.context)
      .andThen((product) => createOrder(product, command.quantity))
      .andThen((order) => deps.orderRepository.save(order).map(() => order))
      .map((order) => ({ orderId: order.id }));
  },
  settings: {
    transactional: true, // トランザクション内で実行する
  },
};
```

#### クエリハンドラの例

```typescript
// packages/modules/order/read/src/query-bus/handlers/list-orders.ts
export const listOrdersHandler: OrderQueryHandlerDefinition<
  {
    orderQueryService: OrderQueryService;
  },
  "order.listOrders"
> = {
  factory: (deps) => (query, _context) => {
    return deps.orderQueryService.listByCustomerId(query.customerId).map((orders) => ({
      orders,
    }));
  },
  settings: {},
};
```

**設計上のポイント:**

- ハンドラはクラスではなく関数。コンストラクタ注入ではなくクロージャ注入を使用する
- 依存は `factory` の引数で受け取り、実行時にクロージャとしてキャプチャされる
- 戻り値は `ResultAsync` で、例外を throw せずにエラーを型安全に扱う

## 3. Bus Builder パターン

### 設計の核心 — 型レベルの網羅性チェック

Bus Builder はファントム型パラメータ `Registered` で、登録済みハンドラのコマンドタイプを追跡する。`build()` は全コマンドタイプが登録されているときだけ呼び出せる。

```typescript
// packages/modules/order/write/src/command-bus/builder.ts
type MissingKeys<Registered> = Exclude<OrderCommandType, keyof Registered>;

export class OrderCommandBusBuilder<
  Deps,
  Registered extends Partial<Record<OrderCommandType, unknown>> = {},
> {
  // register() のたびに Registered に型が追加される
  register<K extends OrderCommandType>(
    commandType: K,
    registration: { handlerFactory: ...; settings: ... },
  ): OrderCommandBusBuilder<Deps, Registered & Record<K, ...>> {
    // ...
  }

  // MissingKeys<Registered> が never のとき（= 全タイプ登録済み）だけ呼べる
  build(
    this: MissingKeys<Registered> extends never
      ? OrderCommandBusBuilder<Deps, Registered>
      : never,
    options: BuildOptions<Deps>,
  ): OrderCommandBus {
    // ...
  }
}
```

**これにより、ハンドラを 1 つでも登録し忘れるとコンパイルエラーになる。**

### Bus 生成関数（ワイヤリング）

Builder を使い、全ハンドラを登録して Bus を組み立てる関数を作成する。

```typescript
// packages/modules/order/write/src/command-bus/bus.ts
type Deps = {
  orderRepository: OrderRepository;
  productQueryBus: ProductQueryBus;
};

type CreateOrderCommandBusDeps = {
  resolveDeps: (container: Container) => Deps;
  createDomainEventStore: () => DomainEventStore;
  logger: Logger;
};

export const createOrderCommandBus = (deps: CreateOrderCommandBusDeps): OrderCommandBus => {
  const loggingMiddleware = createLoggingMiddleware({ logger: deps.logger, busType: "command" });
  const builder = new OrderCommandBusBuilder<Deps>({
    createDomainEventStore: deps.createDomainEventStore,
  });

  return builder
    .use(loggingMiddleware)
    .register("order.placeOrder", {
      handlerFactory: (deps) => placeOrderHandler.factory({
        orderRepository: deps.orderRepository,
        productQueryBus: deps.productQueryBus,
      }),
      settings: placeOrderHandler.settings,
    })
    .register("order.cancelOrder", {
      handlerFactory: (deps) => cancelOrderHandler.factory({
        orderRepository: deps.orderRepository,
      }),
      settings: cancelOrderHandler.settings,
    })
    .build({ resolveDeps: deps.resolveDeps });
};
```

### `build()` 内の実行フロー

`bus.execute(command, context)` が呼ばれると、以下の順序で処理が行われる。

```
1. command.type からハンドラ登録を検索
2. resolveDeps(context.container) で依存を解決 ← DI のブリッジポイント
3. handlerFactory(deps) でハンドラ関数を生成
4. ミドルウェアパイプラインを適用（ログ、トランザクション等）
5. ハンドラを実行
6. [Command のみ] domainEventStore.save() → publish()
```

**依存解決は実行時に遅延で行われる**ため、トランザクションミドルウェアが `fork()` したコンテナを差し替えることで、TX スコープの Repository を自動的に注入できる。

## 4. ミドルウェアパイプライン

### Middleware の型

```typescript
export type Middleware = <T, E>(
  info: ExecutionInfo,
  next: NextFunction<T, E>,
) => ResultAsync<T, E>;

export type ExecutionInfo = {
  type: string;       // コマンド/クエリのタイプ
  payload: unknown;   // コマンド/クエリの本体
  context: Context;   // 実行コンテキスト（container を含む）
  transactional?: boolean;
};
```

### 適用順序

ミドルウェアは登録順に外側から適用される。`[m1, m2, m3]` → `m1(m2(m3(handler)))`

```typescript
export function applyMiddlewares<T, E>(
  middlewares: Middleware[],
  info: ExecutionInfo,
  handler: () => ResultAsync<T, E>,
): ResultAsync<T, E> {
  let next: NextFunction<T, E> = handler;
  for (let i = middlewares.length - 1; i >= 0; i--) {
    const middleware = middlewares[i]!;
    const currentNext = next;
    next = () => middleware(info, currentNext);
  }
  return next();
}
```

### 組み込みミドルウェア

#### Logging Middleware

実行時間、成功/失敗、エラー種別（Expected/Unexpected）をログ出力する。

```typescript
const loggingMiddleware = createLoggingMiddleware({
  logger,
  busType: "command", // or "query"
});
```

#### Transactional Middleware

`settings.transactional === true` のハンドラを DB トランザクション内で実行する。

動作の流れ:

1. `container.fork()` で新しいコンテナを作成
2. フォークしたコンテナに TX 接続を登録（DB トークンを差し替え）
3. `context` のコンテナを差し替える
4. ハンドラ内で `resolve` される Repository は自動的に TX 接続を使用する
5. ハンドラがエラーを返した場合、`TransactionAborted` をスローしてロールバック

```typescript
const transactionalMiddleware = createTransactionalMiddleware({
  dbToken: Tokens.DB,
  runInTransaction: (db, tenantId, run) => db.transaction((tx) => run(tx)),
});
```

## 5. Context（実行コンテキスト）

### 定義

```typescript
export type Context = {
  readonly id: string;
  readonly tenantId: TenantId;
  // ... アプリ固有のフィールド
  readonly correlationId: string;
  readonly causationId: string | undefined;
  readonly container: Container;  // ← DI コンテナへの参照
};
```

Context は以下の役割を持つ。

1. **認証情報の運搬**: tenantId などのユーザー情報をハンドラに渡す
2. **トレーサビリティ**: correlationId / causationId でリクエストを追跡する
3. **DI コンテナの運搬**: Bus 実行時に `context.container` から依存を解決する

### `updateContainer`

Context のコンテナを差し替える純粋関数。トランザクションミドルウェアが使用する。

```typescript
export function updateContainer(
  context: Omit<Context, "container"> | Context,
  container: Container,
): Context {
  return { ...context, container };
}
```

## 6. DI の接続フロー（全体像）

以下の 4 段階で依存が解決される。

### Stage 1: Composition Root（アプリ起動時）

Container にトークンとファクトリを登録する。

```typescript
// apps/my-api/src/di/index.ts
export function configureDi(): Container {
  const container = new Container();

  // インフラ層
  container.register(Tokens.DB, () => createDb());
  container.register(Tokens.ORDER_REPOSITORY,
    (c) => new DrizzleOrderRepository({ db: c.resolve(Tokens.DB) }));

  // Bus（resolveDeps コールバックで遅延解決を設定）
  container.register(Tokens.ORDER_COMMAND_BUS, (c) =>
    createOrderCommandBus({
      resolveDeps: (resolveContainer) => ({
        orderRepository: resolveContainer.resolve(Tokens.ORDER_REPOSITORY),
        productQueryBus: resolveContainer.resolve(Tokens.PRODUCT_QUERY_BUS),
      }),
      createDomainEventStore: () => new DrizzleDomainEventStore({ db: c.resolve(Tokens.DB) }),
      logger: c.resolve(Tokens.LOGGER),
    }),
  );

  return container;
}
```

### Stage 2: HTTP ミドルウェア（リクエスト受信時）

Container をリクエストコンテキストにセットする。

```typescript
// middleware/container.ts
export const containerMiddleware = (containerProvider) => {
  return async (c, next) => {
    c.set("container", await containerProvider());
    await next();
  };
};
```

### Stage 3: ルートハンドラ（リクエスト処理時）

Container から Bus を取得し、Context を作成して `execute` を呼ぶ。

```typescript
// routes/orders.ts
app.post("/orders", async (c) => {
  const container = c.get("container");
  const commandBus = container.resolve(Tokens.ORDER_COMMAND_BUS);
  const context = createContext(c, container);

  const result = await commandBus.execute(
    { type: "order.placeOrder", productId: "...", quantity: 1 },
    context,
  );
  // ...
});
```

### Stage 4: Bus 内部（コマンド実行時）

`resolveDeps(context.container)` で依存を解決し、ハンドラファクトリに渡す。

```typescript
// builder.ts の build() 内
const executeHandler = () => {
  const deps = resolveDeps(info.context.container);  // ← ここで解決
  const handler = handlerFactory(deps);
  return handler(command, args);
};
```

**トランザクション中は、`info.context.container` が `fork()` されたコンテナに差し替わっているため、TX 接続が自動的に注入される。**

## 7. 新しいコンテキストを追加する手順

1. **Contracts（Public）**: コマンド/クエリの Zod スキーマ、型、ユニオン型、ResultMap を定義
2. **Contracts（Server）**: ハンドラファクトリ型、Bus 型、HandlerDefinition 型を定義
3. **Module（Write）**: CommandBusBuilder クラスを作成し、各ハンドラを実装
4. **Module（Read）**: QueryBusBuilder クラスを作成し、各ハンドラを実装
5. **Module（Write/Read）**: `createXxxCommandBus` / `createXxxQueryBus` 関数を作成
6. **App（DI）**: Tokens を定義し、`configureDi` で全コンポーネントを登録

## 8. 設計上の判断とトレードオフ

### なぜクラスではなくファクトリ関数か

- ハンドラは状態を持たない純粋な関数であり、クラスにする必要がない
- カリー化により、依存注入とコマンド処理を明確に分離できる
- テスト時にモックを渡しやすい（`handler.factory({ mockRepo, ... })` で完結）

### なぜサードパーティ DI を使わないか

- リフレクションやデコレータに依存しないため、TypeScript の型チェックだけで完結する
- `fork()` によるトランザクションスコープのような独自要件に柔軟に対応できる
- コンテナ自体のコード量が小さく（約 150 行）、ブラックボックスが少ない

### なぜ Bus Builder にファントム型を使うか

- ハンドラの登録漏れをランタイムではなくコンパイル時に検出できる
- 新しいコマンドを追加した際、ビルドエラーで登録忘れに気づける
- 型安全なディスパッチにより、`command.type` に応じた正しい戻り値型が推論される

### なぜ依存を遅延解決するか

- トランザクションミドルウェアが `fork()` でコンテナを差し替えた後に解決させるため
- 登録時には具体的なコンテナインスタンスが不要で、`resolveDeps` コールバックを渡すだけでよい
