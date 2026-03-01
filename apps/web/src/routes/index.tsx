import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<h1 className="text-3xl font-bold">Welcome</h1>
		</div>
	);
}
