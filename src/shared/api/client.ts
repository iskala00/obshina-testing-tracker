import { fetch as desktopFetch } from '@tauri-apps/plugin-http';

export const endpoint = 'https://checker.obshina.skalaspace.top/graphql';

export class InvalidToken extends Error {
	constructor() {
		super('Сервер отклонил токен. Проверьте ключ и попробуйте ещё раз.');
	}
}

type Variables = Record<string, unknown>;

interface Envelope<T> {
	data?: T;
	errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

interface Authorization {
	token: string;
	onRevoked: () => void;
}

let active: Authorization | null = null;

export function authorize(session: Authorization | null) {
	active = session;
}

export async function request<T>(
	token: string,
	document: string,
	variables: Variables = {},
	signal?: AbortSignal,
): Promise<T> {
	signal?.throwIfAborted();
	const controller = new AbortController();
	const cancel = () => controller.abort(signal?.reason);
	const timeout = setTimeout(
		() => controller.abort(new Error('Сервер не ответил вовремя.')),
		25_000,
	);
	signal?.addEventListener('abort', cancel, { once: true });

	try {
		const response = await desktopFetch(endpoint, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			connectTimeout: 15_000,
			maxRedirections: 0,
			body: JSON.stringify({ query: document, variables }),
			signal: controller.signal,
		});

		if (response.status === 401 || response.status === 403) {
			throw new InvalidToken();
		}
		if (!response.ok) {
			throw new Error(`Сервер вернул ошибку HTTP ${response.status}.`);
		}

		const result: Envelope<T> = await response.json();
		if (result.errors?.some((error) => error.extensions?.code === 'UNAUTHENTICATED')) {
			throw new InvalidToken();
		}
		if (result.errors?.length) {
			throw new Error(result.errors[0].message);
		}
		if (!result.data) {
			throw new Error('Сервер вернул пустой ответ.');
		}

		return result.data;
	} catch (error) {
		// Tauri HTTP reports transport errors as strings across IPC.
		if (typeof error === 'string') {
			throw new Error(`Ошибка соединения: ${error}`);
		}
		throw error;
	} finally {
		clearTimeout(timeout);
		signal?.removeEventListener('abort', cancel);
	}
}

export async function graphQL<T>(
	document: string,
	variables?: Variables,
	signal?: AbortSignal,
): Promise<T> {
	const session = active;
	if (!session) {
		throw new InvalidToken();
	}

	try {
		const result = await request<T>(session.token, document, variables, signal);
		if (active !== session) {
			throw new DOMException('Сеанс завершён', 'AbortError');
		}

		return result;
	} catch (error) {
		if (active === session && error instanceof InvalidToken) {
			session.onRevoked();
		}
		throw error;
	}
}

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
