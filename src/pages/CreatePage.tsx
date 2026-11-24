import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '../AppLayout';
import { PageState } from '../components/PageState';
import { ApiError, describeError, fetchDraft, mediaUrl, publishIndex, saveDraft } from '../modules/indexesApi';
import type { IndexItem } from '../modules/indexesApi';
import { detailPath, ROUTES } from '../Routes';

const maxFileSize = 50 * 1024 * 1024;

export function CreatePage() {
  const { user, setUser, checkingSession, sessionError, retrySession } = useOutletContext<AppOutletContext>();
  const onSessionExpired = useCallback(() => setUser(null), [setUser]);
  if (checkingSession) return <PageState><p role="status">Проверка сессии…</p></PageState>;
  if (sessionError && !user) return <PageState error><p>{sessionError}</p><button type="button" onClick={retrySession}>Повторить</button></PageState>;
  if (!user) {
    return <PageState><p>Чтобы добавить индекс, войдите или зарегистрируйтесь.</p><Link to={`${ROUTES.LOGIN}?from=create`}>Войти</Link><Link to={`${ROUTES.REGISTER}?from=create`}>Зарегистрироваться</Link></PageState>;
  }
  return <DraftEditor key={user.id} onSessionExpired={onSessionExpired} />;
}

function DraftEditor({ onSessionExpired }: { onSessionExpired: () => void }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<IndexItem | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const active = useRef(false);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDraft(controller.signal).then((item) => {
      if (!controller.signal.aborted) setDraft(item);
    }).catch((requestError: unknown) => {
      if (controller.signal.aborted) return;
      if (requestError instanceof ApiError && requestError.status === 401) onSessionExpired();
      else setLoadError(describeError(requestError));
    });
    return () => controller.abort();
  }, [attempt, onSessionExpired]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const publish = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'publish';
    const name = String(fields.get('indexName') ?? '').trim();
    setError(null);
    setNotice(null);
    if (name.length < 3) {
      setError('Название индекса должно содержать хотя бы 3 символа.');
      return;
    }
    fields.set('indexName', name);
    if (fields.get('cardinality') === '') fields.delete('cardinality');
    for (const field of ['image', 'model']) {
      const file = fields.get(field);
      if (!(file instanceof File) || file.name === '') {
        fields.delete(field);
        continue;
      }
      if (file.size > maxFileSize) {
        setError('Размер каждого файла не должен превышать 50 МиБ.');
        return;
      }
      if (field === 'model' && !/\.glb$/i.test(file.name)) {
        setError('Выберите 3D-модель в формате .glb.');
        return;
      }
    }
    setBusy(true);
    try {
      const saved = await saveDraft(fields);
      setDraft(saved);
      for (const field of ['image', 'model']) {
        const input = form.elements.namedItem(field);
        if (input instanceof HTMLInputElement) input.value = '';
      }
      if (publish) {
        const published = await publishIndex(saved.id);
        if (!active.current) return;
        navigate(detailPath(published.id), { replace: true });
      } else {
        setNotice('Черновик сохранён. Он не виден в каталоге до публикации.');
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) onSessionExpired();
      else setError(describeError(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return <PageState error><p>{loadError}</p><button type="button" onClick={() => { setLoadError(null); setAttempt((value) => value + 1); }}>Повторить</button></PageState>;
  }
  if (draft === undefined) return <PageState><p role="status">Загрузка черновика…</p></PageState>;

  return (
    <main className="page-scrollable extras-form-page">
      <div className="content-padding">
        <h1>{draft ? 'Редактирование черновика' : 'Добавление индекса'}</h1>
        {error && <p className="form-notice" role="alert">{error}</p>}
        {notice && <p className="form-notice" role="status">{notice}</p>}
        <form className="extras-form" onSubmit={submit}>
          <fieldset disabled={busy}>
            <label>Название индекса<input name="indexName" defaultValue={draft?.indexName} required minLength={3} /></label>
            <label>Таблица<input name="tableName" defaultValue={draft?.tableName} /></label>
            <label>Колонка<input name="columnName" defaultValue={draft?.columnName} /></label>
            <label>Тип индекса<input name="indexType" defaultValue={draft?.indexType || 'B-Tree'} /></label>
            <label>Число строк<input type="number" name="cardinality" min="0" max="2147483647" step="1" defaultValue={draft?.cardinality} /></label>
            <label>Краткое описание<input name="shortDescription" defaultValue={draft?.shortDescription} /></label>
            <label>Полное описание<textarea name="fullDescription" rows={4} defaultValue={draft?.fullDescription} /></label>
            <label>Изображение<input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" /></label>
            <label>3D-модель (.glb)<input name="model" type="file" accept=".glb,model/gltf-binary" /></label>
            <small>Изображение и модель необязательны. Не более 50 МиБ на файл.</small>
            {draft?.modelUrl && <a href={mediaUrl(draft.modelUrl)} target="_blank" rel="noreferrer">Сохранённый .glb</a>}
            <div className="extras-form-actions">
              <button type="submit" value="draft">Сохранить черновик</button>
              <button type="submit" className="primary-action" value="publish">Опубликовать</button>
            </div>
          </fieldset>
          {busy && <p role="status">Сохранение…</p>}
        </form>
      </div>
    </main>
  );
}
