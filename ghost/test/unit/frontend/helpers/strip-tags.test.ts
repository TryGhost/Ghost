import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sinon from 'sinon';
import type { SinonStub } from 'sinon';
import logging from '@tryghost/logging';
import errors from '@tryghost/errors';
import { strip_tags } from '../../../../core/frontend/helpers/strip_tags';
// @ts-expect-error This module lacks type definitions.
import { registerAsyncThemeHelper } from '../../../../core/frontend/services/helpers/handlebars';
import configUtils from '../../../utils/config-utils';
// @ts-expect-error This module lacks type definitions.
import { SafeString } from '../../../../core/frontend/services/handlebars';
// @ts-expect-error This module lacks type definitions.
import { registerHelper, shouldCompileToExpected } from './utils/handlebars';
// @ts-expect-error This module lacks type definitions.
import handlebarsService from '../../../../core/frontend/services/handlebars';

const { handlebars } = handlebarsService.hbs;

function inline(input: unknown): string {
  return strip_tags.call({}, input, { hash: {} });
}

// The handlebars instance is shared across the unit suite, so remember what each helper was
// registered as (or that it was absent) and put that back once a suite is done with it.
function snapshotHelpers(names: string[]): () => void {
  const previous = names.map((name) => [name, handlebars.helpers[name]] as const);

  return function restoreHelpers() {
    for (const [name, helper] of previous) {
      if (helper === undefined) {
        handlebars.unregisterHelper(name);
      } else {
        handlebars.registerHelper(name, helper);
      }
    }
  };
}

