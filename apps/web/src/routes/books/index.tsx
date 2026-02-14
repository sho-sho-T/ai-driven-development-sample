/**
 * 書籍一覧ページ（/books）— 薄いルートファイル。
 *
 * TanStack Start ではルートファイルが Next.js の Container Component の役割を果たす。
 * - loader: SSR 時に queryClient.ensureQueryData で事前取得
 * - component: useSuspenseQuery でキャッシュ済みデータを取得し Presenter に渡す
 *
 * ルートファイルにはデータ取得の接続コードのみを置き、
 * UI の描画は features/books/components/ の Presenter に委譲する。
 */
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BookTable } from "../../features/books/components/book-table.tsx";
import { bookListQueryOptions } from "../../features/books/hooks/use-book-queries.ts";

export const Route = createFileRoute("/books/")({
	component: BooksIndexPage,
	// SSR: queryClient に書籍一覧をプリフェッチ
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(bookListQueryOptions()),
});

function BooksIndexPage() {
	// クライアント: SSR でキャッシュ済みのデータを即座に利用（再フェッチなし）
	const { data } = useSuspenseQuery(bookListQueryOptions());
	return <BookTable data={data} />;
}
