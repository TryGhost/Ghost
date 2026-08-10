import {Factory} from '@/data-factory';
import {buildLexical, post} from '@tryghost/test-data';
import {generateSlug} from '@/data-factory';
import type {Post as CanonicalPost, CardSpec} from '@tryghost/test-data';

/**
 * The *write/create* shape POSTed to /ghost/api/admin/posts/ (Date objects,
 * `email_recipient_filter` rather than the response-side `email_segment`).
 * The canonical *response* shape lives in `@tryghost/test-data`; `build()`
 * derives this payload from it.
 */
export interface Post {
    id: string;
    uuid: string;
    title: string;
    slug: string;
    mobiledoc: string | null;
    lexical: string | null;
    html: string;
    comment_id: string;
    plaintext: string;
    feature_image: string | null;
    featured: boolean;
    type: string;
    status: 'draft' | 'published' | 'scheduled';
    locale: string | null;
    visibility: string;
    email_recipient_filter: string;
    created_at: Date;
    updated_at: Date;
    published_at: Date | null;
    custom_excerpt: string;
    codeinjection_head: string | null;
    codeinjection_foot: string | null;
    custom_template: string | null;
    canonical_url: string | null;
    newsletter_id: string | null;
    show_title_and_feature_image: boolean;
    tags?: Array<{id: string}>;
    tiers?: Array<{id: string}>;
}

/**
 * Derive the create payload from the canonical API response shape:
 * - ISO-string dates become Date objects (serialized back on POST)
 * - `email_segment` is response-only; the write side sends
 *   `email_recipient_filter` ('none' so creating a post never emails anyone)
 * - type, locale, newsletter_id and show_title_and_feature_image are
 *   write-lane extras the response shape does not carry
 */
function toCreatePayload(canonical: CanonicalPost): Post {
    return {
        id: canonical.id,
        uuid: canonical.uuid,
        title: canonical.title,
        slug: canonical.slug,
        mobiledoc: canonical.mobiledoc,
        lexical: canonical.lexical,
        html: canonical.html,
        comment_id: canonical.comment_id,
        plaintext: canonical.plaintext ?? '',
        feature_image: canonical.feature_image,
        featured: canonical.featured,
        type: 'post',
        // the write lane cannot create 'sent' posts directly
        status: canonical.status === 'sent' ? 'published' : canonical.status,
        locale: null,
        visibility: canonical.visibility,
        email_recipient_filter: 'none',
        created_at: new Date(canonical.created_at),
        updated_at: new Date(canonical.updated_at),
        published_at: canonical.published_at ? new Date(canonical.published_at) : null,
        custom_excerpt: canonical.custom_excerpt ?? '',
        codeinjection_head: canonical.codeinjection_head,
        codeinjection_foot: canonical.codeinjection_foot,
        custom_template: canonical.custom_template,
        canonical_url: canonical.canonical_url,
        newsletter_id: null,
        show_title_and_feature_image: true,
        tags: undefined
    };
}

export class PostFactory extends Factory<Partial<Post>, Post> {
    entityType = 'posts'; // Entity name (for adapter; currently API endpoint)

    build(options: Partial<Post> = {}): Post {
        const canonical = post();
        const title = options.title || canonical.title;

        const defaults: Post = {
            ...toCreatePayload(canonical),
            title,
            slug: options.slug || generateSlug(title) + '-' + Date.now().toString(16)
        };

        // Determine published_at based on status and user options
        let publishedAt = options.published_at ?? defaults.published_at;
        if (options.status === 'published' && !options.published_at) {
            publishedAt = new Date();
        }

        return {...defaults, ...options, published_at: publishedAt} as Post;
    }

    async createWithCards(cards: CardSpec | CardSpec[], options: Partial<Post> = {}): Promise<Post> {
        const cardArray = Array.isArray(cards) ? cards : [cards];
        return this.create({...options, lexical: buildLexical(...cardArray)});
    }
}
