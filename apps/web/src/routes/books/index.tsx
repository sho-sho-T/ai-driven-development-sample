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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { listBooks } from "../../server/catalog-server-fns.ts";

export const Route = createFileRoute("/books/")({
	component: BooksIndexPage,
	loader: async () => await listBooks(),
});

function BooksIndexPage() {
	const data = Route.useLoaderData();

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle className="text-2xl">Books</CardTitle>
					<CardDescription>{data.total} book(s) registered</CardDescription>
				</div>
				<Button asChild>
					<Link to="/books/new">Register New Book</Link>
				</Button>
			</CardHeader>
			<CardContent>
				{data.total === 0 ? (
					<p className="text-muted-foreground">
						No books registered yet. Register your first book!
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Title</TableHead>
								<TableHead>Author</TableHead>
								<TableHead>ISBN</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.books.map((book) => (
								<TableRow key={book.id}>
									<TableCell>
										<Link
											to="/books/$bookId"
											params={{ bookId: book.id }}
											className="font-medium text-primary hover:underline"
										>
											{book.title}
										</Link>
									</TableCell>
									<TableCell>{book.author}</TableCell>
									<TableCell className="font-mono text-sm">
										{book.isbn}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												book.status === "available" ? "default" : "secondary"
											}
										>
											{book.status}
										</Badge>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
