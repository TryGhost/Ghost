/* eslint-disable @typescript-eslint/no-explicit-any */
// Characterization tests adapted from ghost/core/test/unit/frontend/helpers/get.test.js
import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it} from 'vitest';
import {configureTestDeps, createHbsResponse, teardownTestDeps} from '../utils/renderer-test-utils.ts';
import get from '../../src/helpers/get.ts';

let requests: string[];

function recordingFetch(body: any = {posts: [], meta: {pagination: {page: 1, limit: 15, pages: 1, total: 0, next: null, prev: null}}}) {
    return (async (url: RequestInfo | URL) => {
        requests.push(String(url));
        return new Response(JSON.stringify(body), {status: 200});
    }) as typeof globalThis.fetch;
}

function blockOptions(extra: any = {}) {
    const captured: any = {fnCalls: [], inverseCalls: []};
    const options = {
        ...createHbsResponse({}),
        hash: {},
        fn: (context: any, opts: any) => {
            captured.fnCalls.push({context, opts});
            return 'rendered';
        },
        inverse: (context: any, opts: any) => {
            captured.inverseCalls.push({context, opts});
            return 'inverse';
        },
        ...extra
    };
    return {options, captured};
}

beforeEach(function () {
    requests = [];
});

afterEach(function () {
    teardownTestDeps();
});

describe('{{#get}}', function () {
    it('browses posts with default include over the content API', async function () {
        configureTestDeps({fetch: recordingFetch({posts: [{title: 'A', slug: 'a', html: ''}]})});
        const {options, captured} = blockOptions();
        options.hash = {limit: '3'};

        const result = await get.call({}, 'posts', options);

        assert.equal(result, 'rendered');
        assert.equal(requests.length, 1);
        const url = new URL(requests[0] as string);
        assert.equal(url.pathname, '/ghost/api/content/posts/');
        assert.equal(url.searchParams.get('limit'), '3');
        assert.equal(captured.fnCalls[0].context.posts.length, 1);
    });

    it('caps limit at the max (100)', async function () {
        configureTestDeps({fetch: recordingFetch()});
        const {options} = blockOptions();
        options.hash = {limit: '500'};

        await get.call({}, 'posts', options);
        const url = new URL(requests[0] as string);
        assert.equal(url.searchParams.get('limit'), '100');
    });

    it('caps limit=all to the max unless allowed by config', async function () {
        configureTestDeps({fetch: recordingFetch()});
        const {options} = blockOptions();
        options.hash = {limit: 'all'};

        await get.call({}, 'posts', options);
        const url = new URL(requests[0] as string);
        assert.equal(url.searchParams.get('limit'), '100');
    });

    it('resolves {{slug}} style paths in filters against this', async function () {
        configureTestDeps({fetch: recordingFetch()});
        const {options} = blockOptions();
        options.hash = {filter: 'tags:{{post.tags}}'};

        await get.call({post: {tags: [{slug: 'a'}, {slug: 'b'}]}}, 'posts', options);
        const url = new URL(requests[0] as string);
        assert.equal(url.searchParams.get('filter'), 'tags:a,b');
    });

    it('uses read for slug queries', async function () {
        configureTestDeps({fetch: recordingFetch({posts: [{slug: 'welcome', title: 'W', html: ''}]})});
        const {options} = blockOptions();
        options.hash = {slug: 'welcome'};

        await get.call({}, 'posts', options);
        const url = new URL(requests[0] as string);
        assert.equal(url.pathname, '/ghost/api/content/posts/slug/welcome/');
    });

    it('renders the inverse for unknown resources', async function () {
        configureTestDeps({fetch: recordingFetch()});
        const {options, captured} = blockOptions();

        const result = await get.call({}, 'products' as any, options);
        assert.equal(result, 'inverse');
        assert.equal(captured.inverseCalls[0].opts.data.error, 'Invalid "products" resource given to get helper');
        assert.equal(requests.length, 0);
    });

    it('renders the inverse with the API error message on failure', async function () {
        configureTestDeps({
            fetch: (async () => new Response(JSON.stringify({errors: [{message: 'Kaboom'}]}), {status: 500})) as typeof globalThis.fetch
        });
        const {options, captured} = blockOptions();

        const result = await get.call({}, 'posts', options);
        assert.equal(result, 'inverse');
        assert.equal(captured.inverseCalls[0].opts.data.error, 'Kaboom');
    });

    it('exposes pagination as a block param', async function () {
        configureTestDeps({fetch: recordingFetch({posts: [], meta: {pagination: {page: 1, pages: 1, limit: 15, total: 0, next: null, prev: null}}})});
        const {options, captured} = blockOptions();

        await get.call({}, 'posts', options);
        const {opts, context} = captured.fnCalls[0];
        assert.equal(opts.blockParams.length, 2);
        assert.equal(opts.blockParams[1].page, 1);
        assert.equal(context.pagination.page, 1);
    });
});
