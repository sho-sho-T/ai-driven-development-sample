# アプリケーションアーキテクチャ

## 1. アーキテクチャスタイル

**モジュラーモノリス + CQRS + DDD**

モジュラーモノリスは、単一のデプロイ可能なアプリケーション（モノリス）として動作しながら、内部を明確に分離されたモジュール（Bounded Context）で構成するアーキテクチャ。各モジュールは独立したビジネスコンテキストを持ち、将来的にマイクロサービスへ分割する際の移行コストを最小化できる設計となっている。

各モジュールは CQRS（Command Query Responsibility Segregation）パターンに基づき Write（書き込み）と Read（読み取り）を分離し、Write 側には DDD の戦術的パターンをフルセットで適用する。

---

## 2. 設計原則

### ① コンテキストの独立性

各コンテキスト（`packages/modules/*`）は独立しており、他コンテキストの実装に直接依存しない。

### ② 契約（contracts）による連携

コンテキスト間の連携は `packages/contracts/` を通じて行う。モジュール間で直接 import してはならない。

### ③ 共有機能の集約

共通機能は `packages/shared-kernel/` に集約し、重複を避ける。どのコンテキストからも参照可能。

### ④ CQRS の適用

「読み取り（Query: Read）」と「書き込み（Command: Write）」を分離し、それぞれ最適化された実装を可能にする。

### ⑤ デプロイ単位の明確化

`apps/` 配下の各アプリケーションは独立したデプロイ単位として管理される。

### ⑥ ドメイン駆動設計の戦術的パターン適用

Write 側には Entity, Value Object, Aggregate Root, Domain Event, Repository, Domain Service の各パターンを適用する。ドメインロジックはドメイン層に集約し、Application 層はユースケースのオーケストレーションに徹する。

---

## 3. ディレクトリ構成

```
packages/
├── contracts/
│   └── <context>/
│       ├── commands/              # Command 定義 + Input DTO
│       │   └── <action>.command.ts
│       ├── queries/               # Query 定義 + Input DTO
│       │   └── <action>.query.ts
│       ├── events/                # DomainEvent 定義
│       │   └── <entity>-<action>.event.ts
│       ├── dtos/                  # 共有 Output DTO
│       │   └── <entity>.dto.ts
│       └── index.ts               # 公開 API（re-export）
├── modules/
│   └── <context>/
│       ├── write/
│       │   ├── application/
│       │   │   ├── commands/      # CommandHandler
│       │   │   │   └── <action>.command-handler.ts
│       │   │   └── services/      # ApplicationService（複数 Aggregate 連携時）
│       │   │       └── <name>.application-service.ts
│       │   ├── domain/
│       │   │   ├── models/        # Entity, Aggregate, ValueObject
│       │   │   │   ├── <entity>.ts
│       │   │   │   └── <value-object>.vo.ts
│       │   │   ├── events/        # DomainEvent 発行ロジック
│       │   │   │   └── <entity>-<action>.event.ts
│       │   │   ├── services/      # DomainService
│       │   │   │   └── <name>.domain-service.ts
│       │   │   └── repositories/  # Repository インターフェース
│       │   │       └── <entity>.repository.ts
│       │   └── infra/
│       │       ├── repositories/  # Repository 実装
│       │       │   └── <entity>.repository.impl.ts
│       │       └── container.ts   # Write 側 DI 登録
│       ├── read/
│       │   ├── application/
│       │   │   └── queries/       # QueryHandler
│       │   │       └── <action>.query-handler.ts
│       │   ├── models/            # ReadModel
│       │   │   └── <entity>.read-model.ts
│       │   └── infra/
│       │       ├── queries/       # Query 実装（DB アクセス）
│       │       │   └── <action>.query.impl.ts
│       │       └── container.ts   # Read 側 DI 登録
│       └── index.ts               # モジュール公開 API
├── shared-kernel/
│   ├── public/                    # BE/FE 共通
│   │   └── result.ts             # Result<T, E> 型
│   └── server/                    # BE 専用
│       ├── domain/
│       │   ├── entity.ts          # Entity<TId> 基底クラス
│       │   ├── value-object.ts    # ValueObject<TProps> 基底クラス
│       │   ├── aggregate-root.ts  # AggregateRoot<TId> 基底クラス
│       │   └── domain-event.ts    # DomainEvent 基底クラス
│       ├── bus/
│       │   ├── command-bus.ts     # CommandBus インターフェース + 実装
│       │   ├── query-bus.ts       # QueryBus インターフェース + 実装
│       │   └── event-bus.ts       # EventBus インターフェース + 実装
│       └── container/
│           └── container.ts       # DI コンテナ実装
apps/
├── web/                           # メイン Web アプリ
├── admin-web/                     # 管理画面
└── dev-console/                   # 開発コンソール
```

