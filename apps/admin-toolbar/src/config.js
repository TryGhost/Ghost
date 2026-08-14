export function getScript() {
  return document.currentScript || document.querySelector('script[data-ghost-admin-toolbar]');
}

export function normalizeAdminUrl(adminUrl) {
  if (!adminUrl) {
    return null;
  }

  return adminUrl.endsWith('/') ? adminUrl : `${adminUrl}/`;
}

export function getConfig(script) {
  const dataset = script?.dataset || {};
  const adminUrl = normalizeAdminUrl(dataset.ghostAdminToolbar);

  if (!adminUrl) {
    return null;
  }

  return {
    adminUrl,
        // Absolute URL of the toolbar bundle itself — used to resolve the
        // lazy-loaded edit-mode chunk relative to wherever this script is served from
        scriptUrl: script?.src || '',
    siteTitle: dataset.siteTitle || 'Ghost',
    pageContext: dataset.pageContext || '',
    resourceType: dataset.resourceType || '',
    resourceId: dataset.resourceId || '',
    resourceSlug: dataset.resourceSlug || '',
    siteAnalyticsEnabled: dataset.siteAnalyticsEnabled === 'true',
    activityPubEnabled: dataset.activitypubEnabled === 'true',
    membersEnabled: dataset.membersEnabled === 'true',
    commentsEnabled: dataset.commentsEnabled !== 'false',
        editModeEnabled: dataset.editModeEnabled === 'true',
        key: dataset.key || ''
  };
}
