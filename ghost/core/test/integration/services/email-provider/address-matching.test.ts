import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import sinon from 'sinon';
import { sendSingleEmail } from '../../../../core/server/services/email-provider';
const EmailEventProcessor = require('../../../../core/server/services/email-service/email-event-processor');
const { Suppression } = require('../../../../core/server/models');
const db = require('../../../../core/server/data/db');

for (const client of ['mysql2', 'better-sqlite3']) {
  describe(`webhook recipient matching (${client})`, () => {
    let knex: Knex;
    let processor: InstanceType<typeof EmailEventProcessor>;
    let storage: { handleComplained: sinon.SinonStub };

    beforeAll(async () => {
      if (client === 'mysql2') {
        await require('../../../utils').setup('default')();
      }
      knex =
        client === 'mysql2'
          ? db.knex
          : createKnex({
              client,
              connection: { filename: ':memory:' },
              useNullAsDefault: true,
            });
      // Minimal tables isolate address lookup from unrelated newsletter fixtures.
      await knex.schema.createTable('webhook_address_recipients', (table) => {
        table.string('id').primary();
        table.string('member_id');
        table.string('email_id').index();
        table.string('member_email').index();
      });
      await knex.schema.createTable('webhook_address_suppressions', (table) => {
        table.string('id').primary();
        table.string('email').index();
      });
    });

    beforeEach(async () => {
      await knex('webhook_address_recipients').delete();
      await knex('webhook_address_suppressions').delete();
      storage = { handleComplained: sinon.stub().resolves() };
      processor = new EmailEventProcessor({
        eventSource: 'webhook',
        db: { knex: () => knex('webhook_address_recipients') },
        eventStorage: storage,
        domainEvents: { dispatch: sinon.stub() },
      });
      sinon
        .stub(Suppression, 'getFilteredCollectionQuery')
        .callsFake(() => knex('webhook_address_suppressions'));
    });

    afterEach(() => sinon.restore());
    afterAll(async () => {
      await knex.schema.dropTable('webhook_address_recipients');
      await knex.schema.dropTable('webhook_address_suppressions');
      if (client !== 'mysql2') {
        await knex.destroy();
      }
    });

    const pairs = [
      ['Reader@EXAMPLE.COM', 'reader@example.com'],
      ['JOSÉ@example.com', 'josé@example.com'],
      ['reader@MÜLLER.DE', 'READER@xn--mller-kva.de'],
      ['reader@xn--mller-kva.de', 'READER@müller.de'],
      ['Kate@example.com', 'kate@example.com'],
    ];
    for (const [stored, received] of pairs) {
      it(`matches ${stored} to ${received} and preserves the original safety address`, async () => {
        await knex('webhook_address_recipients').insert({
          id: 'recipient',
          member_id: 'member',
          email_id: 'newsletter',
          member_email: stored,
        });
        await knex('webhook_address_suppressions').insert({ id: 'suppression', email: stored });
        const identification = { emailId: 'newsletter', email: received };
        const direct = await processor.getRecipient(identification);
        const cache = await processor.batchGetRecipients([identification]);
        const cached = await processor.getRecipient(identification, cache);
        assert.deepEqual(cached, direct);
        assert.equal(cache.size, 1);
        assert.equal(cached.email, stored);
        await processor.handleComplained(identification, new Date(), cache);
        assert.equal(storage.handleComplained.firstCall.firstArg.email, stored);
        const sendSingle = sinon.stub().resolves({ id: 'sent' });
        await assert.rejects(
          sendSingleEmail(
            {
              getEventSource: () => ({ type: 'webhook', verify: async () => ({ events: [] }) }),
              sendSingle,
            },
            {
              family: 'automations',
              to: received,
              from: 'site@example.com',
              subject: 'Subject',
              html: '',
              text: '',
            },
          ),
          { code: 'EMAIL_SUPPRESSED' },
        );
        sinon.assert.notCalled(sendSingle);
      });
    }

    it('does not confuse different accented addresses or recipients of another newsletter', async () => {
      await knex('webhook_address_recipients').insert([
        {
          id: 'accented',
          member_id: 'wrong-member',
          email_id: 'newsletter',
          member_email: 'josé@example.com',
        },
        {
          id: 'other',
          member_id: 'other-member',
          email_id: 'other-newsletter',
          member_email: 'jose@example.com',
        },
      ]);
      await knex('webhook_address_suppressions').insert({
        id: 'suppression',
        email: 'josé@example.com',
      });
      const identification = { emailId: 'newsletter', email: 'jose@example.com' };
      assert.equal(await processor.getRecipient(identification), undefined);
      assert.equal((await processor.batchGetRecipients([identification])).size, 0);
      const sendSingle = sinon.stub().resolves({ id: 'sent' });
      assert.deepEqual(
        await sendSingleEmail(
          {
            getEventSource: () => ({ type: 'webhook', verify: async () => ({ events: [] }) }),
            sendSingle,
          },
          {
            family: 'gifts',
            to: 'jose@example.com',
            from: 'site@example.com',
            subject: 'Subject',
            html: '',
            text: '',
          },
        ),
        { id: 'sent' },
      );
      sinon.assert.calledOnce(sendSingle);
    });

    it('does not choose between ambiguous recipient records', async () => {
      await knex('webhook_address_recipients').insert([
        {
          id: 'first',
          member_id: 'member-a',
          email_id: 'newsletter',
          member_email: 'Reader@example.com',
        },
        {
          id: 'second',
          member_id: 'member-b',
          email_id: 'newsletter',
          member_email: 'reader@example.com',
        },
      ]);
      const identification = { emailId: 'newsletter', email: 'READER@example.com' };
      assert.equal(await processor.getRecipient(identification), undefined);
      const cache = await processor.batchGetRecipients([identification]);
      assert.equal(await processor.getRecipient(identification, cache), undefined);
    });
  });
}
