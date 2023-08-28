import ObjectId from "bson-objectid";

export class Recommendation {
    id: string
    title: string
    reason: string|null
    excerpt: string|null // Fetched from the site meta data
    featuredImage: string|null // Fetched from the site meta data
    favicon: string|null // Fetched from the site meta data
    url: string
    oneClickSubscribe: boolean
    createdAt: Date

    constructor(data: {id?: string, title: string, reason: string|null, excerpt: string|null, featuredImage: string|null, favicon: string|null, url: string, oneClickSubscribe: boolean, createdAt?: Date}) {
        this.id = data.id ?? ObjectId().toString();
        this.title = data.title;
        this.reason = data.reason;
        this.excerpt = data.excerpt;
        this.featuredImage = data.featuredImage;
        this.favicon = data.favicon;
        this.url = data.url;
        this.oneClickSubscribe = data.oneClickSubscribe;
        this.createdAt = data.createdAt ?? new Date();
    }
}
