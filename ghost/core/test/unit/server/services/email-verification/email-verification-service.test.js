const sinon = require('sinon');
const assert = require('node:assert/strict');

const EmailVerificationService = require('../../../../../core/server/services/email-verification/email-verification-service');

class TestTokenProvider {
    constructor() {
        this.tokens = new Map();
    }

    async create(data) {
        const token = 'test-token-' + Math.random();
        this.tokens.set(token, data);
        return token;
    }

    async validate(token) {
        const data = this.tokens.get(token);
        if (!data) {
            throw new Error('Invalid token');
        }
        return data;
    }
}

describe('EmailVerificationService', function () {
    let service, sandbox, tokenProvider;
    let VerifiedEmailModel, NewsletterModel, SettingsModel, AutomatedEmailModel;
    let mockMailer;

    beforeEach(function () {
        sandbox = sinon.createSandbox();
        tokenProvider = new TestTokenProvider();

        VerifiedEmailModel = {
            findOne: sandbox.stub(),
            findAll: sandbox.stub(),
            add: sandbox.stub(),
            edit: sandbox.stub(),
            destroy: sandbox.stub()
        };

        NewsletterModel = {
            findAll: sandbox.stub(),
            edit: sandbox.stub()
        };

        SettingsModel = {
            findOne: sandbox.stub(),
            edit: sandbox.stub()
        };

        AutomatedEmailModel = {
            findAll: sandbox.stub(),
            edit: sandbox.stub()
        };

        mockMailer = {
            send: sandbox.stub().resolves()
        };

        service = new EmailVerificationService({
            VerifiedEmailModel,
            NewsletterModel,
            SettingsModel,
            AutomatedEmailModel,
            mail: {
                GhostMailer: function () {
                    return mockMailer;
                }
            },
            singleUseTokenProvider: tokenProvider,
            urlUtils: {
                urlFor: sandbox.stub().returns('http://localhost:2368/ghost/')
            },
            emailAddressService: {
                service: {
                    defaultFromAddress: 'noreply@example.com'
                }
            }
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('list', function () {
        it('returns all verified emails', async function () {
            const mockResult = {
                models: [
                    {get: key => ({id: '1', email: 'a@example.com', status: 'verified'})[key]},
                    {get: key => ({id: '2', email: 'b@example.com', status: 'pending'})[key]}
                ]
            };
            VerifiedEmailModel.findAll.resolves(mockResult);

            const result = await service.list();

            sinon.assert.calledOnce(VerifiedEmailModel.findAll);
            assert.equal(result, mockResult);
        });
    });

    describe('check', function () {
        it('returns true for a verified email', async function () {
            VerifiedEmailModel.findOne.resolves({
                get: key => ({id: '1', email: 'test@example.com', status: 'verified'})[key]
            });

            const result = await service.check('test@example.com');

            sinon.assert.calledOnceWithExactly(VerifiedEmailModel.findOne, {email: 'test@example.com', status: 'verified'});
            assert.equal(result, true);
        });

        it('returns false for a pending email', async function () {
            VerifiedEmailModel.findOne.resolves(null);

            const result = await service.check('pending@example.com');

            sinon.assert.calledOnceWithExactly(VerifiedEmailModel.findOne, {email: 'pending@example.com', status: 'verified'});
            assert.equal(result, false);
        });

        it('returns false for an unknown email', async function () {
            VerifiedEmailModel.findOne.resolves(null);

            const result = await service.check('unknown@example.com');

            sinon.assert.calledOnceWithExactly(VerifiedEmailModel.findOne, {email: 'unknown@example.com', status: 'verified'});
            assert.equal(result, false);
        });
    });

    describe('add', function () {
        it('returns existing model for an already verified email', async function () {
            const existingModel = {
                get: key => ({id: '1', email: 'verified@example.com', status: 'verified'})[key]
            };
            VerifiedEmailModel.findOne.resolves(existingModel);

            const result = await service.add('verified@example.com');

            assert.equal(result, existingModel);
            sinon.assert.notCalled(VerifiedEmailModel.add);
            sinon.assert.notCalled(mockMailer.send);
        });

        it('sends verification email for a new email', async function () {
            const newModel = {
                get: key => ({id: '2', email: 'new@example.com', status: 'pending'})[key]
            };
            VerifiedEmailModel.findOne.resolves(null);
            VerifiedEmailModel.add.resolves(newModel);

            const result = await service.add('new@example.com');

            assert.equal(result, newModel);
            sinon.assert.calledOnceWithExactly(VerifiedEmailModel.add, {email: 'new@example.com', status: 'pending'});
            sinon.assert.calledOnce(mockMailer.send);
        });

        it('resends verification email for a pending email', async function () {
            const pendingModel = {
                get: key => ({id: '1', email: 'pending@example.com', status: 'pending'})[key]
            };
            VerifiedEmailModel.findOne.resolves(pendingModel);

            const result = await service.add('pending@example.com');

            assert.equal(result, pendingModel);
            sinon.assert.notCalled(VerifiedEmailModel.add);
            sinon.assert.calledOnce(mockMailer.send);
        });
    });

    describe('verify', function () {
        it('marks email as verified and returns model with context', async function () {
            const saveStub = sandbox.stub().resolves();
            const verifiedEmailObj = {
                get: key => ({id: 've-1', email: 'test@example.com', status: 'pending'})[key],
                save: saveStub
            };

            const token = await tokenProvider.create({email: 'test@example.com'});

            VerifiedEmailModel.findOne.resolves(verifiedEmailObj);

            const result = await service.verify(token);

            assert.equal(result.verifiedEmail, verifiedEmailObj);
            assert.equal(result.context, undefined);
            sinon.assert.calledOnceWithExactly(saveStub, {status: 'verified'}, {patch: true});
        });

        it('applies context to newsletter when provided', async function () {
            const saveStub = sandbox.stub().resolves();
            const verifiedEmailObj = {
                get: key => ({id: 've-1', email: 'test@example.com', status: 'pending'})[key],
                save: saveStub
            };

            const context = {type: 'newsletter', id: 'nl-1', property: 'sender_email'};
            const token = await tokenProvider.create({email: 'test@example.com', context});

            VerifiedEmailModel.findOne.resolves(verifiedEmailObj);
            NewsletterModel.edit.resolves();

            const result = await service.verify(token);

            assert.equal(result.verifiedEmail, verifiedEmailObj);
            assert.deepEqual(result.context, context);
            sinon.assert.calledOnceWithExactly(saveStub, {status: 'verified'}, {patch: true});
            sinon.assert.calledOnceWithExactly(NewsletterModel.edit, {
                sender_email: 'test@example.com',
                sender_email_verified_email_id: 've-1'
            }, {id: 'nl-1'});
        });

        it('applies context to setting when provided', async function () {
            const saveStub = sandbox.stub().resolves();
            const verifiedEmailObj = {
                get: key => ({id: 've-1', email: 'support@example.com', status: 'pending'})[key],
                save: saveStub
            };

            const context = {type: 'setting', key: 'members_support_address'};
            const token = await tokenProvider.create({email: 'support@example.com', context});

            VerifiedEmailModel.findOne.resolves(verifiedEmailObj);
            SettingsModel.edit.resolves();

            const result = await service.verify(token);

            assert.equal(result.verifiedEmail, verifiedEmailObj);
            assert.deepEqual(result.context, context);
            sinon.assert.calledOnceWithExactly(saveStub, {status: 'verified'}, {patch: true});
            sinon.assert.calledOnceWithExactly(SettingsModel.edit, {key: 'members_support_address', value: 'support@example.com'});
        });

        it('applies context to automated_email when provided', async function () {
            const saveStub = sandbox.stub().resolves();
            const verifiedEmailObj = {
                get: key => ({id: 've-1', email: 'auto@example.com', status: 'pending'})[key],
                save: saveStub
            };

            const context = {type: 'automated_email', id: 'ae-1', property: 'sender_reply_to'};
            const token = await tokenProvider.create({email: 'auto@example.com', context});

            VerifiedEmailModel.findOne.resolves(verifiedEmailObj);
            AutomatedEmailModel.edit.resolves();

            const result = await service.verify(token);

            assert.equal(result.verifiedEmail, verifiedEmailObj);
            assert.deepEqual(result.context, context);
            sinon.assert.calledOnceWithExactly(saveStub, {status: 'verified'}, {patch: true});
            sinon.assert.calledOnceWithExactly(AutomatedEmailModel.edit, {
                sender_reply_to: 'auto@example.com',
                sender_reply_to_verified_email_id: 've-1'
            }, {id: 'ae-1'});
        });

        it('throws NotFoundError if email not in verified_emails', async function () {
            const token = await tokenProvider.create({email: 'missing@example.com'});

            VerifiedEmailModel.findOne.resolves(null);

            await assert.rejects(service.verify(token), {
                errorType: 'NotFoundError'
            });
        });
    });

    describe('destroy', function () {
        it('deletes verified email when not in use', async function () {
            const verifiedEmailObj = {
                get: key => ({id: 've-1', email: 'test@example.com', status: 'verified'})[key]
            };

            VerifiedEmailModel.findOne.resolves(verifiedEmailObj);
            VerifiedEmailModel.destroy.resolves();

            // No usages: newsletters, automated_emails, and settings all return empty
            NewsletterModel.findAll.resolves({models: []});
            AutomatedEmailModel.findAll.resolves({models: []});
            SettingsModel.findOne.resolves(null);

            await service.destroy('ve-1');

            sinon.assert.calledOnceWithExactly(VerifiedEmailModel.destroy, {id: 've-1'});
        });

        it('throws ValidationError when email is in use by a newsletter', async function () {
            const verifiedEmailObj = {
                get: key => ({id: 've-1', email: 'test@example.com', status: 'verified'})[key]
            };

            VerifiedEmailModel.findOne.resolves(verifiedEmailObj);

            // First call for sender_email FK column returns a match
            NewsletterModel.findAll.onFirstCall().resolves({
                models: [{
                    get: key => ({name: 'Weekly Newsletter'})[key]
                }]
            });
            // Second call for sender_reply_to FK column returns empty
            NewsletterModel.findAll.onSecondCall().resolves({models: []});

            AutomatedEmailModel.findAll.resolves({models: []});
            SettingsModel.findOne.resolves(null);

            await assert.rejects(service.destroy('ve-1'), {
                errorType: 'ValidationError'
            });

            sinon.assert.notCalled(VerifiedEmailModel.destroy);
        });

        it('throws ValidationError when email is in use by a setting', async function () {
            const verifiedEmailObj = {
                get: key => ({id: 've-1', email: 'test@example.com', status: 'verified'})[key]
            };

            VerifiedEmailModel.findOne.withArgs({id: 've-1'}).resolves(verifiedEmailObj);

            NewsletterModel.findAll.resolves({models: []});
            AutomatedEmailModel.findAll.resolves({models: []});

            // Settings findOne is called for members_support_address
            SettingsModel.findOne.resolves({
                get: key => ({value: 'test@example.com'})[key]
            });

            await assert.rejects(service.destroy('ve-1'), {
                errorType: 'ValidationError'
            });

            sinon.assert.notCalled(VerifiedEmailModel.destroy);
        });

        it('throws NotFoundError when verified email does not exist', async function () {
            VerifiedEmailModel.findOne.resolves(null);

            await assert.rejects(service.destroy('nonexistent-id'), {
                errorType: 'NotFoundError'
            });

            sinon.assert.notCalled(VerifiedEmailModel.destroy);
        });
    });
});
