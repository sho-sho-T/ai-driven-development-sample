import { queryOptions } from "@tanstack/react-query";
import { listLibraries } from "../../../server/library-server-fns.ts";

export function libraryListQueryOptions() {
	return queryOptions({
		queryKey: ["libraries"],
		queryFn: () => listLibraries(),
	});
}
