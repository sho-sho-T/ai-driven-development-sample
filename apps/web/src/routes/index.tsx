import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<Card className="w-full max-w-md text-center">
				<CardHeader className="space-y-4">
					<CardTitle className="text-3xl">Library Management</CardTitle>
					<CardDescription>Manage your book catalog with ease.</CardDescription>
					<Button asChild size="lg" className="mt-4">
						<Link to="/books">Browse Books</Link>
					</Button>
				</CardHeader>
			</Card>
		</div>
	);
}
