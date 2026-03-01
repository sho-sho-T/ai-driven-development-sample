/**
 * RegisterLibrary コマンドハンドラー。
 *
 * 「図書館新規登録」ユースケースを実装する。
 *
 * フロー:
 * 1. 入力スキーマで Zod バリデーション
 * 2. createLibrary ドメイン関数で Library 集約を生成
 * 3. Repository に保存
 * 4. RegisterLibraryResult に変換して返却
 *
 * エラーはすべて neverthrow の Result で返す（例外をスローしない）。
 */

import {
	LibraryValidationError,
	RegisterLibraryInputSchema,
} from "@contracts/library-public";
import type { LibraryCommandHandlerDefinition } from "@contracts/library-server";
import type { LibraryId } from "@shared-kernel/public";
import { errAsync } from "neverthrow";
import { createLibrary } from "../../models/library-behaviors.ts";
import type { LibraryRepository } from "../../models/library-repository.ts";

type Deps = {
	repository: LibraryRepository;
};

export const registerLibraryHandler: LibraryCommandHandlerDefinition<
	Deps,
	"library.registerLibrary"
> = {
	factory: (deps) => (command) => {
		/** Step 1: 入力バリデーション */
		const parseResult = RegisterLibraryInputSchema.safeParse(command.input);
		if (!parseResult.success) {
			return errAsync(
				LibraryValidationError.create({
					details: parseResult.error.issues[0]!.message,
				}),
			);
		}

		/** Step 2: Library 生成 */
		const libraryResult = createLibrary(parseResult.data);
		if (libraryResult.isErr()) {
			return errAsync(libraryResult.error);
		}
		const library = libraryResult.value;

		/** Step 3: 保存 → Step 4: 結果返却 */
		return deps.repository.save(library).map(() => ({
			libraryId: library.id as LibraryId,
		}));
	},
	settings: {},
};
