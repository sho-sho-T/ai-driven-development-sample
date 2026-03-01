# contracts・modules アーキテクチャ解説

あるコンテキスト（以下「`order`」コンテキストを例として使用）を題材に、contracts と modules の実装パターンを解説します。

> **注:** コード例中の `order`・`item`・`batch` などは説明用の汎用名です。実際のプロジェクトでは業務に合わせた名前を使用してください。

## 全体像

このプロジェクトは **DDD × CQRS × クリーンアーキテクチャ** を TypeScript で実装しています。

```
contracts/{context}/       ← 型・スキーマの契約（インターフェース層）
  public/                  ← Frontend/Backend 両方から使う
  server/                  ← Backend のみ

modules/{context}/         ← 実装（ドメイン層）
  write/                   ← コマンド（書き込み）: Aggregate + CommandBus
  read/                    ← クエリ（読み取り）: ReadModel + QueryBus
  infra/db/                ← インフラ: Drizzle ORM による実装
```

---

## 1. contracts — 「型の契約書」

contracts は**実装を持たない純粋な型定義**です。モジュール間の境界として機能します。

`public/` と `server/` の2種類があります。

| | public | server |
|---|---|---|
| 参照元 | Backend・Frontend 両方 | Backend のみ |
| 内容 | コマンド/クエリ/DTO/イベント/エラー/ステータス | CommandBus/QueryBus/ハンドラー定義の型 |

### 1-1. ステータス型（`order-status.ts`）

enum ベースのステータスを `z.enum` で定義します。
同名の `const` オブジェクトにドメインルールのヘルパー関数を持たせるのが特徴です。

```ts
// contracts/order/public/src/order-status.ts

export const OrderStatusSchema = z.enum([
  "pending",    // 受付済み（未処理）
  "active",     // 処理中
  "completed",  // 完了
  "on_hold",    // 保留中
  "closed",     // 終了
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// 同名 const にドメインルール（遷移可否）をまとめる
export const OrderStatus = {
  canActivate:  (status: OrderStatus) => status === "pending" || status === "on_hold",
  canComplete:  (status: OrderStatus) => status === "active",
  canHold:      (status: OrderStatus) => status === "active",
  canClose:     (status: OrderStatus) =>
    status === "active" || status === "on_hold" || status === "completed",
  toLabel: (status: OrderStatus) => OrderStatusLabels[status],
} as const;
```

**ポイント:** 型（`type OrderStatus`）と同名の `const` オブジェクトを同時にエクスポートするパターンにより、`OrderStatus.canActivate(s)` のようにメソッドとして呼び出せます。

同じパターンでサブリソースのステータスも定義します。

```ts
// order-batch-status.ts（アイテムをまとめたバッチのステータス）
export const BatchStatusSchema = z.enum(["unassigned", "assigned", "completed"]);
export const BatchStatus = {
  canAssign:    (status) => status === "unassigned",
  canComplete:  (status) => status === "assigned",
  canAddItem:   (status) => status === "unassigned" || status === "assigned",
  toLabel:      (status) => BatchStatusLabels[status],
} as const;

// order-batch-item-status.ts（バッチ内の個別アイテムのステータス）
export const BatchItemStatusSchema = z.enum([
  "planned", "active", "completed", "on_hold", "closed", "cancelled",
]);
export const BatchItemStatus = {
  canActivate:    (status) => status === "planned" || status === "on_hold",
  canComplete:    (status) => status === "active",
  canHold:        (status) => status === "active",
  isIncomplete:   (status) => status === "planned" || status === "active",
  toLabel:        (status) => BatchItemStatusLabels[status],
} as const;
```

### 1-2. エラー型（`order-errors.ts`・`order-batch-errors.ts`）

エラーは `defineError<メタデータ型>` で定義します。
`code`（機械識別用）・`name`（TS型名）・`description`・`exposure`（予期済みか否か）を持ちます。

