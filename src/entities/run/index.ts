import { create } from 'zustand';
import { graphQL } from '@/shared/api';
import type { FeedPage } from '@/shared/api/scroll-feed';

export interface Run {
	id: string;
	title: string;
	createdAt: string;
}

export interface Totals {
	total: number;
	pending: number;
	failed: number;
}

export interface RunCategory extends Totals {
	path: string;
	hasChildren: boolean;
}

interface Selection {
	runId: string | null;
	category: string | null;
	newRunOpen: boolean;
}

const emptySelection: Selection = { runId: null, category: null, newRunOpen: false };
export const useRunSelection = create<Selection>(() => emptySelection);

export function selectRunCategory(runId: string, path: string | null) {
	useRunSelection.setState({ runId, category: path });
}

export function resetRunSelection() {
	useRunSelection.setState(emptySelection);
}

export function requestNewRun() {
	useRunSelection.setState({ newRunOpen: true });
}

export function closeNewRun() {
	useRunSelection.setState({ newRunOpen: false });
}

export const historyKey = ['runs', 'history'] as const;

export async function runPage(after: string | null, signal?: AbortSignal): Promise<FeedPage<Run>> {
	const result = await graphQL<{ runPage: FeedPage<Run> }>(
		`query History($after: ID) {
			runPage(after: $after, limit: 30) { nodes { id title createdAt } nextCursor }
		}`,
		{ after },
		signal,
	);
	return result.runPage;
}

export async function runHeader(id: string, signal?: AbortSignal) {
	const result = await graphQL<{ run: Run }>(
		'query Header($id: ID!) { run(id: $id) { id title createdAt } }',
		{ id },
		signal,
	);
	return result.run;
}

export async function runStats(id: string, category: string | null, signal?: AbortSignal) {
	const result = await graphQL<{ runStats: Totals }>(
		'query Summary($id: ID!, $category: String) { runStats(runId: $id, category: $category) { total pending failed } }',
		{ id, category },
		signal,
	);
	return result.runStats;
}

export async function categoryPage(
	id: string,
	parent: string,
	after: string | null,
	signal: AbortSignal,
) {
	const result = await graphQL<{ runCategories: FeedPage<RunCategory> }>(
		`query Branch($id: ID!, $parent: String!, $after: ID) {
			runCategories(runId: $id, parent: $parent, after: $after, limit: 30) {
				nodes { path total pending failed hasChildren }
				nextCursor
			}
		}`,
		{ id, parent, after },
		signal,
	);
	return result.runCategories;
}

export async function createRun(title: string, requestId: string) {
	const result = await graphQL<{ createRun: Run }>(
		'mutation NewRun($title: String!, $key: ID!) { createRun(title: $title, requestId: $key) { id title createdAt } }',
		{ title, key: requestId },
	);
	return result.createRun;
}

export async function passCategory(id: string, category: string) {
	await graphQL(
		'mutation Pass($id: ID!, $category: String!) { passCategory(runId: $id, category: $category) }',
		{ id, category },
	);
}

export async function includeTests(id: string, category: string | null) {
	const result = await graphQL<{ addCatalogTests: number }>(
		'mutation Include($id: ID!, $category: String) { addCatalogTests(runId: $id, category: $category) }',
		{ id, category },
	);
	return result.addCatalogTests;
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
});
export function displayDate(value: string) {
	return dateFormatter.format(new Date(value));
}
