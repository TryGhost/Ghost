/* eslint-disable @typescript-eslint/no-explicit-any */
import errors from '@tryghost/errors';
import {AddRecommendation, Recommendation, RecommendationPlain} from './recommendation';
import {RecommendationService} from './recommendation-service';
import {UnsafeData} from './unsafe-data';
import {OrderOption} from './bookshelf-repository';

type Frame = {
    data: unknown,
    options: unknown,
    user: unknown,
};

const RecommendationIncludesMap = {
    'count.clicks': 'clickCount' as const,
    'count.subscribers': 'subscriberCount' as const
};

const RecommendationOrderMap = {
    title: 'title' as const,
    description: 'description' as const,
    excerpt: 'excerpt' as const,
    one_click_subscribe: 'oneClickSubscribe' as const,
    created_at: 'createdAt' as const,
    updated_at: 'updatedAt' as const,
    'count.clicks': 'clickCount' as const,
    'count.subscribers': 'subscriberCount' as const
};

export class RecommendationController {
    service: RecommendationService;

    constructor(deps: {service: RecommendationService}) {
        this.service = deps.service;
    }

    async read(frame: Frame) {
        const options = new UnsafeData(frame.options);
        const id = options.key('id').string;

        const recommendation = await this.service.readRecommendation(id);

        return this.#serialize(
            [recommendation]
        );
    }

    async add(frame: Frame) {
        const data = new UnsafeData(frame.data);
        const recommendation = data.key('recommendations').index(0);
        const plain: AddRecommendation = {
            title: recommendation.key('title').string,
            url: recommendation.key('url').url,

            // Optional fields
            oneClickSubscribe: recommendation.optionalKey('one_click_subscribe')?.boolean ?? false,
            description: recommendation.optionalKey('description')?.nullable.string ?? null,
            excerpt: recommendation.optionalKey('excerpt')?.nullable.string ?? null,
            featuredImage: recommendation.optionalKey('featured_image')?.nullable.url ?? null,
            favicon: recommendation.optionalKey('favicon')?.nullable.url ?? null
        };

        return this.#serialize(
            [await this.service.addRecommendation(plain)]
        );
    }

    /**
     * Given a recommendation URL, returns either an existing recommendation with that url and updated metadata,
     * or the metadata from that URL as if it would create a new one (without creating a new one)
     *
     * This can be used in the frontend when creating a new recommendation (duplication checking + showing a preview before saving)
     */
    async check(frame: Frame) {
        const data = new UnsafeData(frame.data);
        const recommendation = data.key('recommendations').index(0);
        const url = recommendation.key('url').url;

        return this.#serialize(
            [await this.service.checkRecommendation(url)]
        );
    }

    async edit(frame: Frame) {
        const options = new UnsafeData(frame.options);
        const data = new UnsafeData(frame.data);
        const recommendation = data.key('recommendations').index(0);

        const id = options.key('id').string;
        const plain: Partial<RecommendationPlain> = {
            title: recommendation.optionalKey('title')?.string,
            url: recommendation.optionalKey('url')?.url,
            oneClickSubscribe: recommendation.optionalKey('one_click_subscribe')?.boolean,
            description: recommendation.optionalKey('description')?.nullable.string,
            excerpt: recommendation.optionalKey('excerpt')?.nullable.string,
            featuredImage: recommendation.optionalKey('featured_image')?.nullable.url,
            favicon: recommendation.optionalKey('favicon')?.nullable.url
        };

        return this.#serialize(
            [await this.service.editRecommendation(id, plain)]
        );
    }

    async destroy(frame: Frame) {
        const options = new UnsafeData(frame.options);
        const id = options.key('id').string;
        await this.service.deleteRecommendation(id);
    }

    #stringToOrder(str?: string) {
        if (!str) {
            // Default order
            return [
                {
                    field: 'createdAt' as const,
                    direction: 'desc' as const
                }
            ];
        }

        const parts = str.split(',');
        const order: OrderOption<Recommendation> = [];
        for (const [index, part] of parts.entries()) {
            const trimmed = part.trim();
            const fieldData = new UnsafeData(trimmed.split(' ')[0].trim(), {field: ['order', index.toString(), 'field']});
            const directionData = new UnsafeData(trimmed.split(' ')[1]?.trim() ?? 'desc', {field: ['order', index.toString(), 'direction']});

            const validatedField = fieldData.enum(
                Object.keys(RecommendationOrderMap) as (keyof typeof RecommendationOrderMap)[]
            );
            const direction = directionData.enum(['asc' as const, 'desc' as const]);

            // Convert 'count.' and camelCase to snake_case
            const field = RecommendationOrderMap[validatedField];
            order.push({
                field,
                direction
            });
        }

        return order;
    }

    async browse(frame: Frame) {
        const options = new UnsafeData(frame.options);

        const page = options.optionalKey('page')?.integer ?? 1;
        const limit = options.optionalKey('limit')?.integer ?? 5;
        const include = options.optionalKey('withRelated')?.array.map((item) => {
            return RecommendationIncludesMap[item.enum(
                Object.keys(RecommendationIncludesMap) as (keyof typeof RecommendationIncludesMap)[]
            )];
        }) ?? [];
        const filter = options.optionalKey('filter')?.string;

        const orderOption = options.optionalKey('order')?.string;
        const order = this.#stringToOrder(orderOption);

        const count = await this.service.countRecommendations({});
        const recommendations = (await this.service.listRecommendations({page, limit, filter, include, order}));

        return this.#serialize(
            recommendations,
            {
                pagination: this.#serializePagination({page, limit, count})
            }
        );
    }

    async trackClicked(frame: Frame) {
        const member = this.#optionalAuthMember(frame);
        const options = new UnsafeData(frame.options);
        const id = options.key('id').string;

        await this.service.trackClicked({
            id,
            memberId: member?.id
        });
    }
    async trackSubscribed(frame: Frame) {
        const member = this.#authMember(frame);
        const options = new UnsafeData(frame.options);
        const id = options.key('id').string;

        await this.service.trackSubscribed({
            id,
            memberId: member.id
        });
    }

    #authMember(frame: Frame): {id: string} {
        const options = new UnsafeData(frame.options);
        const memberId = options.key('context').optionalKey('member')?.nullable.key('id').string;
        if (!memberId) {
            // This is an internal server error because authentication should happen outside this service.
            throw new errors.UnauthorizedError({
                message: 'Member not found'
            });
        }
        return {
            id: memberId
        };
    }

    #optionalAuthMember(frame: Frame): {id: string}|null {
        try {
            const member = this.#authMember(frame);
            return member;
        } catch (e) {
            if (e instanceof errors.UnauthorizedError) {
                // This is fine, this is not required
            } else {
                throw e;
            }
        }
        return null;
    }

    #serialize(recommendations: Partial<RecommendationPlain>[], meta?: any) {
        return {
            data: recommendations.map((entity) => {
                const d = {
                    id: entity.id ?? null,
                    title: entity.title ?? null,
                    description: entity.description ?? null,
                    excerpt: entity.excerpt ?? null,
                    featured_image: entity.featuredImage?.toString() ?? null,
                    favicon: entity.favicon?.toString() ?? null,
                    url: entity.url?.toString() ?? null,
                    one_click_subscribe: entity.oneClickSubscribe ?? null,
                    created_at: entity.createdAt?.toISOString() ?? null,
                    updated_at: entity.updatedAt?.toISOString() ?? null,
                    count: entity.clickCount !== undefined || entity.subscriberCount !== undefined ? {
                        clicks: entity.clickCount,
                        subscribers: entity.subscriberCount
                    } : undefined
                };

                return d;
            }),
            meta
        };
    }

    #serializePagination({page, limit, count}: {page: number, limit: number, count: number}) {
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
}
