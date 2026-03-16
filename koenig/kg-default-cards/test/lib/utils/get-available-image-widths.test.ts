// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../../utils');

const getAvailableImageWidths = require('../../../lib/utils/get-available-image-widths');

const contentWidths = {
    w600: {width: 600},
    w1000: {width: 1000},
    w1600: {width: 1600},
    w2400: {width: 2400}
};

describe('Utils: getAvailableImageWidths', function () {
    it('returns all content widths if available', function () {
        const image = {
            width: 3000,
            height: 2000
        };

        getAvailableImageWidths(image, contentWidths).should.deepEqual([
            600,
            1000,
            1600,
            2400
        ]);
    });

    it('skips content widths larger than image', function () {
        const image = {
            width: 1600,
            height: 1000
        };

        getAvailableImageWidths(image, contentWidths).should.deepEqual([
            600,
            1000,
            1600
        ]);
    });

    it('adds original image width if its smaller than largest content width', function () {
        const image = {
            width: 2000,
            height: 2000
        };

        getAvailableImageWidths(image, contentWidths).should.deepEqual([
            600,
            1000,
            1600,
            2000
        ]);
    });
});
