// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const UrlHistory = require('../lib/history');

describe('UrlHistory', function () {
    it('sets history to empty array if invalid', function () {
        const inputs = [
            'string',
            undefined,
            12,
            null,
            {},
            NaN,
            [
                {
                    time: 1,
                    path: '/test'
                },
                't'
            ],
            [{}],
            ['test'],
            [0],
            [undefined],
            [NaN],
            [[]],
            [{
                time: 'test',
                path: 'test'
            }],
            [{
                path: 'test'
            }],
            [{
                time: 123
            }]
        ];

        for (const input of inputs) {
            const history = UrlHistory.create(input);
            should(history.history).eql([]);
        }
    });

    it('sets history for valid arrays', function () {
        const inputs = [
            [],
            [{
                time: Date.now(),
                path: '/test'
            }]
        ];
        for (const input of inputs) {
            const history = UrlHistory.create(input);
            should(history.history).eql(input);
        }
    });

    it('removes entries older than 24 hours', function () {
        const input = [{
            time: Date.now() - 1000 * 60 * 60 * 25,
            path: '/old'
        }, {
            time: Date.now() - 1000 * 60 * 60 * 23,
            path: '/not-old'
        }];
        const history = UrlHistory.create(input);
        should(history.history).eql([input[1]]);
    });
});
