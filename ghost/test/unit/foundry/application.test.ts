import assert from 'node:assert/strict';
import { createApplication } from '@tryghost/foundry/application';
import type { Logger } from '@tryghost/kernel/logging';

const logger = {} as Logger;
const bus = { subscribe() {}, dispatch() {} };

function define(calls: string[], overrides: object = {}) {
  return createApplication({
    name: 'Example',
    config: () => {
      calls.push('config');
      return { get: (key: string) => (key === 'site:title' ? 'Example' : undefined) };
    },
    logging: (config) => {
      calls.push(`logging for ${config.get('site:title')}`);
      return logger;
    },
    database: () => {
      calls.push('database');
      return undefined;
    },
    events: () => {
      calls.push('events');
      return bus;
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
    assert.deepEqual(calls, [
      'config',
      'logging for Example',
      'database with the logger',
      'events',
    ]);
    assert.deepEqual(application.built(), ['config', 'logging', 'database', 'events']);
    assert.equal(foundation.database?.knex, knex);
    assert.equal(foundation.events, bus);
    assert.equal(application.startFoundation(), foundation);
    assert.equal(calls.length, 4);
  });

  it('has no database when the application configures none', function () {
    assert.equal(define([]).startFoundation().database, undefined);
  });

  it('does not keep a failed build, so the next read tries again', function () {
    let attempts = 0;
    const application = define([], {
      config: () => {
        attempts += 1;
        if (attempts === 1) {
          throw new TypeError('not yet');
        }
        return { get: () => undefined };
      },
    });
    assert.throws(() => application.foundation.config, TypeError);
    assert.ok(application.foundation.config);
    assert.equal(attempts, 2);
  });
});
