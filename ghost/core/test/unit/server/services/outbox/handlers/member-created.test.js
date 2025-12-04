const sinon = require('sinon');
const should = require('should');
const rewire = require('rewire');

describe('Outbox Handler - member-created', function () {
    let handler;
    let memberWelcomeEmailServiceStub;

    beforeEach(function () {
        memberWelcomeEmailServiceStub = {
            api: {
                send: sinon.stub().resolves()
            }
        };

        handler = rewire('../../../../../../core/server/services/outbox/handlers/member-created');
        handler.__set__('memberWelcomeEmailService', memberWelcomeEmailServiceStub);
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('handle', function () {
        it('calls memberWelcomeEmailService.api.send with member payload', async function () {
            const payload = {name: 'John Doe', email: 'john@example.com'};

            await handler.handle({payload});

            sinon.assert.calledOnce(memberWelcomeEmailServiceStub.api.send);
            sinon.assert.calledWith(memberWelcomeEmailServiceStub.api.send, {member: payload});
        });

        it('passes payload with all member fields', async function () {
            const payload = {
                id: '123',
                name: 'Jane Doe',
                email: 'jane@example.com',
                created_at: '2024-01-01'
            };

            await handler.handle({payload});

            const sendCall = memberWelcomeEmailServiceStub.api.send.getCall(0);
            sendCall.args[0].member.should.deepEqual(payload);
        });
    });

    describe('getLogInfo', function () {
        it('returns "name (email)" format when both present', function () {
            const payload = {name: 'John Doe', email: 'john@example.com'};

            const result = handler.getLogInfo(payload);

            result.should.equal('John Doe (john@example.com)');
        });

        it('returns just email when name is missing or empty', function () {
            handler.getLogInfo({email: 'john@example.com'}).should.equal('john@example.com');
            handler.getLogInfo({name: '', email: 'john@example.com'}).should.equal('john@example.com');
        });

        it('returns "unknown member" when email is missing', function () {
            const payload = {name: 'John'};

            const result = handler.getLogInfo(payload);

            result.should.equal('John (unknown member)');
        });

        it('returns "unknown member" when payload is empty, null, or undefined', function () {
            handler.getLogInfo({}).should.equal('unknown member');
            handler.getLogInfo(null).should.equal('unknown member');
            handler.getLogInfo(undefined).should.equal('unknown member');
        });
    });

    describe('LOG_KEY', function () {
        it('exports LOG_KEY constant', function () {
            should.exist(handler.LOG_KEY);
            handler.LOG_KEY.should.be.a.String();
            handler.LOG_KEY.should.containEql('OUTBOX');
            handler.LOG_KEY.should.containEql('MEMBER-WELCOME-EMAIL');
        });
    });
});

