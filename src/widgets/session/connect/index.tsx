import { useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, Grid2X2, KeyRound, LockKeyhole } from 'lucide-react';
import { Button, TextField } from '@iskala00/react/heroui';
import { connect, disconnect, restoreSession, useSession } from '@/entities/session';
import { CommunityBrand } from '@/shared/ui/Brand';

function ChecklistArtwork() {
	return (
		<div className="check-art" aria-hidden>
			<div className="check-art-back">
				<Grid2X2 size={17} />
			</div>
			<div className="check-art-front">
				{[true, true, false].map((done, index) => (
					<div key={index}>
						{done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
						<i />
					</div>
				))}
			</div>
		</div>
	);
}

export function ConnectionView() {
	const { phase, error } = useSession();
	const [token, setToken] = useState('');
	const busy = phase === 'checking' || phase === 'restoring';
	const retry = phase === 'locked' || phase === 'unavailable';

	return (
		<main className="welcome">
			<div className="welcome-columns">
				<section className="welcome-intro">
					<CommunityBrand />
					<ChecklistArtwork />
					<h1>Регрессы</h1>
					<p>Проверки мобильного приложения, ошибки и обсуждения команды.</p>
				</section>
				<section className="connection-card">
					<h2>{retry ? 'Не удалось подключиться' : 'Подключение'}</h2>
					{retry ? (
						<>
							<p role="alert">{error}</p>
							<div className="connection-actions">
								<Button onPress={() => void restoreSession()}>Повторить</Button>
								<Button variant="secondary" onPress={() => void disconnect()}>
									Выйти
								</Button>
							</div>
						</>
					) : (
						<form
							onSubmit={(event) => {
								event.preventDefault();
								if (!busy) {
									void connect(token);
								}
							}}
						>
							<p>Введите токен вашей команды.</p>
							<TextField
								autoComplete="off"
								name="token"
								type="password"
								label="Токен команды"
								placeholder="Вставьте токен"
								value={token}
								onChange={setToken}
								isDisabled={busy}
								prefix={<KeyRound size={16} aria-hidden />}
							/>
							{error && (
								<div role="alert" className="auth-error">
									{error}
								</div>
							)}
							<Button
								type="submit"
								isPending={busy}
								isDisabled={!token.trim() || busy}
							>
								{busy ? 'Подключение…' : 'Подключиться'} <ArrowRight size={16} />
							</Button>
							<small>
								<LockKeyhole size={13} />
								Токен хранится в защищённом хранилище системы.
							</small>
						</form>
					)}
				</section>
			</div>
		</main>
	);
}
