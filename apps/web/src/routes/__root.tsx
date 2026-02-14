/**
 * ルートレイアウト（__root.tsx）。
 *
 * createRootRouteWithContext を使い、Router context（QueryClient）を
 * 型安全に全ルートへ伝播させる。
 *
 * shellComponent は SSR の HTML シェル（<html>, <head>, <body>）を担い、
 * QueryClientProvider をここでラップすることで、
 * 全子ルートで useSuspenseQuery / useMutation が利用可能になる。
 */

import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import appCss from "../styles.css?url";

// createRootRouteWithContext でジェネリクスに context 型を渡すと、
// 全ルートの loader で context.queryClient が型安全に利用できる
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
	{
		head: () => ({
			meta: [
				{
					charSet: "utf-8",
				},
				{
					name: "viewport",
					content: "width=device-width, initial-scale=1",
				},
				{
					title: "Library Management",
				},
			],
			links: [
				{
					rel: "stylesheet",
					href: appCss,
				},
			],
		}),

		shellComponent: RootDocument,
		component: RootComponent,
	},
);

function RootComponent() {
	return <Outlet />;
}

function RootDocument({ children }: { children: React.ReactNode }) {
	// Router context から QueryClient を取得して Provider に渡す
	const { queryClient } = Route.useRouteContext();

	return (
		<QueryClientProvider client={queryClient}>
			<html lang="en">
				<head>
					<HeadContent />
				</head>
				<body className="min-h-screen bg-background font-sans antialiased">
					<div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
					<Scripts />
				</body>
			</html>
		</QueryClientProvider>
	);
}
