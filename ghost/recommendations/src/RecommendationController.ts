/* eslint-disable @typescript-eslint/no-explicit-any */
import {AddRecommendation, EditRecommendation, Recommendation} from "./Recommendation";
import {RecommendationService} from "./RecommendationService";
import errors from '@tryghost/errors';

type Frame = {
    data: any,
    options: any,
    user: any
};

function validateString(object: any, key: string, {required = true, nullable = false} = {}): string|undefined|null {
    if (typeof object !== 'object' || object === null) {
        throw new errors.BadRequestError({message: `${key} must be an object`});
    }

    if (nullable && object[key] === null) {
        return null;
    }

    if (object[key] !== undefined && object[key] !== null) {
        if (typeof object[key] !== "string") {
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
        if (typeof object[key] !== "boolean") {
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
        if (typeof object[key] === "string") {
            // Try to cast to a number
            const parsed = parseInt(object[key]);
            if (isNaN(parsed) || !isFinite(parsed)) {
                throw new errors.BadRequestError({message: `${key} must be a number`});
            }
            return parsed;
        }

        if (typeof object[key] !== "number") {
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

    #getFramePage(frame: Frame): number {
        const page = validateInteger(frame.options, "page", {required: false, nullable: true}) ?? 1;
        if (page < 1) {
            throw new errors.BadRequestError({message: "page must be greater or equal to 1"});
        }

        return page;
    }

    #getFrameLimit(frame: Frame, defaultLimit = 15): number {
        const limit = validateInteger(frame.options, "limit", {required: false, nullable: true}) ?? defaultLimit;
        if (limit < 1) {
            throw new errors.BadRequestError({message: "limit must be greater or equal to 1"});
        }
        return limit;
    }


    #getFrameRecommendation(frame: Frame): AddRecommendation {
        if (!frame.data || !frame.data.recommendations || !frame.data.recommendations[0]) {
            throw new errors.BadRequestError();
        }

        const recommendation = frame.data.recommendations[0];

        const cleanedRecommendation: AddRecommendation = {
            title: validateString(recommendation, "title") ?? '',
            url: validateURL(recommendation, "url")!,

            // Optional fields
            oneClickSubscribe: validateBoolean(recommendation, "one_click_subscribe", {required: false}) ?? false,
            reason: validateString(recommendation, "reason", {required: false, nullable: true}) ?? null,
            excerpt: validateString(recommendation, "excerpt", {required: false, nullable: true}) ?? null,
            featuredImage: validateURL(recommendation, "featured_image", {required: false, nullable: true}) ?? null,
            favicon: validateURL(recommendation, "favicon", {required: false, nullable: true}) ?? null,
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
            title: validateString(recommendation, "title", {required: false}) ?? undefined,
            url: validateURL(recommendation, "url", {required: false}) ?? undefined,
            oneClickSubscribe: validateBoolean(recommendation, "one_click_subscribe", {required: false}),
            reason: validateString(recommendation, "reason", {required: false, nullable: true}),
            excerpt: validateString(recommendation, "excerpt", {required: false, nullable: true}),
            featuredImage: validateURL(recommendation, "featured_image", {required: false, nullable: true}),
            favicon: validateURL(recommendation, "favicon", {required: false, nullable: true}),
        };

        // Create a new recommendation
        return cleanedRecommendation;
    }


    #returnRecommendations(recommendations: Recommendation[], meta?: any) {
        return {
            data: recommendations.map(r => {
                return {
                    id: r.id,
                    title: r.title,
                    reason: r.reason,
                    excerpt: r.excerpt,
                    featured_image: r.featuredImage?.toString() ?? null,
                    favicon: r.favicon?.toString() ?? null,
                    url: r.url.toString(),
                    one_click_subscribe: r.oneClickSubscribe,
                    created_at: r.createdAt,
                    updated_at: r.updatedAt
                };
            }),
            meta
        }
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
        const order = [
            {
                field: "createdAt" as const,
                direction: "desc" as const
            }
        ];

        const count = await this.service.countRecommendations({});
        const data = (await this.service.listRecommendations({page, limit, order}));

        const pages = Math.ceil(count / limit);

        return this.#returnRecommendations(
            data,
            {
                pagination: {
                    page,
                    limit,
                    total: count,
                    pages,
                    prev: page > 1 ? page - 1 : null,
                    next: page < pages ? page + 1 : null
                }
            }
        );
    }
}
