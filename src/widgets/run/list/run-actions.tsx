import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@heroui/react';
import { Button, TextField } from '@iskala00/react/heroui';
import { LayersPlus } from 'lucide-react';
import { closeNewRun, createRun, includeTests, selectRunCategory } from '@/entities/run';
import { ConfirmAction } from '@/shared/ui/confirm-action';

export function NewRunDialog() {
	const [title, setTitle] = useState(
		() =>
			'Регресс · ' +
			new Date().toLocaleDateString('ru-RU', {
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			}),
	);
	const [requestId, setRequestId] = useState(() => crypto.randomUUID());
	const [confirming, setConfirming] = useState(false);
	const mutation = useMutation({
		mutationFn: () => createRun(title.trim(), requestId),
		onSuccess: (run) => {
			selectRunCategory(run.id, null);
			closeNewRun();
		},
	});

	if (confirming) {
		return (
			<ConfirmAction
				title="Вы точно хотите создать новый регресс?"
				label="Создать регресс"
				pending={mutation.isPending}
				error={mutation.error}
				onConfirm={() => mutation.mutate()}
				onCancel={() => setConfirming(false)}
			>
				<p>{title}</p>
			</ConfirmAction>
		);
	}

	return (
		<Modal.Backdrop
			isOpen
			onOpenChange={(open) => {
				if (!open) {
					closeNewRun();
				}
			}}
		>
			<Modal.Container size="sm">
				<Modal.Dialog>
					<Modal.Header>
						<Modal.Heading>Новый регресс</Modal.Heading>
					</Modal.Header>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							if (title.trim()) {
								setConfirming(true);
							}
						}}
					>
						<Modal.Body>
							<TextField
								autoFocus
								isRequired
								label="Название прогона"
								value={title}
								maxLength={160}
								onChange={(value) => {
									setTitle(value);
									setRequestId(crypto.randomUUID());
									mutation.reset();
								}}
							/>
							<p>
								Новый прогон начнётся с чистого чек-листа. Предыдущие результаты
								останутся в истории.
							</p>
						</Modal.Body>
						<Modal.Footer>
							<Button variant="secondary" onPress={closeNewRun}>
								Отмена
							</Button>
							<Button type="submit" isDisabled={!title.trim()}>
								Создать…
							</Button>
						</Modal.Footer>
					</form>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	);
}

export function IncludeTestsButton({ runId }: { runId: string }) {
	const [confirming, setConfirming] = useState(false);
	const mutation = useMutation({
		mutationFn: () => includeTests(runId, null),
		onSuccess: () => {
			selectRunCategory(runId, null);
			setConfirming(false);
		},
	});
	return (
		<>
			<Button
				className="run-import"
				size="sm"
				variant="secondary"
				onPress={() => {
					mutation.reset();
					setConfirming(true);
				}}
			>
				<LayersPlus size={14} />
				Добавить из тестов
			</Button>
			{mutation.isSuccess && (
				<small role="status">
					{mutation.data
						? `Добавлено тестов: ${mutation.data}`
						: 'Все тесты уже в прогоне.'}
				</small>
			)}
			{confirming && (
				<ConfirmAction
					title="Добавить тесты в прогон?"
					label="Добавить"
					pending={mutation.isPending}
					error={mutation.error}
					onConfirm={() => mutation.mutate()}
					onCancel={() => setConfirming(false)}
				>
					<p>
						Из каталога будут добавлены недостающие тесты. Результаты уже включённых
						тестов сохранятся.
					</p>
				</ConfirmAction>
			)}
		</>
	);
}