```ts
// contracts/order/public/src/order-errors.ts

export const OrderErrors = {
  ITEM_NOT_FOUND: defineError<{ itemId: ItemId }>({
    code: "ITEM_NOT_FOUND",
    name: "ItemNotFoundError",
    description: "指定されたアイテムが存在しません。",
    meta: { exposure: "EXPECTED" },  // 予期されたエラー（クライアントに返してよい）
  }),
  ITEM_INVALID_STATUS: defineError<{ itemId: ItemId }>({
    code: "ITEM_INVALID_STATUS",
    name: "ItemInvalidStatusError",
    description: "指定されたアイテムのステータスが不正で、この操作を実行できません。",
    meta: { exposure: "EXPECTED" },
  }),
};

// ErrorType ユーティリティで型を取り出す
export type ItemNotFoundError    = ErrorType<typeof OrderErrors.ITEM_NOT_FOUND>;
export type ItemInvalidStatusError = ErrorType<typeof OrderErrors.ITEM_INVALID_STATUS>;
```

サブリソース（バッチ・バッチアイテム）のエラーは別ファイルにまとめます。

```ts
// contracts/order/public/src/order-batch-errors.ts

export const OrderBatchErrors = {
  BATCH_NOT_FOUND:              defineError<{ batchId }>({ ... }),
  BATCH_INVALID_STATUS:         defineError<{ batchId }>({ ... }),
  BATCH_ITEM_NOT_FOUND:         defineError<{ batchId; itemId }>({ ... }),
  BATCH_ITEM_INVALID_STATUS:    defineError<{ batchId; itemId }>({ ... }),
  BATCH_ITEM_ALREADY_EXISTS:    defineError<{ batchId; itemId }>({ ... }),
  ITEM_NOT_AVAILABLE_FOR_BATCH: defineError<{ itemId }>({ ... }),
};

export type BatchNotFoundError              = ErrorType<typeof OrderBatchErrors.BATCH_NOT_FOUND>;
export type BatchItemAlreadyExistsError     = ErrorType<typeof OrderBatchErrors.BATCH_ITEM_ALREADY_EXISTS>;
export type ItemNotAvailableForBatchError   = ErrorType<typeof OrderBatchErrors.ITEM_NOT_AVAILABLE_FOR_BATCH>;
// ...
```

**ポイント:** エラーはすべて `exposure: "EXPECTED"` を付けることで、クライアントに安全に返せる予期済みエラーとして区別します。予期しないシステムエラーは `DependencyError` で表現します。

### 1-3. Branded Type（`available-for-batch-item-id.ts`）

ドメインルールを型で表現するために Zod の `.brand()` を使います。
「検証済みのID」と「通常のID」をコンパイル時に区別できます。

```ts
// contracts/order/public/src/available-for-batch-item-id.ts

/**
 * 他のバッチに登録されていない、バッチへの登録が可能であることが検証済みのアイテムID。
 * 集約コマンドの引数にのみ使用し、集約のプロパティには ItemId を使う。
 */
export const AvailableForBatchItemIdSchema = ItemIdSchema.brand(
  "AvailableForBatchItemId",
);
export type AvailableForBatchItemId = z.infer<typeof AvailableForBatchItemIdSchema>;

// 型変換ユーティリティ
export const AvailableForBatchItemId = {
  toItemId: (id: AvailableForBatchItemId): ItemId => id as ItemId,
} as const;
```

**使い方の流れ:**

```
verifyItemAvailableForBatch クエリ
  → AvailableForBatchItemId を返す（検証済みであることを型で保証）

addItemToBatch コマンド
  → 引数に AvailableForBatchItemId を受け取る（未検証の ItemId は渡せない）
```

これにより**検証を経ないアイテムIDをバッチに追加できないこと**をコンパイル時に保証します。

### 1-4. マスターデータ（`hold-reason.ts`・`close-reason.ts`）

将来的なテナントごとの設定化を見越しつつ、現時点ではハードコードのリストを公開します。

