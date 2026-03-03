/**
 * Drizzle ORM スキーマ定義。
 *
 * アプリケーション全体のテーブル定義を一元管理する。
 */
import { pgTable, text, integer } from "drizzle-orm/pg-core";

/** books テーブル */
export const books = pgTable("books", {
	id: text("id").primaryKey(),
	isbn: text("isbn").unique().notNull(),
	title: text("title").notNull(),
	author: text("author").notNull(),
	publisher: text("publisher").default(""),
	publishedYear: integer("published_year"),
	status: text("status").default("available"),
});

/** libraries テーブル */
export const libraries = pgTable("libraries", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull(),
	authenticationStatus: text("authentication_status")
		.notNull()
		.default("unauthenticated"),
});
