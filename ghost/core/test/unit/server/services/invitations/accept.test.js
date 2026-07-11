const assert = require('assert/strict');
const sinon = require('sinon');
const accept = require('../../../../../core/server/services/invitations/accept');
const models = require('../../../../../core/server/models');

describe('Unit: services/invitations/accept', function () {
    let transactionStub;
    let findOneInviteStub;
    let findOneUserStub;
    let destroyStub;
    let addUserStub;

    beforeEach(function () {
        destroyStub = sinon.stub().resolves();

        findOneInviteStub = sinon.stub().resolves({
            get: sinon.stub().callsFake((key) => {
                if (key === 'expires') {
                    return Date.now() + 100000;
                }
                if (key === 'role_id') {
                    return 'role-id-123';
                }
            }),
            destroy: destroyStub
        });

        findOneUserStub = sinon.stub().resolves(null);
        addUserStub = sinon.stub().resolves();

        transactionStub = sinon.stub().callsFake(async (cb) => {
            return cb('fake-txn');
        });

        sinon.stub(models.Base, 'transaction').callsFake(transactionStub);
        sinon.stub(models.Invite, 'findOne').callsFake(findOneInviteStub);
        sinon.stub(models.User, 'findOne').callsFake(findOneUserStub);
        sinon.stub(models.User, 'add').callsFake(addUserStub);
    });

    afterEach(function () {
        sinon.restore();
    });

    it('runs inside a transaction', async function () {
        await accept({
            invitation: [{
                token: Buffer.from('test-token').toString('base64'),
                email: 'new@example.com',
                name: 'Test User',
                password: 'password123'
            }]
        });

        sinon.assert.calledOnce(transactionStub);
    });

    it('passes transacting option to all model calls', async function () {
        await accept({
            invitation: [{
                token: Buffer.from('test-token').toString('base64'),
                email: 'new@example.com',
                name: 'Test User',
                password: 'password123'
            }]
        });

        const inviteOptions = findOneInviteStub.firstCall.args[1];
        assert.equal(inviteOptions.transacting, 'fake-txn');

        const userFindOptions = findOneUserStub.firstCall.args[1];
        assert.equal(userFindOptions.transacting, 'fake-txn');

        const userAddOptions = addUserStub.firstCall.args[1];
        assert.equal(userAddOptions.transacting, 'fake-txn');
    });

    it('destroys invite before creating user', async function () {
        const callOrder = [];
        destroyStub.callsFake(async () => {
            callOrder.push('destroy');
        });
        addUserStub.callsFake(async () => {
            callOrder.push('addUser');
        });

        await accept({
            invitation: [{
                token: Buffer.from('test-token').toString('base64'),
                email: 'new@example.com',
                name: 'Test User',
                password: 'password123'
            }]
        });

        assert.deepEqual(callOrder, ['destroy', 'addUser']);
    });
});
