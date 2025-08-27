const assert = require('assert/strict');
const sinon = require('sinon');
const MagicLink = require('../../../../../../core/server/services/lib/magic-link/MagicLink');
const crypto = require('crypto');

const sandbox = sinon.createSandbox();
const secret = crypto.randomBytes(64);

describe('MagicLink', function () {
    it('Exports a function', function () {
        assert.equal(typeof MagicLink, 'function');
    });

    describe('#sendMagicLink', function () {
        it('Throws when passed comma separated emails', async function () {
            const options = {
                tokenProvider: new MagicLink.JWTTokenProvider(secret),
                getSigninURL: sandbox.stub().returns('FAKEURL'),
                getText: sandbox.stub().returns('SOMETEXT'),
                getHTML: sandbox.stub().returns('SOMEHTML'),
                getSubject: sandbox.stub().returns('SOMESUBJECT'),
                transporter: {
                    sendMail: sandbox.stub().resolves()
                },
                config: {
                    get: sandbox.stub().resolves()
                }
            };
            const service = new MagicLink(options);

            const args = {
                email: 'one@email.com,two@email.com',
                tokenData: {
                    id: '420'
                },
                type: 'blazeit',
                referrer: 'https://whatever.com'
            };

            let errored = false;
            try {
                await service.sendMagicLink(args);
            } catch (err) {
                errored = true;
            } finally {
                assert(errored, 'sendMagicLink should error when given comma separated emails');
            }
        });

        it('Sends an email to the user with a link generated from getSigninURL(token, type)', async function () {
            const options = {
                tokenProvider: new MagicLink.JWTTokenProvider(secret),
                getSigninURL: sandbox.stub().returns('FAKEURL'),
                getText: sandbox.stub().returns('SOMETEXT'),
                getHTML: sandbox.stub().returns('SOMEHTML'),
                getSubject: sandbox.stub().returns('SOMESUBJECT'),
                transporter: {
                    sendMail: sandbox.stub().resolves()
                },
                config: {
                    get: sandbox.stub().resolves()
                }
            };
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
            assert(options.getText.firstCall.calledWithExactly('FAKEURL', 'blazeit', 'test@example.com'));

            assert(options.getHTML.calledOnce);
            assert(options.getHTML.firstCall.calledWithExactly('FAKEURL', 'blazeit', 'test@example.com'));

            assert(options.getSubject.calledOnce);
            assert(options.getSubject.firstCall.calledWithExactly('blazeit'));

            assert(options.transporter.sendMail.calledOnce);
            assert.equal(options.transporter.sendMail.firstCall.args[0].to, args.email);
            assert.equal(options.transporter.sendMail.firstCall.args[0].subject, options.getSubject.firstCall.returnValue);
            assert.equal(options.transporter.sendMail.firstCall.args[0].text, options.getText.firstCall.returnValue);
            assert.equal(options.transporter.sendMail.firstCall.args[0].html, options.getHTML.firstCall.returnValue);
        });
    });

    describe('#getDataFromToken', function () {
        it('Returns the user data which from the token that was encoded by #sendMagicLink', async function () {
            const options = {
                tokenProvider: new MagicLink.JWTTokenProvider(secret),
                getSigninURL: sandbox.stub().returns('FAKEURL'),
                getText: sandbox.stub().returns('SOMETEXT'),
                getHTML: sandbox.stub().returns('SOMEHTML'),
                transporter: {
                    sendMail: sandbox.stub().resolves()
                },
                config: {
                    get: sandbox.stub().resolves()
                }
            };
            const service = new MagicLink(options);

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
        afterEach(function () {
            sandbox.restore();
        });

        it('should return tokenId when labsService is provided and flag is enabled', async function () {
            const mockTokenProvider = {
                create: sandbox.stub().resolves('mock-token'),
                getIdByToken: sandbox.stub().resolves('test-token-id-123')
            };
            
            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(true)
            };

            const options = {
                tokenProvider: mockTokenProvider,
                getSigninURL: sandbox.stub().returns('FAKEURL'),
                getText: sandbox.stub().returns('SOMETEXT'),
                getHTML: sandbox.stub().returns('SOMEHTML'),
                getSubject: sandbox.stub().returns('SOMESUBJECT'),
                transporter: {
                    sendMail: sandbox.stub().resolves({messageId: 'test'})
                },
                labsService
            };
            
            const service = new MagicLink(options);
            
            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                }
            };

            const result = await service.sendMagicLink(args);

            assert.equal(result.tokenId, 'test-token-id-123');
            assert(labsService.isSet.calledWith('membersSigninOTC'));
            assert(mockTokenProvider.getIdByToken.calledOnce);
        });

        it('should not return tokenId when labsService flag is disabled', async function () {
            const mockTokenProvider = {
                create: sandbox.stub().resolves('mock-token'),
                getIdByToken: sandbox.stub().resolves('test-token-id-123')
            };
            
            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(false)
            };

            const options = {
                tokenProvider: mockTokenProvider,
                getSigninURL: sandbox.stub().returns('FAKEURL'),
                getText: sandbox.stub().returns('SOMETEXT'),
                getHTML: sandbox.stub().returns('SOMEHTML'),
                getSubject: sandbox.stub().returns('SOMESUBJECT'),
                transporter: {
                    sendMail: sandbox.stub().resolves({messageId: 'test'})
                },
                labsService
            };
            
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
            assert(mockTokenProvider.getIdByToken.notCalled);
        });

        it('should not return tokenId when labsService is not provided', async function () {
            const mockTokenProvider = {
                create: sandbox.stub().resolves('mock-token'),
                getIdByToken: sandbox.stub().resolves('test-token-id-123')
            };

            const options = {
                tokenProvider: mockTokenProvider,
                getSigninURL: sandbox.stub().returns('FAKEURL'),
                getText: sandbox.stub().returns('SOMETEXT'),
                getHTML: sandbox.stub().returns('SOMEHTML'),
                getSubject: sandbox.stub().returns('SOMESUBJECT'),
                transporter: {
                    sendMail: sandbox.stub().resolves({messageId: 'test'})
                }
                // No labsService provided
            };
            
            const service = new MagicLink(options);
            
            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                }
            };

            const result = await service.sendMagicLink(args);

            assert.equal(result.tokenId, null);
            assert(mockTokenProvider.getIdByToken.notCalled);
        });

        it('should work when tokenProvider does not have getIdByToken method', async function () {
            const mockTokenProvider = {
                create: sandbox.stub().resolves('mock-token')
                // No getIdByToken method
            };
            
            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(true)
            };

            const options = {
                tokenProvider: mockTokenProvider,
                getSigninURL: sandbox.stub().returns('FAKEURL'),
                getText: sandbox.stub().returns('SOMETEXT'),
                getHTML: sandbox.stub().returns('SOMEHTML'),
                getSubject: sandbox.stub().returns('SOMESUBJECT'),
                transporter: {
                    sendMail: sandbox.stub().resolves({messageId: 'test'})
                },
                labsService
            };
            
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

        it('should work without errors when labsService is undefined', async function () {
            const mockTokenProvider = {
                create: sandbox.stub().resolves('mock-token'),
                getIdByToken: sandbox.stub().resolves('test-token-id-123')
            };

            const options = {
                tokenProvider: mockTokenProvider,
                getSigninURL: sandbox.stub().returns('FAKEURL'),
                getText: sandbox.stub().returns('SOMETEXT'),
                getHTML: sandbox.stub().returns('SOMEHTML'),
                getSubject: sandbox.stub().returns('SOMESUBJECT'),
                transporter: {
                    sendMail: sandbox.stub().resolves({messageId: 'test'})
                },
                labsService: undefined
            };
            
            const service = new MagicLink(options);
            
            const args = {
                email: 'test@example.com',
                tokenData: {
                    id: '420'
                }
            };

            // Should not throw any errors
            const result = await service.sendMagicLink(args);

            assert.equal(result.tokenId, null);
            assert(mockTokenProvider.getIdByToken.notCalled);
        });

        it('should return tokenId as null when getIdByToken resolves to null', async function () {
            const mockTokenProvider = {
                create: sandbox.stub().resolves('mock-token'),
                getIdByToken: sandbox.stub().resolves(null)
            };
            
            const labsService = {
                isSet: sandbox.stub().withArgs('membersSigninOTC').returns(true)
            };

            const options = {
                tokenProvider: mockTokenProvider,
                getSigninURL: sandbox.stub().returns('FAKEURL'),
                getText: sandbox.stub().returns('SOMETEXT'),
                getHTML: sandbox.stub().returns('SOMEHTML'),
                getSubject: sandbox.stub().returns('SOMESUBJECT'),
                transporter: {
                    sendMail: sandbox.stub().resolves({messageId: 'test'})
                },
                labsService
            };
            
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
            assert(mockTokenProvider.getIdByToken.calledOnce);
        });
    });
});
