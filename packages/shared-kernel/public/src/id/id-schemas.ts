/**
 * ID スキーマ定義。
 *
 * 各 Bounded Context の Aggregate ID を Zod スキーマとして定義する。
 * ULID 形式の文字列を使用し、一意性はインフラ層で保証する。
 */
import { z } from "zod";

/** BookId: 書籍の一意識別子 */
export const BookIdSchema = z
	.string()
	.min(1, "BookId must not be empty")
	.brand("BookId");
export type BookId = z.infer<typeof BookIdSchema>;

/** MemberId: 利用者の一意識別子 */
export const MemberIdSchema = z
	.string()
	.min(1, "MemberId must not be empty")
	.brand("MemberId");
export type MemberId = z.infer<typeof MemberIdSchema>;

/** LoanId: 貸出の一意識別子 */
export const LoanIdSchema = z
	.string()
	.min(1, "LoanId must not be empty")
	.brand("LoanId");
export type LoanId = z.infer<typeof LoanIdSchema>;

/**
 * generateId: ULID 風のランダム ID を生成する。
 *
 * タイムスタンプ部（10文字）+ ランダム部（16文字）の26文字で構成。
 * Crockford Base32 エンコーディングを使用。
 */
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateId(): string {
	const timestamp = Date.now();
	let timeStr = "";
	let t = timestamp;
	for (let i = 0; i < 10; i++) {
		timeStr = CROCKFORD_BASE32[t % 32] + timeStr;
		t = Math.floor(t / 32);
	}

	let randomStr = "";
	for (let i = 0; i < 16; i++) {
		randomStr += CROCKFORD_BASE32[Math.floor(Math.random() * 32)];
	}

	return timeStr + randomStr;
}
