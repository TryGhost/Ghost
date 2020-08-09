// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const bootstrapSocket = require('../lib/bootstrap-socket');

describe('Connect and send', function () {
    it('Resolves a promise for a bad call', function () {
        bootstrapSocket.connectAndSend().should.be.fulfilled();
    });
});
