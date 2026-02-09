/**
 * 書籍詳細ページ（/books/:bookId）。
 *
 * URL パラメータの bookId を使い、
 * Server Function 経由で catalog.getBookById クエリを実行する。
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { getBookById } from "../../server/catalog-server-fns.ts";

export const Route = createFileRoute("/books/$bookId")({
	component: BookDetailPage,
	loader: async ({ params }) => await getBookById({ data: params.bookId }),
});

function BookDetailPage() {
	const book = Route.useLoaderData();

	return (
		<div className="mx-auto max-w-xl p-4">
			<Link
				to="/books"
				className="mb-4 inline-block text-blue-600 hover:underline"
			>
				&larr; Back to list
			</Link>

			<h1 className="mb-4 text-2xl font-bold">{book.title}</h1>

			<table className="w-full border-collapse">
				<tbody>
					<tr className="border-b border-gray-200">
						<th className="w-40 p-3 text-left font-bold text-gray-500">ID</th>
						<td className="p-3">{book.id}</td>
					</tr>
					<tr className="border-b border-gray-200">
						<th className="w-40 p-3 text-left font-bold text-gray-500">ISBN</th>
						<td className="p-3">{book.isbn}</td>
					</tr>
					<tr className="border-b border-gray-200">
						<th className="w-40 p-3 text-left font-bold text-gray-500">
							Title
						</th>
						<td className="p-3">{book.title}</td>
					</tr>
					<tr className="border-b border-gray-200">
						<th className="w-40 p-3 text-left font-bold text-gray-500">
							Author
						</th>
						<td className="p-3">{book.author}</td>
					</tr>
					<tr className="border-b border-gray-200">
						<th className="w-40 p-3 text-left font-bold text-gray-500">
							Publisher
						</th>
						<td className="p-3">{book.publisher || "-"}</td>
					</tr>
					<tr className="border-b border-gray-200">
						<th className="w-40 p-3 text-left font-bold text-gray-500">
							Published Year
						</th>
						<td className="p-3">{book.publishedYear ?? "-"}</td>
					</tr>
					<tr className="border-b border-gray-200">
						<th className="w-40 p-3 text-left font-bold text-gray-500">
							Status
						</th>
						<td className="p-3">
							<span
								className={`rounded px-2 py-0.5 text-sm ${
									book.status === "available"
										? "bg-green-100 text-green-800"
										: "bg-orange-100 text-orange-800"
								}`}
							>
								{book.status}
							</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
}
