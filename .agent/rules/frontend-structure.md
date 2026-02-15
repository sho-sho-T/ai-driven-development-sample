# Frontend Structure & Naming

## Directory Layout

```
apps/web/src/
├── routes/                          # 薄いルートファイル（file-based routing）
│   ├── __root.tsx                   # QueryClient を context 経由で提供
│   └── <domain>/
│       ├── index.tsx                # loader + presenter 呼び出しのみ
│       ├── new.tsx                  # mutation hook + form presenter 呼び出しのみ
│       └── $<entityId>.tsx          # loader + presenter 呼び出しのみ
├── features/                        # ドメイン別 UI
│   └── <domain>/
│       ├── components/              # Presenter コンポーネント（純粋な props → JSX）
│       └── hooks/                   # queryOptions ファクトリ + mutation hooks
├── server/                          # createServerFn 定義
│   ├── <context>-server-fns.ts      # コンテキスト別 Server Function
│   └── di/configure.ts              # DI コンテナ設定
├── components/ui/                   # shadcn/ui コンポーネント
├── lib/
│   ├── utils.ts                     # ユーティリティ
│   └── query-client.ts              # QueryClient ファクトリ
└── router.tsx                       # SSR Query 統合設定
```

## Naming Conventions

| 種類 | パターン | 例 |
|------|---------|-----|
| queryOptions ファクトリ | `<entity><Action>QueryOptions` | `bookListQueryOptions()` |
| mutation hook | `use<Action><Entity>` | `useRegisterBook()` |
| Presenter コンポーネント | `<Entity><View>` | `BookTable`, `BookDetailCard` |
| ルートファイル | TanStack Router 規約 | `index.tsx`, `$bookId.tsx` |
| hooks ファイル | `use-<domain>-queries.ts` / `use-<action>.ts` | `use-book-queries.ts`, `use-register-book.ts` |
| server function ファイル | `<context>-server-fns.ts` | `catalog-server-fns.ts` |

## New Page Addition Procedure

1. **queryOptions を定義** — `features/<domain>/hooks/use-<domain>-queries.ts`
2. **Presenter を作成** — `features/<domain>/components/<component-name>.tsx`
3. **（mutation がある場合）mutation hook を作成** — `features/<domain>/hooks/use-<action>.ts`
4. **ルートファイルを作成** — `routes/<path>.tsx`（loader + useSuspenseQuery + Presenter）

## Rules

- ルートファイルにはデータ取得の接続コードのみ置く（UI ロジックは features/ に委譲）
- Presenter コンポーネントにビジネスロジック・データ取得を含めない
- shadcn/ui コンポーネントは `components/ui/` に配置する
- features/ 内のドメインフォルダはバックエンドのコンテキスト名と対応させる
