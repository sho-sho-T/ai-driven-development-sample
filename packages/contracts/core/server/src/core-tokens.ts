/**
 * Core インフラの DI トークン定義。
 */
import { createToken } from "@shared-kernel/server";
import type { DomainEventIdGenerator } from "./domain-event-id-generator.ts";

export const DomainEventIdGeneratorToken = createToken<DomainEventIdGenerator>(
	"DomainEventIdGenerator",
);
