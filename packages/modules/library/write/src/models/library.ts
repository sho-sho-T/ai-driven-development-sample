import { z } from "zod";

/** Library 集約スキーマ */
export const LibrarySchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1, "Name must not be empty"),
	email: z.string().email("Email must be valid"),
	authenticationStatus: z.enum(["unauthenticated", "authenticated"]),
});

/** Library 集約の型 */
export type Library = z.infer<typeof LibrarySchema>;
