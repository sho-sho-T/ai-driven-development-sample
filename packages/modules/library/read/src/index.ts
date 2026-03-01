/**
 * @modules/library-read
 *
 * library コンテキストの Read（読み取り）側。
 * LibraryReadModel、LibraryQueryService インターフェース、クエリバスを提供する。
 */

// Query service interface (port)
export type { LibraryQueryService } from "./models/library-query-service.ts";
// Models
export {
	type LibraryReadModel,
	LibraryReadModelSchema,
} from "./models/library-read-model.ts";

// QueryBus
export {
	buildLibraryQueryBus,
	LibraryQueryBusBuilder,
} from "./query-bus/index.ts";
