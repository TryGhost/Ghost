import {useMemo} from 'react';
import {useAppContext} from '../providers/AppProvider';

export interface AnalyticsFeatures {
    emailTrackOpens: boolean;
    emailTrackClicks: boolean;
    membersTrackSources: boolean;
    outboundLinkTagging: boolean;
    webAnalytics: boolean;
    
    canShowEmailOpenStats: boolean;
    canShowEmailClickStats: boolean;
    canShowMemberSourceStats: boolean;
    canShowWebAnalytics: boolean;
}

export const useAnalyticsFeatures = (): AnalyticsFeatures => {
    const {appSettings} = useAppContext();
    const analytics = appSettings?.analytics;

    return useMemo(() => {
        const settings = {
            emailTrackOpens: analytics?.emailTrackOpens ?? false,
            emailTrackClicks: analytics?.emailTrackClicks ?? false,
            membersTrackSources: analytics?.membersTrackSources ?? false,
            outboundLinkTagging: analytics?.outboundLinkTagging ?? false,
            webAnalytics: analytics?.webAnalytics ?? false
        };

        return {
            // Raw settings
            ...settings,
            
            // Computed capabilities (if we need to combine logic)
            canShowEmailOpenStats: settings.emailTrackOpens,
            canShowEmailClickStats: settings.emailTrackClicks,
            canShowMemberSourceStats: settings.membersTrackSources,
            canShowWebAnalytics: settings.webAnalytics
        };
    }, [analytics]);
}; 