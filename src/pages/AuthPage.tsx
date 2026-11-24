import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '../AppLayout';
import { PageState } from '../components/PageState';
import { describeError, login, logout, register } from '../modules/indexesApi';
import { ROUTES } from '../Routes';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, setUser, checkingSession, sessionError, retrySession } = useOutletContext<AppOutletContext>();
  const navigate = useNavigate();
  const { search } = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creatingAccount = mode === 'register';
  const after = new URLSearchParams(search).get('from') === 'create' ? ROUTES.CREATE : ROUTES.LIST;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const credentials = { username: String(form.get('username') ?? '').trim(), password: String(form.get('password') ?? '') };
    setBusy(true);
    setError(null);
    try {
      if (creatingAccount) await register(credentials);
      setUser(await login(credentials));
      navigate(after, { replace: true });
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setBusy(false);
    }
  }

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await logout();
      setUser(null);
      navigate(ROUTES.LIST, { replace: true });
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setBusy(false);
    }
  };

  if (checkingSession) return <PageState><p role="status">Проверка сессии…</p></PageState>;
  return (
    <main className="page-scrollable extras-form-page">
      <div className="content-padding">
        <h1>{user ? 'Профиль' : creatingAccount ? 'Регистрация' : 'Вход'}</h1>
        {sessionError && <p role="alert">{sessionError} <button type="button" onClick={retrySession}>Проверить сессию</button></p>}
        {error && <p className="form-notice" role="alert">{error}</p>}
        {user ? (
          <>
            <p>Вы вошли как <strong>{user.username}</strong>.</p>
            <p><Link to={ROUTES.CREATE}>Добавить индекс</Link></p>
            <button type="button" onClick={() => void signOut()} disabled={busy}>{busy ? 'Выходим…' : 'Выйти'}</button>
          </>
        ) : (
          <>
            <form className="extras-form" onSubmit={submit}>
              <label>Имя пользователя<input name="username" autoComplete="username" required minLength={3} /></label>
              <label>Пароль<input name="password" type="password" autoComplete={creatingAccount ? 'new-password' : 'current-password'} required minLength={6} /></label>
              <button type="submit" className="primary-action" disabled={busy}>{busy ? 'Отправка…' : creatingAccount ? 'Зарегистрироваться' : 'Войти'}</button>
            </form>
            <p><Link to={{ pathname: creatingAccount ? ROUTES.LOGIN : ROUTES.REGISTER, search }}>{creatingAccount ? 'Уже есть аккаунт? Войти' : 'Создать аккаунт'}</Link></p>
          </>
        )}
      </div>
    </main>
  );
}
