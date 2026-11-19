import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Slot } from '@tryghost/foundry/application';
import application from '../../../bootstrap/app';
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
        'shared.modules': [],
        'shared.after': ['legacy shared'],
        'services.before': [
          'legacy core',
          'knex instrumentation',
          'services for frontend',
          'frontend',
          'express apps',
          'dynamic routing',
          'app service',
          'jobs service',
          'legacy services',
        ],
        'services.modules': [],
        'services.after': [],
        'jobs.before': [],
        'jobs.after': ['after jobs'],
        'ready.before': [],
        'ready.after': [],
        background: ['background services'],
      },
    );
    assert.equal(database?.run, legacySteps.database);
    assert.equal(jobs?.run, legacySteps.jobs);
    assert.equal(ready?.run, legacySteps.ready);
  });

  it('skips the frontend entries when Ghost boots without a frontend', function () {
    const conditional = (application.steps.services?.before ?? []).filter((slot) => slot.when);
    assert.deepEqual(names(conditional as never), ['frontend', 'app service']);
    for (const slot of conditional) {
      assert.equal(slot.when?.({ options: { frontend: false } } as never), false);
      assert.equal(slot.when?.({ options: { frontend: true } } as never), true);
    }
  });

  // A step that boot.js exports but no list names would never run, and the lint
  // rule that checks services are awaited trusts the export.
  it('lists every step that boot.js exports exactly once', function () {
    // Loading boot.js loads only its overrides and debug.
    const exported = Object.keys(require('../../../core/boot'));
    const wrapped = [
      ...read('bootstrap/transition/legacy-steps.ts').matchAll(/boot\(\)\.(\w+)\(/g),
    ];
    assert.deepEqual(sorted(wrapped.map((match) => match[1]!)), sorted(exported));

    const listed = [...read('bootstrap/app.ts').matchAll(/legacySteps\.(\w+)/g)];
    assert.deepEqual(sorted(listed.map((match) => match[1]!)), sorted(Object.keys(legacySteps)));
  });
});
