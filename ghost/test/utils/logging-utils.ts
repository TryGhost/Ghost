import * as sinon from 'sinon';
import logging from '@tryghost/logging';
import type { GhostLogger } from '@tryghost/logging';

/**
 * A logger to inject into service classes under test. Every method is a sinon
 * stub, so tests can assert on what was logged without stubbing the global
 * `@tryghost/logging` instance; `child()` returns the same fake so bound
 * loggers record into the same stubs.
 */
export function createLoggingFake(): sinon.SinonStubbedInstance<GhostLogger> {
  const fake = sinon.createStubInstance(logging.GhostLogger);
  fake.child.returns(fake);
  return fake;
}
