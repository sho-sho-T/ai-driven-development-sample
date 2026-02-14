/**
 * 書籍登録フォームページ（/books/new）。
 *
 * フォーム入力 → Server Function 経由で catalog.registerBook コマンドを実行。
 * 登録成功後は書籍一覧ページにリダイレクトする。
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
		<div className="mx-auto max-w-xl">
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">Register New Book</CardTitle>
				</CardHeader>
				<CardContent>
					{error && (
						<Alert variant="destructive" className="mb-6">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="isbn">ISBN (13 digits) *</Label>
							<Input
								id="isbn"
								name="isbn"
								type="text"
								required
								pattern="\d{13}"
								placeholder="9784101010014"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="title">Title *</Label>
							<Input
								id="title"
								name="title"
								type="text"
								required
								placeholder="Book title"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="author">Author *</Label>
							<Input
								id="author"
								name="author"
								type="text"
								required
								placeholder="Author name"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="publisher">Publisher</Label>
							<Input
								id="publisher"
								name="publisher"
								type="text"
								placeholder="Publisher name"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="publishedYear">Published Year</Label>
							<Input
								id="publishedYear"
								name="publishedYear"
								type="number"
								placeholder="2024"
							/>
						</div>

						<div className="flex gap-2 pt-4">
							<Button type="submit" disabled={submitting}>
								{submitting ? "Registering..." : "Register Book"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate({ to: "/books" })}
							>
								Cancel
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
