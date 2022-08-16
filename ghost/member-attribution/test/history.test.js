// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const UrlHistory = require('../lib/history');

describe('UrlHistory', function () {
    describe('Constructor', function () {
        it('sets history to empty array if invalid', function () {
            const history = new UrlHistory('invalid');
            should(history.history).eql([]);
        });
        it('sets history to empty array if missing', function () {
            const history = new UrlHistory();
            should(history.history).eql([]);
        });
    });

    describe('Validation', function () {
        it('isValidHistory returns false for non arrays', function () {
            should(UrlHistory.isValidHistory('string')).eql(false);
            should(UrlHistory.isValidHistory()).eql(false);
            should(UrlHistory.isValidHistory(12)).eql(false);
            should(UrlHistory.isValidHistory(null)).eql(false);
            should(UrlHistory.isValidHistory({})).eql(false);
            should(UrlHistory.isValidHistory(NaN)).eql(false);

            should(UrlHistory.isValidHistory([
                {
                    time: 1,
                    path: '/test'
                },
                't'
            ])).eql(false);
        });

        it('isValidHistory returns true for valid arrays', function () {
            should(UrlHistory.isValidHistory([])).eql(true);
            should(UrlHistory.isValidHistory([
                {
                    time: 1,
                    path: '/test'
                }
            ])).eql(true);
        });

        it('isValidHistoryItem returns false for invalid objects', function () {
            should(UrlHistory.isValidHistoryItem({})).eql(false);
            should(UrlHistory.isValidHistoryItem('test')).eql(false);
            should(UrlHistory.isValidHistoryItem(0)).eql(false);
            should(UrlHistory.isValidHistoryItem()).eql(false);
            should(UrlHistory.isValidHistoryItem(NaN)).eql(false);
            should(UrlHistory.isValidHistoryItem([])).eql(false);

            should(UrlHistory.isValidHistoryItem({
                time: 'test',
                path: 'test'
            })).eql(false);

            should(UrlHistory.isValidHistoryItem({
                path: 'test'
            })).eql(false);

            should(UrlHistory.isValidHistoryItem({
                time: 123
            })).eql(false);
        });

        it('isValidHistoryItem returns true for valid objects', function () {
            should(UrlHistory.isValidHistoryItem({
                time: 123,
                path: '/time'
            })).eql(true);
        });
    });
});
