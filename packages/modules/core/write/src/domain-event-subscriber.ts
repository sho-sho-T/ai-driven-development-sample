/**
 * DomainEventSubscriber インターフェース。
 *
 * イベント型ごとにハンドラーを登録する。
 */
export interface DomainEventSubscriber {
	subscribe<T>(params: {
		eventType: string;
		eventSchema: { parse: (data: unknown) => T };
		handler: (event: T) => void;
	}): void;
}
