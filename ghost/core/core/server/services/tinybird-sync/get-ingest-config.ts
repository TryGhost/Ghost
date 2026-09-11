import { z } from 'zod';

const StatsConfigSchema = z.object({
  id: z.string().min(1).optional(),
});

const SiteUuidSchema = z.string().min(1);
const SyncAuthKeySchema = z.string().min(1);
const TrackerEndpointSchema = z.url();
const ANALYTICS_PATH_PREFIX = '/.ghost/analytics/';

export type IngestConfig = {
  endpoint: URL;
  trafficAnalyticsAuth: string;
  siteUuid: string;
};

export type GetIngestConfigDependencies = {
  config: {
    get(key: string): unknown;
  };
  settingsCache: {
    get(key: string): unknown;
  };
};

export function getIngestConfig({
  config,
  settingsCache,
}: GetIngestConfigDependencies): IngestConfig | null {
  const trackerEndpointResult = TrackerEndpointSchema.safeParse(
    config.get('tinybird:tracker:endpoint'),
  );
  const syncAuthKeyResult = SyncAuthKeySchema.safeParse(config.get('tinybird:sync_auth_key'));
  if (!trackerEndpointResult.success || !syncAuthKeyResult.success) {
    return null;
  }

  const endpoint = new URL(trackerEndpointResult.data);
  const analyticsPathIndex = endpoint.pathname.indexOf(ANALYTICS_PATH_PREFIX);
  if (analyticsPathIndex === -1) {
    return null;
  }
  endpoint.pathname = `${endpoint.pathname.slice(
    0,
    analyticsPathIndex + ANALYTICS_PATH_PREFIX.length,
  )}api/v1/tinybird-sync`;

  const statsResult = StatsConfigSchema.safeParse(config.get('tinybird:stats'));
  const settingsSiteUuidResult = SiteUuidSchema.safeParse(settingsCache.get('site_uuid'));
  let siteUuid = statsResult.success ? statsResult.data.id : undefined;

  if (!siteUuid && settingsSiteUuidResult.success) {
    siteUuid = settingsSiteUuidResult.data;
  }

  if (!siteUuid) {
    return null;
  }

  return {
    endpoint,
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
    trafficAnalyticsAuth: syncAuthKeyResult.data,
    siteUuid,
  };
}
