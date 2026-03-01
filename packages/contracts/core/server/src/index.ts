/**
 * @contracts/core-server
 *
 * Core インフラのサーバー側契約。
 * DomainEventIdGenerator インターフェース、UUID 実装、DI トークンを提供する。
 */

export type { DomainEventIdGenerator } from "./domain-event-id-generator.ts";
export { createUuidDomainEventIdGenerator } from "./uuid-domain-event-id-generator.ts";
export { DomainEventIdGeneratorToken } from "./core-tokens.ts";
