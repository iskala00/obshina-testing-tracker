import { AlertDialog } from '@heroui/react';
import { Button } from '@iskala00/react/heroui';
import type { ReactNode } from 'react';

interface ConfirmActionProps {
	title: string;
	children: ReactNode;
	label: string;
	pending: boolean;
	danger?: boolean;
	error?: Error | null;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmAction({
	title,
	children,
	label,
	pending,
	danger,
	error,
	onConfirm,
	onCancel,
}: ConfirmActionProps) {
	return (
		<AlertDialog.Backdrop
			isOpen
			isDismissable={!pending}
			isKeyboardDismissDisabled={pending}
			onOpenChange={(open) => {
				if (!open && !pending) {
					onCancel();
				}
			}}
		>
			<AlertDialog.Container size="sm">
				<AlertDialog.Dialog>
					<AlertDialog.Header>
						<AlertDialog.Heading>{title}</AlertDialog.Heading>
					</AlertDialog.Header>
					<AlertDialog.Body>
						{children}
						{error && <p role="alert">{error.message}</p>}
					</AlertDialog.Body>
					<AlertDialog.Footer>
						<Button variant="secondary" isDisabled={pending} onPress={onCancel}>
							Отмена
						</Button>
						<Button
							variant={danger ? 'danger' : 'primary'}
							isPending={pending}
							onPress={onConfirm}
						>
							{label}
						</Button>
					</AlertDialog.Footer>
				</AlertDialog.Dialog>
			</AlertDialog.Container>
		</AlertDialog.Backdrop>
	);
}
