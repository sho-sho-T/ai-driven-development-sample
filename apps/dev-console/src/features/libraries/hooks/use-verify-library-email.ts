import { useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyLibraryEmail } from "../../../server/library-server-fns.ts";

export function useVerifyLibraryEmail() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (libraryId: string) =>
			verifyLibraryEmail({ data: { libraryId } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["libraries"] });
		},
	});
}
