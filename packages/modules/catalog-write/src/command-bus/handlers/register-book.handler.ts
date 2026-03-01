/**
 * RegisterBook コマンドハンドラー。
 *
 * 「書籍新規登録」ユースケースを実装する。
 *
 * フロー:
 * 1. 入力スキーマで Zod バリデーション
 * 2. ISBN 重複チェック（Repository 経由）
 * 3. createBook ドメイン関数で Book 集約を生成
 * 4. Repository に保存
 * 5. BookDto に変換して返却
 *
 * エラーはすべて neverthrow の Result で返す（例外をスローしない）。
 */
import { okAsync, errAsync } from "neverthrow";
import type { AppError } from "@shared-kernel/public";
import type { HandlerDefinition, Container } from "@shared-kernel/server";
import {
	RegisterBookInputSchema,
	type RegisterBookCommand,
	type BookDto,
	IsbnAlreadyExistsError,
	CatalogValidationError,
} from "@contracts/catalog-public";
import { BookRepositoryToken } from "@contracts/catalog-server";
import { createBook } from "../../models/book-behaviors.ts";
import type { BookRepository } from "../../repositories/book-repository.ts";

/**
 * ハンドラー定義。
 * factory: DI コンテナから BookRepository を取得してハンドラー関数を生成する。
 */
export const registerBookHandler: HandlerDefinition<
	RegisterBookCommand,
	BookDto
> = {
	type: "catalog.registerBook",
	factory: (container: Container) => {
		const repository = container.resolve(BookRepositoryToken) as BookRepository;

		return (command) => {
			/** Step 1: 入力バリデーション */
			const parseResult = RegisterBookInputSchema.safeParse(command.input);
			if (!parseResult.success) {
				return errAsync(
					CatalogValidationError.create({
						details: parseResult.error.issues[0]!.message,
					}),
				);
			}
			const input = parseResult.data;

			/** Step 2: ISBN 重複チェック → Step 3: Book 生成 → Step 4: 保存 → Step 5: DTO 返却 */
			return repository.findByIsbn(input.isbn).andThen((existing) => {
				if (existing !== null) {
					return errAsync<BookDto, AppError>(
						IsbnAlreadyExistsError.create({ isbn: input.isbn }),
					);
				}

				const bookResult = createBook(input);
				if (bookResult.isErr()) {
					return errAsync<BookDto, AppError>(bookResult.error);
				}
				const book = bookResult.value;

				return repository.save(book).map((): BookDto => {
					return {
						id: book.id,
						isbn: book.isbn,
						title: book.title,
						author: book.author,
						publisher: book.publisher,
						publishedYear: book.publishedYear,
						status: book.status,
					};
				});
			});
		};
	},
};
