import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@iskala00/react/heroui';
import { ProgressCircle, SearchField, Tabs } from '@heroui/react';
import {
	CheckCheck,
	ChevronRight,
	CircleCheck,
	CircleDashed,
	ListChecks,
	MessageCircle,
	Plus,
	Search,
	Square,
	SquareCheck,
	TriangleAlert,
	X,
} from 'lucide-react';
import { checkPage, markCheck, statusTitle } from '@/entities/check';
import type { Check, CheckStatus } from '@/entities/check';
import {
	displayDate,
	historyKey,
	requestNewRun,
	runHeader,
	runPage,
	runStats,
	useRunSelection,
} from '@/entities/run';
import type { Totals } from '@/entities/run';
import { PassCategoryDialog } from '@/entities/run/ui/pass-category-dialog';
import { ScrollFeed } from '@/shared/api/scroll-feed';

import './run.css';

type Filter = CheckStatus | 'ALL';
const filters: Filter[] = ['ALL', 'PENDING', 'PASSED', 'FAILED'];

function Summary({ counts }: { counts: Totals }) {
	const tested = counts.total - counts.pending;
	const percent = counts.total ? Math.round((tested * 100) / counts.total) : 0;
	return (
		<div className="run-summary">
			<div className="run-progress-ring">
				<ProgressCircle aria-label="Протестировано" value={percent}>
					<ProgressCircle.Track>
						<ProgressCircle.TrackCircle />
						<ProgressCircle.FillCircle />
					</ProgressCircle.Track>
				</ProgressCircle>
				<strong>{percent}%</strong>
			</div>
			<div>
				<h2>
					Протестировано {tested} из {counts.total}
				</h2>
				<div className="run-counts">
					<span>
						<CircleCheck />
						Без ошибок · {tested - counts.failed}
					</span>
					<span className={counts.failed ? 'count-danger' : ''}>
						<TriangleAlert />
						Ошибки · {counts.failed}
					</span>
					<span>
						<CircleDashed />
						Осталось · {counts.pending}
					</span>
				</div>
			</div>
		</div>
	);
}

function GroupRows({
	entries,
	previous,
	open,
	pass,
	mark,
	pending,
	selectedPath,
}: {
	entries: Check[];
	previous?: Check;
	open: (item: Check) => void;
	pass: (path: string) => void;
	mark: (id: string) => void;
	pending: boolean;
	selectedPath: string | null;
}) {
	const groups = new Map<string, Check[]>();
	for (const entry of entries) {
		const group = groups.get(entry.category);
		if (group) {
			group.push(entry);
		} else {
			groups.set(entry.category, [entry]);
		}
	}

	return Array.from(groups, ([category, checks], index) => {
		const continuation = index === 0 && previous?.category === category;
		return (
			<section
				key={category}
				aria-label={category}
				className="run-card"
				data-continuation={continuation}
			>
				{!continuation && (
					<header>
						<h3>{category.split('/').join(' › ')}</h3>
						{category !== selectedPath &&
							checks.some((item) => item.status === 'PENDING') && (
								<Button
									isIconOnly
									size="sm"
									variant="ghost"
									aria-label={`Закрыть категорию ${category}`}
									onPress={() => pass(category)}
								>
									<CheckCheck size={16} />
								</Button>
							)}
					</header>
				)}
				{checks.map((item) => {
					const Icon =
						item.status === 'PENDING'
							? Square
							: item.status === 'FAILED'
								? TriangleAlert
								: SquareCheck;
					return (
						<div key={item.id} className="check-row" data-status={item.status}>
							<button
								type="button"
								className="check-mark"
								disabled={pending && item.status === 'PENDING'}
								aria-label={`${item.status === 'PENDING' ? 'Отметить без ошибок' : 'Изменить результат'}: ${item.title}`}
								onClick={() =>
									item.status === 'PENDING' ? mark(item.id) : open(item)
								}
							>
								<Icon size={18} />
							</button>
							<button type="button" className="check-open" onClick={() => open(item)}>
								<span className="check-row-label">
									<strong>{item.title}</strong>
									{item.status === 'FAILED' && item.error && (
										<small>{item.error}</small>
									)}
								</span>
								{item.defectCount > 0 && (
									<span
										className="check-counter"
										aria-label={`Ошибок: ${item.defectCount}`}
									>
										<TriangleAlert />
										{item.defectCount}
									</span>
								)}
								{item.commentCount > 0 && (
									<span
										className="check-counter"
										aria-label={`Комментариев: ${item.commentCount}`}
									>
										<MessageCircle />
										{item.commentCount}
									</span>
								)}
								<span className="check-status" data-status={item.status}>
									{statusTitle[item.status]}
								</span>
								<ChevronRight size={14} className="check-chevron" />
							</button>
						</div>
					);
				})}
			</section>
		);
	});
}

interface RunViewProps {
	onOpenCheck: (item: Check) => void;
}