```ts
// contracts/order/public/src/hold-reason.ts

const holdReasons = [
  { id: "00000000-0000-4000-8000-000000000101" as HoldReasonId, label: "在庫不足" },
  { id: "00000000-0000-4000-8000-000000000102" as HoldReasonId, label: "住所確認中" },
  { id: "00000000-0000-4000-8000-000000000103" as HoldReasonId, label: "顧客都合" },
  { id: "00000000-0000-4000-8000-000000000104" as HoldReasonId, label: "その他" },
] as const;

export const HoldReason = {
  values: holdReasons,
  toLabel: (id: HoldReasonId): string => {
    return holdReasons.find((r) => r.id === id)?.label ?? "不明";
  },
} as const;
```

### 1-5. Commands の定義（`order-commands.ts`）

コマンドは Zod スキーマで定義し、`type` フィールドに文字列リテラルを使います。
ファイル末尾に全コマンドの Union 型と ResultMap をまとめます。

```ts
// contracts/order/public/src/order-commands.ts

// ── 個別コマンドの定義 ──

export const OrderCompleteItemCommandSchema = z.object({
  type: z.literal("order.completeItem"),  // ← 文字列リテラルで識別
  itemId: ItemIdSchema,
  attachmentUrls: z.array(z.string()).max(2),
});
export type OrderCompleteItemCommand = z.infer<typeof OrderCompleteItemCommandSchema>;
export type OrderCompleteItemResult = {
  itemId: ItemId;
};

// ── Union 型（全コマンドをまとめる） ──

export type OrderCommands =
  | OrderCreateItemCommand
  | OrderActivateItemCommand
  | OrderCompleteItemCommand
  | OrderHoldItemCommand
  | OrderCloseItemCommand
  // ... コマンド数分

// ── ResultMap（コマンド名 → [成功型, エラー型] のマッピング） ──

export type OrderCommandsResultMap = {
  "order.createItem": [OrderCreateItemResult, DependencyError];
  "order.activateItem": [
    OrderActivateItemResult,
    DependencyError | ItemNotFoundError | ItemInvalidStatusError | AssigneeNotFoundError,
  ];
  "order.completeItem": [
    OrderCompleteItemResult,
    DependencyError | ItemNotFoundError | ItemInvalidStatusError,
  ];
  "order.addItemToBatch": [
    OrderAddItemToBatchResult,
    DependencyError | BatchNotFoundError | BatchInvalidStatusError | BatchItemAlreadyExistsError,
  ];
  // ...
};

export type OrderCommandType = OrderCommands["type"];
```

**ポイント:** ResultMap はコマンド名をキーとし、`[成功型, エラー型]` のタプルで表現します。handlers 側の型はここから自動推論されるため、戻り値の型を手書きする必要がありません。

### 1-6. Queries・DTO の定義（`order-queries.ts`）

クエリはスキーマ + DTO + ResultMap の3点セットで定義します。
DTO は**ロール別**（管理者用・担当者用）に分けて定義します。