### ファイル命名規則

| 種別 | パターン | 例 |
|---|---|---|
| Command | `<action>.command.ts` | `create-user.command.ts` |
| CommandHandler | `<action>.command-handler.ts` | `create-user.command-handler.ts` |
| Query | `<action>.query.ts` | `get-user-by-id.query.ts` |
| QueryHandler | `<action>.query-handler.ts` | `get-user-by-id.query-handler.ts` |
| DomainEvent | `<entity>-<action>.event.ts` | `user-created.event.ts` |
| Entity | `<entity>.ts` | `user.ts` |
| ValueObject | `<name>.vo.ts` | `email.vo.ts` |
| Repository Interface | `<entity>.repository.ts` | `user.repository.ts` |
| Repository Impl | `<entity>.repository.impl.ts` | `user.repository.impl.ts` |
| ReadModel | `<entity>.read-model.ts` | `user.read-model.ts` |
| DTO | `<entity>.dto.ts` | `user.dto.ts` |
| DomainService | `<name>.domain-service.ts` | `user-uniqueness.domain-service.ts` |
| ApplicationService | `<name>.application-service.ts` | `user-registration.application-service.ts` |
| DI Container | `container.ts` | `container.ts` |

---

## 4. DDD 戦術的パターン

### 4.1 Entity

**概要**: 一意の識別子（ID）を持ち、ライフサイクルを通じて同一性が保たれるドメインオブジェクト。

**配置場所**: `packages/modules/<context>/write/domain/models/`

**基底クラス**: `packages/shared-kernel/server/domain/entity.ts`

```typescript
export abstract class Entity<TId> {
  protected readonly _id: TId;

  protected constructor(id: TId) {
    this._id = id;
  }

  get id(): TId {
    return this._id;
  }

  equals(other: Entity<TId>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this === other) {
      return true;
    }
    return this._id === other._id;
  }
}
```

**命名規則**: `<entity>.ts`（例: `user.ts`, `order.ts`）

**制約・ルール**:
- Entity は必ず ID を持つ
- 同一性は ID で判定する（`equals` メソッド）
- Entity のプロパティ変更はメソッドを通じて行う（setter 禁止）
- ビジネスルールのバリデーションは Entity 内で行う
- 生成時のバリデーションには `Result` 型を使い、`static create()` ファクトリメソッドで生成する

**実装例**:

```typescript
import { Entity } from "@packages/shared-kernel/server/domain/entity";
import { Result } from "@packages/shared-kernel/public/result";
import { Email } from "./email.vo";

export class User extends Entity<string> {
  private _email: Email;
  private _name: string;

  private constructor(id: string, email: Email, name: string) {
    super(id);
    this._email = email;
    this._name = name;
  }

  static create(props: {
    id: string;
    email: Email;
    name: string;
  }): Result<User, string> {
    if (props.name.length === 0) {
      return Result.fail("Name must not be empty");
    }
    return Result.ok(new User(props.id, props.email, props.name));
  }

  get email(): Email {
    return this._email;
  }

  get name(): string {
    return this._name;
  }

  changeName(name: string): Result<void, string> {
    if (name.length === 0) {
      return Result.fail("Name must not be empty");
    }
    this._name = name;
    return Result.ok(undefined);
  }
}
```

---

### 4.2 Value Object

**概要**: 識別子を持たず、属性の組み合わせで等価性を判定する不変オブジェクト。

**配置場所**: `packages/modules/<context>/write/domain/models/`

**基底クラス**: `packages/shared-kernel/server/domain/value-object.ts`

```typescript
export abstract class ValueObject<TProps> {
  protected readonly props: TProps;

  protected constructor(props: TProps) {
    this.props = Object.freeze(props);
  }

  equals(other: ValueObject<TProps>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
```

**命名規則**: `<name>.vo.ts`（例: `email.vo.ts`, `money.vo.ts`）

**制約・ルール**:
- Value Object は不変（immutable）。生成後にプロパティを変更しない
- 等価性はすべてのプロパティの値で判定する
- 生成時のバリデーションには `Result` 型を使い、`static create()` ファクトリメソッドで生成する
- 変更が必要な場合は新しいインスタンスを生成する

**実装例**:

```typescript
import { ValueObject } from "@packages/shared-kernel/server/domain/value-object";
import { Result } from "@packages/shared-kernel/public/result";

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  static create(value: string): Result<Email, string> {
    if (!value.includes("@")) {
      return Result.fail("Invalid email format");
    }
    return Result.ok(new Email({ value }));
  }

  get value(): string {
    return this.props.value;
  }
}
```

