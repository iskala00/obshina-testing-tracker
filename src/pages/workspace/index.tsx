import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import { Clock3, Grid2X2, ListChecks, Plus, RotateCw } from 'lucide-react';
import { Button } from '@iskala00/react/heroui';
import type { Check } from '@/entities/check';
import { CheckDetail } from '@/widgets/check/show';
import { disconnect, useSession } from '@/entities/session';
import { requestNewRun, selectRunCategory, useRunSelection } from '@/entities/run';
import { CommunityBrand } from '@/shared/ui/Brand';
import { RunSidebar } from '@/widgets/run/list';
import { RunView } from '@/widgets/run/show';
import { CatalogView } from '@/widgets/catalog/list';
import { ActivityView } from '@/widgets/activity/list';

const sections = [
	{ id: 'runs', label: 'Прогоны', icon: ListChecks },
	{ id: 'catalog', label: 'Тесты', icon: Grid2X2 },
	{ id: 'activity', label: 'Журнал', icon: Clock3 },
] as const;

type Section = (typeof sections)[number]['id'];
const useNavigation = create<{ section: Section }>(() => ({ section: 'runs' }));
function navigate(section: Section) {
	useNavigation.setState({ section });
}

function RunsPanel() {
	const [selected, setSelected] = useState<Check | null>(null);

	return (
		<>
			<RunView onOpenCheck={setSelected} />
			{selected && (
				<CheckDetail
					key={selected.id}
					initial={selected}
					onClose={() => setSelected(null)}
				/>
			)}
		</>
	);
}

export function Workspace({ live }: { live: boolean }) {
	const name = useSession((state) => state.name);
	const section = useNavigation((state) => state.section);
	const runId = useRunSelection((state) => state.runId);
	const client = useQueryClient();

	function newRun() {
		navigate('runs');
		requestNewRun();
	}

	useEffect(() => {
		function shortcuts(event: KeyboardEvent) {
			if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
				return;
			}
			const key = event.key.toLowerCase();
			if (key === 'r') {
				event.preventDefault();
				void client.invalidateQueries();
			} else if (key === 'n' && !document.querySelector('[role="dialog"],dialog[open]')) {
				event.preventDefault();
				newRun();
			}
		}
		window.addEventListener('keydown', shortcuts);
		return () => window.removeEventListener('keydown', shortcuts);
	}, [client]);

	useEffect(() => () => navigate('runs'), []);

	return (
		<div className="workspace">
			<header className="workspace-tools" data-tauri-drag-region>
				<div className="tool-group">
					<Button
						isIconOnly
						variant="ghost"
						size="sm"
						aria-label="Обновить"
						onPress={() => void client.invalidateQueries()}
					>
						<RotateCw size={16} />
					</Button>
					<Button
						isIconOnly
						variant="ghost"
						size="sm"
						aria-label="Новый регресс"
						onPress={newRun}
					>
						<Plus size={17} />
					</Button>
				</div>
			</header>
			<aside className="workspace-sidebar">
				<CommunityBrand />
				<p className="greeting">Привет, {name}</p>
				<nav aria-label="Разделы приложения">
					{sections.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							className="nav-row"
							aria-current={id === section ? 'page' : undefined}
							onClick={() => navigate(id)}
						>
							<Icon size={16} />
							{label}
						</button>
					))}
				</nav>
				{section === 'runs' && (
					<div className="run-sidebar-slot">
						<RunSidebar />
					</div>
				)}
				<footer className="sidebar-footer">
					<span role="status">
						<i className={live ? 'online' : ''} />
						{live ? 'В сети' : 'Подключение…'}
					</span>
					<Button variant="ghost" size="sm" onPress={() => void disconnect()}>
						Выйти
					</Button>
				</footer>
			</aside>
			<main className="workspace-detail">
				{section === 'runs' && <RunsPanel key={runId} />}
				{section === 'catalog' && (
					<CatalogView
						runId={runId}
						onShowInRun={(path) => {
							if (runId) {
								selectRunCategory(runId, path);
								navigate('runs');
							}
						}}
					/>
				)}
				{section === 'activity' && <ActivityView />}
			</main>
		</div>
	);
}
