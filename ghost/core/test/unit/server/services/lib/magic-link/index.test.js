const assert = require('node:assert/strict');
const sinon = require('sinon');
const MagicLink = require('../../../../../../core/server/services/lib/magic-link/magic-link');

const sandbox = sinon.createSandbox();

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
            ...overrides
        };
    }

    beforeEach(function () {
        mockSingleUseTokenProvider = {
            create: sandbox.stub().resolves('mock-token'),
            validate: sandbox.stub().resolves({test: 'test-token-data'}),
            getRefByToken: sandbox.stub().resolves('test-token-ref-123'),
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
            const service = new MagicLink(buildOptions());

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
            const options = buildOptions();
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
        it('Returns the user data from tokenProvider.validate', async function () {
            const service = new MagicLink(buildOptions());

            const data = await service.getDataFromToken({});

            assert.deepEqual(data, {test: 'test-token-data'});
        });
    });

    describe('#sendMagicLink with OTC', function () {
        it('should not return otcRef when includeOTC is not set', async function () {
            const service = new MagicLink(buildOptions());

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                }
            };

            const result = await service.sendMagicLink(args);

            assert.equal(result.otcRef, null);
            assert(mockSingleUseTokenProvider.getRefByToken.notCalled);
        });

        it('should work when tokenProvider does not have getRefByToken method', async function () {
            // No getRefByToken method
            delete mockSingleUseTokenProvider.getRefByToken;

            const options = buildOptions();
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

        it('should return otcRef as null when getRefByToken resolves to null', async function () {
            mockSingleUseTokenProvider.getRefByToken.resolves(null);

            const service = new MagicLink(buildOptions());

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                },
                includeOTC: true
            };

            const result = await service.sendMagicLink(args);

            assert.equal(result.otcRef, null);
            // deriveOTC is only possible with a token so it's skipped if getRefByToken returns null
            assert(mockSingleUseTokenProvider.deriveOTC.notCalled);
            assert(mockSingleUseTokenProvider.getRefByToken.calledOnce);
        });

        it('should include OTC when includeOTC is true', async function () {
            const options = buildOptions();
            const service = new MagicLink(options);

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                },
                includeOTC: true
            };

            const result = await service.sendMagicLink(args);

            assert(mockSingleUseTokenProvider.getRefByToken.calledTwice);
            assert(mockSingleUseTokenProvider.deriveOTC.calledOnce);
            assert(mockSingleUseTokenProvider.deriveOTC.calledWith('test-token-ref-123', 'mock-token'));
            assert.equal(result.otcRef, 'test-token-ref-123');

            // Verify OTC is passed to email content functions
            assert(options.getText.firstCall.calledWithExactly('FAKEURL', 'signin', 'test@example.com', '654321'));
            assert(options.getHTML.firstCall.calledWithExactly('FAKEURL', 'signin', 'test@example.com', '654321'));
            assert(options.getSubject.firstCall.calledWithExactly('signin', '654321'));
        });

        it('should not include OTC when includeOTC is false', async function () {
            const options = buildOptions();
            const service = new MagicLink(options);

            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                },
                includeOTC: false
            };

            const result = await service.sendMagicLink(args);

            assert(mockSingleUseTokenProvider.getRefByToken.notCalled);
            assert(mockSingleUseTokenProvider.deriveOTC.notCalled);
            assert.equal(result.otcRef, null);

            // Verify OTC is not passed to email content functions
            assert(options.getText.firstCall.calledWithExactly('FAKEURL', 'signin', 'test@example.com', null));
            assert(options.getHTML.firstCall.calledWithExactly('FAKEURL', 'signin', 'test@example.com', null));
            assert(options.getSubject.firstCall.calledWithExactly('signin', null));
        });

        it('should pass OTC to email content functions when OTC is enabled', async function () {
            const options = buildOptions();
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

            const options = buildOptions();
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

    describe('#getRefFromToken', function () {
        it('should return token ref when tokenProvider has getRefByToken method', async function () {
            const service = new MagicLink(buildOptions());
            const tokenId = await service.getRefFromToken('mock-token');

            assert.equal(tokenId, 'test-token-ref-123');
            assert(mockSingleUseTokenProvider.getRefByToken.calledOnce);
            assert(mockSingleUseTokenProvider.getRefByToken.calledWith('mock-token'));
        });

        it('should return null when tokenProvider lacks getRefByToken method', async function () {
            delete mockSingleUseTokenProvider.getRefByToken;
            const service = new MagicLink(buildOptions());
            const tokenId = await service.getRefFromToken('mock-token');

            assert.equal(tokenId, null);
        });
    });

    describe('#getOTCFromToken', function () {
        it('should return OTC when tokenProvider has required methods', async function () {
            const service = new MagicLink(buildOptions());
            const otc = await service.getOTCFromToken('mock-token');

            assert.equal(otc, '654321');
            assert(mockSingleUseTokenProvider.getRefByToken.calledOnce);
            assert(mockSingleUseTokenProvider.deriveOTC.calledOnce);
            assert(mockSingleUseTokenProvider.deriveOTC.calledWith('test-token-ref-123', 'mock-token'));
        });

        it('should return null when tokenProvider lacks getRefByToken method', async function () {
            delete mockSingleUseTokenProvider.getRefByToken;
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
            assert(mockSingleUseTokenProvider.getRefByToken.calledOnce);
        });

        it('should return null when getRefByToken returns null', async function () {
            mockSingleUseTokenProvider.getRefByToken.resolves(null);
            const service = new MagicLink(buildOptions());
            const otc = await service.getOTCFromToken('mock-token');

            assert.equal(otc, null);
            assert(mockSingleUseTokenProvider.getRefByToken.calledOnce);
            assert(mockSingleUseTokenProvider.deriveOTC.notCalled);
        });
    });
});
