import { invoke } from '@tauri-apps/api/core';
import superjson from 'superjson';
import type { PersistStorage, StateStorage, StorageValue } from 'zustand/middleware';

const pending = new Map<string, Promise<void>>();

// Zustand does not await asynchronous writes. A later logout must finish after an earlier save.
function inOrder<T>(namespace: string, key: string, operation: () => Promise<T>): Promise<T> {
	const entry = JSON.stringify([namespace, key]);
	const previous = pending.get(entry) ?? Promise.resolve();
	const result = previous.then(operation);

	function release() {
		if (pending.get(entry) === finished) {
			pending.delete(entry);
		}
	}

	const finished = result.then(release, release);
	pending.set(entry, finished);

	return result;
}

export function createKeychainStorage(namespace: string): StateStorage<Promise<void>> {
	return {
		getItem: (key) =>
			inOrder(namespace, key, () =>
				invoke<string | null>('keychain_get', { namespace, key }),
			),

		setItem: (key, value) =>
			inOrder(namespace, key, () => invoke<void>('keychain_set', { namespace, key, value })),

		removeItem: (key) =>
			inOrder(namespace, key, () => invoke<void>('keychain_delete', { namespace, key })),
	};
}

export function createKeychainPersistStorage<State>(
	namespace: string,
): PersistStorage<State, Promise<void>> {
	const storage = createKeychainStorage(namespace);

	return {
		async getItem(key) {
			const serialized = await storage.getItem(key);
			return serialized === null ? null : superjson.parse<StorageValue<State>>(serialized);
		},
		setItem: (key, value) => storage.setItem(key, superjson.stringify(value)),
		removeItem: (key) => storage.removeItem(key),
	};
}