function useScrollCollapse() {
	const viewport = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const view = viewport.current;
		if (!view) {
			return;
		}

		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		let progress = 0;
		let target = 0;
		let frame = 0;
		let previousTime = 0;

		function paint(time: number) {
			const elapsed = Math.max(1, time - previousTime);
			previousTime = time;
			progress += (target - progress) * (1 - Math.exp(-elapsed / 70));
			if (motion.matches || Math.abs(target - progress) < 0.002) {
				progress = target;
			}

			view!.style.setProperty('--collapse', String(progress));
			view!.dataset.compact = String(progress === 1);
			frame = progress === target ? 0 : requestAnimationFrame(paint);
		}

		function followScroll() {
			const offset = view!.scrollTop;
			view!.toggleAttribute('data-scrolled', offset > 0);

			const fraction = Math.min(1, Math.max(0, offset / 144));
			target = motion.matches
				? Number(fraction === 1)
				: fraction * fraction * (3 - 2 * fraction);
			if (!frame) {
				previousTime = performance.now();
				frame = requestAnimationFrame(paint);
			}
		}

		followScroll();
		view.addEventListener('scroll', followScroll, { passive: true });
		motion.addEventListener('change', followScroll);
		return () => {
			cancelAnimationFrame(frame);
			view.removeEventListener('scroll', followScroll);
			motion.removeEventListener('change', followScroll);
		};
	}, []);

	return viewport;
}

function Checklist({
	id,
	category,
	onOpenCheck,
}: RunViewProps & { id: string; category: string | null }) {
	const [search, setSearch] = useState('');
	const [queryText, setQueryText] = useState('');
	const [filter, setFilter] = useState<Filter>('ALL');
	const viewport = useScrollCollapse();
	const [closing, setClosing] = useState<string | null>(null);
	const header = useQuery({
		queryKey: ['runs', id, 'header'],
		queryFn: ({ signal }) => runHeader(id, signal),
	});
	const stats = useQuery({
		queryKey: ['runs', id, 'stats', category],
		queryFn: ({ signal }) => runStats(id, category, signal),
	});
	const quickMark = useMutation({ mutationFn: (itemId: string) => markCheck(itemId, 'PASSED') });
	const status = filter === 'ALL' ? null : filter;

	useEffect(() => {
		const handle = window.setTimeout(() => setQueryText(search.trim()), 220);
		return () => window.clearTimeout(handle);
	}, [search]);

	useEffect(() => {
		viewport.current?.scrollTo({ top: 0 });
	}, [category, filter, queryText]);

	return (
		<div className="run-view" ref={viewport}>
			<section className="run-heading">
				<div>
					{header.data && (
						<p>
							{category
								? header.data.title
								: `Регресс от ${displayDate(header.data.createdAt)}`}
						</p>
					)}
					<h1>
						{category
							? category.split('/').join(' › ')
							: (header.data?.title ?? 'Прогон')}
					</h1>
				</div>
				<SearchField
					aria-label="Найти проверку"
					value={search}
					onChange={setSearch}
					className="run-search"
				>
					<SearchField.Group>
						<SearchField.SearchIcon />
						<SearchField.Input placeholder="Найти проверку" />
						<SearchField.ClearButton aria-label="Очистить поиск">
							<X size={13} />
						</SearchField.ClearButton>
					</SearchField.Group>
				</SearchField>
			</section>
			<div className="run-tools">
				{stats.data && <Summary counts={stats.data} />}
				<div className="run-filters">
					<Tabs
						selectedKey={filter}
						onSelectionChange={(key) => setFilter(key as Filter)}
					>
						<Tabs.ListContainer>
							<Tabs.List aria-label="Результат проверки">
								{filters.map((value) => (
									<Tabs.Tab key={value} id={value}>
										{value === 'ALL' ? 'Все' : statusTitle[value]}
										<Tabs.Indicator />
									</Tabs.Tab>
								))}
							</Tabs.List>
						</Tabs.ListContainer>
					</Tabs>
					{category && !!stats.data?.pending && (
						<Button variant="secondary" size="sm" onPress={() => setClosing(category)}>
							<CheckCheck size={15} />
							Закрыть категорию
						</Button>
					)}
				</div>
			</div>
			{(stats.error || header.error || quickMark.error) && (
				<p role="alert">{(stats.error ?? header.error ?? quickMark.error)?.message}</p>
			)}
			<div key={`${id}:${category}:${status}:${queryText}`} className="run-results">
				<ScrollFeed<Check>
					queryKey={['checks', 'list', id, category, status, queryText]}
					getKey={(item) => item.id}
					loadPage={(after, signal) =>
						checkPage(id, category, status, queryText, after, signal)
					}
					empty={
						<div className="run-empty">
							<Search size={30} />
							<h3>Проверок не найдено</h3>
						</div>
					}
					renderPage={(entries, previous) => (
						<GroupRows
							entries={entries}
							previous={previous}
							open={onOpenCheck}
							pass={setClosing}
							mark={quickMark.mutate}
							pending={quickMark.isPending}
							selectedPath={category}
						/>
					)}
				>
					{() => null}
				</ScrollFeed>
			</div>
			{closing && (
				<PassCategoryDialog id={id} category={closing} close={() => setClosing(null)} />
			)}
		</div>
	);
}

export function RunView({ onOpenCheck }: RunViewProps) {
	const id = useRunSelection((state) => state.runId);
	const category = useRunSelection((state) => state.category);
	const first = useQuery({
		queryKey: [...historyKey, 'page', null],
		queryFn: ({ signal }) => runPage(null, signal),
		enabled: !id,
	});
	if (!id) {
		if (first.isPending) {
			return (
				<div className="run-empty" role="status">
					Загрузка прогонов…
				</div>
			);
		}
		return (
			<div className="run-empty">
				<ListChecks size={36} />
				{first.error ? (
					<p role="alert">{first.error.message}</p>
				) : (
					<>
						<h2>Пока нет прогонов</h2>
						<Button onPress={requestNewRun}>
							<Plus size={16} />
							Создать регресс
						</Button>
					</>
				)}
			</div>
		);
	}
	return <Checklist key={id} id={id} category={category} onOpenCheck={onOpenCheck} />;
}
