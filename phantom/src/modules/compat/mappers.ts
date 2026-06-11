import type {FrontendEntry} from '../content/frontend-reader.js';
import type {AuthorProfileRecord, TagRecord} from '../content/db.js';
import type {PlanRecord, PriceRecord} from '../subscriptions/db.js';
import type {NewsletterRecord} from '../newsletters/db.js';
import {renderLexicalHtml} from '../../frontend/rendering/lexical.js';

export const GHOST_COMPAT_VERSION = '5.130.2';

const toIso = (value: number | null) => (value === null ? null : new Date(value).toISOString());

export const compatSlugify = (value: string) => {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-') || 'untitled';
};

const toExcerpt = (html: string, words = 50) => {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').slice(0, words).join(' ') : '';
};

export const mapCompatTag = (tag: TagRecord, siteUrl: string) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description ?? null,
    feature_image: tag.featureImage ?? null,
    visibility: tag.visibility ?? 'public',
    meta_title: null,
    meta_description: null,
    og_image: null,
    og_title: null,
    og_description: null,
    twitter_image: null,
    twitter_title: null,
    twitter_description: null,
    codeinjection_head: null,
    codeinjection_foot: null,
    canonical_url: null,
    accent_color: null,
    url: `${siteUrl}/tag/${tag.slug}/`
});

export const mapCompatAuthor = (author: AuthorProfileRecord, siteUrl: string) => ({
    id: author.id,
    name: author.name,
    slug: author.slug,
    email: author.email ?? null,
    profile_image: author.profileImage ?? null,
    cover_image: author.coverImage ?? null,
    bio: author.bio ?? null,
    website: author.website ?? null,
    location: author.location ?? null,
    facebook: null,
    twitter: null,
    meta_title: null,
    meta_description: null,
    url: `${siteUrl}/author/${author.slug}/`
});

export const resolveEntryHtml = async (entry: FrontendEntry) => {
    if (entry.post.html) {
        return entry.post.html;
    }
    if (entry.post.lexical) {
        try {
            return await renderLexicalHtml(JSON.parse(entry.post.lexical) as Record<string, unknown>);
        } catch {
            return '';
        }
    }
    return '';
};

export const mapCompatPost = async (entry: FrontendEntry, siteUrl: string) => {
    const {post, tags, authors} = entry;
    const html = await resolveEntryHtml(entry);
    const mappedTags = tags.map((tag) => mapCompatTag(tag, siteUrl));
    const mappedAuthors = authors.map((author) => mapCompatAuthor(author, siteUrl));
    const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;

    return {
        id: post.id,
        uuid: post.uuid ?? post.id,
        title: post.title,
        slug: post.slug,
        html,
        comment_id: post.id,
        feature_image: post.featureImage ?? null,
        feature_image_alt: post.featureImageAlt ?? null,
        feature_image_caption: post.featureImageCaption ?? null,
        featured: Boolean(post.featured),
        visibility: post.visibility ?? 'public',
        created_at: toIso(post.createdAt),
        updated_at: toIso(post.updatedAt),
        published_at: toIso(post.publishedAt),
        custom_excerpt: post.customExcerpt ?? null,
        excerpt: post.customExcerpt ?? toExcerpt(html),
        codeinjection_head: post.codeinjectionHead ?? null,
        codeinjection_foot: post.codeinjectionFoot ?? null,
        custom_template: post.customTemplate ?? null,
        canonical_url: post.canonicalUrl ?? null,
        url: `${siteUrl}/${post.slug}/`,
        reading_time: Math.max(1, Math.round(words / 200)),
        access: true,
        comments: false,
        email_subject: null,
        frontmatter: null,
        meta_title: null,
        meta_description: null,
        og_image: null,
        og_title: null,
        og_description: null,
        twitter_image: null,
        twitter_title: null,
        twitter_description: null,
        tags: mappedTags,
        authors: mappedAuthors,
        primary_tag: mappedTags[0] ?? null,
        primary_author: mappedAuthors[0] ?? null
    };
};

export const mapAdminPost = async (entry: FrontendEntry, siteUrl: string, newsletter: NewsletterRecord | null = null) => {
    const base = await mapCompatPost(entry, siteUrl);
    return {
        ...base,
        status: entry.post.status,
        lexical: entry.post.lexical,
        mobiledoc: null,
        email_only: Boolean(entry.post.emailOnly),
        email_segment: 'all',
        email_recipient_filter: entry.post.emailRecipientFilter ?? null,
        newsletter: newsletter ? mapCompatNewsletter(newsletter) : null,
        email: null,
        count: {clicks: 0, positive_feedback: 0, negative_feedback: 0},
        tiers: [],
        post_revisions: []
    };
};

export const mapCompatTier = (plan: PlanRecord, prices: PriceRecord[]) => {
    const monthly = prices.find((price) => price.cadence === 'month');
    const yearly = prices.find((price) => price.cadence === 'year');
    return {
        id: plan.id,
        name: plan.name,
        slug: plan.slug ?? plan.id,
        description: plan.description ?? null,
        active: plan.active === 1,
        type: plan.type,
        welcome_page_url: plan.welcomePageUrl ?? null,
        created_at: toIso(plan.createdAt),
        updated_at: toIso(plan.updatedAt),
        visibility: plan.visibility,
        trial_days: plan.trialDays,
        benefits: [],
        currency: (monthly?.currency ?? yearly?.currency)?.toLowerCase() ?? null,
        monthly_price: monthly?.amount ?? null,
        yearly_price: yearly?.amount ?? null,
        monthly_price_id: monthly?.id ?? null,
        yearly_price_id: yearly?.id ?? null
    };
};

export const mapCompatNewsletter = (newsletter: NewsletterRecord) => ({
    id: newsletter.id,
    uuid: newsletter.id,
    name: newsletter.name,
    description: newsletter.description ?? null,
    slug: newsletter.slug ?? newsletter.id,
    sender_name: newsletter.senderName ?? null,
    sender_email: newsletter.senderEmail ?? null,
    sender_reply_to: newsletter.senderReplyTo ?? 'newsletter',
    status: newsletter.status,
    visibility: 'members',
    subscribe_on_signup: newsletter.subscribeOnSignup === 1,
    sort_order: newsletter.sortOrder,
    created_at: toIso(newsletter.createdAt),
    updated_at: toIso(newsletter.updatedAt)
});

export const buildPagination = (pagination: {page: number; limit: number; pages: number; total: number; next: number | null; prev: number | null}) => ({
    pagination: {
        page: pagination.page,
        limit: pagination.limit,
        pages: pagination.pages,
        total: pagination.total,
        next: pagination.next,
        prev: pagination.prev
    }
});

export const singlePagination = (total: number) => ({
    pagination: {page: 1, limit: 'all', pages: 1, total, next: null, prev: null}
});
