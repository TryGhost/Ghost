const assert = require('assert/strict');
const sinon = require('sinon');
const MagicLink = require('../../../../../../core/server/services/lib/magic-link/MagicLink');
const crypto = require('crypto');

const sandbox = sinon.createSandbox();
const secret = crypto.randomBytes(64);

describe('MagicLink', function () {
    let mockSingleUseTokenProvider;

    function buildOptions(overrides = {}) {
        return {
            tokenProvider: mockSingleUseTokenProvider,
            getSigninURL: sandbox.stub().returns('FAKEURL'),
            getText: sandbox.stub().returns('SOMETEXT'),
            getHTML: sandbox.stub().returns('SOMEHTML'),
            getSubject: sandbox.stub().returns('SOMESUBJECT'),
            transporter: {
                sendMail: sandbox.stub().resolves({messageId: 'test'})
            },
            config: {
                get: sandbox.stub().resolves()
            },
            labsService: {
                isSet: sandbox.stub().returns(false)
            },
            ...overrides
        };
    }

    beforeEach(function () {
        mockSingleUseTokenProvider = {
            create: sandbox.stub().resolves('mock-token'),
            getIdByToken: sandbox.stub().resolves('test-token-id-123'),
            deriveOTC: sandbox.stub().returns('654321')
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('Exports a function', function () {
        assert.equal(typeof MagicLink, 'function');
    });

    describe('#sendMagicLink', function () {
        it('Throws when passed comma separated emails', async function () {
            const service = new MagicLink(buildOptions({tokenProvider: new MagicLink.JWTTokenProvider(secret)}));

            const args = {
                email: 'one@email.com,two@email.com',
                tokenData: {
                    id: '420'
                },
                type: 'blazeit',
                referrer: 'https://whatever.com'
            };

            assert.rejects(service.sendMagicLink(args));
        });

        it('Sends an email to the user with a link generated from getSigninURL(token, type)', async function () {
            const options = buildOptions({tokenProvider: new MagicLink.JWTTokenProvider(secret)});
            const service = new MagicLink(options);

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                },
                type: 'blazeit',
                referrer: 'https://whatever.com'
            };
            const {token} = await service.sendMagicLink(args);

            assert(options.getSigninURL.calledOnce);
            assert(options.getSigninURL.firstCall.calledWithExactly(token, 'blazeit', 'https://whatever.com'));

            assert(options.getText.calledOnce);
            assert(options.getText.firstCall.calledWithExactly('FAKEURL', 'blazeit', 'test@example.com', null));

            assert(options.getHTML.calledOnce);
            assert(options.getHTML.firstCall.calledWithExactly('FAKEURL', 'blazeit', 'test@example.com', null));

            assert(options.getSubject.calledOnce);
            assert(options.getSubject.firstCall.calledWithExactly('blazeit', null));

            assert(options.transporter.sendMail.calledOnce);
            assert.equal(options.transporter.sendMail.firstCall.args[0].to, args.email);
            assert.equal(options.transporter.sendMail.firstCall.args[0].subject, options.getSubject.firstCall.returnValue);
            assert.equal(options.transporter.sendMail.firstCall.args[0].text, options.getText.firstCall.returnValue);
            assert.equal(options.transporter.sendMail.firstCall.args[0].html, options.getHTML.firstCall.returnValue);
        });
    });

    describe('#getDataFromToken', function () {
        it('Returns the user data which from the token that was encoded by #sendMagicLink', async function () {
            const service = new MagicLink(buildOptions({tokenProvider: new MagicLink.JWTTokenProvider(secret)}));

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                }
            };

            const {token} = await service.sendMagicLink(args);
            const data = await service.getDataFromToken(token);

            assert.deepEqual(data.id, args.tokenData.id);
        });
    });

    describe('#sendMagicLink with labsService', function () {
        it('should return tokenId when labsService is provided and flag is enabled', async function () {
            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(true)
            };

            const service = new MagicLink(buildOptions({labsService}));

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                }
            };

            const result = await service.sendMagicLink(args);

            assert.equal(result.tokenId, 'test-token-id-123');
            assert(labsService.isSet.calledWith('membersSigninOTC'));
            assert(mockSingleUseTokenProvider.getIdByToken.calledOnce);
        });

        it('should not return tokenId when labsService flag is disabled', async function () {
            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(false)
            };

            const service = new MagicLink(buildOptions({labsService}));

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                }
            };

            const result = await service.sendMagicLink(args);

            assert.equal(result.tokenId, null);
            assert(labsService.isSet.calledWith('membersSigninOTC'));
            assert(mockSingleUseTokenProvider.getIdByToken.notCalled);
        });

        it('should not return tokenId when labsService is not provided', async function () {
            const service = new MagicLink(buildOptions({labsService: undefined}));

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                }
            };

            // Should not throw any errors
            const result = await service.sendMagicLink(args);

            assert.equal(result.tokenId, null);
            assert(mockSingleUseTokenProvider.getIdByToken.notCalled);
        });

        it('should work when tokenProvider does not have getIdByToken method', async function () {
            // No getIdByToken method
            delete mockSingleUseTokenProvider.getIdByToken;

            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(true)
            };

            const options = buildOptions({labsService});
            const service = new MagicLink(options);

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                }
            };

            const result = await service.sendMagicLink(args);

            assert.equal(result.tokenId, null);
            assert(labsService.isSet.calledWith('membersSigninOTC'));
            assert(options.transporter.sendMail.calledOnce);
        });

        it('should return tokenId as null when getIdByToken resolves to null', async function () {
            mockSingleUseTokenProvider.getIdByToken.resolves(null);

            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(true)
            };

            const service = new MagicLink(buildOptions({labsService}));

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                }
            };

            const result = await service.sendMagicLink(args);

            assert.equal(result.tokenId, null);
            assert(labsService.isSet.calledWith('membersSigninOTC'));
            assert(mockSingleUseTokenProvider.getIdByToken.calledOnce);
        });
    });
});
