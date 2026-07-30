import {describe, expect, it} from 'vitest';
import {
    buildTagSavePayload,
    charLength,
    deriveTagVisibility,
    generateSlugFromName,
    getBlogDomain,
    getSeoDescription,
    getSeoTitle,
    getSeoUrl,
    getSlugUrlPreview,
    getTagEditableSlice,
    getTagUrl,
    normalizeTagDraft,
    truncateText,
    validateTagDraft,
    validateTagField
} from './tag-detail-edit';
import type {TagEditableFields} from './tag-detail-edit';

const draft = (overrides: Partial<TagEditableFields> = {}): TagEditableFields => ({
    ...getTagEditableSlice({}),
    name: 'News',
    slug: 'news',
    ...overrides
});

describe('getTagEditableSlice', () => {
    it('maps snake_case API fields, preserves values and normalizes null to empty strings', () => {
        const slice = getTagEditableSlice({
            name: ' News ',
            slug: 'news',
            description: null,
            feature_image: 'https://example.com/img.png',
            meta_title: 'Meta',
            canonical_url: null,
            accent_color: '#ff0000',
            codeinjection_head: null
        });

        expect(slice.name).toBe(' News ');
        expect(slice.description).toBe('');
        expect(slice.featureImage).toBe('https://example.com/img.png');
        expect(slice.metaTitle).toBe('Meta');
        expect(slice.canonicalUrl).toBe('');
        expect(slice.accentColor).toBe('#ff0000');
        expect(slice.codeinjectionHead).toBe('');
    });
});

describe('normalizeTagDraft', () => {
    it('trims ordinary fields while preserving code injection whitespace', () => {
        const normalized = normalizeTagDraft(draft({
            name: '  News  ',
            description: ' about news ',
            codeinjectionHead: '\n<script>head()</script>\n',
            codeinjectionFoot: '  <script>foot()</script>  '
        }));

        expect(normalized.name).toBe('News');
        expect(normalized.description).toBe('about news');
        expect(normalized.codeinjectionHead).toBe('\n<script>head()</script>\n');
        expect(normalized.codeinjectionFoot).toBe('  <script>foot()</script>  ');
    });

    it('does not mark existing code injection whitespace as a change', () => {
        const serverSlice = getTagEditableSlice({
            codeinjection_head: '\n<script>head()</script>\n',
            codeinjection_foot: '  <script>foot()</script>  '
        });

        expect(normalizeTagDraft(serverSlice)).toEqual(serverSlice);
    });

    it('preserves whitespace in untouched ordinary fields', () => {
        const draftWithWhitespace = draft({description: '\nImportant\n', metaTitle: ' Meta title '});

        expect(normalizeTagDraft(draftWithWhitespace, new Set())).toEqual(draftWithWhitespace);
        expect(normalizeTagDraft(draftWithWhitespace, new Set(['description']))).toMatchObject({
            description: 'Important',
            metaTitle: ' Meta title '
        });
    });
});

describe('deriveTagVisibility', () => {
    it('marks names starting with # internal and everything else public', () => {
        expect(deriveTagVisibility('#internal')).toBe('internal');
        expect(deriveTagVisibility('News')).toBe('public');
        expect(deriveTagVisibility('not#internal')).toBe('public');
    });
});

describe('generateSlugFromName', () => {
    it('slugifies the name', () => {
        expect(generateSlugFromName('Weekly News')).toBe('weekly-news');
    });

    it('prefixes internal tag slugs with hash-', () => {
        expect(generateSlugFromName('#Internal Tag')).toBe('hash-internal-tag');
    });
});

describe('validateTagField', () => {
    it('requires a name', () => {
        expect(validateTagField('name', draft({name: ''}))).toBe('You must specify a name for the tag.');
        expect(validateTagField('name', draft({name: '   '}))).toBe('You must specify a name for the tag.');
    });

    it('rejects names starting with a comma', () => {
        expect(validateTagField('name', draft({name: ',News'}))).toBe('Tag names can\'t start with commas.');
    });

    it('caps name, slug, description and meta fields at their Ember limits', () => {
        expect(validateTagField('name', draft({name: 'a'.repeat(192)}))).toBe('Tag names cannot be longer than 191 characters.');
        expect(validateTagField('name', draft({name: 'a'.repeat(191)}))).toBeNull();
        expect(validateTagField('slug', draft({slug: 'a'.repeat(192)}))).toBe('URL cannot be longer than 191 characters.');
        expect(validateTagField('description', draft({description: 'a'.repeat(501)}))).toBe('Description cannot be longer than 500 characters.');
        expect(validateTagField('metaTitle', draft({metaTitle: 'a'.repeat(301)}))).toBe('Meta Title cannot be longer than 300 characters.');
        expect(validateTagField('metaDescription', draft({metaDescription: 'a'.repeat(501)}))).toBe('Meta Description cannot be longer than 500 characters.');
    });

    it('accepts empty canonical URLs and rejects unparseable ones', () => {
        expect(validateTagField('canonicalUrl', draft({canonicalUrl: ''}))).toBeNull();
        expect(validateTagField('canonicalUrl', draft({canonicalUrl: 'https://example.com/canonical'}))).toBeNull();
        expect(validateTagField('canonicalUrl', draft({canonicalUrl: 'not a url'}))).toBe('The url should be a valid url');
    });
});

