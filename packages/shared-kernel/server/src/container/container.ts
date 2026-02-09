/**
 * 軽量 DI コンテナ。
 *
 * - Token<T>: 型安全なトークン。resolve 時に正しい型が返る。
 * - Container: register / resolve のインターフェース。
 * - createContainer: コンテナのファクトリ関数。
 *
 * 各モジュールは自身の依存を Container に登録し、
 * アプリ層（Composition Root）で全モジュールを組み立てる。
 */

/** 型付きトークン。ジェネリクスパラメータで resolve 時の型を保証する */
export interface Token<T> {
	readonly key: string;
	/** 型情報を保持するための phantom プロパティ（実行時には使用しない） */
	readonly _type?: T;
}

/** トークンを生成する */
export function createToken<T>(key: string): Token<T> {
	return { key };
}

/** DI コンテナのインターフェース */
export interface Container {
	register<T>(token: Token<T>, instance: T): void;
	resolve<T>(token: Token<T>): T;
}

/** インメモリ DI コンテナを生成する */
export function createContainer(): Container {
	const registry = new Map<string, unknown>();

	return {
		register<T>(token: Token<T>, instance: T): void {
			registry.set(token.key, instance);
		},

		resolve<T>(token: Token<T>): T {
			const instance = registry.get(token.key);
			if (instance === undefined) {
				throw new Error(`No registration found for token: ${token.key}`);
			}
			return instance as T;
		},
	};
}
