/**
 * catalog コマンドバスビルダー。
 *
 * 全コマンドハンドラーを登録し、ミドルウェアを適用した Bus を生成する。
 * Composition Root（apps/web の DI 構成）から呼び出される。
 */
import {
	createBus,
	type Bus,
	type Container,
	type Message,
} from "@shared-kernel/server";
import { registerBookHandler } from "./handlers/register-book.handler.ts";

/** catalog コマンドバスを構築する */
export function buildCatalogCommandBus(container: Container): Bus {
	return createBus({
		handlers: [
			registerBookHandler as {
				type: string;
				factory: (c: Container) => (msg: Message, ctx: never) => never;
			},
		],
		container,
	});
}
