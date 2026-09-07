import { useEffect, useMemo } from 'react';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import {
  useUserPreferences,
  useEditUserPreferences,
  type WhatsNewPreferences,
} from '@/hooks/user-preferences';
import { useChangelog } from './use-changelog';

function getDefaultWhatsNewPreferences(): WhatsNewPreferences {
  return {
    lastSeenDate: new Date(),
  };
}

interface WhatsNewData {
  hasNew: boolean;
}

export const useWhatsNew = (): WhatsNewData => {
  const { data: preferences, isSuccess: isPreferencesLoaded } = useUserPreferences();
  const { data: changelog, isSuccess: isChangelogLoaded } = useChangelog();
  const { mutateAsync: updatePreferences } = useEditUserPreferences();

  const lastSeenDate = preferences?.whatsNew?.lastSeenDate;
  const hasWhatsNewPreferences = !!lastSeenDate;

  // Initialize default whatsNewPreferences if missing or invalid
  useEffect(() => {
    if (!hasWhatsNewPreferences && isPreferencesLoaded) {
      void updatePreferences({
        whatsNew: getDefaultWhatsNewPreferences(),
      });
    }
  }, [hasWhatsNewPreferences, isPreferencesLoaded, updatePreferences]);

  const latestEntry = changelog?.entries[0];

  return useMemo(() => {
    if (!isChangelogLoaded || !lastSeenDate || !latestEntry) {
      return { hasNew: false };
    }

    return { hasNew: latestEntry.publishedAt > lastSeenDate };
  }, [isChangelogLoaded, lastSeenDate, latestEntry]);
};

export const useDismissWhatsNew = (): UseMutationResult<void, Error, void, unknown> => {
  const { data: changelog } = useChangelog();
  const { mutateAsync: updatePreferences } = useEditUserPreferences();

  return useMutation({
    mutationFn: async () => {
      const latestEntry = changelog?.entries[0];

      if (!latestEntry) {
        return;
      }

      const newPreferences: WhatsNewPreferences = {
        lastSeenDate: latestEntry.publishedAt,
      };

      await updatePreferences({
        whatsNew: newPreferences,
      });
    },
  });
};
