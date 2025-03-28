require('should');

const bootstrapSocket = require('../../../../core/server/lib/bootstrap-socket');

describe('Connect and send', function () {
    it('Resolves a promise for a bad call', function () {
        bootstrapSocket.connectAndSend().should.be.fulfilled();
    });
});