---

### 4.3 Aggregate Root

**概要**: 集約の境界を定義し、集約内の整合性を保証するルートエンティティ。ドメインイベントの発行責務を持つ。

**配置場所**: `packages/modules/<context>/write/domain/models/`

**基底クラス**: `packages/shared-kernel/server/domain/aggregate-root.ts`

```typescript
import { Entity } from "./entity";
import type { DomainEvent } from "./domain-event";

export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
```

**命名規則**: Entity と同じ `<entity>.ts`。Aggregate Root は `AggregateRoot` を継承することで区別する。

**制約・ルール**:
- 外部からの操作は必ず Aggregate Root を経由する（集約内部の Entity に直接アクセスしない）
- トランザクション境界 = Aggregate 境界
- 1 つのユースケースで変更する Aggregate は原則 1 つ
- Aggregate 間の参照は ID のみ（オブジェクト参照禁止）
- ドメインイベントは Aggregate Root の操作メソッド内で `addDomainEvent()` を呼び出して発行する

**実装例**:

```typescript
import { AggregateRoot } from "@packages/shared-kernel/server/domain/aggregate-root";
import { Result } from "@packages/shared-kernel/public/result";
import { UserCreatedEvent } from "../events/user-created.event";
import { Email } from "./email.vo";

export class User extends AggregateRoot<string> {
  private _email: Email;
  private _name: string;

  private constructor(id: string, email: Email, name: string) {
    super(id);
    this._email = email;
    this._name = name;
  }

  static create(props: {
    id: string;
    email: Email;
    name: string;
  }): Result<User, string> {
    if (props.name.length === 0) {
      return Result.fail("Name must not be empty");
    }
    const user = new User(props.id, props.email, props.name);
    user.addDomainEvent(
      new UserCreatedEvent({
        userId: props.id,
        email: props.email.value,
      }),
    );
    return Result.ok(user);
  }

  get email(): Email {
    return this._email;
  }

  get name(): string {
    return this._name;
  }
}
```

---

### 4.4 Domain Event

**概要**: ドメインで発生した重要な出来事を表現するオブジェクト。Aggregate の状態変更時に発行され、他の Bounded Context への通知に使用される。

**配置場所**:
- 型定義: `packages/contracts/<context>/events/`
- 発行ロジック: `packages/modules/<context>/write/domain/events/`

**基底クラス**: `packages/shared-kernel/server/domain/domain-event.ts`

```typescript
export abstract class DomainEvent {
  readonly occurredOn: Date;
  abstract readonly eventName: string;

  protected constructor() {
    this.occurredOn = new Date();
  }
}
```

**命名規則**: `<entity>-<action>.event.ts`（例: `user-created.event.ts`, `order-placed.event.ts`）

**制約・ルール**:
- DomainEvent は不変（immutable）
- `eventName` はグローバルに一意とする（`<context>.<entity>.<action>` 形式を推奨）
- DomainEvent は Aggregate Root 内で `addDomainEvent()` により発行する
- Handler による処理は EventBus 経由で非同期的に行う

**実装例**:

```typescript
import { DomainEvent } from "@packages/shared-kernel/server/domain/domain-event";

interface UserCreatedPayload {
  userId: string;
  email: string;
}

export class UserCreatedEvent extends DomainEvent {
  readonly eventName = "auth.user.created";
  readonly payload: UserCreatedPayload;

  constructor(payload: UserCreatedPayload) {
    super();
    this.payload = payload;
  }
}
```

---

### 4.5 Repository（インターフェース）

**概要**: Aggregate の永続化・復元を抽象化するインターフェース。ドメイン層に定義し、インフラ層で実装する。

**配置場所**:
- インターフェース: `packages/modules/<context>/write/domain/repositories/`
- 実装: `packages/modules/<context>/write/infra/repositories/`

**命名規則**:
- インターフェース: `<entity>.repository.ts`
- 実装: `<entity>.repository.impl.ts`

**インターフェース定義**:

```typescript
import type { Result } from "@packages/shared-kernel/public/result";
import type { User } from "../models/user";

export interface UserRepository {
  findById(id: string): Promise<Result<User | null, Error>>;
  save(user: User): Promise<Result<void, Error>>;
  delete(id: string): Promise<Result<void, Error>>;
}
```

**制約・ルール**:
- Repository は Aggregate Root 単位で定義する（Entity 単体の Repository は作らない）
- Repository インターフェースはドメイン層に配置し、インフラ層の技術詳細に依存しない
- すべてのメソッドは `Result` 型を返す（never throw）
- 戻り値は `Promise<Result<T, Error>>` とする

