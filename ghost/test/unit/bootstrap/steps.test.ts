import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { Slot } from '@tryghost/foundry/application';
import application from '../../../bootstrap/app';
import { backgroundSteps } from '../../../bootstrap/transition/background-steps';
import { legacySteps } from '../../../bootstrap/transition/legacy-steps';

const ghost = path.resolve(__dirname, '../../..');
const read = (file: string) => readFileSync(path.join(ghost, file), 'utf8');
const names = (slots: readonly Slot<never>[] = []) => slots.map((slot) => slot.name);
const sorted = (values: Iterable<string>) => [...values].sort();

describe("Ghost's start sequence", function () {
  it('puts these entries in each step, in this order', function () {
    const { foundation, database, shared, services, jobs, ready, background } = application.steps;

    assert.deepEqual(
      {
        'foundation.after': names(foundation?.after),
        'database.before': names(database?.before),
        'database.after': names(database?.after),
        'shared.before': names(shared?.before),
        'shared.modules': names(shared?.modules as never),
        'shared.after': names(shared?.after),
        'services.before': names(services?.before),
        'services.modules': names(services?.modules as never),
        'services.after': names(services?.after),
        'jobs.before': names(jobs?.before),
        'jobs.after': names(jobs?.after),
        'ready.before': names(ready?.before),
        'ready.after': names(ready?.after),
        background: names(background),
      },
      {
        'foundation.after': ['unhandled rejections', 'error reporting', 'metrics', 'http server'],
        'database.before': [],
        'database.after': ['query tracing'],
        'shared.before': ['foundation checks'],
        'shared.modules': [
          'legacy: url utils',
          'limits',
          'settings-transition',
          'settings',
          'signing-keys',
          'internal-keys',
          'legacy: i18n',
          'legacy: email address policy',
        ],
        'shared.after': [],
        'services.before': [],
        'services.modules': [
          'better-auth',
          'gift-links',
          'legacy: members metafields',
          'app-installations',
          'export-requests',
          'invites',
          'integrations',
          'stripe-checkout-config',
          'legacy: jobs cleanup',
          'legacy: knex instrumentation',
          'legacy: routing services',
          'link-redirection',
          'custom-theme-settings',
          'legacy: themes',
          'legacy: frontend',
          'legacy: express apps',
          'legacy: dynamic routing',
          'legacy: app service',
          'legacy: jobs service',
          'legacy: services first',
          'member-attribution',
          'audience-feedback',
          'newsletters',
          'mentions',
          'stats',
          'legacy: services',
          'staff',
          'tiers',
          'tags-public',
          'posts-public',
          'indexnow-ping',
          'upgrades',
          'slack-ping',
          'comments',
          'media-inliner',
          'donations',
          'recommendations',
          'explore-ping',
          'users',
          'editor-presence',
          'segments',
          'member-welcome-emails',
        ],
        'services.after': [],
        'jobs.before': [],
        'jobs.after': ['after jobs'],
        'ready.before': [],
        'ready.after': [],
        background: [
          'inactive themes',
          'interrupted email sends',
          'pending gift deliveries',
          'gift cleanup job',
          'gift reminder job',
          'member token cleanup job',
          'expired comp cleanup job',
          'signing key check job',
          'auth cleanup job',
          'email analytics jobs',
          'activitypub',
          'tinybird sync job',
          'update check jobs',
          'remote flags',
          'milestones',
        ],
      },
    );
    assert.equal(database?.run, legacySteps.database);
    assert.equal(jobs?.run, legacySteps.jobs);
    assert.equal(ready?.run, legacySteps.ready);
  });

  it('skips the frontend entries when Ghost boots without a frontend', function () {
    const conditional = (application.steps.services?.modules ?? []).filter(
      (entry) => entry.when && 'run' in entry,
    );
    assert.deepEqual(names(conditional as never), ['legacy: frontend', 'legacy: app service']);
    for (const slot of conditional) {
      assert.equal(slot.when?.({ options: { frontend: false } } as never), false);
      assert.equal(slot.when?.({ options: { frontend: true } } as never), true);
    }
  });

  // A step that boot-steps.ts exports but no list names would never run, and the lint
  // rule that checks services are awaited trusts the export.
  it('lists every legacy step exactly once', function () {
    // Loading the steps loads only debug.
    const exported = Object.keys(require('../../../bootstrap/transition/boot-steps'));
    const wrapped = [
      ...read('bootstrap/transition/legacy-steps.ts').matchAll(/boot\(\)\.(\w+)\(/g),
    ];
    assert.deepEqual(sorted(wrapped.map((match) => match[1]!)), sorted(exported));

    const listed = [
      ...(
        read('bootstrap/app.ts') +
        read('bootstrap/shared.ts') +
        read('bootstrap/services.ts')
      ).matchAll(/legacySteps\.(\w+)/g),
    ];
    assert.deepEqual(sorted(listed.map((match) => match[1]!)), sorted(Object.keys(legacySteps)));
  });

  describe('the background list', function () {
    const list = application.steps.background ?? [];

    it('lists every background step exactly once', function () {
      const listed = [...read('bootstrap/background.ts').matchAll(/backgroundSteps\.(\w+)/g)];
      assert.deepEqual(
        sorted(listed.map((match) => match[1]!)),
        sorted(Object.keys(backgroundSteps)),
      );
    });

    // Tests start Ghost many times in one process, so only loading the
    // inactive themes runs under them.
    describe('in each environment', function () {
      const environment = process.env.NODE_ENV;
      afterEach(function () {
        process.env.NODE_ENV = environment;
      });
      const runs = (env: string) => {
        process.env.NODE_ENV = env;
        const run = { state: {} } as never;
        return list.filter((slot) => slot.when?.(run) !== false).map((slot) => slot.name);
      };

      for (const env of ['testing', 'testing-mysql', 'test']) {
        it(`runs only the inactive themes in ${env}`, function () {
          assert.deepEqual(runs(env), ['inactive themes']);
        });
      }
      for (const env of ['development', 'production']) {
        it(`runs every entry in ${env}`, function () {
          assert.deepEqual(runs(env), names(list));
        });
      }

      it('decides once for each start, when the second entry is reached', function () {
        const run = { state: {} } as never;
        process.env.NODE_ENV = 'production';
        assert.equal(list[1]?.when?.(run), true);
        process.env.NODE_ENV = 'testing';
        assert.equal(list[2]?.when?.(run), true);
        assert.equal(list[2]?.when?.({ state: {} } as never), false);
      });
    });
  });

  describe('the shared list', function () {
    const order = (application.steps.shared?.modules ?? []).map((entry) => entry.name);
    const position = (name: string) =>
      order.findIndex((entry) => entry === name || entry === `legacy: ${name}`);

    // Each pair is a dependency a start reads silently: nothing throws when the order is wrong.
    for (const [first, second, why] of [
      [
        'limits',
        'settings',
        'the publicSiteAccess limit decides whether settings makes the site private',
      ],
      ['settings', 'signing-keys', 'signing keys are read from settings'],
      ['settings', 'i18n', 'i18n reads the locale setting'],
    ] as const) {
      it(`starts ${first} before ${second}: ${why}`, function () {
        assert.ok(position(first) >= 0 && position(second) >= 0);
        assert.ok(position(first) < position(second));
      });
    }

    it('names each entry once', function () {
      assert.deepEqual(sorted(new Set(order)), sorted(order));
    });

    // A shared module is a folder in ghost/shared with a defineService root. The
    // list is the only thing that starts it, so a folder the list does not name
    // would never start, and an entry without a folder would fail at boot.
    describe('and the modules in ghost/shared', function () {
      const source = read('bootstrap/shared.ts');
      const folders = (directory: string) =>
        existsSync(path.join(ghost, directory))
          ? readdirSync(path.join(ghost, directory), { withFileTypes: true })
              .filter((item) => item.isDirectory() && item.name !== 'transition')
              .map((item) => `${directory}/${item.name}`)
          : [];
      const modules = [...folders('shared'), ...folders('shared/transition')];

      it('finds the reshaped modules', function () {
        assert.ok(modules.includes('shared/limits'));
        assert.ok(modules.includes('shared/settings'));
        assert.ok(modules.includes('shared/transition/settings'));
      });

      for (const folder of modules) {
        it(`${folder} has a defineService root that the list names once`, function () {
          assert.ok(existsSync(path.join(ghost, folder, 'index.ts')), `${folder} has no index.ts`);
          assert.match(
            read(`${folder}/index.ts`),
            /^export default defineService[<(]/m,
            `${folder}/index.ts does not default-export a defineService root`,
          );
          assert.equal(
            source.split(`require('../${folder}').default`).length - 1,
            1,
            `${folder} should be loaded by exactly one entry of bootstrap/shared.ts`,
          );
        });
      }

      it('names no shared module that does not exist', function () {
        const named = [...source.matchAll(/require\('\.\.\/(shared\/[^']+)'\)\.default/g)];
        assert.deepEqual(sorted(named.map((match) => match[1]!)), sorted(modules));
      });
    });
  });

  describe('the services list', function () {
    const list = application.steps.services?.modules ?? [];
    const order = list.map((entry) => entry.name);
    const source = read('bootstrap/services.ts');
    const legacy = Object.keys(
      (
        yaml.load(read('core/server/services/legacy-service-inventory.yaml')) as {
          services: object;
        }
      ).services,
    );

    // Each pair is an order core/boot.js or its tests pinned before services started from a list.
    for (const [first, second, why] of [
      ['legacy: members metafields', 'stripe-checkout-config', 'checkout config reads metafields'],
      ['legacy: members metafields', 'tiers', 'tiers reads metafields'],
      ['custom-theme-settings', 'legacy: themes', 'no theme is activated before its settings'],
      ['link-redirection', 'legacy: express apps', 'the site app reads its middleware'],
      ['legacy: themes', 'legacy: express apps', 'the site app reads the offers middleware'],
      ['legacy: express apps', 'legacy: dynamic routing', 'routers mount on the site app'],
      ['legacy: dynamic routing', 'legacy: app service', 'apps load after routing'],
      ['legacy: jobs service', 'legacy: services first', 'services take the job runner'],
      ['legacy: jobs service', 'mentions', 'mentions reads the job runner'],
      ['legacy: services first', 'tiers', 'gifts is built over the tiers root first'],
      ['member-attribution', 'staff', 'staff captures the attribution service'],
      ['member-attribution', 'legacy: services', 'email captures the attribution service'],
      ['audience-feedback', 'legacy: services', 'email captures the feedback link service'],
      ['newsletters', 'legacy: services', 'members captures newsletters'],
      ['mentions', 'legacy: services', 'webhooks listen after mentions'],
      ['mentions', 'recommendations', 'recommendations reads mentions'],
      ['stats', 'explore-ping', 'explore captures the stats aggregate'],
      ['link-redirection', 'legacy: services', 'link tracking reads link redirection'],
      ['legacy: services', 'member-welcome-emails', 'welcome emails capture link tracking'],
      ['legacy: services first', 'member-welcome-emails', 'welcome emails capture email address'],
    ] as const) {
      it(`starts ${first} before ${second}: ${why}`, function () {
        assert.ok(order.includes(first) && order.includes(second));
        assert.ok(order.indexOf(first) < order.indexOf(second));
      });
    }

    it('names each entry once', function () {
      assert.deepEqual(sorted(new Set(order)), sorted(order));
    });

    it('names only standard service roots, and marks every legacy step as one', function () {
      for (const entry of list) {
        if ('run' in entry) {
          assert.match(entry.name, /^legacy: /);
          continue;
        }
        if (entry.name === 'better-auth') {
          // The one root outside server/services.
          continue;
        }
        assert.ok(
          source.includes(`require('../core/server/services/${entry.name}').default`),
          `${entry.name} should load the root its name says`,
        );
        assert.ok(
          existsSync(path.join(ghost, 'core/server/services', entry.name, 'index.ts')),
          `${entry.name} has no index.ts root`,
        );
        assert.ok(
          !legacy.includes(entry.name),
          `${entry.name} is in the legacy service inventory; a legacy service cannot be started from the list`,
        );
      }
    });
  });
});
