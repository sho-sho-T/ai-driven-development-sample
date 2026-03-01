/**
 * DomainEventStore インターフェース。
 *
 * コマンドハンドラー内でイベントを収集し、
 * トランザクション内で永続化、完了後にサブスクライバーへ配信する。
 */

import type { DomainEvent } from "@contracts/core-public";
import type { ConcurrencyError, DependencyError } from "@shared-kernel/public";
import type { ResultAsync } from "neverthrow";

export interface DomainEventStore {
	/** イベントをメモリに収集する（まだ永続化しない） */
	add(event: DomainEvent<unknown>): void;

	/** 収集済みイベントを DB に一括永続化する */
	save(): ResultAsync<void, DependencyError | ConcurrencyError>;

	/** 収集済みイベントをサブスクライバーに配信する */
	publish(): ResultAsync<void, DependencyError>;

	/** 収集済みイベントを取得する */
	getCollected(): readonly DomainEvent<unknown>[];
}
