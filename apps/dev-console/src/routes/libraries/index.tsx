import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LibraryTable } from "../../features/libraries/components/library-table.tsx";
import { libraryListQueryOptions } from "../../features/libraries/hooks/use-library-queries.ts";

export const Route = createFileRoute("/libraries/")({
	component: LibrariesIndexPage,
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(libraryListQueryOptions()),
});

function LibrariesIndexPage() {
	const { data } = useSuspenseQuery(libraryListQueryOptions());
	return <LibraryTable data={data} />;
}
