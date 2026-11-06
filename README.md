# Община · Регрессы

Клиент для macOS и Windows на Tauri 2, React и HeroUI v3. Работает с теми же прогонами и командными токенами, что и приложение на Swift. Сервер задан в `src/shared/api/client.ts`. Изменения в прогоне видны другим тестировщикам через подписку GraphQL.

## Запуск

Понадобятся Bun, Rust и [системные инструменты Tauri](https://v2.tauri.app/start/prerequisites/) для выбранной ОС.

```sh
bun install --frozen-lockfile
bun run tauri dev
```

При первом входе введите действующий токен команды. Для Tauri используется отдельный идентификатор приложения и отдельная запись сеанса, поэтому Swift-клиент можно открыть рядом для сравнения. Оба клиента записывают изменения в рабочую базу.

## Защищённое хранилище Zustand

`createKeychainStorage(namespace)` реализует асинхронный интерфейс `StateStorage` с методами `getItem`, `setItem` и `removeItem`. На macOS данные находятся в Связке ключей. На Windows каждый ключ хранится в отдельном файле, зашифрованном системным DPAPI для текущего пользователя. Имя приложения, пространство имён и имя ключа вместе определяют запись.

Пример подключения второго независимого хранилища:

```ts
import { persist } from 'zustand/middleware';
import { create } from 'zustand';
import { createKeychainPersistStorage } from '@/shared/storage';

type Filters = {
	favorites: string[];
	setFavorites: (ids: string[]) => void;
};

export const useFilters = create<Filters>()(
	persist(
		(set) => ({
			favorites: [],
			setFavorites: (favorites) => set({ favorites }),
		}),
		{
			name: 'filters',
			storage: createKeychainPersistStorage<Pick<Filters, 'favorites'>>('workspace'),
			partialize: ({ favorites }) => ({ favorites }),
		},
	),
);
```

Сам адаптер хранит строки, в том числе пустые и Unicode. Для Zustand используйте `createKeychainPersistStorage`: объекты, массивы, `Date`, `Map`, `Set` и `BigInt` восстанавливаются с исходными типами через SuperJSON. В `partialize` выбирайте данные для сохранения, а функции оставляйте в коде стора. У отсутствующего ключа результат чтения — `null`. Ошибки доступа возвращаются вызывающему коду.

## Структура

`app` подключает тему, сетевой кеш и подписку. `pages` собирает рабочее окно. Виджеты разложены как `widgets/<сущность>/<действие>`, например `widgets/check/show` и `widgets/activity/list`. `entities` содержит запросы и состояние сущностей, `shared` — транспорт, хранилище и общие элементы. Нативная часть расположена в `src-tauri`.

```sh
bun run format:check
bun run lint
bun run build
bun run tauri build
```
