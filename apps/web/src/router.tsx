/**
 * ルーター設定 + TanStack Query SSR 統合。
 *
 * TanStack Start では Next.js の Server Components が存在しないため、
 * SSR データ取得は Route の loader + createServerFn で行う。
 *
 * setupRouterSsrQueryIntegration により、以下が自動化される:
 * - SSR 時: loader 内で ensureQueryData → QueryClient にキャッシュ
 * - SSR → クライアント: dehydrate/hydrate を自動管理
 * - クライアント: useSuspenseQuery でキャッシュ済みデータを即座に利用
 */
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { createQueryClient } from "./lib/query-client.ts";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
	const queryClient = createQueryClient();

	const router = createRouter({
		routeTree,
		// QueryClient を全ルートの loader で利用可能にする
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
	});

	// SSR 時の dehydrate / クライアント側の hydrate を自動管理
	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
};

// TanStack Router の型安全なルーティングのための型登録
declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}

export type RouterContext = {
	queryClient: QueryClient;
};
