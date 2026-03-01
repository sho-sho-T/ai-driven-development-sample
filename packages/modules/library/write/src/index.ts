/**
 * @modules/library-write
 *
 * library コンテキストの Write（書き込み）側。
 * Library 集約、ドメイン関数、Repository インターフェース、コマンドバスを提供する。
 */

// Models
export { LibrarySchema } from "./models/library.ts";
export type { Library } from "./models/library.ts";
export { createLibrary } from "./models/library-behaviors.ts";

// Repository interface (port)
export type { LibraryRepository } from "./models/library-repository.ts";

// CommandBus
export {
	LibraryCommandBusBuilder,
	buildLibraryCommandBus,
} from "./command-bus/index.ts";
