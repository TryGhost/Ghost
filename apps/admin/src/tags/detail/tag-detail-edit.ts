import {slugify} from '@tryghost/string';
import type {Tag, TagEditableData} from '@tryghost/admin-x-framework/api/tags';

/**
 * The editable slice of a tag, used for dirty detection (draft vs server) and
 * the save payload. camelCase mirrors the Ember model attribute names; the
 * snake_case mapping to the API happens in `getTagEditableSlice` /
 * `buildTagSavePayload`. Missing fields normalize to '' so a tag with a null
 * field and a draft with '' don't read as dirty.
 */
export interface TagEditableFields {
    name: string;
    slug: string;
    description: string;
    featureImage: string;
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string;
    twitterImage: string;
    twitterTitle: string;
    twitterDescription: string;
    ogImage: string;
    ogTitle: string;
    ogDescription: string;
    codeinjectionHead: string;
    codeinjectionFoot: string;
    accentColor: string;
}

export type TagFieldName = keyof TagEditableFields;

// Character limits from Ember's tag validator (`validators/tag-settings.js`).
export const NAME_MAX_LENGTH = 191;
export const SLUG_MAX_LENGTH = 191;
export const DESCRIPTION_MAX_LENGTH = 500;
export const META_TITLE_MAX_LENGTH = 300;
export const META_DESCRIPTION_MAX_LENGTH = 500;

// Recommended lengths shown as character countdowns (`tag-form.hbs`).
export const META_TITLE_RECOMMENDED_LENGTH = 70;
export const META_DESCRIPTION_RECOMMENDED_LENGTH = 156;
export const X_TITLE_RECOMMENDED_LENGTH = 70;
export const X_DESCRIPTION_RECOMMENDED_LENGTH = 125;
export const FACEBOOK_TITLE_RECOMMENDED_LENGTH = 100;
export const FACEBOOK_DESCRIPTION_RECOMMENDED_LENGTH = 65;

export function getTagEditableSlice(tag: Partial<Tag>): TagEditableFields {
    return {
        name: tag.name ?? '',
        slug: tag.slug ?? '',
        description: tag.description ?? '',
        featureImage: tag.feature_image ?? '',
        metaTitle: tag.meta_title ?? '',
        metaDescription: tag.meta_description ?? '',
        canonicalUrl: tag.canonical_url ?? '',
        twitterImage: tag.twitter_image ?? '',
        twitterTitle: tag.twitter_title ?? '',
        twitterDescription: tag.twitter_description ?? '',
        ogImage: tag.og_image ?? '',
        ogTitle: tag.og_title ?? '',
        ogDescription: tag.og_description ?? '',
        codeinjectionHead: tag.codeinjection_head ?? '',
        codeinjectionFoot: tag.codeinjection_foot ?? '',
        accentColor: tag.accent_color ?? ''
    };
}

/**
 * Normalize a draft for dirty comparison and saving. Ember trims every edited
 * value (`tag-form.js` `setTagProperty`), code injection included; we trim only
 * touched ordinary fields and deliberately keep code injection verbatim.
 */
export function normalizeTagDraft(draft: TagEditableFields, touchedFields?: ReadonlySet<TagFieldName>): TagEditableFields {
    const normalized = {} as TagEditableFields;
    for (const key of Object.keys(draft) as TagFieldName[]) {
        const shouldTrim = key !== 'codeinjectionHead' && key !== 'codeinjectionFoot' && (!touchedFields || touchedFields.has(key));
        normalized[key] = shouldTrim ? draft[key].trim() : draft[key];
    }
    return normalized;
}

/** Ember `models/tag.js` `updateVisibility()`: a leading `#` makes a tag internal. */
export function deriveTagVisibility(name: string): 'public' | 'internal' {
    return /^#/.test(name) ? 'internal' : 'public';
}

/**
 * Client-side slug preview for new tags, matching Ember `tag-form.js`
 * `setTagProperty`: slugified name, with internal tags (leading `#`) prefixed
 * `hash-`. The server re-runs its own slug generator on save for uniqueness.
 */
export function generateSlugFromName(name: string): string {
    let slug = slugify(name);
    if (/^#/.test(name)) {
        slug = `hash-${slug}`;
    }
    return slug;
}

/** Unicode-code-point length, matching Ember's validator and countdown helper. */
export function charLength(value: string): number {
    return Array.from(value).length;
}

/**
 * Per-field validation, porting `validators/tag-settings.js` verbatim
 * (messages included). Fields without validator rules return null.
 */
export function validateTagField(field: TagFieldName, draft: TagEditableFields): string | null {
    const value = draft[field].trim();
    switch (field) {
    case 'name':
        if (value === '') {
            return 'You must specify a name for the tag.';
        }
        if (/^,/.test(value)) {
            return 'Tag names can\'t start with commas.';
        }
        if (charLength(value) > NAME_MAX_LENGTH) {
            return 'Tag names cannot be longer than 191 characters.';
        }
        return null;
    case 'slug':
        return charLength(value) > SLUG_MAX_LENGTH ? 'URL cannot be longer than 191 characters.' : null;
    case 'description':
        return charLength(value) > DESCRIPTION_MAX_LENGTH ? 'Description cannot be longer than 500 characters.' : null;
    case 'metaTitle':
        return charLength(value) > META_TITLE_MAX_LENGTH ? 'Meta Title cannot be longer than 300 characters.' : null;
    case 'metaDescription':
        return charLength(value) > META_DESCRIPTION_MAX_LENGTH ? 'Meta Description cannot be longer than 500 characters.' : null;
    case 'canonicalUrl':
        return validateCanonicalUrl(value);
    default:
        return null;
    }
}

