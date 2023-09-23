import ObjectId from 'bson-objectid';
import errors from '@tryghost/errors';
import {UnsafeData} from './UnsafeData';

/**
 * We never expose Entities outside of services. Because we should never expose the bussiness logic methods. The plain objects are used for that
 */
export type RecommendationPlain = {
    id: string,
    title: string
    reason: string|null
    excerpt: string|null // Fetched from the site meta data
    featuredImage: URL|null // Fetched from the site meta data
    favicon: URL|null // Fetched from the site meta data
    url: URL
    oneClickSubscribe: boolean,
    createdAt: Date,
    updatedAt: Date|null
}

export type RecommendationCreateData = {
    id?: string
    title: string
    reason: string|null
    excerpt: string|null // Fetched from the site meta data
    featuredImage: URL|string|null // Fetched from the site meta data
    favicon: URL|string|null // Fetched from the site meta data
    url: URL|string
    oneClickSubscribe: boolean
    createdAt?: Date
    updatedAt?: Date|null
}

export type AddRecommendation = Omit<RecommendationCreateData, 'id'|'createdAt'|'updatedAt'>
export type EditRecommendation = Partial<AddRecommendation>

export class Recommendation {
    id: string;
    title: string;
    reason: string|null;
    excerpt: string|null; // Fetched from the site meta data
    featuredImage: URL|null; // Fetched from the site meta data
    favicon: URL|null; // Fetched from the site meta data
    url: URL;
    oneClickSubscribe: boolean;
    createdAt: Date;
    updatedAt: Date|null;

    #deleted: boolean;

    get deleted() {
        return this.#deleted;
    }

    private constructor(data: RecommendationPlain) {
        this.id = data.id;
        this.title = data.title;
        this.reason = data.reason;
        this.excerpt = data.excerpt;
        this.featuredImage = data.featuredImage;
        this.favicon = data.favicon;
        this.url = data.url;
        this.oneClickSubscribe = data.oneClickSubscribe;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.#deleted = false;
    }

    static validate(properties: AddRecommendation) {
        if (properties.title.length === 0) {
            throw new errors.ValidationError({
                message: 'Title must not be empty'
            });
        }

        if (properties.title.length > 2000) {
            throw new errors.ValidationError({
                message: 'Title must be less than 2000 characters'
            });
        }

        if (properties.reason && properties.reason.length > 2000) {
            throw new errors.ValidationError({
                message: 'Reason must be less than 2000 characters'
            });
        }

        if (properties.excerpt && properties.excerpt.length > 2000) {
            throw new errors.ValidationError({
                message: 'Excerpt must be less than 2000 characters'
            });
        }
    }

    clean() {
        if (this.reason !== null && this.reason.length === 0) {
            this.reason = null;
        }

        this.url = this.cleanURL(this.url);
        this.createdAt.setMilliseconds(0);
        this.updatedAt?.setMilliseconds(0);
    }

    cleanURL(url: URL) {
        url.search = '';
        url.hash = '';

        return url;
    };

    static create(data: RecommendationCreateData) {
        const id = data.id ?? ObjectId().toString();

        const d = {
            id,
            title: data.title,
            reason: data.reason,
            excerpt: data.excerpt,
            featuredImage: new UnsafeData(data.featuredImage).nullable.url,
            favicon: new UnsafeData(data.favicon).nullable.url,
            url: new UnsafeData(data.url).url,
            oneClickSubscribe: data.oneClickSubscribe,
            createdAt: data.createdAt ?? new Date(),
            updatedAt: data.updatedAt ?? null
        };

        this.validate(d);
        const recommendation = new Recommendation(d);
        recommendation.clean();

        return recommendation;
    }

    get plain(): RecommendationPlain {
        return {
            id: this.id,
            title: this.title,
            reason: this.reason,
            excerpt: this.excerpt,
            featuredImage: this.featuredImage,
            favicon: this.favicon,
            url: this.url,
            oneClickSubscribe: this.oneClickSubscribe,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Change the specified properties. Properties that are set to undefined will not be changed
     */
    edit(properties: EditRecommendation) {
        // Delete undefined properties
        const newProperties = this.plain;

        for (const key of Object.keys(properties) as (keyof EditRecommendation)[]) {
            if (Object.prototype.hasOwnProperty.call(properties, key) && properties[key] !== undefined) {
                (newProperties as Record<string, unknown>)[key] = properties[key] as unknown;
            }
        }

        newProperties.updatedAt = new Date();

        const created = Recommendation.create(newProperties);
        Object.assign(this, created);
    }

    delete() {
        this.#deleted = true;
    }
}
