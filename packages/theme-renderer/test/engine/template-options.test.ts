import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { TemplateEngine, type TemplateResolver } from '../../src/engine/index.ts';

function createResolver(files: Record<string, string>): TemplateResolver {
  return {
    resolve: (name) => files[name],
    list: () => Object.keys(files),
  };
}

describe('TemplateEngine template options', function () {
  it('exposes engine templateOptions data as @-variables (how @site flows in Ghost)', async function () {
    const engine = new TemplateEngine(
      createResolver({
        'index.hbs': '<h1>{{@site.title}}</h1>',
      }),
      { templateOptions: { data: { site: { title: 'My Site' } } } },
    );
    const html = await engine.render('index.hbs', {});
    assert.equal(html, '<h1>My Site</h1>');
  });

  // from express-hbs lib/hbs.js:updateTemplateOptions — Ghost's
  // update-global-template-options middleware swaps these per request
  it('supports updating template options after construction', async function () {
    const engine = new TemplateEngine(
      createResolver({
        'index.hbs': '<h1>{{@site.title}}</h1>',
      }),
    );
    engine.updateTemplateOptions({ data: { site: { title: 'Updated' } } });
    assert.deepEqual(engine.getTemplateOptions(), { data: { site: { title: 'Updated' } } });
    const html = await engine.render('index.hbs', {});
    assert.equal(html, '<h1>Updated</h1>');
  });

  it('keeps template options per engine instance, not module-global', async function () {
    const files = { 'index.hbs': '<h1>{{@site.title}}</h1>' };
    const engineA = new TemplateEngine(createResolver(files), {
      templateOptions: { data: { site: { title: 'A' } } },
    });
    const engineB = new TemplateEngine(createResolver(files), {
      templateOptions: { data: { site: { title: 'B' } } },
    });
    assert.equal(await engineA.render('index.hbs', {}), '<h1>A</h1>');
    assert.equal(await engineB.render('index.hbs', {}), '<h1>B</h1>');
  });

  // from express-hbs lib/hbs.js:renderTemplate — local template options
  // (stored on the locals as _templateOptions) are deep-merged over the
  // engine-wide ones; Ghost stores @member/@custom per request this way
  it('deep-merges local template options from the context over engine options', async function () {
    const engine = new TemplateEngine(
      createResolver({
        'index.hbs': '{{@site.title}}|{{@member.name}}',
      }),
      { templateOptions: { data: { site: { title: 'Site' }, member: { name: 'nobody' } } } },
    );
    const context: Record<string, unknown> = {};
    engine.updateLocalTemplateOptions(context, { data: { member: { name: 'Jonatan' } } });
    const html = await engine.render('index.hbs', context);
    assert.equal(html, 'Site|Jonatan');
  });

  it('reads local template options back with getLocalTemplateOptions', function () {
    const engine = new TemplateEngine(createResolver({}));
    const locals: Record<string, unknown> = {};
    assert.deepEqual(engine.getLocalTemplateOptions(locals), {});
    engine.updateLocalTemplateOptions(locals, { data: { custom: { accent: 'red' } } });
    assert.deepEqual(engine.getLocalTemplateOptions(locals), {
      data: { custom: { accent: 'red' } },
    });
  });

  // from express-hbs lib/hbs.js:renderTemplate — the _templateOptions key
  // is stripped from the clone passed to the template as context
  it('does not leak _templateOptions into the template context', async function () {
    const engine = new TemplateEngine(
      createResolver({
        'index.hbs': '[{{_templateOptions}}]',
      }),
    );
    const context: Record<string, unknown> = {};
    engine.updateLocalTemplateOptions(context, { data: { site: { title: 'x' } } });
    const html = await engine.render('index.hbs', context);
    assert.equal(html, '[]');
  });

  it('does not mutate the engine template options when merging locals', async function () {
    const templateOptions = { data: { site: { title: 'Site' } } };
    const engine = new TemplateEngine(
      createResolver({
        'index.hbs': 'ok!',
      }),
      { templateOptions },
    );
    const context: Record<string, unknown> = {};
    engine.updateLocalTemplateOptions(context, { data: { site: { title: 'Overridden' } } });
    await engine.render('index.hbs', context);
    assert.deepEqual(templateOptions, { data: { site: { title: 'Site' } } });
  });
});
