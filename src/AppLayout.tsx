import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { ApiError, describeError, fetchFeed, fetchSession } from './modules/indexesApi';
import type { FeedResult, SessionUser } from './modules/indexesApi';
import './style.css';

export interface AppOutletContext {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  checkingSession: boolean;
  sessionError: string | null;
  retrySession: () => void;
  initializeFeed: () => Promise<FeedResult>;
  readCurrentFeed: () => Promise<FeedResult>;
}

export function AppLayout() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const initialFeed = useRef<Promise<FeedResult> | null>(null);
  const pendingFeed = useRef<Promise<FeedResult> | null>(null);

  const readCurrentFeed = useCallback(() => {
    if (!pendingFeed.current) {
      pendingFeed.current = fetchFeed().finally(() => { pendingFeed.current = null; });
    }
    return pendingFeed.current;
  }, []);

  const initializeFeed = useCallback(() => {
    if (!initialFeed.current) {
      initialFeed.current = readCurrentFeed().catch((error: unknown) => {
        initialFeed.current = null;
        throw error;
      });
    }
    return initialFeed.current;
  }, [readCurrentFeed]);

  useEffect(() => {
    void initializeFeed().catch(() => { /* The feed route renders request errors. */ });
  }, [initializeFeed]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSession(controller.signal).then((profile) => {
      if (!controller.signal.aborted) setUser(profile);
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) setUser(null);
      else setSessionError(describeError(error));
    }).finally(() => {
      if (!controller.signal.aborted) setCheckingSession(false);
    });
    return () => controller.abort();
  }, [sessionAttempt]);

  const retrySession = () => {
    setSessionError(null);
    setCheckingSession(true);
    setSessionAttempt((attempt) => attempt + 1);
  };

  return (
    <div className="phone-screen">
      <Outlet context={{ user, setUser, checkingSession, sessionError, retrySession, initializeFeed, readCurrentFeed } satisfies AppOutletContext} />
      <TabBar signedIn={Boolean(user)} />
    </div>
  );
}
