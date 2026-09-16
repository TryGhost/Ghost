/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for the ported result-union render pipeline: context, template
// selection, format-response and the renderer. Cases adapted from
// ghost/core/test/unit/frontend/services/rendering/* @ 407e032dc7.
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'vitest';
import errors from '@tryghost/errors';
import { configureTestDeps, teardownTestDeps } from '../utils/renderer-test-utils.ts';
import setContext from '../../src/rendering/context.ts';
import templates from '../../src/rendering/templates.ts';
import formatResponse from '../../src/rendering/format-response.ts';
import renderer from '../../src/rendering/renderer.ts';
import handleError from '../../src/rendering/error.ts';
import type { ActiveThemePort } from '../../src/seam/types.ts';
import type { PortRequest, PortResponse } from '../../src/ports.ts';

function fakeTheme(templateNames: string[]): ActiveThemePort {
  return {
    name: 'fake',
    hasTemplate: (name) => templateNames.includes(name),
    config: () => undefined,
  };
}

function makeReq(overrides: Partial<PortRequest> = {}): PortRequest {
  return { path: '/', originalUrl: '/', query: {}, params: {}, member: null, ...overrides };
}

function makeRes(routerOptions: any, locals: any = {}): PortResponse {
  return { routerOptions, locals };
}

afterEach(function () {
  teardownTestDeps();
});

describe('rendering/context', function () {
  it('flags home for / on a collection', function () {
    const res = makeRes({ context: ['index'] }, { relativeUrl: '/' });
    setContext(makeReq(), res);
    assert.deepEqual(res.locals.context, ['home', 'index']);
  });

  it('flags paged for page >= 2', function () {
    const res = makeRes({ context: ['index'] }, { relativeUrl: '/page/2/' });
    setContext(makeReq({ params: { page: '2' } }), res);
    assert.deepEqual(res.locals.context, ['paged', 'index']);
  });

  it('adds post/page context from the data shape', function () {
    const postRes = makeRes({ context: ['post'] }, { relativeUrl: '/welcome/' });
    setContext(makeReq({ path: '/welcome/' }), postRes, { post: {} });
    assert.deepEqual(postRes.locals.context, ['post']);

    const pageRes = makeRes({ context: ['page'] }, { relativeUrl: '/about/' });
    setContext(makeReq({ path: '/about/' }), pageRes, { page: {} });
    assert.deepEqual(pageRes.locals.context, ['page']);
  });
});

describe('rendering/templates', function () {
  describe('collection hierarchy', function () {
    beforeEach(function () {
      configureTestDeps();
    });

    it('picks home for the front page when the theme has home.hbs', function () {
      configureTestDeps({ depsOverrides: { activeTheme: fakeTheme(['home', 'index']) } });
      const res = makeRes({
        type: 'collection',
        context: ['index'],
        frontPageTemplate: 'home',
        templates: [],
        name: 'index',
      });
      templates.setTemplate(makeReq(), res, {});
      assert.equal(res._template, 'home');
    });

    it('falls back to index without home.hbs', function () {
      configureTestDeps({ depsOverrides: { activeTheme: fakeTheme(['index', 'post']) } });
      const res = makeRes({
        type: 'collection',
        context: ['index'],
        frontPageTemplate: 'home',
        templates: [],
        name: 'index',
      });
      templates.setTemplate(makeReq(), res, {});
      assert.equal(res._template, 'index');
    });

    it('uses index (not home) for paged requests', function () {
      configureTestDeps({ depsOverrides: { activeTheme: fakeTheme(['home', 'index']) } });
      const res = makeRes({
        type: 'collection',
        context: ['index'],
        frontPageTemplate: 'home',
        templates: [],
        name: 'index',
      });
      templates.setTemplate(makeReq({ path: '/page/2/', params: { page: '2' } }), res, {});
      assert.equal(res._template, 'index');
    });
  });

  describe('entry hierarchy', function () {
    it('post: post-:slug > custom_template > post', function () {
      configureTestDeps({ depsOverrides: { activeTheme: fakeTheme(['post', 'index']) } });
      const res = makeRes({ type: 'entry', context: ['post'] });
      templates.setTemplate(makeReq({ path: '/welcome/' }), res, { post: { slug: 'welcome' } });
      assert.equal(res._template, 'post');

      configureTestDeps({
        depsOverrides: { activeTheme: fakeTheme(['post', 'post-welcome', 'index']) },
      });
      const res2 = makeRes({ type: 'entry', context: ['post'] });
      templates.setTemplate(makeReq({ path: '/welcome/' }), res2, { post: { slug: 'welcome' } });
      assert.equal(res2._template, 'post-welcome');
    });

    it('page: page > post fallback', function () {
      configureTestDeps({ depsOverrides: { activeTheme: fakeTheme(['post', 'page', 'index']) } });
      const res = makeRes({ type: 'entry', context: ['page'] });
      templates.setTemplate(makeReq({ path: '/about/' }), res, { page: { slug: 'about' } });
      assert.equal(res._template, 'page');

      configureTestDeps({ depsOverrides: { activeTheme: fakeTheme(['post', 'index']) } });
      const res2 = makeRes({ type: 'entry', context: ['page'] });
      templates.setTemplate(makeReq({ path: '/about/' }), res2, { page: { slug: 'about' } });
      assert.equal(res2._template, 'post');
    });
  });
});