---

### 4.6 Domain Service

**概要**: 単一の Entity や Value Object に属さないドメインロジックを配置する。複数の Aggregate にまたがるビジネスルールの検証などに使用する。

**配置場所**: `packages/modules/<context>/write/domain/services/`

**命名規則**: `<name>.domain-service.ts`（例: `user-uniqueness.domain-service.ts`）

**制約・ルール**:
- Domain Service はステートレス
- 複数 Aggregate の読み取りは許可するが、変更するのは 1 Aggregate に限定する
- Repository インターフェースを依存として受け取る（DI）
- ドメイン層内に配置し、インフラ層に依存しない

**実装例**:

```typescript
import type { Result } from "@packages/shared-kernel/public/result";
import type { UserRepository } from "../repositories/user.repository";

export class UserUniquenessService {
  constructor(private readonly userRepository: UserRepository) {}

  async isEmailUnique(email: string): Promise<Result<boolean, Error>> {
    const result = await this.userRepository.findByEmail(email);
    if (!result.isOk) {
      return Result.fail(result.error);
    }
    return Result.ok(result.value === null);
  }
}
```

---

## 5. CQRS + Bus アーキテクチャ

### 5.1 概要

Command（書き込み）と Query（読み取り）を完全に分離し、それぞれ専用の Bus で Handler にディスパッチする。

```
[Command 側]
Controller → CommandBus.execute(command) → CommandHandler → Domain → Repository

[Query 側]
Controller → QueryBus.execute(query) → QueryHandler → ReadModel → DB

[Event 側]
CommandHandler → AggregateRoot.addDomainEvent() → EventBus.publish(events) → EventHandler[]
```

### 5.2 CommandBus

Command を対応する唯一の CommandHandler にディスパッチする（1:1 関係）。

**配置場所**: `packages/shared-kernel/server/bus/command-bus.ts`

```typescript
export interface Command {
  readonly commandName: string;
}

export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): Promise<Result<TResult, Error>>;
}

export interface CommandBus {
  register<TCommand extends Command>(
    commandName: string,
    handler: CommandHandler<TCommand, unknown>,
  ): void;
  execute<TResult>(command: Command): Promise<Result<TResult, Error>>;
}
```

**実装パターン**:

```typescript
import type { Result } from "@packages/shared-kernel/public/result";

export class InMemoryCommandBus implements CommandBus {
  private handlers = new Map<string, CommandHandler<Command, unknown>>();

  register<TCommand extends Command>(
    commandName: string,
    handler: CommandHandler<TCommand, unknown>,
  ): void {
    if (this.handlers.has(commandName)) {
      throw new Error(
        `Handler already registered for command: ${commandName}`,
      );
    }
    this.handlers.set(
      commandName,
      handler as CommandHandler<Command, unknown>,
    );
  }

  async execute<TResult>(command: Command): Promise<Result<TResult, Error>> {
    const handler = this.handlers.get(command.commandName);
    if (!handler) {
      return Result.fail(
        new Error(`No handler registered for command: ${command.commandName}`),
      );
    }
    return handler.handle(command) as Promise<Result<TResult, Error>>;
  }
}
```

### 5.3 QueryBus

Query を対応する唯一の QueryHandler にディスパッチする（1:1 関係）。

**配置場所**: `packages/shared-kernel/server/bus/query-bus.ts`

```typescript
export interface Query {
  readonly queryName: string;
}

export interface QueryHandler<TQuery extends Query, TResult> {
  handle(query: TQuery): Promise<Result<TResult, Error>>;
}

export interface QueryBus {
  register<TQuery extends Query, TResult>(
    queryName: string,
    handler: QueryHandler<TQuery, TResult>,
  ): void;
  execute<TResult>(query: Query): Promise<Result<TResult, Error>>;
}
```

**実装パターン**:

```typescript
export class InMemoryQueryBus implements QueryBus {
  private handlers = new Map<string, QueryHandler<Query, unknown>>();

  register<TQuery extends Query, TResult>(
    queryName: string,
    handler: QueryHandler<TQuery, TResult>,
  ): void {
    if (this.handlers.has(queryName)) {
      throw new Error(`Handler already registered for query: ${queryName}`);
    }
    this.handlers.set(queryName, handler as QueryHandler<Query, unknown>);
  }

  async execute<TResult>(query: Query): Promise<Result<TResult, Error>> {
    const handler = this.handlers.get(query.queryName);
    if (!handler) {
      return Result.fail(
        new Error(`No handler registered for query: ${query.queryName}`),
      );
    }
    return handler.handle(query) as Promise<Result<TResult, Error>>;
  }
}
```

