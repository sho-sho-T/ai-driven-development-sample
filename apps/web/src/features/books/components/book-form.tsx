/**
 * 書籍登録フォーム — Presenter コンポーネント。
 *
 * 純粋な props → JSX のコンポーネントで、API 呼び出しを直接行わない。
 * onSubmit コールバックでフォームデータを親（ルートファイル）に委譲し、
 * 親側の mutation hook が実際の登録処理を行う。
 *
 * error / isPending は mutation の状態を受け取り、UI に反映する。
 */
import { useNavigate } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BookFormProps {
	readonly error: string | null;
	readonly isPending: boolean;
	readonly onSubmit: (data: {
		isbn: string;
		title: string;
		author: string;
		publisher?: string;
		publishedYear?: number;
	}) => void;
}

export function BookForm({ error, isPending, onSubmit }: BookFormProps) {
	const navigate = useNavigate();

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const isbn = formData.get("isbn") as string;
		const title = formData.get("title") as string;
		const author = formData.get("author") as string;
		const publisher = (formData.get("publisher") as string) || undefined;
		const publishedYearStr = formData.get("publishedYear") as string;
		const publishedYear = publishedYearStr
			? Number.parseInt(publishedYearStr, 10)
			: undefined;

		onSubmit({ isbn, title, author, publisher, publishedYear });
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
							<Button type="submit" disabled={isPending}>
								{isPending ? "Registering..." : "Register Book"}
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
