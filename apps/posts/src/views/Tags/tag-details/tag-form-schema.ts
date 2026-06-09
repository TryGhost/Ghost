import {Tag} from '@tryghost/admin-x-framework/api/tags';
import {z} from 'zod';

export const tagFormSchema = z.object({
    name: z.string().trim()
        .min(1, 'You must specify a name for the tag.')
        .max(191, 'Tag names cannot be longer than 191 characters.'),
    slug: z.string().trim()
        .max(191, 'URL cannot be longer than 191 characters.'),
    description: z.string()
        .max(500, 'Description cannot be longer than 500 characters.'),
    accentColor: z.string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'The colour should be in valid hex format')
        .or(z.literal('')),
    featureImage: z.string(),
    metaTitle: z.string()
        .max(300, 'Meta Title cannot be longer than 300 characters.'),
    metaDescription: z.string()
        .max(500, 'Meta Description cannot be longer than 500 characters.'),
    canonicalUrl: z.string().trim()
        .url('The url should be a valid url')
        .max(2000, 'Canonical URL is too long, max 2000 chars')
        .or(z.literal('')),
    twitterImage: z.string(),
    twitterTitle: z.string()
        .max(300, 'X Title cannot be longer than 300 characters.'),
    twitterDescription: z.string()
        .max(500, 'X Description cannot be longer than 500 characters.'),
    ogImage: z.string(),
    ogTitle: z.string()
        .max(300, 'Facebook Title cannot be longer than 300 characters.'),
    ogDescription: z.string()
        .max(500, 'Facebook Description cannot be longer than 500 characters.'),
    codeinjectionHead: z.string()
        .max(65535, 'Header code cannot be longer than 65535 characters.'),
    codeinjectionFoot: z.string()
        .max(65535, 'Footer code cannot be longer than 65535 characters.')
});

export type TagFormValues = z.infer<typeof tagFormSchema>;

/**
 * Mirrors the slug generation behaviour of the Ember admin (which uses
 * @tryghost/string slugify + a `hash-` prefix for internal tags). The server
 * remains the source of truth and will de-duplicate on save.
 */
export function slugifyTagName(name: string): string {
    const base = name
        .normalize('NFKD')
        // strip combining diacritical marks left over from NFKD
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (/^#/.test(name.trim())) {
        return base ? `hash-${base}` : '';
    }

    return base;
}

export function tagToFormValues(tag?: Tag): TagFormValues {
    return {
        name: tag?.name ?? '',
        slug: tag?.slug ?? '',
        description: tag?.description ?? '',
        accentColor: tag?.accent_color ?? '',
        featureImage: tag?.feature_image ?? '',
        metaTitle: tag?.meta_title ?? '',
        metaDescription: tag?.meta_description ?? '',
        canonicalUrl: tag?.canonical_url ?? '',
        twitterImage: tag?.twitter_image ?? '',
        twitterTitle: tag?.twitter_title ?? '',
        twitterDescription: tag?.twitter_description ?? '',
        ogImage: tag?.og_image ?? '',
        ogTitle: tag?.og_title ?? '',
        ogDescription: tag?.og_description ?? '',
        codeinjectionHead: tag?.codeinjection_head ?? '',
        codeinjectionFoot: tag?.codeinjection_foot ?? ''
    };
}

function emptyToNull(value: string): string | null {
    return value === '' ? null : value;
}

export function formValuesToTagPayload(values: TagFormValues): Partial<Tag> {
    return {
        name: values.name.trim(),
        slug: values.slug.trim(),
        description: emptyToNull(values.description),
        accent_color: emptyToNull(values.accentColor),
        feature_image: emptyToNull(values.featureImage),
        meta_title: emptyToNull(values.metaTitle),
        meta_description: emptyToNull(values.metaDescription),
        canonical_url: emptyToNull(values.canonicalUrl),
        twitter_image: emptyToNull(values.twitterImage),
        twitter_title: emptyToNull(values.twitterTitle),
        twitter_description: emptyToNull(values.twitterDescription),
        og_image: emptyToNull(values.ogImage),
        og_title: emptyToNull(values.ogTitle),
        og_description: emptyToNull(values.ogDescription),
        codeinjection_head: emptyToNull(values.codeinjectionHead),
        codeinjection_foot: emptyToNull(values.codeinjectionFoot)
    };
}
