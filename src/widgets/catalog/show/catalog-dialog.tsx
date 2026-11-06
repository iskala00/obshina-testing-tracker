import { useId, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Input, Label, Modal, TextArea, TextField } from '@heroui/react';
import { Button, Form } from '@iskala00/react/heroui';
import { includeTests } from '@/entities/run';
import { ConfirmAction } from '@/shared/ui/confirm-action';
import {
	createCase,
	createCategory,
	deleteCase,
	deleteCategory,
	type TemplateCase,
	type TemplateCategory,
} from '@/entities/catalog';

export type CatalogAction =
	| { kind: 'create-category'; parent: TemplateCategory | null }
	| { kind: 'create-case'; category: TemplateCategory }
	| { kind: 'delete-category'; category: TemplateCategory }
	| { kind: 'delete-case'; test: TemplateCase }
	| { kind: 'include'; category: TemplateCategory; runId: string };

export type CatalogResult =
	| { kind: 'created-category'; category: TemplateCategory }
	| { kind: 'deleted-category' }
	| { kind: 'included'; count: number; runId: string }
	| { kind: 'changed-case' };

interface DialogProps {
	action: CatalogAction;
	onClose: () => void;
	onComplete: (result: CatalogResult) => void;
}

function dialogTitle(action: CatalogAction) {
	switch (action.kind) {
		case 'create-category':
			return action.parent ? 'Новая подкатегория' : 'Новая категория';
		case 'create-case':
			return 'Новый тест';
		case 'delete-category':
			return 'Удалить категорию и её содержимое?';
		case 'delete-case':
			return 'Удалить тест из шаблона?';
		case 'include':
			return 'Добавить тесты в текущий прогон?';
	}
}

function contextMessage(action: CatalogAction) {
	switch (action.kind) {
		case 'create-category':
			return action.parent?.path;
		case 'create-case':
			return action.category.path;
		case 'delete-category':
			return `«${action.category.path}», все её подкатегории и тесты будут удалены из шаблона. История прогонов сохранится.`;
		case 'delete-case':
			return `Тест «${action.test.title}» будет удалён из шаблона. Результаты предыдущих прогонов сохранятся.`;
		case 'include':
			return `Добавятся недостающие тесты из «${action.category.path}» и её подкатегорий. Уже выставленные отметки и комментарии сохранятся.`;
	}
}

export function CatalogDialog({ action, onClose, onComplete }: DialogProps) {
	const formId = useId();
	const [title, setTitle] = useState('');
	const [steps, setSteps] = useState('');
	const [expected, setExpected] = useState('');
	const creating = action.kind === 'create-category' || action.kind === 'create-case';
	const deleting = action.kind === 'delete-case' || action.kind === 'delete-category';
	const message = contextMessage(action);

	const mutation = useMutation({
		mutationFn: async (): Promise<CatalogResult> => {
			switch (action.kind) {
				case 'create-category': {
					const category = await createCategory(action.parent?.id ?? null, title.trim());
					return { kind: 'created-category', category };
				}
				case 'create-case':
					await createCase(
						action.category.id,
						title.trim(),
						steps.trim(),
						expected.trim(),
					);
					return { kind: 'changed-case' };
				case 'delete-category':
					await deleteCategory(action.category.id);
					return { kind: 'deleted-category' };
				case 'delete-case':
					await deleteCase(action.test.id);
					return { kind: 'changed-case' };
				case 'include': {
					const count = await includeTests(action.runId, action.category.path);
					return { kind: 'included', count, runId: action.runId };
				}
			}
		},
	});

	function save() {
		if (mutation.isPending) {
			return;
		}

		mutation.mutate(undefined, { onSuccess: onComplete });
	}

	if (!creating) {
		return (
			<ConfirmAction
				title={dialogTitle(action)}
				label={deleting ? 'Удалить' : 'Добавить'}
				pending={mutation.isPending}
				error={mutation.error}
				danger={deleting}
				onConfirm={save}
				onCancel={onClose}
			>
				{message}
			</ConfirmAction>
		);
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		save();
	}

	const invalidName =
		action.kind === 'create-category' && (title.includes('/') || /[\r\n\t]/u.test(title));
	const incomplete =
		!title.trim() || (action.kind === 'create-case' && (!steps.trim() || !expected.trim()));

	return (
		<Modal.Backdrop
			isOpen
			isDismissable={!mutation.isPending}
			isKeyboardDismissDisabled={mutation.isPending}
			onOpenChange={(open) => {
				if (!open && !mutation.isPending) {
					onClose();
				}
			}}
		>
			<Modal.Container>
				<Modal.Dialog className="catalog-dialog">
					<Modal.Header>
						<Modal.Heading>{dialogTitle(action)}</Modal.Heading>
					</Modal.Header>
					<Modal.Body>
						<Form
							id={formId}
							className="catalog-dialog-form"
							onSubmit={submit}
							error={mutation.error}
						>
							{message && <p className="catalog-dialog-description">{message}</p>}
							<TextField
								name="title"
								value={title}
								onChange={setTitle}
								isRequired
								isDisabled={mutation.isPending}
								isInvalid={invalidName}
							>
								<Label>Название</Label>
								<Input
									autoFocus
									maxLength={action.kind === 'create-category' ? 120 : 200}
								/>
							</TextField>
							{invalidName && (
								<p className="catalog-error">
									Введите название без косой черты и переносов строки.
								</p>
							)}
							{action.kind === 'create-case' && (
								<>
									<TextField
										name="steps"
										value={steps}
										onChange={setSteps}
										isRequired
										isDisabled={mutation.isPending}
									>
										<Label>Как проверить</Label>
										<TextArea rows={3} maxLength={8000} />
									</TextField>
									<TextField
										name="expected"
										value={expected}
										onChange={setExpected}
										isRequired
										isDisabled={mutation.isPending}
									>
										<Label>Ожидаемый результат</Label>
										<TextArea rows={3} maxLength={8000} />
									</TextField>
								</>
							)}
							{mutation.error && (
								<p role="alert" className="catalog-error">
									{mutation.error.message}
								</p>
							)}
						</Form>
					</Modal.Body>
					<Modal.Footer>
						<Button
							variant="tertiary"
							isDisabled={mutation.isPending}
							onPress={onClose}
						>
							Отмена
						</Button>
						<Button
							type="submit"
							form={formId}
							variant="primary"
							isPending={mutation.isPending}
							isDisabled={incomplete || invalidName}
						>
							Создать
						</Button>
					</Modal.Footer>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	);
}
