/**
 * 書籍登録の mutation hook。
 *
 * useMutation で副作用（API 呼び出し）とキャッシュ無効化をカプセル化する。
 * onSuccess で ["books"] キーを invalidate することで、
 * 登録後に書籍一覧が自動的に最新データに更新される。
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { registerBook } from "../../../server/catalog-server-fns.ts";

interface RegisterBookInput {
	isbn: string;
	title: string;
	author: string;
	publisher?: string;
	publishedYear?: number;
}

export function useRegisterBook() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	return useMutation({
		mutationFn: (data: RegisterBookInput) => registerBook({ data }),
		onSuccess: async () => {
			// 書籍一覧のキャッシュを無効化し、次回アクセス時に再取得させる
			await queryClient.invalidateQueries({ queryKey: ["books"] });
			navigate({ to: "/books" });
		},
	});
}
