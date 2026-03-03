import { createFileRoute } from "@tanstack/react-router";
import { RegisterLibraryForm } from "../../features/libraries/components/register-library-form.tsx";
import { useRegisterLibrary } from "../../features/libraries/hooks/use-register-library.ts";

export const Route = createFileRoute("/libraries/new")({
	component: LibrariesNewPage,
});

function LibrariesNewPage() {
	const mutation = useRegisterLibrary();

	return (
		<div>
			<h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
				Register New Library
			</h1>
			<RegisterLibraryForm
				onSubmit={(data) => mutation.mutate(data)}
				isPending={mutation.isPending}
			/>
		</div>
	);
}
