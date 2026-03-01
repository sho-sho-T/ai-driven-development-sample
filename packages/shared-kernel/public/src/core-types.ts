/**
 * コアドメイン型定義。
 *
 * 各 Bounded Context の Aggregate ID を Zod スキーマとして定義する。
 * UUID v4 形式を使用し、ブランド型で型安全性を保証する。
 */

import { z } from "zod";

/** BookId: 書籍の一意識別子 */
export const BookIdSchema = z.uuid().brand("BookId");
export type BookId = z.infer<typeof BookIdSchema>;

/** MemberId: 利用者の一意識別子 */
export const MemberIdSchema = z.uuid().brand("MemberId");
export type MemberId = z.infer<typeof MemberIdSchema>;

/** LoanId: 貸出の一意識別子 */
export const LoanIdSchema = z.uuid().brand("LoanId");
export type LoanId = z.infer<typeof LoanIdSchema>;

/** LibraryId: 図書館（テナント）の一意識別子 */
export const LibraryIdSchema = z.uuid().brand("LibraryId");
export type LibraryId = z.infer<typeof LibraryIdSchema>;

/**
 * generateId: UUID v4 を生成する。
 */
export function generateId(): string {
	return crypto.randomUUID();
}
