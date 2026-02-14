/**
 * QueryClient ファクトリ。
 *
 * TanStack Query の QueryClient をアプリケーション全体で共有するための生成関数。
 * router.tsx で生成し、Router の context 経由で全ルートに提供する。
 *
 * staleTime を設定することで、SSR で取得したデータがクライアント側で
 * 不要な再フェッチを行わないようにしている。
 */
import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// SSR でプリフェッチしたデータを 30 秒間はフレッシュとみなす
				staleTime: 30 * 1000,
			},
		},
	});
}
