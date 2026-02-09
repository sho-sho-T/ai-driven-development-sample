/**
 * catalog クエリバスビルダー。
 *
 * 全クエリハンドラーを登録し、Bus を生成する。
 * Composition Root（apps/web の DI 構成）から呼び出される。
 */
import {
	createBus,
	type Bus,
	type Container,
	type Message,
} from "@shared-kernel/server";
import { listBooksHandler } from "./handlers/list-books.handler.ts";
import { getBookByIdHandler } from "./handlers/get-book-by-id.handler.ts";

/** catalog クエリバスを構築する */
export function buildCatalogQueryBus(container: Container): Bus {
	return createBus({
		handlers: [
			listBooksHandler as {
				type: string;
				factory: (c: Container) => (msg: Message, ctx: never) => never;
			},
			getBookByIdHandler as {
				type: string;
				factory: (c: Container) => (msg: Message, ctx: never) => never;
			},
		],
		container,
	});
}
