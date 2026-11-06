import { useId, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@iskala00/react/heroui';
import { TextArea } from '@heroui/react';
import { addEntry, editEntry } from '@/entities/check';
import type { EntryKind } from '@/entities/check';

interface EntryFormProps {
	itemId: string;
	kind: EntryKind;
	entry?: { id: string; body: string };
	onSaved?: () => void;
	onCancel?: () => void;
}

export function EntryForm({ itemId, kind, entry, onSaved, onCancel }: EntryFormProps) {
	const labelId = useId();
	const [body, setBody] = useState(entry?.body ?? '');
	const [key, setKey] = useState(() => crypto.randomUUID());
	const label = kind === 'comment' ? 'Комментарий' : 'Описание ошибки';
	const mutation = useMutation({
		mutationFn: () =>
			entry
				? editEntry(kind, entry.id, body.trim())
				: addEntry(kind, itemId, body.trim(), key),
		onSuccess: () => {
			setBody('');
			setKey(crypto.randomUUID());
			onSaved?.();
		},
	});

	return (
		<form
			className="entry-form"
			onSubmit={(event) => {
				event.preventDefault();
				if (body.trim() && !mutation.isPending) {
					mutation.mutate();
				}
			}}
		>
			<label id={labelId}>{label}</label>
			<TextArea
				aria-labelledby={labelId}
				autoFocus={kind === 'defect' || !!entry}
				value={body}
				rows={3}
				maxLength={8000}
				disabled={mutation.isPending}
				placeholder={
					kind === 'comment' ? 'Добавить комментарий' : 'Что произошло и на каком шаге?'
				}
				onChange={(event) => {
					setBody(event.target.value);
					setKey(crypto.randomUUID());
					if (mutation.isError) {
						mutation.reset();
					}
				}}
				onKeyDown={(event) => {
					if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
						event.preventDefault();
						event.currentTarget.form?.requestSubmit();
					}
				}}
			/>
			{mutation.error && <p role="alert">{mutation.error.message}</p>}
			<div className="entry-buttons">
				{onCancel && (
					<Button
						size="sm"
						variant="secondary"
						onPress={onCancel}
						isDisabled={mutation.isPending}
					>
						Отмена
					</Button>
				)}
				<Button
					size="sm"
					type="submit"
					isPending={mutation.isPending}
					isDisabled={!body.trim()}
				>
					{entry || kind === 'defect' ? 'Сохранить' : 'Отправить'}
				</Button>
			</div>
		</form>
	);
}
