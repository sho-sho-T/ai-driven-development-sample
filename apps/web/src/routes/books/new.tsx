/**
 * 書籍登録フォームページ（/books/new）。
 *
 * フォーム入力 → Server Function 経由で catalog.registerBook コマンドを実行。
 * 登録成功後は書籍一覧ページにリダイレクトする。
 */
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { registerBook } from "../../server/catalog-server-fns.ts";

export const Route = createFileRoute("/books/new")({
	component: NewBookPage,
});

function NewBookPage() {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		setSubmitting(true);

		const formData = new FormData(e.currentTarget);
		const isbn = formData.get("isbn") as string;
		const title = formData.get("title") as string;
		const author = formData.get("author") as string;
		const publisher = (formData.get("publisher") as string) || undefined;
		const publishedYearStr = formData.get("publishedYear") as string;
		const publishedYear = publishedYearStr
			? Number.parseInt(publishedYearStr, 10)
			: undefined;

		try {
			await registerBook({
				data: { isbn, title, author, publisher, publishedYear },
			});
			navigate({ to: "/books" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Registration failed");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="mx-auto max-w-xl p-4">
			<h1 className="mb-4 text-2xl font-bold">Register New Book</h1>

			{error && (
				<div className="mb-4 rounded border border-red-300 bg-red-100 p-3 text-red-800">
					{error}
				</div>
			)}

			<form onSubmit={handleSubmit}>
				<div className="mb-4">
					<label htmlFor="isbn" className="mb-1 block text-sm font-bold">
						ISBN (13 digits) *
					</label>
					<input
						id="isbn"
						name="isbn"
						type="text"
						required
						pattern="\d{13}"
						placeholder="9784101010014"
						className="w-full rounded border border-gray-300 p-2 text-base"
					/>
				</div>

				<div className="mb-4">
					<label htmlFor="title" className="mb-1 block text-sm font-bold">
						Title *
					</label>
					<input
						id="title"
						name="title"
						type="text"
						required
						placeholder="Book title"
						className="w-full rounded border border-gray-300 p-2 text-base"
					/>
				</div>

				<div className="mb-4">
					<label htmlFor="author" className="mb-1 block text-sm font-bold">
						Author *
					</label>
					<input
						id="author"
						name="author"
						type="text"
						required
						placeholder="Author name"
						className="w-full rounded border border-gray-300 p-2 text-base"
					/>
				</div>

				<div className="mb-4">
					<label htmlFor="publisher" className="mb-1 block text-sm font-bold">
						Publisher
					</label>
					<input
						id="publisher"
						name="publisher"
						type="text"
						placeholder="Publisher name"
						className="w-full rounded border border-gray-300 p-2 text-base"
					/>
				</div>

				<div className="mb-4">
					<label
						htmlFor="publishedYear"
						className="mb-1 block text-sm font-bold"
					>
						Published Year
					</label>
					<input
						id="publishedYear"
						name="publishedYear"
						type="number"
						placeholder="2024"
						className="w-full rounded border border-gray-300 p-2 text-base"
					/>
				</div>

				<div className="mt-6 flex gap-2">
					<button
						type="submit"
						disabled={submitting}
						className="cursor-pointer rounded bg-blue-600 px-6 py-2 text-base text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{submitting ? "Registering..." : "Register Book"}
					</button>
					<button
						type="button"
						onClick={() => navigate({ to: "/books" })}
						className="cursor-pointer rounded border border-gray-300 bg-gray-100 px-6 py-2 text-base text-gray-700 hover:bg-gray-200"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}
