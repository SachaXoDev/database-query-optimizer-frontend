import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '../AppLayout';
import { IndexPresentation } from '../components/IndexPresentation';
import { PageState } from '../components/PageState';
import { describeError, fetchFeed, positiveId } from '../modules/indexesApi';
import type { FeedResult } from '../modules/indexesApi';
import { useIndexPolling } from '../modules/useIndexPolling';
import { detailPath, nextFeedPath, ROUTES } from '../Routes';

type FeedState = { key: string } & ({ result: FeedResult } | { error: string });

export function FeedPage() {
  const { key, search } = useLocation();
  const navigate = useNavigate();
  const { initializeFeed, readCurrentFeed, user } = useOutletContext<AppOutletContext>();
  const [state, setState] = useState<FeedState | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const clickKey = useRef<string | null>(null);
  const navigationRequest = useRef<{ key: string; request: Promise<FeedResult> } | null>(null);
  const params = new URLSearchParams(search);
  const idParam = params.get('id');
  const id = positiveId(idParam);
  const next = params.get('next') === 'true';

  useEffect(() => {
    clickKey.current = null;
    setPollError(null);
    setMutating(false);
    if (idParam !== null && id === undefined) return;

    // A Next request changes the Redis cursor. Reuse it on StrictMode effect
    // replay; don't retry it in response to a render, a poll, or a fetch error.
    if (navigationRequest.current?.key !== key) {
      const request = next
        ? initializeFeed().then(() => fetchFeed({ id, next: true }))
        : id !== undefined
          ? initializeFeed().then(() => fetchFeed({ id }))
          : readCurrentFeed();
      navigationRequest.current = { key, request };
    }
    let active = true;
    navigationRequest.current.request.then((result) => {
      if (active) setState({ key, result });
    }).catch((error: unknown) => {
      if (active) setState({ key, error: describeError(error) });
    });
    return () => { active = false; };
  }, [id, idParam, initializeFeed, key, next, readCurrentFeed]);

  const currentState = state?.key === key ? state : null;
  const result = currentState && 'result' in currentState ? currentState.result : null;
  const current = result?.current;
  const updateFromPoll = useCallback((polled: FeedResult) => {
    setState({ key, result: polled });
    setPollError(null);
  }, [key]);
  useIndexPolling(mutating ? undefined : current?.id, updateFromPoll, setPollError);

  function advance() {
    if (clickKey.current === key) return;
    clickKey.current = key;
    // Only send the guard for the cursor card, not for an explicit by-ID view.
    navigate(nextFeedPath(id !== undefined && !next ? undefined : current?.id));
  }

  if (idParam !== null && id === undefined) {
    return <PageState error><p>Некорректный ID индекса.</p><Link to={ROUTES.FEED}>К началу ленты</Link></PageState>;
  }
  if (currentState && 'error' in currentState) {
    return <PageState error><p>{currentState.error}</p><Link to={ROUTES.FEED}>Проверить текущую карточку</Link></PageState>;
  }
  if (!result) return <PageState><p role="status">Загрузка ленты…</p></PageState>;
  if (!current) {
    return (
      <PageState>
        <p>{result.batchSize > 0 || (id !== undefined && !next) ? 'Индекс больше недоступен.' : 'В ленте пока нет опубликованных индексов.'}</p>
        {result.batchSize > 0 && <button type="button" onClick={advance}>Далее</button>}
        <Link to={ROUTES.FEED}>Обновить ленту</Link>
        <Link to={ROUTES.LIST}>Открыть каталог</Link>
      </PageState>
    );
  }

  return (
    <IndexPresentation
      key={current.id}
      item={current}
      user={user}
      top={<><span className="live-dot" /><span className="brand-logo-text">DB OPTIMIZER</span></>}
      onNext={advance}
      detailsTo={detailPath(current.id)}
      pollError={pollError}
      onMutation={setMutating}
      onUpdated={(item) => setState({ key, result: { ...result, current: item } })}
      onDeleted={() => navigate(ROUTES.FEED, { replace: true })}
    />
  );
}
