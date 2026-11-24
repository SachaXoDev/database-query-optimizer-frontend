import { NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '../Routes';

export function TabBar({ signedIn }: { signedIn: boolean }) {
  const { pathname } = useLocation();
  return (
    <nav className="mobile-tabbar" aria-label="Основная навигация">
      <NavLink to={ROUTES.FEED} className="tab-item">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span className="tab-label">Лента</span>
      </NavLink>
      <NavLink to={ROUTES.CREATE} className="tab-item">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v12M6 12h12" />
        </svg>
        <span className="tab-label">Добавление</span>
      </NavLink>
      <NavLink to={ROUTES.LIST} end className={({ isActive }) => `tab-item${isActive || pathname.startsWith(`${ROUTES.DETAIL}/`) ? ' active' : ''}`}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
        </svg>
        <span className="tab-label">Каталог</span>
      </NavLink>
      <NavLink to={ROUTES.LOGIN} className={({ isActive }) => `tab-item${isActive || pathname === ROUTES.REGISTER ? ' active' : ''}`}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="tab-label">{signedIn ? 'Профиль' : 'Вход'}</span>
      </NavLink>
    </nav>
  );
}