describe('rendering/format-response', function () {
  beforeEach(function () {
    configureTestDeps();
  });

  it('entries: maps posts + pagination', function () {
    const result = {
      posts: [{ slug: 'a' }, { slug: 'b' }],
      meta: { pagination: { page: 1, pages: 3 } },
    };
    const locals = {};
    const formatted = formatResponse.entries(result, false, locals);
    assert.equal(formatted.posts.length, 2);
    assert.deepEqual(formatted.pagination, { page: 1, pages: 3 });
  });

  it('entry: returns {post} and mirrors onto page in page context, moving show_title_and_feature_image to @page', function () {
    const locals: any = {};
    const entry = formatResponse.entry(
      { slug: 'about', show_title_and_feature_image: false, type: 'page' },
      ['page'],
      locals,
    );
    assert.equal(entry.post.slug, 'about');
    assert.equal(entry.page, entry.post);
    // moved off the resource...
    assert.equal(entry.post.show_title_and_feature_image, undefined);
    // ...onto the @page local template options frame
    assert.equal(locals._templateOptions.data.page.show_title_and_feature_image, false);
  });

  it('entry: post context defaults @page.show_title_and_feature_image to true', function () {
    const locals: any = {};
    const entry = formatResponse.entry({ slug: 'welcome' }, ['post'], locals);
    assert.equal(entry.page, undefined);
    assert.equal(locals._templateOptions.data.page.show_title_and_feature_image, true);
  });
});

