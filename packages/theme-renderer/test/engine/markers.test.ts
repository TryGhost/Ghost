// Slice 3 (editor spike): source-location marker injection.
//
// `injectEditMarkers` is a source→source transform run before
// handlebars.compile (via the engine's onCompile hook): it stamps every static
// HTML open tag in a theme source file with
// `data-edit="<file>:<line>:<column>"`, where line/column are the 1-based
// position of the tag's `<` in the ORIGINAL source — the editor's click→source
// seek target. Punted edge cases are documented in docs/markers.md.
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  injectEditMarkers,
  parseEditMarker,
  TemplateEngine,
  type TemplateResolver,
} from '../../src/index.ts';

const FILE = 't.hbs';

describe('injectEditMarkers', function () {
  it('stamps a simple open tag right after the tag name', function () {
    assert.equal(
      injectEditMarkers('<h1 class="site-title">Hi</h1>', FILE),
      '<h1 data-edit="t.hbs:1:1" class="site-title">Hi</h1>',
    );
  });

  it('uses 1-based line and column of the tag’s "<" in the original source', function () {
    const source = [
      '{{!< default}}',
      '<main>',
      '  <a href="{{url}}">{{title}}</a><br>',
      '</main>',
    ].join('\n');
    assert.equal(
      injectEditMarkers(source, 'index.hbs'),
      [
        '{{!< default}}',
        '<main data-edit="index.hbs:2:1">',
        '  <a data-edit="index.hbs:3:3" href="{{url}}">{{title}}</a><br data-edit="index.hbs:3:34">',
        '</main>',
      ].join('\n'),
    );
  });

  it('counts lines across CRLF newlines', function () {
    assert.equal(
      injectEditMarkers('<div>\r\n<p>x</p>', FILE),
      '<div data-edit="t.hbs:1:1">\r\n<p data-edit="t.hbs:2:1">x</p>',
    );
  });

  it('handles block helpers and mustache attributes inside the open tag', function () {
    assert.equal(
      injectEditMarkers(
        '<div {{#if x}}class="a"{{/if}} data-x="{{concat "a" "b"}}">ok</div>',
        FILE,
      ),
      '<div data-edit="t.hbs:1:1" {{#if x}}class="a"{{/if}} data-x="{{concat "a" "b"}}">ok</div>',
    );
  });

  it('handles quoted handlebars arguments inside quoted attribute values (Casper srcset shape)', function () {
    assert.equal(
      injectEditMarkers('<img srcset="{{img_url a size="s"}} 300w">', FILE),
      '<img data-edit="t.hbs:1:1" srcset="{{img_url a size="s"}} 300w">',
    );
  });

  it('leaves closing tags, doctype and HTML comments untouched', function () {
    const source = '<!DOCTYPE html>\n<!-- <div> --></p>';
    assert.equal(injectEditMarkers(source, FILE), source);
  });

  it('skips handlebars comments, including }} inside {{!-- --}}', function () {
    assert.equal(
      injectEditMarkers('{{!-- keep }} going --}}<em>x</em>', FILE),
      '{{!-- keep }} going --}}<em data-edit="t.hbs:1:25">x</em>',
    );
  });

  it('does not touch <script> content but marks the tag itself', function () {
    const source = [
      '<script>',
      'if (1<2) document.write("<b>x</b>");',
      '</script>',
      '<p>after</p>',
    ].join('\n');
    assert.equal(
      injectEditMarkers(source, FILE),
      [
        '<script data-edit="t.hbs:1:1">',
        'if (1<2) document.write("<b>x</b>");',
        '</script>',
        '<p data-edit="t.hbs:4:1">after</p>',
      ].join('\n'),
    );
  });

  it('does not touch <style> content but marks the tag itself', function () {
    assert.equal(
      injectEditMarkers('<style>.a{color:red}</style><i>x</i>', FILE),
      '<style data-edit="t.hbs:1:1">.a{color:red}</style><i data-edit="t.hbs:1:29">x</i>',
    );
  });

  it('treats <title> as raw text (mustaches and stray "<" inside are not marked)', function () {
    assert.equal(
      injectEditMarkers('<title>{{meta_title}} < stuff</title><link rel="x">', FILE),
      '<title data-edit="t.hbs:1:1">{{meta_title}} < stuff</title><link data-edit="t.hbs:1:38" rel="x">',
    );
  });

  it('marks void and self-closing tags', function () {
    assert.equal(
      injectEditMarkers('<img src="x.png" />\n<hr>', FILE),
      '<img data-edit="t.hbs:1:1" src="x.png" />\n<hr data-edit="t.hbs:2:1">',
    );
  });

  it('ignores a literal "<" in text content', function () {
    assert.equal(injectEditMarkers('<p>1 < 2</p>', FILE), '<p data-edit="t.hbs:1:1">1 < 2</p>');
  });

  it('handles ">" inside a quoted attribute value', function () {
    assert.equal(
      injectEditMarkers('<input value="a>b"><s>x</s>', FILE),
      '<input data-edit="t.hbs:1:1" value="a>b"><s data-edit="t.hbs:1:20">x</s>',
    );
  });

  it('never duplicates an existing data-edit attribute', function () {
    const source = '<div data-edit="x">a</div>';
    assert.equal(injectEditMarkers(source, FILE), source);
  });

  it('a bare (valueless) theme-authored data-edit attribute also suppresses the marker', function () {
    const source = '<div data-edit>a</div>';
    assert.equal(injectEditMarkers(source, FILE), source);
  });

  it('a value merely CONTAINING "data-edit=" does not suppress the marker', function () {
    // the existing-marker check is over scanner-yielded attribute NAMES,
    // not a regex across the raw tag region
    assert.equal(
      injectEditMarkers('<div title="see data-edit=docs for details">a</div>', FILE),
      '<div data-edit="t.hbs:1:1" title="see data-edit=docs for details">a</div>',
    );
    assert.equal(
      injectEditMarkers('<a href="/?q=data-edit=1">x</a>', FILE),
      '<a data-edit="t.hbs:1:1" href="/?q=data-edit=1">x</a>',
    );
  });

  it('punts on dynamic tag names', function () {
    const source = '<h{{level}}>x</h{{level}}>';
    assert.equal(injectEditMarkers(source, FILE), source);
  });

  it('punts on raw-block content', function () {
    assert.equal(
      injectEditMarkers('{{{{raw}}}}<div>x</div>{{{{/raw}}}}<b>y</b>', FILE),
      '{{{{raw}}}}<div>x</div>{{{{/raw}}}}<b data-edit="t.hbs:1:36">y</b>',
    );
  });

  it('skips triple-stache output', function () {
    assert.equal(
      injectEditMarkers('{{{html}}}<span>', FILE),
      '{{{html}}}<span data-edit="t.hbs:1:11">',
    );
  });

  it('returns the source unchanged (same reference) when there is nothing to mark', function () {
    const source = '{{title}}\nplain text';
    assert.equal(injectEditMarkers(source, FILE), source);
  });

  // A malformed open tag (the quote/mustache-aware end walk runs away to
  // EOF) must cost only ITS OWN marker: the scanner recovers at the next '<'
  // and keeps marking the rest of the file, and the malformed tag itself is
  // never stamped (a marker inside an unterminated tag is a corrupt marker).
  describe('malformed-tag recovery', function () {
    it('an unbalanced attribute quote unmarks only that tag, not the rest of the file', function () {
      assert.equal(
        injectEditMarkers('<div class="x>\n<p>after</p>', FILE),
        '<div class="x>\n<p data-edit="t.hbs:2:1">after</p>',
      );
    });

    it('a "}}" inside a quoted helper argument cannot swallow the rest of the file', function () {
      // the inner "}}" ends the mustache early, so the walk re-opens a
      // quote that never closes — recover, keep marking what follows
      const source = '<a href="{{url "}}"}}">text</a>\n<p>after</p>';
      assert.equal(
        injectEditMarkers(source, FILE),
        '<a href="{{url "}}"}}">text</a>\n<p data-edit="t.hbs:2:1">after</p>',
      );
    });

    it('an unterminated mustache inside a quoted attribute recovers at the next tag', function () {
      assert.equal(
        injectEditMarkers('<div class="{{broken">x</div>\n<p>after</p>', FILE),
        '<div class="{{broken">x</div>\n<p data-edit="t.hbs:2:1">after</p>',
      );
    });

    it('a truncated tag at EOF gets no marker', function () {
      assert.equal(
        injectEditMarkers('<p>x</p>\n<div class="x', FILE),
        '<p data-edit="t.hbs:1:1">x</p>\n<div class="x',
      );
    });
  });

  it('keeps rawtext close-tag search aligned when the content contains İ (U+0130)', function () {
    // "İ".toLowerCase() is TWO characters (i + combining dot), so a
    // lowercased copy of the source has shifted offsets — the close-tag
    // search must index the ORIGINAL source only
    const source = '<script>var t = "İstanbul";</script><h2>after</h2>';
    assert.equal(
      injectEditMarkers(source, FILE),
      '<script data-edit="t.hbs:1:1">var t = "İstanbul";</script><h2 data-edit="t.hbs:1:37">after</h2>',
    );
  });
});

