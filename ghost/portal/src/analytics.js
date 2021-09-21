import setupGhostApi from './utils/api';

function sendEntryViewEvent({analyticsId, api}) {
    if (analyticsId) {
        api.analytics.pushEvent({
            type: 'entry_view',
            entry_id: analyticsId,
            entry_url: window.location.href,
            created_at: new Date()
        });
    }
}

function setupAnalytics({siteUrl, analyticsId}) {
    const GhostApi = setupGhostApi({siteUrl});
    // Fire page/post view event
    sendEntryViewEvent({analyticsId, api: GhostApi});
    return {};
}

export default setupAnalytics;
