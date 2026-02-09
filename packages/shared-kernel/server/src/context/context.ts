/**
 * ExecutionContext ファクトリ。
 *
 * リクエスト単位のコンテキストを生成する。
 * Container を保持し、ハンドラーが必要な依存を取得できるようにする。
 */
import type { Container } from "../container/container.ts";
import type { ExecutionContext } from "../bus/types.ts";

export function createExecutionContext(container: Container): ExecutionContext {
	return { container };
}
