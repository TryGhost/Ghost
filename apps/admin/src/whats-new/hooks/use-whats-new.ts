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

  // Entries published before a user's first visit shouldn't count as new, so
  // the first visit stores now as the last seen date. The sidebar calls this
  // hook from a few components on the same screen, and their saves queue up
  // behind each other. Passing a function makes each one decide what to save
  // when its turn comes, from the preferences the save before it stored: once
  // the first has stored a date, the rest return no changes, and
  // useEditUserPreferences skips a save that changes nothing.
  useEffect(() => {
    if (!hasWhatsNewPreferences && isPreferencesLoaded) {
      void updatePreferences((current) =>
        current.whatsNew?.lastSeenDate ? {} : { whatsNew: getDefaultWhatsNewPreferences() },
      );
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
