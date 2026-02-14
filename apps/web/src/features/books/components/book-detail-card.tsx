/**
 * 書籍詳細カード — Presenter コンポーネント。
 *
 * 純粋な props → JSX のコンポーネントで、データ取得やビジネスロジックを持たない。
 * BookDto を受け取り、詳細情報をカード形式で表示する。
 */
import type { BookDto } from "@contracts/catalog-public";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function DetailRow({
	label,
	children,
}: {
	readonly label: string;
	readonly children: React.ReactNode;
}) {
	return (
		<div className="flex py-3">
			<dt className="w-40 shrink-0 text-sm font-medium text-muted-foreground">
				{label}
			</dt>
			<dd>{children}</dd>
		</div>
	);
}

interface BookDetailCardProps {
	readonly book: BookDto;
}

export function BookDetailCard({ book }: BookDetailCardProps) {
	return (
		<div className="mx-auto max-w-xl">
			<Button variant="ghost" asChild className="mb-4">
				<Link to="/books">&larr; Back to list</Link>
			</Button>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-2xl">{book.title}</CardTitle>
						<Badge
							variant={book.status === "available" ? "default" : "secondary"}
						>
							{book.status}
						</Badge>
					</div>
				</CardHeader>
				<CardContent>
					<dl>
						<DetailRow label="ID">{book.id}</DetailRow>
						<Separator />
						<DetailRow label="ISBN">{book.isbn}</DetailRow>
						<Separator />
						<DetailRow label="Title">{book.title}</DetailRow>
						<Separator />
						<DetailRow label="Author">{book.author}</DetailRow>
						<Separator />
						<DetailRow label="Publisher">{book.publisher || "-"}</DetailRow>
						<Separator />
						<DetailRow label="Published Year">
							{book.publishedYear ?? "-"}
						</DetailRow>
					</dl>
				</CardContent>
			</Card>
		</div>
	);
}