```ts
// contracts/order/public/src/order-queries.ts

// ── DTO（データ転送オブジェクト） ──

// 担当者向けアイテムDTO（必要最小限のフィールド）
export const ItemForAssigneeDtoSchema = z.object({
  id: ItemIdSchema,
  status: OrderStatusSchema,
  destination: z.object({
    name: z.string(),
    postalCode: z.string(),
    address: z.string(),
    phoneNumber: z.string().optional(),
  }),
  assignee: z.object({ id: AssigneeIdSchema, name: z.string() }).optional(),
  trackingNumber: z.string(),
  requester: z.object({ id: z.string(), name: z.string() }),
  deadline: DateTimeSchema.optional(),
});
export type ItemForAssigneeDto = z.infer<typeof ItemForAssigneeDtoSchema>;

// 管理者向けアイテムDTO（担当者向けより多くのフィールドを含む）
export const ItemForAdminDtoSchema = z.object({
  id: ItemIdSchema,
  status: OrderStatusSchema,
  destination: z.object({
    name: z.string(),
    postalCode: z.string(),
    address: z.string(),
    phoneNumber: z.string().optional(),
    email: z.string().optional(),   // ← 管理者のみ
  }),
  assignee: z.object({ id: AssigneeIdSchema, name: z.string() }).optional(),
  trackingNumber: z.string(),
  requester: z.object({ id: z.string(), name: z.string() }),
  deadline: DateTimeSchema.optional(),
  receivedAt: DateTimeSchema,              // ← 管理者のみ
  notes: z.string().optional(),            // ← 管理者のみ
  quantity: z.number().int().positive().optional(),
  location: z.object({ id: LocationIdSchema, name: z.string() }),
  attachmentCount: z.number().int().nonnegative(),
});
export type ItemForAdminDto = z.infer<typeof ItemForAdminDtoSchema>;

// ── クエリスキーマ ──

export const OrderListItemsForAdminQuerySchema = z.object({
  type: z.literal("order.listItemsForAdmin"),
  requesterId: RequesterIdSchema.optional(),
  trackingNumber: z.string().optional(),
  recipientName: z.string().optional(),
  recipientEmail: z.string().optional(),
});
export type OrderListItemsForAdminQuery = z.infer<typeof OrderListItemsForAdminQuerySchema>;
export type OrderListItemsForAdminResult = {
  items: ItemForAdminDto[];
};

// ── ResultMap ──

export type OrderQueriesResultMap = {
  "order.listItemsForAdmin":  [OrderListItemsForAdminResult, DependencyError];
  "order.findItemForAdmin":   [OrderFindItemForAdminResult, DependencyError];
  "order.verifyItemAvailableForBatch": [
    OrderVerifyItemAvailableForBatchResult,
    DependencyError | ItemNotAvailableForBatchError,  // ← エラーあり（検証失敗）
  ];
  // ...
};
```

**ポイント:**
- DTO はロール（管理者・担当者）ごとに分けることで、不要な情報の漏洩を防ぎます
- `verifyItemAvailableForBatch` のように、クエリがエラーを返す場合もあります（検証系クエリ）

### 1-7. Domain Events の定義（`order-events.ts`）

ドメインイベントも contracts/public に定義します。
イベント型定数オブジェクトと、各イベントの Zod スキーマをペアで定義します。

```ts
// contracts/order/public/src/order-events.ts

export const OrderEventTypes = {
  ITEM_CREATED:              "ITEM_CREATED",
  ITEM_ACTIVATED:            "ITEM_ACTIVATED",
  ITEM_COMPLETED:            "ITEM_COMPLETED",
  ITEM_HELD:                 "ITEM_HELD",
  ITEM_CLOSED:               "ITEM_CLOSED",
  BATCH_CREATED:             "BATCH_CREATED",
  ITEM_ADDED_TO_BATCH:       "ITEM_ADDED_TO_BATCH",
  BATCH_ITEM_COMPLETED:      "BATCH_ITEM_COMPLETED",
  // ... イベント数分
} as const;

export type OrderEventType = (typeof OrderEventTypes)[keyof typeof OrderEventTypes];

// 各イベントのスキーマ定義
export const ItemCompletedEventSchema = createDomainEventSchema(
  z.object({
    itemId: z.string(),
    attachmentUrls: z.array(z.string()),
  }),
).extend({
  type: z.literal(OrderEventTypes.ITEM_COMPLETED),
  aggregateType: z.literal("Item"),  // ← 集約の種類（"Item" or "Batch"）で区別
});
export type ItemCompletedEvent = z.infer<typeof ItemCompletedEventSchema>;

export const ItemAddedToBatchEventSchema = createDomainEventSchema(
  z.object({
    batchId: z.string(),
    itemId: z.string(),
  }),
).extend({
  type: z.literal(OrderEventTypes.ITEM_ADDED_TO_BATCH),
  aggregateType: z.literal("Batch"),
});
export type ItemAddedToBatchEvent = z.infer<typeof ItemAddedToBatchEventSchema>;
```

### 1-8. CommandBus・QueryBus 型の定義（server）

server contracts は modules が実装すべきインターフェース（型）を定義します。

