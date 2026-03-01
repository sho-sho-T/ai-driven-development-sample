/**
 * InMemoryDomainEventBus: インプロセスのイベントバス。
 *
 * DomainEventPublisher と DomainEventSubscriber の両方を実装する。
 * リトライ: 最大 3 回、指数バックオフ（100ms → 200ms → 400ms）
 * Zod パース失敗時はスキップ（リトライしない）
 * 全ハンドラー失敗時もエラーログ出力し次に進む
 */

import type { DomainEvent } from "@contracts/core-public";
import type {
	DomainEventPublisher,
	DomainEventSubscriber,
} from "@modules/core-write";
import type { DependencyError } from "@shared-kernel/public";
import { ResultAsync } from "neverthrow";

interface SubscriberEntry {
	readonly eventSchema: { parse: (data: unknown) => unknown };
	readonly handler: (event: unknown) => void;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface InMemoryDomainEventBus
	extends DomainEventPublisher,
		DomainEventSubscriber {}

export function createInMemoryDomainEventBus(): InMemoryDomainEventBus {
	const handlers = new Map<string, SubscriberEntry[]>();

	return {
		subscribe<T>(params: {
			eventType: string;
			eventSchema: { parse: (data: unknown) => T };
			handler: (event: T) => void;
		}): void {
			const entries = handlers.get(params.eventType) ?? [];
			entries.push({
				eventSchema: params.eventSchema,
				handler: params.handler as (event: unknown) => void,
			});
			handlers.set(params.eventType, entries);
		},

		publish(
			events: readonly DomainEvent<unknown>[],
		): ResultAsync<void, DependencyError> {
			const processAll = async () => {
				for (const event of events) {
					const entries = handlers.get(event.type);
					if (!entries) continue;

					for (const entry of entries) {
						let parsed: unknown;
						try {
							parsed = entry.eventSchema.parse(event.payload);
						} catch {
							continue;
						}

						let succeeded = false;
						for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
							try {
								entry.handler(parsed);
								succeeded = true;
								break;
							} catch (error) {
								if (attempt < MAX_RETRIES - 1) {
									const delay = BASE_DELAY_MS * 2 ** attempt;
									await sleep(delay);
								}
							}
						}

						if (!succeeded) {
							console.error(
								`[InMemoryDomainEventBus] All ${MAX_RETRIES} retries failed for event: ${event.type}`,
							);
						}
					}
				}
			};

			return ResultAsync.fromSafePromise(processAll());
		},
	};
}
