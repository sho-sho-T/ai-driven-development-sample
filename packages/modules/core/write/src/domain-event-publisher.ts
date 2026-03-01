/**
 * DomainEventPublisher インターフェース。
 *
 * 収集済みイベントをサブスクライバーに配信する。
 */

import type { DomainEvent } from "@contracts/core-public";
import type { DependencyError } from "@shared-kernel/public";
import type { ResultAsync } from "neverthrow";

export interface DomainEventPublisher {
	publish(
		events: readonly DomainEvent<unknown>[],
	): ResultAsync<void, DependencyError>;
}
