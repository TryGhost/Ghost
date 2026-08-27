import { createQueryResource } from '../utils/api/hooks';
import { SETTINGS_BOOTSTRAP_QUERY_SCOPE } from '../utils/api/query-scopes';
import { Config, hasSendingDomain, isManagedEmail, sendingDomain } from './config';

// Types

export type SiteData = {
  title: string;
  description: string;
  logo: string;
  icon: string;
  cover_image: string;
  accent_color: string;
  url: string;
  locale: string;
  version: string;
  site_uuid: string;
};

export interface SiteResponseType {
  site: SiteData;
}

// Requests

const dataType = 'SiteResponseType';

const browseSiteResource = createQueryResource<SiteResponseType>({
  dataType,
  path: '/site/',
  errorResetScope: SETTINGS_BOOTSTRAP_QUERY_SCOPE,
});

export const useBrowseSite = browseSiteResource.useQuery;
export const useBrowseSiteQueryOptions = browseSiteResource.useQueryOptions;
export const useBrowseSiteSuspense = browseSiteResource.useSuspenseQuery;

// Helpers

export function getHomepageUrl(siteData: SiteData): string {
  const url = new URL(siteData.url);
  const subdir = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;

  return `${url.origin}${subdir}`;
}

export function getEmailDomain(siteData: SiteData, config: Config): string {
  if (isManagedEmail(config) && hasSendingDomain(config)) {
    return sendingDomain(config) || '';
  }

  const domain = new URL(siteData.url).hostname || '';
  if (domain.startsWith('www.')) {
    return domain.replace(/^(www)\.(?=[^/]*\..{2,5})/, '');
  }
  return domain;
}

export function fullEmailAddress(value: 'noreply' | string, siteData: SiteData, config: Config) {
  const emailDomain = getEmailDomain(siteData, config);
  return value === 'noreply' ? `noreply@${emailDomain}` : value;
}
