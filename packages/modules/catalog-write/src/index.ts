/**
 * @modules/catalog-write
 *
 * catalog コンテキストの Write（書き込み）側。
 * Book 集約、ドメイン関数、Repository インターフェース、コマンドハンドラーを提供する。
 */

// Models
export { BookSchema, IsbnSchema, BookStatusSchema } from "./models/book.ts";
export type { Book, Isbn, BookStatus } from "./models/book.ts";
export { createBook, changeBookStatus } from "./models/book-behaviors.ts";

// Repository interface (port)
export type { BookRepository } from "./repositories/book-repository.ts";
