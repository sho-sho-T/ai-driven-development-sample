/**
 * 書籍一覧ページ（/books）。
 *
 * Server Function 経由で catalog.listBooks クエリを実行し、
 * 書籍の一覧をテーブル形式で表示する。
 *
 * - loader: SSR 時にサーバー側でデータ取得
 * - component: React コンポーネントで一覧を描画
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { listBooks } from "../../server/catalog-server-fns.ts";

export const Route = createFileRoute("/books/")({
	component: BooksIndexPage,
	loader: async () => await listBooks(),
});

function BooksIndexPage() {
	const data = Route.useLoaderData();

	return (
		<div className="mx-auto max-w-4xl p-4">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="m-0 text-2xl font-bold">Books</h1>
				<Link
					to="/books/new"
					className="inline-block rounded bg-blue-600 px-4 py-2 text-white no-underline hover:bg-blue-700"
				>
					Register New Book
				</Link>
			</div>

			{data.total === 0 ? (
				<p className="text-gray-500">
					No books registered yet. Register your first book!
				</p>
			) : (
				<table className="w-full border-collapse border border-gray-300">
					<thead>
						<tr className="bg-gray-100">
							<th className="border-b-2 border-gray-300 p-3 text-left">
								Title
							</th>
							<th className="border-b-2 border-gray-300 p-3 text-left">
								Author
							</th>
							<th className="border-b-2 border-gray-300 p-3 text-left">ISBN</th>
							<th className="border-b-2 border-gray-300 p-3 text-left">
								Status
							</th>
						</tr>
					</thead>
					<tbody>
						{data.books.map((book) => (
							<tr key={book.id}>
								<td className="border-b border-gray-200 p-3">
									<Link
										to="/books/$bookId"
										params={{ bookId: book.id }}
										className="text-blue-600 hover:underline"
									>
										{book.title}
									</Link>
								</td>
								<td className="border-b border-gray-200 p-3">{book.author}</td>
								<td className="border-b border-gray-200 p-3">{book.isbn}</td>
								<td className="border-b border-gray-200 p-3">
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
						))}
					</tbody>
				</table>
			)}

			<p className="mt-4 text-sm text-gray-400">Total: {data.total} book(s)</p>
		</div>
	);
}
