const sinon = require('sinon');
const assert = require('assert/strict');

// DI requirements
const models = require('../../../../../core/server/models');
const mail = require('../../../../../core/server/services/mail');

// Mocked utilities
const urlUtils = require('../../../../utils/urlUtils');
const {mockManager} = require('../../../../utils/e2e-framework');
const {EmailAddressService} = require('@tryghost/email-addresses');
const NewslettersService = require('../../../../../core/server/services/newsletters/NewslettersService');

class TestTokenProvider {
    async create(data) {
        return JSON.stringify(data);
    }

    async validate(token) {
        return JSON.parse(token);
    }
}

describe('NewslettersService', function () {
    let newsletterService, getStub, tokenProvider;
    /** @type {NewslettersService.ILimitService} */
    let limitService;
    let emailMockReceiver;

    before(function () {
        models.init();

        tokenProvider = new TestTokenProvider();

        limitService = {
            async errorIfWouldGoOverLimit() {}
        };

        newsletterService = new NewslettersService({
            NewsletterModel: models.Newsletter,
            MemberModel: models.Member,
            mail,
            singleUseTokenProvider: tokenProvider,
            urlUtils: urlUtils.stubUrlUtilsFromConfig(),
            limitService,
            emailAddressService: {
                service: new EmailAddressService({
                    getManagedEmailEnabled: () => {
                        return false;
                    },
                    getSendingDomain: () => {
                        return null;
                    },
                    getDefaultEmail: () => {
                        return {
                            address: 'default@example.com'
                        };
                    },
                    isValidEmailAddress: () => {
                        return true;
                    },
                    labs: {
                        isSet() {
                            return false;
                        }
                    }
                })
            }
        });
    });

    beforeEach(function () {
        getStub = sinon.stub();
        getStub.withArgs('id').returns('test');
        sinon.spy(tokenProvider, 'create');
        sinon.spy(tokenProvider, 'validate');
        emailMockReceiver = mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    describe('read', function () {
        let findOneStub;
        beforeEach(function () {
            // Stub edit as a function that returns its first argument
            findOneStub = sinon.stub(models.Newsletter, 'findOne').returns({get: getStub, id: 'test'});
        });

        it('returns the result of findOne', async function () {
            const result = await newsletterService.read({slug: 'my-slug'});
            sinon.assert.calledOnceWithExactly(findOneStub, {slug: 'my-slug'}, {});
            assert.equal(result.id, 'test');
        });

        it('throws a not found error if not found', async function () {
            findOneStub = findOneStub.returns(null);
            await assert.rejects(newsletterService.read({slug: 'my-slug'}), {errorType: 'NotFoundError'});
            sinon.assert.calledOnceWithExactly(findOneStub, {slug: 'my-slug'}, {});
        });
    });

    // @TODO replace this with a specific function for fetching all available newsletters
    describe('browse', function () {
        it('lists all newsletters by calling findPage', async function () {
            const findAllStub = sinon.stub(models.Newsletter, 'findPage').returns({data: []});

            await newsletterService.browse({});

            sinon.assert.calledOnce(findAllStub);
        });
    });

    describe('add', function () {
        let addStub, fetchMembersStub, fakeMemberIds, subscribeStub, getNextAvailableSortOrderStub, findOneStub;
        beforeEach(function () {
            fakeMemberIds = new Array(3).fill({id: 1});
            subscribeStub = sinon.stub().returns(fakeMemberIds);

            // Stub add as a function that returns get & subscribeMembersById methods
            addStub = sinon.stub(models.Newsletter, 'add').returns({get: getStub, id: 'test', subscribeMembersById: subscribeStub});
            fetchMembersStub = sinon.stub(models.Member, 'fetchAllSubscribed').returns([]);
            getNextAvailableSortOrderStub = sinon.stub(models.Newsletter, 'getNextAvailableSortOrder').returns(1);
            findOneStub = sinon.stub(models.Newsletter, 'findOne').returns({get: getStub, id: 'test', subscribeMembersById: subscribeStub});
        });

        it('rejects if the limit services determines it would be over the limit', async function () {
            const error = new Error('No way, Jose!');
            sinon.stub(limitService, 'errorIfWouldGoOverLimit').rejects(error);

            let thrownError;
            try {
                await newsletterService.add({
                    name: 'Newsletter Name'
                });
            } catch (err) {
                thrownError = err;
            }
            assert(thrownError, 'It should have thrown an error');
            assert(thrownError === error, 'It should have rethrown the error from limit service');
        });

        it('rejects if called with no data', async function () {
            await assert.rejects(newsletterService.add(), {name: 'TypeError'});
            sinon.assert.notCalled(addStub);
            sinon.assert.notCalled(getNextAvailableSortOrderStub);
            sinon.assert.notCalled(fetchMembersStub);
            sinon.assert.notCalled(findOneStub);
        });

        it('will attempt to add empty object without verification', async function () {
            const result = await newsletterService.add({});

            assert.equal(result.meta, undefined); // meta property has not been added
            sinon.assert.calledOnce(getNextAvailableSortOrderStub);
            sinon.assert.notCalled(fetchMembersStub);
            sinon.assert.calledOnceWithExactly(addStub, {sort_order: 1}, {});
            sinon.assert.calledOnceWithExactly(findOneStub, {id: 'test'}, {require: true});
        });

        it('will override sort_order', async function () {
            const data = {name: 'hello world', sort_order: 0};
            const options = {foo: 'bar'};

            await newsletterService.add(data, options);

            sinon.assert.calledOnce(getNextAvailableSortOrderStub);
            sinon.assert.notCalled(fetchMembersStub);
            sinon.assert.calledOnceWithExactly(addStub, {name: 'hello world', sort_order: 1}, options);
            sinon.assert.calledOnceWithExactly(findOneStub, {id: 'test'}, {foo: 'bar', require: true});
        });

        it('will pass object and options through to model when there are no fields needing verification', async function () {
            const data = {name: 'hello world', sort_order: 1};
            const options = {foo: 'bar'};

            const result = await newsletterService.add(data, options);

            assert.equal(result.meta, undefined); // meta property has not been added
            sinon.assert.calledOnceWithExactly(addStub, data, options);
            sinon.assert.notCalled(fetchMembersStub);
            sinon.assert.calledOnceWithExactly(findOneStub, {id: 'test'}, {foo: 'bar', require: true});
        });

        it('will try to find existing members when opt_in_existing is provided', async function () {
            const data = {name: 'hello world'};
            const options = {opt_in_existing: true};

            const result = await newsletterService.add(data, options);

            assert.deepEqual(result.meta, {
                opted_in_member_count: 0
            });

            sinon.assert.calledOnceWithExactly(addStub, {name: 'hello world', sort_order: 1}, options);
            emailMockReceiver.assertSentEmailCount(0);
            sinon.assert.calledOnce(fetchMembersStub);
            sinon.assert.calledOnceWithExactly(findOneStub, {id: 'test'}, {opt_in_existing: true, transacting: options.transacting, require: true});
        });

        it('will try to subscribe existing members when opt_in_existing provided + members exist', async function () {
            const data = {name: 'hello world'};
            const options = {opt_in_existing: true, transacting: 'foo'};

            fetchMembersStub.returns(fakeMemberIds);

            const result = await newsletterService.add(data, options);

            assert.deepEqual(result.meta, {
                opted_in_member_count: 3
            });

            sinon.assert.calledOnceWithExactly(addStub, {name: 'hello world', sort_order: 1}, options);
            emailMockReceiver.assertSentEmailCount(0);
            sinon.assert.calledOnceWithExactly(fetchMembersStub, {transacting: 'foo'});
            sinon.assert.calledOnceWithExactly(subscribeStub, fakeMemberIds, options);
        });
    });

    describe('edit', function () {
        let editStub, findOneStub;
        beforeEach(function () {
            // Stub edit as a function that returns its first argument
            editStub = sinon.stub(models.Newsletter, 'edit').returns({get: getStub, id: 'test'});
            findOneStub = sinon.stub(models.Newsletter, 'findOne').returns({get: getStub, id: 'test'});
        });

        it('rejects if called with no data', async function () {
            await assert.rejects(newsletterService.add(), {name: 'TypeError'});
            sinon.assert.notCalled(editStub);
        });

        it('will attempt to add empty object without verification', async function () {
            const result = await newsletterService.edit({}, {id: 'test'});

            assert.equal(result.meta, undefined); // meta property has not been added
            sinon.assert.calledOnceWithExactly(editStub, {}, {id: 'test'});
        });

        it('will pass object and options through to model when there are no fields needing verification', async function () {
            const data = {name: 'hello world'};
            const options = {foo: 'bar', id: 'test'};

            const result = await newsletterService.edit(data, options);

            assert.equal(result.meta, undefined); // meta property has not been added
            sinon.assert.calledOnceWithExactly(editStub, data, options);

            sinon.assert.calledTwice(findOneStub);
            sinon.assert.calledWithExactly(findOneStub.firstCall, {id: 'test'}, {require: true});
            sinon.assert.calledWithExactly(findOneStub.secondCall, {id: 'test'}, {...options, require: true});
        });
    });

    describe('verifyPropertyUpdate', function () {
        let editStub;

        beforeEach(function () {
            editStub = sinon.stub(models.Newsletter, 'edit').returns({get: getStub});
            sinon.assert.notCalled(editStub);
        });

        it('rejects if called with no data', async function () {
            await assert.rejects(newsletterService.verifyPropertyUpdate(), {name: 'SyntaxError'});
        });

        it('Updates model with values from token', async function () {
            const token = JSON.stringify({id: 'abc123', property: 'sender_email', value: 'test@example.com'});

            await newsletterService.verifyPropertyUpdate(token);

            sinon.assert.calledOnceWithExactly(editStub, {sender_email: 'test@example.com'}, {id: 'abc123'});
        });
    });
});