### 5.4 EventBus

DomainEvent を複数の EventHandler にディスパッチする（1:N 関係）。モジュール間の疎結合な連携に使用する。

**配置場所**: `packages/shared-kernel/server/bus/event-bus.ts`

```typescript
import type { DomainEvent } from "../domain/domain-event";

export interface EventHandler<TEvent extends DomainEvent> {
  handle(event: TEvent): Promise<void>;
}

export interface EventBus {
  subscribe<TEvent extends DomainEvent>(
    eventName: string,
    handler: EventHandler<TEvent>,
  ): void;
  publish(events: DomainEvent[]): Promise<void>;
}
```

**実装パターン**:

```typescript
export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, EventHandler<DomainEvent>[]>();

  subscribe<TEvent extends DomainEvent>(
    eventName: string,
    handler: EventHandler<TEvent>,
  ): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler as EventHandler<DomainEvent>);
    this.handlers.set(eventName, existing);
  }

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.handlers.get(event.eventName) ?? [];
      await Promise.all(handlers.map((handler) => handler.handle(event)));
    }
  }
}
```

### 5.5 Handler 登録パターン

各モジュールの `container.ts` で Handler を Bus に登録する。

```typescript
// packages/modules/<context>/write/infra/container.ts
import type { Container } from "@packages/shared-kernel/server/container/container";
import type { CommandBus } from "@packages/shared-kernel/server/bus/command-bus";
import type { EventBus } from "@packages/shared-kernel/server/bus/event-bus";
import { CreateUserCommandHandler } from "../application/commands/create-user.command-handler";
import { UserRepositoryImpl } from "./repositories/user.repository.impl";

export function registerWriteModule(container: Container): void {
  // Repository
  const userRepository = new UserRepositoryImpl(/* db client */);
  container.register("UserRepository", userRepository);

  // CommandHandler
  const commandBus = container.resolve<CommandBus>("CommandBus");
  const createUserHandler = new CreateUserCommandHandler(userRepository);
  commandBus.register("auth.createUser", createUserHandler);

  // EventHandler（他コンテキストのイベントを購読する場合）
  const eventBus = container.resolve<EventBus>("EventBus");
  // eventBus.subscribe("billing.payment.completed", new PaymentCompletedHandler(...));
}
```

### 5.6 モジュール間の Event 駆動通信フロー

```
[Context A: Write]
  CommandHandler
    → AggregateRoot を操作
    → AggregateRoot 内で addDomainEvent()
    → Repository.save() 後に EventBus.publish(aggregate.domainEvents)
    → aggregate.clearDomainEvents()

[EventBus]
  → 登録されたすべての EventHandler にディスパッチ

[Context B: Write]
  EventHandler が受信
    → 自コンテキストの CommandBus.execute() で処理を実行
    → または自コンテキストの Aggregate を操作
```

---

## 6. カスタム DI コンテナ

### 6.1 概要

軽量なカスタム DI コンテナを使用し、各モジュールの依存関係を管理する。外部 DI ライブラリは使用しない。

### 6.2 インターフェース定義

**配置場所**: `packages/shared-kernel/server/container/container.ts`

```typescript
export interface Container {
  register<T>(token: string, instance: T): void;
  resolve<T>(token: string): T;
}
```

### 6.3 実装

```typescript
export class InMemoryContainer implements Container {
  private registry = new Map<string, unknown>();

  register<T>(token: string, instance: T): void {
    this.registry.set(token, instance);
  }

  resolve<T>(token: string): T {
    const instance = this.registry.get(token);
    if (instance === undefined) {
      throw new Error(`No registration found for token: ${token}`);
    }
    return instance as T;
  }
}
```

### 6.4 モジュール単位のコンテナ構成

各モジュールは `container.ts` で自身の依存関係を登録する関数をエクスポートする。

```typescript
// packages/modules/<context>/write/infra/container.ts
export function registerWriteModule(container: Container): void {
  // Repository 実装の登録
  // CommandHandler の登録
  // EventHandler の登録（購読）
}

// packages/modules/<context>/read/infra/container.ts
export function registerReadModule(container: Container): void {
  // QueryHandler の登録
}
```

### 6.5 ルートコンテナへの統合

アプリケーションのエントリポイントで、ルートコンテナを作成し、共通サービス（Bus 群）を登録した後に各モジュールの登録関数を呼び出す。

