import {
	LibraryNotFoundError,
	VerifyLibraryEmailInputSchema,
} from "@contracts/library-public";
import type { LibraryCommandHandlerDefinition } from "@contracts/library-server";
import { errAsync } from "neverthrow";
import { verifyEmail } from "../../models/library-behaviors.ts";
import type { LibraryRepository } from "../../models/library-repository.ts";

type Deps = {
	repository: LibraryRepository;
};

export const verifyEmailHandler: LibraryCommandHandlerDefinition<
	Deps,
	"library.verifyEmail"
> = {
	factory: (deps) => (command) => {
		const parseResult = VerifyLibraryEmailInputSchema.safeParse(command.input);
		if (!parseResult.success) {
			return errAsync(
				LibraryNotFoundError.create({ id: String(command.input.libraryId) }),
			);
		}

		const { libraryId } = parseResult.data;

		return deps.repository.findById(libraryId).andThen((library) => {
			if (!library) {
				return errAsync(LibraryNotFoundError.create({ id: libraryId }));
			}

			const result = verifyEmail(library);
			if (result.isErr()) {
				return errAsync(result.error);
			}

			return deps.repository.save(result.value).map(() => undefined);
		});
	},
	settings: {},
};
