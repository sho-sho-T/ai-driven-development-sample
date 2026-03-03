import type { AppError } from "@shared-kernel/public";
import type { ResultAsync } from "neverthrow";
import type { Library } from "../models/library.ts";

export interface LibraryRepository {
	save(library: Library): ResultAsync<void, AppError>;
	findAll(): ResultAsync<ReadonlyArray<Library>, AppError>;
	findById(id: string): ResultAsync<Library | null, AppError>;
}
