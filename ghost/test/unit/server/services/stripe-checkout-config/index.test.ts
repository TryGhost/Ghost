import assert from 'node:assert/strict';
import sinon from 'sinon';
import type StripeCheckoutConfigRoot from '../../../../../core/server/services/stripe-checkout-config';
import { openServices } from '../../../../utils/services';

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

  /** A fresh root, built over the custom fields services the test chooses. */
  function loadRoot(services: {
    bindings?: unknown;
    fields?: unknown;
  }): typeof StripeCheckoutConfigRoot {
    require(metafieldsPath);
    const metafields = require.cache[metafieldsPath];
    assert.ok(metafields);
    sandbox.replace(metafields, 'exports', services);
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

  it('acquires the database only on first use, and keeps the same services afterwards', function () {
    const root = loadRoot({ bindings: {}, fields: {} });
    openServices();
    sinon.assert.notCalled(readKnex);

    const services = root.service;
    sinon.assert.calledOnce(readKnex);

    assert.equal(root.service, services);
    sinon.assert.calledOnce(readKnex);
  });

  it('refuses to build before the custom fields services are set up, and builds once they are', function () {
    // Both names exist from the start, so that the root sees what is set on them later.
    const metafields: { bindings?: unknown; fields?: unknown } = {
      bindings: undefined,
      fields: undefined,
    };
    const root = loadRoot(metafields);
    openServices();

    assert.throws(
      () => root.service,
      (error: Error) =>
        error instanceof IncorrectUsageError &&
        error.message ===
          'The custom fields services must be set up before the Stripe Checkout config.',
    );

    metafields.bindings = {};
    metafields.fields = {};

    assert.ok(root.service.config);
  });
});
