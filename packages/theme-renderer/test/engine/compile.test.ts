import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { TemplateEngine, type TemplateResolver } from '../../src/engine/index.ts';

function createResolver(files: Record<string, string>): TemplateResolver {
  return {
    resolve: (name) => files[name],
    list: () => Object.keys(files),
  };
}

describe('TemplateEngine#compile', function () {
  it('compiles a template that renders with a context', function () {
    const engine = new TemplateEngine(createResolver({}));
    const template = engine.compile('Hello {{name}}!', 'index.hbs');
    assert.equal(template({ name: 'World' }), 'Hello World!');
  });

  it('threads the filename through to the compiled template as __filename', function () {
    const engine = new TemplateEngine(createResolver({}));
    const template = engine.compile('Hi', 'partials/card.hbs');
    assert.equal(template.__filename, 'partials/card.hbs');
  });

  it('leaves __filename undefined when no filename is given', function () {
    const engine = new TemplateEngine(createResolver({}));
    const template = engine.compile('Hi');
    assert.equal(template.__filename, undefined);
  });

  it('calls the onCompile hook with engine, source and filename', function () {
    // Unlike Ghost's current express-hbs usage (which discards it), the
    // filename reaches the hook — this is the future marker injection point.
    const seen: Array<{ source: string; filename?: string }> = [];
    const engine = new TemplateEngine(createResolver({}), {
      onCompile(self, source, filename) {
        seen.push({ source, filename });
        return self.handlebars.compile(source, { preventIndent: true });
      },
    });
    const template = engine.compile('Hello {{name}}!', 'index.hbs');
    assert.equal(template({ name: 'World' }), 'Hello World!');
    assert.deepEqual(seen, [{ source: 'Hello {{name}}!', filename: 'index.hbs' }]);
  });

  it('throws when source is not a string', function () {
    const engine = new TemplateEngine(createResolver({}));
    assert.throws(() => {
      engine.compile(undefined as unknown as string, 'index.hbs');
    }, /must be a string/);
  });

  // QUIRK (from express-hbs lib/hbs.js:compile): the workaround for
  // comment-only partials appends a space whenever the FIRST occurrence of
  // '}}' in the source sits at the very end — so 'Hello {{name}}' renders
  // with a trailing space. Real Ghost output bytes depend on this.
  it('appends a trailing space when the first }} closes the source (express-hbs empty-comment workaround quirk)', function () {
    const engine = new TemplateEngine(createResolver({}));
    const template = engine.compile('Hello {{name}}', 'index.hbs');
    assert.equal(template({ name: 'World' }), 'Hello World ');
  });

  // QUIRK (from express-hbs lib/hbs.js:compile): for a single-character
  // source, indexOf('}}') === source.length - 2 is -1 === -1, so the
  // empty-comment workaround fires and appends a space to ANY one-char
  // template. Preserved for byte parity.
  it('appends a space to a single-character template (express-hbs off-by-quirk)', function () {
    const engine = new TemplateEngine(createResolver({}));
    const template = engine.compile('C', 'index.hbs');
    assert.equal(template({}), 'C ');
  });

  it('does not append a space when an earlier }} exists', function () {
    const engine = new TemplateEngine(createResolver({}));
    const template = engine.compile('{{greeting}} {{name}}', 'index.hbs');
    assert.equal(template({ greeting: 'Hello', name: 'World' }), 'Hello World');
  });

  it('compiles a comment-only template without erroring (renders empty)', function () {
    // Without the appended space handlebars errors on comment-only
    // sources; with it, standalone-comment whitespace stripping still
    // yields '' — matching express-hbs.
    const engine = new TemplateEngine(createResolver({}));
    const template = engine.compile('{{! just a comment}}', 'index.hbs');
    assert.equal(template({}), '');
  });
});
