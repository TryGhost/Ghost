const should = require('should');
const sinon = require('sinon');
const MagicLink = require('../');
const crypto = require('crypto');

const sandbox = sinon.createSandbox();
const {publicKey, privateKey} = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
        type: 'pkcs1',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs1',
        format: 'pem'
    }
});

describe('MagicLink', function () {
    it('Exports a function', function () {
        should.equal(typeof MagicLink, 'function');
    });

    describe('#sendMagicLink', function () {
        it('Sends an email to the user with a link generated from getSigninURL(token, type)', async function () {
            const options = {
                publicKey,
                privateKey,
                getSigninURL: sandbox.stub().returns('FAKEURL'),
                getText: sandbox.stub().returns('SOMETEXT'),
                getHTML: sandbox.stub().returns('SOMEHTML'),
                getSubject: sandbox.stub().returns('SOMESUBJECT'),
                transporter: {
                    sendMail: sandbox.stub().resolves()
                }
            };
            const service = new MagicLink(options);

            const args = {
                email: 'test@example.com',
                user: {
                    id: 420
                },
                type: 'blazeit'
            };
            const {token} = await service.sendMagicLink(args);

            should.ok(options.getSigninURL.calledOnce);
            should.ok(options.getSigninURL.firstCall.calledWithExactly(token, 'blazeit'));

            should.ok(options.transporter.sendMail.calledOnce);
            should.equal(options.transporter.sendMail.firstCall.args[0].to, args.email);
            should.equal(options.transporter.sendMail.firstCall.args[0].subject, options.getSubject.firstCall.returnValue);
            should.equal(options.transporter.sendMail.firstCall.args[0].text, options.getText.firstCall.returnValue);
            should.equal(options.transporter.sendMail.firstCall.args[0].html, options.getHTML.firstCall.returnValue);
        });
    });

    describe('#getUserFromToken', function () {
        it('Returns the user data which from the token that was encoded by #sendMagicLink', async function () {
            const options = {
                publicKey,
                privateKey,
                getSigninURL: sandbox.stub().returns('FAKEURL'),
                getText: sandbox.stub().returns('SOMETEXT'),
                getHTML: sandbox.stub().returns('SOMEHTML'),
                transporter: {
                    sendMail: sandbox.stub().resolves()
                }
            };
            const service = new MagicLink(options);

            const args = {
                email: 'test@example.com',
                user: {
                    id: 420
                }
            };

            const {token} = await service.sendMagicLink(args);
            const user = service.getUserFromToken(token);

            should.deepEqual(user, args.user);
        });
    });
});
