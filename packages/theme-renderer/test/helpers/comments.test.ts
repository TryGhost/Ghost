/* eslint-disable @typescript-eslint/no-explicit-any */
// Characterization tests adapted from ghost/core/test/unit/frontend/helpers/comments.test.js
// (expected values follow the original's behavior at 6be2dc0712). The full-tag
// expectation is written out literally so it locks the exact bytes the live
// instance emits on a post page with comments enabled.
import assert from 'node:assert/strict';
import {afterEach, describe, it} from 'vitest';
import {configureTestDeps, teardownTestDeps} from '../utils/renderer-test-utils.ts';

import comments from '../../src/helpers/comments.ts';

const COMMENTS_URL = 'https://cdn.example.com/comments-ui.min.js';

function configure(settingsOverrides: Record<string, any> = {}, {withScriptUrl = true} = {}) {
    configureTestDeps({
        ...(withScriptUrl ? {config: {comments: {url: COMMENTS_URL, version: '1.6'}}} : {}),
        settingsOverrides: {comments_enabled: 'all', ...settingsOverrides}
    });
}

afterEach(function () {
    teardownTestDeps();
});

describe('{{comments}}', function () {
    it('returns undefined outside a post context (no comment_id)', async function () {
        configure();
        assert.equal(await comments.call({}, {hash: {}, data: {site: {}}}), undefined);
    });

    it('returns undefined when comments are off, or the post is inaccessible', async function () {
        configure({comments_enabled: 'off'});
        assert.equal(await comments.call({comment_id: 'c', id: 'p', access: true}, {hash: {}, data: {site: {}}}), undefined);

        configure();
        assert.equal(await comments.call({comment_id: 'c', id: 'p', access: false}, {hash: {}, data: {site: {}}}), undefined);
    });

    it('renders the comments-ui script tag with the live byte shape', async function () {
        configure();
        const rendered = await comments.call(
            {comment_id: 'post_test', id: 'post_id_123', access: true},
            {hash: {}, data: {site: {accent_color: '#FF1A75'}}}
        );

        assert.equal(rendered!.toString(), '\n        <script defer src="https://cdn.example.com/comments-ui.min.js" ' +
            'data-locale="en" ' +
            'data-ghost-comments="http://localhost:2368/" ' +
            'data-api="http://localhost:2368/ghost/api/content/" ' +
            'data-admin="http://localhost:2368/ghost/" ' +
            'data-key="testkey" ' +
            'data-title="null" ' +
            'data-count="true" ' +
            'data-post-id="post_id_123" ' +
            'data-color-scheme="auto" ' +
            'data-avatar-saturation="60" ' +
            'data-accent-color="#FF1A75" ' +
            'data-comments-enabled="all" ' +
            'data-publication="Ghost" crossorigin="anonymous"></script>\n    ');
    });

    it('honors the mode/saturation/count/title hash params', async function () {
        configure();
        const rendered = (await comments.call(
            {comment_id: 'post_test', id: 'post_id_123', access: true},
            {hash: {mode: 'dark', saturation: '80', count: false, title: 'Join the discussion'}, data: {site: {}}}
        ))!.toString();

        assert.match(rendered, /data-color-scheme="dark"/);
        assert.match(rendered, /data-avatar-saturation="80"/);
        assert.match(rendered, /data-count="false"/);
        assert.match(rendered, /data-title="Join the discussion"/);
        assert.match(rendered, /data-accent-color=""/, 'no site accent color → empty attribute, exactly like core');
    });

    it('returns undefined when the instance config has no comments script URL (seam guard)', async function () {
        // The comments-ui URL is per-instance and only scrapeable from a page
        // that carries the tag — when unknown, rendering nothing beats
        // emitting src="undefined" (documented divergence, deltas.md row 13).
        configure({}, {withScriptUrl: false});
        assert.equal(await comments.call({comment_id: 'c', id: 'p', access: true}, {hash: {}, data: {site: {}}}), undefined);
    });
});
