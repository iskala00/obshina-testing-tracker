import { graphQL } from '@/shared/api';
import type { FeedPage } from '@/shared/api/scroll-feed';

export type CheckStatus = 'PENDING' | 'PASSED' | 'FAILED';
export const statusTitle: Record<CheckStatus, string> = {
	PENDING: 'Не проверено',
	PASSED: 'Без ошибок',
	FAILED: 'Ошибка',
};

export interface Check {
	id: string;
	category: string;
	title: string;
	steps: string;
	expected: string;
	status: CheckStatus;
	error: string;
	commentCount: number;
	defectCount: number;
}

export interface CheckComment {
	id: string;
	body: string;
	author: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Defect {
	id: string;
	body: string;
	createdAt: string;
	resolvedAt: string | null;
}

const checkFields = 'id category title steps expected status error commentCount defectCount';

export async function checkPage(
	runId: string,
	category: string | null,
	status: CheckStatus | null,
	search: string,
	after: string | null,
	signal?: AbortSignal,
) {
	const result = await graphQL<{ itemPage: FeedPage<Check> }>(
		`query Checks($runId: ID!, $category: String, $status: CheckStatus, $search: String, $after: ID) {
			itemPage(runId: $runId, category: $category, status: $status, search: $search, after: $after, limit: 30) {
				nodes { ${checkFields} } nextCursor
			}
		}`,
		{ runId, category, status, search: search || null, after },
		signal,
	);
	return result.itemPage;
}

export async function getCheck(id: string, signal?: AbortSignal) {
	const data = await graphQL<{ item: Check }>(
		`query Check($id: ID!) { item(id: $id) { ${checkFields} } }`,
		{ id },
		signal,
	);
	return data.item;
}

export async function markCheck(id: string, status: Exclude<CheckStatus, 'FAILED'>) {
	await graphQL(
		'mutation Mark($id: ID!, $status: CheckStatus!) { markItem(id: $id, status: $status, error: "") }',
		{ id, status },
	);
}

export async function commentPage(itemId: string, after: string | null, signal: AbortSignal) {
	const result = await graphQL<{ commentsPage: FeedPage<CheckComment> }>(
		`query Comments($itemId: ID!, $after: ID) {
			commentsPage(itemId: $itemId, after: $after, limit: 30) { nodes { id body author createdAt updatedAt } nextCursor }
		}`,
		{ itemId, after },
		signal,
	);
	return result.commentsPage;
}

export async function defectPage(itemId: string, after: string | null, signal: AbortSignal) {
	const result = await graphQL<{ defectsPage: FeedPage<Defect> }>(
		`query Defects($itemId: ID!, $after: ID) {
			defectsPage(itemId: $itemId, after: $after, limit: 30) { nodes { id body createdAt resolvedAt } nextCursor }
		}`,
		{ itemId, after },
		signal,
	);
	return result.defectsPage;
}

export type EntryKind = 'comment' | 'defect';

const operations = {
	comment: { add: 'addComment', edit: 'editComment', delete: 'deleteComment' },
	defect: { add: 'addDefect', edit: 'editDefect', delete: 'deleteDefect' },
} as const;

export async function addEntry(kind: EntryKind, itemId: string, body: string, requestId: string) {
	const itemArgument = kind === 'comment' ? 'id' : 'itemId';
	await graphQL(
		`mutation Add($itemId: ID!, $body: String!, $key: ID!) { ${operations[kind].add}(${itemArgument}: $itemId, body: $body, requestId: $key) }`,
		{ itemId, body, key: requestId },
	);
}

export async function editEntry(kind: EntryKind, id: string, body: string) {
	await graphQL(
		`mutation Edit($id: ID!, $body: String!) { ${operations[kind].edit}(id: $id, body: $body) }`,
		{ id, body },
	);
}

export async function deleteEntry(kind: EntryKind, id: string) {
	await graphQL(`mutation Delete($id: ID!) { ${operations[kind].delete}(id: $id) }`, { id });
}
