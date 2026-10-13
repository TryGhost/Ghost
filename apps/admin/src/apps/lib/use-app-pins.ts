import { useMemo } from 'react';
import { useMutation, useMutationState } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import { useEditUserPreferences, useUserPreferences } from '@/hooks/user-preferences';
import { MAX_PINNED_APPS, resolvePinnedApps, setAppPinned, type AppPins } from './pins';

const mutationKey = ['appPins'];

/**
 * The latest pins being saved, from any component, so the sidebar, the Apps
 * list and an app's page agree at once. A failed save drops out, which rolls
 * the change back.
 */
function useLatestPinsSave() {
  const saves = useMutationState({
    filters: {
      mutationKey,
      predicate: (mutation) => mutation.state.status !== 'error',
    },
    select: (mutation) => ({
      pins: mutation.state.variables as AppPins,
      submittedAt: mutation.state.submittedAt,
    }),
  });
  return saves.at(-1);
}

export interface AppPinsState {
  /** False until the user's preferences have loaded. */
  isLoaded: boolean;
  /** Installation ids pinned to the sidebar, in sidebar order. */
  pinnedIds: string[];
  isPinned: (installationId: string) => boolean;
  /** Whether there's room to pin another app. */
  canPinMore: boolean;
  setPinned: (installationId: string, pinned: boolean) => void;
}

/**
 * Which of `installations` the signed-in user has pinned to the sidebar. Pins
 * are per staff user, in their navigation preferences.
 */
export function useAppPins(installations: AppInstallation[]): AppPinsState {
  const preferences = useUserPreferences({ select: (data) => data.navigation.apps });
  const { mutateAsync: editPreferences } = useEditUserPreferences();
  const latestSave = useLatestPinsSave();
  const { mutate } = useMutation({
    mutationKey,
    mutationFn: (pins: AppPins) => editPreferences({ navigation: { apps: pins } }),
    onError: () => {
      toast.error('Couldn’t save your sidebar. Please try again.');
    },
  });

  // A save stays in charge until the preferences have caught up with it.
  const savePending =
    latestSave !== undefined &&
    (preferences.isPlaceholderData || latestSave.submittedAt > preferences.dataUpdatedAt);
  const pins = savePending ? latestSave.pins : preferences.data;

  const installedIds = useMemo(
    () => installations.map((installation) => installation.id),
    [installations],
  );
  const pinnedIds = useMemo(() => resolvePinnedApps(installedIds, pins), [installedIds, pins]);

  return {
    isLoaded: preferences.isSuccess,
    pinnedIds,
    isPinned: (installationId) => pinnedIds.includes(installationId),
    canPinMore: pinnedIds.length < MAX_PINNED_APPS,
    setPinned: (installationId, pinned) => {
      mutate(setAppPinned(installedIds, pins, installationId, pinned));
    },
  };
}
