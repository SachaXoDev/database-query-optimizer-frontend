import { useEffect } from 'react';
import { describeError, fetchFeed } from './indexesApi';
import type { FeedResult } from './indexesApi';

export function useIndexPolling(
  id: number | undefined,
  onResult: (result: FeedResult) => void,
  onError: (error: string) => void,
) {
  useEffect(() => {
    if (id === undefined) return;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const result = await fetchFeed({ id }, controller.signal);
        if (controller.signal.aborted) return;
        onResult(result);
        if (result.current === null) return;
      } catch (error) {
        if (controller.signal.aborted) return;
        onError(describeError(error));
      }
      timer = window.setTimeout(poll, 1500);
    };
    let timer = window.setTimeout(poll, 1500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [id, onResult, onError]);
}
