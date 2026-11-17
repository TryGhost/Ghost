import assert from 'node:assert/strict';
import { z } from 'zod';
import { createApplication } from '@tryghost/foundry/application';
import { createConfig } from '@tryghost/foundry/config';
import type { Logger } from '@tryghost/kernel/logging';

const logger = {} as Logger;

function define(calls: string[], overrides: object = {}) {
  return createApplication({
    name: 'Example',
    config: () => {
      calls.push('config');
      return createConfig(
        { env: 'testing', site: { title: 'Example' } },
        { schema: z.looseObject({}) },
      );
    },
    logging: (config) => {
      calls.push(`logging for ${config.get('site:title')}`);
      return logger;
    },
    ...overrides,
  });
}

describe('createApplication', function () {
  it('builds nothing until something is read', function () {
    const calls: string[] = [];
    const application = define(calls);
    assert.equal(application.name, 'Example');
    assert.deepEqual(calls, []);
    assert.deepEqual(application.built(), []);
  });

  it('builds each instance once, and what it needs first', function () {
    const calls: string[] = [];
    const application = define(calls);
    // Asking for the logger builds config first, because the logger is built from it.
    assert.equal(application.foundation.logging, logger);
    assert.equal(application.foundation.logging, logger);
    assert.equal(application.foundation.config, application.foundation.config);
    assert.deepEqual(calls, ['config', 'logging for Example']);
    assert.deepEqual(application.built(), ['config', 'logging']);
  });

  it('builds the whole foundation in order when boot asks', function () {
    const calls: string[] = [];
    const knex = {} as never;
    const application = define(calls, {
      database: ({ logging }: { logging: Logger }) => {
        calls.push(logging === logger ? 'database with the logger' : 'database');
        return { knex };
      },
    });
    const foundation = application.startFoundation();
    assert.deepEqual(calls, ['config', 'logging for Example', 'database with the logger']);
    assert.deepEqual(application.built(), ['config', 'logging', 'database', 'events']);
    assert.equal(foundation.database?.knex, knex);
    assert.equal(application.startFoundation(), foundation);
    assert.equal(calls.length, 3);
  });

  it('has no database when the application configures none', function () {
    assert.equal(define([]).startFoundation().database, undefined);
  });

  it('builds its own event bus unless the application supplies one', function () {
    const supplied = { subscribe() {}, dispatch() {} };
    assert.equal(define([], { events: () => supplied }).foundation.events, supplied);
    const own = define([]).foundation.events;
    const seen: unknown[] = [];
    class Happened {}
    own.subscribe(Happened, (event) => seen.push(event));
    const event = new Happened();
    own.dispatch(event);
    assert.deepEqual(seen, [event]);
  });

  it('finds no domains, and reads nothing, without a domains folder', async function () {
    const application = define([]);
    assert.deepEqual(application.manifest.files, []);
    await application.domains.start();
    assert.deepEqual(application.built(), []);
  });
});
