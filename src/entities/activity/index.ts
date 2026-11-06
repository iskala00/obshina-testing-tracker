import { graphQL } from '@/shared/api';

export interface Activity {
	id: string;
	actor: string;
	action: string;
	detail: string;
	createdAt: string;
}

const actionLabels: Record<string, string> = {
	TOKEN_CREATED: 'Выдан токен',
	TOKEN_REVOKED: 'Отозван токен',
	RUN_CREATED: 'Создан прогон',
	RUN_TESTS_ADDED: 'Тесты включены в прогон',
	ITEM_MARKED: 'Обновлён результат проверки',
	CATEGORY_PASSED: 'Закрыта категория',
	DEFECT_ADDED: 'Добавлена ошибка',
	DEFECT_EDITED: 'Изменено описание ошибки',
	DEFECT_DELETED: 'Удалена ошибка',
	COMMENT_ADDED: 'Добавлен комментарий',
	COMMENT_EDITED: 'Изменён комментарий',
	COMMENT_DELETED: 'Удалён комментарий',
	CATEGORY_CREATED: 'Создана категория',
	CATEGORY_DELETED: 'Удалена категория',
	CASE_CREATED: 'Добавлен тест',
	CASE_DELETED: 'Удалён тест',
};

export function actionLabel(action: string) {
	return actionLabels[action] ?? action;
}

export async function fetchActivity(after: string | null, signal: AbortSignal) {
	const result = await graphQL<{ activity: { nodes: Activity[]; nextCursor: string | null } }>(
		`query ActivityFeed($after: ID) {
			activity(after: $after, limit: 30) {
				nodes { id actor action detail createdAt }
				nextCursor
			}
		}`,
		{ after },
		signal,
	);

	return result.activity;
}