describe('rendering/renderer', function () {
  it('returns a render result with the picked template and formatted data', function () {
    configureTestDeps({ depsOverrides: { activeTheme: fakeTheme(['home', 'index']) } });
    const res = makeRes(
      {
        type: 'collection',
        context: ['index'],
        frontPageTemplate: 'home',
        templates: [],
        name: 'index',
      },
      { relativeUrl: '/' },
    );
    const result = renderer(makeReq(), res, { posts: [], pagination: { page: 1, pages: 1 } });

    assert.ok('render' in result);
    assert.equal(result.render.template, 'home');
    assert.equal(result.render.contentType, undefined);
    assert.deepEqual(res.locals.context, ['home', 'index']);
    assert.deepEqual(result.render.data.posts, []);
  });

  // Express res.type() semantics: charset appended for text/* and
  // application/json (mime v1 charsets.lookup), extension shorthands
  // resolved through the mime table
  it('honors routes.yaml contentType for allowed templates, appending the charset like Express res.type()', function () {
    configureTestDeps({ depsOverrides: { activeTheme: fakeTheme(['custom-amp']) } });
    const res = makeRes(
      {
        type: 'custom',
        templates: ['custom-amp'],
        defaultTemplate: 'index',
        contentType: 'text/plain',
      },
      { relativeUrl: '/custom/' },
    );
    const result = renderer(makeReq({ path: '/custom/' }), res, {});
    assert.ok('render' in result);
    assert.equal(result.render.template, 'custom-amp');
    assert.equal(result.render.contentType, 'text/plain; charset=utf-8');
  });

  it('resolves extension-style contentType values like Express res.type()', function () {
    configureTestDeps({ depsOverrides: { activeTheme: fakeTheme(['custom-feed']) } });
    const res = makeRes(
      { type: 'custom', templates: ['custom-feed'], defaultTemplate: 'index', contentType: 'json' },
      { relativeUrl: '/feed/' },
    );
    const result = renderer(makeReq({ path: '/feed/' }), res, {});
    assert.ok('render' in result);
    assert.equal(result.render.contentType, 'application/json; charset=utf-8');
  });

  // Oracle-comparison table: every expectation below is the literal output
  // of ghost/core's Express res.type() (express@4.22.2 → send@0.19.2 →
  // mime@1.6.0), computed against that exact dependency graph:
  //   ct = type.includes('/') ? type : mime.lookup(type)   [lowercased ext,
  //        unknown → default_type application/octet-stream]
  //   if (!/;\s*charset\s*=/.test(ct)) append mime.charsets.lookup on the
  //        bare type before ';' — /^text\/|^application\/(javascript|json)/
  //        (unanchored, case-sensitive) → '; charset=utf-8'
  const RES_TYPE_ORACLE: Array<[string, string]> = [
    // extension shorthands through the mime v1 table
    ['rss', 'application/rss+xml'], // known to mime 1.6.0 — and rss+xml gets NO charset
    ['html', 'text/html; charset=utf-8'],
    ['HTML', 'text/html; charset=utf-8'], // mime.lookup lowercases the extension
    ['json', 'application/json; charset=utf-8'],
    ['md', 'text/markdown; charset=utf-8'],
    ['xml', 'application/xml'], // application/xml is not a utf8 type in mime v1
    ['unknownext', 'application/octet-stream'], // mime.lookup default_type
    // full types pass through, charset per the mime v1 rule
    ['text/html', 'text/html; charset=utf-8'],
    ['TEXT/HTML', 'TEXT/HTML'], // charset rule is case-sensitive
    ['application/rss+xml', 'application/rss+xml'],
    ['application/json-patch+json', 'application/json-patch+json; charset=utf-8'], // rule is unanchored
    ['image/png', 'image/png'],
    // existing charset param wins (Express charsetRegExp)
    ['text/html; charset=iso-8859-1', 'text/html; charset=iso-8859-1'],
    ['text/html;charset=UTF-8', 'text/html;charset=UTF-8'],
    // 'charset' appearing as a value is NOT a charset param — still appended
    ['application/json; foo=charset', 'application/json; foo=charset; charset=utf-8'],
  ];

  it('matches the Express res.type() oracle for extension, parameterized and case-variant types', function () {
    configureTestDeps({ depsOverrides: { activeTheme: fakeTheme(['custom-feed']) } });
    for (const [contentType, expected] of RES_TYPE_ORACLE) {
      const res = makeRes(
        { type: 'custom', templates: ['custom-feed'], defaultTemplate: 'index', contentType },
        { relativeUrl: '/feed/' },
      );
      const result = renderer(makeReq({ path: '/feed/' }), res, {});
      assert.ok('render' in result);
      assert.equal(result.render.contentType, expected, `res.type(${JSON.stringify(contentType)})`);
    }
  });

  it('does not throw when routerOptions carries contentType but no templates (upstream default is [])', function () {
    configureTestDeps({ depsOverrides: { activeTheme: fakeTheme(['index']) } });
    const res = makeRes(
      { type: 'custom', defaultTemplate: 'index', contentType: 'text/plain' },
      { relativeUrl: '/custom/' },
    );
    const result = renderer(makeReq({ path: '/custom/' }), res, {});
    assert.ok('render' in result);
    // template not in the (empty) allow-list → contentType not applied
    assert.equal(result.render.contentType, undefined);
  });
});

describe('rendering/handleError', function () {
  it('maps NotFoundError and ValidationError to fall-through', function () {
    assert.deepEqual(handleError({ errorType: 'NotFoundError' }), { next: true });
    assert.deepEqual(handleError({ errorType: 'ValidationError' }), { next: true });
  });

  it('wraps other errors in the error result', function () {
    const err = new errors.InternalServerError({ message: 'boom' });
    assert.deepEqual(handleError(err), { error: { err } });
  });
});
