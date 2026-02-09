/**
 * @modules/catalog-read
 *
 * catalog コンテキストの Read（読み取り）側。
 * BookReadModel、BookQueryService インターフェース、クエリハンドラーを提供する。
 */

// Models
export {
	BookReadModelSchema,
	type BookReadModel,
} from "./models/book-read-model.ts";

// Query service interface (port)
export type { BookQueryService } from "./models/book-query-service.ts";

// Query bus builder
export { buildCatalogQueryBus } from "./query-bus/bus.ts";
