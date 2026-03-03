import { z } from "zod";

/** 図書館の ReadModel スキーマ */
export const LibraryReadModelSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	authenticationStatus: z.string(),
});

export type LibraryReadModel = z.infer<typeof LibraryReadModelSchema>;
