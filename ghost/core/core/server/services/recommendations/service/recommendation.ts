/* eslint-disable ghost/filenames/match-exported-class */

import ObjectId from 'bson-objectid';
import errors from '@tryghost/errors';
import {UnsafeData} from './unsafe-data';

/**
 * We never expose Entities outside of services. Because we should never expose the bussiness logic methods. The plain objects are used for that
 */
export type RecommendationPlain = {
    id: string,
    title: string
    description: string|null
    excerpt: string|null // Fetched from the site meta data
    featuredImage: URL|null // Fetched from the site meta data
    favicon: URL|null // Fetched from the site meta data
    url: URL
    oneClickSubscribe: boolean,
    createdAt: Date,
    updatedAt: Date|null,

    /**
     * These are read only, you cannot change them
     */
    clickCount?: number
    subscriberCount?: number
}

export type RecommendationCreateData = {
    id?: string
    title: string
    description: string|null
    excerpt: string|null // Fetched from the site meta data
    featuredImage: URL|string|null // Fetched from the site meta data
    favicon: URL|string|null // Fetched from the site meta data
    url: URL|string
    oneClickSubscribe: boolean
    createdAt?: Date
    updatedAt?: Date|null,

    /**
     * These are read only, you cannot change them
     */
    clickCount?: number
    subscriberCount?: number
}

export type AddRecommendation = Omit<RecommendationCreateData, 'id'|'createdAt'|'updatedAt'>
export type EditRecommendation = Partial<AddRecommendation>

export class Recommendation {
    id: string;
    title: string;
    description: string|null;
    excerpt: string|null; // Fetched from the site meta data
    featuredImage: URL|null; // Fetched from the site meta data
    favicon: URL|null; // Fetched from the site meta data
    url: URL;
    oneClickSubscribe: boolean;
    createdAt: Date;
    updatedAt: Date|null;
    #clickCount: number|undefined;
    #subscriberCount: number|undefined;

    #deleted: boolean;

    get deleted() {
        return this.#deleted;
    }

    get clickCount() {
        return this.#clickCount;
    }

    get subscriberCount() {
        return this.#subscriberCount;
    }

    private constructor(data: RecommendationPlain) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.excerpt = data.excerpt;
        this.featuredImage = data.featuredImage;
        this.favicon = data.favicon;
        this.url = data.url;
        this.oneClickSubscribe = data.oneClickSubscribe;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.#clickCount = data.clickCount;
        this.#subscriberCount = data.subscriberCount;
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

        if (properties.description && properties.description.length > 200) {
            throw new errors.ValidationError({
                message: 'Description must be less than 200 characters'
            });
        }
    }

    clean() {
        if (this.description !== null && this.description.length === 0) {
            this.description = null;
        }

        if (this.excerpt !== null && this.excerpt.length === 0) {
            this.excerpt = null;
        }

        if (this.excerpt !== null && this.excerpt.length > 2000) {
            this.excerpt = this.excerpt.slice(0, 1997) + '...';
        }

        this.createdAt.setMilliseconds(0);
        this.updatedAt?.setMilliseconds(0);
    }

    static create(data: RecommendationCreateData) {
        const id = data.id ?? ObjectId().toString();

        const d = {
            id,
            title: data.title,
            description: data.description,
            excerpt: data.excerpt,
            featuredImage: new UnsafeData(data.featuredImage, {field: ['featuredImage']}).nullable.url,
            favicon: new UnsafeData(data.favicon, {field: ['favicon']}).nullable.url,
            url: new UnsafeData(data.url, {field: ['url']}).url,
            oneClickSubscribe: data.oneClickSubscribe,
            createdAt: data.createdAt ?? new Date(),
            updatedAt: data.updatedAt ?? null,
            clickCount: data.clickCount,
            subscriberCount: data.subscriberCount
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
            description: this.description,
            excerpt: this.excerpt,
            featuredImage: this.featuredImage,
            favicon: this.favicon,
            url: this.url,
            oneClickSubscribe: this.oneClickSubscribe,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            clickCount: this.clickCount,
            subscriberCount: this.subscriberCount
        };
    }

    /**
     * Change the specified properties. Properties that are set to undefined will not be changed
     */
    edit(properties: EditRecommendation) {
        // Delete undefined properties
        const newProperties = this.plain;
        let didChange = false;

        for (const key of Object.keys(properties) as (keyof EditRecommendation)[]) {
            if (Object.prototype.hasOwnProperty.call(properties, key) && properties[key] !== undefined && properties[key] !== newProperties[key]) {
                (newProperties as Record<string, unknown>)[key] = properties[key] as unknown;
                didChange = true;
            }
        }

        if (!didChange) {
            return;
        }
        newProperties.updatedAt = new Date();

        const created = Recommendation.create(newProperties);
        Object.assign(this, created);
    }

    delete() {
        this.#deleted = true;
    }
}
