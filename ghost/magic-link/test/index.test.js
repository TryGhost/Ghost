const should = require('should');
const sinon = require('sinon');
const MagicLink = require('../');
const crypto = require('crypto');

const sandbox = sinon.createSandbox();
const secret = crypto.randomBytes(64);

describe('MagicLink', function () {
    it('Exports a function', function () {
        should.equal(typeof MagicLink, 'function');
    });

    describe('#sendMagicLink', function () {
        it('Sends an email to the user with a link generated from getSigninURL(token, type)', async function () {
            const options = {
                tokenProvider: new MagicLink.JWTTokenProvider(secret),
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
                tokenData: {
                    id: '420'
                },
                type: 'blazeit',
                referrer: 'https://whatever.com'
            };
            const {token} = await service.sendMagicLink(args);

            should.ok(options.getSigninURL.calledOnce);
            should.ok(options.getSigninURL.firstCall.calledWithExactly(token, 'blazeit', 'https://whatever.com'));

            should.ok(options.getText.calledOnce);
            should.ok(options.getText.firstCall.calledWithExactly('FAKEURL', 'blazeit', 'test@example.com'));

            should.ok(options.getHTML.calledOnce);
            should.ok(options.getHTML.firstCall.calledWithExactly('FAKEURL', 'blazeit', 'test@example.com'));

            should.ok(options.getSubject.calledOnce);
            should.ok(options.getSubject.firstCall.calledWithExactly('blazeit'));

            should.ok(options.transporter.sendMail.calledOnce);
            should.equal(options.transporter.sendMail.firstCall.args[0].to, args.email);
            should.equal(options.transporter.sendMail.firstCall.args[0].subject, options.getSubject.firstCall.returnValue);
            should.equal(options.transporter.sendMail.firstCall.args[0].text, options.getText.firstCall.returnValue);
            should.equal(options.transporter.sendMail.firstCall.args[0].html, options.getHTML.firstCall.returnValue);
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

            should.deepEqual(data.id, args.tokenData.id);
        });
    });
});
