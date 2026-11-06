import { hashKey, useQuery } from '@tanstack/react-query';
import { Button } from '@iskala00/react/heroui';
import { Fragment, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface FeedPage<T> {
	nodes: T[];
	nextCursor: string | null;
}

interface ScrollFeedProps<T> {
	queryKey: readonly unknown[];
	loadPage: (after: string | null, signal: AbortSignal) => Promise<FeedPage<T>>;
	getKey: (entry: T) => string;
	children: (entry: T) => ReactNode;
	empty?: ReactNode;
	onError?: (error: Error) => void;
	className?: string;
	pageClassName?: string;
	renderPage?: (entries: T[], previous: T | undefined) => ReactNode;
}

function useNearViewport(initial: boolean) {
	const ref = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(initial);

	useEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
			rootMargin: '120px 0px',
		});
		observer.observe(element);

		return () => observer.disconnect();
	}, []);

	return { ref, visible };
}

interface SliceProps<T> extends ScrollFeedProps<T> {
	after: string | null;
	seen: ReadonlySet<string>;
	cursors: ReadonlySet<string>;
	previous?: T;
}

function Slice<T>(props: SliceProps<T>) {
	const {
		queryKey,
		loadPage,
		after,
		getKey,
		children,
		empty,
		pageClassName,
		renderPage,
		onError,
	} = props;
	const page = useNearViewport(true);
	const tail = useNearViewport(false);
	const [openedCursor, setOpenedCursor] = useState<string | null>(null);

	const query = useQuery({
		queryKey: [...queryKey, 'page', after],
		queryFn: ({ signal }) => loadPage(after, signal),
		enabled: page.visible,
	});
	const cursor = query.data?.nextCursor ?? null;

	useEffect(() => {
		if (tail.visible && cursor) {
			setOpenedCursor(cursor);
		}
	}, [cursor, tail.visible]);

	useEffect(() => {
		if (query.error) {
			onError?.(query.error);
		}
	}, [onError, query.error]);

	const seen = new Set(props.seen);
	const entries = (query.data?.nodes ?? []).filter((entry) => {
		const id = getKey(entry);
		if (seen.has(id)) {
			return false;
		}
		seen.add(id);
		return true;
	});

	const cursors = new Set(props.cursors);
	if (after) {
		cursors.add(after);
	}

	return (
		<>
			<div ref={page.ref} className={pageClassName} style={{ minHeight: 1 }}>
				{query.isLoading && (
					<span role="status" className="feed-hint">
						Загрузка…
					</span>
				)}
				{query.error && (
					<div role="alert">
						<p>{query.error.message}</p>
						<Button size="sm" variant="secondary" onPress={() => void query.refetch()}>
							Повторить
						</Button>
					</div>
				)}
				{renderPage
					? renderPage(entries, props.previous)
					: entries.map((entry) => (
							<Fragment key={getKey(entry)}>{children(entry)}</Fragment>
						))}
				{!after && !cursor && query.isSuccess && entries.length === 0 && empty}
			</div>
			<div ref={tail.ref} aria-hidden="true" style={{ height: 1, pointerEvents: 'none' }} />
			{cursor && cursor === openedCursor && !cursors.has(cursor) && (
				<Slice
					{...props}
					key={cursor}
					after={cursor}
					seen={seen}
					cursors={cursors}
					previous={entries.at(-1) ?? props.previous}
				/>
			)}
		</>
	);
}

/** An unmounted or offscreen slice does not refetch on every live update. */
export function ScrollFeed<T>(props: ScrollFeedProps<T>) {
	return (
		<div className={props.className}>
			<Slice
				{...props}
				key={hashKey(props.queryKey)}
				after={null}
				seen={new Set()}
				cursors={new Set()}
			/>
		</div>
	);
}
