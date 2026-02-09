/**
 * catalog コンテキストのサーバー側 Bus 型定義。
 *
 * CatalogCommandBus / CatalogQueryBus: context 専用の Bus 型エイリアス。
 * 型パラメータで ResultMap を紐付け、execute の戻り値型を型安全にする。
 */
import type { Bus } from "@shared-kernel/server";

/**
 * catalog コマンドバス。
 * registerBook コマンドをディスパッチする。
 */
export type CatalogCommandBus = Bus;

/**
 * catalog クエリバス。
 * listBooks / getBookById クエリをディスパッチする。
 */
export type CatalogQueryBus = Bus;
