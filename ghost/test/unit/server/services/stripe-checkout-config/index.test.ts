import assert from 'node:assert/strict';
import sinon from 'sinon';
import type StripeCheckoutConfigRoot from '../../../../../core/server/services/stripe-checkout-config';

const rootPath = require.resolve('../../../../../core/server/services/stripe-checkout-config');
const metafieldsPath = require.resolve('../../../../../core/server/services/members-metafields');
// Load the real model registry before substituting the root's database connection.
require('../../../../../core/server/models');
const db = require('../../../../../core/server/data/db');
const { IncorrectUsageError } = require('@tryghost/errors');

describe('Stripe Checkout config root', function () {
  const sandbox = sinon.createSandbox();
  let previousRoot: NodeJS.Module | undefined;
  let readKnex: sinon.SinonStub;

  /** A fresh root, built over custom field bindings the test chooses. */
  function loadRoot(bindings: unknown): typeof StripeCheckoutConfigRoot {
    require(metafieldsPath);
    const metafields = require.cache[metafieldsPath];
    assert.ok(metafields);
    sandbox.replace(metafields, 'exports', { bindings });
    return require(rootPath).default;
  }

  beforeEach(function () {
    previousRoot = require.cache[rootPath];
    delete require.cache[rootPath];
    readKnex = sandbox.stub().returns(sandbox.stub());
    sandbox.stub(db, 'knex').get(readKnex);
  });

  afterEach(function () {
    sandbox.restore();
    delete require.cache[rootPath];
    if (previousRoot) {
      require.cache[rootPath] = previousRoot;
    }
  });

  it('acquires the database only at init, and keeps the same services across later inits', async function () {
    const root = loadRoot({});
    assert.throws(() => root.service, IncorrectUsageError);
    sinon.assert.notCalled(readKnex);

    await root.init();
    const services = root.service;
    sinon.assert.calledOnce(readKnex);

    await root.init();
    assert.equal(root.service, services);
  });

  it('refuses to start before the custom fields services are set up', async function () {
    const root = loadRoot(undefined);

    await assert.rejects(root.init(), IncorrectUsageError);
    assert.throws(() => root.service, IncorrectUsageError);
  });
});
