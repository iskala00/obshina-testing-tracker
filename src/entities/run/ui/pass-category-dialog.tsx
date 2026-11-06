import { useMutation } from '@tanstack/react-query';
import { ConfirmAction } from '@/shared/ui/confirm-action';
import { passCategory } from '..';

export function PassCategoryDialog({
	id,
	category,
	close,
}: {
	id: string;
	category: string;
	close: () => void;
}) {
	const mutation = useMutation({
		mutationFn: () => passCategory(id, category),
		onSuccess: close,
	});
	return (
		<ConfirmAction
			title="Закрыть непроверенные пункты?"
			label="Отметить без ошибок"
			pending={mutation.isPending}
			error={mutation.error}
			onConfirm={() => mutation.mutate()}
			onCancel={close}
		>
			<p>
				Все непроверенные пункты в «{category}» и её подкатегориях получат отметку «Без
				ошибок». Ранее найденные ошибки сохранятся.
			</p>
		</ConfirmAction>
	);
}
