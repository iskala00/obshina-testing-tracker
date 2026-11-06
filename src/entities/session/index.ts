import { create, createStore } from 'zustand';
import { persist } from 'zustand/middleware';
import { authorize, errorMessage, InvalidToken, request } from '@/shared/api';
import { createKeychainPersistStorage } from '@/shared/storage';

type Phase = 'restoring' | 'guest' | 'checking' | 'ready' | 'unavailable' | 'locked';
interface Session {
	phase: Phase;
	name: string;
	error: string | null;
}

export const useSession = create<Session>(() => ({
	phase: 'restoring',
	name: '',
	error: null,
}));

const secureStorage = createKeychainPersistStorage<{ token: string | null }>('session');
let readError: unknown;
const credentials = createStore<{ token: string | null }>()(
	persist(() => ({ token: null as string | null }), {
		name: 'team-token',
		storage: secureStorage,
		skipHydration: true,
		onRehydrateStorage: () => (_state, error) => {
			readError = error;
		},
	}),
);

let generation = 0;

export function currentToken() {
	return credentials.getState().token;
}

export async function disconnect(message: string | null = null) {
	const attempt = ++generation;
	authorize(null);
	useSession.setState({ phase: 'restoring', name: '', error: null });

	try {
		await credentials.setState({ token: null });
		if (attempt === generation) {
			useSession.setState({ phase: 'guest', error: message });
		}
	} catch (error) {
		if (attempt === generation) {
			useSession.setState({ phase: 'locked', error: errorMessage(error) });
		}
	}
}

export async function connect(value: string, saved = false) {
	const attempt = ++generation;
	const token = value.trim();
	if (!/^chk_[A-Za-z0-9_-]{43}$/.test(token)) {
		if (saved) {
			await disconnect('Сохранённый ключ имеет неверный формат.');
		} else {
			useSession.setState({
				error: 'Вставьте ключ целиком. Он начинается с chk_ и содержит 47 символов.',
			});
		}
		return;
	}

	useSession.setState({ phase: 'checking', error: null });
	try {
		const result = await request<{ me: { name: string } }>(token, 'query { me { name } }');
		if (attempt !== generation) {
			return;
		}

		if (!saved) {
			await credentials.setState({ token });
		}
		if (attempt === generation) {
			authorize({
				token,
				onRevoked: () =>
					void disconnect('Срок действия токена завершён. Введите новый ключ.'),
			});
			useSession.setState({ phase: 'ready', name: result.me.name });
		}
	} catch (error) {
		if (attempt !== generation) {
			return;
		}
		if (saved && error instanceof InvalidToken) {
			await disconnect(error.message);
		} else {
			useSession.setState({
				phase: saved ? 'unavailable' : 'guest',
				error: errorMessage(error),
			});
		}
	}
}

export async function restoreSession() {
	const attempt = ++generation;
	useSession.setState({ phase: 'restoring', error: null });
	readError = undefined;
	await credentials.persist.rehydrate();
	if (attempt !== generation) {
		return;
	}
	if (readError) {
		useSession.setState({ phase: 'locked', error: errorMessage(readError) });
		return;
	}

	const token = currentToken();
	if (token) {
		await connect(token, true);
	} else {
		useSession.setState({ phase: 'guest' });
	}
}
