import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { AppOutletContext } from '../AppLayout';
import { FilterBar } from '../components/FilterBar';
import { IndexCard } from '../components/IndexCard';
import { deleteIndex, describeError, fetchIndexes, positiveId, toggleIndexLike } from '../modules/indexesApi';
import type { CatalogPage, IndexItem } from '../modules/indexesApi';

const pageSize = 24;

export function ListPage() {
  const [params, setParams] = useSearchParams();
  const rawCardinality = params.get('cardinality');
  const cardinality = rawCardinality === '0' ? 0 : positiveId(rawCardinality);
  const page = Math.min(positiveId(params.get('page')) ?? 1, Math.floor(2147483647 / pageSize));

  function goToPage(target: number, filter: number | undefined, replace = false) {
    const query = new URLSearchParams();
    if (filter !== undefined) query.set('cardinality', String(filter));
    if (target > 1) query.set('page', String(target));
    setParams(query, { replace });
  }

  return (
    <>
      <header className="mobile-header">
        <div className="header-logo-group">
          <span className="brand-logo-text">DB OPTIMIZER</span><span className="header-pipe" aria-hidden="true">|</span><span className="service-name">Каталог индексов</span>
        </div>
      </header>
      <main className="page-scrollable">
        <div className="content-padding">
          <FilterBar
            key={cardinality ?? ''}
            initialCardinality={cardinality === undefined ? '' : String(cardinality)}
            onSubmit={(value) => goToPage(1, value === '' ? undefined : Number(value))}
            onReset={() => setParams({})}
          />
          <CatalogResults key={`${page}:${cardinality ?? ''}`} page={page} cardinality={cardinality} goToPage={(target, replace) => goToPage(target, cardinality, replace)} />
        </div>
      </main>
    </>
  );
}

function CatalogResults({ page, cardinality, goToPage }: { page: number; cardinality?: number; goToPage: (page: number, replace?: boolean) => void }) {
  const { user } = useOutletContext<AppOutletContext>();
  const userId = user?.id;
  const [data, setData] = useState<CatalogPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const offset = (page - 1) * pageSize;
  const lastPage = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  useEffect(() => {
    const controller = new AbortController();
    fetchIndexes({ minCardinality: cardinality, limit: pageSize, offset }, controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(result);
    }).catch((requestError: unknown) => {
      if (!controller.signal.aborted) setError(describeError(requestError));
    });
    return () => controller.abort();
  }, [cardinality, offset, userId, attempt]);

  useEffect(() => {
    if (data && page > lastPage) goToPage(lastPage, true);
  }, [data, goToPage, lastPage, page]);

  const reload = () => { setData(null); setError(null); setAttempt((value) => value + 1); };

  async function runAction(item: IndexItem, remove: boolean) {
    if (busy !== null || (remove && !window.confirm(`Удалить индекс «${item.indexName}»?`))) return;
    setBusy(item.id);
    setActionError(null);
    try {
      if (remove) {
        await deleteIndex(item.id);
        reload();
      } else {
        const updated = await toggleIndexLike(item);
        setData((current) => current && { ...current, items: current.items.map((entry) => entry.id === updated.id ? updated : entry) });
      }
    } catch (requestError) {
      setActionError(describeError(requestError));
    } finally {
      setBusy(null);
    }
  }

  if (error) return <div className="catalog-status" role="alert"><p>{error}</p><button type="button" onClick={reload}>Повторить</button></div>;
  if (!data || page > lastPage) return <p className="catalog-status" role="status">Загрузка каталога…</p>;
  return (
    <>
      <p className="catalog-summary" role="status">
        Найдено: {data.total.toLocaleString('ru-RU')}
        {data.items.length > 0 && <> · Показано {data.offset + 1}–{data.offset + data.items.length}</>}
      </p>
      {actionError && <p className="catalog-status" role="alert">{actionError}</p>}
      {data.items.length === 0 ? (
        <p className="catalog-status">{cardinality === undefined ? 'Опубликованных индексов пока нет.' : 'Нет индексов с таким числом строк.'}</p>
      ) : (
        <div className="index-grid-2col">
          {data.items.map((item) => (
            <IndexCard
              key={item.id}
              item={item}
              busy={busy !== null}
              onLike={user ? () => void runAction(item, false) : undefined}
              onDelete={user && item.isOwner === 1 ? () => void runAction(item, true) : undefined}
            />
          ))}
        </div>
      )}
      {lastPage > 1 && (
        <nav className="catalog-pagination" aria-label="Страницы каталога">
          <button type="button" aria-label="Первая страница" title="Первая страница" disabled={page <= 1} onClick={() => goToPage(1)}>«</button>
          <button type="button" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Назад</button>
          <span>Стр. {page} из {lastPage}</span>
          <button type="button" disabled={page >= lastPage} onClick={() => goToPage(page + 1)}>Далее</button>
          <button type="button" aria-label="Последняя страница" title="Последняя страница" disabled={page >= lastPage} onClick={() => goToPage(lastPage)}>»</button>
        </nav>
      )}
    </>
  );
}
