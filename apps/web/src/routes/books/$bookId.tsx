/**
 * 書籍詳細ページ（/books/:bookId）— 薄いルートファイル。
 *
 * URL パラメータの bookId を使い、loader で書籍データをプリフェッチ。
 * コンポーネントでは useSuspenseQuery でキャッシュ済みデータを取得し、
 * BookDetailCard Presenter に描画を委譲する。
 */
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BookDetailCard } from "../../features/books/components/book-detail-card.tsx";
import { bookDetailQueryOptions } from "../../features/books/hooks/use-book-queries.ts";

export const Route = createFileRoute("/books/$bookId")({
	component: BookDetailPage,
	// SSR: bookId に基づいて書籍データをプリフェッチ
	loader: ({ context: { queryClient }, params }) =>
		queryClient.ensureQueryData(bookDetailQueryOptions(params.bookId)),
});

function BookDetailPage() {
	const { bookId } = Route.useParams();
	// クライアント: SSR でキャッシュ済みのデータを即座に利用
	const { data: book } = useSuspenseQuery(bookDetailQueryOptions(bookId));
	return <BookDetailCard book={book} />;
}