```ts
// contracts/order/server/src/order-commands.ts

// CommandBus 型: send(command) → ResultAsync<Result, Error> の型安全なディスパッチャー
export type OrderCommandBus = CommandBus<
  OrderCommands,
  OrderCommandType,
  OrderCommandsResultMap
>;

// HandlerDefinition 型: factory（DI）と settings（トランザクション・リトライ設定）のペア
export type OrderCommandHandlerDefinition<Deps, K extends OrderCommandType> = {
  factory: OrderCommandHandlerFactory<Deps, K>;
  settings: OrderCommandHandlerSettings<K>;
};

// Handler 型: ResultMap から Result/Error 型を自動推論
export type OrderCommandHandler<K extends OrderCommandType> = (
  command: OrderCommandOf<K>,
  args: {
    afterCommit: () => ResultAsync<void, unknown>;
    context: Context;
    domainEventStore: DomainEventStore;
  },
) => ResultAsync<ResultOf<K>, ErrorOf<K>>;   // ← 型引数 K から自動推論

// リトライ設定がある場合は errorMapper を必須にする Union 型
export type OrderCommandHandlerSettings<K extends OrderCommandType> =
  | {
      transactional?: boolean;
      retry: {
        maxAttempts: number;
        backoffMs?: number;
        shouldRetry?: (error: ErrorOf<K>) => boolean;
        errorMapper: (error: ErrorOf<K>) => ErrorOf<K>;  // ← retry時は必須
      };
    }
  | {
      transactional?: boolean;
      retry?: never;
    };
```

QueryBus 側も同様の構成です（`order-queries.ts`）。

---

## 2. modules/write — コマンド側の実装

### 2-1. Aggregate（ドメインモデル）

アグリゲートは **Zod スキーマで定義した純粋なデータ型**です。クラスは使いません。

```ts
// modules/order/write/src/models/item-aggregate/types.ts

export const ItemAggregateSchema = z.object({
  id: ItemIdSchema,
  status: OrderStatusSchema,
  tenantId: TenantIdSchema,
  trackingNumber: z.string(),
  requesterId: RequesterIdSchema,
  destination: DestinationSchema,
  assigneeId: VerifiedAssigneeIdSchema.optional(),
  attachmentUrls: z.array(z.string()).optional(),
  // ...
});

export type ItemAggregate = z.infer<typeof ItemAggregateSchema>;
```

ドメインロジックはピュア関数として別ファイルに分離します。

```ts
// modules/order/write/src/models/item-aggregate/complete-item.ts

export function completeItem(
  item: ItemAggregate,
  attachmentUrls: string[],
): Result<ItemAggregate, ItemInvalidStatusError> {
  // ステータス検証 → 新しいアグリゲートを返す（イミュータブル）
  if (!OrderStatus.canComplete(item.status)) {
    return err(OrderErrors.ITEM_INVALID_STATUS.create({ itemId: item.id }));
  }
  return ok({ ...item, status: "completed", attachmentUrls });
}
```

### 2-2. Repository Interface（ポートの定義）

```ts
// modules/order/write/src/models/item-repository.ts

export interface ItemRepository {
  save(aggregate: ItemAggregate): ResultAsync<void, DependencyError | ConcurrencyError>;
  find(id: ItemId): ResultAsync<Option<ItemAggregate>, DependencyError>;
  get(id: ItemId): ResultAsync<ItemAggregate, DependencyError | ItemNotFoundError>;
}
```

neverthrow の `ResultAsync` を使い、例外を投げず型安全にエラーを表現します。

### 2-3. Command Handler

```ts
// modules/order/write/src/command-bus/handlers/complete-item.ts

export const completeItemHandler: OrderCommandHandlerDefinition<
  {
    itemRepository: ItemRepository;
    domainEventIdGenerator: DomainEventIdGenerator;
  },
  "order.completeItem"   // ← コマンド名で ResultMap から型推論される
> = {
  factory: (deps) => (command, args) => {
    return deps.itemRepository
      .get(command.itemId)                                         // 1. アグリゲート取得
      .andThen((item) => completeItem(item, command.attachmentUrls))  // 2. ドメインロジック
      .andThen((updatedItem) =>
        deps.itemRepository.save(updatedItem).map(() => updatedItem), // 3. 保存
      )
      .map((item) => {
        args.domainEventStore.add(                                 // 4. ドメインイベント記録
          createItemEvent({
            type: OrderEventTypes.ITEM_COMPLETED,
            payload: { itemId: command.itemId, attachmentUrls: command.attachmentUrls },
            // ...
          }),
        );
        return { itemId: item.id };
      });
  },
  settings: {
    transactional: true,    // ← トランザクションの要否を宣言
  },
};
```

