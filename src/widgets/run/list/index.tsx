import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Popover } from '@heroui/react';
import { Button } from '@iskala00/react/heroui';
import {
	Check,
	ChevronDown,
	ChevronRight,
	Grid2X2,
	Plus,
	Square,
	SquareCheck,
	SquareMinus,
	TriangleAlert,
} from 'lucide-react';
import {
	categoryPage,
	displayDate,
	historyKey,
	requestNewRun,
	runHeader,
	runPage,
	selectRunCategory,
	useRunSelection,
} from '@/entities/run';
import type { Run, RunCategory } from '@/entities/run';
import { PassCategoryDialog } from '@/entities/run/ui/pass-category-dialog';
import { ScrollFeed } from '@/shared/api/scroll-feed';
import { IncludeTestsButton, NewRunDialog } from './run-actions';
import './sidebar.css';

interface BranchProps {
	runId: string;
	parent: string;
	path: string | null;
	onPass: (path: string) => void;
}

function Branch(props: BranchProps) {
	const { runId, parent } = props;
	return (
		<ScrollFeed<RunCategory>
			queryKey={['runs', runId, 'categories', parent]}
			getKey={(node) => node.path}
			loadPage={(after, signal) => categoryPage(runId, parent, after, signal)}
		>
			{(node) => <CategoryRow {...props} node={node} />}
		</ScrollFeed>
	);
}

function CategoryRow({ node, runId, path, onPass }: BranchProps & { node: RunCategory }) {
	const [expanded, setExpanded] = useState(false);
	const name = node.path.split('/').pop();
	const Mark = node.failed
		? TriangleAlert
		: !node.pending
			? SquareCheck
			: node.pending < node.total
				? SquareMinus
				: Square;
	const current = path === node.path;

	return (
		<div className="run-cat-node">
			<div className="run-cat-row" data-current={current}>
				{node.hasChildren ? (
					<button
						type="button"
						className="run-cat-disclose"
						aria-expanded={expanded}
						aria-label={`${expanded ? 'Свернуть' : 'Раскрыть'} категорию ${name}`}
						onClick={() => setExpanded(!expanded)}
					>
						{expanded ? <ChevronDown /> : <ChevronRight />}
					</button>
				) : (
					<span className="run-cat-spacer" />
				)}
				<button
					type="button"
					className="run-cat-mark"
					data-failed={node.failed > 0}
					aria-label={`Отметить непроверенные пункты категории ${name}`}
					disabled={!node.pending}
					onClick={() => onPass(node.path)}
				>
					<Mark />
				</button>
				<button
					type="button"
					className="run-cat-name"
					aria-current={current ? 'true' : undefined}
					title={node.path}
					onClick={() => selectRunCategory(runId, node.path)}
				>
					<span>{name}</span>
					<small>
						{node.total - node.pending}/{node.total}
					</small>
				</button>
			</div>
			{expanded && node.hasChildren && (
				<div className="run-cat-child">
					<Branch runId={runId} parent={node.path} path={path} onPass={onPass} />
				</div>
			)}
		</div>
	);
}

export function RunSidebar() {
	const runId = useRunSelection((state) => state.runId);
	const activePath = useRunSelection((state) => state.category);
	const newRunOpen = useRunSelection((state) => state.newRunOpen);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [pass, setPass] = useState<{ runId: string; path: string } | null>(null);
	const initial = useQuery({
		queryKey: [...historyKey, 'page', null],
		queryFn: ({ signal }) => runPage(null, signal),
		enabled: !runId,
	});
	const selected = useQuery({
		queryKey: ['runs', runId, 'header'],
		queryFn: ({ signal }) => runHeader(runId!, signal),
		enabled: !!runId,
	});
	const latest = initial.data?.nodes[0];

	useEffect(() => {
		if (!runId && latest) {
			selectRunCategory(latest.id, null);
		}
	}, [runId, latest]);

	return (
		<div className="run-side">
			<div className="run-side-head">
				<span>История прогонов</span>
				<Button
					isIconOnly
					size="sm"
					variant="ghost"
					aria-label="Новый регресс"
					onPress={requestNewRun}
				>
					<Plus size={15} />
				</Button>
			</div>
			<Popover isOpen={historyOpen} onOpenChange={setHistoryOpen}>
				<Button className="run-history-trigger" size="sm" variant="tertiary">
					<span>{selected.data?.title ?? 'Выбрать прогон'}</span>
					<ChevronDown size={14} />
				</Button>
				<Popover.Content placement="bottom start">
					<Popover.Dialog aria-label="История прогонов">
						<div className="run-history-list">
							<ScrollFeed<Run>
								queryKey={historyKey}
								loadPage={runPage}
								getKey={(run) => run.id}
								empty={<p>Пока нет прогонов</p>}
							>
								{(run) => (
									<button
										type="button"
										className="history-record"
										onClick={() => {
											selectRunCategory(run.id, null);
											setHistoryOpen(false);
										}}
									>
										<span>
											<strong>{run.title}</strong>
											<small>{displayDate(run.createdAt)}</small>
										</span>
										{run.id === runId && <Check size={16} />}
									</button>
								)}
							</ScrollFeed>
						</div>
					</Popover.Dialog>
				</Popover.Content>
			</Popover>
			{initial.error && !runId && <p role="alert">{initial.error.message}</p>}
			{selected.error && <p role="alert">{selected.error.message}</p>}
			{runId && (
				<>
					<IncludeTestsButton key={runId} runId={runId} />
					<div className="run-side-head">Категории</div>
					<div className="run-tree">
						<button
							type="button"
							className="run-cat-all"
							data-current={!activePath}
							onClick={() => selectRunCategory(runId, null)}
						>
							<Grid2X2 size={16} />
							Все проверки
						</button>
						<Branch
							key={runId}
							runId={runId}
							parent=""
							path={activePath}
							onPass={(path) => setPass({ runId, path })}
						/>
					</div>
				</>
			)}
			{newRunOpen && <NewRunDialog />}
			{pass && (
				<PassCategoryDialog
					id={pass.runId}
					category={pass.path}
					close={() => setPass(null)}
				/>
			)}
		</div>
	);
}
