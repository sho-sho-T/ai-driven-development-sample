import type { Library, LibraryRepository } from "@modules/library-write";
import { getDb, libraries } from "@platform/db";
import { KernelErrors } from "@shared-kernel/public";
import { eq } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

export class DrizzleLibraryRepository implements LibraryRepository {
	save(library: Library) {
		return ResultAsync.fromPromise(
			getDb()
				.insert(libraries)
				.values({
					id: library.id,
					name: library.name,
					email: library.email,
					authenticationStatus: library.authenticationStatus,
				})
				.onConflictDoUpdate({
					target: libraries.id,
					set: {
						name: library.name,
						email: library.email,
						authenticationStatus: library.authenticationStatus,
					},
				})
				.then(() => undefined),
			(error) =>
				KernelErrors.DEPENDENCY_ERROR.create(
					{},
					{ cause: error instanceof Error ? error : new Error(String(error)) },
				),
		);
	}

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
							authenticationStatus: row.authenticationStatus as
								| "unauthenticated"
								| "authenticated",
						})) as ReadonlyArray<Library>,
				),
			(error) =>
				KernelErrors.DEPENDENCY_ERROR.create(
					{},
					{ cause: error instanceof Error ? error : new Error(String(error)) },
				),
		);
	}

	findById(id: string) {
		return ResultAsync.fromPromise(
			getDb()
				.select()
				.from(libraries)
				.where(eq(libraries.id, id))
				.then((rows) => {
					if (rows.length === 0) return null;
					const row = rows[0]!;
					return {
						id: row.id,
						name: row.name,
						email: row.email,
						authenticationStatus: row.authenticationStatus as
							| "unauthenticated"
							| "authenticated",
					} as Library;
				}),
			(error) =>
				KernelErrors.DEPENDENCY_ERROR.create(
					{},
					{ cause: error instanceof Error ? error : new Error(String(error)) },
				),
		);
	}
}
