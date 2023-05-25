export class PostDTO {
    id: string;
    title: string;
    slug: string;
    featured: boolean;
    publishedAt: Date;
    deleted: boolean;

    constructor(data: any) {
        this.id = data.id;
        this.title = data.title;
        this.slug = data.slug;
        this.featured = data.featured;
        this.publishedAt = data.published_at;
        this.deleted = data.deleted;
    }

    static async map(data: any): Promise<PostDTO> {
        return new PostDTO(data);
    }
}
