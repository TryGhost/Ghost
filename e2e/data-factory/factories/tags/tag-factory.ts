import {Factory} from '../factory';
import type {PersistenceAdapter} from '../../persistence/adapter';
import {faker} from '@faker-js/faker';
import {generateId, generateSlug} from '../../utils';

export interface Tag {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    feature_image: string | null;
    parent_id: string | null;
    visibility: 'public' | 'internal';
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
    created_at: Date;
    updated_at: Date | null;
}

export class TagFactory extends Factory<Partial<Tag>, Tag> {
    name = 'tag';
    entityType = 'tags';

    constructor(adapter?: PersistenceAdapter) {
        super(adapter);
    }

    build(options: Partial<Tag> = {}): Tag {
        const now = new Date();
        const tagName = options.name ?? faker.commerce.department();
        const baseSlug = generateSlug(tagName);
        const slugSuffix = faker.string.alphanumeric(6).toLowerCase();

        const defaults: Tag = {
            id: options.id ?? generateId(),
            name: tagName,
            slug: options.slug ?? `${baseSlug}-${slugSuffix}`,
            description: options.description ?? faker.lorem.sentence(),
            feature_image: options.feature_image ?? `https://picsum.photos/seed/tag-${faker.string.alphanumeric(8)}/1200/630`,
            parent_id: options.parent_id ?? null,
            visibility: options.visibility ?? 'public',
            og_image: options.og_image ?? null,
            og_title: options.og_title ?? tagName,
            og_description: options.og_description ?? faker.lorem.sentence(),
            twitter_image: options.twitter_image ?? null,
            twitter_title: options.twitter_title ?? tagName,
            twitter_description: options.twitter_description ?? faker.lorem.sentence(),
            meta_title: options.meta_title ?? tagName,
            meta_description: options.meta_description ?? faker.lorem.sentence(),
            codeinjection_head: options.codeinjection_head ?? null,
            codeinjection_foot: options.codeinjection_foot ?? null,
            canonical_url: options.canonical_url ?? null,
            accent_color: options.accent_color ?? null,
            created_at: options.created_at ?? now,
            updated_at: options.updated_at ?? now
        };

        return {
            ...defaults,
            ...options
        } as Tag;
    }
}
