import type {
	LibraryQueryService,
	LibraryReadModel,
} from "@modules/library-read";
import { getDb, libraries } from "@platform/db";
import { KernelErrors } from "@shared-kernel/public";
import { ResultAsync } from "neverthrow";

export class DrizzleLibraryQueryService implements LibraryQueryService {
	findAll() {
		return ResultAsync.fromPromise(
			getDb()
				.select()
				.from(libraries)
				.then(
					(rows) =>
						rows.map((row) => ({
							id: row.id,
							name: row.name,
							email: row.email,
							authenticationStatus: row.authenticationStatus,
						})) as ReadonlyArray<LibraryReadModel>,
				),
			(error) =>
				KernelErrors.DEPENDENCY_ERROR.create(
					{},
					{ cause: error instanceof Error ? error : new Error(String(error)) },
				),
		);
	}
}
