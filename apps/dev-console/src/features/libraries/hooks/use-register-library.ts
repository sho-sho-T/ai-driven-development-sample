import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { registerLibrary } from "../../../server/library-server-fns.ts";

export function useRegisterLibrary() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	return useMutation({
		mutationFn: (input: { name: string; email: string }) =>
			registerLibrary({ data: input }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["libraries"] });
			navigate({ to: "/libraries" });
		},
	});
}