```typescript
// apps/<app>/src/container.ts
import { InMemoryContainer } from "@packages/shared-kernel/server/container/container";
import { InMemoryCommandBus } from "@packages/shared-kernel/server/bus/command-bus";
import { InMemoryQueryBus } from "@packages/shared-kernel/server/bus/query-bus";
import { InMemoryEventBus } from "@packages/shared-kernel/server/bus/event-bus";
import { registerWriteModule as registerAuthWrite } from "@packages/modules/auth/write/infra/container";
import { registerReadModule as registerAuthRead } from "@packages/modules/auth/read/infra/container";

export function createContainer(): Container {
  const container = new InMemoryContainer();

  // 共通サービスの登録
  container.register("CommandBus", new InMemoryCommandBus());
  container.register("QueryBus", new InMemoryQueryBus());
  container.register("EventBus", new InMemoryEventBus());

  // 各モジュールの登録
  registerAuthWrite(container);
  registerAuthRead(container);
  // 他モジュールも同様に登録

  return container;
}
```

---

## 7. Contracts（`packages/contracts/`）

### 7.1 概要

`contracts` はモジュール間参照の**唯一の経路**。各 Bounded Context の公開インターフェースとして、Command, Query, DomainEvent, DTO の型定義を提供する。

### 7.2 構成

```
packages/contracts/
└── <context>/
    ├── commands/          # Command 定義
    ├── queries/           # Query 定義
    ├── events/            # DomainEvent 型定義
    ├── dtos/              # Output DTO
    └── index.ts           # re-export
```

### 7.3 Command 定義例

```typescript
// packages/contracts/auth/commands/create-user.command.ts
import type { Command } from "@packages/shared-kernel/server/bus/command-bus";

export interface CreateUserInput {
  email: string;
  name: string;
}

export class CreateUserCommand implements Command {
  readonly commandName = "auth.createUser";
  constructor(readonly input: CreateUserInput) {}
}
```

### 7.4 Query 定義例

```typescript
// packages/contracts/auth/queries/get-user-by-id.query.ts
import type { Query } from "@packages/shared-kernel/server/bus/query-bus";

export class GetUserByIdQuery implements Query {
  readonly queryName = "auth.getUserById";
  constructor(readonly userId: string) {}
}
```

### 7.5 Event 定義例

```typescript
// packages/contracts/auth/events/user-created.event.ts
import { DomainEvent } from "@packages/shared-kernel/server/domain/domain-event";

export class UserCreatedEvent extends DomainEvent {
  readonly eventName = "auth.user.created";
  constructor(
    readonly payload: {
      userId: string;
      email: string;
    },
  ) {
    super();
  }
}
```

### 7.6 命名規則

| 種別 | `commandName` / `queryName` / `eventName` |
|---|---|
| Command | `<context>.<action>` 例: `auth.createUser` |
| Query | `<context>.<action>` 例: `auth.getUserById` |
| DomainEvent | `<context>.<entity>.<action>` 例: `auth.user.created` |

### 7.7 ルール

- モジュール間の import は `@packages/contracts/<context>` からのみ行う
- `packages/modules/<context-a>` から `packages/modules/<context-b>` への直接 import は禁止
- contracts 内にはビジネスロジックを含めない（型定義のみ）

---

## 8. DTO パターン

### 8.1 Input DTO と Output DTO の区別

| 種別 | 用途 | 定義場所 |
|---|---|---|
| Input DTO | Command / Query の引数 | `packages/contracts/<context>/commands/` or `queries/` |
| Output DTO | Handler からの戻り値（外部公開用） | `packages/contracts/<context>/dtos/` |

### 8.2 Input DTO

Command や Query のコンストラクタ引数として定義する。プリミティブ型またはシンプルなオブジェクト型で構成し、ドメインオブジェクトを含めない。

```typescript
// Input DTO は Command 内に定義する
export interface CreateUserInput {
  email: string;
  name: string;
}
```

### 8.3 Output DTO

ドメインモデルを外部に公開するための変換済みオブジェクト。機密データを除外し、必要な情報のみを含む。

```typescript
// packages/contracts/auth/dtos/user.dto.ts
export interface UserDto {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}
```

### 8.4 Domain Model との変換ルール

- **Domain → DTO**: Handler 内で変換する。Aggregate / Entity のプロパティから DTO を生成する
- **DTO → Domain**: Handler 内で Value Object の `create()` メソッドを使い、バリデーション付きで変換する
- Domain Model を Handler の外に漏洩させない