パターンは常に **取得 → ドメインロジック → 保存 → イベント** の4ステップです。

### 2-4. CommandBus の組み立て

```ts
// modules/order/write/src/command-bus/bus.ts

export const createOrderCommandBus = (
  deps: CreateOrderCommandBusDeps,
): OrderCommandBus => {
  const builder = new OrderCommandBusBuilder<Deps>({
    createDomainEventStore: deps.createDomainEventStore,
  });

  return builder
    .use(loggingMiddleware)
    .register("order.completeItem", {
      handlerFactory: (deps) =>
        completeItemHandler.factory({
          itemRepository: deps.itemRepository,
          domainEventIdGenerator: deps.domainEventIdGenerator,
        }),
      settings: completeItemHandler.settings,
    })
    // ... 全コマンドを登録
    .build({ resolveDeps: deps.resolveDeps });
};
```

---

## 3. modules/read — クエリ側の実装

CQRS の Read 側は書き込みモデルと**完全に独立**しています。DB から直接 ReadModel を構築します。

### 3-1. QueryService Interface

```ts
// modules/order/read/src/models/item-query-service.ts

export interface ItemQueryService {
  list(args?: ItemQueryListArgs): ResultAsync<Array<ItemReadModel>, DependencyError>;
  findById(id: ItemId): ResultAsync<Option<ItemReadModel>, DependencyError>;
  listDataExtracts(args?: ItemDataExtractListArgs): ResultAsync<ItemDataExtractListResult, DependencyError>;
  listStatusHistoryById(itemId: ItemId): ResultAsync<Array<ItemStatusHistoryReadModel>, DependencyError>;
}
```

### 3-2. Query Handler

コマンドハンドラーより単純で、QueryService に委譲するだけです。

```ts
// modules/order/read/src/query-bus/handlers/list-items-for-admin.ts

export const listItemsForAdmin: OrderQueryHandlerDefinition<
  { itemQueryService: ItemQueryService },
  "order.listItemsForAdmin"
> = {
  factory: (deps) => (query, _context) => {
    return deps.itemQueryService
      .list({ requesterId: query.requesterId, trackingNumber: query.trackingNumber })
      .map((items) => ({ items }));
  },
  settings: {},
};
```

---

## 4. modules/infra/db — インフラ実装

インターフェース（Repository・QueryService）の具体的な Drizzle ORM 実装です。

### 4-1. Repository 実装

```ts
// modules/order/infra/db/src/drizzle-item-repository.ts

export class DrizzleItemRepository implements ItemRepository {
  save(aggregate: ItemAggregate): ResultAsync<void, DependencyError | ConcurrencyError> {
    return executeQuery(async () => {
      const existing = await this.deps.db
        .select()
        .from(item)
        .where(eq(item.uuid, aggregate.id))
        .limit(1);

      if (existing.length === 0) {
        await this.deps.db.insert(item).values({ ... });
      } else {
        await this.deps.db.update(item).set({ ... }).where(eq(item.uuid, aggregate.id));
      }
    });
  }

  find(id: ItemId): ResultAsync<Option<ItemAggregate>, DependencyError> {
    return executeQuery(async () => {
      const results = await this.deps.db
        .select({ item, tenantUuid: tenant.uuid, ... })
        .from(item)
        .innerJoin(tenant, eq(item.tenantId, tenant.id))
        .where(eq(item.uuid, id))
        .limit(1);

      if (!results[0]) return none();
      return some(ItemAggregateSchema.parse({ ... }));
    });
  }

  get(id: ItemId): ResultAsync<ItemAggregate, DependencyError | ItemNotFoundError> {
    return this.find(id).andThen(
      (option) => toResult(option, () => OrderErrors.ITEM_NOT_FOUND.create({ itemId: id })),
    );
  }
}
```

