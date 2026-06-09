import {describe, expect, it} from 'vitest';
import {
    formValuesToTagPayload,
    slugifyTagName,
    tagFormSchema,
    tagToFormValues
} from './tag-form-schema';
import type {Tag} from '@tryghost/admin-x-framework/api/tags';

function validValues(overrides: Record<string, string> = {}) {
    return {
        ...tagToFormValues(),
        name: 'My tag',
        ...overrides
    };
}

describe('slugifyTagName', () => {
    it('slugifies regular names', () => {
        expect(slugifyTagName('Getting Started')).toBe('getting-started');
        expect(slugifyTagName('  Spaces   everywhere  ')).toBe('spaces-everywhere');
        expect(slugifyTagName('UPPER case')).toBe('upper-case');
    });

    it('strips characters that are not allowed in slugs', () => {
        expect(slugifyTagName('Tips & Tricks!')).toBe('tips-tricks');
        expect(slugifyTagName('100% organic')).toBe('100-organic');
    });

    it('strips diacritics', () => {
        expect(slugifyTagName('Café många')).toBe('cafe-manga');
    });

    it('prefixes internal tags with hash-', () => {
        expect(slugifyTagName('#internal')).toBe('hash-internal');
        expect(slugifyTagName('#Internal Tag')).toBe('hash-internal-tag');
    });

    it('returns an empty slug for empty or symbol-only names', () => {
        expect(slugifyTagName('')).toBe('');
        expect(slugifyTagName('#')).toBe('');
        expect(slugifyTagName('!!!')).toBe('');
    });
});

describe('tagFormSchema', () => {
    it('accepts a minimal valid tag', () => {
        const result = tagFormSchema.safeParse(validValues());
        expect(result.success).toBe(true);
    });

    it('requires a name', () => {
        const result = tagFormSchema.safeParse(validValues({name: ''}));
        expect(result.success).toBe(false);
    });

    it('limits name length to 191 characters', () => {
        expect(tagFormSchema.safeParse(validValues({name: 'a'.repeat(191)})).success).toBe(true);
        expect(tagFormSchema.safeParse(validValues({name: 'a'.repeat(192)})).success).toBe(false);
    });

    it('limits description to 500 characters', () => {
        expect(tagFormSchema.safeParse(validValues({description: 'a'.repeat(500)})).success).toBe(true);
        expect(tagFormSchema.safeParse(validValues({description: 'a'.repeat(501)})).success).toBe(false);
    });

    it('validates the accent color as hex', () => {
        expect(tagFormSchema.safeParse(validValues({accentColor: '#15171A'})).success).toBe(true);
        expect(tagFormSchema.safeParse(validValues({accentColor: ''})).success).toBe(true);
        expect(tagFormSchema.safeParse(validValues({accentColor: '15171A'})).success).toBe(false);
        expect(tagFormSchema.safeParse(validValues({accentColor: '#xyzxyz'})).success).toBe(false);
    });

    it('validates the canonical URL', () => {
        expect(tagFormSchema.safeParse(validValues({canonicalUrl: 'https://example.com/x/'})).success).toBe(true);
        expect(tagFormSchema.safeParse(validValues({canonicalUrl: ''})).success).toBe(true);
        expect(tagFormSchema.safeParse(validValues({canonicalUrl: 'not a url'})).success).toBe(false);
    });
});

describe('tagToFormValues / formValuesToTagPayload', () => {
    it('round-trips a tag', () => {
        const tag = {
            id: 'abc',
            name: 'News',
            slug: 'news',
            url: 'https://example.com/tag/news/',
            description: 'A description',
            visibility: 'public',
            feature_image: 'https://example.com/image.png',
            accent_color: '#ff0000',
            meta_title: 'Meta',
            meta_description: null,
            canonical_url: null,
            twitter_image: null,
            twitter_title: null,
            twitter_description: null,
            og_image: null,
            og_title: null,
            og_description: null,
            codeinjection_head: null,
            codeinjection_foot: null,
            created_at: '2026-01-01',
            updated_at: '2026-01-01'
        } satisfies Tag;

        const payload = formValuesToTagPayload(tagToFormValues(tag));

        expect(payload).toMatchObject({
            name: 'News',
            slug: 'news',
            description: 'A description',
            feature_image: 'https://example.com/image.png',
            accent_color: '#ff0000',
            meta_title: 'Meta',
            meta_description: null,
            canonical_url: null
        });
    });

    it('maps empty strings to null in the payload', () => {
        const payload = formValuesToTagPayload(validValues());

        expect(payload.description).toBeNull();
        expect(payload.accent_color).toBeNull();
        expect(payload.feature_image).toBeNull();
        expect(payload.meta_title).toBeNull();
        expect(payload.codeinjection_head).toBeNull();
    });

    it('trims name and slug', () => {
        const payload = formValuesToTagPayload(validValues({name: '  Padded  ', slug: ' padded '}));

        expect(payload.name).toBe('Padded');
        expect(payload.slug).toBe('padded');
    });
});
