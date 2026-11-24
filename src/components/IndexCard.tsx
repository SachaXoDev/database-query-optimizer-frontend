import { Link } from 'react-router-dom';
import type { IndexItem } from '../modules/indexesApi';
import { detailPath } from '../Routes';
import { IndexImage } from './IndexImage';

interface Props {
  item: IndexItem;
  onDelete?: () => void;
  onLike?: () => void;
  busy: boolean;
}

export function IndexCard({ item, onDelete, onLike, busy }: Props) {
  const liked = item.isLiked === 1;
  const likesClass = `tile-likes-badge${liked ? ' liked' : ''}`;
  const likesLabel = `Отметок «Нравится»: ${item.likesCount}`;
  const likes = <><span aria-hidden="true">{liked ? '♥' : '♡'}</span> {item.likesCount}</>;
  return (
    <article className="tile-card-wrapper">
      <Link className="tile-card" to={detailPath(item.id)}>
        <div className="tile-image-wrapper">
          <IndexImage url={item.imageUrl} name="" className="tile-image" />
        </div>
        <div className="tile-info">
          <h2 className="tile-title" title={item.indexName}>{item.indexName}</h2>
          <span className="tile-subtitle">{[item.tableName, item.columnName].filter(Boolean).join('.')}</span>
          <span className="tile-time">Строк: {Number(item.cardinality).toLocaleString('ru-RU')}</span>
        </div>
      </Link>
      {onDelete && <button type="button" className="tile-delete-btn" aria-label={`Удалить ${item.indexName}`} disabled={busy} onClick={onDelete}>×</button>}
      {onLike ? (
        <button type="button" className={likesClass} aria-label={likesLabel} aria-pressed={liked} disabled={busy} onClick={onLike}>{likes}</button>
      ) : <span className={likesClass} aria-label={likesLabel}>{likes}</span>}
    </article>
  );
}
