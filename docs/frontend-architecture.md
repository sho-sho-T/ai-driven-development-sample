# フロントエンドアーキテクチャ

## 概要

TanStack Start + TanStack Query によるフロントエンドアーキテクチャ。
Next.js の Container/Presenter パターンを TanStack Start に適応させた構成。

## TanStack Start と Next.js の違い

| Next.js | TanStack Start |
|---------|----------------|
| Server Components（デフォルト） | 存在しない。全コンポーネントは isomorphic（同一コードがクライアントとサーバーの両方で動作する設計） |
| `"use client"` / `"use server"` | 区別なし |
| Server 側テンプレート | Route `loader` + `createServerFn` が担う |
| `dehydrate` / `HydrationBoundary` 手動管理 | `@tanstack/react-router-ssr-query` が自動管理 |

**結論**: TanStack Start では Server Components がないため、`src/server/templates/` のようなサーバー側テンプレート層は不要。Route の `loader` が SSR データ取得を担い、`createServerFn` がサーバー側実行を担う。

## ディレクトリ構造

```
apps/web/src/
├── routes/                          # 薄いルートファイル（file-based routing）
│   ├── __root.tsx                   # QueryClient を context 経由で提供
│   └── books/
│       ├── index.tsx                # loader + presenter 呼び出しのみ
│       ├── new.tsx                  # mutation hook + form presenter 呼び出しのみ
│       └── $bookId.tsx             # loader + presenter 呼び出しのみ
├── features/                        # ドメイン別 UI（Container/Presenter の代替）
│   └── books/
│       ├── components/              # Presenter コンポーネント（純粋な props → JSX）
│       │   ├── book-table.tsx       # 書籍一覧テーブル
│       │   ├── book-detail-card.tsx # 書籍詳細カード
│       │   └── book-form.tsx        # 書籍登録フォーム
│       └── hooks/                   # ロジック層（TanStack Query options + mutation hooks）
│           ├── use-book-queries.ts  # queryOptions ファクトリ
│           └── use-register-book.ts # mutation hook
├── server/                          # サーバー関数（createServerFn）
│   ├── catalog-server-fns.ts        # catalog コンテキストの Server Function
│   └── di/configure.ts              # DI コンテナ設定
├── components/ui/                   # shadcn/ui コンポーネント
├── lib/
│   ├── utils.ts                     # ユーティリティ
│   └── query-client.ts             # QueryClient ファクトリ
└── router.tsx                       # SSR Query 統合設定
```

## アーキテクチャパターン

### 1. Route = Container（薄いルートファイル）

TanStack Start ではルートファイルが Next.js の Container Component の役割を果たす。

- `loader` で SSR データプリフェッチ
- `useSuspenseQuery` でクライアント側データ取得
- Presenter に props を渡す

```tsx
// routes/books/index.tsx — ルートファイルの例
export const Route = createFileRoute("/books/")({
  component: BooksIndexPage,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(bookListQueryOptions()),
});

function BooksIndexPage() {
  const { data } = useSuspenseQuery(bookListQueryOptions());
  return <BookTable data={data} />;
}
```

ルートファイルには **データ取得の接続コードのみ** を置く。UI ロジックは features/ に委譲する。

### 2. features/\*/components/ = Presenter

純粋な props → JSX のコンポーネント。

- ビジネスロジックなし
- データ取得なし
- テスト容易（props を渡すだけでテスト可能）

```tsx
// features/books/components/book-table.tsx
interface BookTableProps {
  readonly data: BookListDto;
}

export function BookTable({ data }: BookTableProps) {
  return (/* JSX */);
}
```

### 3. features/\*/hooks/ = ロジック層

#### queryOptions ファクトリ

`queryOptions` を関数として定義し、loader と コンポーネント間で共有する。

```tsx
// features/books/hooks/use-book-queries.ts
export function bookListQueryOptions() {
  return queryOptions({
    queryKey: ["books"],
    queryFn: () => listBooks(),
  });
}
```

**共有のメリット**:
- loader（SSR）: `queryClient.ensureQueryData(bookListQueryOptions())`
- component（クライアント）: `useSuspenseQuery(bookListQueryOptions())`
- 同じクエリキー・クエリ関数を使うため、SSR のキャッシュがクライアントで即座にヒットする

#### mutation hooks

副作用（API 呼び出し）とキャッシュ無効化をカプセル化する。

```tsx
// features/books/hooks/use-register-book.ts
export function useRegisterBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => registerBook({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["books"] });
      navigate({ to: "/books" });
    },
  });
}
```

## データフロー

### 読み取り（Query）

```
[SSR]
Route loader
  → queryClient.ensureQueryData(bookListQueryOptions())
    → createServerFn がサーバー側で実行
    → QueryClient にキャッシュ
  → setupRouterSsrQueryIntegration が自動で dehydrate

[クライアント]
  → setupRouterSsrQueryIntegration が自動で hydrate
  → useSuspenseQuery(bookListQueryOptions())
    → キャッシュヒット（再フェッチなし）
  → Presenter コンポーネントに props 渡し
```

### 書き込み（Mutation）

```
[クライアント]
BookForm Presenter
  → onSubmit コールバック
  → useRegisterBook mutation hook
    → registerBook createServerFn（サーバー側で実行）
    → onSuccess: invalidateQueries(["books"])
    → navigate("/books")
```

## SSR 統合の仕組み

### router.tsx

```tsx
const queryClient = createQueryClient();
const router = createRouter({
  routeTree,
  context: { queryClient },  // 全ルートの loader で利用可能
});
setupRouterSsrQueryIntegration({router, queryClient});  // dehydrate/hydrate 自動化
```

### __root.tsx

```tsx
// createRootRouteWithContext で context 型を定義
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  shellComponent: RootDocument,
});

// shellComponent 内で QueryClientProvider をラップ
function RootDocument({ children }) {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

## 新しいページの追加手順

1. **queryOptions を定義** — `features/<domain>/hooks/use-<domain>-queries.ts`
2. **Presenter を作成** — `features/<domain>/components/<component-name>.tsx`
3. **（mutation がある場合）mutation hook を作成** — `features/<domain>/hooks/use-<action>.ts`
4. **ルートファイルを作成** — `routes/<path>.tsx`（loader + useSuspenseQuery + Presenter）

### 例: 新しいドメイン「authors」を追加する場合

```
features/authors/
├── components/
│   └── author-list.tsx          # Presenter
└── hooks/
    └── use-author-queries.ts    # queryOptions ファクトリ

routes/authors/
└── index.tsx                    # 薄いルートファイル
```

## 命名規約

| 種類 | 命名パターン | 例 |
|------|-------------|-----|
| queryOptions ファクトリ | `<entity><Action>QueryOptions` | `bookListQueryOptions()` |
| mutation hook | `use<Action><Entity>` | `useRegisterBook()` |
| Presenter コンポーネント | `<Entity><View>` | `BookTable`, `BookDetailCard` |
| ルートファイル | TanStack Router の規約に従う | `index.tsx`, `$bookId.tsx` |