```typescript
// CommandHandler 内での変換例
export class CreateUserCommandHandler
  implements CommandHandler<CreateUserCommand, UserDto>
{
  async handle(
    command: CreateUserCommand,
  ): Promise<Result<UserDto, Error>> {
    // Input DTO → Domain
    const emailResult = Email.create(command.input.email);
    if (!emailResult.isOk) {
      return Result.fail(new Error(emailResult.error));
    }

    const userResult = User.create({
      id: generateId(),
      email: emailResult.value,
      name: command.input.name,
    });
    if (!userResult.isOk) {
      return Result.fail(new Error(userResult.error));
    }

    // 永続化
    const saveResult = await this.userRepository.save(userResult.value);
    if (!saveResult.isOk) {
      return Result.fail(saveResult.error);
    }

    // Domain → Output DTO
    const user = userResult.value;
    return Result.ok({
      id: user.id,
      email: user.email.value,
      name: user.name,
      createdAt: new Date().toISOString(),
    });
  }
}
```

---

## 9. インフラストラクチャ層

### 9.1 Repository 実装パターン

Repository の実装はインフラ層に配置し、ドメイン層のインターフェースを実装する。

**配置場所**: `packages/modules/<context>/write/infra/repositories/`

```typescript
// packages/modules/auth/write/infra/repositories/user.repository.impl.ts
import type { Result } from "@packages/shared-kernel/public/result";
import type { UserRepository } from "../../domain/repositories/user.repository";
import type { User } from "../../domain/models/user";

export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(id: string): Promise<Result<User | null, Error>> {
    try {
      const row = await this.db
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (!row) {
        return Result.ok(null);
      }

      return this.toDomain(row);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  async save(user: User): Promise<Result<void, Error>> {
    try {
      await this.db.from("users").upsert(this.toPersistence(user));
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  async delete(id: string): Promise<Result<void, Error>> {
    try {
      await this.db.from("users").delete().eq("id", id);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private toPersistence(user: User): Record<string, unknown> {
    return {
      id: user.id,
      email: user.email.value,
      name: user.name,
    };
  }

  private toDomain(row: Record<string, unknown>): Result<User, Error> {
    // DB 行 → Domain Model への復元
    // Value Object の create() を使いバリデーション付きで復元
  }
}
```

### 9.2 Result 型（never throw）

**方針**: アプリケーション内で例外をスローしない。すべての処理結果を `Result<T, E>` 型で表現する。

**配置場所**: `packages/shared-kernel/public/result.ts`

```typescript
export type Result<T, E> = Ok<T> | Fail<E>;

interface Ok<T> {
  readonly isOk: true;
  readonly value: T;
}

interface Fail<E> {
  readonly isOk: false;
  readonly error: E;
}

export const Result = {
  ok<T>(value: T): Ok<T> {
    return { isOk: true, value };
  },
  fail<E>(error: E): Fail<E> {
    return { isOk: false, error };
  },
};
```

**ルール**:
- Repository, Handler, Service のすべてのメソッドは `Result` 型を返す
- `try-catch` はインフラ層の境界でのみ使用し、`Result.fail()` に変換する
- 呼び出し元は `isOk` で分岐して処理する

### 9.3 DB アクセスパターン

- DB アクセスは必ずインフラ層（`infra/`）を経由する
- ドメイン層・アプリケーション層から DB クライアントを直接使用しない
- パラメータ化クエリを使用し、SQL インジェクションを防ぐ
- Read 側は ReadModel に最適化されたクエリを直接実行してよい（Domain Model を経由しない）

---

## 10. Shared Kernel

### 10.1 public / server の区別

| パス | 用途 | 参照可能な環境 |
|---|---|---|
| `packages/shared-kernel/public/` | BE・FE 共通で使用する型・ユーティリティ | すべて |
| `packages/shared-kernel/server/` | BE 専用の基盤コード | サーバーサイドのみ |

### 10.2 public に含まれるもの

| ファイル | 内容 |
|---|---|
| `result.ts` | `Result<T, E>` 型定義 |

### 10.3 server に含まれるもの

| ディレクトリ | ファイル | 内容 |
|---|---|---|
| `domain/` | `entity.ts` | `Entity<TId>` 基底クラス |
| `domain/` | `value-object.ts` | `ValueObject<TProps>` 基底クラス |
| `domain/` | `aggregate-root.ts` | `AggregateRoot<TId>` 基底クラス |
| `domain/` | `domain-event.ts` | `DomainEvent` 基底クラス |
| `bus/` | `command-bus.ts` | `CommandBus` インターフェース + `InMemoryCommandBus` 実装 |
| `bus/` | `query-bus.ts` | `QueryBus` インターフェース + `InMemoryQueryBus` 実装 |
| `bus/` | `event-bus.ts` | `EventBus` インターフェース + `InMemoryEventBus` 実装 |
| `container/` | `container.ts` | `Container` インターフェース + `InMemoryContainer` 実装 |

