const should = require('should');
const sinon = require('sinon');
const MailgunEmailSuppressionAdapter = require('../../../../../../core/server/adapters/email-suppression/mailgun');
const EmailSuppressionBase = require('../../../../../../core/server/adapters/email-suppression/EmailSuppressionBase');
const {EmailSuppressionData} = require('../../../../../../core/server/services/email-suppression-list/EmailSuppressionList');

describe('Mailgun Email Suppression Adapter', function () {
    let apiClient;
    let Suppression;
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.createSandbox();

        // Mock API client
        apiClient = {
            removeBounce: sandbox.stub().resolves(),
            removeComplaint: sandbox.stub().resolves(),
            removeUnsubscribe: sandbox.stub().resolves()
        };

        // Mock Suppression model
        Suppression = {
            findOne: sandbox.stub(),
            findAll: sandbox.stub(),
            destroy: sandbox.stub().resolves(),
            add: sandbox.stub().resolves()
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Constructor', function () {
        it('should extend EmailSuppressionBase', function () {
            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient
            });

            should.exist(adapter);
            adapter.should.be.instanceOf(EmailSuppressionBase);
        });

        it('should throw error if apiClient is missing', function () {
            try {
                new MailgunEmailSuppressionAdapter({});
                throw new Error('Should have thrown an error');
            } catch (err) {
                err.message.should.match(/Mailgun suppression adapter requires apiClient/);
            }
        });

        it('should accept optional Suppression model', function () {
            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            should.exist(adapter);
        });
    });

    describe('removeEmail()', function () {
        it('should call all removal methods on API client', async function () {
            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            const email = 'test@example.com';
            const result = await adapter.removeEmail(email);

            result.should.be.true();
            apiClient.removeBounce.calledOnceWith(email).should.be.true();
            apiClient.removeComplaint.calledOnceWith(email).should.be.true();
            apiClient.removeUnsubscribe.calledOnceWith(email).should.be.true();
        });

        it('should remove from database', async function () {
            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            const email = 'test@example.com';
            await adapter.removeEmail(email);

            Suppression.destroy.calledOnce.should.be.true();
            Suppression.destroy.firstCall.args[0].should.deepEqual({
                destroyBy: {
                    email: email
                }
            });
        });

        it('should return false if API client fails', async function () {
            apiClient.removeBounce.rejects(new Error('API Error'));

            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            const result = await adapter.removeEmail('test@example.com');

            result.should.be.false();
        });

        it('should return false if database operation fails', async function () {
            Suppression.destroy.rejects(new Error('Database Error'));

            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            const result = await adapter.removeEmail('test@example.com');

            result.should.be.false();
        });
    });

    describe('removeUnsubscribe()', function () {
        it('should call removeUnsubscribe on API client', async function () {
            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            const email = 'test@example.com';
            const result = await adapter.removeUnsubscribe(email);

            result.should.be.true();
            apiClient.removeUnsubscribe.calledOnceWith(email).should.be.true();
        });

        it('should return false if API client fails', async function () {
            apiClient.removeUnsubscribe.rejects(new Error('API Error'));

            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            const result = await adapter.removeUnsubscribe('test@example.com');

            result.should.be.false();
        });
    });

    describe('getSuppressionData()', function () {
        it('should return not suppressed when email not found', async function () {
            Suppression.findOne.resolves(null);

            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            const result = await adapter.getSuppressionData('test@example.com');

            result.should.be.instanceOf(EmailSuppressionData);
            result.suppressed.should.be.false();
            should.not.exist(result.info);
        });

        it('should return suppressed data when email found', async function () {
            const createdAt = new Date('2025-01-01');
            const mockModel = {
                get: sandbox.stub()
            };
            mockModel.get.withArgs('created_at').returns(createdAt);
            mockModel.get.withArgs('reason').returns('bounce');

            Suppression.findOne.resolves(mockModel);

            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            const result = await adapter.getSuppressionData('test@example.com');

            result.should.be.instanceOf(EmailSuppressionData);
            result.suppressed.should.be.true();
            result.info.timestamp.should.equal(createdAt);
            result.info.reason.should.equal('fail');
        });

        it('should map spam reason correctly', async function () {
            const mockModel = {
                get: sandbox.stub()
            };
            mockModel.get.withArgs('created_at').returns(new Date());
            mockModel.get.withArgs('reason').returns('spam');

            Suppression.findOne.resolves(mockModel);

            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            const result = await adapter.getSuppressionData('test@example.com');

            result.info.reason.should.equal('spam');
        });

        it('should return not suppressed on database error', async function () {
            Suppression.findOne.rejects(new Error('Database Error'));

            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            const result = await adapter.getSuppressionData('test@example.com');

            result.suppressed.should.be.false();
        });
    });

    describe('getBulkSuppressionData()', function () {
        it('should return empty array for empty input', async function () {
            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            const result = await adapter.getBulkSuppressionData([]);

            result.should.deepEqual([]);
        });

        it('should return data for multiple emails', async function () {
            const emails = ['suppressed@example.com', 'not-suppressed@example.com'];

            const mockModel = {
                get: sandbox.stub()
            };
            mockModel.get.withArgs('email').returns('suppressed@example.com');
            mockModel.get.withArgs('created_at').returns(new Date('2025-01-01'));
            mockModel.get.withArgs('reason').returns('spam');

            Suppression.findAll.resolves({
                models: [mockModel]
            });

            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            const results = await adapter.getBulkSuppressionData(emails);

            results.should.have.length(2);
            results[0].suppressed.should.be.true();
            results[0].info.reason.should.equal('spam');
            results[1].suppressed.should.be.false();
        });

        it('should build correct filter query', async function () {
            const emails = ['a@example.com', 'b@example.com'];
            Suppression.findAll.resolves({models: []});

            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            await adapter.getBulkSuppressionData(emails);

            Suppression.findAll.calledOnce.should.be.true();
            const filter = Suppression.findAll.firstCall.args[0].filter;
            filter.should.equal("email:['a@example.com','b@example.com']");
        });

        it('should return all not suppressed on database error', async function () {
            const emails = ['a@example.com', 'b@example.com'];
            Suppression.findAll.rejects(new Error('Database Error'));

            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient,
                Suppression
            });

            const results = await adapter.getBulkSuppressionData(emails);

            results.should.have.length(2);
            results[0].suppressed.should.be.false();
            results[1].suppressed.should.be.false();
        });
    });

    describe('Adapter Contract', function () {
        it('should have required methods', function () {
            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient
            });

            adapter.should.have.property('getSuppressionData');
            adapter.getSuppressionData.should.be.a.Function();

            adapter.should.have.property('getBulkSuppressionData');
            adapter.getBulkSuppressionData.should.be.a.Function();

            adapter.should.have.property('removeEmail');
            adapter.removeEmail.should.be.a.Function();
        });

        it('should have requiredFns array with all methods', function () {
            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient
            });

            adapter.requiredFns.should.be.an.Array();
            adapter.requiredFns.should.containEql('getSuppressionData');
            adapter.requiredFns.should.containEql('getBulkSuppressionData');
            adapter.requiredFns.should.containEql('removeEmail');
        });

        it('should have init method', function () {
            const adapter = new MailgunEmailSuppressionAdapter({
                apiClient
            });

            adapter.should.have.property('init');
            adapter.init.should.be.a.Function();
        });
    });
});
