/**
 * library コンテキストの DI トークン定義。
 *
 * Composition Root でインフラ実装を登録し、
 * ハンドラーで resolve するための型付きトークン。
 */
import { createToken } from "@shared-kernel/server";
import type { LibraryCommandBus } from "./library-commands.ts";
import type { LibraryQueryBus } from "./library-queries.ts";

/**
 * LibraryRepository トークン。
 * Write 側でドメインモデルの永続化に使用する。
 * 型は modules/library-write で定義されるインターフェース。
 */
export const LibraryRepositoryToken = createToken<unknown>("LibraryRepository");

/**
 * LibraryQueryService トークン。
 * Read 側で ReadModel の取得に使用する。
 * 型は modules/library-read で定義されるインターフェース。
 */
export const LibraryQueryServiceToken = createToken<unknown>(
	"LibraryQueryService",
);

/** library コマンドバスのトークン */
export const LibraryCommandBusToken =
	createToken<LibraryCommandBus>("LibraryCommandBus");

/** library クエリバスのトークン */
export const LibraryQueryBusToken =
	createToken<LibraryQueryBus>("LibraryQueryBus");