describe('validateTagDraft', () => {
    it('collects every field error', () => {
        const errors = validateTagDraft(draft({name: '', canonicalUrl: 'nope'}));

        expect(errors).toEqual({
            name: 'You must specify a name for the tag.',
            canonicalUrl: 'The url should be a valid url'
        });
    });

    it('is empty for a valid draft', () => {
        expect(validateTagDraft(draft())).toEqual({});
    });
});

describe('buildTagSavePayload', () => {
    it('maps the draft to snake_case with empty optional fields as null', () => {
        const payload = buildTagSavePayload(draft({metaTitle: 'Meta', canonicalUrl: ''}), 'News');

        expect(payload.name).toBe('News');
        expect(payload.slug).toBe('news');
        expect(payload.meta_title).toBe('Meta');
        expect(payload.canonical_url).toBeNull();
        expect(payload.accent_color).toBeNull();
    });

    it('preserves code injection whitespace in the save payload', () => {
        const payload = buildTagSavePayload(draft({
            codeinjectionHead: '\n<script>head()</script>\n',
            codeinjectionFoot: '  <script>foot()</script>  '
        }), 'News');

        expect(payload.codeinjection_head).toBe('\n<script>head()</script>\n');
        expect(payload.codeinjection_foot).toBe('  <script>foot()</script>  ');
    });

    it('preserves untouched server whitespace in the save payload', () => {
        const payload = buildTagSavePayload(draft({
            description: '\nImportant\n',
            metaTitle: ' Meta title '
        }), 'News', new Set());

        expect(payload.description).toBe('\nImportant\n');
        expect(payload.meta_title).toBe(' Meta title ');
    });

    it('derives visibility when the name changed, like Ember updateVisibility on save', () => {
        expect(buildTagSavePayload(draft({name: '#internal'}), 'News').visibility).toBe('internal');
        expect(buildTagSavePayload(draft({name: 'Renamed'}), 'News').visibility).toBe('public');
    });

    it('derives visibility for new tags', () => {
        expect(buildTagSavePayload(draft({name: '#internal'}), null).visibility).toBe('internal');
    });

    it('leaves visibility untouched when the name is unchanged', () => {
        expect(buildTagSavePayload(draft(), 'News').visibility).toBeUndefined();
    });
});

describe('URL helpers', () => {
    const blogUrl = 'https://example.com';

    it('builds the tag URL from the slug with a trailing slash', () => {
        expect(getTagUrl(draft(), blogUrl)).toBe('https://example.com/tag/news/');
    });

    it('prefers the canonical URL for the tag URL', () => {
        expect(getTagUrl(draft({canonicalUrl: 'https://elsewhere.com/news'}), blogUrl)).toBe('https://elsewhere.com/news/');
        expect(getTagUrl(draft({canonicalUrl: 'https://elsewhere.com/news/'}), blogUrl)).toBe('https://elsewhere.com/news/');
    });

    it('renders the scheme-stripped slug preview, omitting the empty slug', () => {
        expect(getSlugUrlPreview('news', blogUrl)).toBe('example.com/tag/news/');
        expect(getSlugUrlPreview('', blogUrl)).toBe('example.com/tag/');
    });

    it('strips the scheme and trailing slash for the blog domain', () => {
        expect(getBlogDomain('https://example.com/')).toBe('example.com');
        expect(getBlogDomain('http://localhost:2368')).toBe('localhost:2368');
    });
});

describe('SEO derivations', () => {
    it('falls back from meta title to "name - site title"', () => {
        expect(getSeoTitle(draft({metaTitle: 'Custom'}), 'Site')).toBe('Custom');
        expect(getSeoTitle(draft(), 'Site')).toBe('News - Site');
        expect(getSeoTitle(draft(), '')).toBe('News');
    });

    it('caps the SEO title at 70 characters with an ellipsis', () => {
        const long = 'a'.repeat(80);
        expect(getSeoTitle(draft({metaTitle: long}), 'Site')).toBe(`${'a'.repeat(70)}…`);
    });

    it('falls back from meta description to the tag description and caps at 156', () => {
        expect(getSeoDescription(draft({metaDescription: 'Meta desc'}))).toBe('Meta desc');
        expect(getSeoDescription(draft({description: 'Tag desc'}))).toBe('Tag desc');
        expect(getSeoDescription(draft({description: 'b'.repeat(200)}))).toBe(`${'b'.repeat(156)}…`);
    });

    it('caps the SEO URL at 70 characters', () => {
        const url = getSeoUrl(draft({slug: 's'.repeat(100)}), 'https://example.com');
        expect(url.length).toBe(71);
        expect(url.endsWith('…')).toBe(true);
    });
});

describe('charLength and truncateText', () => {
    it('counts unicode code points like the Ember countdown helper', () => {
        expect(charLength('abc')).toBe(3);
        expect(charLength('😀😀')).toBe(2);
    });

    it('truncates with the ellipsis inside the limit, like ember-cli-string-helpers', () => {
        expect(truncateText('short')).toBe('short');
        expect(truncateText('a'.repeat(140))).toBe(`${'a'.repeat(137)}...`);
        expect(truncateText('a'.repeat(150), 149)).toBe(`${'a'.repeat(146)}...`);
    });
});