### 10.4 参照ルール

- `shared-kernel` はどのモジュール・アプリケーションからも参照可能
- `shared-kernel` は `modules` や `contracts` に依存してはならない（依存方向: modules → shared-kernel）

---

## 11. モジュール間通信フロー

### 11.1 Command フロー（書き込み）

```
1. Controller
   └─→ CommandBus.execute(new CreateUserCommand({ email, name }))

2. CommandBus
   └─→ CreateUserCommandHandler.handle(command)

3. CommandHandler
   ├─→ Input DTO → Value Object 変換（バリデーション）
   ├─→ AggregateRoot.create() or aggregate.doSomething()
   │     └─→ aggregate 内で addDomainEvent()
   ├─→ Repository.save(aggregate)
   ├─→ EventBus.publish(aggregate.domainEvents)
   ├─→ aggregate.clearDomainEvents()
   └─→ Domain → Output DTO 変換 → Result.ok(dto)

4. EventBus
   └─→ 登録済み EventHandler[] に順次ディスパッチ
```

### 11.2 Query フロー（読み取り）

```
1. Controller
   └─→ QueryBus.execute(new GetUserByIdQuery(userId))

2. QueryBus
   └─→ GetUserByIdQueryHandler.handle(query)

3. QueryHandler
   ├─→ DB から直接 ReadModel を取得（Domain Model を経由しない）
   └─→ Result.ok(readModel)
```

### 11.3 Event フロー（モジュール間連携）

```
[Context A]
1. CommandHandler が Aggregate を操作
2. Aggregate 内で addDomainEvent(new UserCreatedEvent(...))
3. Repository.save(aggregate) 後、EventBus.publish(aggregate.domainEvents)

[EventBus]
4. "auth.user.created" に登録されたすべての Handler を実行

[Context B]
5. OnUserCreatedHandler.handle(event)
   └─→ 自コンテキストの Aggregate を操作
   └─→ または自コンテキストの CommandBus.execute() を呼び出し
```

---

## 12. セキュリティ考慮

### 12.1 境界でのバリデーション

- Controller 層で入力値の基本バリデーション（型、必須項目）を行う
- ドメイン層で Value Object の `create()` によるビジネスルールバリデーションを行う
- 2 段階のバリデーションで不正データの侵入を防ぐ

### 12.2 DTO での機密データ排除

- Output DTO にはパスワードハッシュ、内部 ID など機密情報を含めない
- Domain Model → DTO 変換時に明示的にフィールドを選択する

### 12.3 パラメータ化クエリ

- SQL 文字列の結合を禁止する
- DB クライアントのパラメータバインディング機能を使用する
- ORM / クエリビルダを使用する場合もパラメータ化を確認する

---

## 13. まとめ

| 概念 | 説明 | 配置場所 |
|---|---|---|
| **Bounded Context** | 独立したビジネスドメインの境界 | `packages/modules/<context>/` |
| **Contract** | コンテキスト間の公開インターフェース | `packages/contracts/<context>/` |
| **Write（Command）** | 書き込み処理。Application + Domain Model | `modules/<ctx>/write/` |
| **Read（Query）** | 読み取り処理。Application + ReadModel | `modules/<ctx>/read/` |
| **Entity** | ID を持つドメインオブジェクト | `write/domain/models/` |
| **Value Object** | 不変・値で等価判定するオブジェクト | `write/domain/models/` |
| **Aggregate Root** | 集約のルートエンティティ。Event 発行 | `write/domain/models/` |
| **Domain Event** | ドメインの重要な出来事 | `contracts/<ctx>/events/` |
| **Repository** | Aggregate の永続化抽象 | IF: `write/domain/repositories/`, Impl: `write/infra/repositories/` |
| **Domain Service** | 複数 Aggregate にまたがるロジック | `write/domain/services/` |
| **CommandBus** | Command → Handler（1:1） | `shared-kernel/server/bus/` |
| **QueryBus** | Query → Handler（1:1） | `shared-kernel/server/bus/` |
| **EventBus** | Event → Handler[]（1:N） | `shared-kernel/server/bus/` |
| **DI Container** | 依存関係管理 | `shared-kernel/server/container/` |
| **Result** | 例外を使わないエラーハンドリング | `shared-kernel/public/` |
| **Infra** | Repository 実装・DB アクセス | `modules/<ctx>/write/infra/` |
| **Shared Kernel** | 全コンテキスト共通の基盤 | `packages/shared-kernel/` |
| **Controller** | Web リクエストのエントリポイント | `apps/<app>/` |
