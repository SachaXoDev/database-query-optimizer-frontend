import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { AppOutletContext } from '../AppLayout';
import { IndexPresentation } from '../components/IndexPresentation';
import { PageState } from '../components/PageState';
import { ApiError, describeError, fetchIndexById, positiveId } from '../modules/indexesApi';
import type { IndexItem } from '../modules/indexesApi';
import { ROUTES } from '../Routes';

type DetailState = { item: IndexItem | null } | { error: string };

export function DetailPage() {
  const id = positiveId(useParams().id);
  if (!id) return <PageState error><p>Некорректный ID индекса.</p><Link to={ROUTES.LIST}>В каталог</Link></PageState>;
  return <IndexDetail key={id} id={id} />;
}

function IndexDetail({ id }: { id: number }) {
  const navigate = useNavigate();
  const { user } = useOutletContext<AppOutletContext>();
  const [state, setState] = useState<DetailState | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchIndexById(id, controller.signal).then((item) => {
      if (!controller.signal.aborted) setState({ item });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setState(error instanceof ApiError && error.status === 404 ? { item: null } : { error: describeError(error) });
      }
    });
    return () => controller.abort();
  }, [id, attempt]);

  const item = state && 'item' in state ? state.item : null;

  if (!state) return <PageState><p role="status">Загрузка индекса…</p></PageState>;
  if ('error' in state) {
    return <PageState error><p>{state.error}</p><button type="button" onClick={() => { setState(null); setAttempt(attempt + 1); }}>Повторить</button><Link to={ROUTES.LIST}>В каталог</Link></PageState>;
  }
  if (!item) return <PageState><p>Индекс не найден или больше не опубликован.</p><Link to={ROUTES.LIST}>В каталог</Link></PageState>;

  return (
    <IndexPresentation
      item={item}
      user={user}
      top={<Link to={ROUTES.LIST}>В каталог</Link>}
      onUpdated={(updated) => setState({ item: updated })}
      onDeleted={() => navigate(ROUTES.LIST, { replace: true })}
    />
  );
}
