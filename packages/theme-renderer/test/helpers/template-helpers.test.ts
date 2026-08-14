/* eslint-disable @typescript-eslint/no-explicit-any */
// Renders sync helpers through a real handlebars environment (the shared
// seam instance), with the embedded core helper partials registered — this
// exercises foreach/navigation/pagination/link/content the way templates do.
import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it} from 'vitest';
import {SITE_URL, configureTestDeps, teardownTestDeps} from '../utils/renderer-test-utils.ts';
import {hbs} from '../../src/seam/handlebars-env.ts';
import {registerGhostHelpers} from '../../src/helpers/services/register-ghost-helpers.ts';
import {registerCoreHelperPartials} from '../../src/helpers/tpl/partials.ts';
import type {HelperRegistrar} from '../../src/seam/types.ts';

// Sync-only registrar: async helpers are tested by direct invocation
// (get/ghost_head/prev_post) — the placeholder machinery lives in the engine.
const registrar: HelperRegistrar = {
    registerHelper(name, fn) {
        hbs.handlebars.registerHelper(name, fn);
    },
    registerAsyncHelper(name) {
        hbs.handlebars.registerHelper(name, () => `[async:${name}]`);
    }
};

function render(source: string, context: any = {}, data: any = {}) {
    const template = hbs.handlebars.compile(source, {preventIndent: true});
    return template(context, {
        data: {
            site: {},
            labs: {},
            config: {},
            ...data,
            root: {_locals: {}, ...(data.root || {})}
        }
    });
}

beforeEach(function () {
    configureTestDeps();
    registerGhostHelpers(registrar);
    registerCoreHelperPartials(hbs);
});

afterEach(function () {
    teardownTestDeps();
});

describe('{{#foreach}}', function () {
    it('iterates arrays with @index/@first/@last data', function () {
        const output = render(
            '{{#foreach items}}{{@index}}:{{this}}{{#unless @last}},{{/unless}}{{/foreach}}',
            {items: ['a', 'b', 'c']}
        );
        assert.equal(output, '0:a,1:b,2:c');
    });

    it('respects limit and from/to', function () {
        const output = render(
            '{{#foreach items limit="2"}}{{this}}{{/foreach}}',
            {items: ['a', 'b', 'c', 'd']}
        );
        assert.equal(output, 'ab');
    });

    it('filters non-public posts by visibility', function () {
        const posts = [
            {html: '', title: 'public', slug: 'p1', visibility: 'public'},
            {html: '', title: 'members', slug: 'p2', visibility: 'members'}
        ];
        const output = render('{{#foreach posts}}{{title}} {{/foreach}}', {posts});
        // default visibility for posts is 'all' — both render
        assert.equal(output, 'public members ');
    });

    it('renders the inverse block for empty collections', function () {
        const output = render('{{#foreach items}}x{{else}}empty{{/foreach}}', {items: []});
        assert.equal(output, 'empty');
    });
});

describe('{{navigation}}', function () {
    it('renders the core navigation partial with urls and current class', function () {
        const output = render('{{navigation}}', {}, {
            site: {
                navigation: [
                    {label: 'Home', url: '/'},
                    {label: 'About', url: '/about/'}
                ]
            },
            root: {relativeUrl: '/about/', _locals: {}}
        });
        assert.match(output, /<ul class="nav">/);
        assert.match(output, new RegExp(`href="${SITE_URL}"`));
        assert.match(output, new RegExp(`href="${SITE_URL}about/"`));
        assert.match(output, /nav-current/);
        assert.match(output, /nav-home/);
        assert.match(output, /Home/);
        assert.match(output, /About/);
    });

    it('no-ops with empty navigation data', function () {
        const output = render('{{navigation}}', {}, {site: {navigation: []}});
        assert.equal(output, '');
    });
});

describe('{{pagination}}', function () {
    it('renders page counts and newer/older links', function () {
        const output = render('{{pagination}}', {
            pagination: {page: 2, pages: 3, next: 3, prev: 1, total: 25, limit: 10}
        }, {
            root: {relativeUrl: '/page/2/', pagination: {page: 2, pages: 3, next: 3, prev: 1, total: 25, limit: 10}, _locals: {}}
        });
        assert.match(output, /Page 2 of 3/);
        assert.match(output, /class="newer-posts" href="\/"/);
        assert.match(output, /class="older-posts" href="\/page\/3\/"/);
    });

    it('throws outside a paginated context', function () {
        assert.throws(() => render('{{pagination}}', {}), /pagination/);
    });
});

describe('{{#link}} and {{link_class}}', function () {
    it('renders an anchor with active class from the current url', function () {
        const output = render('{{#link href="/about/"}}About{{/link}}', {}, {
            root: {relativeUrl: '/about/', _locals: {}}
        });
        assert.equal(output, '<a class="nav-current" href="/about/">About</a>');
    });

    it('link_class emits classes only', function () {
        const output = render('{{link_class for="/about/"}}', {}, {
            root: {relativeUrl: '/about/', _locals: {}}
        });
        assert.equal(output, 'nav-current');
    });
});

describe('{{content}}', function () {
    it('outputs html unescaped', function () {
        const output = render('{{content}}', {html: '<p>Hello</p>', access: true});
        assert.equal(output, '<p>Hello</p>');
    });

    it('truncates by words', function () {
        const output = render('{{content words="1"}}', {html: '<p>Hello wide world</p>', access: true});
        assert.equal(output, '<p>Hello</p>');
    });

    it('renders the restricted-content CTA when access is false', function () {
        const output = render('{{content}}', {
            html: '',
            access: false,
            visibility: 'paid'
        }, {
            site: {accent_color: '#abcdef'},
            root: {_locals: {}}
        });
        assert.match(output, /gh-post-upgrade-cta/);
        assert.match(output, /This post is for paying subscribers only/);
        assert.match(output, /background-color: #abcdef/);
        assert.match(output, /Subscribe now/);
    });

    // finding 2 — the content-cta partial invokes the `tiers` helper for
    // tier-gated posts; without it registered the render TypeErrors (the
    // post's `tiers` array gets .call()ed)
    it('renders the tier names through the tiers helper for tier-gated posts', function () {
        const output = render('{{content}}', {
            html: '',
            access: false,
            visibility: 'tiers',
            tiers: [{name: 'Gold'}, {name: 'Silver'}]
        }, {
            site: {accent_color: '#abcdef'},
            root: {_locals: {}}
        });
        assert.match(output, /gh-post-upgrade-cta/);
        assert.match(output, /Gold and Silver/);
    });
});

describe('{{raw}}', function () {
    it('returns contents unprocessed', function () {
        const output = render('{{{{raw}}}}{{title}}{{{{/raw}}}}', {title: 'nope'});
        assert.equal(output, '{{title}}');
    });
});
