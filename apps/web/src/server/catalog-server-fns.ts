/**
 * catalog コンテキストの Server Function 定義。
 *
 * TanStack Start の createServerFn を使い、
 * クライアント → サーバーのブリッジを構築する。
 *
 * 各 Server Function は:
 * 1. 入力を受け取る
 * 2. DI コンテナからバスを取得
 * 3. Bus.execute でハンドラーにディスパッチ
 * 4. Result を unwrap してクライアントに返す
 */
import { createServerFn } from "@tanstack/react-start";
import type { BookDto, BookListDto } from "@contracts/catalog-public";
import {
	getCatalogCommandBus,
	getCatalogQueryBus,
	getExecutionContext,
} from "./di/configure.ts";

/** 書籍一覧取得 */
export const listBooks = createServerFn({ method: "GET" }).handler(
	async (): Promise<BookListDto> => {
		const bus = getCatalogQueryBus();
		const context = getExecutionContext();
		const result = await bus.execute<BookListDto>(
			{ type: "catalog.listBooks" },
			context,
		);

		if (result.isOk()) {
			return result.value;
		}
		throw new Error(result.error.message);
	},
);

/** 書籍詳細取得 */
export const getBookById = createServerFn({ method: "GET" })
	.inputValidator((d: string) => d)
	.handler(async ({ data: bookId }): Promise<BookDto> => {
		const bus = getCatalogQueryBus();
		const context = getExecutionContext();
		const result = await bus.execute<BookDto>(
			{ type: "catalog.getBookById", bookId },
			context,
		);

		if (result.isOk()) {
			return result.value;
		}
		throw new Error(result.error.message);
	});

/** 書籍登録の入力型 */
interface RegisterBookData {
	isbn: string;
	title: string;
	author: string;
	publisher?: string;
	publishedYear?: number;
}

/** 書籍登録 */
export const registerBook = createServerFn({ method: "POST" })
	.inputValidator((d: RegisterBookData) => d)
	.handler(async ({ data }): Promise<BookDto> => {
		const bus = getCatalogCommandBus();
		const context = getExecutionContext();
		const result = await bus.execute<BookDto>(
			{
				type: "catalog.registerBook",
				input: data,
			},
			context,
		);

		if (result.isOk()) {
			return result.value;
		}
		throw new Error(result.error.message);
	});
