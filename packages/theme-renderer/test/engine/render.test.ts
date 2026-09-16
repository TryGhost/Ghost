import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import { describe, it } from 'vitest';
import { TemplateEngine, type TemplateResolver } from '../../src/engine/index.ts';

function createResolver(files: Record<string, string>): TemplateResolver {
  return {
    resolve: (name) => files[name],
    list: () => Object.keys(files),
  };
}

describe('TemplateEngine#render', function () {
  it('renders a template from the resolver with a context', async function () {
    const engine = new TemplateEngine(
      createResolver({
        'index.hbs': '<h1>{{title}}</h1>',
      }),
    );
    const html = await engine.render('index.hbs', { title: 'Home' });
    assert.equal(html, '<h1>Home</h1>');
  });

  it('renders with registered sync helpers', async function () {
    const engine = new TemplateEngine(
      createResolver({
        'index.hbs': '{{shout title}}!',
      }),
    );
    engine.registerHelper('shout', function (value: string) {
      return String(value).toUpperCase();
    });
    const html = await engine.render('index.hbs', { title: 'hello' });
    assert.equal(html, 'HELLO!');
  });

  it('rejects with a helpful error when the template is missing', async function () {
    const engine = new TemplateEngine(createResolver({}));
    await assert.rejects(engine.render('nope.hbs', {}), /nope\.hbs/);
  });

  // from express-hbs lib/hbs.js:renderTemplate — errors thrown during
  // template execution get the template's __filename prefixed in brackets
  it('prefixes render errors with the template filename', async function () {
    const engine = new TemplateEngine(
      createResolver({
        'index.hbs': '{{boom}}',
      }),
    );
    engine.registerHelper('boom', function () {
      throw new errors.InternalServerError({ message: 'kaboom' });
    });
    await assert.rejects(engine.render('index.hbs', {}), /\[index\.hbs\] kaboom/);
  });

  it('wraps string throws from helpers in an Error with the filename prefix', async function () {
    const engine = new TemplateEngine(
      createResolver({
        'index.hbs': '{{boom}}',
      }),
    );
    engine.registerHelper('boom', function () {
      throw 'kaboom-string';
    });
    await assert.rejects(engine.render('index.hbs', {}), /\[index\.hbs\] kaboom-string/);
  });

  it('rethrows non-Error non-string throws from helpers unchanged', async function () {
    const engine = new TemplateEngine(
      createResolver({
        'index.hbs': '{{boom}}!',
      }),
    );
    const weird = { code: 42 };
    engine.registerHelper('boom', function () {
      throw weird;
    });
    await assert.rejects(engine.render('index.hbs', {}), (err: unknown) => err === weird);
  });

  it('caches compiled templates by default (source changes are not picked up)', async function () {
    const files: Record<string, string> = { 'index.hbs': 'one' };
    const engine = new TemplateEngine(createResolver(files));
    assert.equal(await engine.render('index.hbs', {}), 'one');
    files['index.hbs'] = 'two';
    assert.equal(await engine.render('index.hbs', {}), 'one');
  });

  it('recompiles on every render when cache is disabled', async function () {
    const files: Record<string, string> = { 'index.hbs': 'one' };
    const engine = new TemplateEngine(createResolver(files), { cache: false });
    assert.equal(await engine.render('index.hbs', {}), 'one');
    files['index.hbs'] = 'two';
    assert.equal(await engine.render('index.hbs', {}), 'two');
  });

  it('flushes cached templates with resetCache()', async function () {
    const files: Record<string, string> = { 'index.hbs': 'one' };
    const engine = new TemplateEngine(createResolver(files));
    assert.equal(await engine.render('index.hbs', {}), 'one');
    files['index.hbs'] = 'two';
    engine.resetCache();
    assert.equal(await engine.render('index.hbs', {}), 'two');
  });
});
