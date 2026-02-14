/**
 * 書籍一覧テーブル — Presenter コンポーネント。
 *
 * 純粋な props → JSX のコンポーネントで、データ取得やビジネスロジックを持たない。
 * ルートファイルから useSuspenseQuery で取得したデータを props として受け取る。
 */
import type { BookDto, BookListDto } from "@contracts/catalog-public";
import { Link } from "@tanstack/react-router";
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

interface BookTableProps {
	readonly data: BookListDto;
}

function BookRow({ book }: { readonly book: BookDto }) {
	return (
		<TableRow>
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
			<TableCell className="font-mono text-sm">{book.isbn}</TableCell>
			<TableCell>
				<Badge variant={book.status === "available" ? "default" : "secondary"}>
					{book.status}
				</Badge>
			</TableCell>
		</TableRow>
	);
}

export function BookTable({ data }: BookTableProps) {
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
								<BookRow key={book.id} book={book} />
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
