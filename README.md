# DB Optimizer — веб-интерфейс

Ветка `extras/async-rotation` продолжает `extras/indexes`: каталог и количество результатов берутся из PostgreSQL через NestJS API, порядком ленты управляет сервер через Redis. Эта версия добавляет 3D-просмотр GLB и Short Polling. [Демо GitHub Pages](https://sachaxodev.github.io/database-query-optimizer-frontend/) по-прежнему относится к ветке `main`.

## Запуск

1. В локальном [репозитории бэкенда](https://github.com/SachaXoDev/Khodina_IU5-51B_Web_Labs_2026_Database_query_optimizer) используйте ветку `extras/async-rotation`. По разделам «Дополнительное задание: индексы, пагинация и Redis» и «Дополнительное задание: асинхронный поворот GLB» в `database_query_optimizer/README.md` поднимите NestJS (`127.0.0.1:3108`), PostgreSQL, Redis, MinIO и Python-воркер (`127.0.0.1:8108`). Для NestJS задайте `ASYNC_ROTATION_URL=http://127.0.0.1:8108/rotate` и передайте один `ROTATION_RESULT_KEY` через окружение обоим процессам. Используйте новую демонстрационную БД: при первоначальном заполнении карточки получают встроенную GLB, а прежние записи не обновляются. Для проверки пагинации после инициализации схемы запустите `scripts/demo_optimizer_seed.sql` этой ветки.
2. В корне этого репозитория с Node.js 22.12+:

   ```sh
   npm ci
   npm run lint
   npm run build
   npm run dev
   ```

   Откройте <http://127.0.0.1:5175>. Vite проксирует `/api`, `/media`, `/assets/default_index.svg` и `/assets/demo-index-model.glb` на NestJS как в `dev`, так и в `preview`. Если NestJS слушает другой адрес, задайте `API_PROXY_TARGET`, например `API_PROXY_TARGET=http://127.0.0.1:3000 npm run dev`.

## Проверка в браузере

1. Откройте `/?cardinality=420042`. После загрузки демонстрационных данных ожидается 750 совпадений и 32 страницы. В Network должен быть `GET /api/indexes?limit=24&offset=0&minCardinality=420042`. Нажмите «Далее» внизу списка и проверьте `offset=24`, затем последнюю страницу (`offset=744`, 6 карточек). При сбросе фильтра каталог возвращается на первую страницу без `minCardinality`. Несмотря на имя параметра, сервер фильтрует по точному равенству.
2. Откройте карточку и убедитесь, что `/detail/:id` читает `GET /api/indexes/:id`. В ленте `/feed` проверьте `GET /api/indexes/feed`. Нажмите «Далее» один раз: `GET /api/indexes/feed?next=true&id=…` продвигает Redis-курсор и запускает отложенный поворот новой карточки. Следующие `GET /api/indexes/feed?id=…` идут примерно каждые 1,5 с с ID новой карточки **без** `next`; курсор не меняется. При задержке воркера 6 с углы `rotationX`/`rotationY` в ответе и положение модели на экране должны измениться за 6–9 с без новой загрузки GLB. На деталях также опрашивается только открытая карточка. Выйдите в каталог и убедитесь, что опрос прекращается. Для прямой сверки HTTP с Redis запустите из корня бэкенда `python3 scripts/verify-feed.py --redis-port <порт Redis>` на отдельном демостенде.
3. В браузере с WebGL 2 модель отображается в ленте и деталях; пока она грузится, при её отсутствии или ошибке загрузки остаётся обложка. Для проверки загрузки файлов зарегистрируйтесь и опубликуйте черновик через `/create` с `.glb` (например, `database_query_optimizer/public/assets/demo-index-model.glb` из бэкенда). Модель и изображение необязательны (до 50 МиБ каждое). Для GLB по подписанному URL MinIO должен быть доступен браузеру и разрешать GET через CORS с origin фронтенда (`http://127.0.0.1:5175` при запуске выше).

## Раздача сборки

При раздаче `dist/` настройте SPA fallback на `index.html` для `/feed`, `/detail/:id`, `/create`, `/login`, `/register` и прокси для API и серверных медиа. Отдавайте сборочные файлы `/assets/*` с фронтенда, за исключением двух указанных выше серверных ресурсов. Вместо прокси можно задать `VITE_API_ORIGIN` при сборке; API должен разрешать credentialed CORS, а origin API и фронтенда должны оставаться same-site для cookie `SameSite=Lax`.