/** Ember `tag-form.js` `validateCanonicalUrl`: empty is fine, otherwise must parse as a URL. */
export function validateCanonicalUrl(value: string): string | null {
    if (value === '') {
        return null;
    }
    try {
        new URL(value);
        return null;
    } catch {
        return 'The url should be a valid url';
    }
}

const VALIDATED_FIELDS: TagFieldName[] = ['name', 'slug', 'description', 'metaTitle', 'metaDescription', 'canonicalUrl'];

/** Validate the whole draft, as Ember does on save. Empty object means valid. */
export function validateTagDraft(draft: TagEditableFields): Partial<Record<TagFieldName, string>> {
    const errors: Partial<Record<TagFieldName, string>> = {};
    for (const field of VALIDATED_FIELDS) {
        const error = validateTagField(field, draft);
        if (error) {
            errors[field] = error;
        }
    }
    return errors;
}

/**
 * The save payload for a tag. All editable fields are sent, matching Ember's
 * whole-model serialization. `visibility` is included only when the name
 * changed (or the tag is new) — Ember's `models/tag.js` `save()` recomputes it
 * from the name in exactly that case, and the server only ever forces
 * internal, never back to public, so the client value matters on renames.
 */
export function buildTagSavePayload(draft: TagEditableFields, serverName: string | null, touchedFields?: ReadonlySet<TagFieldName>): TagEditableData {
    const normalized = normalizeTagDraft(draft, touchedFields);
    const payload: TagEditableData = {
        name: normalized.name,
        slug: normalized.slug,
        description: normalized.description,
        feature_image: normalized.featureImage || null,
        meta_title: normalized.metaTitle || null,
        meta_description: normalized.metaDescription || null,
        canonical_url: normalized.canonicalUrl || null,
        twitter_image: normalized.twitterImage || null,
        twitter_title: normalized.twitterTitle || null,
        twitter_description: normalized.twitterDescription || null,
        og_image: normalized.ogImage || null,
        og_title: normalized.ogTitle || null,
        og_description: normalized.ogDescription || null,
        codeinjection_head: normalized.codeinjectionHead || null,
        codeinjection_foot: normalized.codeinjectionFoot || null,
        accent_color: normalized.accentColor || null
    };
    if (serverName === null || normalized.name !== serverName) {
        payload.visibility = deriveTagVisibility(normalized.name);
    }
    return payload;
}

/**
 * The tag's public URL: canonical URL when set, `{blogUrl}/tag/{slug}` otherwise,
 * always with a trailing slash (`controllers/tag.js` `tagURL`).
 */
export function getTagUrl(draft: Pick<TagEditableFields, 'canonicalUrl' | 'slug'>, blogUrl: string): string {
    let url = draft.canonicalUrl || `${blogUrl}/tag/${draft.slug}`;
    if (!url.endsWith('/')) {
        url += '/';
    }
    return url;
}

/** Scheme-stripped URL preview shown under the slug field (`gh-url-preview`). */
export function getSlugUrlPreview(slug: string, blogUrl: string): string {
    const schemeIndex = blogUrl.indexOf('://');
    const host = schemeIndex === -1 ? blogUrl : blogUrl.slice(schemeIndex + 3);
    return `${host}/tag/${slug ? `${slug}/` : ''}`;
}

/** `ember-cli-string-helpers` `truncate` with `useEllipsis` — ellipsis counts toward the limit. */
export function truncateText(value: string, characterLimit = 140): string {
    const limit = characterLimit - 3;
    if (value.length > limit) {
        return `${value.substring(0, limit)}...`;
    }
    return value;
}

export interface TagSeoContext {
    siteTitle: string;
    siteMetaDescription: string;
    blogUrl: string;
}

/** `tag-form.js` `seoTitle`: meta title, else "{name} - {site title}", capped at 70 chars. */
export function getSeoTitle(draft: Pick<TagEditableFields, 'name' | 'metaTitle'>, siteTitle: string): string {
    const tagName = siteTitle ? `${draft.name} - ${siteTitle}` : draft.name;
    let title = draft.metaTitle || tagName;
    if (title.length > 70) {
        title = `${title.substring(0, 70).trim()}…`;
    }
    return title;
}

/** `tag-form.js` `seoDescription`: meta description, else the tag description, capped at 156 chars. */
export function getSeoDescription(draft: Pick<TagEditableFields, 'description' | 'metaDescription'>): string {
    let description = draft.metaDescription || draft.description;
    if (description.length > 156) {
        description = `${description.substring(0, 156).trim()}…`;
    }
    return description;
}

/** `tag-form.js` `seoURL`: the tag URL capped at 70 chars. */
export function getSeoUrl(draft: Pick<TagEditableFields, 'canonicalUrl' | 'slug'>, blogUrl: string): string {
    let url = getTagUrl(draft, blogUrl);
    if (url.length > 70) {
        url = `${url.substring(0, 70).trim()}…`;
    }
    return url;
}

/** `config.blogDomain` equivalent: the blog URL without scheme or trailing slash. */
export function getBlogDomain(blogUrl: string): string {
    return blogUrl.replace(/^[a-zA-Z0-9-]+:\/\//, '').replace(/\/$/, '');
}
