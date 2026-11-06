import { Button } from '@iskala00/react/heroui';
import { Trash2 } from 'lucide-react';
import type { TemplateCase } from '@/entities/catalog';

interface Props {
	test: TemplateCase;
	onDelete: () => void;
}

export function CheckCard({ test, onDelete }: Props) {
	return (
		<article className="catalog-check-card">
			<header>
				<h3>{test.title}</h3>
				<Button
					isIconOnly
					size="sm"
					variant="ghost"
					className="catalog-delete"
					aria-label={`Удалить тест «${test.title}»`}
					onPress={onDelete}
				>
					<Trash2 size={16} />
				</Button>
			</header>
			<dl>
				<dt>Как проверить</dt>
				<dd>{test.steps}</dd>
				<dt>Ожидаемый результат</dt>
				<dd>{test.expected}</dd>
			</dl>
		</article>
	);
}
