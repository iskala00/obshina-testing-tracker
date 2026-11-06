import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dropdown, Modal, Tabs } from '@heroui/react';
import { Button } from '@iskala00/react/heroui';
import {
	ChevronDown,
	CircleCheck,
	CircleUserRound,
	Ellipsis,
	Pencil,
	Plus,
	Trash2,
	TriangleAlert,
} from 'lucide-react';
import {
	commentPage,
	defectPage,
	deleteEntry,
	getCheck,
	markCheck,
	statusTitle,
} from '@/entities/check';
import type { Check, CheckComment, CheckStatus, Defect, EntryKind } from '@/entities/check';
import { displayDate } from '@/entities/run';
import { ScrollFeed } from '@/shared/api/scroll-feed';
import { ConfirmAction } from '@/shared/ui/confirm-action';
import { EntryForm } from './entry-form';
import './detail.css';

type Entry = { id: string; body: string };
interface Target {
	kind: EntryKind;
	entry: Entry;
}

function EntryMenu({ edit, remove }: { edit: () => void; remove: () => void }) {
	return (
		<Dropdown>
			<Button isIconOnly size="sm" variant="ghost" aria-label="Действия с записью">
				<Ellipsis size={17} />
			</Button>
			<Dropdown.Popover>
				<Dropdown.Menu
					aria-label="Действия с записью"
					onAction={(key) => (key === 'edit' ? edit() : remove())}
				>
					<Dropdown.Item id="edit" textValue="Редактировать">
						<Pencil size={14} />
						Редактировать
					</Dropdown.Item>
					<Dropdown.Item id="delete" textValue="Удалить" variant="danger">
						<Trash2 size={14} />
						Удалить
					</Dropdown.Item>
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	);
}