describe('{{strip_tags}} helper', function () {
  describe('direct calls', function () {
    it('returns plain text unchanged', function () {
      assert.equal(inline('Hello world'), 'Hello world');
    });

    it('removes simple tags', function () {
      assert.equal(inline('<b>Hello</b> <i>world</i>'), 'Hello world');
    });

    it('removes nested tags', function () {
      assert.equal(inline('<p>Hello <strong><em>big</em></strong> world</p>'), 'Hello big world');
    });

    it('keeps link text and drops the URL', function () {
      assert.equal(
        inline('Read the <a href="https://ghost.org/docs/">Ghost docs</a> now'),
        'Read the Ghost docs now',
      );
    });

    it('replaces each removed tag with a single space', function () {
      assert.equal(inline('<span>hello</span>there'), 'hello there');
    });

    it('replaces an unmatched closing tag with a single space', function () {
      assert.equal(inline('hello</span>world'), 'hello world');
    });

    it('replaces an unmatched closing tag inside an element with a single space', function () {
      assert.equal(inline('<p>hello</span>world</p>'), 'hello world');
    });

    it('does not double up spaces when tags are already separated by whitespace', function () {
      assert.equal(inline('<b>Hello</b> <i>there</i>'), 'Hello there');
    });

    it('collapses runs of whitespace and newlines to a single space', function () {
      assert.equal(inline('Hello\n\n  <br>\t world'), 'Hello world');
    });

    it('trims leading and trailing whitespace', function () {
      assert.equal(inline('  <p>Hello</p>  '), 'Hello');
    });

    it('decodes named entities', function () {
      assert.equal(inline('Fish &amp; Chips'), 'Fish & Chips');
    });

    it('decodes numeric entities', function () {
      assert.equal(inline('&#39;quoted&#39; &#x27;again&#x27;'), "'quoted' 'again'");
    });

    it('decodes angle bracket entities to literal characters', function () {
      assert.equal(inline('1 &lt; 2 &gt; 0'), '1 < 2 > 0');
    });

    it('decodes quote entities', function () {
      assert.equal(inline('She said &quot;hi&quot;'), 'She said "hi"');
    });

    it('keeps a bare less-than sign followed by a space as text', function () {
      assert.equal(inline('3 < 4 and 5 > 2'), '3 < 4 and 5 > 2');
    });

    it('keeps a bare ampersand as text', function () {
      assert.equal(inline('Tom & Jerry'), 'Tom & Jerry');
    });

    it('keeps apostrophes and quotes as text', function () {
      assert.equal(inline(`It's a "test"`), `It's a "test"`);
    });

    it('removes self-closing and void tags', function () {
      assert.equal(inline('line one<br/>line two<img src="a.png">end'), 'line one line two end');
    });

    it('removes tags with attributes containing angle brackets and quotes', function () {
      assert.equal(inline(`<a title="a > b" data-x='y'>text</a>`), 'text');
    });

    it('removes HTML comments', function () {
      assert.equal(inline('Hello <!-- secret --> world'), 'Hello world');
    });

    it('removes script and style content', function () {
      assert.equal(
        inline('<style>p{color:red}</style>Hello<script>alert(1)</script> world'),
        'Hello world',
      );
    });

    it('removes unclosed tags', function () {
      assert.equal(inline('<p>Hello <b>world'), 'Hello world');
    });

    it('accepts a SafeString', function () {
      assert.equal(inline(new SafeString('<b>Hello</b> world')), 'Hello world');
    });

    it('returns a plain string rather than a SafeString', function () {
      assert.equal(typeof inline('<b>Hello</b>'), 'string');
    });

    it('returns an empty string for an empty string', function () {
      assert.equal(inline(''), '');
    });

    it('returns an empty string for markup with no text', function () {
      assert.equal(inline('<p><br></p>'), '');
    });

    it('returns an empty string for undefined', function () {
      assert.equal(inline(undefined), '');
    });

    it('returns an empty string for null', function () {
      assert.equal(inline(null), '');
    });

    it('returns an empty string for an object', function () {
      assert.equal(inline({ foo: 'bar' }), '');
    });

    it('converts a number to a string', function () {
      assert.equal(inline(42), '42');
    });
  });

  describe('async helpers inside the block form', function () {
    let loggingErrorStub: SinonStub;

    beforeEach(function () {
      loggingErrorStub = sinon.stub(logging, 'error');
    });

    afterEach(function () {
      loggingErrorStub.restore();
    });

    it('returns an empty string and logs an error when the block contains an async placeholder', function () {
      const options = { hash: {}, fn: () => '<p>Before</p> __aSyNcId__<_abcdefgh__ after' };
      const result = strip_tags.call({}, options);

      assert.equal(result.toString(), '');
      sinon.assert.calledOnce(loggingErrorStub);
      sinon.assert.calledWith(loggingErrorStub, sinon.match.instanceOf(errors.IncorrectUsageError));
    });

    it('does not output escaped markup when an async helper is rendered inside the block', async function () {
      const render = handlebarsService.hbs.express4({
        partialsDir: [configUtils.config.get('paths').helperTemplates],
      });
      const restoreHelpers = snapshotHelpers(['strip_tags', 'strip_tags_test_async']);
      handlebars.registerHelper('strip_tags', strip_tags);
      registerAsyncThemeHelper('strip_tags_test_async', async function () {
        return new SafeString('<p>Hello</p>');
      });

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strip-tags-'));
      const file = path.join(dir, 'index.hbs');
      fs.writeFileSync(file, '[{{#strip_tags}}{{strip_tags_test_async "x"}}{{/strip_tags}}]');

      try {
        const html = await promisify(render)(file, {
          settings: { views: dir },
          layout: false,
          cache: false,
        });

        assert.equal(html, '[]');
        sinon.assert.calledOnce(loggingErrorStub);
      } finally {
        restoreHelpers();
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe('inline template usage', function () {
    let restoreHelpers: () => void;

    beforeAll(function () {
      restoreHelpers = snapshotHelpers(['strip_tags', 'content', 'match']);
      handlebars.registerHelper('strip_tags', strip_tags);
      registerHelper('content');
      registerHelper('match');
    });

    afterAll(function () {
      restoreHelpers();
    });

    it('strips tags from a context field', function () {
      shouldCompileToExpected(
        '{{strip_tags caption}}',
        { caption: 'A <a href="/x">link</a> and <em>emphasis</em>' },
        'A link and emphasis',
      );
    });

    it('escapes the result for HTML output', function () {
      shouldCompileToExpected(
        '{{strip_tags caption}}',
        { caption: 'Fish &amp; Chips <b>&lt;3</b>' },
        'Fish &amp; Chips &lt;3',
      );
    });

    it('escapes quotes so the result is safe inside an attribute', function () {
      shouldCompileToExpected(
        '<img alt="{{strip_tags caption}}">',
        { caption: `<b>It's</b> "quoted"` },
        '<img alt="It&#x27;s &quot;quoted&quot;">',
      );
    });

    it('outputs raw text with triple-stash', function () {
      shouldCompileToExpected(
        '{{{strip_tags caption}}}',
        { caption: 'Fish &amp; Chips <b>&lt;3</b>' },
        'Fish & Chips <3',
      );
    });

    it('renders an empty string for a missing field', function () {
      shouldCompileToExpected('[{{strip_tags missing}}]', {}, '[]');
    });

    it('works as a subexpression', function () {
      shouldCompileToExpected(
        '{{#if (strip_tags caption)}}yes{{else}}no{{/if}}',
        { caption: '<p><br></p>' },
        'no',
      );
    });

    it('is truthy as a subexpression when text remains', function () {
      shouldCompileToExpected(
        '{{#if (strip_tags caption)}}yes{{else}}no{{/if}}',
        { caption: '<p><b>Hello</b></p>' },
        'yes',
      );
    });

    it('can be compared with the match helper', function () {
      shouldCompileToExpected(
        '{{#match (strip_tags caption) "Fish & Chips"}}match{{else}}no match{{/match}}',
        { caption: '<b>Fish</b> &amp; <i>Chips</i>' },
        'match',
      );
    });
  });

  describe('block template usage', function () {
    let restoreHelpers: () => void;

    beforeAll(function () {
      restoreHelpers = snapshotHelpers(['strip_tags', 'content']);
      handlebars.registerHelper('strip_tags', strip_tags);
      registerHelper('content');
    });

    afterAll(function () {
      restoreHelpers();
    });

    it('strips tags from the rendered block content', function () {
      shouldCompileToExpected(
        '{{#strip_tags}}<p>Hello <b>world</b></p>{{/strip_tags}}',
        {},
        'Hello world',
      );
    });

    it('strips tags from helper output that returns a SafeString', function () {
      shouldCompileToExpected(
        '{{#strip_tags}}{{content}}{{/strip_tags}}',
        { html: '<p>First &amp; <a href="/">second</a></p><p>third</p>' },
        'First &amp; second third',
      );
    });

    it('strips tags from content truncated by words', function () {
      shouldCompileToExpected(
        '{{#strip_tags}}{{content words="10"}}{{/strip_tags}}',
        {
          html:
            '<p>The <a href="/quick">quick</a> <strong>brown</strong> fox jumps over the lazy dog</p>' +
            '<p>and then <em>keeps</em> running &amp; running until the sun sets.</p>',
        },
        'The quick brown fox jumps over the lazy dog and',
      );
    });

    it('strips tags from a triple-stashed field', function () {
      shouldCompileToExpected(
        '{{#strip_tags}}{{{caption}}}{{/strip_tags}}',
        { caption: '<span>hello</span>there' },
        'hello there',
      );
    });

    it('escapes the result for HTML output', function () {
      shouldCompileToExpected(
        '{{#strip_tags}}<b>Tom &amp; Jerry</b>{{/strip_tags}}',
        {},
        'Tom &amp; Jerry',
      );
    });

    it('renders an empty string for an empty block', function () {
      shouldCompileToExpected('[{{#strip_tags}}{{/strip_tags}}]', {}, '[]');
    });

    it('ignores an argument when used as a block', function () {
      shouldCompileToExpected(
        '{{#strip_tags caption}}<i>block</i>{{/strip_tags}}',
        { caption: '<b>arg</b>' },
        'block',
      );
    });
  });
});
