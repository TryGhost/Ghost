import { useEffect, useMemo } from "react";
import {
    useQuery,
    useMutation,
    type UseQueryResult,
    type UseMutationResult,
} from "@tanstack/react-query";

import {
    useUserPreferencesQuery,
    useUpdateUserPreferences,
    type Preferences,
} from "@/hooks/user-preferences";
import { useChangelog } from "./use-changelog";

interface WhatsNewSettings {
    lastSeenDate: Date;
}

function getDefaultWhatsNewSettings(): WhatsNewSettings {
    return {
        lastSeenDate: new Date(),
    };
}

function parseWhatsNewSettings(
    preferences: Preferences | undefined
): WhatsNewSettings | null {
    if (!preferences?.whatsNew?.lastSeenDate) {
        return null;
    }

    return {
        lastSeenDate: new Date(preferences.whatsNew.lastSeenDate),
    };
}

function serializeWhatsNewSettings(whatsNewSettings: WhatsNewSettings) {
    return {
        lastSeenDate: whatsNewSettings.lastSeenDate.toISOString(),
    };
}

interface WhatsNewData {
    hasNew: boolean;
    hasNewFeatured: boolean;
}

const whatsNewQueryKey = (preferences: Preferences | undefined) =>
    ["whatsNew", preferences?.whatsNew] as const;

export const useWhatsNewQuery = (): UseQueryResult<WhatsNewData> => {
    const { data: preferences, isSuccess: prefsLoaded } =
        useUserPreferencesQuery();
    const { data: changelog, isSuccess: changelogLoaded } = useChangelog();
    const { mutateAsync: updatePreferences } = useUpdateUserPreferences();

    const parsedSettings = useMemo(
        () => parseWhatsNewSettings(preferences),
        [preferences]
    );

    const settings = useMemo(
        () => parsedSettings ?? getDefaultWhatsNewSettings(),
        [parsedSettings]
    );

    // Initialize default settings if missing
    useEffect(() => {
        if (!parsedSettings && prefsLoaded) {
            const defaultSettings = getDefaultWhatsNewSettings();
            void updatePreferences({
                whatsNew: serializeWhatsNewSettings(defaultSettings),
            });
        }
    }, [parsedSettings, prefsLoaded, updatePreferences]);

    return useQuery({
        queryKey: whatsNewQueryKey(preferences),
        queryFn: () => {
            const entries = changelog?.entries ?? [];

            if (entries.length === 0) {
                return { hasNew: false, hasNewFeatured: false };
            }

            const latestEntry = entries[0];
            const hasNew = latestEntry.publishedAt > settings.lastSeenDate;
            const hasNewFeatured = hasNew && latestEntry.featured === true;

            return { hasNew, hasNewFeatured };
        },
        enabled: prefsLoaded && changelogLoaded,
    });
};

export const useMarkWhatsNewAsSeen = (): UseMutationResult<
    void,
    Error,
    void,
    unknown
> => {
    const { data: changelog } = useChangelog();
    const { mutateAsync: updatePreferences } = useUpdateUserPreferences();

    return useMutation({
        mutationFn: async () => {
            const entries = changelog?.entries ?? [];

            if (entries.length === 0) {
                return;
            }

            const latestEntry = entries[0];

            const newSettings: WhatsNewSettings = {
                lastSeenDate: latestEntry.publishedAt,
            };

            await updatePreferences({
                whatsNew: serializeWhatsNewSettings(newSettings),
            });
        },
    });
};
