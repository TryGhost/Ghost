/* eslint-disable @typescript-eslint/no-explicit-any */
import {EntityWithIncludes} from './EntityWithIncludes';
import {AddRecommendation, EditRecommendation, Recommendation} from './Recommendation';
import {RecommendationInclude, RecommendationService} from './RecommendationService';
import errors from '@tryghost/errors';

type Frame = {
    data: any,
    options: any,
    user: any,
    member: any,
};

function validateString(object: any, key: string, {required = true, nullable = false} = {}): string|undefined|null {
    if (typeof object !== 'object' || object === null) {
        throw new errors.BadRequestError({message: `${key} must be an object`});
    }

    if (nullable && object[key] === null) {
        return null;
    }

    if (object[key] !== undefined && object[key] !== null) {
        if (typeof object[key] !== 'string') {
            throw new errors.BadRequestError({message: `${key} must be a string`});
        }
        return object[key];
    } else if (required) {
        throw new errors.BadRequestError({message: `${key} is required`});
    }
}

function validateBoolean(object: any, key: string, {required = true} = {}): boolean|undefined {
    if (typeof object !== 'object' || object === null) {
        throw new errors.BadRequestError({message: `${key} must be an object`});
    }
    if (object[key] !== undefined) {
        if (typeof object[key] !== 'boolean') {
            throw new errors.BadRequestError({message: `${key} must be a boolean`});
        }
        return object[key];
    } else if (required) {
        throw new errors.BadRequestError({message: `${key} is required`});
    }
}

function validateURL(object: any, key: string, {required = true, nullable = false} = {}): URL|undefined|null {
    const string = validateString(object, key, {required, nullable});
    if (string === null) {
        return null;
    }
    if (string !== undefined) {
        try {
            return new URL(string);
        } catch (e) {
            throw new errors.BadRequestError({message: `${key} must be a valid URL`});
        }
    }
}

function validateInteger(object: any, key: string, {required = true, nullable = false} = {}): number|undefined|null {
    if (typeof object !== 'object' || object === null) {
        throw new errors.BadRequestError({message: `${key} must be an object`});
    }

    if (nullable && object[key] === null) {
        return null;
    }

    if (object[key] !== undefined && object[key] !== null) {
        if (typeof object[key] === 'string') {
            // Try to cast to a number
            const parsed = parseInt(object[key]);
            if (isNaN(parsed) || !isFinite(parsed)) {
                throw new errors.BadRequestError({message: `${key} must be a number`});
            }
            return parsed;
        }

        if (typeof object[key] !== 'number') {
            throw new errors.BadRequestError({message: `${key} must be a number`});
        }
        return object[key];
    } else if (required) {
        throw new errors.BadRequestError({message: `${key} is required`});
    }
}

export class RecommendationController {
    service: RecommendationService;

    constructor(deps: {service: RecommendationService}) {
        this.service = deps.service;
    }

    #getFrameId(frame: Frame): string {
        if (!frame.options) {
            throw new errors.BadRequestError();
        }

        const id = frame.options.id;
        if (!id) {
            throw new errors.BadRequestError();
        }

