// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

describe('Lodash Template', function () {
    it('Does not get clobbered by this lib', function () {
        require('../lib/tpl');
        let _ = require('lodash');

        // @ts-ignore
        _.templateSettings.interpolate.should.eql(/<%=([\s\S]+?)%>/g);
    });
});
