import type { ConfigInstance } from './config/loader';

// Temporary guard for the single-site staging build.
export function isAutomationLoadTestSite(config: Pick<ConfigInstance, 'get'>): boolean {
  const adminUrl = config.get('admin:url') || config.get('url');
  return (
    config.get('blog_id') === 367317 &&
    typeof adminUrl === 'string' &&
    /^https:\/\/[^./]+\.ghost\.is(?:\/|$)/i.test(adminUrl)
  );
}
