import ObjectId from "bson-objectid";

export type AddRecommendation = {
    title: string
    reason: string|null
    excerpt: string|null // Fetched from the site meta data
    featuredImage: string|null // Fetched from the site meta data
    favicon: string|null // Fetched from the site meta data
    url: URL
    oneClickSubscribe: boolean
}

export type EditRecommendation = Partial<AddRecommendation>

export class Recommendation {
    id: string
    title: string
    reason: string|null
    excerpt: string|null // Fetched from the site meta data
    featuredImage: string|null // Fetched from the site meta data
    favicon: string|null // Fetched from the site meta data
    url: URL
    oneClickSubscribe: boolean
    createdAt: Date
    updatedAt: Date|null

    #deleted: boolean;

    get deleted() {
        return this.#deleted;
    }

    constructor(data: {id?: string, title: string, reason: string|null, excerpt: string|null, featuredImage: string|null, favicon: string|null, url: URL, oneClickSubscribe: boolean, createdAt?: Date, updatedAt?: Date|null}) {
        this.id = data.id ?? ObjectId().toString();
        this.title = data.title;
        this.reason = data.reason;
        this.excerpt = data.excerpt;
        this.featuredImage = data.featuredImage;
        this.favicon = data.favicon;
        this.url = data.url;
        this.oneClickSubscribe = data.oneClickSubscribe;
        this.createdAt = data.createdAt ?? new Date();
        this.createdAt.setMilliseconds(0);
        this.updatedAt = data.updatedAt ?? null;
        this.updatedAt?.setMilliseconds(0);
        this.#deleted = false;
    }

    edit(properties: Partial<Recommendation>) {
        Object.assign(this, properties);
        this.createdAt.setMilliseconds(0);

        this.updatedAt = new Date();
        this.updatedAt.setMilliseconds(0);
    }

    delete() {
        this.#deleted = true;
    }
}