describe('parseEditMarker', function () {
  it('round-trips a marker value', function () {
    assert.deepEqual(parseEditMarker('partials/post-card.hbs:4:1'), {
      file: 'partials/post-card.hbs',
      line: 4,
      column: 1,
    });
  });

  it('returns null for non-marker values', function () {
    assert.equal(parseEditMarker('nonsense'), null);
    assert.equal(parseEditMarker('file.hbs:x:1'), null);
  });
});

// Engine-level: markers flow through every compile path — templates, layouts
// (recursive {{!< }}), and partials — because they all go through
// TemplateEngine.compile, which threads the resolver filename into onCompile.
describe('TemplateEngine with a marker-injecting onCompile', function () {
  const FILES = {
    'index.hbs': [
      '{{!< default}}',
      '<main>',
      '{{#each posts}}',
      '  {{> "card"}}',
      '{{/each}}',
      '</main>',
    ].join('\n'),
    'default.hbs': [
      '<html>',
      '<head><title>{{@site.title}}</title></head>',
      '<body>',
      '{{{body}}}',
      '</body>',
      '</html>',
    ].join('\n'),
    'partials/card.hbs': '<article class="card">{{title}}</article>',
  };

  function createResolver(files: Record<string, string>): TemplateResolver {
    return {
      resolve: (name) => files[name],
      list: () => Object.keys(files),
    };
  }

  function createEngine(markers: boolean): TemplateEngine {
    return new TemplateEngine(createResolver(FILES), {
      templateOptions: { data: { site: { title: 'Site' } } },
      onCompile(self, source, filename) {
        const compileSource = markers && filename ? injectEditMarkers(source, filename) : source;
        return self.handlebars.compile(compileSource, { preventIndent: true });
      },
    });
  }

  const CONTEXT = { posts: [{ title: 'First' }, { title: 'Second' }] };

  it('marks template, layout and partial output with their own filenames', async function () {
    const html = await createEngine(true).render('index.hbs', { ...CONTEXT });

    assert.match(html, /<html data-edit="default\.hbs:1:1">/);
    assert.match(html, /<title data-edit="default\.hbs:2:7">Site<\/title>/);
    assert.match(html, /<main data-edit="index\.hbs:2:1">/);
    // repeated elements from one source location share one marker
    const cards = html.match(/<article data-edit="partials\/card\.hbs:1:1" class="card">/g);
    assert.equal(cards?.length, 2);
  });

  it('stripping the markers recovers the unmarked engine output byte for byte', async function () {
    const marked = await createEngine(true).render('index.hbs', { ...CONTEXT });
    const plain = await createEngine(false).render('index.hbs', { ...CONTEXT });
    assert.equal(marked.replace(/ data-edit="[^"]*"/g, ''), plain);
  });
});
