/**
 * catalog コンテキストの DI トークン定義。
 *
 * Composition Root でインフラ実装を登録し、
 * ハンドラーで resolve するための型付きトークン。
 */
import { createToken } from "@shared-kernel/server";
import type {
	CatalogCommandBus,
	CatalogQueryBus,
} from "./catalog-bus-types.ts";

/**
 * BookRepository トークン。
 * Write 側でドメインモデルの永続化に使用する。
 * 型は modules/catalog-write で定義されるインターフェース。
 */
export const BookRepositoryToken = createToken<unknown>("BookRepository");

/**
 * BookQueryService トークン。
 * Read 側で ReadModel の取得に使用する。
 * 型は modules/catalog-read で定義されるインターフェース。
 */
export const BookQueryServiceToken = createToken<unknown>("BookQueryService");

/** catalog コマンドバスのトークン */
export const CatalogCommandBusToken =
	createToken<CatalogCommandBus>("CatalogCommandBus");

/** catalog クエリバスのトークン */
export const CatalogQueryBusToken =
	createToken<CatalogQueryBus>("CatalogQueryBus");
