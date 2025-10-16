import {Factory} from '../factory';
import {faker} from '@faker-js/faker';
import {generateId, generateSlug} from '../utils';

export interface Tag {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    feature_image: string | null;
    parent_id: string | null;
    visibility: 'public' | 'internal';
    url?: string;
    og_image: string | null;
    og_title: string | null;
    og_description: string | null;
    twitter_image: string | null;
    twitter_title: string | null;
    twitter_description: string | null;
    meta_title: string | null;
    meta_description: string | null;
    codeinjection_head: string | null;
    codeinjection_foot: string | null;
    canonical_url: string | null;
    accent_color: string | null;
    count?: {
        posts: number;
    };
    created_at: Date;
    updated_at: Date | null;
}
export class TagFactory extends Factory<Partial<Tag>, Tag> {
    entityType = 'tags';

    build(options: Partial<Tag> = {}): Tag {
        return {
            ...this.buildDefaultTag(),
            ...options
        };
    }

    private buildDefaultTag(): Tag {
        const now = new Date();
        const tagName = faker.commerce.department();

        return {
            id: generateId(),
            name: tagName,
            slug: `${generateSlug(tagName)}-${faker.string.alphanumeric(6).toLowerCase()}`,
            description: faker.lorem.sentence(),
            feature_image: `https://picsum.photos/seed/tag-${faker.string.alphanumeric(8)}/1200/630`,
            parent_id: null,
            visibility: 'public',
            url: undefined,
            og_image: null,
            og_title: null,
            og_description: faker.lorem.sentence(),
            twitter_image: null,
            twitter_title: null,
            twitter_description: faker.lorem.sentence(),
            meta_title: null,
            meta_description: faker.lorem.sentence(),
            codeinjection_head: null,
            codeinjection_foot: null,
            canonical_url: null,
            accent_color: null,
            count: {posts: 0},
            created_at: now,
            updated_at: now
        };
    }
}
