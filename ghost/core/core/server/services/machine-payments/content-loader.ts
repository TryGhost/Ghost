import {isPurchasableEntry} from './eligibility';

type UrlServiceFacade = {
    getUrlForResource: (resource: Record<string, unknown>, options?: {absolute?: boolean}) => string;
};

type PostModelInstance = {
    toJSON: () => Record<string, unknown>;
};

type PostModel = {
    findOne: (
        data: Record<string, unknown>,
        options?: {withRelated?: string[]}
    ) => Promise<PostModelInstance | null | undefined>;
};

type ContentLoaderDeps = {
    postModel?: PostModel;
    urlServiceFacade?: UrlServiceFacade | null;
};

/**
 * Loads full post/page HTML only after payment has been verified.
 * Bypasses Content API member gating intentionally — this is the privileged
 * unlock path for machine payments, not a membership grant.
 */
export class ContentLoader {
    _postModel: PostModel | undefined;
    urlService: UrlServiceFacade | null | undefined;

    constructor({postModel, urlServiceFacade}: ContentLoaderDeps = {}) {
        this._postModel = postModel;
        this.urlService = urlServiceFacade;
    }

    get postModel(): PostModel {
        if (!this._postModel) {
            this._postModel = require('../../models').Post as PostModel;
        }
        return this._postModel;
    }

    /**
     * Raw-model eligibility check. Use this before issuing a 402 so Content API
     * tier stripping cannot mark a mixed free+paid post as purchasable.
     * Includes the same URL deliverability gate as loadFullEntry so we never
     * challenge/charge for content we cannot serve.
     */
    async isPurchasable(resourceType: 'posts' | 'pages', id: string): Promise<boolean> {
        const model = await this.#findPublished(resourceType, id, ['tiers']);
        if (!model) {
            return false;
        }

        const entry = model.toJSON();
        if (!isPurchasableEntry(entry)) {
            return false;
        }

        return this.#hasDeliverableUrl(entry, resourceType);
    }

    async loadFullEntry(resourceType: 'posts' | 'pages', id: string): Promise<Record<string, unknown> | null> {
        const type = resourceType === 'pages' ? 'page' : 'post';
        const model = await this.#findPublished(resourceType, id, ['authors', 'tags', 'tiers']);

        if (!model) {
            return null;
        }

        const entry = model.toJSON();

        if (!isPurchasableEntry(entry)) {
            return null;
        }

        entry.type = type;

        const url = this.#resolveAbsoluteUrl(entry, resourceType);
        if (url === null) {
            return null;
        }
        if (url !== undefined) {
            entry.url = url;
        }

        return entry;
    }

    /**
     * @returns `undefined` when no url service is configured, `null` when the
     * resource is not deliverable, otherwise the absolute URL.
     */
    #resolveAbsoluteUrl(entry: Record<string, unknown>, resourceType: 'posts' | 'pages'): string | null | undefined {
        if (!this.urlService) {
            return undefined;
        }

        const url = this.urlService.getUrlForResource({
            ...entry,
            type: resourceType === 'pages' ? 'pages' : 'posts'
        }, {absolute: true});

        if (!url || String(url).endsWith('/404/')) {
            return null;
        }

        return url;
    }

    #hasDeliverableUrl(entry: Record<string, unknown>, resourceType: 'posts' | 'pages'): boolean {
        return this.#resolveAbsoluteUrl(entry, resourceType) !== null;
    }

    async #findPublished(resourceType: 'posts' | 'pages', id: string, withRelated: string[]) {
        const type = resourceType === 'pages' ? 'page' : 'post';
        return await this.postModel.findOne({
            id,
            type,
            status: 'published'
        }, {withRelated});
    }
}
