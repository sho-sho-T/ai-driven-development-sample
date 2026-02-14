/**
 * 書籍クエリの queryOptions ファクトリ。
 *
 * queryOptions を関数として定義することで、
 * Route の loader（SSR プリフェッチ）とコンポーネント（useSuspenseQuery）の
 * 両方で同じクエリキー・クエリ関数を共有できる。
 *
 * データフロー:
 *   loader → queryClient.ensureQueryData(bookListQueryOptions())  // SSR
 *   component → useSuspenseQuery(bookListQueryOptions())           // クライアント（キャッシュヒット）
 */
import { queryOptions } from "@tanstack/react-query";
import { getBookById, listBooks } from "../../../server/catalog-server-fns.ts";

/** 書籍一覧取得の queryOptions */
export function bookListQueryOptions() {
	return queryOptions({
		queryKey: ["books"],
		queryFn: () => listBooks(),
	});
}

/** 書籍詳細取得の queryOptions（bookId でキャッシュキーを分離） */
export function bookDetailQueryOptions(bookId: string) {
	return queryOptions({
		queryKey: ["books", bookId],
		queryFn: () => getBookById({ data: bookId }),
	});
}
