import assert from 'node:assert/strict';

const config = require('../../core/shared/config');
const loggingConfig = require('../../loggingrc.js');

describe('loggingrc', function () {
  // @tryghost/logging require()s this file inside a try/catch and falls back to
  // {} on a throw, so a mutation of read-only config here would silently
  // replace the whole configuration with defaults - in production, the
  // configured transports among them. Nothing would report it.
  it('derives a config without writing into Ghost config', function () {
    assert.notEqual(loggingConfig, config.get('logging'));
    assert.deepEqual(config.get('logging:metadata'), undefined);
    assert.deepEqual(config.get('logging:domain'), undefined);
  });

  it('keeps what was configured', function () {
    assert.equal(loggingConfig.level, config.get('logging:level'));
    assert.deepEqual(loggingConfig.rotation, config.get('logging:rotation'));

    // `transports` is deliberately not compared: vitest runs tests in worker
    // threads, and @tryghost/logging overwrites it with ['parent'] off the main
    // thread. That it can is the point of the next test.
    assert.ok(Array.isArray(loggingConfig.transports));
  });

  it('adds everything the logger needs', function () {
    assert.ok(loggingConfig.path);
    assert.equal(loggingConfig.env, config.get('env'));
    assert.equal(loggingConfig.domain, config.get('url'));
    assert.ok(loggingConfig.metadata.version);
    assert.deepEqual(Object.keys(loggingConfig.metrics.metadata).sort(), [
      'domain',
      'siteId',
      'version',
    ]);
  });

  it('is mutable, because the logger writes transports for worker threads', function () {
    const original = loggingConfig.transports;

    loggingConfig.transports = ['stdout'];
    assert.deepEqual(loggingConfig.transports, ['stdout']);

    loggingConfig.transports = original;
  });
});
