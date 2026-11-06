import { graphQL } from '@/shared/api';

export interface TemplateCategory {
	id: string;
	path: string;
}

export interface TemplateCase {
	id: string;
	title: string;
	steps: string;
	expected: string;
}

interface CatalogPage<T> {
	nodes: T[];
	nextCursor: string | null;
}

export class MissingCategoryError extends Error {
	constructor() {
		super('Эта категория была удалена из шаблона.');
	}
}

export async function fetchCategories(
	parentId: string | null,
	after: string | null,
	signal: AbortSignal,
) {
	const result = await graphQL<{ categories: CatalogPage<TemplateCategory> }>(
		`query CatalogFolders($parentId: ID, $after: ID) {
			categories(parentId: $parentId, after: $after, limit: 30, menuOrder: true) {
				nodes { id path }
				nextCursor
			}
		}`,
		{ parentId, after },
		signal,
	);

	return result.categories;
}

export async function fetchCases(categoryId: string, after: string | null, signal: AbortSignal) {
	const result = await graphQL<{
		cases: CatalogPage<TemplateCase> & { categoryExists: boolean };
	}>(
		`query CatalogChecks($categoryId: ID!, $after: ID) {
			cases(categoryId: $categoryId, after: $after, limit: 30, newestFirst: true) {
				categoryExists
				nodes { id title steps expected }
				nextCursor
			}
		}`,
		{ categoryId, after },
		signal,
	);

	if (!result.cases.categoryExists) {
		throw new MissingCategoryError();
	}

	return result.cases;
}

export async function createCategory(parentId: string | null, name: string) {
	const result = await graphQL<{ createCategory: TemplateCategory }>(
		`mutation CreateCatalogFolder($parentId: ID, $name: String!) {
			createCategory(parentId: $parentId, name: $name) { id path }
		}`,
		{ parentId, name },
	);

	return result.createCategory;
}

export async function createCase(
	categoryId: string,
	title: string,
	steps: string,
	expected: string,
) {
	return graphQL<{ createCase: TemplateCase }>(
		`mutation CreateCatalogCheck($categoryId: ID!, $title: String!, $steps: String!, $expected: String!) {
			createCase(categoryId: $categoryId, title: $title, steps: $steps, expected: $expected) {
				id title steps expected
			}
		}`,
		{ categoryId, title, steps, expected },
	);
}

export function deleteCategory(id: string) {
	return graphQL<{ deleteCategory: boolean }>(
		'mutation DeleteCatalogFolder($id: ID!) { deleteCategory(id: $id) }',
		{ id },
	);
}

export function deleteCase(id: string) {
	return graphQL<{ deleteCase: boolean }>(
		'mutation DeleteCatalogCheck($id: ID!) { deleteCase(id: $id) }',
		{ id },
	);
}

export function categoryName(path: string) {
	return path.slice(path.lastIndexOf('/') + 1);
}
