import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {buildRenderTheme, deriveSiteUrl, initialEditValue} from '../src/edit-mode/session.js';

describe('edit-mode session helpers', function () {
    describe('deriveSiteUrl', function () {
        it('strips the trailing ghost/ segment from the admin URL', function () {
            assert.equal(deriveSiteUrl('https://site.example.com/ghost/'), 'https://site.example.com/');
        });

        it('preserves subdirectory installs', function () {
            assert.equal(deriveSiteUrl('https://site.example.com/blog/ghost/'), 'https://site.example.com/blog/');
        });
    });

    describe('buildRenderTheme', function () {
        it('keeps only text .hbs and .json sources for the renderer', function () {
            const snapshot = {
                rootPrefix: 'casper/',
                files: {
                    'index.hbs': {path: 'index.hbs', editable: true, content: '{{!< default}}', binary: null},
                    'package.json': {path: 'package.json', editable: true, content: '{"name":"casper"}', binary: null},
                    'partials/card.hbs': {path: 'partials/card.hbs', editable: true, content: '{{title}}', binary: null},
                    'assets/app.css': {path: 'assets/app.css', editable: true, content: 'body{}', binary: null},
                    'assets/logo.png': {path: 'assets/logo.png', editable: false, content: null, binary: new Uint8Array([1])}
                }
            };

            assert.deepEqual(buildRenderTheme(snapshot), {
                'index.hbs': '{{!< default}}',
                'package.json': '{"name":"casper"}',
                'partials/card.hbs': '{{title}}'
            });
        });
    });

    describe('initialEditValue', function () {
        it('collapses the rendered text to a single line (the applier rejects newlines)', function () {
            const dom = new JSDOM('<!DOCTYPE html><body><h1>  Hello\n   world </h1></body>');

            assert.equal(initialEditValue(dom.window.document.querySelector('h1')), 'Hello world');
        });
    });
});
