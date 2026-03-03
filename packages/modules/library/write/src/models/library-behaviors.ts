import {
	LibraryAlreadyVerifiedError,
	LibraryValidationError,
} from "@contracts/library-public";
import type { AppError } from "@shared-kernel/public";
import { generateId } from "@shared-kernel/public";
import { err, ok, type Result } from "neverthrow";
import { type Library, LibrarySchema } from "./library.ts";

/** 図書館生成の入力 */
interface CreateLibraryInput {
	readonly name: string;
	readonly email: string;
}

/**
 * createLibrary: 入力から Library 集約を生成する。
 *
 * - LibrarySchema で全フィールドをバリデーション
 * - ID は自動生成
 * - authenticationStatus は「unauthenticated」固定
 */
export function createLibrary(
	input: CreateLibraryInput,
): Result<Library, AppError> {
	const libraryData = {
		id: generateId(),
		name: input.name,
		email: input.email,
		authenticationStatus: "unauthenticated" as const,
	};

	const parseResult = LibrarySchema.safeParse(libraryData);
	if (!parseResult.success) {
		return err(
			LibraryValidationError.create({
				details: parseResult.error.issues[0]!.message,
			}),
		);
	}

	return ok(parseResult.data);
}

/**
 * verifyEmail: 図書館のメール認証ステータスを「authenticated」に更新する。
 *
 * - すでに認証済みの場合はエラーを返す
 */
export function verifyEmail(library: Library): Result<Library, AppError> {
	if (library.authenticationStatus === "authenticated") {
		return err(
			LibraryAlreadyVerifiedError.create({
				id: library.id,
			}),
		);
	}

	return ok({
		...library,
		authenticationStatus: "authenticated" as const,
	});
}
