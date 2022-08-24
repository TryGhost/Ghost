// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const MemberAttributionService = require('../lib/service');

describe('MemberAttributionService', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new MemberAttributionService({});
        });
    });
});
