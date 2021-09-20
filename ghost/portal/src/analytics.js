import setupGhostApi from './utils/api';

function sendEntryViewEvent({analyticsId, api}) {
    if (analyticsId) {
        api.analytics.pushEvent({
            event_name: 'entry_view',
            member_id: '',
            member_status: '',
            entry_id: analyticsId,
            source_url: window.location.href
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
