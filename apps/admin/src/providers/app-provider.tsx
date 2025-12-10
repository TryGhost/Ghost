import { AppProvider as FrameworkAppProvider, type AppSettings } from "@tryghost/admin-x-framework";
import { useBrowseSettings, getSettingValue } from "@tryghost/admin-x-framework/api/settings";
import { type ReactNode, useMemo } from "react";

interface AppProviderProps {
    children: ReactNode;
}

/**
 * Wrapper around AppProvider that fetches Ghost settings and constructs
 * the appSettings object expected by admin-x apps
 */
export function AppProvider({ children }: AppProviderProps) {
    const { data: settingsData } = useBrowseSettings();

    // Construct appSettings from Ghost settings
    const appSettings: AppSettings | undefined = useMemo(() => {
        if (!settingsData?.settings) {
            return undefined;
        }

        const settings = settingsData.settings;

        return {
            paidMembersEnabled: getSettingValue<boolean>(settings, 'paid_members_enabled') ?? false,
            newslettersEnabled: getSettingValue(settings, 'editor_default_email_recipients') !== 'disabled',
            analytics: {
                emailTrackOpens: getSettingValue<boolean>(settings, 'email_track_opens') ?? false,
                emailTrackClicks: getSettingValue<boolean>(settings, 'email_track_clicks') ?? false,
                membersTrackSources: getSettingValue<boolean>(settings, 'members_track_sources') ?? false,
                outboundLinkTagging: getSettingValue<boolean>(settings, 'outbound_link_tagging') ?? false,
                webAnalytics: getSettingValue<boolean>(settings, 'web_analytics_enabled') ?? false,
            }
        };
    }, [settingsData]);

    return (
        <FrameworkAppProvider appSettings={appSettings}>
            {children}
        </FrameworkAppProvider>
    );
}

