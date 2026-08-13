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
     */
    async isPurchasable(resourceType: 'posts' | 'pages', id: string): Promise<boolean> {
        const model = await this.#findPublished(resourceType, id, ['tiers']);
        if (!model) {
            return false;
        }

        return isPurchasableEntry(model.toJSON());
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

        if (this.urlService) {
            entry.url = this.urlService.getUrlForResource({
                ...entry,
                type: type === 'page' ? 'pages' : 'posts'
            }, {absolute: true});

            if (!entry.url || String(entry.url).endsWith('/404/')) {
                return null;
            }
        }

        return entry;
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
