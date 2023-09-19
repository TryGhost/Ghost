/* eslint-disable @typescript-eslint/no-explicit-any */
import errors from '@tryghost/errors';
import {AddRecommendation, RecommendationPlain} from './Recommendation';
import {RecommendationIncludeFields, RecommendationService, RecommendationWithIncludes} from './RecommendationService';
import {UnsafeData} from './UnsafeData';

type Frame = {
    data: unknown,
    options: unknown,
    user: unknown,
    member: unknown,
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
            reason: recommendation.optionalKey('reason')?.nullable.string ?? null,
            excerpt: recommendation.optionalKey('excerpt')?.nullable.string ?? null,
            featuredImage: recommendation.optionalKey('featured_image')?.nullable.url ?? null,
            favicon: recommendation.optionalKey('favicon')?.nullable.url ?? null
        };

        return this.#serialize(
            [await this.service.addRecommendation(plain)]
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
            reason: recommendation.optionalKey('reason')?.nullable.string,
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

    async browse(frame: Frame) {
        const options = new UnsafeData(frame.options);

        const page = options.optionalKey('page')?.integer ?? 1;
        const limit = options.optionalKey('limit')?.integer ?? 5;
        const include = options.optionalKey('withRelated')?.array.map(item => item.enum<RecommendationIncludeFields>(['count.clicks', 'count.subscribers'])) ?? [];

        const order = [
            {
                field: 'createdAt' as const,
                direction: 'desc' as const
            }
        ];

        const count = await this.service.countRecommendations({});
        const recommendations = (await this.service.listRecommendations({page, limit, order, include}));

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

    #serialize(recommendations: RecommendationWithIncludes[], meta?: any) {
        return {
            data: recommendations.map((entity) => {
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

                for (const [key, value] of Object.entries(entity)) {
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
                }

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
