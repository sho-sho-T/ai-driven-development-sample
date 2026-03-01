/**
 * Library 集約の振る舞い（純粋関数）。
 *
 * 関数型 DDD パターンに従い、集約の状態遷移を副作用のない純粋関数で表現する。
 * - createLibrary: 名前・所在地から Library を生成（バリデーション付き）
 *
 * ルール違反時は err() を返す（例外をスローしない）。
 */

import { LibraryValidationError } from "@contracts/library-public";
import type { AppError } from "@shared-kernel/public";
import { generateId } from "@shared-kernel/public";
import { err, ok, type Result } from "neverthrow";
import { type Library, LibrarySchema } from "./library.ts";

/** 図書館生成の入力 */
interface CreateLibraryInput {
	readonly name: string;
	readonly location: string;
}

/**
 * createLibrary: 入力から Library 集約を生成する。
 *
 * - LibrarySchema で全フィールドをバリデーション
 * - ID は自動生成（ULID 風）
 */
export function createLibrary(
	input: CreateLibraryInput,
): Result<Library, AppError> {
	const libraryData = {
		id: generateId(),
		name: input.name,
		location: input.location,
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
