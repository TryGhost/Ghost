// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const connectAndSend = require('../lib/connect-and-send');

describe('Connect and send', function () {
    it('Resolves a promise for a bad call', function () {
        connectAndSend().should.be.fulfilled();
    });
});
