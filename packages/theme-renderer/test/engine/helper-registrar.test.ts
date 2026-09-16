/* eslint-disable @typescript-eslint/no-explicit-any */
// The HelperRegistrar adapter: Ghost's helper registration machinery
// (registry → asyncHelperWrapper) wired into the TemplateEngine's
// express-hbs-ported async placeholder mechanism.
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'vitest';
import errors from '@tryghost/errors';
import {
  TemplateEngine,
  createEngineHelperRegistrar,
  type TemplateResolver,
} from '../../src/index.ts';
import { createHelperRegistry } from '../../src/helpers/services/registry.ts';
import { registerGhostHelpers } from '../../src/helpers/services/register-ghost-helpers.ts';
import { hbs, setHandlebarsInstance } from '../../src/seam/handlebars-env.ts';
import { registerCoreHelperPartials } from '../../src/helpers/tpl/partials.ts';
import { configureTestDeps, teardownTestDeps } from '../utils/renderer-test-utils.ts';

function createResolver(files: Record<string, string>): TemplateResolver {
  return {
    resolve: (name) => files[name],
    list: () => Object.keys(files),
  };
}

afterEach(function () {
  teardownTestDeps();
});

describe('createEngineHelperRegistrar', function () {
  it('registers sync helpers through the registry', async function () {
    configureTestDeps();
    const engine = new TemplateEngine(createResolver({ 'index.hbs': '<p>{{shout "hi"}}</p>' }));
    const registry = createHelperRegistry(createEngineHelperRegistrar(engine));

    registry.registerHelper('shout', (value: string) => value.toUpperCase());

    assert.equal(await engine.render('index.hbs'), '<p>HI</p>');
  });

  it('resolves async helpers (fn.async) through the placeholder machinery', async function () {
    configureTestDeps();
    const engine = new TemplateEngine(createResolver({ 'index.hbs': '<head>{{{later}}}</head>' }));
    const registry = createHelperRegistry(createEngineHelperRegistrar(engine));

    const later: any = async function () {
      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });
      return new engine.SafeString('<meta name="x">');
    };
    later.async = true;
    registry.registerHelper('later', later);

    assert.equal(await engine.render('index.hbs'), '<head><meta name="x"></head>');
  });

  it('dispatches block-style async helpers with (context, options)', async function () {
    configureTestDeps();
    const engine = new TemplateEngine(
      createResolver({ 'index.hbs': '{{#fetch "posts" limit="2"}}{{count}}{{/fetch}}' }),
    );
    const registry = createHelperRegistry(createEngineHelperRegistrar(engine));

    const fetchHelper: any = async function (this: any, resource: string, options: any) {
      return options.fn({ count: `${resource}:${options.hash.limit}` });
    };
    fetchHelper.async = true;
    registry.registerHelper('fetch', fetchHelper);

    assert.equal(await engine.render('index.hbs'), 'posts:2');
  });

  it('renders a failing async helper as empty output (production behavior)', async function () {
    configureTestDeps();
    const engine = new TemplateEngine(createResolver({ 'index.hbs': 'a{{boom}}b' }));
    const registry = createHelperRegistry(createEngineHelperRegistrar(engine));

    const boom: any = async function () {
      throw new errors.InternalServerError({ message: 'helper exploded' });
    };
    boom.async = true;
    registry.registerHelper('boom', boom);

    assert.equal(await engine.render('index.hbs'), 'ab');
  });

  // finding 3 — the wrapper's own error path (getRendererDeps/logging) can
  // throw when the seam is unconfigured; the callback must still fire so the
  // render completes instead of hanging on an unsettled placeholder promise
  it(
    'completes the render when a helper throws while the seam deps are unconfigured',
    { timeout: 2000 },
    async function () {
      // deliberately NO configureTestDeps() — getRendererDeps() throws
      const engine = new TemplateEngine(createResolver({ 'index.hbs': 'a{{boom}}b' }));
      const registry = createHelperRegistry(createEngineHelperRegistrar(engine));

      const boom: any = async function () {
        throw new errors.InternalServerError({ message: 'helper exploded with no deps' });
      };
      boom.async = true;
      registry.registerHelper('boom', boom);

      assert.equal(await engine.render('index.hbs'), 'ab');
    },
  );

  it('resolves the real {{ghost_head}} through a full engine render', async function () {
    configureTestDeps();
    const engine = new TemplateEngine(
      createResolver({
        'index.hbs': '{{!< default}}<main>ok</main>',
        'default.hbs': '<html><head>{{{ghost_head}}}</head><body>{{{body}}}</body></html>',
      }),
      {
        onCompile(self, source) {
          return self.handlebars.compile(source, { preventIndent: true });
        },
      },
    );

    setHandlebarsInstance(engine.handlebars);
    registerCoreHelperPartials(hbs);
    registerGhostHelpers(createEngineHelperRegistrar(engine));

    const locals = { relativeUrl: '/', context: ['home'], safeVersion: '6.0', member: null };
    const html = await engine.render('index.hbs', { ..._rootData(), _locals: locals, ...locals });

    // The async placeholder must be fully substituted...
    assert.doesNotMatch(html, /__aSyNcId__/);
    // ...with real ghost_head output
    assert.match(html, /<meta name="generator" content="Ghost 6.0">/);
    assert.match(html, /<link rel="canonical" href="http:\/\/localhost:2368\/">/);
    assert.match(html, /<main>ok<\/main>/);
  });
});

function _rootData() {
  return {};
}
