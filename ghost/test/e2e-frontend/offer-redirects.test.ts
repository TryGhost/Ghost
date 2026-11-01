import assert from 'node:assert/strict';
import ObjectID from 'bson-objectid';
import sinon from 'sinon';
import { afterEach, beforeAll } from 'vitest';

// require, not import: the suite must share the module instances Ghost boots with.
const {
  agentProvider,
  fixtureManager,
  mockManager,
}: typeof import('../utils/e2e-framework') = require('../utils/e2e-framework');
const dbUtils = require('../utils/db-utils');

const ACTIVE_ID = ObjectID().toHexString();
const ARCHIVED_ID = ObjectID().toHexString();

// Characterizes the Offers redirects as a booted site serves them: rows loaded at startup,
// offers created and re-coded through the Admin API, all through the mounted site app.
describe('Offer redirects', function () {
  let adminAgent: any;
  let frontendAgent: any;
  let tierId: string;

  beforeAll(async function () {
    // Boot resets the database first, so seed the offers straight after that reset for the
    // Offers startup load to find them.
    const reset = dbUtils.reset;
    const seed = sinon.stub(dbUtils, 'reset').callsFake(async (...args: unknown[]) => {
      await reset(...args);
      const tier = await dbUtils.knex('products').where({ type: 'paid' }).first();
      const row = {
        product_id: tier.id,
        interval: 'month',
        discount_type: 'percent',
        discount_amount: 10,
        duration: 'once',
        redemption_type: 'signup',
        created_at: new Date(),
      };
      await dbUtils.knex('offers').insert([
        { ...row, id: ACTIVE_ID, name: 'Seeded', code: 'seeded-code', active: true },
        { ...row, id: ARCHIVED_ID, name: 'Archived', code: 'archived-code', active: false },
      ]);
    });
    try {
      ({ adminAgent, frontendAgent } = await agentProvider.getAgentsWithFrontend());
    } finally {
      seed.restore();
    }
    sinon.assert.calledOnce(seed);
    await fixtureManager.init();
    await adminAgent.loginAsOwner();
    tierId = (await dbUtils.knex('products').where({ type: 'paid' }).first()).id;
  });

  afterEach(function () {
    mockManager.restore();
  });

  it('redirects the code of an offer loaded at startup to its Portal offer', async function () {
    await frontendAgent
      .get('/seeded-code/')
      .expect(302)
      .expect('Location', `/#/portal/offers/${ACTIVE_ID}`)
      .expect('Cache-Control', 'public, max-age=0');
  });

  it('keeps the query string when redirecting', async function () {
    await frontendAgent
      .get('/seeded-code/?ref=newsletter')
      .expect(302)
      .expect('Location', `/?ref=newsletter#/portal/offers/${ACTIVE_ID}`);
  });

  it('redirects the code of an archived offer loaded at startup', async function () {
    await frontendAgent
      .get('/archived-code/')
      .expect(302)
      .expect('Location', `/#/portal/offers/${ARCHIVED_ID}`);
  });

  it('does not redirect a code no offer uses', async function () {
    await frontendAgent.get('/no-such-offer/').expect(404);
  });

  it('redirects an offer created through the Admin API, and follows its code change', async function () {
    // Creating an offer also creates its Stripe coupon.
    mockManager.mockStripe();
    const { body } = await adminAgent
      .post('offers/')
      .body({
        offers: [
          {
            name: 'Spring',
            code: 'spring-offer',
            display_title: 'Spring sale',
            display_description: '',
            type: 'percent',
            cadence: 'month',
            amount: 20,
            duration: 'once',
            currency: null,
            status: 'active',
            redemption_type: 'signup',
            tier: { id: tierId },
          },
        ],
      })
      .expectStatus(200);
    const [{ id }] = body.offers;

    await frontendAgent
      .get('/spring-offer/')
      .expect(302)
      .expect('Location', `/#/portal/offers/${id}`);

    await adminAgent
      .put(`offers/${id}/`)
      .body({ offers: [{ code: 'summer-offer' }] })
      .expectStatus(200);

    await frontendAgent.get('/spring-offer/').expect(404);
    const res = await frontendAgent.get('/summer-offer/').expect(302);
    assert.equal(res.headers.location, `/#/portal/offers/${id}`);
  });
});
