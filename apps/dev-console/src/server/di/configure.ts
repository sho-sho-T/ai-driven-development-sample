import {
	LibraryQueryBusToken,
	LibraryQueryServiceToken,
	LibraryRepositoryToken,
} from "@contracts/library-server";
import { registerLibraryInfra } from "@modules/library-infra-db";
import type { LibraryQueryService } from "@modules/library-read";
import { buildLibraryQueryBus } from "@modules/library-read";
import { createLibrary, type LibraryRepository } from "@modules/library-write";
import type { Container } from "@shared-kernel/server";
import { createContainer, createNewContext } from "@shared-kernel/server";

let containerInstance: Container | null = null;

function getContainer(): Container {
	if (containerInstance) {
		return containerInstance;
	}

	const container = createContainer();

	registerLibraryInfra(container);

	const queryBus = buildLibraryQueryBus({
		resolveDeps: (c) => ({
			queryService: c.resolve(LibraryQueryServiceToken) as LibraryQueryService,
		}),
	});
	container.register(LibraryQueryBusToken, queryBus);

	seedMockData(container);

	containerInstance = container;
	return container;
}

function seedMockData(container: Container) {
	const repository = container.resolve(
		LibraryRepositoryToken,
	) as LibraryRepository;

	const mockLibraries = [
		{ name: "本社ライブラリ", location: "東京本社 3F" },
		{ name: "大阪オフィスライブラリ", location: "大阪支社 2F" },
		{ name: "福岡オフィスライブラリ", location: "福岡支社 1F" },
	];

	for (const input of mockLibraries) {
		const result = createLibrary(input);
		if (result.isOk()) {
			repository.save(result.value);
		}
	}
}

export function getExecutionContext() {
	return createNewContext(getContainer());
}

export function getLibraryQueryBus() {
	return getContainer().resolve(LibraryQueryBusToken);
}
