import { useCallback, useEffect, useMemo } from "react";

import moment from "moment-timezone";
import type { Moment } from "moment-timezone";

import {
    useUserPreferences,
    type Preferences,
} from "@src/hooks/use-user-preferences";
import type { ChangelogEntry } from "./use-changelog";

interface WhatsNewPreferences {
    lastSeenDate?: string;
    [key: string]: unknown;
}

interface WhatsNewSettings {
    lastSeenDate: Moment;
}

function getDefaultWhatsNewSettings(): WhatsNewSettings {
    return {
        lastSeenDate: moment.utc(),
    };
}

function parseWhatsNewSettings(
    preferences: Preferences | undefined
): WhatsNewSettings | null {
    if (!preferences) {
        return null;
    }

    const whatsNew = preferences.whatsNew as WhatsNewPreferences | undefined;
    if (!whatsNew || !whatsNew.lastSeenDate) {
        return null;
    }

    return {
        lastSeenDate: moment(whatsNew.lastSeenDate),
    };
}

function serializeWhatsNewSettings(
    whatsNewSettings: WhatsNewSettings
): WhatsNewPreferences {
    return {
        lastSeenDate: whatsNewSettings.lastSeenDate.toISOString(),
    };
}

export interface UseWhatsNewReturn {
    hasNew: boolean;
    hasNewFeatured: boolean;
    markAsSeen: () => Promise<void>;
    settings: WhatsNewSettings;
}

export const useWhatsNew = (entries: ChangelogEntry[]): UseWhatsNewReturn => {
    const {
        data: preferences,
        updatePreferences,
        isLoading,
    } = useUserPreferences();

    const parsedSettings = useMemo(
        () => parseWhatsNewSettings(preferences),
        [preferences]
    );

    const settings = useMemo(
        () => parsedSettings ?? getDefaultWhatsNewSettings(),
        [parsedSettings]
    );

    useEffect(() => {
        if (!parsedSettings && !isLoading) {
            void updatePreferences({
                whatsNew: serializeWhatsNewSettings(settings),
            });
        }
    }, [parsedSettings, settings, updatePreferences, isLoading]);

    const hasNew = useMemo(() => {
        if (entries.length === 0) return false;

        const latestEntry = entries[0];
        return latestEntry.publishedAt.isAfter(settings.lastSeenDate);
    }, [entries, settings.lastSeenDate]);

    const hasNewFeatured = useMemo(() => {
        if (!hasNew || entries.length === 0) return false;
        return entries[0].featured === true;
    }, [hasNew, entries]);

    const markAsSeen = useCallback(async () => {
        if (entries.length === 0) return;

        const latestEntry = entries[0];

        const newSettings: WhatsNewSettings = {
            lastSeenDate: latestEntry.publishedAt,
        };

        await updatePreferences({
            whatsNew: serializeWhatsNewSettings(newSettings),
        });
    }, [entries, updatePreferences]);

    return {
        hasNew,
        hasNewFeatured,
        markAsSeen,
        settings,
    };
};
