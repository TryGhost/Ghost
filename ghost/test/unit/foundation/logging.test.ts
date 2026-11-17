import assert from 'node:assert/strict';
import { createLogger } from '../../../core/foundation/logging';

describe('createLogger', function () {
  it('builds a logger from the options it is given and nothing else', function () {
    const logger = createLogger({ name: 'example', level: 'warn', transports: [] });
    const built = logger as import('@tryghost/logging').GhostLogger;
    assert.equal(built.name, 'example');
    assert.equal(built.level, 'warn');
    assert.deepEqual(built.transports, []);
  });

  it('builds a separate logger each time, and never the process-wide one', function () {
    const first = createLogger({ transports: [] });
    const second = createLogger({ transports: [] });
    assert.notEqual(first, second);
    assert.notEqual(first, require('@tryghost/logging'));
  });
});
