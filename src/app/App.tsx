import { lazy, Suspense, useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { currentToken, disconnect, useSession } from '@/entities/session';
import { resetRunSelection } from '@/entities/run';
import { TideBackdrop } from '@/shared/ui/Brand';
import { ConnectionView } from '@/widgets/session/connect';
import { createWorkspaceClient } from './workspace-client';

const Workspace = lazy(async () => {
	const { Workspace } = await import('@/pages/workspace');
	return { default: Workspace };
});

function WorkspaceSession() {
	const [workspace] = useState(createWorkspaceClient);
	const [live, setLive] = useState(false);
	useEffect(() => {
		const token = currentToken();
		if (!token) {
			return;
		}
		const unsubscribe = workspace.subscribe(
			token,
			setLive,
			() => void disconnect('Токен отозван. Введите новый ключ.'),
		);
		return () => {
			unsubscribe();
			resetRunSelection();
		};
	}, [workspace]);

	return (
		<QueryClientProvider client={workspace.client}>
			<Suspense
				fallback={
					<p className="workspace-loading" role="status">
						Открываем прогоны…
					</p>
				}
			>
				<Workspace live={live} />
			</Suspense>
		</QueryClientProvider>
	);
}

export function App() {
	const ready = useSession((state) => state.phase === 'ready');
	return (
		<>
			<TideBackdrop />
			<div className="drag-strip" data-tauri-drag-region />
			{ready ? <WorkspaceSession /> : <ConnectionView />}
		</>
	);
}
