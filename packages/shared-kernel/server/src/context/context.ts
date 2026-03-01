/**
 * Context: リクエスト単位のコンテキスト。
 *
 * correlationId / causationId で分散トレーシングと因果関係を管理する。
 * Container を保持し、ハンドラーが必要な依存を取得できるようにする。
 */
import type { Container } from "../container/container.ts";

export type Context = {
	readonly id: string;
	readonly correlationId: string;
	readonly causationId: string | undefined;
	readonly container: Container;
};

/** 新しいコンテキストを生成する。correlationId === id, causationId === undefined */
export function createNewContext(container: Container): Context {
	const id = crypto.randomUUID();
	return {
		id,
		correlationId: id,
		causationId: undefined,
		container,
	};
}

/** 親コンテキストから子コンテキストを派生する。correlationId を引き継ぎ、causationId に親の id を設定 */
export function forkContext(parentCtx: Context): Context {
	const id = crypto.randomUUID();
	return {
		id,
		correlationId: parentCtx.correlationId,
		causationId: parentCtx.id,
		container: parentCtx.container.fork(),
	};
}

/** コンテキストの container を差し替えた新しいコンテキストを返す */
export function updateContainer(ctx: Context, container: Container): Context {
	return {
		...ctx,
		container,
	};
}

/**
 * 後方互換性のためのエイリアス。
 * @deprecated createNewContext を使用してください
 */
export function createExecutionContext(container: Container): Context {
	return createNewContext(container);
}
