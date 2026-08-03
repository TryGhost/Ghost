const sinon = require('sinon');
const assert = require('node:assert/strict');
const ObjectID = require('bson-objectid').default;
const createKnex = require('knex');
const configUtils = require('../../../../utils/config-utils');
const sentry = require('../../../../../core/shared/sentry');

const LinkClickRepository = require('../../../../../core/server/services/link-tracking/link-click-repository');
const LinkClick = require('../../../../../core/server/services/link-tracking/click-event');

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return {promise, resolve, reject};
}

const linkClicks = [
    new LinkClick({
        link_id: ObjectID(),
        member_uuid: 'test-uuid'
    }),
    new LinkClick({
        link_id: ObjectID(),
        member_uuid: 'test-uuid'
    })
];

describe('UNIT: LinkClickRepository class', function () {
    let linkClickRepository;
    let memberStub;
    let memberLinkClickEventModelStub;
    let memberLinkClickEventStub;
    let domainEventsStub;
    let member;
    let event;

    beforeEach(function () {
        member = {
            id: 'member-id',
            get: sinon.stub().returns('last-seen-at')
        };
        event = {};

        memberStub = {
            findOne: sinon.stub().resolves(member)
        };

        memberLinkClickEventModelStub = {
            add: sinon.stub().resolves({id: ObjectID().toHexString()})
        };

        memberLinkClickEventStub = {
            create: sinon.stub().returns(event)
        };

        domainEventsStub = {
            dispatch: sinon.stub()
        };

        linkClickRepository = new LinkClickRepository({
            MemberLinkClickEventModel: memberLinkClickEventModelStub,
            Member: memberStub,
            MemberLinkClickEvent: memberLinkClickEventStub,
            DomainEvents: domainEventsStub
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('save', function () {
        afterEach(function () {
            configUtils.restore();
        });

        it('should save a link click event when member is found', async function () {
            await linkClickRepository.save(linkClicks[0]);

            sinon.assert.calledOnce(memberStub.findOne);
            sinon.assert.calledOnce(memberLinkClickEventModelStub.add);
            sinon.assert.calledOnce(memberLinkClickEventStub.create);
            sinon.assert.calledOnce(domainEventsStub.dispatch);
        });

        it('should not save a link click event when member is not found', async function () {
            memberStub.findOne.resolves(null);
            await linkClickRepository.save(linkClicks[0]);
            sinon.assert.notCalled(memberLinkClickEventModelStub.add);
            sinon.assert.notCalled(memberLinkClickEventStub.create);
            sinon.assert.notCalled(domainEventsStub.dispatch);
        });

        it('should preserve the click timestamp when dispatching the member link click event', async function () {
            const timestamp = new Date('2026-07-29T12:34:56.000Z');
            const linkClick = new LinkClick({
                link_id: linkClicks[0].link_id,
                member_uuid: 'test-uuid',
                timestamp
            });

            await linkClickRepository.save(linkClick);

            assert.equal(memberLinkClickEventStub.create.firstCall.args[1], timestamp);
        });

        it('should use the supplied transaction and return the member ID', async function () {
            const transacting = {executionPromise: Promise.resolve()};

            const memberId = await linkClickRepository.save(linkClicks[0], {transacting});

            assert.equal(memberId, 'member-id');
            sinon.assert.calledOnceWithExactly(memberStub.findOne, {
                uuid: linkClicks[0].member_uuid
            }, {transacting});
            sinon.assert.calledOnceWithExactly(memberLinkClickEventModelStub.add, {
                redirect_id: linkClicks[0].link_id.toHexString(),
                member_id: 'member-id'
            }, {transacting});
        });

        it('should reuse the transaction connection for the member lookup', async function () {
            const database = createKnex({
                client: 'better-sqlite3',
                connection: {
                    filename: ':memory:'
                },
                pool: {
                    min: 1,
                    max: 1
                },
                acquireConnectionTimeout: 100,
                useNullAsDefault: true
            });

            try {
                await database.schema.createTable('members', (table) => {
                    table.text('id').primary();
                    table.text('uuid').notNullable();
                    table.text('last_seen_at');
                });
                await database('members').insert({
                    id: 'member-id',
                    uuid: linkClicks[0].member_uuid,
                    last_seen_at: 'last-seen-at'
                });

                const Member = {
                    async findOne(query, options = {}) {
                        const queryBuilder = options.transacting || database;
                        const row = await queryBuilder('members').where(query).first();
                        return row ? {
                            id: row.id,
                            get: key => row[key]
                        } : null;
                    }
                };
                const repository = new LinkClickRepository({
                    MemberLinkClickEventModel: memberLinkClickEventModelStub,
                    Member,
                    MemberLinkClickEvent: memberLinkClickEventStub,
                    DomainEvents: domainEventsStub
                });

                await database.transaction(async (transacting) => {
                    await repository.save(linkClicks[0], {transacting});
                });
            } finally {
                await database.destroy();
            }
        });

        it('should dispatch a member click event after its transaction commits', async function () {
            const execution = deferred();
            const transacting = {executionPromise: execution.promise};

            await linkClickRepository.save(linkClicks[0], {transacting});

            sinon.assert.notCalled(domainEventsStub.dispatch);

            execution.resolve();
            await execution.promise;

            sinon.assert.calledOnceWithExactly(domainEventsStub.dispatch, event);
        });

        it('should report dispatch failures after its transaction commits', async function () {
            const error = new Error('dispatch failed');
            const execution = deferred();
            const transacting = {executionPromise: execution.promise};
            const captureException = sinon.stub(sentry, 'captureException');
            domainEventsStub.dispatch.throws(error);

            await linkClickRepository.save(linkClicks[0], {transacting});
            execution.resolve();
            await execution.promise;

            sinon.assert.calledOnceWithExactly(captureException, error);
        });

        it('should not dispatch a member click event when its transaction rolls back', async function () {
            const error = new Error('transaction rolled back');
            const execution = deferred();
            const transacting = {executionPromise: execution.promise};

            await linkClickRepository.save(linkClicks[0], {transacting});
            execution.reject(error);
            await assert.rejects(execution.promise, error);

            sinon.assert.notCalled(domainEventsStub.dispatch);
        });

        it('should propagate dispatch failures without a transaction', async function () {
            const error = new Error('dispatch failed');
            domainEventsStub.dispatch.throws(error);

            await assert.rejects(linkClickRepository.save(linkClicks[0]), error);
        });

        it('should not dispatch when saving the click fails', async function () {
            const error = new Error('insert failed');

            memberLinkClickEventModelStub.add.rejects(error);

            await assert.rejects(linkClickRepository.save(linkClicks[0]), error);
            sinon.assert.notCalled(memberLinkClickEventStub.create);
            sinon.assert.notCalled(domainEventsStub.dispatch);
        });

        it('should always call findOne when cacheMemberUuidLinkClick is false', async function () {
            configUtils.set('linkClickTrackingCacheMemberUuid', false);
            await linkClickRepository.save(linkClicks[0]);
            sinon.assert.calledOnce(memberStub.findOne);
            await linkClickRepository.save(linkClicks[1]);
            sinon.assert.calledTwice(memberStub.findOne);
        });

        it('should use memoized findOne when cacheMemberUuidLinkClick is true', async function () {
            configUtils.set('linkClickTrackingCacheMemberUuid', true);
            const transacting = {executionPromise: Promise.resolve()};

            await linkClickRepository.save(linkClicks[0], {transacting});
            await linkClickRepository.save(linkClicks[1], {transacting});

            sinon.assert.calledOnceWithExactly(memberStub.findOne, {
                uuid: linkClicks[0].member_uuid
            }, {transacting});
        });

        it('should retry a memoized member lookup after it fails', async function () {
            configUtils.set('linkClickTrackingCacheMemberUuid', true);
            const error = new Error('member lookup failed');
            memberStub.findOne.onFirstCall().rejects(error);

            await assert.rejects(linkClickRepository.save(linkClicks[0]), error);
            await linkClickRepository.save(linkClicks[1]);

            sinon.assert.calledTwice(memberStub.findOne);
            sinon.assert.calledOnce(memberLinkClickEventModelStub.add);
        });
    });
});
