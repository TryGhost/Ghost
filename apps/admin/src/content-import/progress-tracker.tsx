import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react';
import { useContentCSVProgress } from '@tryghost/admin-x-framework/api/posts';
import { hasAdminAccess, type User } from '@tryghost/admin-x-framework/api/users';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { getGhostPaths } from '@tryghost/admin-x-framework/helpers';
import { isImportFinished, type TrackedImport } from './progress';
import { importProgressStore } from './progress-store';

function ProgressPoller({
  id,
  onProgress,
  onForget,
}: {
  id: string;
  onProgress: (progress: TrackedImport) => void;
  onForget: (id: string) => void;
}) {
  const { data, error } = useContentCSVProgress(id, {
    defaultErrorHandler: false,
    retry: false,
    refetchInterval: (query) =>
      query.state.data && isImportFinished(query.state.data.meta.status) ? false : 5000,
  });

  useEffect(() => {
    if (error instanceof APIError && [403, 404].includes(error.response?.status ?? 0)) {
      // Older Core has no progress endpoint. Expired or inaccessible imports also
      // return 404; none should leave a permanent indicator or repeated error toasts.
      onForget(id);
    } else if (data) {
      onProgress({ ...data.meta, stale: Boolean(error) });
    }
  }, [data, error, id, onForget, onProgress]);
  return null;
}

// One polling owner spans routes, even when neither progress surface is visible.
// Consumers subscribe to the store without wrapping the app in a provider.
export function ImportProgressTracker({ user }: { user: User }) {
  const csvEnabled = useFeatureFlag('csvContentImporter');
  const enabled = csvEnabled && hasAdminAccess(user);
  const key = `ghost:csv-imports:${getGhostPaths().adminRoot}:${user.id}`;
  const state = useSyncExternalStore(
    importProgressStore.subscribe,
    importProgressStore.getSnapshot,
  );

  // Clear the previous user's visible state before painting, and stop observing
  // browser storage on sign-out or when the feature becomes unavailable.
  useLayoutEffect(() => {
    if (enabled) {
      return importProgressStore.connect(key);
    }
  }, [enabled, key]);

  if (!enabled || state.key !== key) {
    return null;
  }
  return state.ids.map((id) => (
    <ProgressPoller key={id} id={id} onForget={state.dismiss} onProgress={state.update} />
  ));
}
