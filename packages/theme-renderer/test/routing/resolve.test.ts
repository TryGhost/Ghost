// Route table cases for the slice-1 minimal resolver (default routes.yaml
// semantics — see src/routing/resolve.ts).
import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it} from 'vitest';
import {resolveRoutes} from '../../src/index.ts';
import {QUERY} from '../../src/routing/config.ts';
import {configureTestDeps, teardownTestDeps} from '../utils/renderer-test-utils.ts';

describe('resolveRoutes', function () {
    it('resolves / to the collection index controller', function () {
        const candidates = resolveRoutes('/');

        assert.equal(candidates.length, 1);
        const [collection] = candidates;
        assert.equal(collection!.controller, 'collection');
        assert.deepEqual(collection!.params, {});
        assert.equal(collection!.routerOptions.type, 'collection');
        assert.equal(collection!.routerOptions.name, 'index');
        assert.deepEqual(collection!.routerOptions.context, ['index']);
        assert.equal(collection!.routerOptions.frontPageTemplate, 'home');
        assert.deepEqual(collection!.routerOptions.templates, []);
        assert.equal(collection!.routerOptions.permalinks, '/:slug/:options(edit)?/');
        assert.equal(collection!.routerOptions.resourceType, 'posts');
        assert.equal(collection!.routerOptions.query, QUERY.post);
    });

    it('resolves /page/2/ to the paged collection controller with a numeric page param', function () {
        const candidates = resolveRoutes('/page/2/');

        assert.equal(candidates.length, 1);
        const [paged] = candidates;
        assert.equal(paged!.controller, 'collection');
        // finding 7 — page-param middleware parseInts the param before it
        // reaches pathOptions (was the string '2')
        assert.deepEqual(paged!.params, {page: 2});
        assert.equal(paged!.routerOptions.type, 'collection');
    });

    // finding 7 — origin page-param middleware semantics
    it('turns /page/1/ into a permanent redirect to the unpaged url', function () {
        const candidates = resolveRoutes('/page/1/');

        assert.equal(candidates.length, 1);
        assert.deepEqual(candidates[0], {
            controller: 'redirect',
            redirect: {status: 301, url: '/'}
        });
    });

    it('returns no candidates for /page/0/ (page < 1 → 404)', function () {
        assert.deepEqual(resolveRoutes('/page/0/'), []);
    });

    it('does not treat /page/x/ (non-numeric) as pagination', function () {
        const candidates = resolveRoutes('/page/x/');

        // no collection candidate; no entry candidate either (two segments
        // where the second is not "edit" match no mounted route) — 404
        assert.deepEqual(candidates, []);
    });

    it('resolves /:slug/ to post entry then static page fall-through, in mount order', function () {
        const candidates = resolveRoutes('/welcome/');

        assert.equal(candidates.length, 2);

        const [post, page] = candidates;
        assert.equal(post!.controller, 'entry');
        assert.equal(post!.params.slug, 'welcome');
        assert.equal(post!.routerOptions.type, 'entry');
        assert.deepEqual(post!.routerOptions.context, ['post']);
        assert.equal(post!.routerOptions.resourceType, 'posts');
        assert.equal(post!.routerOptions.query, QUERY.post);
        // entry routerOptions are the collection options mutated (extraction-map §1)
        assert.equal(post!.routerOptions.frontPageTemplate, 'home');

        assert.equal(page!.controller, 'entry');
        assert.equal(page!.params.slug, 'welcome');
        assert.equal(page!.routerOptions.type, 'entry');
        assert.deepEqual(page!.routerOptions.context, ['page']);
        assert.equal(page!.routerOptions.resourceType, 'pages');
        assert.equal(page!.routerOptions.query, QUERY.page);
        // static page routerOptions carry no identifier/data/filter
        assert.equal(page!.routerOptions.identifier, undefined);
        assert.equal(page!.routerOptions.data, undefined);
    });

    it('resolves /:slug/edit/ with the options param', function () {
        const candidates = resolveRoutes('/welcome/edit/');

        assert.equal(candidates.length, 2);
        const [postEdit] = candidates;
        assert.equal(postEdit!.controller, 'entry');
        assert.equal(postEdit!.params.slug, 'welcome');
        assert.equal(postEdit!.params.options, 'edit');
    });

    it('does not match multi-segment paths', function () {
        assert.deepEqual(resolveRoutes('/2024/01/welcome/'), []);
    });

    it('respects a custom collection permalink', function () {
        const candidates = resolveRoutes('/welcome-post/', {permalink: '/{slug}/'});
        const [custom] = candidates;
        assert.equal(custom!.controller, 'entry');
        assert.equal(custom!.params.slug, 'welcome-post');
    });

    describe('taxonomies (default routes.yaml)', function () {
        it('resolves /tag/:slug/ to the channel controller with the taxonomy routerOptions shape', function () {
            const candidates = resolveRoutes('/tag/news/');

            assert.equal(candidates.length, 1);
            const [channel] = candidates;
            assert.equal(channel!.controller, 'channel');
            assert.deepEqual(channel!.params, {slug: 'news'});
            // taxonomy-router.js:_prepareContext
            assert.equal(channel!.routerOptions.type, 'channel');
            assert.equal(channel!.routerOptions.name, 'tag');
            assert.equal(channel!.routerOptions.permalinks, '/tag/:slug/');
            assert.deepEqual(channel!.routerOptions.data, {tag: {type: 'read', resource: 'tags', slug: '%s'}});
            assert.equal(channel!.routerOptions.filter, 'tags:\'%s\'+tags.visibility:public');
            assert.equal(channel!.routerOptions.resourceType, 'tags');
            assert.deepEqual(channel!.routerOptions.context, ['tag']);
            assert.equal(channel!.routerOptions.slugTemplate, true);
        });

        it('resolves /author/:slug/ to the channel controller with the author filter', function () {
            const candidates = resolveRoutes('/author/cameron/');

            assert.equal(candidates.length, 1);
            const [channel] = candidates;
            assert.equal(channel!.controller, 'channel');
            assert.equal(channel!.routerOptions.name, 'author');
            assert.equal(channel!.routerOptions.filter, 'authors:\'%s\'');
            assert.equal(channel!.routerOptions.resourceType, 'authors');
            assert.deepEqual(channel!.routerOptions.context, ['author']);
        });

        it('resolves /tag/:slug/page/2/ to the paged channel controller', function () {
            const candidates = resolveRoutes('/tag/news/page/2/');

            assert.equal(candidates.length, 1);
            const [paged] = candidates;
            assert.equal(paged!.controller, 'channel');
            assert.deepEqual(paged!.params, {slug: 'news', page: 2});
        });

        it('turns /tag/:slug/page/1/ into a permanent redirect to the channel index', function () {
            const candidates = resolveRoutes('/tag/news/page/1/');

            assert.equal(candidates.length, 1);
            const [redirect] = candidates;
            if (redirect?.controller !== 'redirect') {
                assert.fail('expected a redirect candidate');
            }
            assert.deepEqual(redirect.redirect, {status: 301, url: '/tag/news/'});
        });

        it('treats /tag/ (no slug) as a regular post/page slug — taxonomies have no index route', function () {
            // taxonomy-router.js getRoute() returns null: /tag/ is served by
            // the collection entry + static-pages mounts as slug 'tag'
            const candidates = resolveRoutes('/tag/');
            assert.equal(candidates.length, 2);
            assert.ok(candidates.every(c => c.controller === 'entry'));
        });
    });

    describe('taxonomy /edit admin redirect', function () {
        beforeEach(function () {
            configureTestDeps({config: {admin: {redirects: true}}});
        });

        afterEach(function () {
            teardownTestDeps();
        });

        it('302-redirects /tag/:slug/edit/ to the admin tags screen (absolute url)', function () {
            const candidates = resolveRoutes('/tag/news/edit/');

            assert.equal(candidates.length, 1);
            const [redirect] = candidates;
            if (redirect?.controller !== 'redirect') {
                assert.fail('expected a redirect candidate');
            }
            assert.deepEqual(redirect.redirect, {
                status: 302,
                url: 'http://localhost:2368/ghost/#/tags/news/',
                absolute: true
            });
        });

        it('302-redirects /author/:slug/edit/ to the admin staff screen', function () {
            const candidates = resolveRoutes('/author/cameron/edit/');

            assert.equal(candidates.length, 1);
            const [redirect] = candidates;
            if (redirect?.controller !== 'redirect') {
                assert.fail('expected a redirect candidate');
            }
            assert.deepEqual(redirect.redirect, {
                status: 302,
                url: 'http://localhost:2368/ghost/#/settings/staff/cameron/',
                absolute: true
            });
        });

        it('falls through to a 404 when admin:redirects is disabled (route not mounted upstream)', function () {
            configureTestDeps({config: {admin: {redirects: false}}});
            assert.deepEqual(resolveRoutes('/tag/news/edit/'), []);
        });
    });
});
