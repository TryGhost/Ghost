import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import sinon from 'sinon';
import { RecentEmailRecipients } from '../../../repositories/recent-email-recipients.repository';

// A query that records how it was built and answers with what it is given.
function query(answer: unknown) {
  const built: Record<string, sinon.SinonStub> = {};
  for (const step of ['sum', 'where', 'distinct', 'join', 'leftJoin', 'whereNull']) {
    built[step] = sinon.stub().returns(built);
  }
  built.first = sinon.stub().resolves(answer);
  built.limit = sinon.stub().resolves(answer);
  const knex = sinon.stub().returns(built);
  return { built, knex, recipients: new RecentEmailRecipients({ knex: knex as unknown as Knex }) };
}

describe('Recent email recipients', function () {
  it('sums the recipients of emails created since a date', async function () {
    const { built, knex, recipients } = query({ count: '1200' });

    assert.equal(await recipients.countSince('2026-01-01 00:00:00'), 1200);

    sinon.assert.calledOnceWithExactly(knex, 'emails');
    sinon.assert.calledOnceWithExactly(built.sum, 'email_count', { as: 'count' });
    sinon.assert.calledOnceWithExactly(built.where, 'created_at', '>', '2026-01-01 00:00:00');
  });

  it('counts none when no email was sent', async function () {
    assert.equal(await query({ count: null }).recipients.countSince('2026-01-01 00:00:00'), 0);
    assert.equal(await query(undefined).recipients.countSince('2026-01-01 00:00:00'), 0);
  });

  it('counts, up to a limit, recipients whose address no longer belongs to a member', async function () {
    const { built, knex, recipients } = query([{ member_email: 'a' }, { member_email: 'b' }]);

    assert.equal(await recipients.countRemovedSince('2026-01-01 00:00:00', 5), 2);

    sinon.assert.calledOnceWithExactly(knex, 'email_recipients as er');
    sinon.assert.calledOnceWithExactly(built.distinct, 'er.member_email');
    sinon.assert.calledOnceWithExactly(built.join, 'emails as e', 'e.id', 'er.email_id');
    sinon.assert.calledOnceWithExactly(
      built.leftJoin,
      'members as m',
      'm.email',
      'er.member_email',
    );
    sinon.assert.calledOnceWithExactly(built.where, 'e.created_at', '>', '2026-01-01 00:00:00');
    sinon.assert.calledOnceWithExactly(built.whereNull, 'm.id');
    sinon.assert.calledOnceWithExactly(built.limit, 5);
  });
});
