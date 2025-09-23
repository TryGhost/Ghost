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
        it('should not return otcRef when labsService is provided and flag is enabled but includeOTC is not set', async function () {
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

            assert.equal(result.otcRef, null);
            assert(mockSingleUseTokenProvider.getIdByToken.notCalled);
        });

        it('should not return otcRef when labsService flag is disabled', async function () {
            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(false)
            };

            const service = new MagicLink(buildOptions({labsService}));

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                },
                includeOTC: true
            };

            const result = await service.sendMagicLink(args);

            assert.equal(result.otcRef, null);
            assert(mockSingleUseTokenProvider.getIdByToken.notCalled);
        });

        it('should not return otcRef when labsService is not provided', async function () {
            const service = new MagicLink(buildOptions({labsService: undefined}));

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                },
                includeOTC: true
            };

            // Should not throw any errors
            const result = await service.sendMagicLink(args);

            assert.equal(result.otcRef, null);
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
                },
                includeOTC: true
            };

            const result = await service.sendMagicLink(args);

            assert.equal(result.otcRef, null);
            assert(options.transporter.sendMail.calledOnce);
        });

        it('should return otcRef as null when getIdByToken resolves to null', async function () {
            mockSingleUseTokenProvider.getIdByToken.resolves(null);

            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(true)
            };

            const service = new MagicLink(buildOptions({labsService}));

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                },
                includeOTC: true
            };

            const result = await service.sendMagicLink(args);

            assert.equal(result.otcRef, null);
            // deriveOTC is only possible with a token so it's skipped if getIdByToken returns null
            assert(mockSingleUseTokenProvider.deriveOTC.notCalled);
            assert(mockSingleUseTokenProvider.getIdByToken.calledOnce);
        });

        it('should include OTC when includeOTC is true and labs flag is enabled', async function () {
            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(true)
            };

            const options = buildOptions({labsService});
            const service = new MagicLink(options);

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                },
                includeOTC: true
            };

            const result = await service.sendMagicLink(args);

            assert(mockSingleUseTokenProvider.getIdByToken.calledTwice);
            assert(mockSingleUseTokenProvider.deriveOTC.calledOnce);
            assert(mockSingleUseTokenProvider.deriveOTC.calledWith('test-token-id-123', 'mock-token'));
            assert.equal(result.otcRef, 'test-token-id-123');

            // Verify OTC is passed to email content functions
            assert(options.getText.firstCall.calledWithExactly('FAKEURL', 'signin', 'test@example.com', '654321'));
            assert(options.getHTML.firstCall.calledWithExactly('FAKEURL', 'signin', 'test@example.com', '654321'));
            assert(options.getSubject.firstCall.calledWithExactly('signin', '654321'));
        });

        it('should not include OTC when includeOTC is false even if labs flag is enabled', async function () {
            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(true)
            };

            const options = buildOptions({labsService});
            const service = new MagicLink(options);

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                },
                includeOTC: false
            };

            const result = await service.sendMagicLink(args);

            assert(mockSingleUseTokenProvider.getIdByToken.notCalled);
            assert(mockSingleUseTokenProvider.deriveOTC.notCalled);
            assert.equal(result.otcRef, null);

            // Verify OTC is not passed to email content functions
            assert(options.getText.firstCall.calledWithExactly('FAKEURL', 'signin', 'test@example.com', null));
            assert(options.getHTML.firstCall.calledWithExactly('FAKEURL', 'signin', 'test@example.com', null));
            assert(options.getSubject.firstCall.calledWithExactly('signin', null));
        });

        it('should not include OTC when includeOTC is true but labs flag is disabled', async function () {
            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(false)
            };

            const service = new MagicLink(buildOptions({labsService}));

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                },
                includeOTC: true
            };

            const result = await service.sendMagicLink(args);

            assert(mockSingleUseTokenProvider.getIdByToken.notCalled);
            assert(mockSingleUseTokenProvider.deriveOTC.notCalled);
            assert.equal(result.otcRef, null);
        });

        it('should pass OTC to email content functions when OTC is enabled', async function () {
            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(true)
            };

            const options = buildOptions({labsService});
            const service = new MagicLink(options);

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                },
                includeOTC: true
            };

            await service.sendMagicLink(args);

            assert(options.getText.calledOnce);
            assert(options.getText.firstCall.calledWithExactly('FAKEURL', 'signin', 'test@example.com', '654321'));

            assert(options.getHTML.calledOnce);
            assert(options.getHTML.firstCall.calledWithExactly('FAKEURL', 'signin', 'test@example.com', '654321'));

            assert(options.getSubject.calledOnce);
            assert(options.getSubject.firstCall.calledWithExactly('signin', '654321'));
        });

        it('should not include OTC when tokenProvider lacks deriveOTC method', async function () {
            delete mockSingleUseTokenProvider.deriveOTC;

            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(true)
            };

            const options = buildOptions({labsService});
            const service = new MagicLink(options);

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                },
                includeOTC: true
            };

            await service.sendMagicLink(args);

            assert(options.getText.calledOnce);
            assert(options.getText.firstCall.calledWithExactly('FAKEURL', 'signin', 'test@example.com', null));

            assert(options.getHTML.calledOnce);
            assert(options.getHTML.firstCall.calledWithExactly('FAKEURL', 'signin', 'test@example.com', null));

            assert(options.getSubject.calledOnce);
            assert(options.getSubject.firstCall.calledWithExactly('signin', null));
        });
    });

    describe('#getIdFromToken', function () {
        it('should return token ID when tokenProvider has getIdByToken method', async function () {
            const service = new MagicLink(buildOptions());
            const tokenId = await service.getIdFromToken('mock-token');

            assert.equal(tokenId, 'test-token-id-123');
            assert(mockSingleUseTokenProvider.getIdByToken.calledOnce);
            assert(mockSingleUseTokenProvider.getIdByToken.calledWith('mock-token'));
        });

        it('should return null when tokenProvider lacks getIdByToken method', async function () {
            delete mockSingleUseTokenProvider.getIdByToken;
            const service = new MagicLink(buildOptions());
            const tokenId = await service.getIdFromToken('mock-token');

            assert.equal(tokenId, null);
        });
    });

    describe('#getOTCFromToken', function () {
        it('should return OTC when tokenProvider has required methods', async function () {
            const service = new MagicLink(buildOptions());
            const otc = await service.getOTCFromToken('mock-token');

            assert.equal(otc, '654321');
            assert(mockSingleUseTokenProvider.getIdByToken.calledOnce);
            assert(mockSingleUseTokenProvider.deriveOTC.calledOnce);
            assert(mockSingleUseTokenProvider.deriveOTC.calledWith('test-token-id-123', 'mock-token'));
        });

        it('should return null when tokenProvider lacks getIdByToken method', async function () {
            delete mockSingleUseTokenProvider.getIdByToken;
            const service = new MagicLink(buildOptions());
            const otc = await service.getOTCFromToken('mock-token');

            assert.equal(otc, null);
            assert(mockSingleUseTokenProvider.deriveOTC.notCalled);
        });

        it('should return null when tokenProvider lacks deriveOTC method', async function () {
            delete mockSingleUseTokenProvider.deriveOTC;
            const service = new MagicLink(buildOptions());
            const otc = await service.getOTCFromToken('mock-token');

            assert.equal(otc, null);
            assert(mockSingleUseTokenProvider.getIdByToken.calledOnce);
        });

        it('should return null when getIdByToken returns null', async function () {
            mockSingleUseTokenProvider.getIdByToken.resolves(null);
            const service = new MagicLink(buildOptions());
            const otc = await service.getOTCFromToken('mock-token');

            assert.equal(otc, null);
            assert(mockSingleUseTokenProvider.getIdByToken.calledOnce);
            assert(mockSingleUseTokenProvider.deriveOTC.notCalled);
        });
    });
});
