import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createFoundationFake } from '../../../../core/kernel/testing';
import boot from '../../boot';

// boot.ts is the one file in the domain that reaches outside it. Given a fake
// foundation, it shows what the domain reads from config and that the logger
// it hands on is the one it was given.
describe('network boot', function () {
  afterEach(function () {
    sinon.restore();
  });

  const dependencies = (config: Record<string, unknown>) =>
    boot.dependencies!(createFoundationFake({ config: { env: 'testing', ...config } }));

  it('reads its own slice of config once, when the domain starts', async function () {
    assert.equal((await dependencies({})).refreshesEnabled, true);
    assert.equal(
      (await dependencies({ services: { recommendations: { enabled: true } } })).refreshesEnabled,
      true,
    );
    assert.equal(
      (await dependencies({ services: { recommendations: { enabled: false } } })).refreshesEnabled,
      false,
    );
  });

  it('fails the start when its slice of config is not an object', async function () {
    assert.throws(
      () => dependencies({ services: { recommendations: 'off' } }),
      (error: { message: string; code: string }) =>
        error.message === 'The services:recommendations config is not valid.' &&
        error.code === 'CONFIG_SLICE_INVALID',
    );
  });

  it('hands on the logger and the environment it was given', async function () {
    const foundation = createFoundationFake({ config: { env: 'development' } });
    const supplied = await boot.dependencies!(foundation);
    assert.equal(supplied.logging, foundation.logging);
    assert.equal(supplied.environment, 'development');
  });
});
