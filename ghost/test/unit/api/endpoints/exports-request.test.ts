import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import nock from 'nock';
import sinon from 'sinon';
import type { Site } from '#support/site';

const endpoint: {
  add: {
    query(
      frame: { data: { components: { content: boolean } }; options: { context: { user: string } } },
      site: Site,
    ): Promise<void>;
  };
} = require('../../../../core/server/api/endpoints/exports');

describe('Export request endpoint', function () {
  const frame = {
    data: { components: { content: true } },
    options: { context: { user: 'owner-id' } },
  };

  function createSite(host: string, secret: string, siteId: string) {
    const values: Record<string, unknown> = {
      'hostSettings:export:webhookUrl': host,
      'hostSettings:export:webhookSecret': secret,
      'hostSettings:siteId': siteId,
    };
    const log = { info: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };
    return {
      config: { get: (key: string) => values[key] },
      log,
      events: { on() {}, removeListener() {} },
    } satisfies Site;
  }

  beforeEach(function () {
    sinon.stub(Date, 'now').returns(1700000000000);
  });

  afterEach(function () {
    sinon.restore();
    nock.cleanAll();
  });

  it('asks the host of the site it is handed, with nothing kept between sites', async function () {
    for (const [origin, secret, siteId] of [
      ['https://first.example', 'first-test-secret', 'first-site'],
      ['https://second.example', 'second-test-secret', 'second-site'],
    ] as const) {
      let body: unknown;
      let signature: unknown;
      const host = nock(origin)
        .post('/export/', (received) => {
          body = received;
          return true;
        })
        .reply(function () {
          signature = this.req.headers['x-ghost-signature'];
          return [202, ''];
        });
      const site = createSite(`${origin}/export/`, secret, siteId);

      await endpoint.add.query(frame, site);

      host.done();
      assert.deepEqual(body, {
        type: 'export',
        siteId,
        components: {
          content: true,
          members: false,
          analytics: false,
          themes: false,
          routes: false,
          media: false,
        },
        requestedByUserId: 'owner-id',
      });
      assert.equal(
        signature,
        crypto
          .createHmac('sha256', secret)
          .update(`1700000000000:${JSON.stringify(body)}`)
          .digest('base64'),
      );
      sinon.assert.calledOnce(site.log.info);
    }
  });

  it("answers with the generic 502 when the host cannot be reached, and logs it on the site's logger", async function () {
    const host = nock('https://export.example')
      .post('/request/')
      .replyWithError('Transport unavailable');
    const site = createSite('https://export.example/request/', 'test-secret', 'site-id');

    await assert.rejects(endpoint.add.query(frame, site), {
      statusCode: 502,
      message: 'Failed to start the export. Please try again later.',
    });

    host.done();
    sinon.assert.calledOnce(site.log.error);
  });
});
