export interface ToolbarConfig {
  adminUrl: string;
  siteTitle: string;
  pageContext: string;
  resourceType: string;
  resourceId: string;
  resourceSlug: string;
  siteAnalyticsEnabled: boolean;
  activityPubEnabled: boolean;
  membersEnabled: boolean;
  commentsEnabled: boolean;
}

export function getScript() {
  return (
    document.currentScript ||
    document.querySelector<HTMLScriptElement>('script[data-ghost-admin-toolbar]')
  );
}

export function normalizeAdminUrl(adminUrl: string | undefined) {
  if (!adminUrl) {
    return null;
  }

  return adminUrl.endsWith('/') ? adminUrl : `${adminUrl}/`;
}

export function getConfig(script: HTMLOrSVGScriptElement | null): ToolbarConfig | null {
  const dataset: DOMStringMap = script?.dataset || {};
  const adminUrl = normalizeAdminUrl(dataset.ghostAdminToolbar);

  if (!adminUrl) {
    return null;
  }

  return {
    adminUrl,
    siteTitle: dataset.siteTitle || 'Ghost',
    pageContext: dataset.pageContext || '',
    resourceType: dataset.resourceType || '',
    resourceId: dataset.resourceId || '',
    resourceSlug: dataset.resourceSlug || '',
    siteAnalyticsEnabled: dataset.siteAnalyticsEnabled === 'true',
    activityPubEnabled: dataset.activitypubEnabled === 'true',
    membersEnabled: dataset.membersEnabled === 'true',
    commentsEnabled: dataset.commentsEnabled !== 'false',
  };
}
