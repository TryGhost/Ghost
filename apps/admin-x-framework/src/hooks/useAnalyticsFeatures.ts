import {useMemo} from 'react';
import {useAppContext} from '../providers/AppProvider';

export interface AnalyticsFeatures {
    // Raw settings access
    emailTrackOpens: boolean;
    emailTrackClicks: boolean;
    membersTrackSources: boolean;
    outboundLinkTagging: boolean;
    webAnalytics: boolean;
    
    // Computed features
    canShowEmailStats: boolean;
    canShowClickStats: boolean;
    canShowSourceStats: boolean;
    canShowWebAnalytics: boolean;
    canShowDetailedStats: boolean;
    isEmailTrackingEnabled: boolean;
    isFullAnalyticsEnabled: boolean;
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
            
            // Computed capabilities
            canShowEmailStats: settings.emailTrackOpens || settings.emailTrackClicks,
            canShowClickStats: settings.emailTrackClicks,
            canShowSourceStats: settings.membersTrackSources,
            canShowWebAnalytics: settings.webAnalytics,
            canShowDetailedStats: settings.emailTrackClicks && settings.membersTrackSources,
            isEmailTrackingEnabled: settings.emailTrackOpens || settings.emailTrackClicks,
            isFullAnalyticsEnabled: settings.emailTrackOpens && 
                                   settings.emailTrackClicks && 
                                   settings.membersTrackSources &&
                                   settings.webAnalytics
        };
    }, [analytics]);
}; 