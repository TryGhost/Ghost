import { useMemo } from 'react';
import { useMutation, useMutationState } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  type AppInstallation,
  useBrowseAppInstallations,
} from '@tryghost/admin-x-framework/api/app-installations';
import { useEditUserPreferences, useUserPreferences } from '@/hooks/user-preferences';
import { MAX_PINNED_APPS, resolvePinnedApps, setAppPinned } from './pins';

const mutationKey = ['appPins'];

const NO_INSTALLATIONS: AppInstallation[] = [];

/** Pinning or unpinning one app: what a save of the pins sends. */
interface PinChange {
  installationId: string;
  pinned: boolean;
}

/**
 * Pin changes from any component, oldest first, so the sidebar, the Apps list
 * and an app's page agree at once. A failed change drops out, which rolls it
 * back.
 */
function usePinChanges() {
  return useMutationState({
    filters: {
      mutationKey,
      predicate: (mutation) => mutation.state.status !== 'error',
    },
    select: (mutation) => ({
      change: mutation.state.variables as PinChange,
      saving: mutation.state.status === 'pending',
      submittedAt: mutation.state.submittedAt,
    }),
  });
}

export interface AppPinsState {
  /** False until both the installations and the user's preferences have loaded. */
  isLoaded: boolean;
  /** Installation ids pinned to the sidebar, in sidebar order. */
  pinnedIds: string[];
  isPinned: (installationId: string) => boolean;
  /** Whether there's room to pin another app. */
  canPinMore: boolean;
  setPinned: (installationId: string, pinned: boolean) => void;
}

export interface InstalledApps {
  /** The site's installations, oldest first. */
  installations: AppInstallation[];
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  /** Which of them the signed-in user has pinned to the sidebar. */
  pins: AppPinsState;
}

/**
 * The site's installed apps, and which of them the signed-in user has pinned to
 * the sidebar. Pins are per staff user, in their navigation preferences.
 */
export function useInstalledApps({ enabled = true }: { enabled?: boolean } = {}): InstalledApps {
  const { data, isLoading, isSuccess, error } = useBrowseAppInstallations({
    enabled,
    defaultErrorHandler: false,
  });
  const installations = data?.app_installations ?? NO_INSTALLATIONS;
  const installedIds = useMemo(
    () => installations.map((installation) => installation.id),
    [installations],
  );
  const preferences = useUserPreferences({ select: (prefs) => prefs.navigation.apps });
  const { mutateAsync: editPreferences } = useEditUserPreferences();
  const changes = usePinChanges();
  const { mutate } = useMutation({
    mutationKey,
    // Worked out from the pins as saved when this save runs, after any queued
    // ahead of it, so a change that failed isn't carried along by a later one.
    mutationFn: ({ installationId, pinned }: PinChange) =>
      editPreferences((current) => ({
        navigation: {
          apps: setAppPinned(installedIds, current.navigation.apps, installationId, pinned),
        },
      })),
    onError: () => {
      toast.error('Couldn’t save your sidebar. Please try again.');
    },
  });

  // The saved pins, with the changes they don't show yet on top: those still
  // saving, and those saved since the preferences last caught up. Applying a
  // change the pins already show changes nothing.
  const unsaved = changes.filter(
    ({ saving, submittedAt }) =>
      saving || preferences.isPlaceholderData || submittedAt > preferences.dataUpdatedAt,
  );
  const pins = unsaved.reduce(
    (saved, { change }) => setAppPinned(installedIds, saved, change.installationId, change.pinned),
    preferences.data,
  );
  const pinnedIds = resolvePinnedApps(installedIds, pins);

  return {
    installations,
    isLoading,
    isSuccess,
    error,
    pins: {
      isLoaded: isSuccess && preferences.isSuccess,
      pinnedIds,
      isPinned: (installationId) => pinnedIds.includes(installationId),
      canPinMore: pinnedIds.length < MAX_PINNED_APPS,
      setPinned: (installationId, pinned) => {
        mutate({ installationId, pinned });
      },
    },
  };
}
