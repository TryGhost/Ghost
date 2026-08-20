import {describe, expect, it} from 'vitest';

import {
    PREVIEW_INSPECTION_LIMITS,
    PreviewInspectionError,
    inspectPreviewElement,
    inspectPreviewPage
} from './preview-inspection';

function previewDocument(html: string): Document {
    return new DOMParser().parseFromString(html, 'text/html');
}

describe('preview inspection', () => {
    it('returns a bounded page outline and text structure', () => {
        const document = previewDocument(`
            <html><head><title>Demo</title></head><body>
                <header aria-label="Site header"><nav aria-label="Primary">${'<a href="/item">Item</a>'.repeat(PREVIEW_INSPECTION_LIMITS.maxOutlineItems + 5)}</nav></header>
                <main><h1 data-edit="index.hbs:2:1">${'Title '.repeat(PREVIEW_INSPECTION_LIMITS.maxTextCharacters)}</h1></main>
            </body></html>
        `);

        const result = inspectPreviewPage(document, 'https://example.com/about/');

        expect(result).toMatchObject({
            url: 'https://example.com/about/',
            title: 'Demo',
            truncated: {outline: true, text: true, source: false}
        });
        expect(result.outline.slice(0, 2)).toEqual([
            {tag: 'header', role: 'banner', name: 'Site header', source: null, sourceTruncated: false},
            {tag: 'nav', role: 'navigation', name: 'Primary', source: null, sourceTruncated: false}
        ]);
        expect(result.outline).toHaveLength(PREVIEW_INSPECTION_LIMITS.maxOutlineItems);
        expect(result.text.length).toBeLessThanOrEqual(PREVIEW_INSPECTION_LIMITS.maxTextCharacters);
    });

    it('returns only allowlisted attributes and computed styles for a marked element', () => {
        const document = previewDocument(`
            <main>
                <a id="hero" class="button" href="/about/" aria-label="About Ghost" data-edit="partials/hero.hbs:4:5" data-secret="nope" style="display: block; color: rgb(1, 2, 3); cursor: pointer">
                    ${'Read more '.repeat(PREVIEW_INSPECTION_LIMITS.maxElementTextCharacters)}
                </a>
            </main>
        `);

        const result = inspectPreviewElement(document, {marker: 'partials/hero.hbs:4:5'});

        expect(result).toMatchObject({
            tag: 'a',
            role: 'link',
            accessibleName: 'About Ghost',
            source: {path: 'partials/hero.hbs', line: 4, column: 5},
            attributes: {
                id: 'hero',
                class: 'button',
                href: '/about/',
                'aria-label': 'About Ghost',
                'data-edit': 'partials/hero.hbs:4:5'
            },
            truncated: {text: true}
        });
        expect(result.attributes).not.toHaveProperty('data-secret');
        expect(result.styles).toMatchObject({display: 'block', color: 'rgb(1, 2, 3)'});
        expect(result.styles).not.toHaveProperty('cursor');
    });

    it('rejects missing markers, invalid selectors, and inaccessible elements with stable codes', () => {
        const document = previewDocument('<main><p id="hidden" style="display:none" data-edit="index.hbs:1:1">Hidden</p><section inert><button id="inert" data-edit="index.hbs:2:1">Inactive</button></section></main>');

        expect(() => inspectPreviewElement(document, {marker: 'missing.hbs:1:1'})).toThrowError(expect.objectContaining<Partial<PreviewInspectionError>>({code: 'preview_element_not_found'}));
        expect(() => inspectPreviewElement(document, {selector: '['})).toThrowError(expect.objectContaining<Partial<PreviewInspectionError>>({code: 'invalid_preview_selector'}));
        expect(() => inspectPreviewElement(document, {selector: '#hidden'})).toThrowError(expect.objectContaining<Partial<PreviewInspectionError>>({code: 'preview_element_inaccessible'}));
        expect(() => inspectPreviewElement(document, {selector: '#inert'})).toThrowError(expect.objectContaining<Partial<PreviewInspectionError>>({code: 'preview_element_inaccessible'}));
    });

    it('omits hidden, aria-hidden, and inert descendant text', () => {
        const document = previewDocument('<main>Visible <span hidden>Hidden</span><span aria-hidden="true">Aria hidden</span><span inert>Inert</span></main>');

        const result = inspectPreviewPage(document, 'https://example.com/');

        expect(result.text).toBe('Visible');
    });

    it('uses native control roles and associated labels', () => {
        const document = previewDocument('<label for="updates">Email updates</label><input id="updates" type="checkbox" data-edit="index.hbs:1:40">');

        const result = inspectPreviewElement(document, {marker: 'index.hbs:1:40'});

        expect(result).toMatchObject({role: 'checkbox', accessibleName: 'Email updates'});
    });

    it('uses visible descendant alternatives for control names', () => {
        const document = previewDocument('<button data-edit="index.hbs:1:1"><span aria-hidden="true">Ignore</span><img alt="Search"></button>');

        const result = inspectPreviewElement(document, {marker: 'index.hbs:1:1'});

        expect(result).toMatchObject({role: 'button', accessibleName: 'Search'});
    });

    it('bounds explicit roles and source paths while reporting the truncation', () => {
        const role = 'custom-'.repeat(20);
        const sourcePath = 'partials/'.padEnd(PREVIEW_INSPECTION_LIMITS.maxTargetCharacters + 20, 'x');
        const document = previewDocument(`<main role="${role}" data-edit="${sourcePath}:2:3">Bounded</main>`);

        const result = inspectPreviewPage(document, 'https://example.com/');

        expect(result.outline[0]?.role).toHaveLength(64);
        expect(result.outline[0]?.source?.path).toHaveLength(PREVIEW_INSPECTION_LIMITS.maxTargetCharacters);
        expect(result.outline[0]?.sourceTruncated).toBe(true);
        expect(result.truncated.source).toBe(true);
    });

    it('rejects non-finite source locations', () => {
        const document = previewDocument(`<main data-edit="index.hbs:${'9'.repeat(400)}:1">Invalid marker</main>`);

        const result = inspectPreviewPage(document, 'https://example.com/');

        expect(result.outline[0]?.source).toBeNull();
    });

    it('requires exactly one bounded marker or selector target', () => {
        const document = previewDocument('<main></main>');
        const tooLong = '#'.padEnd(PREVIEW_INSPECTION_LIMITS.maxTargetCharacters + 1, 'a');

        expect(() => inspectPreviewElement(document, {})).toThrowError(expect.objectContaining<Partial<PreviewInspectionError>>({code: 'invalid_preview_target'}));
        expect(() => inspectPreviewElement(document, {marker: 'index.hbs:1:1', selector: 'main'})).toThrowError(expect.objectContaining<Partial<PreviewInspectionError>>({code: 'invalid_preview_target'}));
        expect(() => inspectPreviewElement(document, {selector: tooLong})).toThrowError(expect.objectContaining<Partial<PreviewInspectionError>>({code: 'preview_target_too_large'}));
    });
});
