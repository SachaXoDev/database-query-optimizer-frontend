import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { deleteIndex, describeError, toggleIndexLike } from '../modules/indexesApi';
import type { IndexItem, SessionUser } from '../modules/indexesApi';
import { IndexImage } from './IndexImage';

interface Props {
  item: IndexItem;
  user: SessionUser | null;
  top: ReactNode;
  onNext?: () => void;
  detailsTo?: string;
  onUpdated: (item: IndexItem) => void;
  onDeleted: () => void;
}

export function IndexPresentation({ item, user, top, onNext, detailsTo, onUpdated, onDeleted }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const action = async (remove: boolean) => {
    if (busy || (remove && !window.confirm(`Удалить индекс «${item.indexName}»?`))) return;
    setBusy(true);
    setError(null);
    try {
      if (remove) {
        await deleteIndex(item.id);
        if (active.current) onDeleted();
      } else {
        const updated = await toggleIndexLike(item);
        if (active.current) onUpdated(updated);
      }
    } catch (requestError) {
      if (active.current) setError(describeError(requestError));
    } finally {
      if (active.current) setBusy(false);
    }
  };

  const description = item.fullDescription || item.shortDescription;
  return (
    <main className="vibes-feed-container">
      <div className="vibes-media-layer">
        <IndexImage url={item.imageUrl} name={`Обложка: ${item.indexName}`} className="vibes-cover" />
        <div className="vibes-gradient-overlay" />
      </div>
      <div className="vibes-top-bar"><div className="vibes-brand">{top}</div></div>
      {error && <p className="vibes-notice" role="alert">{error}</p>}
      <aside className="vibes-sidebar-actions" aria-label="Действия и параметры">
        {user ? (
          <button type="button" className="vibes-action-btn" aria-label={`Нравится: ${item.likesCount}`} aria-pressed={item.isLiked === 1} disabled={busy} onClick={() => void action(false)}>
            <span className={`action-icon-circle${item.isLiked === 1 ? ' liked-heart' : ''}`} aria-hidden="true">♥</span>
            <span className="action-count">{item.likesCount}</span>
          </button>
        ) : (
          <span className="vibes-action-btn" aria-label={`Отметок «Нравится»: ${item.likesCount}`}>
            <span className="action-icon-circle" aria-hidden="true">♡</span>
            <span className="action-count">{item.likesCount}</span>
          </span>
        )}
        {onNext && (
          <button type="button" className="vibes-action-btn" onClick={onNext} disabled={busy}>
            <span className="action-icon-circle next-circle" aria-hidden="true">→</span>
            <span className="action-count next-label">Далее</span>
          </button>
        )}
        <div className="vibes-side-metric">
          <span className="side-metric-label">СТРОК</span>
          <span className="side-metric-val">{Number(item.cardinality).toLocaleString('ru-RU')}</span>
        </div>
      </aside>
      <div className="vibes-bottom-overlay">
        <div className="vibes-tags-row">
          {item.indexType && <span className="vibes-type-pill">{item.indexType}</span>}
          {item.tableName && <span className="vibes-table-pill">{[item.tableName, item.columnName].filter(Boolean).join('.')}</span>}
        </div>
        <h1 className="vibes-title">{item.indexName}</h1>
        {description && (
          <div className="vibes-desc-wrapper">
            <p className={`vibes-desc-text ${expanded ? 'expanded' : 'collapsed'}`}>{description}</p>
            <button type="button" className="desc-toggle-btn" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Свернуть' : 'Развернуть'}
            </button>
          </div>
        )}
        {detailsTo && <Link className="preview-detail-link" to={detailsTo}>Подробнее</Link>}
        {user && item.isOwner === 1 && (
          <button type="button" className="preview-delete" disabled={busy} onClick={() => void action(true)}>Удалить индекс</button>
        )}
      </div>
    </main>
  );
}
