const sinon = require('sinon');
const assert = require('assert');

// DI requirements
const models = require('../../../../../core/server/models');
const mail = require('../../../../../core/server/services/mail');

// Mocked utilities
const urlUtils = require('../../../../utils/urlUtils');
const {mockManager} = require('../../../../utils/e2e-framework');

const NewslettersService = require('../../../../../core/server/services/newsletters/service');

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
            limitService
        });
    });

    beforeEach(function () {
        getStub = sinon.stub();
        sinon.spy(tokenProvider, 'create');
        sinon.spy(tokenProvider, 'validate');
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    // @TODO replace this with a specific function for fetching all available newsletters
    describe('browse', function () {
        it('lists all newsletters by calling findAll and toJSON', async function () {
            const toJSONStub = sinon.stub();
            const findAllStub = sinon.stub(models.Newsletter, 'findAll').returns({toJSON: toJSONStub});

            await newsletterService.browse({});

            sinon.assert.calledOnce(findAllStub);
            sinon.assert.calledOnce(toJSONStub);
        });
    });

    describe('add', function () {
        let addStub, fetchMembersStub, fakeMemberIds, subscribeStub, getNextAvailableSortOrderStub;
        beforeEach(function () {
            fakeMemberIds = new Array(3).fill({id: 1});
            subscribeStub = sinon.stub().returns(fakeMemberIds);

            // Stub add as a function that returns get & subscribeMembersById methods
            addStub = sinon.stub(models.Newsletter, 'add').returns({get: getStub, subscribeMembersById: subscribeStub});
            fetchMembersStub = sinon.stub(models.Member, 'fetchAllSubscribed').returns([]);
            getNextAvailableSortOrderStub = sinon.stub(models.Newsletter, 'getNextAvailableSortOrder').returns(1);
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
            assert.rejects(await newsletterService.add, {name: 'TypeError'});
            sinon.assert.notCalled(addStub);
            sinon.assert.notCalled(getNextAvailableSortOrderStub);
            sinon.assert.notCalled(fetchMembersStub);
        });

        it('will attempt to add empty object without verification', async function () {
            const result = await newsletterService.add({});

            assert.equal(result.meta, undefined); // meta property has not been added
            sinon.assert.calledOnce(getNextAvailableSortOrderStub);
            sinon.assert.notCalled(fetchMembersStub);
            sinon.assert.calledOnceWithExactly(addStub, {sort_order: 1}, {});
        });

        it('will override sort_order', async function () {
            const data = {name: 'hello world', sort_order: 0};
            const options = {foo: 'bar'};

            await newsletterService.add(data, options);

            sinon.assert.calledOnce(getNextAvailableSortOrderStub);
            sinon.assert.notCalled(fetchMembersStub);
            sinon.assert.calledOnceWithExactly(addStub, {name: 'hello world', sort_order: 1}, options);
        });

        it('will pass object and options through to model when there are no fields needing verification', async function () {
            const data = {name: 'hello world', sort_order: 1};
            const options = {foo: 'bar'};

            const result = await newsletterService.add(data, options);

            assert.equal(result.meta, undefined); // meta property has not been added
            sinon.assert.calledOnceWithExactly(addStub, data, options);
            sinon.assert.notCalled(fetchMembersStub);
        });

        it('will trigger verification when sender_email is provided', async function () {
            const data = {name: 'hello world', sender_email: 'test@example.com'};
            const options = {foo: 'bar'};

            const result = await newsletterService.add(data, options);

            assert.deepEqual(result.meta, {
                sent_email_verification: [
                    'sender_email'
                ]
            });
            sinon.assert.calledOnceWithExactly(addStub, {name: 'hello world', sort_order: 1}, options);
            mockManager.assert.sentEmail({to: 'test@example.com'});
            sinon.assert.calledOnceWithExactly(tokenProvider.create, {id: undefined, property: 'sender_email', value: 'test@example.com'});
            sinon.assert.notCalled(fetchMembersStub);
        });

        it('will try to find existing members when opt_in_existing is provided', async function () {
            const data = {name: 'hello world'};
            const options = {opt_in_existing: true};

            const result = await newsletterService.add(data, options);

            assert.deepEqual(result.meta, {
                opted_in_member_count: 0
            });

            sinon.assert.calledOnceWithExactly(addStub, {name: 'hello world', sort_order: 1}, options);
            mockManager.assert.sentEmailCount(0);
            sinon.assert.calledOnce(fetchMembersStub);
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
            mockManager.assert.sentEmailCount(0);
            sinon.assert.calledOnceWithExactly(fetchMembersStub, {transacting: 'foo'});
            sinon.assert.calledOnceWithExactly(subscribeStub, fakeMemberIds, options);
        });
    });

    describe('edit', function () {
        let editStub, findOneStub;
        beforeEach(function () {
            // Stub edit as a function that returns its first argument
            editStub = sinon.stub(models.Newsletter, 'edit').returns({get: getStub});
            findOneStub = sinon.stub(models.Newsletter, 'findOne').returns({get: getStub});
        });

        it('rejects if called with no data', async function () {
            assert.rejects(await newsletterService.add, {name: 'TypeError'});
            sinon.assert.notCalled(editStub);
        });

        it('will attempt to add empty object without verification', async function () {
            const result = await newsletterService.edit({});

            assert.equal(result.meta, undefined); // meta property has not been added
            sinon.assert.calledOnceWithExactly(editStub, {}, {});
        });

        it('will pass object and options through to model when there are no fields needing verification', async function () {
            const data = {name: 'hello world'};
            const options = {foo: 'bar'};

            const result = await newsletterService.edit(data, options);

            assert.equal(result.meta, undefined); // meta property has not been added
            sinon.assert.calledOnceWithExactly(editStub, data, options);
            sinon.assert.calledOnceWithExactly(findOneStub, options, {require: true});
        });

        it('will trigger verification when sender_email is provided', async function () {
            const data = {name: 'hello world', sender_email: 'test@example.com'};
            const options = {foo: 'bar'};

            const result = await newsletterService.edit(data, options);

            assert.deepEqual(result.meta, {
                sent_email_verification: [
                    'sender_email'
                ]
            });
            sinon.assert.calledOnceWithExactly(editStub, {name: 'hello world'}, options);
            sinon.assert.calledOnceWithExactly(findOneStub, options, {require: true});
            mockManager.assert.sentEmail({to: 'test@example.com'});
            sinon.assert.calledOnceWithExactly(tokenProvider.create, {id: undefined, property: 'sender_email', value: 'test@example.com'});
        });

        it('will NOT trigger verification when sender_email is provided but is already verified', async function () {
            const data = {name: 'hello world', sender_email: 'test@example.com'};
            const options = {foo: 'bar'};

            // The model says this is already verified
            getStub.withArgs('sender_email').returns('test@example.com');

            const result = await newsletterService.edit(data, options);

            assert.deepEqual(result.meta, undefined);
            sinon.assert.calledOnceWithExactly(editStub, {name: 'hello world', sender_email: 'test@example.com'}, options);
            sinon.assert.calledOnceWithExactly(findOneStub, options, {require: true});
            mockManager.assert.sentEmailCount(0);
        });
    });

    describe('verifyPropertyUpdate', function () {
        let editStub;

        beforeEach(function () {
            editStub = sinon.stub(models.Newsletter, 'edit').returns({get: getStub});
            sinon.assert.notCalled(editStub);
        });

        it('rejects if called with no data', async function () {
            assert.rejects(await newsletterService.verifyPropertyUpdate, {name: 'TypeError'});
        });

        it('Updates model with values from token', async function () {
            const token = JSON.stringify({id: 'abc123', property: 'sender_email', value: 'test@example.com'});

            await newsletterService.verifyPropertyUpdate(token);

            sinon.assert.calledOnceWithExactly(editStub, {sender_email: 'test@example.com'}, {id: 'abc123'});
        });
    });
});
