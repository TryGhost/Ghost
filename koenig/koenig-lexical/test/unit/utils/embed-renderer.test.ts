import fs from 'fs';
import path from 'path';
import {EMBED_READY_MESSAGE, EMBED_RENDERER_MAX_HEIGHT, EMBED_RENDERER_VERSION, EMBED_RENDER_MESSAGE, EMBED_RESIZE_MESSAGE, getEmbedRendererUrl, resolveEmbedHeight} from '../../../src/utils/embed-renderer';
import {describe, expect, test} from 'vitest';

const EDITOR_ORIGIN = 'https://admin.example.com';

describe('Utils: embed-renderer', () => {
    describe('getEmbedRendererUrl', () => {
        test('resolves the versioned renderer inside the configured directory', function () {
            expect(getEmbedRendererUrl('https://embeds.example.net/', EDITOR_ORIGIN)?.href)
                .toEqual(`https://embeds.example.net/v${EMBED_RENDERER_VERSION}.html`);
        });

        test('treats a url without a trailing slash as a directory', function () {
            expect(getEmbedRendererUrl('https://embeds.example.net/ghost/renderer', EDITOR_ORIGIN)?.href)
                .toEqual(`https://embeds.example.net/ghost/renderer/v${EMBED_RENDERER_VERSION}.html`);
        });

        test('allows http for local development', function () {
            expect(getEmbedRendererUrl('http://127.0.0.1:5174/embed-renderer/', 'http://localhost:5174')?.href)
                .toEqual(`http://127.0.0.1:5174/embed-renderer/v${EMBED_RENDERER_VERSION}.html`);
        });

        test.each([
            ['the editor origin', 'https://admin.example.com/embed-renderer/'],
            ['the editor hostname on a different port', 'https://admin.example.com:8443/embed-renderer/'],
            ['invalid urls', 'not a url'],
            ['non-http protocols', 'javascript:alert(1)'],
            ['data urls', 'data:text/html,hello']
        ])('returns null for %s', function (_description, previewUrl) {
            expect(getEmbedRendererUrl(previewUrl, EDITOR_ORIGIN)).toBeNull();
        });
    });

    describe('resolveEmbedHeight', () => {
        test('rounds a reported height up to whole pixels', function () {
            expect(resolveEmbedHeight(400)).toEqual(400);
            expect(resolveEmbedHeight(400.2)).toEqual(401);
            expect(resolveEmbedHeight('400')).toEqual(400);
        });

        test('caps heights at the maximum the editor will apply', function () {
            expect(resolveEmbedHeight(100000000)).toEqual(EMBED_RENDERER_MAX_HEIGHT);
            expect(resolveEmbedHeight(EMBED_RENDERER_MAX_HEIGHT + 1)).toEqual(EMBED_RENDERER_MAX_HEIGHT);
        });

        test.each([
            ['zero', 0],
            ['negative heights', -100],
            ['infinity', Infinity],
            ['NaN', NaN],
            ['non-numeric strings', 'tall'],
            ['missing values', undefined],
            ['objects', {height: 400}]
        ])('ignores %s', function (_description, value) {
            expect(resolveEmbedHeight(value)).toBeNull();
        });
    });

    describe('renderer file', () => {
        const rendererPath = path.resolve(__dirname, `../../../public/embed-renderer/v${EMBED_RENDERER_VERSION}.html`);

        test('exists for the current protocol version', function () {
            expect(fs.existsSync(rendererPath)).toBe(true);
        });

        test('speaks the same protocol as the editor', function () {
            const renderer = fs.readFileSync(rendererPath, 'utf-8');

            expect(renderer).toContain(`var VERSION = ${EMBED_RENDERER_VERSION};`);
            expect(renderer).toContain(`'${EMBED_READY_MESSAGE}'`);
            expect(renderer).toContain(`'${EMBED_RENDER_MESSAGE}'`);
            expect(renderer).toContain(`'${EMBED_RESIZE_MESSAGE}'`);
        });
    });
});
