import ObjectId from 'bson-objectid';
import errors from '@tryghost/errors';

export type AddRecommendation = {
    title: string
    reason: string|null
    excerpt: string|null // Fetched from the site meta data
    featuredImage: URL|null // Fetched from the site meta data
    favicon: URL|null // Fetched from the site meta data
    url: URL
    oneClickSubscribe: boolean
}

export type EditRecommendation = Partial<AddRecommendation>
type RecommendationConstructorData = AddRecommendation & {id: string, createdAt: Date, updatedAt: Date|null}
export type RecommendationCreateData = AddRecommendation & {id?: string, createdAt?: Date, updatedAt?: Date|null}

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

    private constructor(data: RecommendationConstructorData) {
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
        if (properties.url.protocol !== 'http:' && properties.url.protocol !== 'https:') {
            throw new errors.ValidationError({
                message: 'url must be a valid URL'
            });
        }

        if (properties.featuredImage !== null) {
            if (properties.featuredImage.protocol !== 'http:' && properties.featuredImage.protocol !== 'https:') {
                throw new errors.ValidationError({
                    message: 'Featured image must be a valid URL'
                });
            }
        }

        if (properties.favicon !== null) {
            if (properties.favicon.protocol !== 'http:' && properties.favicon.protocol !== 'https:') {
                throw new errors.ValidationError({
                    message: 'Favicon must be a valid URL'
                });
            }
        }

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
            featuredImage: data.featuredImage,
            favicon: data.favicon,
            url: data.url,
            oneClickSubscribe: data.oneClickSubscribe,
            createdAt: data.createdAt ?? new Date(),
            updatedAt: data.updatedAt ?? null
        };

        this.validate(d);
        const recommendation = new Recommendation(d);
        recommendation.clean();

        return recommendation;
    }

    edit(properties: EditRecommendation) {
        Recommendation.validate({...this, ...properties});

        Object.assign(this, properties);
        this.clean();
    }

    delete() {
        this.#deleted = true;
    }
}
