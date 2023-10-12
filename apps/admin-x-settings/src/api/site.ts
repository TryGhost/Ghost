import {createQuery} from '../utils/api/hooks';

// Types

export type SiteData = {
    title: string;
    description: string;
    logo: string;
    icon: string;
    accent_color: string;
    url: string;
    locale: string;
    version: string;
};

export interface SiteResponseType {
    site: SiteData;
}

// Requests

const dataType = 'SiteResponseType';

export const useBrowseSite = createQuery<SiteResponseType>({
    dataType,
    path: '/site/'
});

// Helpers

export function getHomepageUrl(siteData: SiteData): string {
    const url = new URL(siteData.url);
    const subdir = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;

    return `${url.origin}${subdir}`;
}

export function getEmailDomain(siteData: SiteData): string {
    const domain = new URL(siteData.url).hostname || '';
    if (domain.startsWith('www.')) {
        return domain.replace(/^(www)\.(?=[^/]*\..{2,5})/, '');
    }
    return domain;
}

export function fullEmailAddress(value: 'noreply' | string, siteData: SiteData) {
    const emailDomain = getEmailDomain(siteData);
    return value === 'noreply' ? `noreply@${emailDomain}` : value;
}