### 4-2. QueryService 実装

Read 側は集約を経由せず、DB から直接 ReadModel を構築します。

```ts
// modules/order/infra/db/src/drizzle-item-query-service.ts

export class DrizzleItemQueryService implements ItemQueryService {
  list(args?: ItemQueryListArgs): ResultAsync<Array<ItemReadModel>, DependencyError> {
    return executeQuery(async () => {
      const conditions = [];
      if (args?.status) conditions.push(eq(item.status, args.status));
      if (args?.requesterId) {
        conditions.push(
          eq(item.requesterId, sql`(SELECT id FROM app.requesters WHERE uuid = ${args.requesterId})`),
        );
      }
      // ...

      const results = await this.deps.db
        .select({ item, requester, assigneeHeader, ... })
        .from(item)
        .innerJoin(requester, eq(item.requesterId, requester.id))
        .leftJoin(assigneeHeader, eq(item.assigneeId, assigneeHeader.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return results.map(mapRowToReadModel);
    });
  }
}
```

---

## 他プロジェクトで真似するためのチェックリスト

### ディレクトリ構成

```
contracts/
  {context}/
    public/
      {context}-commands.ts    ← CommandSchema + Result + CommandsResultMap
      {context}-queries.ts     ← QuerySchema + DTO + QueriesResultMap
      {context}-events.ts      ← DomainEvent 型定数 + イベントスキーマ
      {context}-errors.ts      ← defineError でエラー定義
      {context}-status.ts      ← z.enum + 同名 const（遷移ルール）
      index.ts                 ← re-export
    server/
      {context}-commands.ts    ← CommandBus / HandlerDefinition 型
      {context}-queries.ts     ← QueryBus / HandlerDefinition 型
      index.ts

modules/
  {context}/
    write/
      src/
        models/
          {aggregate}-aggregate/
            types.ts           ← Zod スキーマ + 型
            {action}.ts        ← ドメインロジック（ピュア関数）
          {aggregate}-repository.ts  ← Repository Interface
        command-bus/
          handlers/
            {action}.ts        ← HandlerDefinition
          bus.ts               ← CommandBus 組み立て
    read/
      src/
        models/
          {aggregate}-read-model.ts
          {aggregate}-query-service.ts  ← QueryService Interface
        query-bus/
          handlers/
            {action}.ts        ← HandlerDefinition
          bus.ts               ← QueryBus 組み立て
    infra/db/
      src/
        drizzle-{aggregate}-repository.ts    ← Repository 実装
        drizzle-{aggregate}-query-service.ts ← QueryService 実装
```

### 核となる設計パターン

| 要素 | 実装方法 | 目的 |
|------|----------|------|
| コマンド識別 | `type: z.literal("ctx.action")` | Union 型での型絞り込み |
| エラー型 | `[Result, Error]` タプルの ResultMap | ハンドラーの戻り値型を自動推論 |
| 非同期エラー | neverthrow の `ResultAsync` | 例外なし・型安全なエラー処理 |
| DI | `factory: (deps) => handler` パターン | テスタブルな依存注入 |
| CQRS 分離 | write / read を別パッケージ | 読み書きモデルの独立 |
| インフラ分離 | Interface → infra/db で実装 | DB 実装の差し替え可能 |
| アグリゲート | Zod スキーマ + ピュア関数 | クラスを使わないイミュータブルな実装 |
| コマンドハンドラー | 取得 → ロジック → 保存 → イベント | 一貫した4ステップパターン |
| ステータス型 | `z.enum` + 同名 `const` | 型とドメインルールを1セットで管理 |
| Branded Type | `z.brand()` | 検証済み状態を型で保証 |
| DTO ロール分離 | 管理者用・担当者用を別々に定義 | 情報の漏洩防止・最小権限 |

### 依存関係ルール

```
shared-kernel  ←  どこからでも参照可
contracts      ←  コンテキストをまたいで参照可（モジュール間連携はここ経由）
modules        ←  他コンテキストの modules を直接参照禁止
```
