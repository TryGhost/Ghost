import assert from 'node:assert/strict';
import type { Config, Database, EventBus, Logger } from '@tryghost/kernel/foundation';
import { describe, it } from 'vitest';
import { createFoundation, type FoundationParts } from '../src/foundation.ts';

function parts(overrides: Partial<FoundationParts> = {}) {
  const order: string[] = [];
  const config = { get: () => undefined } satisfies Config;
  const logger = {} as Logger;
  const database = {} as Database;
  const events = {} as EventBus;
  const given: FoundationParts = {
    config() {
      order.push('config');
      return config;
    },
    logger() {
      order.push('logger');
      return logger;
    },
    database() {
      order.push('database');
      return database;
    },
    events() {
      order.push('events');
      return events;
    },
    ...overrides,
  };
  return { given, order, config, logger, database, events };
}

describe('createFoundation', function () {
  it('builds nothing until a part is read, and then only that part and what it reads', function () {
    const { given, order, logger } = parts({
      logger(built) {
        order.push('logger');
        void built.config;
        return logger;
      },
    });
    const { order: untouched, given: unread } = parts();

    createFoundation(unread);
    const foundation = createFoundation(given);
    assert.deepEqual(untouched, []);
    assert.deepEqual(order, []);

    assert.equal(foundation.logger, logger);
    assert.deepEqual(order, ['logger', 'config']);
  });

  it('builds each part once', function () {
    const { given, order, config, database, events } = parts();
    const foundation = createFoundation(given);

    assert.equal(foundation.config, config);
    assert.equal(foundation.config, config);
    assert.equal(foundation.database, database);
    assert.equal(foundation.database, database);
    assert.equal(foundation.events, events);

    assert.deepEqual(order, ['config', 'database', 'events']);
  });

  it('hands a part the parts before it', function () {
    const { given, config, logger } = parts({
      database(built) {
        return { config: built.config, logger: built.logger } as unknown as Database;
      },
    });

    assert.deepEqual(createFoundation(given).database, { config, logger });
  });

  it('tries a part that failed to build again on the next read', function () {
    const failure = new Error('No configuration');
    let attempts = 0;
    const { given, config } = parts({
      config() {
        attempts += 1;
        if (attempts === 1) {
          throw failure;
        }
        return config;
      },
    });
    const foundation = createFoundation(given);

    assert.throws(
      () => foundation.config,
      (thrown) => thrown === failure,
    );
    assert.equal(foundation.config, config);
  });

  it('reads the system clock unless the application supplies one', function () {
    const before = Date.now();
    const now = createFoundation(parts().given).clock.now();
    assert.ok(now >= before && now <= Date.now());

    const supplied = createFoundation(parts({ clock: () => ({ now: () => 42 }) }).given);
    assert.equal(supplied.clock.now(), 42);
  });
});
