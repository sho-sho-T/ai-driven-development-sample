# Frontend Code Patterns

## TanStack Start の特性

- Server Components は存在しない（`"use client"` / `"use server"` 区別なし）
- 全コンポーネントは isomorphic（クライアント・サーバー両方で動作）
- SSR データ取得は Route の `loader` + `createServerFn` が担う
- dehydrate/hydrate は `@tanstack/react-router-ssr-query` が自動管理

## 1. Route = Container（薄いルートファイル）

ルートファイルは loader でデータをプリフェッチし、Presenter に渡すだけ。

```tsx
// routes/<domain>/index.tsx
export const Route = createFileRoute("/<domain>/")({\
  component: DomainIndexPage,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(entityListQueryOptions()),
});

function DomainIndexPage() {
  const { data } = useSuspenseQuery(entityListQueryOptions());
  return <EntityTable data={data} />;
}
```

## 2. Presenter コンポーネント（props → JSX）

純粋なコンポーネント。ビジネスロジック・データ取得を含めない。

```tsx
// features/<domain>/components/<component>.tsx
interface EntityTableProps {
  readonly data: EntityListDto;
}

export function EntityTable({ data }: EntityTableProps) {
  return (/* JSX */);
}
```

## 3. queryOptions ファクトリ

loader とコンポーネント間で共有し、SSR キャッシュをクライアントで即座にヒットさせる。

```tsx
// features/<domain>/hooks/use-<domain>-queries.ts
export function entityListQueryOptions() {
  return queryOptions({
    queryKey: ["<domain>"],
    queryFn: () => listEntities(),
  });
}
```

## 4. Mutation Hook

副作用（API 呼び出し）とキャッシュ無効化をカプセル化する。

```tsx
// features/<domain>/hooks/use-<action>.ts
export function useRegisterEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => registerEntity({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["<domain>"] });
      navigate({ to: "/<domain>" });
    },
  });
}
```

## 5. Server Function

サーバー側処理は `createServerFn` で定義し、`server/` に配置する。

## Data Flow

### 読み取り（Query）
```
[SSR] Route loader → ensureQueryData(queryOptions) → createServerFn → キャッシュ → 自動 dehydrate
[Client] 自動 hydrate → useSuspenseQuery(queryOptions) → キャッシュヒット → Presenter に props
```

### 書き込み（Mutation）
```
[Client] Presenter → onSubmit → mutation hook → createServerFn → invalidateQueries → navigate
```

## Prohibited Patterns

- ルートファイルに UI ロジックを直接書かない
- Presenter 内で hooks（useQuery, useMutation 等）を呼ばない
- queryOptions を loader とコンポーネントで別々に定義しない（必ず共有する）
- `dehydrate` / `HydrationBoundary` を手動管理しない（自動管理に任せる）
