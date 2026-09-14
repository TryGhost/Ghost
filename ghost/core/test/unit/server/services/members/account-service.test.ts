import assert from 'node:assert/strict';
import sinon from 'sinon';
import { MemberAccountService } from '../../../../../core/server/services/members/account-service';

describe('Unit - members/account-service', function () {
  describe('edit', function () {
    let members: { get: sinon.SinonStub; update: sinon.SinonStub };
    let newslettersService: { getAll: sinon.SinonStub };
    let service: MemberAccountService;

    const memberWith = (status: string, newsletterIds: string[]) => ({
      get: (key: string) => (key === 'status' ? status : undefined),
      related: () => newsletterIds.map((id) => ({ id })),
    });

    beforeEach(function () {
      members = { get: sinon.stub(), update: sinon.stub().resolves() };
      newslettersService = { getAll: sinon.stub().resolves([{ id: 'paid' }]) };
      service = new MemberAccountService({
        memberBREADService: { read: sinon.stub().resolves({ id: 'member' }) },
        members,
        emailSuppressionList: { removeEmail: sinon.stub() },
        metafieldValues: {
          unwrapWire: sinon.stub(),
          planWrite: sinon.stub(),
          applyWrite: sinon.stub(),
        },
        newslettersService,
      });
    });

    afterEach(function () {
      sinon.restore();
    });

    it('stops a free member adding a paid-only newsletter', async function () {
      members.get.resolves(memberWith('free', []));

      await service.edit({ newsletters: [{ id: 'free' }, { id: 'paid' }] }, 'member');

      assert.deepEqual(members.update.firstCall.args[0].newsletters, [{ id: 'free' }]);
      sinon.assert.calledOnceWithExactly(newslettersService.getAll, {
        filter: 'visibility:-members',
        columns: ['id'],
      });
    });

    it('lets a free member keep a paid-only newsletter they already have', async function () {
      members.get.resolves(memberWith('free', ['paid']));

      await service.edit({ newsletters: [{ id: 'free' }, { id: 'paid' }] }, 'member');

      assert.deepEqual(members.update.firstCall.args[0].newsletters, [
        { id: 'free' },
        { id: 'paid' },
      ]);
    });

    it('lets a paying member add a paid-only newsletter', async function () {
      members.get.resolves(memberWith('paid', []));

      await service.edit({ newsletters: [{ id: 'paid' }] }, 'member');

      assert.deepEqual(members.update.firstCall.args[0].newsletters, [{ id: 'paid' }]);
      sinon.assert.notCalled(newslettersService.getAll);
    });

    it('skips the lookup when newsletters are not being changed', async function () {
      await service.edit({ name: 'New name' }, 'member');

      sinon.assert.notCalled(members.get);
      assert.deepEqual(members.update.firstCall.args[0], { name: 'New name' });
    });
  });
});
