/**
 * Composition Root: DI コンテナの構成。
 *
 * アプリケーション起動時に1度だけ実行し、全モジュールの依存を組み立てる。
 *
 * フロー:
 * 1. コンテナを生成
 * 2. インフラ実装を登録（Repository, QueryService）
 * 3. コマンドバス / クエリバスを構築・登録
 *
 * シングルトンとしてモジュールスコープに保持し、
 * Server Function から参照する。
 */
import { createContainer, createExecutionContext } from "@shared-kernel/server";
import {
	CatalogCommandBusToken,
	CatalogQueryBusToken,
} from "@contracts/catalog-server";
import { registerCatalogInfra } from "@modules/catalog-infra-db";
import { buildCatalogCommandBus } from "@modules/catalog-write";
import { buildCatalogQueryBus } from "@modules/catalog-read";
import type { ExecutionContext, Container } from "@shared-kernel/server";

/** DI コンテナ（モジュールスコープでシングルトン） */
let containerInstance: Container | null = null;

function getContainer(): Container {
	if (containerInstance) {
		return containerInstance;
	}

	const container = createContainer();

	/** Step 1: インフラ実装を登録（BookRepository, BookQueryService） */
	registerCatalogInfra(container);

	/** Step 2: コマンドバスを構築・登録 */
	const commandBus = buildCatalogCommandBus(container);
	container.register(CatalogCommandBusToken, commandBus);

	/** Step 3: クエリバスを構築・登録 */
	const queryBus = buildCatalogQueryBus(container);
	container.register(CatalogQueryBusToken, queryBus);

	containerInstance = container;
	return container;
}

/** 実行コンテキストを取得する（Server Function から使用） */
export function getExecutionContext(): ExecutionContext {
	return createExecutionContext(getContainer());
}

/** コマンドバスを取得する */
export function getCatalogCommandBus() {
	return getContainer().resolve(CatalogCommandBusToken);
}

/** クエリバスを取得する */
export function getCatalogQueryBus() {
	return getContainer().resolve(CatalogQueryBusToken);
}
