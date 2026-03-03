import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LibraryTable } from "../../features/libraries/components/library-table.tsx";
import { libraryListQueryOptions } from "../../features/libraries/hooks/use-library-queries.ts";
import { useVerifyLibraryEmail } from "../../features/libraries/hooks/use-verify-library-email.ts";

export const Route = createFileRoute("/libraries/")({
	component: LibrariesIndexPage,
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(libraryListQueryOptions()),
});

function LibrariesIndexPage() {
	const { data } = useSuspenseQuery(libraryListQueryOptions());
	const verifyMutation = useVerifyLibraryEmail();

	return (
		<div>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "1rem",
				}}
			>
				<div />
				<Link to="/libraries/new" className="register-link">
					Register New Library
				</Link>
			</div>
			<LibraryTable data={data} onVerify={(id) => verifyMutation.mutate(id)} />
		</div>
	);
}
