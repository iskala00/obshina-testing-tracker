import { MutationCache, QueryClient } from '@tanstack/react-query';
import { createClient } from 'graphql-ws';
import { endpoint, InvalidToken } from '@/shared/api';

export function createWorkspaceClient() {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const client = new QueryClient({
		mutationCache: new MutationCache({ onSuccess: scheduleRefresh }),
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				retry: (count, error) => count < 1 && !(error instanceof InvalidToken),
			},
			mutations: { retry: false },
		},
	});

	function scheduleRefresh() {
		if (timer === undefined) {
			timer = setTimeout(() => {
				timer = undefined;
				void client.invalidateQueries({ refetchType: 'active' });
			}, 180);
		}
	}

	function subscribe(token: string, onLive: (live: boolean) => void, onRevoked: () => void) {
		let disposed = false;
		const socket = createClient({
			url: endpoint.replace('https:', 'wss:'),
			connectionParams: { authorization: `Bearer ${token}` },
			retryAttempts: Infinity,
			keepAlive: 25_000,
			connectionAckWaitTimeout: 12_000,
			on: {
				connected: () => {
					if (!disposed) {
						onLive(true);
					}
				},
				closed: (event) => {
					if (disposed) {
						return;
					}
					onLive(false);
					if (
						typeof event === 'object' &&
						event &&
						'code' in event &&
						(event.code === 4403 || event.code === 4401)
					) {
						onRevoked();
					}
				},
			},
		});

		const stop = socket.subscribe(
			{ query: 'subscription { changed }' },
			{
				next: () => {
					if (!disposed) {
						scheduleRefresh();
					}
				},
				error: () => {
					if (!disposed) {
						onLive(false);
					}
				},
				complete: () => {
					if (!disposed) {
						onLive(false);
					}
				},
			},
		);

		return () => {
			disposed = true;
			stop();
			void socket.dispose();
			clearTimeout(timer);
			timer = undefined;
			client.clear();
		};
	}

	return { client, subscribe };
}
