import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import type { SpanDocument } from '../../../core/server/lib/tracing/create-tracer';

const supertest = require('supertest');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const configUtils = require('../../utils/config-utils');
const models = require('../../../core/server/models');
// Required rather than imported, so the test shares the module instances Ghost boots with.
const { mockManager } = require('../../utils/e2e-framework');

interface MockedMetrics {
  tracked: (_name: string) => SpanDocument[];
}

describe('Members import and export outcomes', function () {
  let request: { post: (_url: string) => any; get: (_url: string) => any };
  let metrics: MockedMetrics;

  async function defineField(name: string, type: string): Promise<string> {
    const res = await request
      .post(localUtils.API.getApiQuery('members/metafields/custom/'))
      .set('Origin', config.get('url'))
      .send({ members_metafields: [{ name, type }] })
      .expect(201);
    return res.body.members_metafields[0].key;
  }

  async function importCSV(csv: string, status: number): Promise<void> {
    const csvPath = path.join(
      os.tmpdir(),
      `members-import-outcomes-${Date.now()}-${Math.random().toString(16).slice(2)}.csv`,
    );
    fs.writeFileSync(csvPath, csv);
    try {
      await request
        .post(localUtils.API.getApiQuery('members/upload/'))
        .set('Origin', config.get('url'))
        .attach('membersfile', csvPath)
        .expect(status);
    } finally {
      fs.unlinkSync(csvPath);
    }
  }

  beforeAll(async function () {
    await localUtils.startGhost();
    request = supertest.agent(config.get('url'));
    await localUtils.doAuth(request, 'newsletters', 'members:newsletters');
  });

  beforeEach(function () {
    mockManager.mockMail();
    mockManager.mockLabsEnabled('membersCustomFields');
    metrics = mockManager.mockMetrics();
  });

  afterEach(async function () {
    mockManager.restore();
    await configUtils.restore();
    await models.Base.knex('members_metafield_values').del();
    await models.Base.knex('members_metafield_change_events').del();
    await models.Base.knex('members_metafields').del();
    await models.Base.knex('members').where('email', 'like', 'outcome-%').del();
    await models.Base.knex('actions')
      .whereIn('resource_type', ['member', 'member_custom_field'])
      .del();
  });

  describe('Importing', function () {
    const runs = () => metrics.tracked('members.import.run');

    it('records an import run while the request is open, and that its file carries custom fields', async function () {
      const nickname = await defineField('Nickname', 'short_text');
      const address = await defineField('Address', 'address');
      await importCSV(
        [
          `email,metafields.custom.${nickname},metafields.custom.${address}.city`,
          'outcome-1@example.com,Bex,Leeds',
          'outcome-2@example.com,,',
        ].join('\n'),
        201,
      );

      expect(runs()).toMatchObject([
        {
          event: { outcome: 'success' },
          labels: { mode: 'inline', has_custom_fields: true },
          numeric_labels: { rows: 2, imported: 2, rejected: 0 },
        },
      ]);
      // The run stands for the values it wrote, rather than a span per row.
      assert.deepEqual(metrics.tracked('members.metafields.values'), []);
    });

    it('records the rows an import rejected', async function () {
      await importCSV(['email', 'outcome-1@example.com', 'not-an-email'].join('\n'), 201);
      await importCSV(['email', 'not-an-email'].join('\n'), 201);

      expect(runs()).toMatchObject([
        { event: { outcome: 'success' }, numeric_labels: { rows: 2, imported: 1, rejected: 1 } },
        { event: { outcome: 'success' }, numeric_labels: { rows: 1, imported: 0, rejected: 1 } },
      ]);
    });

    it('records an import run in the background once the job has finished it', async function () {
      configUtils.set('members:importer:inlineThreshold', 1);
      await importCSV(['email', 'outcome-1@example.com', 'outcome-2@example.com'].join('\n'), 202);
      await mockManager.assert.sentEmailEventually({ subject: /^Your member import/ });

      expect(runs()).toMatchObject([
        {
          event: { outcome: 'success' },
          labels: { mode: 'background' },
          numeric_labels: { rows: 2, imported: 2, rejected: 0 },
        },
      ]);
    });

    it('records that a file without custom field columns carries none', async function () {
      await defineField('Nickname', 'short_text');
      await importCSV(['email', 'outcome-1@example.com'].join('\n'), 201);

      expect(runs()).toMatchObject([{ labels: { has_custom_fields: false } }]);
    });
  });
});
