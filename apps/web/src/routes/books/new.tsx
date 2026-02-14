/**
 * 書籍登録ページ（/books/new）— 薄いルートファイル。
 *
 * mutation hook（useRegisterBook）でサーバー関数の呼び出しと
 * キャッシュ無効化をカプセル化し、BookForm Presenter に
 * error / isPending / onSubmit を props として渡す。
 */
import { createFileRoute } from "@tanstack/react-router";
import { BookForm } from "../../features/books/components/book-form.tsx";
import { useRegisterBook } from "../../features/books/hooks/use-register-book.ts";

export const Route = createFileRoute("/books/new")({
	component: NewBookPage,
});

function NewBookPage() {
	const mutation = useRegisterBook();

	return (
		<BookForm
			error={mutation.error?.message ?? null}
			isPending={mutation.isPending}
			onSubmit={(data) => mutation.mutate(data)}
		/>
	);
}
