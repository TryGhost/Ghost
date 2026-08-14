// Route table cases for the slice-1 minimal resolver (default routes.yaml
// semantics — see src/routing/resolve.ts).
import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {resolveRoutes} from '../../src/index.ts';
import {QUERY} from '../../src/routing/config.ts';

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

    it('resolves /page/2/ to the paged collection controller', function () {
        const candidates = resolveRoutes('/page/2/');

        assert.equal(candidates.length, 1);
        assert.equal(candidates[0]!.controller, 'collection');
        assert.deepEqual(candidates[0]!.params, {page: '2'});
        assert.equal(candidates[0]!.routerOptions.type, 'collection');
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
        assert.equal(candidates[0]!.params.slug, 'welcome');
        assert.equal(candidates[0]!.params.options, 'edit');
    });

    it('does not match multi-segment paths', function () {
        assert.deepEqual(resolveRoutes('/2024/01/welcome/'), []);
    });

    it('respects a custom collection permalink', function () {
        const candidates = resolveRoutes('/welcome-post/', {permalink: '/{slug}/'});
        assert.equal(candidates[0]!.params.slug, 'welcome-post');
    });
});
