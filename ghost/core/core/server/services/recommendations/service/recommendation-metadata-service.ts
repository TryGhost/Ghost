/* eslint-disable ghost/filenames/match-exported-class */

type OembedMetadata<Type extends string> = {
    version: '1.0',
    type: Type,
    url: string,
    metadata: {
        title: string|null,
        description: string|null,
        publisher: string|null,
        author: string|null,
        thumbnail: string|null,
        icon: string|null
    },
    body?: Type extends 'mention' ? string : unknown,
    contentType?: Type extends 'mention' ? string : unknown
}

type OEmbedService = {
    fetchOembedDataFromUrl<Type extends string>(url: string, type: Type, options?: {timeout?: number}): Promise<OembedMetadata<Type>>
}

type ExternalRequest = {
    get(url: string, options: object): Promise<{statusCode: number, body: string}>
}

export type RecommendationMetadata = {
    title: string|null,
    excerpt: string|null,
    featuredImage: URL|null,
    favicon: URL|null,
    oneClickSubscribe: boolean
}

export class RecommendationMetadataService {
    #oembedService: OEmbedService;
    #externalRequest: ExternalRequest;

    constructor(dependencies: {oembedService: OEmbedService, externalRequest: ExternalRequest}) {
        this.#oembedService = dependencies.oembedService;
        this.#externalRequest = dependencies.externalRequest;
    }

    async #fetchJSON(url: URL, options?: {timeout?: number}) {
        // Even though we have throwHttpErrors: false, we still need to catch DNS errors
        // that can arise from externalRequest, otherwise we'll return a HTTP 500 to the user
        try {
            // default content type is application/x-www-form-encoded which is what we need for the webmentions spec
            const response = await this.#externalRequest.get(url.toString(), {
                throwHttpErrors: false,
                maxRedirects: 10,
                followRedirect: true,
                timeout: 15000,
                retry: {
                    // Only retry on network issues, or specific HTTP status codes
                    limit: 3
                },
                ...options
            });

            if (response.statusCode >= 200 && response.statusCode < 300) {
                try {
                    return JSON.parse(response.body);
                } catch {
                    return undefined;
                }
            }
        } catch {
            return undefined;
        }
    }

    #castUrl(url: string|null|undefined): URL|null {
        if (!url) {
            return null;
        }
        try {
            return new URL(url);
        } catch {
            return null;
        }
    }

    async fetch(url: URL, options: {timeout: number} = {timeout: 5000}): Promise<RecommendationMetadata> {
        // Make sure url path ends with a slash (urls should be resolved relative to the path)
        if (!url.pathname.endsWith('/')) {
            url.pathname += '/';
        }

        // 1. Check if it is a Ghost site
        let ghostSiteData = await this.#fetchJSON(
            new URL('members/api/site', url),
            options
        );

        if (!ghostSiteData && url.pathname !== '' && url.pathname !== '/') {
            // Try root relative URL
            ghostSiteData = await this.#fetchJSON(
                new URL('members/api/site', url.origin),
                options
            );
        }

        if (ghostSiteData && typeof ghostSiteData === 'object' && ghostSiteData.site && typeof ghostSiteData.site === 'object') {
            // Check if the Ghost site returns allow_external_signup, otherwise it is an old Ghost version that returns unreliable data
            if (typeof ghostSiteData.site.allow_external_signup === 'boolean') {
                return {
                    title: ghostSiteData.site.title || null,
                    excerpt: ghostSiteData.site.description || null,
                    featuredImage: this.#castUrl(ghostSiteData.site.cover_image),
                    favicon: this.#castUrl(ghostSiteData.site.icon || ghostSiteData.site.logo),
                    oneClickSubscribe: !!ghostSiteData.site.allow_external_signup
                };
            }
        }

        // Use the oembed service to fetch metadata
        const oembed = await this.#oembedService.fetchOembedDataFromUrl(url.toString(), 'mention');

        return {
            title: oembed?.metadata?.title || null,
            excerpt: oembed?.metadata?.description || null,
            featuredImage: this.#castUrl(oembed?.metadata?.thumbnail),
            favicon: this.#castUrl(oembed?.metadata?.icon),
            oneClickSubscribe: false
        };
    }
}
