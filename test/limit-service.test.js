// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

describe('Limit Service', function () {
    describe('Lodash Template', function () {
        it('Does not get clobbered by this lib', function () {
            require('../lib/limit');
            let _ = require('lodash');

            _.templateSettings.interpolate.should.eql(/<%=([\s\S]+?)%>/g);
        });
    });

    describe('Error Messages', function () {
        it('Formats numbers correctly', function () {
            const {MaxLimit} = require('../lib/limit');

            let limit = new MaxLimit({name: 'test', config: {max: 35000000, currentCountQuery: () => {}, error: 'Your plan supports up to {{max}} staff users. Please upgrade to add more.'}});

            let error = limit.generateError(35000001);

            error.message.should.eql('Your plan supports up to 35,000,000 staff users. Please upgrade to add more.');
            error.errorDetails.limit.should.eql(35000000);
            error.errorDetails.total.should.eql(35000001);
        });
    });
});