        return id;
    }

    #getFrameInclude(frame: Frame, allowedIncludes: RecommendationInclude[]): RecommendationInclude[] {
        if (!frame.options || !frame.options.withRelated) {
            return [];
        }

        const includes = frame.options.withRelated;

        // Check if all includes are allowed
        const invalidIncludes = includes.filter((i: unknown) => {
            if (typeof i !== 'string') {
                return true;
            }
            return !allowedIncludes.includes(i as RecommendationInclude);
        });

        if (invalidIncludes.length) {
            throw new errors.BadRequestError({
                message: `Invalid include: ${invalidIncludes.join(',')}`
            });
        }
        return includes as RecommendationInclude[];
    }

    #getFramePage(frame: Frame): number {
        const page = validateInteger(frame.options, 'page', {required: false, nullable: true}) ?? 1;
        if (page < 1) {
            throw new errors.BadRequestError({message: 'page must be greater or equal to 1'});
        }

        return page;
    }

    #getFrameLimit(frame: Frame, defaultLimit = 15): number {
        const limit = validateInteger(frame.options, 'limit', {required: false, nullable: true}) ?? defaultLimit;
        if (limit < 1) {
            throw new errors.BadRequestError({message: 'limit must be greater or equal to 1'});
        }
        return limit;
    }

    #getFrameMemberId(frame: Frame): string {
        if (!frame.options?.context?.member?.id) {
            // This is an internal server error because authentication should happen outside this service.
            throw new errors.UnauthorizedError({
                message: 'Member not found'
            });
        }
        return frame.options.context.member.id;
    }

    #getFrameRecommendation(frame: Frame): AddRecommendation {
        if (!frame.data || !frame.data.recommendations || !frame.data.recommendations[0]) {
            throw new errors.BadRequestError();
        }

        const recommendation = frame.data.recommendations[0];

        const cleanedRecommendation: AddRecommendation = {
            title: validateString(recommendation, 'title') ?? '',
            url: validateURL(recommendation, 'url')!,

            // Optional fields
            oneClickSubscribe: validateBoolean(recommendation, 'one_click_subscribe', {required: false}) ?? false,
            reason: validateString(recommendation, 'reason', {required: false, nullable: true}) ?? null,
            excerpt: validateString(recommendation, 'excerpt', {required: false, nullable: true}) ?? null,
            featuredImage: validateURL(recommendation, 'featured_image', {required: false, nullable: true}) ?? null,
            favicon: validateURL(recommendation, 'favicon', {required: false, nullable: true}) ?? null
        };

        // Create a new recommendation
        return cleanedRecommendation;
    }

    #getFrameRecommendationEdit(frame: Frame): Partial<EditRecommendation> {
        if (!frame.data || !frame.data.recommendations || !frame.data.recommendations[0]) {
            throw new errors.BadRequestError();
        }

        const recommendation = frame.data.recommendations[0];
        const cleanedRecommendation: EditRecommendation = {
            title: validateString(recommendation, 'title', {required: false}) ?? undefined,
            url: validateURL(recommendation, 'url', {required: false}) ?? undefined,
            oneClickSubscribe: validateBoolean(recommendation, 'one_click_subscribe', {required: false}),
            reason: validateString(recommendation, 'reason', {required: false, nullable: true}),
            excerpt: validateString(recommendation, 'excerpt', {required: false, nullable: true}),
            featuredImage: validateURL(recommendation, 'featured_image', {required: false, nullable: true}),
            favicon: validateURL(recommendation, 'favicon', {required: false, nullable: true})
        };

        // Create a new recommendation
        return cleanedRecommendation;
    }

    #returnRecommendations(recommendations: EntityWithIncludes<Recommendation, RecommendationInclude>[], meta?: any) {
        return {
            data: recommendations.map(({entity, includes}) => {
                const d = {
                    id: entity.id,
                    title: entity.title,
                    reason: entity.reason,
                    excerpt: entity.excerpt,
                    featured_image: entity.featuredImage?.toString() ?? null,
                    favicon: entity.favicon?.toString() ?? null,
                    url: entity.url.toString(),
                    one_click_subscribe: entity.oneClickSubscribe,
                    created_at: entity.createdAt,
                    updated_at: entity.updatedAt,
                    count: undefined as undefined|{clicks?: number, subscribers?: number}
                };

                for (const [key, value] of includes) {
                    if (key === 'count.clicks') {
                        if (typeof value !== 'number') {
                            continue;
                        }
                        d.count = {
                            ...(d.count ?? {}),
                            clicks: value
                        };
                        continue;
                    }

                    if (key === 'count.subscribers') {
                        if (typeof value !== 'number') {
                            continue;
                        }
                        d.count = {
                            ...(d.count ?? {}),
                            subscribers: value
                        };
                        continue;
                    }

                    // This should never happen (if you get a compile error: check if you added all includes above)
                    const n: never = key;
                    throw new errors.BadRequestError({
                        message: `Unsupported include: ${n}`
                    });
                }

                return d;
            }),
            meta
        };
    }

    #buildPagination({page, limit, count}: {page: number, limit: number, count: number}) {
        const pages = Math.ceil(count / limit);

        return {
            page,
            limit,
            total: count,
            pages,
            prev: page > 1 ? page - 1 : null,
            next: page < pages ? page + 1 : null
        };
    }

    async addRecommendation(frame: Frame) {
        const recommendation = this.#getFrameRecommendation(frame);
        return this.#returnRecommendations(
            [await this.service.addRecommendation(recommendation)]
        );
    }

    async editRecommendation(frame: Frame) {
        const id = this.#getFrameId(frame);
        const recommendationEdit = this.#getFrameRecommendationEdit(frame);

        return this.#returnRecommendations(
            [await this.service.editRecommendation(id, recommendationEdit)]
        );
    }

    async deleteRecommendation(frame: Frame) {
        const id = this.#getFrameId(frame);
        await this.service.deleteRecommendation(id);
    }

    async listRecommendations(frame: Frame) {
        const page = this.#getFramePage(frame);
        const limit = this.#getFrameLimit(frame, 5);
        const include = this.#getFrameInclude(frame, ['count.clicks', 'count.subscribers']);
        const order = [
            {
                field: 'createdAt' as const,
                direction: 'desc' as const
            }
        ];

        const count = await this.service.countRecommendations({});
        const data = (await this.service.listRecommendations({page, limit, order, include}));

        return this.#returnRecommendations(
            data,
            {
                pagination: this.#buildPagination({page, limit, count})
            }
        );
    }

    async trackClicked(frame: Frame) {
        // First get the ID of the recommendation that was clicked
        const id = this.#getFrameId(frame);
        // Check type of event
        let memberId: string | undefined;
        try {
            memberId = this.#getFrameMemberId(frame);
        } catch (e) {
            if (e instanceof errors.UnauthorizedError) {
                // This is fine, this is not required
            } else {
                throw e;
            }
        }

        await this.service.trackClicked({
            id,
            memberId
        });
    }
    async trackSubscribed(frame: Frame) {
        // First get the ID of the recommendation that was clicked
        const id = this.#getFrameId(frame);
        const memberId = this.#getFrameMemberId(frame);
        await this.service.trackSubscribed({
            id,
            memberId
        });
    }
}
