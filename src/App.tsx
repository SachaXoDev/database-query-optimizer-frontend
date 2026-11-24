import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { ListPage } from './pages/ListPage';
import { FeedPage } from './pages/FeedPage';
import { DetailPage } from './pages/DetailPage';
import { AuthPage } from './pages/AuthPage';
import { CreatePage } from './pages/CreatePage';
import { ROUTES } from './Routes';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.LIST} element={<ListPage />} />
          <Route path={ROUTES.FEED} element={<FeedPage />} />
          <Route path={`${ROUTES.DETAIL}/:id`} element={<DetailPage />} />
          <Route path={ROUTES.CREATE} element={<CreatePage />} />
          <Route path={ROUTES.LOGIN} element={<AuthPage key="login" mode="login" />} />
          <Route path={ROUTES.REGISTER} element={<AuthPage key="register" mode="register" />} />
          <Route path="*" element={<main className="page-state"><p>Страница не найдена.</p></main>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
