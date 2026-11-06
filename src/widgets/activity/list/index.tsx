import { Clock3, UserRound } from 'lucide-react';
import { actionLabel, fetchActivity, type Activity } from '@/entities/activity';
import { ScrollFeed } from '@/shared/api/scroll-feed';
import './activity.css';

const timestamp = new Intl.DateTimeFormat('ru-RU', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
});

export function ActivityView() {
	return (
		<section className="activity-view" aria-labelledby="activity-title">
			<h1 id="activity-title">Журнал действий</h1>

			<ScrollFeed<Activity>
				queryKey={['activity']}
				loadPage={fetchActivity}
				getKey={(entry) => entry.id}
				pageClassName="activity-list"
				empty={
					<p className="activity-empty">
						<Clock3 size={18} /> В журнале пока нет действий.
					</p>
				}
			>
				{(entry) => (
					<article className="activity-entry" key={entry.id}>
						<span className="activity-avatar" aria-hidden="true">
							{entry.actor.trim().slice(0, 1).toLocaleUpperCase('ru') || (
								<UserRound size={16} />
							)}
						</span>
						<div className="activity-content">
							<header className="activity-byline">
								<strong>{entry.actor}</strong>
								<time dateTime={entry.createdAt}>
									{timestamp.format(new Date(entry.createdAt))}
								</time>
							</header>
							<h2>{actionLabel(entry.action)}</h2>
							<p>{entry.detail}</p>
						</div>
					</article>
				)}
			</ScrollFeed>
		</section>
	);
}
