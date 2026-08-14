import {faker} from "@faker-js/faker";
import {buildLexicalParagraph} from "./lexical";
import {createBuilder} from "../factory";
import {generateId, generateSlug, generateUuid} from "../utils";
import type {Tag} from "./tag";

/**
 * Ghost Admin API post resource — the API *response* shape: ISO-string dates
 * and `email_segment` (the write side sends `email_recipient_filter` instead).
 * Write-lane consumers derive their create payload from this builder — see
 * e2e's PostFactory.
 */
export interface Post {
    id: string;
    uuid: string;
    title: string;
    slug: string;
    mobiledoc: string | null;
    lexical: string | null;
    html: string;
    /** Only present when the request asks for the plaintext format. */
    plaintext?: string;
    comment_id: string;
    feature_image: string | null;
    feature_image_alt: string | null;
    feature_image_caption: string | null;
    featured: boolean;
    status: "draft" | "published" | "scheduled" | "sent";
    visibility: "public" | "members" | "paid" | "tiers";
    email_segment: string;
    email_subject: string | null;
    email_only: boolean;
    frontmatter: string | null;
    custom_excerpt: string | null;
    excerpt: string | null;
    codeinjection_head: string | null;
    codeinjection_foot: string | null;
    custom_template: string | null;
    canonical_url: string | null;
    og_image: string | null;
    og_title: string | null;
    og_description: string | null;
    twitter_image: string | null;
    twitter_title: string | null;
    twitter_description: string | null;
    meta_title: string | null;
    meta_description: string | null;
    reading_time: number;
    url?: string;
    tags?: Tag[];
    tiers?: unknown[];
    authors?: unknown[];
    count?: {clicks: number; positive_feedback: number; negative_feedback: number};
    created_at: string;
    updated_at: string;
    published_at: string | null;
}

export const post = createBuilder<Post>(() => {
    const now = new Date().toISOString();
    const title = faker.lorem.sentence();
    const content = faker.lorem.paragraphs(3);
    const excerpt = faker.lorem.paragraph();

    return {
        id: generateId(),
        uuid: generateUuid(),
        title,
        slug: `${generateSlug(title)}-${faker.string.alphanumeric(6).toLowerCase()}`,
        mobiledoc: null,
        lexical: buildLexicalParagraph(content),
        html: `<p>${content}</p>`,
        plaintext: content,
        comment_id: generateId(),
        feature_image: null,
        feature_image_alt: null,
        feature_image_caption: null,
        featured: faker.datatype.boolean(),
        status: "draft",
        visibility: "public",
        email_segment: "all",
        email_subject: null,
        email_only: false,
        frontmatter: null,
        custom_excerpt: excerpt,
        excerpt,
        codeinjection_head: null,
        codeinjection_foot: null,
        custom_template: null,
        canonical_url: null,
        og_image: null,
        og_title: null,
        og_description: null,
        twitter_image: null,
        twitter_title: null,
        twitter_description: null,
        meta_title: null,
        meta_description: null,
        reading_time: 0,
        url: undefined,
        created_at: now,
        updated_at: now,
        published_at: null
    };
});
