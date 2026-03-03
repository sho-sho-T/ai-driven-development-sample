import {
	LibraryCommandBusToken,
	LibraryQueryBusToken,
	LibraryQueryServiceToken,
	LibraryRepositoryToken,
} from "@contracts/library-server";
import { registerLibraryInfra } from "@modules/library-infra-db/drizzle";
import type { LibraryQueryService } from "@modules/library-read";
import { buildLibraryQueryBus } from "@modules/library-read";
import {
	buildLibraryCommandBus,
	type LibraryRepository,
} from "@modules/library-write";
import type { Container } from "@shared-kernel/server";
import { createContainer, createNewContext } from "@shared-kernel/server";

let containerInstance: Container | null = null;

function getContainer(): Container {
	if (containerInstance) {
		return containerInstance;
	}

	const container = createContainer();

	registerLibraryInfra(container);

	const commandBus = buildLibraryCommandBus({
		resolveDeps: (c) => ({
			repository: c.resolve(LibraryRepositoryToken) as LibraryRepository,
		}),
	});
	container.register(LibraryCommandBusToken, commandBus);

	const queryBus = buildLibraryQueryBus({
		resolveDeps: (c) => ({
			queryService: c.resolve(LibraryQueryServiceToken) as LibraryQueryService,
		}),
	});
	container.register(LibraryQueryBusToken, queryBus);

	containerInstance = container;
	return container;
}

export function getExecutionContext() {
	return createNewContext(getContainer());
}

export function getLibraryCommandBus() {
	return getContainer().resolve(LibraryCommandBusToken);
}

export function getLibraryQueryBus() {
	return getContainer().resolve(LibraryQueryBusToken);
}