export function CheckDetail({ initial, onClose }: { initial: Check; onClose: () => void }) {
	const id = initial.id;
	const query = useQuery({
		queryKey: ['checks', id, 'detail'],
		queryFn: ({ signal }) => getCheck(id, signal),
		placeholderData: initial,
	});
	const item = query.data ?? initial;
	const [thread, setThread] = useState<EntryKind>(
		initial.status === 'FAILED' ? 'defect' : 'comment',
	);
	const [editor, setEditor] = useState<{ kind: EntryKind; entry?: Entry } | null>(null);
	const [deletion, setDeletion] = useState<Target | null>(null);
	const mark = useMutation({
		mutationFn: (status: 'PASSED' | 'PENDING') => markCheck(id, status),
	});
	const remove = useMutation({
		mutationFn: (target: Target) => deleteEntry(target.kind, target.entry.id),
		onSuccess: () => setDeletion(null),
	});

	function openDeletion(target: Target) {
		remove.reset();
		setDeletion(target);
	}

	function changeStatus(status: CheckStatus) {
		if (status === 'FAILED') {
			setThread('defect');
			setEditor({ kind: 'defect' });
		} else {
			mark.mutate(status);
		}
	}

	return (
		<>
			<Modal.Backdrop
				isOpen
				onOpenChange={(open) => {
					if (!open) {
						onClose();
					}
				}}
			>
				<Modal.Container scroll="inside" size="lg">
					<Modal.Dialog className="check-dialog">
						<div className="check-scrollport">
							<div className="check-scroll-content">
								<Modal.CloseTrigger aria-label="Закрыть карточку" />
								<Modal.Header>
									<p className="check-path">
										{item.category.split('/').join(' › ')}
									</p>
									<Modal.Heading>{item.title}</Modal.Heading>
									<Dropdown>
										<Button
											size="sm"
											variant="tertiary"
											isDisabled={mark.isPending}
											aria-label={`Результат проверки: ${statusTitle[item.status]}`}
										>
											{statusTitle[item.status]} <ChevronDown size={13} />
										</Button>
										<Dropdown.Popover>
											<Dropdown.Menu
												aria-label="Результат проверки"
												disabledKeys={[item.status]}
												onAction={(key) => changeStatus(key as CheckStatus)}
											>
												{Object.entries(statusTitle).map(([key, title]) => (
													<Dropdown.Item key={key} id={key}>
														{title}
													</Dropdown.Item>
												))}
											</Dropdown.Menu>
										</Dropdown.Popover>
									</Dropdown>
								</Modal.Header>
								<Modal.Body>
									<dl className="check-instructions">
										<dt>Как проверить</dt>
										<dd>{item.steps}</dd>
										<dt>Ожидаемый результат</dt>
										<dd>{item.expected}</dd>
									</dl>
									<Tabs
										selectedKey={thread}
										onSelectionChange={(key) => setThread(key as EntryKind)}
									>
										<Tabs.ListContainer>
											<Tabs.List aria-label="Записи проверки">
												<Tabs.Tab id="defect">
													Ошибки · {item.defectCount}
													<Tabs.Indicator />
												</Tabs.Tab>
												<Tabs.Tab id="comment">
													Обсуждение · {item.commentCount}
													<Tabs.Indicator />
												</Tabs.Tab>
											</Tabs.List>
										</Tabs.ListContainer>
									</Tabs>
									{thread === 'defect' ? (
										<div className="thread-pane">
											<Button
												size="sm"
												variant="danger-soft"
												onPress={() => setEditor({ kind: 'defect' })}
											>
												<Plus size={15} />
												Добавить ошибку
											</Button>
											<ScrollFeed<Defect>
												queryKey={['checks', id, 'defects']}
												getKey={(entry) => entry.id}
												loadPage={(after, signal) =>
													defectPage(id, after, signal)
												}
												empty={
													item.status === 'FAILED' && item.error ? (
														<p className="entry-body">{item.error}</p>
													) : (
														<p className="thread-muted">
															Ошибок пока нет
														</p>
													)
												}
											>
												{(entry) => (
													<article className="thread-record">
														<header>
															<strong
																className={
																	entry.resolvedAt
																		? 'thread-muted'
																		: 'count-danger'
																}
															>
																{entry.resolvedAt ? (
																	<CircleCheck />
																) : (
																	<TriangleAlert />
																)}
																{entry.resolvedAt
																	? 'Закрыта'
																	: 'Открыта'}
															</strong>
															<time dateTime={entry.createdAt}>
																{displayDate(entry.createdAt)}
															</time>
															<EntryMenu
																edit={() =>
																	setEditor({
																		kind: 'defect',
																		entry,
																	})
																}
																remove={() =>
																	openDeletion({
																		kind: 'defect',
																		entry,
																	})
																}
															/>
														</header>
														<p className="entry-body">{entry.body}</p>
														{entry.resolvedAt && (
															<small>
																Закрыта{' '}
																{displayDate(entry.resolvedAt)}
															</small>
														)}
													</article>
												)}
											</ScrollFeed>
										</div>
									) : (
										<div className="thread-pane">
											<EntryForm kind="comment" itemId={id} />
											<ScrollFeed<CheckComment>
												queryKey={['checks', id, 'comments']}
												getKey={(entry) => entry.id}
												loadPage={(after, signal) =>
													commentPage(id, after, signal)
												}
											>
												{(entry) => (
													<article className="thread-record">
														<header>
															<strong>
																<CircleUserRound />
																{entry.author?.trim() ||
																	'Автор не указан'}
															</strong>
															<EntryMenu
																edit={() =>
																	setEditor({
																		kind: 'comment',
																		entry,
																	})
																}
																remove={() =>
																	openDeletion({
																		kind: 'comment',
																		entry,
																	})
																}
															/>
														</header>
														<time dateTime={entry.createdAt}>
															{displayDate(entry.createdAt)}
															{entry.createdAt !==
																entry.updatedAt && (
																<span
																	title={displayDate(
																		entry.updatedAt,
																	)}
																>
																	{' '}
																	· изменено
																</span>
															)}
														</time>
														<p className="entry-body">{entry.body}</p>
													</article>
												)}
											</ScrollFeed>
										</div>
									)}
									{(query.error ?? mark.error) && (
										<p role="alert">{(query.error ?? mark.error)?.message}</p>
									)}
								</Modal.Body>
								<Modal.Footer>
									<Button onPress={onClose}>Готово</Button>
								</Modal.Footer>
							</div>
						</div>
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
			{editor && (
				<Modal.Backdrop
					isOpen
					onOpenChange={(open) => {
						if (!open) {
							setEditor(null);
						}
					}}
				>
					<Modal.Container size="sm">
						<Modal.Dialog>
							<Modal.Header>
								<Modal.Heading>
									{editor.kind === 'comment'
										? 'Редактирование комментария'
										: editor.entry
											? 'Описание ошибки'
											: 'Новая ошибка'}
								</Modal.Heading>
							</Modal.Header>
							<Modal.Body>
								<EntryForm
									itemId={id}
									kind={editor.kind}
									entry={editor.entry}
									onSaved={() => setEditor(null)}
									onCancel={() => setEditor(null)}
								/>
							</Modal.Body>
						</Modal.Dialog>
					</Modal.Container>
				</Modal.Backdrop>
			)}
			{deletion && (
				<ConfirmAction
					danger
					title={
						deletion.kind === 'comment'
							? 'Удалить комментарий?'
							: 'Удалить описание ошибки?'
					}
					label="Удалить"
					pending={remove.isPending}
					error={remove.error}
					onConfirm={() => remove.mutate(deletion)}
					onCancel={() => setDeletion(null)}
				>
					<p className="entry-body">{deletion.entry.body.slice(0, 240)}</p>
				</ConfirmAction>
			)}
		</>
	);
}
