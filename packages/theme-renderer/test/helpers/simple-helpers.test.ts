 
// Characterization tests adapted from ghost/core/test/unit/frontend/helpers/*
// (expected values follow the originals' behavior at 407e032dc7).
import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it} from 'vitest';
import {configureTestDeps, createHbsResponse, teardownTestDeps} from '../utils/renderer-test-utils.ts';

import concat from '../../src/helpers/concat.ts';
import encode from '../../src/helpers/encode.ts';
import excerpt from '../../src/helpers/excerpt.ts';
import title from '../../src/helpers/title.ts';
import plural from '../../src/helpers/plural.ts';
import postClass from '../../src/helpers/post-class.ts';
import bodyClass from '../../src/helpers/body-class.ts';
import readingTime from '../../src/helpers/reading-time.ts';
import match from '../../src/helpers/match.ts';
import is from '../../src/helpers/is.ts';
import has from '../../src/helpers/has.ts';
import t from '../../src/helpers/t.ts';

beforeEach(function () {
    configureTestDeps();
});

afterEach(function () {
    teardownTestDeps();
});

describe('{{concat}}', function () {
    it('joins arguments', function () {
        const result = concat('a', 'b', 'c', {hash: {}});
        assert.equal(result.toString(), 'abc');
    });

    it('supports a separator', function () {
        const result = concat('a', 'b', {hash: {separator: '-'}});
        assert.equal(result.toString(), 'a-b');
    });
});

describe('{{encode}}', function () {
    it('URI encodes the string', function () {
        const result = encode('abc bcd&', {});
        assert.equal(result.toString(), 'abc%20bcd%26');
    });
});

describe('{{excerpt}}', function () {
    it('renders empty string when there is no excerpt', function () {
        const result = excerpt.call({}, {hash: {}});
        assert.equal(result.toString(), '');
    });

    it('uses custom excerpt verbatim', function () {
        const result = excerpt.call({custom_excerpt: 'Hello World'}, {hash: {}});
        assert.equal(result.toString(), 'Hello World');
    });

    it('truncates by words', function () {
        const result = excerpt.call({excerpt: 'one two three four five'}, {hash: {words: '2'}});
        assert.equal(result.toString(), 'one two');
    });

    it('escapes HTML', function () {
        const result = excerpt.call({excerpt: 'Hello & <World>'}, {hash: {}});
        assert.equal(result.toString(), 'Hello &amp; &lt;World&gt;');
    });
});

describe('{{title}}', function () {
    it('escapes the title', function () {
        const result = title.call({title: 'Hello <World>'});
        assert.equal(result.toString(), 'Hello &lt;World&gt;');
    });

    it('returns empty string for missing title', function () {
        const result = title.call({});
        assert.equal(result.toString(), '');
    });
});

describe('{{plural}}', function () {
    it('empty/singular/plural forms', function () {
        const hash = {empty: 'No posts', singular: '% post', plural: '% posts'};
        assert.equal(plural(0, {hash})!.toString(), 'No posts');
        assert.equal(plural(1, {hash})!.toString(), '1 post');
        assert.equal(plural(5, {hash})!.toString(), '5 posts');
    });
});

describe('{{post_class}}', function () {
    it('renders default post class', function () {
        const result = postClass.call({});
        assert.equal(result.toString(), 'post no-image');
    });

    it('includes tag, featured and image classes', function () {
        const result = postClass.call({
            tags: [{slug: 'news'}],
            featured: true,
            feature_image: '/content/images/x.png'
        });
        assert.equal(result.toString(), 'post tag-news featured');
    });
});

describe('{{body_class}}', function () {
    it('home context', function () {
        const options = createHbsResponse({locals: {context: ['home']}});
        const result = bodyClass.call({}, options);
        assert.equal(result.toString(), 'home-template');
    });

    it('post context with tags', function () {
        const options = createHbsResponse({locals: {context: ['post']}});
        const result = bodyClass.call({post: {tags: [{slug: 'foo'}, {slug: 'bar'}]}}, options);
        assert.equal(result.toString(), 'post-template tag-foo tag-bar');
    });

    it('paged tag context', function () {
        const options = createHbsResponse({locals: {context: ['tag', 'paged']}});
        const result = bodyClass.call({tag: {slug: 'foo'}}, options);
        assert.equal(result.toString(), 'tag-template tag-foo paged');
    });
});

describe('{{reading_time}}', function () {
    it('returns null for non-posts', function () {
        const result = readingTime.call({}, {hash: {}});
        assert.equal(result, null);
    });

    it('formats reading time for a post', function () {
        const html = '<p>' + 'word '.repeat(500) + '</p>';
        const result = readingTime.call({html, title: 'x', slug: 'x'}, {hash: {}});
        assert.equal(result!.toString(), '2 min read');
    });
});

describe('{{match}}', function () {
    it('inline equality returns SafeString true/false', function () {
        assert.equal(match.call({}, 'a', 'a', {hash: {}}).toString(), 'true');
        assert.equal(match.call({}, 'a', 'b', {hash: {}}).toString(), 'false');
    });

    it('block mode calls fn/inverse', function () {
        const options = {
            hash: {},
            fn: () => 'yes',
            inverse: () => 'no'
        };
        assert.equal(match.call({}, 5, '>', 3, options), 'yes');
        assert.equal(match.call({}, 2, '>', 3, options), 'no');
    });
});

describe('{{is}}', function () {
    it('matches current context', function () {
        const options = {
            ...createHbsResponse({locals: {context: ['post']}}),
            fn: () => 'yes',
            inverse: () => 'no'
        };
        assert.equal(is.call({}, 'post', options), 'yes');
        assert.equal(is.call({}, 'page, index', options), 'no');
    });
});

describe('{{has}}', function () {
    it('matches tags by name', function () {
        const options = {
            ...createHbsResponse({}),
            hash: {tag: 'video, music'},
            fn: () => 'yes',
            inverse: () => 'no'
        };
        assert.equal(has.call({tags: [{name: 'music'}]}, options), 'yes');
        assert.equal(has.call({tags: [{name: 'other'}]}, options), 'no');
    });

    it('matches counts', function () {
        const options = {
            ...createHbsResponse({}),
            hash: {tag: 'count:2'},
            fn: () => 'yes',
            inverse: () => 'no'
        };
        assert.equal(has.call({tags: [{name: 'a'}, {name: 'b'}]}, options), 'yes');
    });
});

describe('{{t}}', function () {
    it('returns empty string without a key', function () {
        assert.equal(t('', {hash: {}}), '');
    });

    it('interpolates bindings (default simple i18n port)', function () {
        assert.equal(t('Page {page} of {pages}', {hash: {page: 2, pages: 5}}), 'Page 2 of 5');
    });
});
