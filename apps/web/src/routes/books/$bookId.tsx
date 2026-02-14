/**
 * 書籍詳細ページ（/books/:bookId）。
 *
 * URL パラメータの bookId を使い、
 * Server Function 経由で catalog.getBookById クエリを実行する。
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getBookById } from "../../server/catalog-server-fns.ts";

export const Route = createFileRoute("/books/$bookId")({
	component: BookDetailPage,
	loader: async ({ params }) => await getBookById({ data: params.bookId }),
});

function DetailRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
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

function BookDetailPage() {
	const book = Route.useLoaderData();

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
