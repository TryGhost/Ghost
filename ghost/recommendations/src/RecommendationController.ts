import {Recommendation} from "./Recommendation";
import {RecommendationService} from "./RecommendationService";
import errors from '@tryghost/errors';

type Frame = {
    data: any,
    options: any,
    user: any
};

function validateString(object: any, key: string, {required = true} = {}): string|undefined {
    if (object[key] !== undefined) {
        if (typeof object[key] !== "string") {
            throw new errors.BadRequestError({message: `${key} must be a string`});
        }
        return object[key];
    } else if (required) {
        throw new errors.BadRequestError({message: `${key} is required`});
    }
}

function validateBoolean(object: any, key: string, {required = true} = {}): boolean|undefined {
    if (object[key] !== undefined) {
        if (typeof object[key] !== "boolean") {
            throw new errors.BadRequestError({message: `${key} must be a boolean`});
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

    #getFrameRecommendation(frame: Frame): Recommendation {
        if (!frame.data || !frame.data.recommendations || !frame.data.recommendations[0]) {
            throw new errors.BadRequestError();
        }

        const recommendation = frame.data.recommendations[0];

        const cleanedRecommendation: Omit<Recommendation, 'id'|'createdAt'> = {
            title: validateString(recommendation, "title") ?? '',
            url: validateString(recommendation, "url") ?? '',

            // Optional fields
            oneClickSubscribe: validateBoolean(recommendation, "one_click_subscribe", {required: false}) ?? false,
            reason: validateString(recommendation, "reason", {required: false}) ?? null,
            excerpt: validateString(recommendation, "excerpt", {required: false}) ?? null,
            featuredImage: validateString(recommendation, "featured_image", {required: false}) ?? null,
            favicon: validateString(recommendation, "favicon", {required: false}) ?? null,
        };

        // Create a new recommendation
        return new Recommendation(cleanedRecommendation);
    }

    #getFrameRecommendationEdit(frame: Frame): Partial<Recommendation> {
        if (!frame.data || !frame.data.recommendations || !frame.data.recommendations[0]) {
            throw new errors.BadRequestError();
        }

        const recommendation = frame.data.recommendations[0];
        const cleanedRecommendation: Partial<Recommendation> = {
            title: validateString(recommendation, "title", {required: false}),
            url: validateString(recommendation, "url", {required: false}),
            oneClickSubscribe: validateBoolean(recommendation, "one_click_subscribe", {required: false}),
            reason: validateString(recommendation, "reason", {required: false}),
            excerpt: validateString(recommendation, "excerpt", {required: false}),
            featuredImage: validateString(recommendation, "featured_image", {required: false}),
            favicon: validateString(recommendation, "favicon", {required: false}),
        };

        // Create a new recommendation
        return cleanedRecommendation;
    }


    #returnRecommendations(...recommendations: Recommendation[]) {
        return {
            data: recommendations.map(r => {
                return {
                    id: r.id,
                    title: r.title,
                    reason: r.reason,
                    excerpt: r.excerpt,
                    featured_image: r.featuredImage,
                    favicon: r.favicon,
                    url: r.url,
                    one_click_subscribe: r.oneClickSubscribe,
                    created_at: r.createdAt,
                };
            })
        }
    }

    async addRecommendation(frame: Frame) {
        const recommendation = this.#getFrameRecommendation(frame);
        return this.#returnRecommendations(
            await this.service.addRecommendation(recommendation)
        );
    }

    async editRecommendation(frame: Frame) {
        const id = this.#getFrameId(frame);
        const recommendationEdit = this.#getFrameRecommendationEdit(frame);

        return this.#returnRecommendations(
            await this.service.editRecommendation(id, recommendationEdit)
        );
    }

    async deleteRecommendation(frame: Frame) {
        const id = this.#getFrameId(frame);
        await this.service.deleteRecommendation(id);
    }

    async listRecommendations() {
        return this.#returnRecommendations(
            ...(await this.service.listRecommendations())
        );
    }
}
