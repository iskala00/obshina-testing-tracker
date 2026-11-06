import { useCallback, useState } from 'react';
import { Button } from '@iskala00/react/heroui';
import {
	ArrowLeft,
	ArrowRight,
	CheckCheck,
	ChevronRight,
	Folder,
	FolderPlus,
	ListPlus,
	Plus,
	Trash2,
} from 'lucide-react';
import {
	categoryName,
	fetchCases,
	fetchCategories,
	MissingCategoryError,
	type TemplateCase,
	type TemplateCategory,
} from '@/entities/catalog';
import { ScrollFeed } from '@/shared/api/scroll-feed';
import { CatalogDialog, type CatalogAction, type CatalogResult } from '../show/catalog-dialog';
import { CheckCard } from '../show/check-card';
import './catalog.css';

interface CatalogViewProps {
	runId: string | null;
	onShowInRun: (path: string) => void;
}

export function CatalogView({ runId, onShowInRun }: CatalogViewProps) {
	const [ancestry, setAncestry] = useState<TemplateCategory[]>([]);
	const selected = ancestry[ancestry.length - 1] ?? null;
	const [notice, setNotice] = useState('');

	function open(category: TemplateCategory) {
		setNotice('');
		setAncestry((current) => [...current, category]);
	}

	const leave = useCallback((id: string, message = '') => {
		setNotice(message);
		setAncestry((current) => {
			if (current[current.length - 1]?.id !== id) {
				return current;
			}
			return current.slice(0, -1);
		});
	}, []);

	return (
		<CatalogLevel
			key={selected?.id ?? 'root'}
			runId={runId}
			category={selected}
			notice={notice}
			onOpen={open}
			onLeave={leave}
			onShowInRun={onShowInRun}
		/>
	);
}

interface LevelProps extends CatalogViewProps {
	category: TemplateCategory | null;
	notice: string;
	onOpen: (category: TemplateCategory) => void;
	onLeave: (id: string, message?: string) => void;
}

function CatalogLevel({ category, notice, runId, onOpen, onLeave, onShowInRun }: LevelProps) {
	const [action, setAction] = useState<CatalogAction | null>(null);
	const [included, setIncluded] = useState<{ runId: string; count: number } | null>(null);
	const parentId = category?.id ?? null;
	const folders = useCallback(
		(after: string | null, signal: AbortSignal) => fetchCategories(parentId, after, signal),
		[parentId],
	);

	function handleResult(result: CatalogResult) {
		setAction(null);
		switch (result.kind) {
			case 'created-category':
				onOpen(result.category);
				break;
			case 'deleted-category':
				if (category) {
					onLeave(category.id, 'Категория удалена из шаблона.');
				}
				break;
			case 'included':
				setIncluded(result);
				break;
			case 'changed-case':
				setIncluded(null);
				break;
		}
	}

	return (
		<section className="catalog-view" aria-labelledby="catalog-title">
			{category && (
				<Button
					variant="ghost"
					size="sm"
					onPress={() => onLeave(category.id)}
					className="catalog-back"
				>
					<ArrowLeft size={15} /> Назад к категориям
				</Button>
			)}
			<header className="catalog-heading">
				{category?.path.includes('/') && (
					<p>
						{category.path
							.slice(0, category.path.lastIndexOf('/'))
							.split('/')
							.join(' › ')}
					</p>
				)}
				<h1 id="catalog-title">{category ? categoryName(category.path) : 'Тесты'}</h1>
				{!category && (
					<p>
						Новые прогоны включают все тесты. В текущий прогон можно добавить тесты из
						выбранной категории.
					</p>
				)}
			</header>
			<div className="catalog-actions">
				{category && (
					<Button onPress={() => setAction({ kind: 'create-case', category })}>
						<Plus size={16} /> Добавить тест
					</Button>
				)}
				<Button
					variant={category ? 'secondary' : 'primary'}
					onPress={() => setAction({ kind: 'create-category', parent: category })}
				>
					<FolderPlus size={16} /> {category ? 'Подкатегория' : 'Создать категорию'}
				</Button>
				{category && runId && (
					<Button
						variant="secondary"
						onPress={() => setAction({ kind: 'include', category, runId })}
					>
						<ListPlus size={16} /> Включить в прогон
					</Button>
				)}
				{category && (
					<Button
						isIconOnly
						variant="ghost"
						className="catalog-delete"
						aria-label="Удалить категорию"
						onPress={() => setAction({ kind: 'delete-category', category })}
					>
						<Trash2 size={16} />
					</Button>
				)}
			</div>
			{notice && (
				<p className="catalog-notice" role="status">
					{notice}
				</p>
			)}
			{included && category && included.runId === runId && (
				<div className="catalog-included" role="status">
					<CheckCheck size={17} />
					<span>
						{included.count
							? `Добавлено тестов: ${included.count}`
							: 'Все доступные тесты уже в прогоне.'}
					</span>
					<Button variant="ghost" size="sm" onPress={() => onShowInRun(category.path)}>
						Открыть в прогоне <ArrowRight size={14} />
					</Button>
				</div>
			)}

			<h2 className="catalog-section-title">{category ? 'Подкатегории' : 'Категории'}</h2>
			<ScrollFeed<TemplateCategory>
				queryKey={['catalog', 'categories', parentId]}
				loadPage={folders}
				getKey={(row) => row.id}
				pageClassName="catalog-folder-grid"
				empty={
					<p className="catalog-empty">
						{category ? 'Подкатегорий пока нет.' : 'Категорий пока нет.'}
					</p>
				}
			>
				{(folder) => (
					<button
						key={folder.id}
						type="button"
						className="catalog-folder"
						onClick={() => onOpen(folder)}
					>
						<span className="catalog-folder-icon">
							<Folder size={20} />
						</span>
						<span>{categoryName(folder.path)}</span>
						<ChevronRight size={16} className="catalog-chevron" />
					</button>
				)}
			</ScrollFeed>
			{category && (
				<CategoryChecks
					categoryId={category.id}
					onLeave={onLeave}
					onDelete={(test) => setAction({ kind: 'delete-case', test })}
				/>
			)}
			{action && (
				<CatalogDialog
					action={action}
					onClose={() => setAction(null)}
					onComplete={handleResult}
				/>
			)}
		</section>
	);
}

function CategoryChecks({
	categoryId,
	onLeave,
	onDelete,
}: {
	categoryId: string;
	onLeave: LevelProps['onLeave'];
	onDelete: (test: TemplateCase) => void;
}) {
	const load = useCallback(
		(after: string | null, signal: AbortSignal) => fetchCases(categoryId, after, signal),
		[categoryId],
	);

	const handleError = useCallback(
		(error: Error) => {
			if (error instanceof MissingCategoryError) {
				onLeave(categoryId, error.message);
			}
		},
		[categoryId, onLeave],
	);

	return (
		<>
			<h2 className="catalog-section-title">Проверки</h2>
			<ScrollFeed<TemplateCase>
				queryKey={['catalog', 'cases', categoryId]}
				loadPage={load}
				onError={handleError}
				getKey={(row) => row.id}
				pageClassName="catalog-check-list"
				empty={<p className="catalog-empty">В этой категории пока нет тестов.</p>}
			>
				{(test) => <CheckCard key={test.id} test={test} onDelete={() => onDelete(test)} />}
			</ScrollFeed>
		</>
	);
}
