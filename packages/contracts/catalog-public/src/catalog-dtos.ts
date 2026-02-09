/**
 * catalog コンテキストの DTO（Data Transfer Object）定義。
 *
 * ドメインモデルの外部公開用の型。
 * API レスポンスや UI 表示で使用する。機密データは含めない。
 */
import { z } from "zod";

/** 書籍 DTO スキーマ */
export const BookDtoSchema = z.object({
	id: z.string(),
	isbn: z.string(),
	title: z.string(),
	author: z.string(),
	publisher: z.string(),
	publishedYear: z.number().optional(),
	status: z.enum(["available", "onLoan"]),
});

export type BookDto = z.infer<typeof BookDtoSchema>;

/** 書籍一覧 DTO */
export interface BookListDto {
	readonly books: ReadonlyArray<BookDto>;
	readonly total: number;
}
