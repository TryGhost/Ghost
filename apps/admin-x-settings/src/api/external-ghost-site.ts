import {useFetchApi} from '../utils/api/hooks';

export type GhostSiteResponse = {
    site: {
        title: string,
        description: string | null,
        logo: URL | null,
        icon: URL | null,
        cover_image : URL | null,
        allow_external_signup: boolean,
        url: URL,
    }
}

export const apiUrl = (root: string, path: string, searchParams: Record<string, string> = {}) => {
    const url = new URL(`${root}${path}`, window.location.origin);
    url.search = new URLSearchParams(searchParams).toString();
    return url.toString();
};

export const useExternalGhostSite = () => {
    const fetchApi = useFetchApi();
    const path = '/members/api/site';

    return {
        async query(root: string) {
            // Remove trailing slash
            root = root.replace(/\/$/, '');
            const url = apiUrl(root, path);
            try {
                const result = await fetchApi(url, {
                    method: 'GET',
                    credentials: 'omit', // Allow CORS wildcard,
                    timeout: 5000,
                    retry: false
                });

                // We need to validate all data types here for extra safety
                if (typeof result !== 'object' || !result.site || typeof result.site !== 'object') {
                    // eslint-disable-next-line no-console
                    console.warn('Received invalid response from external Ghost site API', result);
                    return null;
                }

                // Temporary mapping (should get removed!)
                // allow_self_signup was replaced by allow_external_signup
                if (typeof result.site.allow_self_signup === 'boolean' && typeof result.site.allow_external_signup !== 'boolean') {
                    result.site.allow_external_signup = result.site.allow_self_signup;
                }

                // We need to validate all data types here for extra safety
                if (typeof result.site.title !== 'string' || typeof result.site.allow_external_signup !== 'boolean' || typeof result.site.url !== 'string') {
                    // eslint-disable-next-line no-console
                    console.warn('Received invalid response from external Ghost site API', result);
                    return null;
                }

                if (result.site.description !== null && typeof result.site.description !== 'string') {
                    // eslint-disable-next-line no-console
                    console.warn('Received invalid response from external Ghost site API', result);
                    return null;
                }

                if (result.site.logo !== null && typeof result.site.logo !== 'string') {
                    // eslint-disable-next-line no-console
                    console.warn('Received invalid response from external Ghost site API', result);
                    return null;
                }

                if (result.site.icon !== null && typeof result.site.icon !== 'string') {
                    // eslint-disable-next-line no-console
                    console.warn('Received invalid response from external Ghost site API', result);
                    return null;
                }

                if (result.site.cover_image !== null && typeof result.site.cover_image !== 'string') {
                    // eslint-disable-next-line no-console
                    console.warn('Received invalid response from external Ghost site API', result);
                    return null;
                }

                // Validate URLs
                try {
                    return {
                        site: {
                            title: result.site.title,
                            description: result.site.description,
                            logo: result.site.logo ? new URL(result.site.logo) : null,
                            icon: result.site.icon ? new URL(result.site.icon) : null,
                            cover_image: result.site.cover_image ? new URL(result.site.cover_image) : null,
                            allow_external_signup: result.site.allow_external_signup,
                            url: new URL(result.site.url)
                        }
                    };
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.warn('Received invalid response from external Ghost site API', result, e);
                    return null;
                }
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);
                return null;
            }
        }
    };
};
